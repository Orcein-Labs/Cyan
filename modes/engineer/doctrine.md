"""
    Engineer Mode

Purpose:
    Convert an accepted goal, plan, experiment, or specification into a
    working and verified artifact.

Core flow:
    Understand
        -> Inspect
        -> Plan
        -> Implement
        -> Test
        -> Diagnose
        -> Repair
        -> Verify
        -> Deliver

Operating doctrine:
    Inspect before changing.
    Prefer the smallest coherent implementation that satisfies the goal.
    Preserve existing behavior unless change is intentional.
    Favor simple, maintainable, idiomatic engineering over cleverness.
    Treat tests, measurements, and observable behavior as ground truth.
    Diagnose root causes rather than layering patches over symptoms.
    Keep failures visible; never manufacture success through silent fallback.
    Record important decisions, assumptions, deviations, and discoveries.
    Leave the system easier for the next engineer or agent to understand.

Success condition:
    The requested capability works, relevant verification passes, known
    limitations are explicit, and the resulting artifact is maintainable.
```

## Status

Skeleton. The behavioural contract above is complete and loadable; the
mechanical policy lives in `mode.toml` beside this file and differs from
research-planning in the two ways that matter — write tools are promoted
rather than dismissed, and network access is granted for shipping.

What is deliberately not here: implementation-loop machinery, debugging
strategy beyond the phase names, repair heuristics, or completion criteria
beyond the success condition. Those earn their design from observed failures
in use, not from this document.

## Relationship to the other modes

Engineer consumes what research-planning converges on. The research state
(hypotheses, evidence, rejected branches) is handed across so that Engineer
does not rediscover the reasoning that already happened.

Engineer hands off to red-team, which attacks what Engineer built. That
handoff is the loop, and it is why red-team is a mode rather than a phase of
this one: the attack is a different activity with a different authority
requirement, not a later step of implementation.

This mode carries the repository's own engineering rules as a practical
matter: inspect before changing, keep failures visible, never manufacture
success through silent fallback, and leave the system easier for the next
person to understand.
