# /goal CYAN PHASE A — WORKTREE + SINGLE-WRITER REDUCER

**For:** a Cyan-seat Buffy (not Gesso 10D). **Gauntlet this.**
**From:** Grok (encoding owner)
**Depends on:** architecture freeze
`Cyan Harness/docs/CYAN_ELASTIC_ORCHESTRATION_v0.md` (FROZEN v0).
**Gesso:** do not touch. `src/Agents.jl` stays empty. Seam IDs are
inert fields on events, not a Gesso Session.

**Status:** OPEN

---

## One-sentence objective

A user-shaped mission becomes a versioned `WorkTree` that fake
workers can lease, that only a single reducer may mutate, that
survives worker death, and that refuses to promote a self-certified
candidate — all with **no LLM**.

## Why this sprint exists

The MAO freeze's load-bearing piece is: **unfinished work is the
durable object; agents are disposable leases.** If that is wrong,
ASK/DROP/TAG, scaling, Palette, and later Gesso fork-share all rot.
Phase A proves it with fake workers and a journal. If this slice is
ugly, **stop**. Do not add recursive conductors, real providers, or
a Palette graph.

The line: if every worker `Task` is killed, Cyan still knows the
mission, what is proven, what is unfinished, what failed, and what
is next.

## Start condition

- Freeze v0 is on disk at `docs/CYAN_ELASTIC_ORCHESTRATION_v0.md`.
- Gesso 10D is landed (or landing); this recipe does not wait on
  fusion.
- No Julia orchestration package exists yet. You create
  `julia/CyanOrchestration/` in **this** repo (`Cyan Harness/`).
- Do not implement inside Gesso, Palette `src/Neura.jl`, or the
  TypeScript chassis (`packages/`).

## What this sprint is not

- A Gesso `/goal`. No `Gesso/src/` edits.
- Real model providers, Sol/Luna, OpenRouter, tokens
- `ASK` / `DROP` / `TAG` / `PAGE_CONDUCTOR` (Phase F)
- Concurrent frontier scheduler / adaptive scaling (D, G)
- Recursive sub-conductors (I)
- Palette UI (J)
- Gesso Session/KV share (K)
- Learned routing (L)
- TOON as canonical state
- JSON.jl / HTTP / GPU deps
- Type-parameter explosion (`WorkNode{N,B,D,...}` for ids/budgets)

---

## Laws (from freeze I1–I10, I2 first)

1. **One canonical `TaskSpec`.** Workers cannot redefine the mission.
2. **Single writer.** Workers never mutate `WorkTree`. They send
   `OrchestrationEvent`s into a `Channel`. One reducer `Task`
   applies them in order.
3. **Leases, not identities.** A worker exists because a node is
   `READY`. Lease ends → worker may vanish.
4. **Shadow is non-authoritative.** Fake workers may hold a
   `ShadowTree` dict. Destroying it cannot change canonical state.
5. **Promotion is a gate.** A worker reporting success is not
   promotion. A deterministic L0 predicate (no LLM) must pass.
6. **Failure has an address.** A failed predicate names the node.
7. **Evidence survives workers.** Journal + current `WorkTree`
   outlive leases.
8. **Deterministic reduce.** `reduce(events) == reduce(events)`
   bit-identical for the same ordered event vector.

---

## Package shape (create)

```
Cyan Harness/julia/CyanOrchestration/
  Project.toml          # name CyanOrchestration; ZERO deps
  src/CyanOrchestration.jl
  src/ids.jl
  src/task_spec.jl
  src/worktree.jl
  src/events.jl
  src/reducer.jl
  src/journal.jl
  src/leases.jl
  src/fake_worker.jl
  test/runtests.jl
  test/test_replay.jl
  test/test_job1_sequential.jl
  test/test_job5_no_self_cert.jl
  test/test_job8_crash.jl
```

`Project.toml`: no `[deps]`. Tests use stdlib `Test` only.

Julia types: `abstract type AbstractWorkClass end` and a handful of
empty structs (`PlanningWork`, `EngineeringWork`, `VerificationWork`).
`struct WorkNode{K<:AbstractWorkClass}` is allowed. **Do not** put
budget, difficulty, or node id in type parameters.

IDs: `struct MissionId; v::UInt64 end` (and NodeId, LeaseId, EventId,
BranchId) with a process-local counter. No UUID package.

Seam fields (inert, required on every event): `mission_id`,
`node_id` (nullable), `parent_node_id` (nullable), `lease_id`
(nullable), `branch_id`, `ancestor_chain::Vector{NodeId}`,
`context_version::UInt64`, `shared_prefix_identity` (copy of
parent branch_id for v0), `model_session_family` (`:fake`).

---

## Work items (sequence)

### A — IDs, TaskSpec, WorkTree, events

**Objective.** A `TaskSpec` plus a tree of `WorkNode`s can be built
from a tiny constructor (no LLM). Events are an
`abstract type OrchestrationEvent` with at least:

```
MissionCreated
NodeCreated
NodeReady
LeaseGranted
LeaseExpired
WorkerStarted
WorkerStopped
CandidateSubmitted
VerificationRequested
VerificationPassed
VerificationFailed
PromotionCommitted
NodeReopened
WorkerLost
```

Every event carries `event_id`, `mission_id`,
`canonical_version_before`, `source`, `timestamp`, payload, plus
the Gesso-seam fields above.

**Tests.** Construct a root + two children. `status` starts
`BLOCKED`/`READY` as dependencies require. Round-trip identity:
`node.id` stable, `spec.version` increments only on explicit
`MissionRevised` (you may omit MissionRevised this sprint — then
version is 1 forever).

---

### B — Single-writer reducer + journal

**Objective.** `Channel{OrchestrationEvent}` (or a test double that
is a `Vector` fed in order) + one `reduce!(tree, event)` function.
The reducer is the **only** function that mutates canonical fields.

Journal: in-memory `Vector{OrchestrationEvent}` is the source of
truth. Optional file snapshot: write `repr` lines of a compact
NamedTuple view; **no JSON.jl**. Recovery: `fold` the vector onto a
fresh tree; result equals the live tree.

**Tests (`test_replay.jl`).** Record a script of ≥8 events. Reduce
twice from empty. Trees compare equal (define `==` on WorkTree /
nodes / leases, or compare a canonical tuple dump). Mutating a
worker-side shadow dict does not change the reduced tree.

**Illegal:** `tree.nodes[id].status = :PROMOTED` from fake-worker
code. Grep the worker file for `WorkTree` field assignment — must
be zero. Workers only `put!(chan, event)`.

---

### C — Fake leases and shadow trees

**Objective.** `FakeWorker` is a Julia `Task` (same process). It
receives a `WorkerLease` (node, budget ints, permissions
`(:shadow_write,)`, deadline). It may fill a `ShadowTree` (a
`Dict{Symbol,Any}` is allowed **here**, not in the canonical tree).
It submits `CandidateSubmitted` then exits.

Canonical `WorkerLease` fields are concrete (`UInt64` budgets, not
`Any`).

**Tests.** Grant a lease on a READY node → status `LEASED` then
`RUNNING`. Worker exit without candidate → `WorkerStopped` /
`LeaseExpired`; node returns to `READY` (or `FAILED` if you define
that — pick one, pin it, test it). Destroying the shadow dict after
stop leaves the WorkTree unchanged.

---

### D — L0 promotion gate (job 5)

**Objective.** Prove workers cannot self-promote. A candidate
carries `claimed_success::Bool` and `artifact_ok::Bool` (booleans
the fake worker sets). The reducer only `PromotionCommitted` when
an explicit `VerificationPassed` event arrives from a **different
source** than the producing lease (`source != lease_id`).

L0 predicate this sprint: `artifact_ok == true`. No LLM. No
"producer tests pass" as the sole gate.

**Tests (`test_job5_no_self_cert.jl`).**

1. Worker submits `CandidateSubmitted` with `claimed_success=true`
   and `artifact_ok=true`. No verification event. Tree node is
   `CANDIDATE_READY`, **not** `PROMOTED`.
2. Same, then a `VerificationFailed` from source `:qa`. Node
   `FAILED` or `REOPENED`; still not `PROMOTED`.
3. Same, then `VerificationPassed` from `:qa`. Node `PROMOTED`.
   Artifact id is on the tree. Shadow may be dropped.

---

### E — Synthetic jobs 1 and 8

**Job 1 — sequential (`test_job1_sequential.jl`).**
Tree `A → B → C → D` (each depends on the previous). Fake workers
are eager (finish immediately when leased). Scheduler in this
sprint is **trivial**: the test harness leases at most one READY
node at a time (Phase D will do real parallelism). Assert: never
two `RUNNING` nodes; D promotes only after A,B,C promoted.

**Job 8 — crash (`test_job8_crash.jl`).**
Lease a node, start a FakeWorker `Task`, `schedule` it, then
`Base.throwto` / kill / let it error before `CandidateSubmitted`.
Reducer receives `WorkerLost` (the test injects it if the Task
dies without emitting). Canonical tree still has the mission, the
node is `READY` or `REOPENED` (pin one), journal still replays.
No lease remains `RUNNING`.

Job 2 (parallel fanout) is **Phase D**, not this sprint. Do not
build a scaling heuristic.

---

### F — Freeze pointer + Gesso seam note

**Permitted files (this item only)**

```
docs/CYAN_ELASTIC_ORCHESTRATION_v0.md   # Phase A status sentence
docs/goals/PHASE_A_WORKTREE_REDUCER.md  # this file COMPLETE + receipt
```

If Gesso's seam file still says "Buffy is on 10D", that is Gesso
encoding-owner dirt — **do not edit Gesso**.

---

## Permitted files (whole sprint)

```
julia/CyanOrchestration/**          # create
docs/goals/PHASE_A_WORKTREE_REDUCER.md
docs/CYAN_ELASTIC_ORCHESTRATION_v0.md   # status sentence only
```

**Forbidden:** `packages/`, `src/Neura.jl` (that is Palette, wrong
tree), anything under `/mnt/d/Code Projects/Gesso/src`,
`libs/`, real network.

## Cross-item invariants

- Zero package deps
- Reducer is the only canonical mutator
- Replay equality
- No LLM, no HTTP, no Gesso import
- Seam ids present and ignored
- `generate`/Session/`fork` are Gesso words — do not appear in src
  except the field `model_session_family = :fake`

## Escalation (stop and write a packet)

- You want JSON.jl, UUID, or HTTP
- You want a real provider "just to see"
- You want ASK/TAG in this sprint
- You want to fill Gesso `Agents.jl`
- Replay is not deterministic
- A worker can assign `node.status`

## Performance target

N/A. Correctness of reduce/replay. Do not bench tokens.

## Expected artifact

- `julia/CyanOrchestration` tests green:
  `julia --project=julia/CyanOrchestration -e 'using Pkg; Pkg.test()'`
- Jobs 1, 5, 8 pass
- Freeze still says recursive conductors are later

## Exit checklist

- [ ] A: structs + events
- [ ] B: reducer + replay test
- [ ] C: fake lease + shadow isolation
- [ ] D: job 5 no self-certification
- [ ] E: job 1 sequential; job 8 crash recovery
- [ ] F: this file COMPLETE + receipt
- [ ] `Pkg.test()` green; no Gesso files in the diff
- [ ] no new deps

## Receipt (filled at close)

what changed · why · tests (job 1/5/8 + replay) · numerical delta
(none expected) · hardware · fake-worker only · known limitations
(no ASK, no parallel scheduler, no Palette, no Gesso consume)
