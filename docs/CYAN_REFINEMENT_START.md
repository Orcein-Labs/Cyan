# Cyan refinement starting point

Local entry point: `cyan` (`~/.local/bin/cyan`). It launches this checkout from the caller's current directory and forwards arguments unchanged. Configuration defaults to `~/.cyan/agent`, isolated from Prime Agent; `CYAN_AGENT_DIR` overrides it. `CYAN_CHECKOUT` selects another checkout. `cyan --cyan-doctor` reports launch prerequisites without model requests.

The launcher uses the source entry point so edits are visible immediately. Dependencies were installed from the existing npm lock with lifecycle scripts disabled; CLI help passed. This does not validate native optional dependencies, interactive operation, provider login, or Palette startup. No credentials were copied into the Cyan configuration.

## First refinement slice: make the shipped path match the product

At the initial baseline, the normal CLI retained the inherited Python execution path. `createPaletteBaseToolsFactory` was exported by the SDK but not selected by the CLI. The README describes Palette as the execution environment, so that claim must be made true at the ordinary launch path before broader feature work.

1. Add explicit substrate selection at session construction and propagate it through resumed sessions, daemon-owned sessions, and RLM children. Cyan should default to Palette and fail clearly when it is unavailable; do not silently fall back to Python. Preserve intentional alternate runtimes until their disposition is decided.
2. Connect the maintained Palette SDK through its current runtime layout. The current tool references old `security/`, `host/`, and Neura APIs. Verify launch flags, response schema, output lookup, recovery metadata, and RLM broker authority before changing imports or merely renaming text.
3. Run isolated parent/child sessions against disposable workspaces to establish bindings across turns, recovery, abort/disposal, capability ceilings, and child isolation. Use the existing suites and faux provider without paid requests.
4. Introduce a small model orientation based on the actual tool/capability inventory. Retrieve deeper Julia/Palette guidance on demand. Do not advertise Gesso, GPU capabilities, or plugins that are not installed and authorized.
5. Update CLI identity/help and source installation instructions after the default path is proven. Keep upstream attribution and separate provider names from product branding.

## Baseline and constraints

The active checkout is `Project Cyan/Cyan Harness`; the top-level `Cyan Harness` directory is mostly an empty remnant. The existing user modification to `RPD_SOP.md` was left untouched. The initial pass changed only the local launcher and this note, not the agent loop, daemon protocol, or Palette core. Source dependency installation created ignored node_modules without changing the lock.

Follow AGENTS.md for implementation: full inspection before edits, feature branch, required checks, targeted existing tests, and no unrequested build/dev/full-test commands. Coordinate the Palette dependency update with the final core fixes rather than copying the experimental Chat lab into the harness.

## MVP wiring progress

The Cyan launcher now selects Palette centrally and uses an explicit source tsconfig from any task directory. `cyan setup` selects and verifies a separate prepared SDK. A local faux OpenAI-compatible server has completed a normal CLI → Palette Julia call → tool result → final answer round trip without cloud credentials. Required repository checks and configuration tests pass. The real-kernel suite passed 13 tests; strengthened child isolation and real CLI goal completion also passed. Saved-session recovery returned 43 from a new process; Fresh interactive local-model operation now reaches Palette and returns 42 without an OAuth or trace-sharing prompt. Cyan identity, optional provider configuration and opt-in telemetry are implemented; final aggregate review is tracked separately.
