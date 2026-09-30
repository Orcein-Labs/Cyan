# Agent modes

Cyan sessions run under a **mode**: a cognitive operating policy that decides
*how* the agent approaches a problem. A **sub-harness** contributes domain
machinery and decides *what* is available to approach it with.

Three modes exist. One sub-harness exists.

| Mode | Purpose |
|---|---|
| `research-planning` | Explore, develop, compare, pressure-test, and refine ideas before committing to implementation. |
| `engineer` | Convert an accepted goal, plan, experiment, or specification into a working and verified artifact. |
| `red-team` | Adversarially investigate an existing design, implementation, experiment, or claim. |

`research-planning` is developed. The other two carry complete behavioural
contracts and mechanical policy, and exist to prove the abstraction is not
research-planning with a different name.

## What a mode is

A declaration that projects into four things, all of them real mechanisms rather
than prompt text:

| Declared | Becomes | Enforced by |
|---|---|---|
| `doctrine` | system prompt | the session's prompt assembly |
| `tools.promote` | tool allowlist | `createAgentSession` |
| `capabilities` | capability ceiling | the host broker, via Palette |
| `phases` | phase policy | pending — see open questions |

`composeSessionPlan` is the projection. One declaration, four projections, no
duplication.

## What a mode is not

- **Not a system prompt.** A mode is not "same LLM, different instructions". The
  tool allowlist and the capability ceiling are enforced outside the model, and
  a mode that only changed prose would be a preference rather than a policy.
- **Not an agent.** There is one agent. Modes do not have their own model
  loop, their own session, or their own identity.
- **Not a permission system.** A mode *requests* authority through
  `capabilities`; the broker decides. A mode cannot grant itself network
  access, and a child may never exceed its parent.
- **Not a domain.** Nothing in `modes/` references game development. WGE is a
  sub-harness precisely so that this stays true.

## Why declarations are data

They are YAML at the repository root, not a Julia module.

Session construction resolves its tool allowlist and the Palette capability
ceiling in the TypeScript process, before the Julia kernel is up — the kernel
starts lazily, on first tool call. A declaration that only existed as a loaded
Julia type would force a Julia cold start merely to decide which tools to
enable.

The Julia side may read the same files for phase logic and mode state. It is a
consumer, not the authority.

## The sub-harness seam

A sub-harness contributes tools, context, and artifacts. It has a `requires`
section and deliberately **no** `capabilities` section: it can require
authority, never grant it.

```
Cyan + ResearchPlanning
Cyan + Engineer
Cyan + RedTeam

Cyan + WGE + ResearchPlanning
Cyan + WGE + Engineer
Cyan + WGE + RedTeam
```

Six states, not twelve. The composition is a union with a difference applied,
not a lookup in a cross-product table. If Game Dev were a mode instead, the
layer would need `Engineer × GameDev` as its own definition, and every
additional domain would multiply.

Attaching a sub-harness is safe because of three independent denials in
`composeSessionPlan`:

1. a tool named explicitly in the mode's `dismiss`;
2. a tool the sub-harness declared `mutating`, when the mode refuses mutation
   — which catches a contributed `wge-commit` under a mode that dismisses
   `write`, without the mode layer knowing what WGE is;
3. tools the sub-harness requires but the mode's ceiling does not grant are
   reported as `unsatisfiedRequirements`, never auto-granted.

## Doctrine is prose; policy is data

Each mode has a `doctrine.md` holding the behavioural contract, lockable and
versioned with the declaration. Everything mechanical lives in `mode.yaml`.

Two of the doctrines are now enforced rather than requested. `research-planning`
and `red-team` both dismiss mutating tools, which mechanically implements two
rules that would otherwise have decayed:

- *Preserve the user's flow.* A research session that can edit will edit, and
  the first edit is usually wrong.
- *Red Team produces evidence before it becomes a repair agent.* A red-team
  session that can write will eventually repair instead of reporting, and its
  finding will then describe the version it just changed rather than the version
  it was asked to attack.

Remediation is a deliberate promotion into `engineer`, recorded as such.

## Open questions

### 1. When is a mode selected, and what survives?

The unresolved one, and the reason this layer is not yet wired into session
construction.

`composeSessionPlan` produces a `SessionPlan` at a point in time. That is
sufficient if a mode is fixed for the life of a session. It is not sufficient
if a session can change mode, or if the agent should be able to change its own
mode, and it is definitely not sufficient across compaction.

Concrete sub-questions:

- Is a mode chosen at `createAgentSession` and immutable, or is there a
  transition operation?
- Who may change it — the user, a directive in a session, or the agent?
- Mode state must survive compaction, and it has to coexist with the Palette
  compaction note (`PALETTE_STATE_CUSTOM_TYPE`) without either one truncating
  the other. Both are already careful about their own state; two state carriers
  in one custom-message stream is a new failure mode.
- `research-planning` hands off to `engineer`. Is a handoff a mode change
  within one session, a new session carrying state, or a recommendation the
  user acts on? The declared `handoff.downstream` is currently carried but
  unused.

This is deliberately left open rather than guessed. The wrong answer here is
expensive: it decides whether mode state is a session property, a compaction
participant, or a first-class serializable artifact.

### 2. Phase policy

`phases.order` and `phases.default` are declared and validated, and
`phases.reentry_tools` is parsed. Nothing acts on them yet.

The open part is what a phase *does*. Candidates: phase-dependent system prompt
framing, tool preference by phase, the reentry rule (a research session that
reaches `experiment-design` should be able to write a benchmark), and whether
phase is recorded in mode state or derived from it.

The doctrine is explicit that this is a cognitive control policy and not a
wizard, so whatever gets built must not put six visible steps in front of the
user.

### 3. Mode state

`research-planning` declares `state.kind: research`. No implementation exists
yet, and deliberately so: research state has exactly one client, and a general
mode-state interface with one user is a speculative abstraction. What R&P
actually needs, per the design: current question, hypotheses, candidate
designs, assumptions, evidence, open questions, proposed experiments,
rejected branches with reasons, and current phase.

It should complement conversational context rather than duplicate it, and it
should be inspectable. Not a database.

### 4. Per-battery tuning

A battery profile — Luna Max on a generous budget, a local 9B, a frontier
model — is expected to want different tool sets, decomposition, and
verification density against the same doctrine.

Nothing in the current schema expresses this cleanly. The likely shape is an
overlay on top of a mode declaration, applied at composition, with the doctrine
untouched — but the precedence rules (does an overlay ever *widen* tools, or
only narrow?) are a security question, not a configuration one, and belong
alongside the broker's own fail-closed discipline.

## Extending this

To add a mode: create `modes/<id>/mode.yaml` and `mode.yaml`'s sibling
`doctrine.md`. The loader validates `kind`, the tool allowlist, and that
`phases.default` appears in `phases.order`. Nothing else needs to change.

To add a sub-harness: create `subharness/<id>/{subharness.yaml, contract.md,
context.md}`. It must declare `requires` and must not declare `capabilities` —
the absence is the safety property, and a test asserts it.

## Tests

`packages/coding-agent/test/modes.test.ts` — 25 tests covering load and
validation of the shipped declarations, the four projections, the sub-harness
denial rule, requirement containment, and fail-closed behaviour on malformed
input.

The denial-rule test failed against the first implementation, which matched
mode dismissals by exact tool name and let a contributed `sub-commit` past a
mode that dismisses `write`. The naming-independent rule replaced it.
