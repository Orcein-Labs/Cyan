import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ModeDeclaration, SessionPlan, SubHarnessDeclaration, UnsatisfiedRequirement } from "./types.js";

/** Thrown when a declaration on disk is missing, malformed, or inconsistent. */
export class ModeDeclarationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ModeDeclarationError";
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string, source: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new ModeDeclarationError(`${source}: "${field}" must be a non-empty string`);
	}
	return value;
}

function requireStringArray(value: unknown, field: string, source: string): string[] {
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
		throw new ModeDeclarationError(`${source}: "${field}" must be an array of strings`);
	}
	return [...(value as string[])];
}

function optionalStringArray(value: unknown, field: string, source: string): string[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	return requireStringArray(value, field, source);
}

function parseMode(raw: unknown, source: string): ModeDeclaration {
	if (!isRecord(raw)) {
		throw new ModeDeclarationError(`${source}: declaration must be a mapping`);
	}
	if (raw.kind !== "mode") {
		throw new ModeDeclarationError(`${source}: kind must be "mode", got ${JSON.stringify(raw.kind)}`);
	}
	if (!isRecord(raw.doctrine) || typeof raw.doctrine.file !== "string") {
		throw new ModeDeclarationError(`${source}: "doctrine.file" is required`);
	}
	if (!isRecord(raw.tools)) {
		throw new ModeDeclarationError(`${source}: "tools" is required`);
	}
	if (!isRecord(raw.capabilities)) {
		throw new ModeDeclarationError(`${source}: "capabilities" is required`);
	}
	if (raw.phases !== undefined) {
		if (!isRecord(raw.phases)) {
			throw new ModeDeclarationError(`${source}: "phases" must be a mapping when present`);
		}
	}
	if (raw.state !== undefined && !isRecord(raw.state)) {
		throw new ModeDeclarationError(`${source}: "state" must be a mapping when present`);
	}
	if (raw.artifacts !== undefined && !isRecord(raw.artifacts)) {
		throw new ModeDeclarationError(`${source}: "artifacts" must be a mapping when present`);
	}
	if (raw.handoff !== undefined && !isRecord(raw.handoff)) {
		throw new ModeDeclarationError(`${source}: "handoff" must be a mapping when present`);
	}

	const id = requireString(raw.id, "id", source);
	const version = typeof raw.version === "number" ? raw.version : 1;
	const reentry = isRecord(raw.phases) ? raw.phases.reentry_tools : undefined;
	if (reentry !== undefined && !isRecord(reentry)) {
		throw new ModeDeclarationError(`${source}: "phases.reentry_tools" must be a mapping`);
	}
	const reentryTools: Record<string, string[]> | undefined = {};
	if (reentry !== undefined) {
		for (const [phase, tools] of Object.entries(reentry)) {
			reentryTools[phase] = requireStringArray(tools, `phases.reentry_tools.${phase}`, source);
		}
	}

	const phases = isRecord(raw.phases)
		? {
				order: requireStringArray(raw.phases.order, "phases.order", source),
				...(typeof raw.phases.default === "string" ? { default: raw.phases.default } : {}),
				...(Object.keys(reentryTools).length > 0 ? { reentry_tools: reentryTools } : {}),
			}
		: undefined;

	if (phases && phases.default !== undefined && !phases.order.includes(phases.default)) {
		throw new ModeDeclarationError(`${source}: phases.default "${phases.default}" is not in phases.order`);
	}

	return {
		id,
		kind: "mode",
		version,
		title: requireString(raw.title, "title", source),
		summary: requireString(raw.summary, "summary", source),
		doctrine: { file: raw.doctrine.file },
		capabilities: raw.capabilities,
		tools: {
			promote: requireStringArray(raw.tools.promote, "tools.promote", source),
			...(optionalStringArray(raw.tools.dismiss, "tools.dismiss", source) !== undefined
				? { dismiss: requireStringArray(raw.tools.dismiss, "tools.dismiss", source) }
				: {}),
		},
		...(phases !== undefined ? { phases } : {}),
		...(isRecord(raw.state)
			? {
					state: {
						kind: requireString(raw.state.kind, "state.kind", source),
						...(typeof raw.state.serializable === "boolean" ? { serializable: raw.state.serializable } : {}),
					},
				}
			: {}),
		...(isRecord(raw.artifacts)
			? {
					artifacts: {
						...(optionalStringArray(raw.artifacts.expect, "artifacts.expect", source) !== undefined
							? { expect: requireStringArray(raw.artifacts.expect, "artifacts.expect", source) }
							: {}),
						...(optionalStringArray(raw.artifacts.optional, "artifacts.optional", source) !== undefined
							? { optional: requireStringArray(raw.artifacts.optional, "artifacts.optional", source) }
							: {}),
					},
				}
			: {}),
		...(isRecord(raw.handoff) && typeof raw.handoff.downstream === "string"
			? { handoff: { downstream: raw.handoff.downstream } }
			: {}),
	};
}

function parseSubHarness(raw: unknown, source: string): SubHarnessDeclaration {
	if (!isRecord(raw)) {
		throw new ModeDeclarationError(`${source}: declaration must be a mapping`);
	}
	if (raw.kind !== "subharness") {
		throw new ModeDeclarationError(`${source}: kind must be "subharness", got ${JSON.stringify(raw.kind)}`);
	}
	if (!isRecord(raw.contract) || typeof raw.contract.file !== "string") {
		throw new ModeDeclarationError(`${source}: "contract.file" is required`);
	}
	if (!isRecord(raw.tools)) {
		throw new ModeDeclarationError(`${source}: "tools" is required`);
	}
	if (!isRecord(raw.requires)) {
		throw new ModeDeclarationError(`${source}: "requires" is required`);
	}
	if (!isRecord(raw.context) || typeof raw.context.file !== "string") {
		throw new ModeDeclarationError(`${source}: "context.file" is required`);
	}
	return {
		id: requireString(raw.id, "id", source),
		kind: "subharness",
		version: typeof raw.version === "number" ? raw.version : 1,
		title: requireString(raw.title, "title", source),
		summary: requireString(raw.summary, "summary", source),
		contract: { file: raw.contract.file },
		tools: {
			offer: requireStringArray(raw.tools.offer, "tools.offer", source),
			...(optionalStringArray(raw.tools.mutating, "tools.mutating", source) !== undefined
				? { mutating: requireStringArray(raw.tools.mutating, "tools.mutating", source) }
				: {}),
		},
		requires: raw.requires,
		context: { file: raw.context.file },
		...(isRecord(raw.artifacts)
			? {
					...(optionalStringArray(raw.artifacts.offer, "artifacts.offer", source) !== undefined
						? { artifacts: { offer: requireStringArray(raw.artifacts.offer, "artifacts.offer", source) } }
						: {}),
				}
			: {}),
	};
}

function readDeclaration(path: string): unknown {
	if (!existsSync(path)) {
		throw new ModeDeclarationError(`declaration not found: ${path}`);
	}
	const contents = readFileSync(path, "utf8");
	try {
		return parseYaml(contents);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new ModeDeclarationError(`${path}: invalid YAML -- ${reason}`);
	}
}

function resolveRelative(declarationPath: string, reference: string): string {
	return isAbsolute(reference) ? reference : resolve(dirname(declarationPath), reference);
}

function readReferencedText(declarationPath: string, reference: string, label: string): string {
	const path = resolveRelative(declarationPath, reference);
	if (!existsSync(path)) {
		throw new ModeDeclarationError(`${declarationPath}: ${label} file not found: ${path}`);
	}
	return readFileSync(path, "utf8");
}

/** Load and validate a mode declaration from its YAML path. */
export function loadMode(path: string): ModeDeclaration {
	return parseMode(readDeclaration(path), path);
}

/** Load and validate a sub-harness declaration from its YAML path. */
export function loadSubHarness(path: string): SubHarnessDeclaration {
	return parseSubHarness(readDeclaration(path), path);
}

/** Load a mode together with the doctrine text it references. */
export function loadModeWithDoctrine(path: string): { mode: ModeDeclaration; doctrine: string } {
	const mode = loadMode(path);
	return { mode, doctrine: readReferencedText(path, mode.doctrine.file, "doctrine") };
}

/** Load a sub-harness together with the contract and context it references. */
export function loadSubHarnessWithText(path: string): {
	subharness: SubHarnessDeclaration;
	contract: string;
	context: string;
} {
	const subharness = loadSubHarness(path);
	return {
		subharness,
		contract: readReferencedText(path, subharness.contract.file, "contract"),
		context: readReferencedText(path, subharness.context.file, "context"),
	};
}

/**
 * Requirements the sub-harness needs that the mode's ceiling does not grant.
 *
 * The check mirrors `C_child ⊆ C_caller` from docs/CAPABILITY_MODEL.md: a
 * sub-harness may only ask for authority the session already has. Reporting
 * rather than auto-granting is the whole point -- a silent grant here would
 * make attaching a sub-harness a privilege escalation.
 */
export function findUnsatisfiedRequirements(
	mode: ModeDeclaration,
	subharness: SubHarnessDeclaration,
): UnsatisfiedRequirement[] {
	const unsatisfied: UnsatisfiedRequirement[] = [];
	for (const [category, required] of Object.entries(subharness.requires)) {
		const granted = mode.capabilities[category];
		if (!isSubset(required, granted)) {
			unsatisfied.push({ category, required, granted });
		}
	}
	return unsatisfied;
}

/**
 * Whether everything `required` asks for is contained in `granted`.
 *
 * Arrays are compared as set containment so a sub-harness may request a subset
 * of a granted list. Anything else requires structural equality, which is the
 * conservative answer: an unrecognized shape is not assumed to be satisfied.
 */
function isSubset(required: unknown, granted: unknown): boolean {
	if (Array.isArray(required)) {
		if (!Array.isArray(granted)) {
			return false;
		}
		const grantedSet = new Set(granted);
		return required.every((entry) => grantedSet.has(entry));
	}
	if (isRecord(required)) {
		if (!isRecord(granted)) {
			return false;
		}
		return Object.entries(required).every(([key, value]) => isSubset(value, granted[key]));
	}
	return required === granted;
}

/**
 * Core tools that can change project or host state.
 *
 * Owned by the mode layer, not by any mode. A sub-harness cannot widen a mode's
 * write access by naming its tools differently, so the guarantee that
 * attaching a sub-harness never broadens mutation is structural: a mode that
 * dismisses any of these also loses every contributed tool the sub-harness
 * declared mutating.
 */
const MUTATING_CORE_TOOLS = new Set(["write", "edit", "apply-patch", "shell", "patch"]);

/**
 * Whether a mode refuses to mutate, either by naming a mutating core tool or by
 * declining mutation outright.
 */
function modeRefusesMutation(mode: ModeDeclaration): boolean {
	const dismiss = mode.tools.dismiss ?? [];
	return dismiss.includes("mutation") || dismiss.some((tool) => MUTATING_CORE_TOOLS.has(tool));
}

/**
 * Compose a session plan from a mode and an optional sub-harness.
 *
 * Three projections, one declaration: doctrine becomes the system prompt, the
 * tool policy becomes the allowlist, and the capability fragment becomes the
 * ceiling. The ceiling is taken verbatim from the mode -- a sub-harness
 * contributes nothing to it, which is what makes attaching one safe.
 */
export function composeSessionPlan(
	mode: ModeDeclaration,
	doctrine: string,
	subharness?: { subharness: SubHarnessDeclaration; context: string },
): SessionPlan {
	const dismiss = new Set(mode.tools.dismiss ?? []);
	const refusesMutation = modeRefusesMutation(mode);
	const contributed = new Set(subharness?.subharness.tools.mutating ?? []);
	const allowedToolNames: string[] = [...mode.tools.promote];
	if (subharness) {
		for (const tool of subharness.subharness.tools.offer) {
			// Three independent denials, because the guarantee is that a
			// sub-harness cannot widen anything:
			//   - named explicitly in the mode's dismiss list;
			//   - declared mutating by the sub-harness, when the mode refuses
			//     mutation (catches a contributed `wge-commit` under a mode
			//     that dismisses `write`);
			//   - not already present, so the union stays a set.
			const denied = dismiss.has(tool) || (refusesMutation && contributed.has(tool));
			if (!denied && !allowedToolNames.includes(tool)) {
				allowedToolNames.push(tool);
			}
		}
	}

	return {
		mode,
		...(subharness ? { subharness: subharness.subharness } : {}),
		systemPrompt: subharness ? `${doctrine}\n\n${subharness.context}` : doctrine,
		allowedToolNames,
		ceiling: mode.capabilities,
		unsatisfiedRequirements: subharness ? findUnsatisfiedRequirements(mode, subharness.subharness) : [],
		...(mode.handoff?.downstream !== undefined ? { handoff: mode.handoff.downstream } : {}),
	};
}

/** Resolve a mode path from a repository root, for callers that know the root. */
export function modePath(repoRoot: string, modeId: string): string {
	return join(repoRoot, "modes", modeId, "mode.yaml");
}

/** Resolve a sub-harness path from a repository root. */
export function subHarnessPath(repoRoot: string, subHarnessId: string): string {
	return join(repoRoot, "subharness", subHarnessId, "subharness.yaml");
}
