# Local inference draft hints

Status: proposal, 2026-10-08. Not implemented. Pending Gesso's server API.

Sources:
- Gesso speculation seam: Gesso repo, `docs/design/SPECULATION_SEAM.md`
- Gesso draft sources (ported from GessoSymbolicDrafts 59553aa, v0.2.0): Gesso repo, `src/Speculation/HostSources.jl`
- Cyan audit: `docs/audits/CYAN_SKELETON_AUDIT_2026-10-08.md` §2.2 (local path), §2.6 (ranked gaps)

Cyan does not run speculation. It is the client. Gesso verifies drafts bit-exactly against the model, so a hint only changes speed, never output. This doc says what Cyan should send and what it should show back.

## What crosses the boundary

Draft sources run inside Gesso and are typed on integer token ids (`TemplateRule`, `Draft.ids`). Cyan sends text and tool schemas. Gesso tokenizes. Cyan must never send id arrays, because the id mapping belongs to the model's tokenizer.

## 1. Tool-call scaffolding as templates

Given the active tool schemas, some tokens are fixed before the model chooses anything:

- the tool-call envelope that the chat template emits around a call;
- the tool name, which is one of a closed set;
- JSON keys, in schema order. For `edit`, that is `"path"`, `"edits"`, then `"oldText"` and `"newText"` per entry (`packages/coding-agent/src/core/tools/edit.ts:24-45`);
- the braces, colons and commas between keys.

Values are not fixed, except enum values.

Rules for Cyan:

- **Gesso derives the sequences, not Cyan.** Gesso renders the same chat template the server uses and takes the scaffolding from that render. Cyan does not hard-code envelope strings, because they differ by model.
- **Pretokenize complete sequences.** Encode each whole fixed span, and split only at known token boundaries, such as after a closing quote or before a key. Encoding pieces independently changes BPE tokens. Gesso already refuses the same mistake for symbolic sources: `HostSources.jl:279-282` returns no draft unless `encode(prefix) == ids`.
- **Bounds are hard limits.** `TemplateRule` takes a trigger of at most 128 ids and a continuation of at most 256 ids. A source holds at most 128 rules, and `max_draft` is at most 64 (`HostSources.jl:105-128`). A long key list must be split into several rules. An oversize rule should be rejected, not truncated.
- **Trigger window.** Templates match against the last 384 ids (`HostSources.jl:132`). A trigger should be the preceding fixed text, such as the key before a value.

## 2. Edit-heavy turns

The `edit` tool requires `oldText` to be an exact, unique substring of the file (`edit.ts:34-38`). The model therefore copies text it has already seen. Suffix lookup finds that copy (`SuffixSource`, `HostSources.jl:62-103`). This is the largest expected win.

Limits that shape the design:

- `SuffixSource` searches only the last 4096 ids (`max_history`, `HostSources.jl:68`). File content read earlier in a long session is invisible to it.
- At most 8 tokens are drafted per window (`max_draft`), so a 40-line `oldText` takes several windows.
- A match of width 1 or 2 fires on common tokens and accepts poorly. The source has no minimum-width setting. Adding one is a Gesso change, not a Cyan one.
- There is no read tool in this checkout. The tools index exports `bash`, `edit`, `ipython`, `neurabash` and `palette`. File content reaches context through bash or ipython output, or through pasted text.

Marking. Cyan can compute the flag from its own state, without model output:

- set `enable_suffix: true` when the `edit` tool is in the active tool set and a tool result containing file content (bash or ipython output) is within the last 4096 tokens;
- otherwise set it to `false`.

## 3. Receipts

Per origin, the seam requires: windows, mean draft length, mean accepted, propose cost, verify cost, rollback cost, tokens/s against a no-draft arm on the same prompt, and the exact-id check (`SPECULATION_SEAM.md`, "Measuring whether a source pays").

What exists today: `HostSources.jl:18-43` keeps windows, drafted and accepted counts per source. The cost fields do not exist yet, and the no-draft arm is a benchmark, not a runtime field.

Where Cyan shows them, so a non-paying source can be seen and turned off:

- **Footer segment.** One short segment in the interactive footer, showing the origin, accepted over drafted, and on or off. The footer already refreshes through `footer.invalidate()` (`interactive-mode.ts`, `session_info_changed` handler).
- **`/status`.** The full per-origin table. The audit (§2.6 item 5) already names `/status` as the place for model diagnostics.
- **Log line.** One line per turn, only when speculation is on, so a session transcript can be audited afterwards.

Turning off. A source that does not pay on its workload is switched off for that workload (seam doc). Gesso owns the cost model. Cyan displays the verdict and sends `enable_suffix: false` or drops the origin from `templates`. It shows "speculation: off (suffix did not pay)" so the user can see why.

## 4. Chat-template caution

Special tokens break canonical re-encoding. Chat-template markers and tool-call tags are special tokens, so `detok` followed by `encode` does not reproduce them. Symbolic sources decline any selected span that does not re-encode to the same ids (`HostSources.jl:279-282`). That is the intended behaviour, not a bug.

Templates are id-level and do not decline this way, but they must still come from the template render (section 1).

For line-scoped procedures, use `LastLineProcedure` (`HostSources.jl:163-167`). It hands the procedure only the last line, so header text on earlier lines does not block it. The last line still has to re-encode canonically. A special token inside that line still makes the procedure decline. Cyan must not pass a procedure a span that contains template markup.

## 5. The interface (proposal)

```json
"draft_hints": {
  "templates": [
    { "origin": "tool_schema", "trigger": "\"oldText\": \"", "continuation": "" }
  ],
  "enable_suffix": true
}
```

- `trigger` and `continuation` are text. Gesso tokenizes whole strings and rejects a rule that exceeds the bounds in section 1.
- `origin` labels each template, so receipts separate them from `:suffix`.
- `enable_suffix` defaults to `false` until receipts show the suffix pays on Cyan traffic.
- The server returns receipts per origin. This is a proposal to Gesso and is not agreed.

Gesso has no serving API yet, so the field names above are placeholders for that API.

## Open and unverified

- The scaffolding sequences for the target models were not checked. They depend on each model's chat template, which has not been read here.
- Which server Cyan will talk to (llama-server or Gesso) is not decided. The local path today is `api: "openai-completions"` (audit §2.2).
- Sampled decoding (temperature > 0) is out of scope. The seam keeps it as a later extension that must preserve the output distribution.
- The propose wall time per origin is named in the seam doc but has no field in `HostSources.jl`.
- Nothing here measures whether speculation pays on Cyan's workloads. That needs the no-draft arm on the same prompts.
