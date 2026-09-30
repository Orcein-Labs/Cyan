# WGE Sub-Harness — context contribution

This file is injected into a session's context in addition to the active mode's
doctrine. The mode still decides *how* to approach the problem; this decides
what is available to approach it with.

WGE lives in a separate repository. This file describes the seam that repository
fills, so the mode layer can be built and tested before the domain machinery
exists.

## What a WGE session looks like

The same session, in a game repository, under `research-planning`, produces a
game-development research session. Nothing about how it reasons changes — the
phase policy, the interaction doctrine, the evidence discipline are all the
mode's. What changes is the vocabulary available to it: world and game IR,
generation records, asset machinery, geometry, solvers, predicates, validators,
and a commit/proposal interface.

Under `engineer` it is ordinary engineering with those tools on hand. Under
`red-team` it is an attack with those tools on hand, and with the same denials —
red-team still cannot write, because the mode's dismissals apply to contributed
tools too.

## Tool naming

Tools are offered under a `wge-` prefix. The mode layer does not interpret the
prefix; it is a convention for humans reading a composed allowlist. The
mechanism is the set difference in `composeSessionPlan`, not the naming.

## Composition

```
Cyan + ResearchPlanning
Cyan + Engineer
Cyan + RedTeam

Cyan + WGE + ResearchPlanning
Cyan + WGE + Engineer
Cyan + WGE + RedTeam
```

Six states, not twelve. The sub-harness is orthogonal to the mode, and the
composition is a union with a difference applied, not a lookup in a
cross-product table.

## Boundary

Nothing in `modes/` may reference game development. A change that would require
it is a change to the wrong layer.
