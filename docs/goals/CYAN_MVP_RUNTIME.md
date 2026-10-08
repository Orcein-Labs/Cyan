# Cyan MVP runtime contract

Owner: Codex. Status: IN PROGRESS. User objective: get Cyan wired and usable for intensive local-model testing and modification.

## Required behavior

- The `cyan` launch path selects Palette by default. Explicit SDK tool overrides and explicitly requested alternate substrates remain intentional choices; unavailable Palette must produce a concrete setup error rather than silently launch Python.
- Runtime configuration names a prepared maintained Palette SDK and host. Each parent and RLM child owns a distinct kernel; resumed sessions use durable state under Cyan's configuration directory.
- Current Palette wire protocol, names, recovery information, cancellation and disposal work through Cyan's actual tool boundary.
- CLI/daemon session construction reaches the same selection contract; tool suppression and explicit allowlists are respected.
- A provider-neutral local OpenAI-compatible endpoint can be configured without cloud credentials. Prove agent/tool round trips with a self-contained local faux provider; live model performance is subsequent experimentation.
- Fresh configuration uses Cyan onboarding without required Prime Intellect login or upstream trace-sharing solicitation; retain upstream fork attribution. See CYAN_ONBOARDING_REBRAND.md for the user-authorized extension.
- Model orientation advertises installed/authorized capabilities only and describes persistent Julia state accurately.
- Source launch, setup instructions, targeted regression tests and required repository checks pass. No paid provider calls or live Chat lab mutations are necessary for verification.

## Permitted implementation

Cyan TypeScript session construction and Palette adapter; existing tests for those modules and existing suite harness; source launcher/configuration/setup scripts; model orientation and user documentation. Use a feature branch. Keep Palette as a separately prepared SDK, not a copy of the Enhanced Lab. Preserve user changes to RPD_SOP.md and newly supplied orchestration documents.

## Non-goals

Gesso compiler/inference optimization, changing Palette core, publishing/merging, changing the live Chat lab, copying user credentials, wholesale upstream rebranding, and implementing the separate Phase A orchestration recipe. Phase A remains a separate closed work item and is not a prerequisite for the existing RLM harness to run.

## Verification

Required `npm run check` and test-policy gate; targeted existing Palette/session suites with deterministic faux provider; disposable real-Palette probes for cross-turn state, independent child worlds, resume/revival and cleanup; source CLI help/diagnostics plus a local provider tool round trip. Record failures and setup dependencies, and do not claim full MVP completion until every required behavior is evidenced.
