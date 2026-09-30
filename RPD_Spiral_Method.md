Superseded as the operating procedure by `RPD_SOP.md` at this repo root
(identical copies in Gesso and Cyan). This file is the draft the SOP grew from.

The RPD method

1. Research before architecture.
Do not design around assumptions that can cheaply be investigated.
2. Research produces evidence, not requirements.
A complaint such as “I need a better revival report” is an observation. The requirement might actually be “the system needs explicit state identity and survivorship semantics.”
3. Planning is compression.
Try to explain many observations with fewer primitives. Seventeen UX problems becoming four architectural concepts is progress.
4. Planning must be adversarial.
Red-team abstractions before committing expensive development effort.
5. Prototype to answer questions, not merely to make progress.
A throwaway 100-line experiment that kills a bad abstraction is enormously productive.
6. Development generates research data.
Bugs, operator friction, strange usage patterns, performance results, and unexpected inventions all flow back into Research.
7. Real use outranks synthetic reasoning.
If the architecture says something should be ergonomic and Buffy repeatedly trips over it, the architecture loses.
8. Preserve provenance.
Observation → evidence → interpretation → decision → implementation → validation. Otherwise six months later you retain the strange constraint but forget why it exists.
9. Promote abstractions slowly.
Local fix → repeated pattern → demonstrated generality → lower-layer primitive. This is exactly the Gesso/Cyan/Palette discipline we're establishing.
10. Every development loop ends with another research question.

11. Win Condition: You've answered every question that's popped up and produced an entire professional quality roadmap for this specific problem. Congratulations.


Micro vs Macro RPD;

MICRO RPD

research bug
→ plan repair
→ implement
→ test
→ learn

MACRO RPD

research problem space
→ design architecture
→ build subsystem
→ operate subsystem
→ study emergent behavior
→ redesign architecture
