# Cyan

**Cyan** is an agent harness with a persistent, sandboxed **Julia** workspace
powered by **Palette**. Models can retain experiment state and start recursive
sub-agents from Julia code. An explicit IPython alternate remains available for
inherited workflows.

Cyan is a fork and refactor of [Prime Agent](https://github.com/PrimeIntellect-ai/prime-agent)
by Prime Intellect, which is itself built on Mario Zechner's
[`pi`](https://github.com/earendil-works/pi). Their agent loop, sessions and
compaction, provider layer, RLM orchestration and terminal interface are the
chassis Cyan keeps. Thank you to Prime Intellect and to Mario Zechner for that
work, and for releasing it under the MIT License.

---

## What it is

| Layer | Language | Responsibility |
| --- | --- | --- |
| Agent chassis | TypeScript | Agent loop, sessions, compaction, providers, RLM orchestration, TUI |
| **Palette** operator surface | Julia | The model's execution environment: a persistent kernel with symbolic state |
| Palette host | Rust | Sandbox launcher, persistent session supervisor, capability broker |
| Broker & launch | Python | Capability negotiation, bwrap isolation, depot prewarm |

The agent is **Cyan**. The execution surface it drives is **Palette**. Colors go
on a palette.

## The Palette operator surface

The model's code tool is `palette`: a persistent Julia kernel in a bubblewrap
sandbox whose state survives kernel death and compaction, with authority
mediated by a host-side capability broker.

- **Bindings outlive the call.** A result bound in call *n* is still bound in
  call *n+1*. The model stops re-deriving what it already knows.
- **State survives the kernel dying.** A dead kernel revives what it can from
  saved state and reports exactly what was restored, rebuilt, or lost.
- **Sub-agents from Julia.** `Palette.rlm.spawn`, `collect`, `list_subagents`,
  `find_models`, `progress_note`, `delete_subagent` and `create_session` reach
  the chassis's RLM orchestration through the kernel's broker. The permission is
  off unless the session's ceiling names it.
- **Authority is explicit.** Competence is not authorization. The broker
  mediates every capability; nothing self-grants.

### Layout

```text
packages/       TypeScript agent loop, provider clients, sessions and terminal UI
scripts/        setup and repository checks
docs/           Cyan architecture and work contracts
cyan.sh         source launcher; keeps the caller's working directory
```

[Palette](https://github.com/latentcollapse/Palette.jl) is a separately prepared
SDK. Cyan points to its Julia project and Rust host rather than embedding a copy
of the experimental ChatGPT lab.

## Requirements and source setup

Use Linux with Node.js 22.8+, Julia 1.12+, Python 3 and bubblewrap (`bwrap`).
Preparing a new Palette host also requires Cargo. Native Windows launch is not
implemented by this source path.

```bash
npm ci --ignore-scripts --no-audit --no-fund
./cyan.sh setup --sdk /absolute/path/to/Palette
./cyan.sh --help
```

Setup instantiates the Palette Julia project, builds its host, verifies that
Palette loads, and writes `~/.cyan/agent/palette.json`. If the SDK and host are
already prepared, use `./cyan.sh setup --sdk /absolute/path/to/Palette --prepared`.
Use `--depot /absolute/path/to/depot` for a dedicated existing Julia depot.
Source launch does not require compiled TypeScript packages and works from any
working directory. No model credentials are copied during setup.

The local `cyan` wrapper, when installed on PATH, calls this source launcher.
`CYAN_AGENT_DIR` selects a different configuration directory. Cyan also uses
its own daemon socket there, separate from the upstream per-user daemon. `CYAN_SUBSTRATE=ipython`
selects the inherited alternate; missing Palette setup produces an error rather
than falling back silently. `--tools palette` explicitly selects Palette.

### Local models

Place an OpenAI-compatible provider in `~/.cyan/agent/models.json`:

```json
{
  "providers": {
    "local": {
      "baseUrl": "http://127.0.0.1:8080/v1",
      "api": "openai-completions",
      "apiKey": "local",
      "compat": { "supportsDeveloperRole": false, "supportsReasoningEffort": false },
      "models": [{ "id": "your-served-model-id", "contextWindow": 32768, "maxTokens": 4096 }]
    }
  }
}
```

Start your model server separately, then run `cyan --offline --provider local
--model your-served-model-id`. The endpoint must support tool calls. The literal
`local` key suits a server without authentication; use your server's actual
configuration if it requires credentials. Cloud providers remain optional.
See [custom models](packages/coding-agent/docs/models.md) for provider details.

### Runtime overrides

`CYAN_PALETTE_CONFIG` selects another runtime configuration file.
`PALETTE_PROJECT_DIR`, `PALETTE_HOST_BIN`, `PALETTE_REPO_DIR`, `PALETTE_JULIA_BIN`
and `JULIA_DEPOT_PATH` override prepared runtime paths. Each Cyan session has
its own kernel and durable state under the configuration directory's
`palette-state/`. Revival reports describe which state could be recovered.

## Verification

Run `npm run check` for the repository checks. Targeted tests run from
`packages/coding-agent`, for example:

```bash
npx tsx ../../node_modules/vitest/dist/cli.js --run test/palette-runtime.test.ts
```

The existing Palette integration suite additionally needs `PALETTE_PROJECT_DIR`,
`PALETTE_HOST_BIN`, and the prepared Julia depot. Keep its workspaces disposable;
do not point test sessions at a live lab workspace.

## Provider and upstream identities

Cyan uses `cyan` and `~/.cyan/agent` for its command and configuration.
Third-party package names, provider identifiers and inherited internal
`PRIME_AGENT_*` process variables keep their actual identities. Prime Intellect
is an optional model provider, alongside other providers and local endpoints;
its login is not required to use Cyan.

## Upstream documentation

The upstream documentation still applies to the chassis: [usage](packages/coding-agent/docs/usage.md),
[long-running agents](packages/coding-agent/docs/long-running-agents.md),
[RLM](packages/coding-agent/docs/rlm.md), [providers](packages/coding-agent/docs/providers.md),
[architecture](packages/coding-agent/docs/architecture.md).

## License

MIT; see [LICENSE](LICENSE). The copyright notices of Mario Zechner and Prime
Intellect are kept, as the license requires.

## Citing the upstream work

```bibtex
@article{karten2026prime,
  title={Prime Agent: A Self-Improving RLM Harness},
  author={Karten, Seth and Zhang, Alex L. and Thomas, Kevin and M{\"u}ller, Sebastian and Bakouch, Elie and Auras, Daniel and Senghaas, Mika and Obeid, Fares and Dunas, Konstantin and Hagemann, Johannes and Jaghouar, Sami},
  journal={arXiv preprint arXiv:2608.23552},
  year={2026}
}
```
