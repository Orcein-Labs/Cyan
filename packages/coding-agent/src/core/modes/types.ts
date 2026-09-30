/**
 * Cyan agent mode declarations.
 *
 * A mode is a cognitive operating policy for a session. A sub-harness is a
 * domain contribution that supplies machinery and context. They are different
 * kinds of thing and are deliberately not unified: a sub-harness cannot set
 * policy, only require authority it does not itself grant.
 *
 * The declarations are data rather than code because session construction runs
 * in this process, before the Palette kernel is up (the kernel starts lazily
 * on first tool call). A declaration that only existed as a loaded Julia type
 * would force a Julia cold start merely to decide which tools to enable.
 */

/** Tool surface a mode grants to the session. */
export interface ModeToolPolicy {
	/**
	 * Core chassis tools this mode makes available. An allowlist, not a hint:
	 * a core tool absent from here is not available to the session.
	 */
	promote: string[];
	/**
	 * Denials that apply to *everything* the session can reach, including tools
	 * contributed by a sub-harness. This is what keeps a mode that dismisses
	 * `write` read-only even under a sub-harness that offers editing, and it
	 * is what lets a mode express policy without knowing what domains exist.
	 */
	dismiss?: string[];
}

/** Phase policy. A cognitive control policy, not a wizard. */
export interface ModePhasePolicy {
	order: string[];
	default?: string;
	/** Phases in which named tools are re-enabled, for mode-specific work. */
	reentry_tools?: Record<string, string[]>;
}

/** What a converged session of this mode is expected to have produced. */
export interface ModeArtifactPolicy {
	expect?: string[];
	optional?: string[];
}

export interface ModeDeclaration {
	id: string;
	kind: "mode";
	version: number;
	title: string;
	summary: string;
	/** Path to the doctrine docstring, relative to the declaration. */
	doctrine: { file: string };
	/**
	 * A fragment of the session capability ceiling. This is a *request*: the
	 * host broker decides, and a child may never exceed its parent. Only
	 * broker-mediated (C-class) effects belong here; A and B classes are
	 * already bounded by the OS sandbox and would be friction without a
	 * boundary.
	 */
	capabilities: Record<string, unknown>;
	tools: ModeToolPolicy;
	phases?: ModePhasePolicy;
	state?: { kind: string; serializable?: boolean };
	artifacts?: ModeArtifactPolicy;
	handoff?: { downstream?: string };
}

export interface SubHarnessDeclaration {
	id: string;
	kind: "subharness";
	version: number;
	title: string;
	summary: string;
	/** Path to the contract docstring, relative to the declaration. */
	contract: { file: string };
	/**
	 * Domain tools this sub-harness contributes.
	 *
	 * `mutating` names the subset that can change host or project state. It
	 * exists because a mode's `dismiss` list names *core* tools, and exact
	 * string matching would otherwise let a contributed `wge-commit` slip past
	 * a mode that dismisses `write`. Declaring mutation on the contributing
	 * side keeps the guarantee structural instead of dependent on tool naming.
	 */
	tools: { offer: string[]; mutating?: string[] };
	/**
	 * Authority this sub-harness *requires* in order for its tools to work.
	 *
	 * A sub-harness cannot grant authority. Anything it requires that the
	 * active mode's ceiling does not already include fails closed at the
	 * broker, and is reported as an unsatisfied requirement rather than
	 * silently granted or silently ignored.
	 */
	requires: Record<string, unknown>;
	/** Path to the context contribution, relative to the declaration. */
	context: { file: string };
	artifacts?: { offer?: string[] };
}

/**
 * A requirement the attached sub-harness needs that the active mode does not
 * grant. Reported, never auto-granted.
 */
export interface UnsatisfiedRequirement {
	category: string;
	/** What the sub-harness asked for. */
	required: unknown;
	/** What the mode's ceiling actually grants, if anything. */
	granted: unknown;
}

/**
 * Everything needed to construct a session under a mode, with a sub-harness
 * optionally attached.
 */
export interface SessionPlan {
	mode: ModeDeclaration;
	subharness?: SubHarnessDeclaration;
	/** Doctrine text, with the sub-harness's context contribution appended. */
	systemPrompt: string;
	/**
	 * The tool allowlist to construct the session with. Core tools come from
	 * the mode's `promote`; sub-harness tools are added only if the mode's
	 * `dismiss` does not deny them.
	 */
	allowedToolNames: string[];
	/**
	 * The capability ceiling to hand the Palette tool factory. Taken verbatim
	 * from the mode. A sub-harness contributes nothing here, by design.
	 */
	ceiling: Record<string, unknown>;
	unsatisfiedRequirements: UnsatisfiedRequirement[];
	handoff?: string;
}
