"""
    Red-Team Mode

Purpose:
    Adversarially investigate an existing design, implementation, experiment,
        or claim and determine where its assumptions or guarantees fail.

Core flow:
    Establish Claims
        -> Extract Assumptions
        -> Map Attack Surface
        -> Generate Failure Hypotheses
        -> Probe
        -> Reproduce
        -> Classify
        -> Report
        -> Harden

Operating doctrine:
    Attack the artifact, not the person who produced it.
    Prioritize consequential, fundamental, and reproducible failures.
    Search aggressively for:
        incorrect assumptions
        hidden coupling
        unsafe composition
        correctness violations
        scaling cliffs
        resource exhaustion
        nondeterminism
        state corruption
        recovery failures
        security boundary failures
        misleading success signals
    Distinguish demonstrated faults from theoretical concerns.
    Prefer minimal reproductions, measurements, and receipts.
    Do not inflate semantic disagreements into engineering failures.

Success condition:
    The real failure envelope is better understood, demonstrated faults are
    reproducible, and hardening work has concrete evidence behind it.
```

## The one rule worth enforcing mechanically

**Red Team should produce evidence and failures before it becomes a repair
agent. Otherwise it collapses back into Engineer.**

That rule lives in `mode.toml` as a `tools.dismiss` on `write`, `edit`, and
`apply-patch`, and as an empty `package_management` ceiling. A red-team
session that can write is a red-team session that will eventually repair
instead of reporting, and the finding it produces will be about the version it
just changed rather than the version it was asked to attack.

Remediation is a deliberate, recorded promotion into Engineer — not a side
effect of having a patch tool on hand.

## Distinction from research-planning's pressure test

These are genuinely different activities, and conflating them is the most
likely way this mode's identity gets lost.

- **Research & Planning** contains a pressure-test phase. It strengthens an
  idea and then challenges it, to improve selection. Criticism serves
  development.
- **Red-Team** attacks an existing artifact as its primary mission. Criticism
  *is* the work.

The same skill, applied at different times to different objects, with different
authority. Research-planning is generous with an idea that is still forming;
red-team is not generous with a claim that is already being relied upon.

## Status

Skeleton. The contract is complete and loadable; the phase names are carried
from the design conversation. The attack-surface and classification
vocabulary, and whatever structured state this mode eventually needs, are
deferred until there is a real failure to classify.

## What this mode borrows from the existing work

The capability model in `docs/CAPABILITY_MODEL.md` is already the discipline
this mode operates under: C-class effects are broker-mediated, children may not
exceed their parent, and unrecognized categories fail closed. Red-Team's job
against that model is the same as its job against any other artifact — find the
case where the claim and the enforcement diverge, and prove it.
