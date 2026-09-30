# Capability Model

Referenced by `modes/research-planning/mode.yaml` and
`modes/red-team/doctrine.md`. Recovered 2026-09-30: the reference existed
since the harness birth commit but the document itself stayed in the
operator-surface repo's history (written there as an Experiment 002
companion). This version states the model as it applies to the declarations
and composition machinery in this repo; enforcement lives across the seam
(see [Enforcement point](#enforcement-point)).

## Scope

This repo holds **declarations** (`modes/*/mode.yaml`,
`subharness/*/subharness.yaml`) and their **projection**
(`packages/coding-agent/src/core/modes/`). It holds no broker and grants no
authority. The rules below are what those declarations participate in; the
code that actually decides is named in each section.

## Core rules

**The model may REQUEST capabilities. Nothing inside a session may GRANT
them.** Only the host capability broker — running outside the worker's
namespace, in a process the worker cannot reach except through a request
socket — decides. Competence is not authorization: nothing about how well a
session can compute a request, or how legitimate it sounds, changes whether
the broker approves it. The broker checks one thing: does this request fall
within this session's fixed capability ceiling, set before the session
started, never mutated by a request.

**C_child ⊆ C_caller.** A session may never hold a ceiling wider than the
session that created it. Enforced structurally in two places:

- host side: `ceiling_is_subset()` in the operator-surface broker, which
  validates a requested child ceiling category by category and fails closed;
- composition side: `findUnsatisfiedRequirements()` in
  `packages/coding-agent/src/core/modes/agent-modes.ts`, which checks a
  sub-harness's `requires` against the active mode's ceiling and **reports**
  the gap as `unsatisfiedRequirements` — never auto-grants it.

**Unrecognized categories fail closed.** A category the broker does not know
is denied, not silently ignored and not silently granted. The same
conservatism applies composition-side: `isSubset()` treats any shape it
cannot compare structurally as unsatisfied rather than assuming satisfaction.

**Key presence is the grant.** In a ceiling fragment, an empty `{}` entry is
a real grant (of an unconstrained-per-shape category), and absence is a real
denial. There is no truthiness shortcut.

## Effect classes

| Class | Meaning | Enforcement |
|---|---|---|
| **A — pure/cognitive** | Ordinary in-process computation. No host effect, no filesystem/network reach. | None. Runs at full speed with no broker round-trip; routing it through authorization would be friction without a boundary. |
| **B — sandbox-local** | Touches the filesystem or spawns processes, entirely within the sandbox's own bounded envelope. | The OS sandbox itself (bind mounts, namespace isolation). No broker call, because the boundary is enforced below the language. |
| **C — broker-mediated host effect** | Crosses the sandbox boundary: real host filesystem outside the workspace, real network, child sessions, host services. | `authorize → execute → receipt`, performed by the broker. The session never performs the effect itself; it has no code path to. |

Only class C appears in declarations. A/B need no entry: they are already
bounded below the language, and declaring them would be bureaucracy, not
boundary.

## Capability categories

The categories a ceiling fragment may contain. Per-category containment
semantics as enforced host-side (`ceiling_is_subset`); a child request that
cannot satisfy them is denied, not narrowed silently:

| Category | Ceiling shape | Child-request rules |
|---|---|---|
| `host_request` | `{"allowed_types": [...]}` | A child must name `allowed_types` explicitly — there is no unrestricted child grant — and every named type must appear in the parent's list. |
| `network_access` | `{"allowed": bool, "allowed_hosts": [...]}` | `allowed: true` requires the parent to have `allowed: true`. If the parent is host-restricted, the child must name its own `allowed_hosts` explicitly: omitting the list means unrestricted, and is denied rather than widened. Hosts must be a subset of the parent's. |
| `external_fs_write` | `{"allowed_dirs": [...]}` | Every requested dir must resolve inside one of the parent's `allowed_dirs` (path containment, not string equality). |
| `package_management` | `{"allowed_packages": [...]}` | A child must name `allowed_packages` explicitly (no unrestricted child grant); if the parent's entry carries a list, the child's must be a subset of it. |
| `spawn_child_worker` | (no shape) | Its check is structural: the requested child ceiling must be a subset of the *entire* parent ceiling object. A grandchild is checked against the child's ceiling when it is spawned. |

Any other category: denied, never ignored.

## How declarations participate

**A mode's `capabilities` is a ceiling fragment, not authority.** The broker
decides at effect time; a declaration only states what the mode will ask
for. Unrecognized category keys in a fragment fail closed at the broker.

**A sub-harness has `requires`, deliberately no `capabilities`.** The
absence is the safety property: a sub-harness may *require* authority
("these contributed tools need these C-class effects; if the active mode's
ceiling does not grant them, the calls fail closed at the broker") and may
never *grant* it. There is no path by which attaching a sub-harness widens
what a session may do on the host. A test asserts the absence.

**Composition adds nothing to the ceiling.** `composeSessionPlan` takes the
ceiling verbatim from the mode. A sub-harness contributes tools and context
only, filtered by three independent denials: a tool named in the mode's
`dismiss`; a tool the sub-harness declared `mutating` while the mode refuses
mutation (which catches a contributed `wge-commit` under a mode that
dismisses `write`, without the mode layer knowing what WGE is); and
requirements the ceiling does not grant, which surface as
`unsatisfiedRequirements` instead of being satisfied silently.

For the composition mechanics see `modes/README.md`. For the tested
behavior see `packages/coding-agent/test/modes.test.ts`.

## Enforcement point

The broker itself is operator-surface machinery and lives in the Palette
repository, not here: the Rust host broker (`host/src/broker.rs`) with the
original Python reference implementation (`security/broker.py`) from which
the rules above were verified. Enforcement follows `authorize → execute →
receipt` for every class-C effect, and receipts distinguish a policy denial
from an internal failure so that a bug is never mistaken for a boundary
holding. The `C_child ⊆ C_caller` check is tested both unit-level and
end-to-end there (approved and denied nested-launch cases).

This split is deliberate: declarations are data a repository can diff and
lock; authority is enforced in a process the declared sessions cannot
reach. A mode that declared itself network access would still not have it.

## Provenance

- The original document was written in the operator-surface repo as the
  Experiment 002 companion ("NeuraJL Capability Model") with a per-category
  PROVEN / PARTIALLY PROVEN / NOT YET PROVEN status table tied to that
  repo's adversarial test suite. That status table is **not** duplicated
  here to avoid a second copy drifting; consult the operator-surface
  history for enforcement evidence.
- This harness-side version was recovered and rewritten on 2026-09-30
  because two load-bearing harness files cited this path from the birth
  commit (`01732e1`) onward while the file itself remained repo-side.
- Effect classes and the core rules are carried unchanged from the
  original; the categories table is restated from `ceiling_is_subset` and
  the shipped `mode.yaml` fragments.
