# Cyan Skeleton Audit, 2026-10-08

Read-only audit of the Cyan Harness repo (`/mnt/d/Code Projects/Project Cyan/Cyan Harness`).

## 0. Scope, state, and method

- **Audited commit: `5484e6b98`** ("Cyan MVP: identity rebrand, Palette runtime tool, phase docs"), branch `work/cyan-mvp-20261005`. At audit start the tree had 73 uncommitted files. During the audit, the coordinating Claude session committed them at 2026-10-08 19:52:47 -0400 (git author shows Matt C). I did not stage, commit, stash, or edit any tracked file.
- **Verified the commit has the same content I audited.** I re-ran the mention grep at HEAD: it reproduces every line from the earlier working-tree grep. The only differences are the nine lines from files that were untracked at start, which are now committed. Line citations below are to `5484e6b98`.
- **Writes:** the only file I created is this report. Helper scripts are in the agent scratchpad, outside the repo.
- **Rebrand classification method:** a heuristic script with ordered rules, one bucket per matching line, counts weighted by occurrences. I hand-checked a random sample of 40 classified lines (seed 11): 36 agreed. The four disagreements were a temp-dir name, a package name, and two judgment calls (README attribution, `PrimeAgentTraces` identifiers). Treat the bucket counts as approximate (roughly ±10%). The per-file table in Appendix A is a starting point, not a human-verified ledger.
- **Tests:** I did not run `npm test` or vitest. The suite writes temp dirs and sockets outside the repo, which the brief excludes unless proven safe. I ran `node scripts/check-test-policy.mjs`, which issues read-only git calls only. Verbatim output: `Test policy check passed against origin/main.` I did not run `npm run check`, because it starts with `biome check --write`.
- **Brief figures:** the brief said about 3,300 mentions in about 418 tracked files. Measured: **3,090 matching lines, 3,501 occurrences, 405 files** (400 tracked before the commit, plus 5 files that were untracked at start).

## 1. Rebrand ledger

### 1.1 Totals by bucket

| Bucket | What it covers in this audit | Files | Lines | Occurrences |
|---|---|---:|---:|---:|
| (a) MUST KEEP | LICENSE, upstream repo slugs and URLs, protocol namespaces, third-party provider names, legacy env-var fallbacks, historical log parsers | 60 | 193 | 206 |
| (b) USER-VISIBLE | strings a user or the model reads: CLI output and errors, prompts, UI text, skill descriptions, outbound identity strings | 98 | 190 | 215 |
| (c) INTERNAL | env-var names, shell/installer identifiers, temp and socket names, package names, file and path names | 231 | 1,909 | 2,181 |
| (d) DOCS | Markdown, changelog, GitHub templates, code comments | 133 | 798 | 899 |
| **Total** | | **405** | **3,090** | **3,501** |

Where the 190 (b) lines sit: 112 in shipped non-test code and packaging (66 files), 41 in tests (21 files), 22 in `install.sh`, and 15 in the top-level `scripts/` (by subtraction). The bulk of `install.sh` (854 lines) is (c): installer shell variables and functions, all `prime_agent_*`.

Judgment calls: code comments went to (d). `PrimeAgentTraces` identifiers are upstream's trace-sharing service, so I treated the **provider ID** `prime-agent-traces` as (a) but the function names as (c). Per-file counts are in Appendix A.

### 1.2 User-visible leftovers that should say Cyan (bucket b, shipped code)

These are the actionable items. Every one is a real string a user or the model sees.

- **Daemon attach prompt:** `packages/coding-agent/src/cli/daemon-command.ts:1303`, `chalk.green("prime-agent> ")`.
- **CLI usage errors:** `daemon-command.ts:872, 1016, 1020, 1074, 1078, 1086, 1102` ("Usage: prime-agent ...").
- **Shutdown hints:** `packages/coding-agent/src/main.ts:357, 379` ("Run "prime-agent shutdown" ...").
- **Node version guard:** `packages/coding-agent/src/cli/node-version-check.ts:51, 54`.
- **Console prefixes:** `packages/coding-agent/src/cli/npm-native-bridge.ts:190, 286`; `packages/coding-agent/src/postinstall.ts:31`; `packages/coding-agent/postinstall.cjs:12`.
- **Native update message:** `packages/coding-agent/src/cli/native-update.ts:46` ("owned by the Prime Agent installer").
- **Incident pointer shown in the UI:** `packages/coding-agent/src/modes/agents-view/incident-notices.ts:45` ("run prime-agent incident ...").
- **Daemon log line:** `packages/coding-agent/src/modes/daemon/daemon-supervisor.ts:929` logs "Prime Agent daemon supervisor ... listening". The incident parser accepts both names (`src/cli/incident.ts:395, 556`), and its tests still expect the old text (`test/incident.test.ts:55`, `test/agents-view-incident-notice.test.ts:45`).
- **Interactive UI:** `packages/coding-agent/src/core/slash-commands.ts:125` ("Preview, upload, or configure Prime Agent traces"); `src/modes/interactive/components/settings-selector.ts:393` ("Load built-in skills shipped with prime-agent"); `src/core/prime-inference-auth.ts:584, 599, 606`; `src/modes/interactive/auth-flows.ts:813, 823`; `src/core/agent-traces.ts:811` (credential label).
- **Model-facing and tool-facing text:**
  - `packages/coding-agent/src/core/tools/ipython.ts:44-47, 134, 141` (error text; see §1.5 for a wrong path in it).
  - `packages/coding-agent/src/core/kernel/bootstrap.ts:931, 952`.
  - `packages/coding-agent/src/modes/daemon/daemon-catalog-process.ts:241`, the `<prime_agent_worker_interrupted>` tag the model reads after a worker crash.
  - `prime-agent-runtime/src/rlm/mcp_base.py:47` ("run `/mcp login` in Prime Agent").
- **Outbound identity:** `packages/ai/src/mcp/oauth.ts:531` (MCP OAuth `client_name` = "Prime Agent (label)", shown to third-party servers and their consent screens); `packages/coding-agent/src/utils/pi-user-agent.ts:3` (HTTP user agent `prime-agent/<version>`).
- **Skill metadata:** about 25 `skills/*/pyproject.toml` descriptions and authors (e.g. `packages/coding-agent/skills/arxiv/pyproject.toml:8-9`), plus model-facing docstrings such as `skills/websearch/src/websearch/websearch.py:154` ("In Prime Agent, run /login ...").
- **Kept on purpose:** `packages/ai/src/utils/oauth/oauth-page.ts:91, 102, 110` ("Prime Intellect authentication ...") names the provider, which is a third party, so it stays.

### 1.3 Identifiers and paths that matter (bucket c)

- **Env vars:** 444 lines classified env-var, e.g. `PRIME_AGENT_KERNEL_PYTHON`, `PRIME_AGENT_INSTALL_METHOD`, `PRIME_AGENT_TRACES_*`. The legacy fallbacks that read `PRIME_AGENT_*` after `CYAN_*` are (a): `src/config.ts:528`, `src/cli/daemon-ps.ts:208`, `src/modes/daemon/daemon-socket.ts:72`, `src/core/telemetry.ts:213`.
- **State and config paths still under upstream names:**
  - `packages/coding-agent/src/modes/daemon/daemon-supervisor-ownership.ts:317`: default `~/.prime/supervisor-owners`.
  - `packages/coding-agent/src/core/tools/neurabash.ts:75`: `~/.prime-agent/neurabash`.
  - `packages/coding-agent/src/core/prime-inference-auth.ts:78`: `~/.prime/config.json` (read only in login flows; see §1.4).
- **Package names and bins:**
  - root `package.json:2` is `"name": "prime-agent"`, with no `bin`.
  - `packages/coding-agent/package.json:7` sets `piConfig.name` to `cyan`, but `packages/coding-agent/package.json:10-12` still declares `"bin": { "pi": "dist/bundle/cli.js" }`. The built command name is therefore a separate question from the Cyan config name. I did not check what the packaged binary is actually named.
  - `prime-agent-runtime/pyproject.toml` names the Python package `prime-agent-runtime`, which REBRAND.md keeps on purpose.
- **Launcher chain:** `cyan.sh:14` execs `prime-agent.sh` (`prime-agent.sh` is still the real launcher body).

### 1.4 REBRAND.md claims, checked

| # | Claim (REBRAND.md) | Verdict | Evidence |
|---|---|---|---|
| 1 | Welcome screen identifies Cyan | TRUE | `packages/coding-agent/src/modes/interactive/components/prime-onboarding-splash.ts:24` uses `CYAN_LOGO`. Line 36 says "Forked from Prime Agent", which is lineage. The class and file are still named `PrimeOnboardingSplash` (c). |
| 2 | Terminal wordmark is Cyan | TRUE | `packages/coding-agent/src/themes/cyan-logo.ts:1-6`; `src/modes/interactive/interactive-mode.ts:519` (default logo), `:538` (`titleText = "Cyan"`). `src/themes/prime-logo.ts` has no importers in `src/` (grep). It is a deletion candidate. |
| 3 | Model-facing product prose is Cyan | PARTIAL | Skills, the NeuraBash/ipython errors, and the worker-interrupted tag still say Prime Agent (§1.2). |
| 4 | CLI help identifies Cyan | PARTIAL | Top-level help is correct: `src/cli/command-registry.ts:328-331` sets `commandName` to `cyan` (via `CYAN_SUBSTRATE` or `APP_NAME`, which is `cyan` from `package.json:7`). Subcommand usage errors are not (`daemon-command.ts:872` etc.). |
| 5 | Daemon diagnostics identify Cyan | FALSE (partly) | `src/cli/daemon-launch.ts:174, 367, 434` say Cyan. But `daemon-supervisor.ts:929` logs "Prime Agent daemon supervisor", `daemon-command.ts:1303` prompts `prime-agent>`, and `npm-native-bridge.ts:190, 286` prefix `prime-agent:`. |
| 6 | ACP agent identity is Cyan | TRUE | `packages/coding-agent/src/modes/acp/acp-mode.ts:746` `agentInfo: { name: APP_NAME, title: "Cyan", ... }`; `:757` "Cyan ACP mode". The `_meta` namespace stays `PRIME_AGENT_META_NAMESPACE` (`acp-meta.ts`, `acp-mode.ts:24`), which is a protocol namespace and consistent with REBRAND.md. |
| 7 | Default config is `~/.cyan/agent` | TRUE | `packages/coding-agent/package.json:8` (`configDir: ".cyan/agent"`); `src/config.ts:498`; `src/config.ts:528-533`; `cyan.sh:8`. |
| 8 | Env order: `CYAN_AGENT_DIR`, then `CYAN_CODING_AGENT_DIR`, then legacy `PRIME_AGENT_CODING_AGENT_DIR` | TRUE | `src/config.ts:528` reads them in that order; `ENV_AGENT_DIR` becomes `CYAN_CODING_AGENT_DIR` through the `envPrefix` at `config.ts:489-502`. `cyan.sh:8` uses the same order and then exports the result into `PRIME_AGENT_CODING_AGENT_DIR`, so the Node side reads it under the legacy name. |
| 9 | Analytics are opt-in | TRUE | `src/core/telemetry.ts:206-217` returns true only when `telemetry.enabled === true` in global settings, unless `CYAN_TELEMETRY` or `PRIME_AGENT_TELEMETRY` overrides it. `PI_OFFLINE` and `DO_NOT_TRACK` force it off (`:207-212`). The default endpoint is Prime Intellect's (`telemetry.ts:15`), used only after opt-in. |
| 10 | No auto-update | PARTIAL | No Cyan binary check: `src/modes/interactive/interactive-mode.ts:1951` gates it on `APP_NAME !== "cyan"`; `src/modes/shared/startup-notices.ts:36`; `src/config.ts:347` points to the source checkout. But startup still queries package and extension updates over the network (`interactive-mode.ts:1954-1960`; `startup-notices.ts:43-60`, skipped only under `PI_OFFLINE` at `:47`) and downloads `fd` and `rg` from GitHub when missing (`interactive-mode.ts:1788`; `src/utils/tools-manager.ts:134, 209`). I did not find an install step on those paths. |
| 11 | Prime Intellect is optional, not a login requirement | UNVERIFIED (partly) | Onboarding's action is "Configure models" (`prime-onboarding-splash.ts:31`). Prime login is a separate panel, "Login with Prime Intellect" (`src/modes/interactive/auth-flows.ts:621`). I did not walk the onboarding flow at runtime. |
| 12 | No credentials copied or migrated from upstream | TRUE (with a caveat) | `~/.prime/config.json` is read only inside explicit Prime login flows (`src/core/prime-inference-auth.ts:519, 566`; `src/modes/interactive/auth-flows.ts:663-664, 784-785`). Caveat: `src/core/migrations.ts:114` describes migrating sessions from upstream `~/.pi/agent`. I did not check whether it runs automatically. |
| 13 | `install.sh` is inherited, not the Cyan install path; use README source setup | TRUE | `README.md:59-76` documents `./cyan.sh setup --sdk ...`. `install.sh` is still present with 880 occurrences (854 of them installer identifiers). |
| 14 | LICENSE keeps upstream lineage | TRUE | `LICENSE:3-5`: Mario Zechner (2025), Prime Intellect (2026), MattC (2026). |
| 15 | `prime-agent-runtime` remains the optional IPython implementation | TRUE | `prime-agent-runtime/pyproject.toml`; `src/core/tools/ipython.ts`. I did not check the "optional" part in depth. |

### 1.5 Hardcoded machine-specific paths

- **Runtime code, breaks on any other machine:** `packages/coding-agent/skills/subquad-attention/src/subquad_attention/integration.py:46` hardcodes `/mnt/d/Code Projects/subquad-attention/python/memory_archive.py` inside a `subprocess` command list.
- **Docs with machine paths:** `packages/coding-agent/skills/tencentdb-memory/SKILL.md:14` (`/mnt/d/Code Projects/tencentdb-memory/...`); `QUICK_START.md:6` (`cd /mnt/d/Code Projects/prime-agent`); `AGENTS.md:107` (`/Users/kevin/pi/prime-agent`, an upstream author path).
- **Test fixtures:** `scripts/benchmarks/tests/test_transport.py:40, 42` and `test_transport_switch_fetch.py:63, 65` (`/home/builder/source`); `packages/coding-agent/test/args.test.ts:38-39`; `packages/coding-agent/test/config.test.ts:124, 131` (Windows user paths).
- **Wrong path in a user-facing message:** `packages/coding-agent/src/core/tools/ipython.ts:45` tells the user to "Remove ~/.prime/agent/kernel-venv". The real location is `getAgentDir()/kernel-venv` (`src/core/kernel/bootstrap.ts:376`), which resolves to `~/.cyan/agent/kernel-venv` by default. The message points recovery at the wrong directory.
- No other `/home/<name>`, `/Users/<name>`, or `/mnt/` paths in `packages/*/src`. The username `mattc` does not appear in tracked code that I searched.

## 2. Skeleton inventory, aimed at "boringly reliable with a local model"

### 2.1 Packages

- **`packages/ai`** (`@earendil-works/pi-ai`, 61 src files, about 18.8k lines): the provider layer. Entry point `src/index.ts`. The API union is in `src/types.ts:7`. Built-in providers register from `src/providers/register-builtins.ts`. The generic OpenAI-compatible provider is `src/providers/openai-completions.ts`. Also present: model catalog (`models.ts`, `models.generated.ts`), overflow detection (`src/utils/overflow.ts`), MCP client (`src/mcp/`), OAuth (`src/utils/oauth/`).
- **`packages/agent`** (`@earendil-works/pi-agent-core`, 5 src files, about 2.4k lines): the agent loop. `src/agent.ts` (the Agent class), `src/agent-loop.ts` (turn loop), `src/types.ts`, `src/proxy.ts`. Re-exported from `src/index.ts`.
- **`packages/tui`** (`@earendil-works/pi-tui`, 34 src files, about 15.2k lines): terminal UI. `src/terminal.ts` (stdin and paste re-wrap at `:262-265`), `src/stdin-buffer.ts` (bracketed-paste parser at `:23-24, 271-285`), `src/tui.ts` (input routing, `handleInput` at `:897`), `src/components/editor.ts` (the prompt editor, `handlePaste` at `:1301`), `src/autocomplete.ts` (`@` and path completion).
- **`packages/coding-agent`** (`@earendil-works/pi-coding-agent`, package name `cyan`; 345 src files, about 153k lines): the product.
  - Startup: `src/main.ts` (fallback model logic at `:890-926`); `src/cli/` (command registry, daemon commands).
  - Session core: `src/core/sdk.ts:176` (`createAgentSession`); `src/core/agent-session.ts` (about 15k lines: prompting, retries, compaction, overflow, goals).
  - Models: `src/core/model-registry.ts` (`models.json`, custom providers, auth gate); `src/core/settings-manager.ts`.
  - Compaction: `src/core/compaction/`. Sessions: `src/core/session-manager.ts` (JSONL).
  - Tools: `src/core/tools/` (`palette.ts`, `palette-runtime.ts`, `ipython.ts`, `neurabash.ts`, `bash.ts`, `edit.ts`).
  - Modes: `src/modes/interactive/` (TUI app), `src/modes/daemon/` (background supervisor), `src/modes/acp/` (ACP server), `src/modes/rpc/`, `src/modes/print-mode.ts`, `src/modes/agents-view/`.
  - `skills/`: Python skill packages (`skills/*/pyproject.toml`).
- **`prime-agent-runtime/`** (Python): the RLM kernel shim used by the IPython path (`src/rlm/*`).
- **Palette (Julia):** not in this repo. Resolved from env vars or `palette.json` in the agent dir (`src/core/tools/palette-runtime.ts:38-70`). The launcher defaults to the Palette substrate (`cyan.sh:7`).
- **Gesso (Julia, local inference):** no code integration in this repo. The name appears only in `AGENTS.md:281` and the RPD docs.

### 2.2 Providers and models

- **Registration.** Built-in providers come from `ai/src/providers/register-builtins.ts`. Custom providers and models come from `~/.cyan/agent/models.json`, loaded by `ModelRegistry.create` (`model-registry.ts:503`). Schema: `model-registry.ts:156-205` (`ModelDefinitionSchema` at `:156`, `ProviderConfigSchema` at `:197`). Models are built at `:778-826`.
- **Runtime registration API.** `registerProvider` at `model-registry.ts:1760`; `unregisterProvider` at `:1775`; `ProviderConfigInput` at `:1889-1915`. Each model passed here must carry explicit `contextWindow` and `maxTokens`.
- **Reload.** `refresh()` at `model-registry.ts:514`. The auth flows call it (`auth-flows.ts:293, 391, 414`). The `/reload` command does not list models (`slash-commands.ts:209`).
- **Visibility.** The model selector calls `getAvailable()` (`model-selector.ts:340`), which filters on configured auth (`model-registry.ts:860-867`, `:1301-1302`, `:1464-1467`). For custom providers, that means a non-empty `apiKey` in `models.json`.
- **Local path today: yes.** Use `api: "openai-completions"` with a local `baseUrl` (docs example at `packages/coding-agent/docs/models.md:19-30`, covering Ollama, vLLM, LM Studio). Compat switches are in `model-registry.ts:112-135` (`supportsDeveloperRole`, `supportsReasoningEffort`, `maxTokensField`, `thinkingFormat`, `supportsUsageInStreaming`, and more). llama.cpp's `reasoning_content` is handled at `ai/src/providers/openai-completions.ts:359-363`. llama.cpp and Ollama overflow messages are matched at `ai/src/utils/overflow.ts:43, 49`.
- **Adding a local model needs:** a `models.json` entry with `baseUrl`, `api`, a non-empty `apiKey` (any string, or the model is hidden, see above), and `models[].id`, `contextWindow`, and `maxTokens` set explicitly. No code change. Missing `api` or `baseUrl` on a model drops it silently (`model-registry.ts:797`, `:800`). I found no command that explains why a model is missing.
- **What the docs get wrong for local models.** `docs/models.md:19` says "only `id` is required per model". That matches the code, but it means a local model with an 8k or 32k server context silently gets 128k (`model-registry.ts:816`, documented at `docs/models.md:197`).

### 2.3 Context compaction

- **Exists and is automatic.** Threshold check before a send: `agent-session.ts:3840-3851`. Threshold check after a turn: `agent-session.ts:10274-10337`. Overflow path: `agent-session.ts:10302` (`isContextOverflow`), with a one-shot recovery state at `agent-session.ts:1628-1629` (`"idle" | "attempted" | "reported"`).
- **Trigger.** `contextTokens > contextWindow - reserveTokens` (`src/core/compaction/compaction.ts:221-225`). `reserveTokens` defaults to 16384 (`settings-manager.ts:1009`); `keepRecentTokens` to 20000 (`:1013`); `enabled` gates it (`compaction.ts:222`).
- **Token counting.** Usage from the last assistant message via `calculateContextTokens` (`compaction.ts:137`; read at `agent-session.ts:10243` and `:11355`). Trailing messages are estimated at chars/4 (`compaction.ts:230-287`; the comment calls it conservative). There is no tokenizer.
- **Context length source.** Only `contextWindow` from `models.json`, or the 128000 default (`model-registry.ts:816`). No probe of the server: `grep` finds no `n_ctx`, `/props`, or `/v1/models` context read.
- **No clamp.** Nothing bounds `reserveTokens` by `contextWindow`. When `contextWindow <= reserveTokens`, the threshold is zero or negative. The stale-boundary guard (`agent-session.ts:10288-10292`) stops a message that was already compacted from re-triggering. The likely effect is one summarization call per new turn, not a loop. I did not run this; treat it as likely until a fixture confirms it.
- **Tests.** `test/compaction.test.ts` (the `shouldCompact` boundary cases at `:156-165`); `test/suite/agent-session-compaction.test.ts`, `-auxiliary-model`, and `-continuity`; about 52 static test cases across the compaction-named files; `ai/test/overflow.test.ts` for the overflow patterns. I found no end-to-end test that uses a small window (for example 8k or 16k).

### 2.4 Session persistence and recovery

- **Format.** One JSONL file per session: a header line, then entries (`session-manager.ts`). Each entry is appended with `appendFileSync` (`:2058` in `_persist`; also `:977`). I found no `fsync` in `session-manager.ts`. Full rewrites go through `writeFileAtomicSync` in `_rewriteFile` (`:1933`).
- **Persistence gating.** Nothing is persisted until an assistant entry exists, except `session_state` and `session_info`. `flushNow` (`:2033`) forces pre-model entries to disk.
- **Open-time repair.** `repairJsonlDamage` (`:683`) runs from `setSessionFile`. Malformed lines are skipped (`:409-412`, `:614-616`). An empty or headerless file starts a fresh session (`:1814-1821`).
- **Tests.** `test/session-manager/file-operations.test.ts:483` (torn tail truncated, zero-filled record recovered); `test/session-manager-flush.test.ts:434` (torn tail repaired on retry). These simulate damaged bytes, not a power cut.
- **Worker and daemon crash.** After a worker dies, the transcript gets a `<prime_agent_worker_interrupted>` block (`daemon-catalog-process.ts:241`) that says the transcript was recovered but the model and tool state are uncertain. Recovery descriptors live in temp files (`src/cli/owned-session-worker.ts:206`). Tests: `test/suite/regressions/4603-worker-recovery.test.ts`, `test/worker-recovery-journal.test.ts`, `test/command-recovery-journal.test.ts`.
- **Interactive process killed mid-turn.** I did not trace this path. Partial lines are repaired on open; an in-flight tool result may be lost.

### 2.5 Tests

- **Count.** Static count of `it`/`test` calls, not run: coding-agent about 3,232 (293 files); ai about 405 (31 files); tui about 283 (16 files); agent about 63 (3 files). Total about 3,983 across 343 test files.
- **Covered:** compaction (about 52 cases), session persistence (`test/session-manager/*`, about 10 files), retry events (`test/suite/agent-session-retry-events.test.ts`), worker recovery, overflow patterns, ACP, daemon.
- **Gaps:**
  1. Provider failover: no test, because there is no mechanism to test.
  2. Long sessions: no test found by name or keyword ("long session", "many turns").
  3. A real local OpenAI-compatible server: none. The only live local test is `ai/test/stream.test.ts:1438-1452`, an Ollama test that is skipped unless `which ollama` succeeds.
  4. Compaction with a small window: none found.
  5. Power-loss durability: none.
  6. `models.json` failure modes: `test/model-registry.test.ts` exists; I did not check whether it asserts the silent skips.

### 2.6 Ranked gaps that would stop a local-model end-to-end test being boringly reliable

Ranked by impact.

1. **Silent 128k context default; no server probe.** `model-registry.ts:816`; `docs/models.md:19-30, :197`; no `n_ctx` or `/props` read anywhere. Effect: compaction (`compaction.ts:224`) never fires for a small server. The first sign is the server's "exceeds the available context size" (`ai/src/utils/overflow.ts:43`), and recovery gets one attempt (`agent-session.ts:1628-1629`). Fix: read the server's context at registration, or require `contextWindow` for local `openai-completions` providers and fail loudly.
2. **Keyless local models are hidden.** `model-registry.ts:860-867`, `:1301-1302`, `:1464-1467`; `docs/models.md:37` says `apiKey` "is required". There is no error, just a missing model. Fix: a local-provider flag or placeholder auth, and a diagnostic that shows "configured but hidden".
3. **No reserve clamp for small windows.** `compaction.ts:224`; `settings-manager.ts:1009`. Fix: clamp `reserveTokens` to a fraction of `contextWindow` and test with an 8k fixture.
4. **Output budget is not checked against the window.** `model-registry.ts:817` defaults `maxTokens` to 16384, and `openai-completions.ts:620-623` sends it as `max_tokens`. With an 8k window, prompt plus 16384 cannot fit, and I found no check. I did not trace the caller that sets `options.maxTokens` for a session, so the exact path is unverified. Fix: clamp `max_tokens` to `contextWindow` minus the prompt estimate.
5. **`models.json` failures are silent.** `model-registry.ts:797` and `:800` skip models with no `api` or `baseUrl` without a diagnostic. A schema error empties all custom models (`:682-691`, `:722-725`, `:829`), and the error goes only to `console.error` and a stored error string. Fix: a visible diagnostic in the selector and in `/status`.
6. **No sampling or server-parameter controls.** `ModelDefinitionSchema` (`model-registry.ts:156-176`) has no `temperature`, `top_p`, `top_k`, `seed`, or `repeat_penalty`. The coding agent never sets `temperature` (only `src/core/semantic-edges.ts:147-162` does). `ai/src/providers/openai-completions.ts:627-628` would send it if set, and `ai/src/types.ts:79` defines it. Fix: add these fields to `models.json` and pass them through.
7. **No test against a real local server.** `ai/test/stream.test.ts:1438-1452` is Ollama only and skipped by default. There is no llama-server or LM Studio test, and other provider tests use the faux provider (`ai/src/providers/faux.ts`). Fix: a recorded `llama-server` `/v1/chat/completions` stream, including `reasoning_content`, plus a gated live test.
8. **Token estimate is chars/4 with no tokenizer.** `compaction.ts:230-287`. Local tokenizers can differ a lot on code and JSON, so the trigger fires early or late. Fix: rely on server-reported usage after each turn, and bound the trailing estimate. The usage path already exists (`calculateContextTokens`, `compaction.ts:137`).
9. **No failover.** `main.ts:897-926` falls back only at startup. `agent-session.ts:13350` (`_isRetryableError`) retries the same model. A crashed `llama-server` stops the session with no alternate model. Fix: a provider chain in settings, switched on connection errors.
10. **Durability: append without fsync.** `session-manager.ts:2058` and `:977`; no `fsync` anywhere in the file. Repair on open (`:683`) is tested only for torn bytes (`file-operations.test.ts:483`). A power cut can lose the last turns. Fix: `fsync` at assistant-message boundaries, plus a test that truncates mid-line after a successful append.

Other items, not in the top ten:

- **Offline is only partly covered.** Automatic `fd`/`rg` downloads (`interactive-mode.ts:1788`; `tools-manager.ts:134, 209`) and the package-update check (`startup-notices.ts:43-60`) are gated only by `PI_OFFLINE` (`tools-manager.ts:37`; `startup-notices.ts:47`). A local-only setup has no Cyan-named offline switch.
- **Stale state paths** (see §1.3 and §1.5): `daemon-supervisor-ownership.ts:317` writes under `~/.prime`, and the `ipython.ts:45` recovery message names the wrong directory.

## 3. Drag-and-drop model integration points (design input, no implementation)

### 3.1 Where prompt-box input lives

- The interactive prompt is `CustomEditor`, created at `packages/coding-agent/src/modes/interactive/interactive-mode.ts:1524-1529` and built on `packages/tui/src/components/editor.ts`. Submit is `this.defaultEditor.onSubmit` at `interactive-mode.ts:4998`.
- Input path: terminal stdin → `packages/tui/src/stdin-buffer.ts` (bracketed-paste parser, emits `"paste"` at `:285`) → `packages/tui/src/terminal.ts:262-265` (re-wraps as `\x1b[200~...\x1b[201~` and calls the input handler) → `tui.ts:897` `handleInput` → focused component → `editor.ts` paste accumulator (around `:785-794`) → `handlePaste` (`editor.ts:1301`).

### 3.2 Pasted text and bracketed paste

- **Yes, already handled.** Bracketed paste is parsed in two places: `stdin-buffer.ts:23-24, 271-285` and `editor.ts` around `:785-794`.
- **`handlePaste` (`editor.ts:1301`)** does four things:
  - decodes CSI-u control sequences (around `:1301-1318`);
  - strips control characters;
  - adds a leading space when pasted text starts with `/`, `~`, or `.` after a word character (`:1327-1332`);
  - collapses large pastes into `[paste #N +M lines]` or `[paste #N K chars]` markers (`:1349-1350`; regex at `:15-16`).
- **A dropped file is already a paste.** The editor inserts its path as text. Nothing turns it into an attachment. The heuristic checks only the first character, so shell-quoted paths, backslash-escaped spaces, `file://` URIs, and Windows `C:\` paths are not recognised. I could not verify what specific terminals send on a drop.

### 3.3 Existing attachment and reference mechanisms

- **Clipboard image paste.** Keybinding `app.clipboard.pasteImage` (`packages/coding-agent/src/core/keybindings.ts:131-133`) → `handleClipboardImagePaste` (`interactive-mode.ts:4742-4760`: `readClipboardImage` in `src/utils/clipboard-image.ts:239`, resize, base64) → an `[image #N]` marker (`src/modes/interactive/image-markers.ts:9-12`) → the `pastedImages` map (`interactive-mode.ts:1383`; retention cap at `:736-737`). This is the closest template for a "marker plus payload" attachment.
- **CLI `@file` arguments.** `processFileArguments` (`src/cli/file-processor.ts:18`) reads files and images at startup (`src/main.ts:324`). Image detection is in `src/utils/mime.ts:8`. It is not used in interactive mode: `main.ts` is the only caller, and typed `@file` text is not expanded at submit (I found no expansion code).
- **Interactive `@` completion.** `packages/tui/src/autocomplete.ts:95-102`. Completion only.

### 3.4 Plugging a runtime-registered model into the registry and selector

- Write the entry to `models.json` and call `ModelRegistry.refresh()` (`model-registry.ts:514`), or call `registerProvider` (`:1760`) directly. `registerProvider` requires `contextWindow` and `maxTokens` per model (`ProviderConfigInput`, `:1889-1915`). `unregisterProvider` is at `:1775`.
- The selector reads `modelRegistry.getAvailable()` (`model-selector.ts:340`). The model is hidden unless auth is configured (`model-registry.ts:1301`, `:1464`), so the key must be set.
- The chosen model is persisted as `defaultModel` (`settings-manager.ts:199`, setter at `:817`).

### 3.5 Where per-model settings live

- Per-model in `models.json`: `contextWindow`, `maxTokens`, `reasoning`, `thinkingLevelMap`, `input`, `cost`, `headers`, `compat` (`model-registry.ts:156-176`). Overrides are at `:178-205`.
- Provider-level compat: `model-registry.ts:112-135`.
- Global settings: `settings-manager.ts` (compaction at `:1008-1024`; `defaultModel` at `:199`; retry settings).
- **No sampling or server-launch parameters exist anywhere** in the schema.

### 3.6 Backend launch

- No existing code starts an inference server.
- Closest patterns: `src/core/tools/palette-runtime.ts:38-70` (resolves paths from env, then `palette.json`); `src/core/tools/palette.ts:218` (`spawn` with piped stdio for the Julia host); `src/core/tools/neurabash.ts:123` (`spawn`).
- Child lifecycle: `src/core/orphan-process-journal.ts` (cleanup) and the daemon supervisor (`src/modes/daemon/`).

### 3.7 Files and functions that would change (design list)

1. `packages/tui/src/components/editor.ts`, `handlePaste` (`:1301`): add a path-detection callback before the marker logic (`:1349`). Keep the paste-marker path for multi-line text.
2. `packages/coding-agent/src/modes/interactive/interactive-mode.ts`: editor setup (`:1524-1529`); `onSubmit` (`:4998`); a handler modelled on `handleClipboardImagePaste` (`:4742-4760`) and the `pastedImages` map (`:1383`).
3. A new module, for example `packages/coding-agent/src/core/local-models/`:
   - a GGUF header reader for context length and architecture (no GGUF parser exists in core; the only GGUF mentions are in `skills/rotorquant`);
   - path detection and quoting handling;
   - a model-definition builder.
4. `packages/coding-agent/src/core/model-registry.ts`:
   - `registerProvider` (`:1760`), `refresh` (`:514`);
   - `hasConfiguredAuth` (`:1301`) for keyless local providers;
   - the schema (`:156-205`), to add sampling and launch fields;
   - the default `contextWindow` (`:816`), which must not apply to auto-detected models.
5. `packages/coding-agent/src/core/settings-manager.ts`: per-model defaults (new); `defaultModel` (`:817`).
6. `packages/coding-agent/src/modes/interactive/components/model-selector.ts` (`:340`): show locally registered models and their state.
7. Backend lifecycle: a new module modelled on `palette-runtime.ts` and `neurabash.ts`'s `spawn`, with `orphan-process-journal.ts` for cleanup. Decide whether it lives here or in Gesso.
8. Tests: `packages/coding-agent/test/model-registry.test.ts`; a paste-path test next to the TUI tests.

### 3.8 Blockers

- **B1, ownership of local inference.** `AGENTS.md:281` and the RPD docs name Gesso as the local-inference owner, and no integration code exists here. Deciding whether the launcher lives in Cyan or calls into Gesso is a Matt decision.
- **B2, keyless visibility.** `model-registry.ts:1301` and `:1464` hide keyless models. A design decision is needed for local providers.
- **B3, no GGUF metadata reader.** Context length and architecture must be read from the file. The 128000 fallback must not apply to auto-registered models.
- **B4, terminal drop formats unverified.** Quoting, `file://`, and Windows paths are not handled, and the heuristic checks only the first character (`editor.ts:1327`).
- **B5, no process supervision for an inference server.** Crash and orphan handling needs the same care as the Julia host (`palette.ts:218`).
- **B6, default substrate is Palette.** `cyan.sh:7` defaults to the Palette substrate, so a local-model test also needs the Palette SDK present (`README.md:67-68`).

## 4. Not checked or could not verify

- Did not run any test suite, the TUI, or the onboarding flow. Did not start any model server. No network access, no provider calls, nothing written to `~/.cyan` or `~/.prime`.
- Did not trace the caller that sets `options.maxTokens` for a session (gap 4 depends on the 16384 default reaching the request).
- Did not confirm whether `src/core/migrations.ts:114` (upstream `~/.pi/agent` session migration) runs automatically.
- Did not hand-check all 3,090 lines; the bucket counts rest on the rules plus a 40-line sample.
- Did not check the packaged binary name: `packages/coding-agent/package.json:10-12` still declares bin `pi`.
- `src/themes/prime-logo.ts` is an orphan by grep of `src/` only; I did not grep the tests.
- Did not verify what any real terminal emulator sends on a file drop.
- Did not verify the llama.cpp claims beyond code comments and the existing overflow regexes.
- Did not run `npm run check`, `npm test`, or any other package script beyond `check-test-policy.mjs`.
- The commit `5484e6b98` was made by the coordinating Claude session during this audit. I did not make it.

## Appendix A. Per-file bucket counts (occurrences)

Counts are mention occurrences per file, by bucket. Sorted by total.

| File | (a) keep | (b) user-visible | (c) internal | (d) docs/prose | Total |
|---|---:|---:|---:|---:|---:|
| `install.sh` | 0 | 26 | 854 | 0 | 880 |
| `packages/coding-agent/CHANGELOG.md` | 0 | 0 | 0 | 145 | 145 |
| `packages/coding-agent/README.md` | 0 | 0 | 0 | 130 | 130 |
| `packages/coding-agent/test/native-installer.test.ts` | 1 | 2 | 98 | 0 | 101 |
| `packages/coding-agent/test/daemon-mode.test.ts` | 0 | 0 | 73 | 0 | 73 |
| `scripts/check-installer.mjs` | 0 | 12 | 50 | 0 | 62 |
| `packages/coding-agent/src/core/tools/ipython.ts` | 0 | 5 | 50 | 1 | 56 |
| `.github/workflows/build-binaries.yml` | 0 | 0 | 45 | 0 | 45 |
| `packages/coding-agent/test/daemon-client.test.ts` | 0 | 3 | 42 | 0 | 45 |
| `packages/coding-agent/docs/quickstart.md` | 0 | 0 | 0 | 37 | 37 |
| `packages/coding-agent/docs/packages.md` | 0 | 0 | 0 | 36 | 36 |
| `prime-agent-runtime/test/test_bash.py` | 1 | 0 | 35 | 0 | 36 |
| `packages/ai/README.md` | 0 | 0 | 0 | 35 | 35 |
| `packages/coding-agent/src/modes/acp/acp-meta.ts` | 7 | 0 | 21 | 6 | 34 |
| `packages/coding-agent/docs/standalone-binaries.md` | 0 | 0 | 0 | 32 | 32 |
| `packages/coding-agent/docs/extensions.md` | 0 | 0 | 0 | 29 | 29 |
| `packages/coding-agent/docs/skills.md` | 0 | 0 | 0 | 28 | 28 |
| `packages/coding-agent/src/core/kernel/bootstrap.ts` | 0 | 3 | 25 | 0 | 28 |
| `packages/coding-agent/test/npm-native-bridge.test.ts` | 0 | 1 | 26 | 0 | 27 |
| `packages/coding-agent/test/suite/acp-mode.test.ts` | 24 | 2 | 0 | 0 | 26 |
| `packages/coding-agent/src/cli/npm-native-bridge.ts` | 0 | 2 | 23 | 0 | 25 |
| `packages/coding-agent/test/prime-inference-auth.test.ts` | 7 | 0 | 15 | 0 | 22 |
| `packages/coding-agent/docs/development.md` | 0 | 0 | 0 | 21 | 21 |
| `packages/coding-agent/test/kernel-bootstrap.test.ts` | 0 | 0 | 21 | 0 | 21 |
| `packages/coding-agent/src/modes/interactive/auth-flows.ts` | 10 | 2 | 8 | 0 | 20 |
| `packages/coding-agent/docs/settings.md` | 0 | 0 | 0 | 19 | 19 |
| `packages/coding-agent/src/modes/acp/acp-events.ts` | 8 | 0 | 7 | 4 | 19 |
| `packages/coding-agent/src/modes/acp/acp-mode.ts` | 15 | 0 | 0 | 4 | 19 |
| `packages/coding-agent/test/version-check.test.ts` | 9 | 2 | 8 | 0 | 19 |
| `packages/coding-agent/docs/acp.md` | 0 | 0 | 0 | 18 | 18 |
| `packages/coding-agent/src/core/prime-inference-auth.ts` | 10 | 3 | 5 | 0 | 18 |
| `packages/coding-agent/test/incident.test.ts` | 1 | 5 | 12 | 0 | 18 |
| `packages/coding-agent/test/installer-release-format.test.ts` | 0 | 2 | 15 | 0 | 17 |
| `AGENTS.md` | 0 | 0 | 0 | 16 | 16 |
| `packages/coding-agent/test/release-workflow.test.ts` | 0 | 2 | 14 | 0 | 16 |
| `packages/coding-agent/test/kernel-bootstrap-windows.test.ts` | 0 | 5 | 10 | 0 | 15 |
| `scripts/pack-prime-agent-release.mjs` | 0 | 1 | 14 | 0 | 15 |
| `packages/ai/CHANGELOG.md` | 0 | 0 | 0 | 14 | 14 |
| `packages/coding-agent/src/cli/native-update.ts` | 1 | 1 | 12 | 0 | 14 |
| `packages/coding-agent/test/fixtures/owned-session-worker-fixture.ts` | 0 | 0 | 14 | 0 | 14 |
| `packages/coding-agent/test/native-update.test.ts` | 0 | 0 | 14 | 0 | 14 |
| `packages/tui/README.md` | 0 | 0 | 0 | 14 | 14 |
| `prime-agent-runtime/src/rlm/bash.py` | 3 | 1 | 8 | 2 | 14 |
| `scripts/benchmarks/tests/test_benchmarks.py` | 7 | 0 | 7 | 0 | 14 |
| `scripts/benchmarks/worker.py` | 0 | 0 | 14 | 0 | 14 |
| `packages/coding-agent/docs/mcp-integrations.md` | 0 | 0 | 0 | 13 | 13 |
| `packages/coding-agent/test/compiled-artifact.test.ts` | 0 | 0 | 13 | 0 | 13 |
| `packages/coding-agent/test/daemon-multiclient-bench.ts` | 0 | 3 | 10 | 0 | 13 |
| `packages/coding-agent/test/suite/regressions/4685-daemon-client-modes.test.ts` | 0 | 0 | 13 | 0 | 13 |
| `packages/coding-agent/test/agent-connection-daemon.test.ts` | 0 | 0 | 12 | 0 | 12 |
| `packages/coding-agent/test/daemon-command.test.ts` | 0 | 0 | 12 | 0 | 12 |
| `packages/coding-agent/test/suite/acp-features.test.ts` | 6 | 3 | 2 | 1 | 12 |
| `packages/coding-agent/docs/rlm-runtime.md` | 0 | 0 | 0 | 11 | 11 |
| `packages/coding-agent/docs/sessions.md` | 0 | 0 | 0 | 11 | 11 |
| `packages/coding-agent/docs/usage.md` | 0 | 0 | 0 | 11 | 11 |
| `packages/coding-agent/src/modes/interactive/interactive-mode.ts` | 10 | 0 | 1 | 0 | 11 |
| `packages/coding-agent/test/owned-session-worker-process.test.ts` | 0 | 0 | 11 | 0 | 11 |
| `prime-agent-runtime/test/test_repl.py` | 7 | 0 | 4 | 0 | 11 |
| `scripts/evals/swarm_fanout/runner.py` | 0 | 0 | 11 | 0 | 11 |
| `.github/workflows/standalone-binaries.yml` | 0 | 0 | 10 | 0 | 10 |
| `packages/coding-agent/docs/index.md` | 0 | 0 | 0 | 10 | 10 |
| `packages/coding-agent/docs/terminal-setup.md` | 0 | 0 | 0 | 10 | 10 |
| `packages/coding-agent/src/cli/daemon-ps.ts` | 1 | 1 | 3 | 5 | 10 |
| `packages/coding-agent/src/core/agent-traces.ts` | 5 | 1 | 4 | 0 | 10 |
| `packages/coding-agent/test/ipython-bootstrap.test.ts` | 0 | 4 | 6 | 0 | 10 |
| `packages/tui/CHANGELOG.md` | 0 | 0 | 0 | 10 | 10 |
| `packages/agent/README.md` | 0 | 0 | 0 | 9 | 9 |
| `packages/coding-agent/skills/skill-creator/references/python-skills.md` | 0 | 0 | 0 | 9 | 9 |
| `packages/coding-agent/src/cli/daemon-command.ts` | 0 | 9 | 0 | 0 | 9 |
| `packages/coding-agent/src/utils/native-installation.ts` | 0 | 0 | 9 | 0 | 9 |
| `packages/coding-agent/test/ambient-env.ts` | 0 | 0 | 8 | 1 | 9 |
| `packages/coding-agent/test/daemon-ps.test.ts` | 2 | 1 | 6 | 0 | 9 |
| `packages/coding-agent/test/native-probe-timeout.test.ts` | 0 | 0 | 9 | 0 | 9 |
| `packages/coding-agent/test/repl-kernel-parent-watchdog.test.ts` | 0 | 0 | 9 | 0 | 9 |
| `packages/coding-agent/test/repl-kernel-state-roundtrip.test.ts` | 0 | 0 | 9 | 0 | 9 |
| `packages/coding-agent/test/telemetry.test.ts` | 0 | 0 | 9 | 0 | 9 |
| `scripts/preview-installer-splash.sh` | 0 | 4 | 5 | 0 | 9 |
| `CONTRIBUTING.md` | 0 | 0 | 0 | 8 | 8 |
| `packages/ai/test/cache-retention.test.ts` | 0 | 1 | 7 | 0 | 8 |
| `packages/coding-agent/docs/themes.md` | 0 | 0 | 0 | 8 | 8 |
| `packages/coding-agent/skills/prime-intellect/SKILL.md` | 0 | 0 | 0 | 8 | 8 |
| `packages/coding-agent/test/config.test.ts` | 0 | 0 | 8 | 0 | 8 |
| `scripts/check-push-guard.mjs` | 2 | 0 | 6 | 0 | 8 |
| `scripts/evals/short_swe/tests/test_short_swe.py` | 4 | 0 | 4 | 0 | 8 |
| `.github/workflows/ci.yml` | 0 | 0 | 7 | 0 | 7 |
| `README.md` | 0 | 0 | 0 | 7 | 7 |
| `packages/coding-agent/src/modes/daemon/daemon-worker-protocol.ts` | 0 | 0 | 7 | 0 | 7 |
| `packages/coding-agent/test/package-command-paths.test.ts` | 0 | 0 | 7 | 0 | 7 |
| `scripts/evals/short_swe/prepare.py` | 0 | 0 | 7 | 0 | 7 |
| `scripts/evals/swarm_fanout/tests/test_swarm_fanout.py` | 0 | 0 | 5 | 2 | 7 |
| `packages/coding-agent/docs/compaction.md` | 0 | 0 | 0 | 6 | 6 |
| `packages/coding-agent/docs/session-format.md` | 0 | 0 | 0 | 6 | 6 |
| `packages/coding-agent/docs/termux.md` | 0 | 0 | 0 | 6 | 6 |
| `packages/coding-agent/src/cli/owned-session-worker.ts` | 0 | 1 | 5 | 0 | 6 |
| `packages/coding-agent/src/core/kernel/repl-manager.ts` | 0 | 0 | 4 | 2 | 6 |
| `packages/coding-agent/src/modes/daemon/daemon-runtime-identity.ts` | 0 | 0 | 6 | 0 | 6 |
| `packages/coding-agent/src/utils/version-check.ts` | 0 | 0 | 6 | 0 | 6 |
| `packages/coding-agent/test/agents-view-incident-notice.test.ts` | 1 | 2 | 3 | 0 | 6 |
| `packages/coding-agent/test/config-native-update.test.ts` | 0 | 0 | 6 | 0 | 6 |
| `packages/coding-agent/test/release-signatures.test.ts` | 0 | 0 | 6 | 0 | 6 |
| `scripts/assemble-release-archives.mjs` | 0 | 0 | 6 | 0 | 6 |
| `scripts/benchmarks/tests/test_ui.py` | 6 | 0 | 0 | 0 | 6 |
| `scripts/benchmarks/tests/test_worker_release.py` | 0 | 0 | 6 | 0 | 6 |
| `.github/DISCUSSION_TEMPLATE/bug-reports.yml` | 0 | 0 | 0 | 5 | 5 |
| `.github/workflows/benchmarks.yml` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/docs/sdk.md` | 0 | 0 | 0 | 5 | 5 |
| `packages/coding-agent/package.json` | 1 | 4 | 0 | 0 | 5 |
| `packages/coding-agent/scripts/catalog-assets.mjs` | 4 | 1 | 0 | 0 | 5 |
| `packages/coding-agent/scripts/copy-binary-assets.mjs` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/skills/arxiv/src/prime_agent_arxiv.egg-info/SOURCES.txt` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/skills/free-model-optimizer/src/prime_agent_free_model_optimizer.egg-info/SOURCES.txt` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/skills/neurosymbolic-harness/src/prime_agent_neurosymbolic_harness.egg-info/SOURCES.txt` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/skills/rotorquant/src/prime_agent_rotorquant.egg-info/SOURCES.txt` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/skills/subquad-attention/src/prime_agent_subquad_attention.egg-info/SOURCES.txt` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/skills/symbolic-memory/src/prime_agent_symbolic_memory.egg-info/SOURCES.txt` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/skills/tencentdb-memory/src/prime_agent_tencentdb_memory.egg-info/SOURCES.txt` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/skills/websearch/SKILL.md` | 0 | 0 | 0 | 5 | 5 |
| `packages/coding-agent/skills/websearch/src/websearch/websearch.py` | 0 | 2 | 3 | 0 | 5 |
| `packages/coding-agent/skills/wikipedia/src/prime_agent_wikipedia.egg-info/SOURCES.txt` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/src/cli/incident.ts` | 0 | 5 | 0 | 0 | 5 |
| `packages/coding-agent/src/postinstall.ts` | 0 | 1 | 4 | 0 | 5 |
| `packages/coding-agent/test/agent-session-services.test.ts` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/test/daemon-state-root.test.ts` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/test/daemon-supervisor-process.test.ts` | 0 | 0 | 5 | 0 | 5 |
| `packages/coding-agent/test/interactive-update-relaunch.test.ts` | 0 | 0 | 5 | 0 | 5 |
| `scripts/benchmarks/ui.py` | 0 | 0 | 5 | 0 | 5 |
| `scripts/evals/short_swe/build_controller.py` | 0 | 0 | 5 | 0 | 5 |
| `scripts/evals/short_swe/builder.py` | 0 | 0 | 5 | 0 | 5 |
| `scripts/evals/short_swe/secure_harbor.py` | 0 | 2 | 3 | 0 | 5 |
| `cyan.sh` | 3 | 0 | 2 | 0 | 5 |
| `.github/ISSUE_TEMPLATE/bug-report.yml` | 0 | 0 | 0 | 4 | 4 |
| `.github/ISSUE_TEMPLATE/config.yml` | 0 | 0 | 0 | 4 | 4 |
| `.github/workflows/nightly-process-stress.yml` | 0 | 0 | 4 | 0 | 4 |
| `REBRAND.md` | 0 | 0 | 0 | 4 | 4 |
| `packages/coding-agent/docs/custom-provider.md` | 0 | 0 | 0 | 4 | 4 |
| `packages/coding-agent/docs/providers.md` | 0 | 0 | 0 | 4 | 4 |
| `packages/coding-agent/docs/rpc.md` | 0 | 0 | 0 | 4 | 4 |
| `packages/coding-agent/docs/tui.md` | 0 | 0 | 0 | 4 | 4 |
| `packages/coding-agent/src/config.ts` | 2 | 0 | 1 | 1 | 4 |
| `packages/coding-agent/src/core/kernel/shared.ts` | 4 | 0 | 0 | 0 | 4 |
| `packages/coding-agent/src/core/model-registry.ts` | 0 | 0 | 2 | 2 | 4 |
| `packages/coding-agent/src/modes/agents-view/agents-view-mode.ts` | 0 | 4 | 0 | 0 | 4 |
| `packages/coding-agent/src/modes/agents-view/incident-notices.ts` | 0 | 4 | 0 | 0 | 4 |
| `packages/coding-agent/src/modes/daemon/daemon-catalog-process.ts` | 0 | 2 | 2 | 0 | 4 |
| `packages/coding-agent/src/modes/daemon/daemon-mode.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/acp-events.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/acp-kernel-features.test.ts` | 3 | 0 | 1 | 0 | 4 |
| `packages/coding-agent/test/agent-traces.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/catalog-assets.test.ts` | 4 | 0 | 0 | 0 | 4 |
| `packages/coding-agent/test/daemon-peer-transport.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/herdr-agent-state.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/kernel-bootstrap-runtime-ready.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/migrations.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/model-registry.test.ts` | 0 | 2 | 1 | 1 | 4 |
| `packages/coding-agent/test/onboarding-choice.test.ts` | 2 | 2 | 0 | 0 | 4 |
| `packages/coding-agent/test/package-self-update-daemon.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/repl-kernel-mcp-shutdown.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/suite/agent-session-compaction.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/suite/agent-session-prompt.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/suite/agent-session-queue.test.ts` | 0 | 0 | 4 | 0 | 4 |
| `packages/coding-agent/test/suite/daemon-serialized-refine-process.test.ts` | 0 | 0 | 3 | 1 | 4 |
| `prime-agent-runtime/test/test_harness.py` | 0 | 0 | 4 | 0 | 4 |
| `prime-agent.sh` | 0 | 0 | 4 | 0 | 4 |
| `.github/scripts/discussion-notifier/notify.py` | 3 | 0 | 0 | 0 | 3 |
| `.github/workflows/behavioral-evals.yml` | 0 | 0 | 3 | 0 | 3 |
| `.github/workflows/benchmark-completed.yml` | 0 | 0 | 3 | 0 | 3 |
| `QUICK_START.md` | 0 | 0 | 0 | 3 | 3 |
| `packages/ai/src/utils/oauth/oauth-page.ts` | 3 | 0 | 0 | 0 | 3 |
| `packages/coding-agent/docs/daemon.md` | 0 | 0 | 0 | 3 | 3 |
| `packages/coding-agent/docs/json.md` | 0 | 0 | 0 | 3 | 3 |
| `packages/coding-agent/docs/keybindings.md` | 0 | 0 | 0 | 3 | 3 |
| `packages/coding-agent/docs/tmux.md` | 0 | 0 | 0 | 3 | 3 |
| `packages/coding-agent/examples/extensions/README.md` | 0 | 0 | 0 | 3 | 3 |
| `packages/coding-agent/examples/extensions/subagent/README.md` | 0 | 0 | 0 | 3 | 3 |
| `packages/coding-agent/skills/agent-message/src/agent_message/__init__.py` | 1 | 1 | 0 | 1 | 3 |
| `packages/coding-agent/skills/arxiv/pyproject.toml` | 0 | 2 | 1 | 0 | 3 |
| `packages/coding-agent/skills/arxiv/src/prime_agent_arxiv.egg-info/PKG-INFO` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/skills/free-model-optimizer/pyproject.toml` | 0 | 2 | 1 | 0 | 3 |
| `packages/coding-agent/skills/free-model-optimizer/src/prime_agent_free_model_optimizer.egg-info/PKG-INFO` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/skills/knowledge-graph/pyproject.toml` | 0 | 2 | 1 | 0 | 3 |
| `packages/coding-agent/skills/neurosymbolic-harness/pyproject.toml` | 0 | 2 | 1 | 0 | 3 |
| `packages/coding-agent/skills/neurosymbolic-harness/src/prime_agent_neurosymbolic_harness.egg-info/PKG-INFO` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/skills/rotorquant/pyproject.toml` | 0 | 2 | 1 | 0 | 3 |
| `packages/coding-agent/skills/rotorquant/src/prime_agent_rotorquant.egg-info/PKG-INFO` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/skills/skill-creator/SKILL.md` | 0 | 0 | 0 | 3 | 3 |
| `packages/coding-agent/skills/subquad-attention/pyproject.toml` | 0 | 2 | 1 | 0 | 3 |
| `packages/coding-agent/skills/subquad-attention/src/prime_agent_subquad_attention.egg-info/PKG-INFO` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/skills/symbolic-memory/pyproject.toml` | 0 | 2 | 1 | 0 | 3 |
| `packages/coding-agent/skills/symbolic-memory/src/prime_agent_symbolic_memory.egg-info/PKG-INFO` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/skills/tencentdb-memory/pyproject.toml` | 0 | 2 | 1 | 0 | 3 |
| `packages/coding-agent/skills/tencentdb-memory/src/prime_agent_tencentdb_memory.egg-info/PKG-INFO` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/skills/websearch/pyproject.toml` | 0 | 1 | 2 | 0 | 3 |
| `packages/coding-agent/skills/wikipedia/pyproject.toml` | 0 | 2 | 1 | 0 | 3 |
| `packages/coding-agent/skills/wikipedia/src/prime_agent_wikipedia.egg-info/PKG-INFO` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/src/cli/global-flags.ts` | 0 | 3 | 0 | 0 | 3 |
| `packages/coding-agent/src/cli/node-version-check.ts` | 1 | 2 | 0 | 0 | 3 |
| `packages/coding-agent/src/core/agent-session.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/src/core/semantic-edges.ts` | 0 | 0 | 1 | 2 | 3 |
| `packages/coding-agent/src/core/tools/neurabash.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/src/main.ts` | 0 | 3 | 0 | 0 | 3 |
| `packages/coding-agent/src/modes/daemon/daemon-socket.ts` | 1 | 0 | 2 | 0 | 3 |
| `packages/coding-agent/test/agent-session-recursion.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/auth-flows.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/daemon-launch.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/daemon-socket.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/refinement.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/repl-kernel-execute.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/repl-kernel-pipe-errors.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/request-timing.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/shell-env.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/suite/regressions/4603-worker-recovery.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/suite/regressions/4606-update-restart-coordinator.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `packages/coding-agent/test/suite/regressions/6006-bundled-bedrock.test.ts` | 0 | 0 | 3 | 0 | 3 |
| `prime-agent-runtime/src/rlm/__init__.py` | 0 | 1 | 0 | 2 | 3 |
| `prime-agent-runtime/src/rlm/harness.py` | 0 | 1 | 1 | 1 | 3 |
| `prime-agent-runtime/src/rlm/mcp_base.py` | 0 | 2 | 1 | 0 | 3 |
| `scripts/benchmarks/README.md` | 0 | 0 | 0 | 3 | 3 |
| `scripts/check-test-policy.mjs` | 0 | 0 | 3 | 0 | 3 |
| `scripts/evals/short_swe/tests/test_hosted_eval.py` | 1 | 0 | 2 | 0 | 3 |
| `scripts/pre-push-guard.sh` | 0 | 0 | 2 | 1 | 3 |
| `scripts/validate-macos-release.mjs` | 0 | 0 | 3 | 0 | 3 |
| `docs/goals/CYAN_ONBOARDING_REBRAND.md` | 0 | 0 | 0 | 3 | 3 |
| `.github/scripts/discussion-notifier/test_notify.py` | 1 | 0 | 1 | 0 | 2 |
| `package.json` | 0 | 1 | 1 | 0 | 2 |
| `packages/ai/scripts/generate-models.ts` | 1 | 0 | 1 | 0 | 2 |
| `packages/coding-agent/.changes/update-restart-blocked-session-hint.md` | 0 | 0 | 0 | 2 | 2 |
| `packages/coding-agent/docs/docs.json` | 0 | 0 | 0 | 2 | 2 |
| `packages/coding-agent/docs/prompt-templates.md` | 0 | 0 | 0 | 2 | 2 |
| `packages/coding-agent/scripts/build-binary.mjs` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/skills/agent-observe/pyproject.toml` | 0 | 1 | 1 | 0 | 2 |
| `packages/coding-agent/skills/agent-observe/src/agent_observe/__init__.py` | 0 | 1 | 0 | 1 | 2 |
| `packages/coding-agent/skills/attach-image/pyproject.toml` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/skills/compact/pyproject.toml` | 0 | 1 | 0 | 1 | 2 |
| `packages/coding-agent/skills/compact/src/compact/__init__.py` | 0 | 1 | 0 | 1 | 2 |
| `packages/coding-agent/skills/free-model-optimizer/src/free_model_optimizer/optimizer.py` | 0 | 2 | 0 | 0 | 2 |
| `packages/coding-agent/skills/goal/pyproject.toml` | 0 | 1 | 0 | 1 | 2 |
| `packages/coding-agent/skills/goal/src/goal/__init__.py` | 0 | 1 | 0 | 1 | 2 |
| `packages/coding-agent/skills/refine/pyproject.toml` | 0 | 1 | 0 | 1 | 2 |
| `packages/coding-agent/skills/refine/src/refine/__init__.py` | 0 | 1 | 0 | 1 | 2 |
| `packages/coding-agent/skills/rlm-heartbeat/pyproject.toml` | 0 | 1 | 0 | 1 | 2 |
| `packages/coding-agent/skills/rlm-heartbeat/src/rlm_heartbeat/__init__.py` | 0 | 1 | 0 | 1 | 2 |
| `packages/coding-agent/skills/symbolic-memory/SKILL.md` | 0 | 0 | 0 | 2 | 2 |
| `packages/coding-agent/skills/symbolic-memory/src/symbolic_memory/symbolic_memory.py` | 0 | 0 | 0 | 2 | 2 |
| `packages/coding-agent/src/core/extensions/builtin/herdr-agent-state.ts` | 0 | 0 | 1 | 1 | 2 |
| `packages/coding-agent/src/core/provider-display-names.ts` | 2 | 0 | 0 | 0 | 2 |
| `packages/coding-agent/src/core/session-lease.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/src/core/settings-manager.ts` | 0 | 2 | 0 | 0 | 2 |
| `packages/coding-agent/src/core/telemetry.ts` | 1 | 0 | 1 | 0 | 2 |
| `packages/coding-agent/src/modes/acp/index.ts` | 2 | 0 | 0 | 0 | 2 |
| `packages/coding-agent/src/modes/daemon/daemon-protocol.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/src/modes/daemon/daemon-supervisor.ts` | 1 | 1 | 0 | 0 | 2 |
| `packages/coding-agent/src/modes/index.ts` | 2 | 0 | 0 | 0 | 2 |
| `packages/coding-agent/src/package-manager-cli.ts` | 0 | 0 | 1 | 1 | 2 |
| `packages/coding-agent/test/args.test.ts` | 0 | 2 | 0 | 0 | 2 |
| `packages/coding-agent/test/binary-runtime-source.test.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/test/daemon-routed-client.test.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/test/fixtures/compiled-artifact-extension.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/test/fixtures/serialized-refine-marker-extension.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/test/ipython-provisioner.test.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/test/owned-session-worker.test.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/test/public-command.test.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/test/suite/regressions/4600-supervisor-singleton.test.ts` | 0 | 0 | 2 | 0 | 2 |
| `packages/coding-agent/test/tools-manager.test.ts` | 0 | 0 | 2 | 0 | 2 |
| `prime-agent-runtime/pyproject.toml` | 0 | 1 | 1 | 0 | 2 |
| `prime-agent-runtime/src/rlm/mcp.py` | 0 | 1 | 1 | 0 | 2 |
| `prime-agent-runtime/src/rlm/repl.py` | 0 | 0 | 2 | 0 | 2 |
| `scripts/benchmarks/cli.py` | 1 | 1 | 0 | 0 | 2 |
| `scripts/benchmarks/report.py` | 0 | 2 | 0 | 0 | 2 |
| `scripts/benchmarks/tests/test_catalog.py` | 0 | 0 | 2 | 0 | 2 |
| `scripts/benchmarks/tests/test_failure_reporting.py` | 1 | 1 | 0 | 0 | 2 |
| `scripts/smoke-npm-pack-assets.mjs` | 0 | 0 | 2 | 0 | 2 |
| `.github/DISCUSSION_TEMPLATE/feature-requests.yml` | 0 | 0 | 0 | 1 | 1 |
| `.github/DISCUSSION_TEMPLATE/general.yml` | 0 | 0 | 0 | 1 | 1 |
| `.github/PULL_REQUEST_TEMPLATE.md` | 0 | 0 | 0 | 1 | 1 |
| `.github/dependabot.yml` | 0 | 0 | 0 | 1 | 1 |
| `.github/workflows/discussion-slack.yml` | 0 | 0 | 1 | 0 | 1 |
| `.gitignore` | 0 | 0 | 1 | 0 | 1 |
| `HARNESS_PROVENANCE.md` | 0 | 0 | 0 | 1 | 1 |
| `LICENSE` | 1 | 0 | 0 | 0 | 1 |
| `SECURITY.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/agent/package.json` | 1 | 0 | 0 | 0 | 1 |
| `packages/ai/.changes/opus-5-5-always-on-adaptive.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/ai/package.json` | 1 | 0 | 0 | 0 | 1 |
| `packages/ai/src/mcp/catalog.ts` | 0 | 0 | 0 | 1 | 1 |
| `packages/ai/src/mcp/oauth.ts` | 0 | 1 | 0 | 0 | 1 |
| `packages/ai/src/models.generated.ts` | 0 | 0 | 0 | 1 | 1 |
| `packages/ai/src/providers/opencode-headers.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/.changes/agents-view-incident-notice.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/.changes/daemon-incident-cli.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/.changes/fix-daemon-ps-worker-pipes.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/.changes/flaky-artifact-and-probe.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/.changes/kernel-error-text-cap.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/.changes/rsi-pre-push-mirror-guard.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/.changes/sessions-ops-table.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/docs/shell-aliases.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/docs/windows.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/examples/README.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/examples/extensions/custom-refinement.ts` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/examples/sdk/README.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/postinstall.cjs` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/skills/agent-message/pyproject.toml` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/skills/arxiv/SKILL.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/arxiv/src/arxiv/__init__.py` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/skills/attach-image/src/attach_image/attach_image.py` | 1 | 0 | 0 | 0 | 1 |
| `packages/coding-agent/skills/edit/src/edit/__init__.py` | 1 | 0 | 0 | 0 | 1 |
| `packages/coding-agent/skills/free-model-optimizer/SKILL.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/free-model-optimizer/src/free_model_optimizer/__init__.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/knowledge-graph/README.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/neurosymbolic-harness/SKILL.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/neurosymbolic-harness/src/neurosymbolic_harness/__init__.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/neurosymbolic/src/neurosymbolic/__init__.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/prime-intellect/references/compute.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/prime-intellect/references/environments.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/rotorquant/SKILL.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/rotorquant/src/rotorquant/__init__.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/rotorquant/src/rotorquant/integration.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/subquad-attention/src/subquad_attention/__init__.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/subquad-attention/src/subquad_attention/integration.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/symbolic-memory/src/symbolic_memory/__init__.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/tencentdb-memory/SKILL.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/tencentdb-memory/src/tencentdb_memory/__init__.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/tencentdb-memory/src/tencentdb_memory/integration.py` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/wikipedia/SKILL.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/wikipedia/src/wikipedia/__init__.py` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/skills/wolfram-alpha/SKILL.md` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/skills/wolfram-alpha/src/wolfram_alpha/__init__.py` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/src/cli-main.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/src/cli/args.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/src/cli/daemon-stop-confirm.ts` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/src/cli/public-command.ts` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/src/cli/sessions-table-format.ts` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/src/cli/subprocess-launch.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/src/core/agent-session-services.ts` | 1 | 0 | 0 | 0 | 1 |
| `packages/coding-agent/src/core/autonomous.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/src/core/default-model-catalog.ts` | 1 | 0 | 0 | 0 | 1 |
| `packages/coding-agent/src/core/kernel/boot-gate.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/src/core/mcp/connection-probe.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/src/core/mcp/service-catalog.ts` | 1 | 0 | 0 | 0 | 1 |
| `packages/coding-agent/src/core/orphan-process-journal.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/src/core/package-manager.ts` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/src/core/provider-model-catalog.ts` | 1 | 0 | 0 | 0 | 1 |
| `packages/coding-agent/src/core/refinement/refinement.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/src/core/slash-commands.ts` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/src/modes/acp/acp-stop-reason.ts` | 0 | 0 | 0 | 1 | 1 |
| `packages/coding-agent/src/modes/daemon/daemon-supervisor-ownership.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/src/modes/interactive/components/prime-onboarding-splash.ts` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/src/modes/interactive/components/settings-selector.ts` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/src/utils/pi-user-agent.ts` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/test/agents-view-mode.test.ts` | 0 | 1 | 0 | 0 | 1 |
| `packages/coding-agent/test/agents-view-state.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/builtin-skills.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/command-recovery-journal.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/cron-jobs-state-snapshot.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/cron-jobs.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/daemon-supervisor-launch.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/daemon-supervisor-monitor.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/daemon-supervisor-ownership.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/default-model-catalog.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/exec.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/fixtures/eng-4606-update-launcher.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/fixtures/eng-4685-event-order-extension.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/fixtures/skills/python-skill/pyproject.toml` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/kernel-attach-image-skill.test.ts` | 1 | 0 | 0 | 0 | 1 |
| `packages/coding-agent/test/login-dialog.test.ts` | 1 | 0 | 0 | 0 | 1 |
| `packages/coding-agent/test/main-interactive-routing.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/release-validation-receipts.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/repl-kernel-protocol-corruption.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/repl-kernel-shutdown.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/repl-kernel-startup.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/resolve-config-value.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/service-catalog-picker.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/session-artifacts-delete.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/session-manager/append-to-existing-file.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/skills.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/stdin-guard-cold-cli.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/suite/regressions/1922-daemon-draft-discard-safety.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/suite/regressions/2053-background-bash-passivation.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/suite/regressions/4257-update-restart-resume.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/suite/regressions/4649-subagent-model-selection.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/suite/regressions/6009-opencode-maintenance-session.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/coding-agent/test/worker-recovery-journal.test.ts` | 0 | 0 | 1 | 0 | 1 |
| `packages/tui/package.json` | 1 | 0 | 0 | 0 | 1 |
| `prime-agent-runtime/src/rlm/skill.py` | 0 | 1 | 0 | 0 | 1 |
| `prime-agent-runtime/test/test_mcp.py` | 0 | 0 | 1 | 0 | 1 |
| `prime-agent-runtime/uv.lock` | 0 | 0 | 1 | 0 | 1 |
| `scripts/benchmarks/controller.py` | 0 | 0 | 1 | 0 | 1 |
| `scripts/benchmarks/github.py` | 0 | 1 | 0 | 0 | 1 |
| `scripts/benchmarks/pyproject.toml` | 0 | 0 | 1 | 0 | 1 |
| `scripts/benchmarks/terminal.py` | 0 | 1 | 0 | 0 | 1 |
| `scripts/benchmarks/tests/test_controller_diagnostics.py` | 0 | 1 | 0 | 0 | 1 |
| `scripts/benchmarks/uv.lock` | 0 | 0 | 1 | 0 | 1 |
| `scripts/evals/README.md` | 0 | 0 | 0 | 1 | 1 |
| `scripts/evals/short_swe/README.md` | 0 | 0 | 0 | 1 | 1 |
| `scripts/evals/short_swe/cleanup.py` | 0 | 0 | 1 | 0 | 1 |
| `scripts/evals/short_swe/oracle_harness.py` | 0 | 0 | 1 | 0 | 1 |
| `scripts/evals/short_swe/report.py` | 0 | 1 | 0 | 0 | 1 |
| `scripts/evals/short_swe/verified_verifier.py` | 0 | 1 | 0 | 0 | 1 |
| `scripts/evals/swarm_fanout/pyproject.toml` | 0 | 0 | 1 | 0 | 1 |
| `scripts/evals/swarm_fanout/uv.lock` | 0 | 0 | 1 | 0 | 1 |
| `scripts/release-artifact-integrity.mjs` | 0 | 0 | 1 | 0 | 1 |
| `scripts/release-platforms.mjs` | 0 | 0 | 1 | 0 | 1 |
| `scripts/run-neura-session.ts` | 0 | 0 | 0 | 1 | 1 |
| `docs/CYAN_REFINEMENT_START.md` | 0 | 0 | 0 | 1 | 1 |
| `docs/goals/CYAN_MVP_RUNTIME.md` | 0 | 0 | 0 | 1 | 1 |
| `scripts/setup-cyan.py` | 1 | 0 | 0 | 0 | 1 |
