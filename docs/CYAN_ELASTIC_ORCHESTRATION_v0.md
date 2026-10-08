# CYAN ELASTIC ORCHESTRATION v0
## Smart Multi-Agent Orchestration / Temporary Research Organization Runtime

**Document class:** architecture freeze / implementation specification
**Status:** FROZEN v0 — 2026-10-02
**Primary language:** Julia
**Layer:** Cyan (harness)
**Operator surface:** Palette
**Inference substrate:** provider-neutral initially; Gesso-native when available
**Implementation home:** this repo (`Cyan Harness/`), not Gesso `src/`
**Not a Gesso `/goal`.** Gesso Buffy is on 10D landing (COMPLETE).
Cyan implementation starts from
`docs/goals/PHASE_A_WORKTREE_REDUCER.md`. Do not fill Gesso
`src/Agents.jl` (Phase 12, empty by law).

**Stubborn load-bearing piece:** single-writer canonical `WorkTree` +
disposable `WorkerLease`. If that is wrong, ASK/DROP/TAG, feral QA,
recursive conductors, scaling curves, and later Gesso fork-awareness
all rot. If it is right, they compose.

**The line:** if every active model process vanished right now, would
Cyan still know the mission, what is proven, what is unfinished, what
failed, what depends on what, and what happens next? Yes → healthy.
No → state leaked into ephemeral workers.

---

## Encoding-owner stamp (Grok)

Cyan/Palette remain **above** Gesso and consume Session/ABI. Gesso
anticipates shared-model execution for many agents and preserves
branch identity so parallel branches can share hot state. This freeze
must not wait on exotic Gesso, and must not put orchestration inside
the inference engine.

| Now (v0) | Later |
|---|---|
| IDs, `TaskSpec`, `WorkTree`, events, single reducer, journal | Palette graph UI |
| Fake workers, shadow trees, candidate + promotion | Recursive sub-conductors |
| Replay tests; synthetic jobs 1, 2, 5, 6, 8 | Learned/RPDO orchestration tuner |
| `ASK` then `TAG` | `DROP`, adaptive scaling heuristic |
| Seam ID fields on events (inert) | Gesso fork/KV share (Phase K / Gesso 12–13) |
| Bootstrap routing rules | Sol/Luna product names as law |

**v0 vertical slice (stop if ugly):** WorkTree → two concurrent fake
workers → shadow promotion → one `ASK` → final QA + teardown.
No LLM required for Phase A. Real providers are Phase B+.

**Gesso seam (inert until Gesso Phase 12/K):** preserve
`mission_id`, `node_id`, `parent_node_id`, `lease_id`, `branch_id`,
`ancestor_chain`, `context_version`, `shared_prefix_identity`,
`model_session_family`. Cyan exposes structure. Gesso decides whether
to share Sessions/KV. Cyan correctness must not depend on that
optimization.

Canonical pointer from Gesso:
`docs/research/CYAN_ELASTIC_ORCHESTRATION.md` (seam only, not a copy).

---

# 0. ONE-SENTENCE THESIS

**Cyan should treat unfinished work—not agents—as the durable object,
and temporarily rent the economically appropriate amount and quality
of intelligence to advance that work through verified checkpoints.**

Agents are disposable. The mission is not.

Internally: **an elastic scheduler for intelligence operating over a
verified WorkTree.** Not a multi-agent chat framework.

The task graph rents intelligence. Intelligence does not own the
task graph.

---

# 1. SOURCE CONSTRAINTS

- Palette is the operator surface.
- Cyan owns orchestration, agent/work semantics, recovery,
  coordination, and organizational state.
- Gesso owns inference execution.
- Cyan must be usable before exotic Gesso scheduling exists.
- Later, Cyan should expose enough branch identity and execution
  provenance for Gesso to exploit shared model state.

> **Do not block Cyan orchestration on exotic Gesso. Preserve the
> information Gesso will eventually need.**

---

# 2. THE PRODUCT MODEL

The user does not manually assemble an agent team. The user provides:

```
goal
constraints
quality target
budget / resource envelope
optional deadline or latency preference
optional permissions
```

Cyan determines work decomposition, checkpoint graph, acceptance
predicates, required worker capabilities, model allocation,
parallelism, escalations, QA intensity, worker lifetime — and
revises that deployment as evidence changes.

```
USER INTENT → TASK SPEC → CONDUCTOR
    compile WorkTree / predicates / frontier / leases
         → WORKER SWARM (private shadow trees)
         → CANDIDATE RESULTS
         → ADVERSARIAL QA / GATES
              FAIL → reopen subtree
              PASS → promote → canonical state
         → COMPLETE → dissolve workers
```

---

# 3. NON-NEGOTIABLE INVARIANTS

**I1 — One canonical mission.** Exactly one authoritative root
`TaskSpec`. Workers cannot independently redefine the mission.
Mission change is an explicit versioned event.

**I2 — One canonical WorkTree writer.** Workers never directly mutate
canonical WorkTree state. They submit events and candidates. A
conductor reducer serializes canonical mutations. Primary concurrency
law.

**I3 — Agents are leases, not identities.** A worker exists because a
`WorkNode` currently needs cognition. Lease, scope, capabilities,
budget, permissions, context view, deadline. No permanent project
truth. When the lease ends, the worker may disappear completely.

**I4 — Shadow state is non-authoritative.** Every worker receives a
private `ShadowTree`. Nothing there becomes durable project truth
merely because the worker produced it.

**I5 — Promotion requires a gate.** Canonical state changes only
through a promotion transaction: candidate → predicates →
verification → red-team where required → promotion.

**I6 — Failure has an address.** Failed final test traces to
requirement → predicate → checkpoint → evidence/artifact → producing
`WorkNode`. Reopen the smallest lawful affected subtree.

**I7 — Expensive intelligence is a resource.** Escalation is budgeted
and auditable. No unrestricted frontier summons.

**I8 — Scaling is reactive.** Expand, contract, replace, promote,
consult, terminate as remaining work changes. Worker count is not
configured once at start.

**I9 — Red-team is part of completion.** Important promotion must
survive an appropriate challenge policy.

**I10 — Evidence survives workers.** Worker lifetime and evidence
lifetime are separate. The organization may disappear. Promoted
evidence and receipts do not.

---

# 4. AUTHORITY HIERARCHY

```
USER → ROOT CONDUCTOR → (bounded sub-conductors → workers)
                      → direct workers
```

**User:** root objective, hard constraints, maximum budget,
permissions, pause/cancel, manual promotion veto, override, quality
policy.

**Root conductor:** decompose, checkpoints, allocate, approve
escalation, change topology, invalidate derived work, request
evidence, red-team, promote, spawn bounded sub-conductors. May not
silently violate user constraints.

**Sub-conductor:** subtree root, inherited predicates, local budget,
local permission ceiling, return contract. Cannot modify ancestor
requirements.

**Worker may:** reason, use permitted tools, produce candidates,
submit evidence, request help, recommend takeover, report inability.

**Worker must not:** promote itself, change the mission, increase its
own permissions or budget, invalidate siblings, silently spawn
workers.

This is the same split as Palette A/B/C: capability may expand;
authority must not expand automatically.

---

# 5. CORE DATA MODEL

The most important object is not `Agent`. It is `WorkTree`.

**5.1 `TaskSpec`** — versioned mission intent: `id`, `version`,
`goal`, `hard_constraints`, `soft_preferences`,
`acceptance_contract`, `budget`, `deadline_policy`,
`permission_ceiling`, `provenance`.

**5.2 `WorkTree`** — the unfinished mission: root `TaskSpec`,
`WorkNode`s, dependency edges, acceptance predicates, evidence,
artifacts, checkpoint states, invalidations, escalations, worker
leases, receipts, event history.

**5.3 `WorkNode`** — bounded unit of work. Fields: `id`, `parent`,
`task_version`, `work_class`, `objective`, `dependencies`,
`required_outputs`, `acceptance_predicates`, `risk`,
`estimated_difficulty`, `uncertainty`, `parallelizability`,
`verification_cost`, `failure_cost`, `permissions`, `status`,
`assigned_lease`.

States: `BLOCKED`, `READY`, `LEASED`, `RUNNING`, `WAITING_HELP`,
`CANDIDATE_READY`, `VERIFYING`, `FAILED`, `REOPENED`, `PROMOTED`,
`SUPERSEDED`, `CANCELLED`.

**5.4 `AcceptancePredicate`** — machine-checkable or model-checkable
condition required for promotion. Established before execution
whenever possible. Changing one is a versioned conductor event.

**5.5 `Evidence`** — structured claim support (`id`, `claim`,
`source`, `producer`, `confidence_metadata`, `verification_status`,
`dependencies`, `timestamp`). Not free prose in the canonical layer.

**5.6 `Artifact`** — durable products (code, patch, document, bench,
test, dataset, design, compiled object, receipt). Immutable/versioned
references whenever practical.

**5.7 `WorkerLease`** — temporary ownership: `id`, `node`,
`worker_profile`, `model_profile`, `started_at`, `expires_at`,
`token_budget`, `dollar_budget`, `permissions`, `context_snapshot`,
`shadow_tree`.

**5.8 `ShadowTree`** — private attempt branch: originating canonical
version, local scratch, local evidence, temporary artifacts,
hypotheses, failed attempts, candidate submission. Destroyable
without damaging canonical mission state.

**5.9 `Receipt`** — attributable action: event, work node,
worker/model, canonical input version, tool calls, artifact refs,
cost, wall time, outcome, escalations, QA result. Do not persist
hidden chain-of-thought as provenance. Persist structured outputs
and observable actions.

---

# 6. SINGLE-WRITER CANONICAL STATE

Workers run concurrently. Canonical state mutation does not.

```
Worker A ─┐
Worker B ─┼──► Event Channel ─► Conductor Reducer ─► Canonical WorkTree
Worker C ─┤
QA       ─┘
```

Typed events include: `WorkerStarted`, `ProgressReported`,
`HelpRequested`, `CandidateSubmitted`, `VerificationCompleted`,
`EscalationApproved`, `PromotionCommitted`, `ArtifactInvalidated`,
`NodeReopened`, `BudgetDebited`, `WorkerTerminated`.

Benefits: no concurrent mission-state mutation; replayable
transitions; deterministic invalidation; simpler recovery;
workers cannot silently overwrite one another.

---

# 7. CONDUCTOR RESPONSIBILITIES

The conductor is not a manager chatbot. It owns organizational
truth. Seven loops: interpretation, decomposition, deployment,
escalation, verification, repair (smallest subtree), completion
(every root acceptance requirement mapped to passing evidence).

---

# 8. MODEL ABSTRACTION

Never hard-code product names. `ModelProfile`: `id`, `provider`,
strength axes (reasoning/coding/research/tool), `context_limit`,
`latency_class`, `price_class`, `concurrency_limit`,
`reliability_history`. Tiers `FAST` / `GENERAL` / `FRONTIER` /
`SPECIALIST` are conveniences. Routing inspects `ModelProfile`.
Sol/Luna are deployment examples.

---

# 9. ROUTING IS NOT "TASK DIFFICULTY"

For each ready node, estimate a `TaskFingerprint`: work class,
difficulty, uncertainty, decomposability, parallelizability,
critical-path position, context requirement, specialist requirement,
verification cost, failure cost, artifact coupling, expected tool
latency, expected coordination cost.

Ask: **what is the cheapest deployment likely to satisfy this node's
quality contract?** Not: what is the smartest model available?

---

# 10. DYNAMIC MODEL PROMOTION

Model assignment may change during a node's lifetime. A worker may
report `COMPARATIVE_ADVANTAGE_EXHAUSTED` — remaining work now has a
different optimal model. Not necessarily failure.

---

# 11–12. ESCALATION

| verb | meaning | default auth |
|---|---|---|
| `ASK` | bounded local question; worker retains ownership | auto below bounded cost |
| `DROP` | frontier temporarily attached to a region | conductor |
| `TAG` | comparative advantage over; transfer ownership | conductor + ownership transfer |
| `PAGE_CONDUCTOR` | larger than this node / contradicts mission | conductor (organizational) |

Workers request expensive intelligence. They should not normally
allocate it. All escalations produce receipts.

v0 implements `ASK` then `TAG`. `DROP` follows.

---

# 13–15. SMART SCALING

Worker count is an output of planning. Marginal utility considers
critical-path reduction, uncertainty reduction, independent search,
verification, specialist value, minus inference / coordination /
merge cost. The numeric formula is **not canon**. The mechanism is.

Track empirical curves (worker count vs wall time, cost, QA,
coordination) by task fingerprint. Scale out, then contract. Do not
retain workers because they already exist.

---

# 16–17. RED-TEAM AND NO SELF-CERTIFICATION

Red-team is a **promotion property**, intensity scaled to risk.
Independence levels L0 (same worker / deterministic predicate) …
L4 (multiple independent reviewers). The producing worker cannot be
the sole approving authority for high-value promotion.

---

# 18. TARGETED REOPENING

Failed predicate → artifact → producing node → evidence. Compute
affected dependency closure. Invalidate only that. Redeploy.
Do not restart healthy branches.

---

# 19–21. COMMUNICATION AND CONTEXT

Natural-language agent-to-agent chat is not the authoritative
substrate. Structured: `Finding`, `Evidence`, `Question`,
`Constraint`, `Artifact`, `Candidate`, `Failure`, `Escalation`,
`DecisionRequest`. Prose may accompany; canonical semantics do not
depend on prose alone.

**TOON** is a model-facing structured dialect for WorkTree slices.
It is **not** the canonical in-memory representation.

```
Julia typed structs     = canonical runtime objects
event log               = durable recovery source
TOON                    = model-facing projection
Palette UI payload      = operator-facing projection
```

**Context projector** (Cyan, not the model) derives the worker's
bounded worldview. Workers do not receive the entire WorkTree.

---

# 22. "NEVER LOSE THE PLOT"

The mission does not live in worker conversational memory. It lives
in versioned `TaskSpec` + `WorkTree` + predicates + dependency graph
+ canonical evidence. Workers can misunderstand their node. They
cannot silently rewrite the mission.

---

# 23–24. RECURSIVE CONDUCTORS (NOT V0)

Bounded sub-organizations inherit objective, hard constraints,
predicates, budget, permission ceiling, return contract. They cannot
modify parent truth. Required limits: max conductor depth, subtree
fanout, worker count, unreviewed spend, lease duration. Phase I only
after the flat conductor works.

---

# 25–26. ARTIFACT CONCURRENCY AND ISOLATION

Canonical artifacts are immutable/versioned. Workers edit private
copies. Conductor selects / merges / rejects / requests comparison.
Do not use shared mutable files as the coordination protocol.

Workspace identity: `workspace/<mission>/<node>/<lease>`. Tool
effects attributable to that lease. Failed workers destroyable
cleanly (branch / sandbox / worktree / namespace / container).

---

# 27–28. BUDGET AND ECONOMICS

`BudgetEnvelope`: money, tokens, wall time, concurrency, tool calls,
frontier-model allowance. **Reserve budget for QA.** Do not spend
100% producing an answer.

Do not optimize for minimum token usage. Minimize **expected total
cost required to satisfy the declared quality contract** (inference,
wall time, failed attempts, human intervention, repair, rework,
verification).

---

# 29. SCHEDULING LOOP

```
while mission not terminal:
    ingest events → reduce canonical state → invalidate stale deps
    compute READY frontier → estimate deployment
    terminate workers with no remaining marginal value
    grant new leases → process escalations
    verify candidates → promote
    update budget + receipts
    test root completion contract
```

---

# 30–31. JULIA IMPLEMENTATION

Types for **low-cardinality semantic categories** (`AbstractWorkClass`
and a handful of subtypes). Fields for high-cardinality data
(budget, difficulty, node id). Do not encode dollars or node ids
into type parameters. Specialization explosion is a failure mode.

Start: one root scheduler/reducer `Task`, one
`Channel{OrchestrationEvent}`, N worker Tasks, optional QA Tasks.
Separate processes only where isolation/resource pressure demands
it. Do not begin with a distributed-computing cathedral.

---

# 32–34. EVENTS, PERSISTENCE, DETERMINISM

`abstract type OrchestrationEvent`. Concrete events cover mission,
nodes, leases, workers, candidates, help (`ASK`/`DROP`/`TAG`),
verification, promotion, invalidation, budget, pause/cancel.

Every event: `event_id`, `mission_id`, `canonical_version_before`,
`source`, `timestamp`, `payload`. Reducer increments canonical
version on mutation.

Persistence: append-only event journal + periodic canonical
snapshots. Recovery: load snapshot, replay, reconcile leases, mark
unreachable workers lost, reissue or reopen nodes. A worker crash
must not corrupt mission truth.

Model generation need not be deterministic. **State transition
semantics should be.** `reduce(events)` reconstructs the same
canonical WorkTree given the same ordered event sequence.

---

# 35–38. PERMISSIONS, FAILURES, LOOPS, FINGERPRINTS

Capabilities attach to WorkNodes/leases. A worker cannot expand its
own permission set.

Failure classes at least: `WORKER_FAILED`, `TOOL_FAILED`, `TIMEOUT`,
`LOOP_DETECTED`, `BUDGET_EXCEEDED`, `CONTEXT_EXHAUSTED`, `CONFLICT`,
`UNVERIFIED_RESULT`, `QA_FAILED`, `DEPENDENCY_INVALIDATED`,
`CONDUCTOR_REPLAN`, `PERMISSION_DENIED`, `PROVIDER_FAILED`. Do not
collapse to "agent error".

Loop detection: repeated tool calls, equivalent failures, no
artifact/evidence delta, repeated self-rephrasing, time since
meaningful progress → `ASK` / `DROP` / `TAG` / terminate.

Task fingerprints update after major checkpoints. Classification is
not static.

---

# 39–40. BOOTSTRAP POLICY, THEN LEARN

Do not build ML routing first. Explicit rules (routine → FAST;
architecture + uncertainty → FRONTIER; wide search → FAST swarm;
boilerplate then hard integration → FAST then TAG FRONTIER; high
failure cost → stronger QA). Collect receipts. Learn later.

Long-term, deployment topology is searchable (RPDO analogue at Cyan
policy layer, not Gesso kernel tuning). **No online self-modifying
orchestration policy in v0.**

---

# 41–42. GESSO SEAM (MANDATORY SPLIT)

Preserve from day one (orchestration metadata, initially inert):

```
mission_id  node_id  parent_node_id  lease_id  branch_id
ancestor_chain  context_version  shared_prefix_identity
model_session_family
```

Later Gesso may derive shared prefix execution, forked Session
trees, KV page sharing, warm branch residency, parallel decode
schedules. Cyan exposes structure. Gesso decides.

**Never couple Cyan correctness to Gesso optimization.**

```
Correctness:  WorkTree → generic model provider → orchestration
Optimized:    WorkTree → Gesso → shared sessions / fork-aware schedules
```

Both implement identical Cyan semantics.

Gesso `src/Agents.jl` remains empty until a Gesso Phase 12 recipe
exists. This freeze does not fill it.

---

# 43–46. PALETTE (AFTER THE REDUCER IS TRUSTWORTHY)

Palette displays the **organization**, not twenty chat tabs: mission
status, active workers, frontier, bottleneck, escalations, QA,
budget, estimated parallel value. Graph: dependency DAG, checkpoint
status, ownership, model tier, critical path, reopened nodes,
escalations, sub-conductor boundaries. Economics view later.

User controls: budget, quality target, latency preference, autonomy
level, permission envelope. Do not require the user to pick "7 Luna
+ 2 Sol + 1 red team" unless they want manual control.

Phase J. Not v0.

---

# 47–49. GC, FINAL QA, TERMINATION

After promotion keep: promoted artifact, important evidence,
receipts, important failed-approach summaries, dependency
provenance. Discard scratch chatter and superseded temps. Failed
shadow trees compress to a `FailureReceipt` then destroy the rest.

Final QA is mission-level. Every root requirement accounted for.
No `"all workers say done"` completion.

Terminal states: `SUCCESS`, `PARTIAL_SUCCESS`, `BLOCKED`,
`BUDGET_EXHAUSTED`, `USER_CANCELLED`, `UNSATISFIABLE`,
`SYSTEM_FAILURE`. Always emit a final mission receipt.

---

# 50. INITIAL JULIA MODULE SHAPE

Aim toward `Cyan/{Core,Orchestration,Workers,QA,Persistence,Telemetry,Interfaces}`
as in the source freeze. First vertical slice may stay consolidated
until semantics stabilize. Split after the reducer is trustworthy.
Do not over-modularize immediately.

---

# 51. MVP — FIVE PROOFS

1. **WorkTree** — user task → root / node A / node B / final QA.
2. **Two workers concurrently** — independent nodes; no direct
   shared-state mutation.
3. **Shadow promotion** — private candidates; conductor promotes
   only passing outputs.
4. **One escalation** — `ASK` first, then `TAG`. `DROP` later.
5. **Final QA + teardown** — predicate passes; workers and shadows
   destroyed; receipts remain.

If that slice is ugly, stop. Do not add recursive conductors to a
broken core.

---

# 52. BUILD PHASES

| Phase | Contents | v0? |
|---|---|---|
| A | `TaskSpec`, `WorkTree`, `WorkNode`, events, reducer, journal; fake workers | **yes — first** |
| B | provider interface, worker runner, shadow workspace, candidates | after A green |
| C | predicates, QA, promotion, invalidation | after B |
| D | ready-node detection, parallel launch, backpressure | after C |
| E | `ModelProfile`, `TaskFingerprint`, bootstrap routing | after D |
| F | `ASK`, `TAG`, `DROP`, `PAGE_CONDUCTOR` (that order) | ASK/TAG in v0 |
| G | reactive scaling heuristic | later |
| H | risk-scaled red-team | later |
| I | recursive sub-conductors | later |
| J | Palette visualization | later |
| K | Gesso branch metadata consumed (Gesso 12–13) | later |
| L | empirical orchestration tuner | after receipts exist |

---

# 53. FIRST TEST HARNESS (SYNTHETIC, DETERMINISTIC)

No real repositories until this is green.

1. Perfectly sequential `A→B→C→D` — do not spawn useless workers.
2. Embarrassingly parallel — scale out.
3. Hard tail (easy→easy→easy→HARD) — cheap then `TAG` frontier.
4. Local blocker — `ASK` without full takeover.
5. Bad candidate — worker reports success; QA fails; no promotion.
6. Late invalidation — affected closure reopens; unrelated stays green.
7. Budget pressure — prioritize highest expected-value frontier.
8. Worker crash — canonical state survives; node recoverable.

Phase A owes at least 1, 5, 8. Phase D owes 2. Phase F owes 3, 4.
Phase C owes 6. Phase G owes 7.

---

# 54–56. BENCHMARKS

Do not benchmark number of agents, messages, or transcript
impressiveness. Benchmark wall time to **validated** result,
dollars, tokens, human interventions, failed promotions, reopened
nodes, duplicate work, coordination overhead, critical-path
reduction, QA escape rate, artifact quality, recovery success.

Baselines: (A) single strong sequential, (B) single cheap sequential,
(C) naive fixed-size swarm, (D) Cyan adaptive swarm. Same task,
providers, budget ceiling, tools, acceptance tests.

Hypothesis (unmeasured): adaptive deployment outperforms fixed
swarms on heterogeneous work. Collect the parallelism crossover
graph. The useful result is knowing **where swarming becomes
economically rational**.

---

# 57. "FERAL CONDUCTOR" POLICY

Aggressive about quality, not randomly expensive. Allowed: challenge
weak claims, reopen, demand independent reproduction, spawn targeted
verification, escalate hard regions, invalidate attractive-but-unproven
results. Not allowed: unbounded retries, unbounded spending,
permanent argument loops, moving acceptance criteria to prevent
completion.

---

# 58. WHAT NOT TO BUILD

1. permanent fictional employee personalities
2. an unrestricted agent chatroom
3. swarm coordination via natural-language conversation
4. a hard-coded researcher→coder→reviewer workflow
5. fixed agent counts
6. unrestricted recursive spawning
7. unbounded model escalation
8. online self-modification before receipts exist
9. Gesso-specific assumptions in Cyan correctness semantics
10. a giant type-parameter Cartesian explosion in Julia
11. a graphical UI before the reducer/state machine is trustworthy
12. a benchmark that rewards activity instead of validated results

---

# 59. BIGGEST ENGINEERING RISKS

| | Risk | Mitigation |
|---|---|---|
| R1 | Conductor bottleneck | single writer ≠ single thinker; concurrent reasoning, serialized mutation |
| R2 | Bad WorkTree worse than one model | versioned decomposition, cheap scouts before fanout |
| R3 | QA more expensive than execution | risk-scaled verification |
| R4 | Duplicate work | node ownership, projector, candidate registry |
| R5 | Excessive escalation | marginal-value threshold, conductor auth, reserves |
| R6 | Projector omits vital context | `PAGE_CONDUCTOR`, not dumping the whole mission |
| R7 | Recursive bureaucracy | bounded depth/fanout, subtree contracts |
| R8 | Learned routing overfits | holdouts; bootstrap rules as fallback |

---

# 60. SUCCESS CRITERIA FOR V0

1. User submits one mission without designing a swarm.
2. Conductor creates a versioned WorkTree.
3. Multiple workers execute independent nodes concurrently.
4. Workers cannot mutate canonical mission state.
5. Each worker has a disposable shadow tree.
6. Candidate work requires explicit promotion.
7. Failed QA reopens the appropriate subtree.
8. `ASK` works.
9. `TAG` works.
10. Worker count can increase and decrease in one mission.
11. Budget state is authoritative.
12. Final QA traces to root acceptance requirements.
13. Temporary workers disappear without losing promoted state.
14. Recover from a worker crash.
15. Palette can inspect graph and receipts (may be CLI/API in v0).
16. Same orchestration semantics with a generic provider and with Gesso.

Items 15–16 may be a seam/API in v0; a full Palette graph is Phase J.

---

# 61. RESEARCH PROGRAM PROMOTION

The larger idea earns promotion only if experiments show, on real
workloads: adaptive routing > fixed assignment; adaptive worker
count > fixed swarm size; structured WorkTree communication > agent
chat; targeted escalation > whole-task frontier replacement;
targeted reopening > full restart; permanent QA gates > producer
self-certification.

---

# 62. LONG-TERM STACK

```
HUMAN
  → PALETTE     operator / governance
  → CYAN        cognitive workforce compiler
  → GESSO       inference execution compiler/runtime
  → MODELS + HARDWARE
```

User abstraction: `PROBLEM + QUALITY TARGET + RESOURCE ENVELOPE =
TEMPORARY ORGANIZATION`.

---

# 63. CANONICAL MENTAL MODEL

Durable primitives: work, dependency, evidence, artifact, checkpoint,
authority, promotion, invalidation, budget, receipt.

> **The task graph rents intelligence. Intelligence does not own the
> task graph.**

---

# 64. FIRST BUILD ORDER (CYAN SEAT, NOT GESSO 10D)

```
1. Freeze IDs and core structs.
2. WorkTree.
3. Event types.
4. Single-writer reducer.
5. Deterministic replay tests.
6. Fake worker leases.
7. Shadow trees.
8. Candidate submission.
9. Predicates and promotion.
10. Invalidation/reopen.
11. Synthetic sequential / parallel / crash tests.
12. Real model provider.
13. Context projection.
14. ASK.
15. TAG.
16. Concurrent frontier scheduler.
17. Budget enforcement.
18. DROP.
19. Adaptive scaling heuristic.
20. Red-team policy.
21. Palette event/view API.
22. Recursive sub-conductors.
23. Gesso branch metadata consumed.
24. Collect receipts.
25. Only then learned/RPDO-style orchestration optimization.
```

If an earlier invariant becomes unclear, stop and repair that layer.

**Seat:** Cyan-seat Buffy. Closed recipe:
`docs/goals/PHASE_A_WORKTREE_REDUCER.md`. Gesso Buffy does not
pick this up.

---

# 65. FINAL DESIGN LAW

> **If every active model process vanished right now, would Cyan
> still know exactly what the mission is, what has been proven, what
> remains unfinished, what failed, what depends on what, and what
> should happen next?**

Yes: the orchestration substrate is healthy.
No: important state has leaked into ephemeral neural workers.

That is the line.
