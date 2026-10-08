# Cyan onboarding and branding contract

Status: IN PROGRESS. User authorized removal of the Prime Intellect onboarding/login flow and a Cyan rebrand throughout, preserving Prime Agent fork acknowledgement.

## Required outcome

A fresh Cyan configuration starts Cyan onboarding and lets the user configure a local or supported external model without requiring Prime Intellect OAuth. Prime-specific trace-sharing solicitation is absent. Product-facing CLI help, welcome screens, UI labels, configuration guidance and current installation docs identify Cyan. Retain truthful upstream attribution, copyright/license notices, and accurate third-party provider names. Do not rename provider APIs or generated model IDs into fictitious Cyan services.

Remove the unwanted product onboarding flow at its authoritative source, not by writing a preference into Matt's config or a test fixture. Existing saved credentials must not be deleted. Preserve explicitly supported other-provider authentication. No live login, paid models, external message sending, publishing, or merging is required.

Daemon shutdown from Cyan must respect its selected daemon ownership and not sweep unrelated per-user daemons. The already verified Palette runtime wiring, durable session state, host goals and child isolation must continue working.

## Gates

Required npm run check and test-policy; targeted existing affected tests, with negative regression verification; a fresh disposable-config interactive PTY run using a local faux model and a real Palette tool call; fresh-config source help inspection and a residual user-facing branding audit. Isolate all test daemons and clean up by verified ownership. Do not run build/dev/full-test scripts.
