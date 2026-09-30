# WGE Sub-Harness — contract

```
WGE Sub-Harness

Purpose:
    Extend a Cyan session with game/world-engineering domain machinery.

WGE is not an Agent Mode.

It may contribute:
    domain context
    world/game IR
    registry state
    generations
    asset machinery
    geometry operations
    solvers
    predicates
    validators
    evidence
    receipts
    commit/proposal interfaces
    domain-specific tools

WGE does not determine the agent's cognitive operating policy.

Composition:
    Cyan + ResearchPlanning
    Cyan + Engineer
    Cyan + RedTeam

    Cyan + WGE + ResearchPlanning
    Cyan + WGE + Engineer
    Cyan + WGE + RedTeam

The active Mode determines how the agent approaches the problem.
The Sub-Harness determines which domain-specific machinery is available.
```

## Why this is a seam and not a mode

If Game Dev were a mode, then `Engineer × GameDev` would need its own
definition, and the mode layer would need a cross-product to describe
combinations that compose perfectly well on their own. Three modes plus one
sub-harness is six states. Three modes times four domains is twelve, and grows.

The same session, in a game repository, under `research-planning`, produces a
game-development research session. Nothing about how it reasons changes. Only
what it has to reason with.

## The authority argument

`subharness.toml` has a `requires` section, and no `capabilities` section. That
asymmetry is the whole safety story.

A sub-harness can require a C-class effect. It cannot grant one. If the active
mode's ceiling does not include `network_access`, then a WGE tool that needs the
network fails closed at the broker — the request is denied, a receipt is
emitted, and the session finds out at call time rather than at configuration
time.

There is therefore no path by which attaching a sub-harness widens what a
session may do on the host. Attaching WGE can only make a session *ask* for
something the mode already decided about.

## Current status

Declaration only. The tool names in `tools.offer` are the interface WGE is
expected to satisfy; the implementations are not wired into this repository,
and WGE itself lives in a separate repository. This file exists so the seam is
defined and testable before either side is finished, which is the cheaper order
— a seam discovered after both sides are built is a seam that gets worked
around instead.

## Boundary

Keep the mode layer free of WGE assumptions. Nothing in `modes/` may reference
game development, and a change that would require one is a change to the wrong
layer.
