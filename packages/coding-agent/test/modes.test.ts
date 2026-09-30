import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ModeDeclaration, SubHarnessDeclaration } from "../src/core/modes/index.js";
import {
	composeSessionPlan,
	findUnsatisfiedRequirements,
	loadMode,
	loadModeWithDoctrine,
	loadSubHarnessWithText,
	ModeDeclarationError,
	modePath,
	subHarnessPath,
} from "../src/core/modes/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function writeDeclaration(dir: string, name: string, contents: string): string {
	const path = join(dir, name);
	writeFileSync(path, contents);
	return path;
}

const minimalMode: ModeDeclaration = {
	id: "test-mode",
	kind: "mode",
	version: 1,
	title: "Test",
	summary: "A mode for tests.",
	doctrine: { file: "doctrine.md" },
	capabilities: { host_request: { allowed_types: ["rlm.collect"] } },
	tools: { promote: ["read", "grep"], dismiss: ["write"] },
};

const minimalSubHarness: SubHarnessDeclaration = {
	id: "test-sub",
	kind: "subharness",
	version: 1,
	title: "Test Sub",
	summary: "A sub-harness for tests.",
	contract: { file: "contract.md" },
	tools: { offer: ["sub-read", "sub-commit"], mutating: ["sub-commit"] },
	requires: { host_request: { allowed_types: ["rlm.collect"] } },
	context: { file: "context.md" },
};

describe("shipped declarations", () => {
	it.each(["research-planning", "engineer", "red-team"])("loads %s with its doctrine resolvable", (id) => {
		const { mode, doctrine } = loadModeWithDoctrine(modePath(repoRoot, id));
		expect(mode.id).toBe(id);
		expect(mode.kind).toBe("mode");
		expect(mode.tools.promote.length).toBeGreaterThan(0);
		expect(mode.phases?.default).toBeDefined();
		expect(mode.phases?.order).toContain(mode.phases?.default as string);
		expect(doctrine.length).toBeGreaterThan(0);
	});

	it("gives each mode a distinct phase policy, so none is a rename of another", () => {
		const phases = ["research-planning", "engineer", "red-team"].map((id) =>
			loadMode(modePath(repoRoot, id)).phases?.order.join(">"),
		);
		expect(new Set(phases).size).toBe(3);
	});

	it("dismisses write in both modes whose doctrine forbids repairing in place", () => {
		for (const id of ["research-planning", "red-team"]) {
			expect(loadMode(modePath(repoRoot, id)).tools.dismiss ?? []).toContain("write");
		}
		expect(loadMode(modePath(repoRoot, "engineer")).tools.promote).toContain("write");
	});

	it("loads the WGE sub-harness with its contract and context resolvable", () => {
		const { subharness, contract, context } = loadSubHarnessWithText(subHarnessPath(repoRoot, "wge"));
		expect(subharness.kind).toBe("subharness");
		expect(subharness.tools.offer.length).toBeGreaterThan(0);
		expect(contract).toContain("not an Agent Mode");
		expect(context.length).toBeGreaterThan(0);
	});

	it("gives the sub-harness no capabilities section, so it cannot grant authority", () => {
		const source = loadSubHarnessWithText(subHarnessPath(repoRoot, "wge"));
		expect(source.subharness).not.toHaveProperty("capabilities");
	});
});

describe("composeSessionPlan", () => {
	it("projects doctrine, tools, and ceiling from one declaration", () => {
		const plan = composeSessionPlan(minimalMode, "doctrine text");
		expect(plan.systemPrompt).toBe("doctrine text");
		expect(plan.allowedToolNames).toEqual(["read", "grep"]);
		expect(plan.ceiling).toBe(minimalMode.capabilities);
		expect(plan.subharness).toBeUndefined();
	});

	it("adds sub-harness tools to the mode's allowlist", () => {
		const plan = composeSessionPlan(minimalMode, "d", {
			subharness: { ...minimalSubHarness, tools: { offer: ["sub-read"] } },
			context: "c",
		});
		expect(plan.allowedToolNames).toEqual(["read", "grep", "sub-read"]);
	});

	it("denies a declared-mutating contributed tool when the mode refuses mutation, whatever it is named", () => {
		const plan = composeSessionPlan(minimalMode, "d", {
			subharness: minimalSubHarness,
			context: "c",
		});
		expect(plan.allowedToolNames).toContain("sub-read");
		expect(plan.allowedToolNames).not.toContain("sub-commit");
	});

	it("keeps mutating contributed tools for a mode that does not refuse mutation", () => {
		const writing: ModeDeclaration = { ...minimalMode, tools: { promote: ["read"] } };
		const plan = composeSessionPlan(writing, "d", {
			subharness: minimalSubHarness,
			context: "c",
		});
		expect(plan.allowedToolNames).toContain("sub-commit");
	});

	it("denies a mutating contributed tool when the mode dismisses a different mutating core tool", () => {
		// The mode never mentions sub-commit, and never mentions "mutation". The
		// guarantee holds because it dismisses `shell`, which is mutating.
		const shelling: ModeDeclaration = {
			...minimalMode,
			tools: { promote: ["read"], dismiss: ["shell"] },
		};
		const plan = composeSessionPlan(shelling, "d", {
			subharness: minimalSubHarness,
			context: "c",
		});
		expect(plan.allowedToolNames).not.toContain("sub-commit");
	});

	it("keeps a contributed tool the mode dismisses by exact name", () => {
		const exact: ModeDeclaration = {
			...minimalMode,
			tools: { promote: ["read"], dismiss: ["sub-read"] },
		};
		const plan = composeSessionPlan(exact, "d", {
			subharness: minimalSubHarness,
			context: "c",
		});
		expect(plan.allowedToolNames).not.toContain("sub-read");
	});

	it("takes the ceiling verbatim from the mode, never from the sub-harness", () => {
		const escalated: SubHarnessDeclaration = {
			...minimalSubHarness,
			// A sub-harness that tried to smuggle in authority.
			...({ capabilities: { external_fs_write: { allowed_dirs: ["/"] } } } as object),
		};
		const plan = composeSessionPlan(minimalMode, "d", {
			subharness: escalated,
			context: "c",
		});
		expect(plan.ceiling).toEqual({ host_request: { allowed_types: ["rlm.collect"] } });
		expect(JSON.stringify(plan.ceiling)).not.toContain("/");
	});

	it("appends the sub-harness context after the mode doctrine", () => {
		const plan = composeSessionPlan(minimalMode, "DOCTRINE", {
			subharness: minimalSubHarness,
			context: "CONTEXT",
		});
		expect(plan.systemPrompt).toBe("DOCTRINE\n\nCONTEXT");
		expect(plan.systemPrompt.indexOf("DOCTRINE")).toBeLessThan(plan.systemPrompt.indexOf("CONTEXT"));
	});

	it("carries the declared downstream handoff", () => {
		const plan = composeSessionPlan({ ...minimalMode, handoff: { downstream: "engineer" } }, "d");
		expect(plan.handoff).toBe("engineer");
	});

	it("does not duplicate a tool both the mode and the sub-harness offer", () => {
		const plan = composeSessionPlan(minimalMode, "d", {
			subharness: { ...minimalSubHarness, tools: { offer: ["read", "sub-read"] } },
			context: "c",
		});
		expect(plan.allowedToolNames).toEqual(["read", "grep", "sub-read"]);
	});
});

describe("findUnsatisfiedRequirements", () => {
	it("reports nothing when the mode grants every required host request", () => {
		expect(findUnsatisfiedRequirements(minimalMode, minimalSubHarness)).toEqual([]);
	});

	it("reports a requirement the mode does not grant, without granting it", () => {
		const demanding: SubHarnessDeclaration = {
			...minimalSubHarness,
			requires: { host_request: { allowed_types: ["rlm.collect", "rlm.spawn"] } },
		};
		const unsatisfied = findUnsatisfiedRequirements(minimalMode, demanding);
		expect(unsatisfied).toHaveLength(1);
		expect(unsatisfied[0].category).toBe("host_request");
		expect(unsatisfied[0].required).toEqual({ allowed_types: ["rlm.collect", "rlm.spawn"] });
		expect(unsatisfied[0].granted).toEqual({ allowed_types: ["rlm.collect"] });
	});

	it("accepts a subset request but rejects a superset", () => {
		const subset: SubHarnessDeclaration = {
			...minimalSubHarness,
			requires: { host_request: { allowed_types: [] } },
		};
		expect(findUnsatisfiedRequirements(minimalMode, subset)).toEqual([]);
		const superset: SubHarnessDeclaration = {
			...minimalSubHarness,
			requires: { host_request: { allowed_types: ["rlm.collect", "rlm.delete_subagent"] } },
		};
		expect(findUnsatisfiedRequirements(minimalMode, superset)).toHaveLength(1);
	});

	it("fails closed on a requirement whose shape it cannot verify", () => {
		const odd: SubHarnessDeclaration = {
			...minimalSubHarness,
			requires: { network_access: { allowed: true } },
		};
		const unsatisfied = findUnsatisfiedRequirements(minimalMode, odd);
		expect(unsatisfied).toHaveLength(1);
		expect(unsatisfied[0].category).toBe("network_access");
	});
});

describe("declaration validation", () => {
	it("rejects a declaration with the wrong kind", () => {
		const dir = mkdtempSync(join(tmpdir(), "mode-kind-"));
		const path = writeDeclaration(dir, "mode.yaml", "id: x\nkind: subharness\n");
		expect(() => loadMode(path)).toThrow(ModeDeclarationError);
	});

	it("rejects a default phase that is not in the phase order", () => {
		const dir = mkdtempSync(join(tmpdir(), "mode-phase-"));
		const path = writeDeclaration(
			dir,
			"mode.yaml",
			[
				"id: x",
				"kind: mode",
				"title: X",
				"summary: y",
				"doctrine:",
				"  file: doctrine.md",
				"capabilities: {}",
				"tools:",
				"  promote: [read]",
				"phases:",
				"  order: [a, b]",
				"  default: c",
				"",
			].join("\n"),
		);
		expect(() => loadMode(path)).toThrow(/not in phases\.order/);
	});

	it("rejects a missing declaration rather than defaulting to a permissive mode", () => {
		expect(() => loadMode("/nonexistent/mode.yaml")).toThrow(ModeDeclarationError);
	});

	it("rejects a mode with no tool allowlist, rather than promoting everything", () => {
		const dir = mkdtempSync(join(tmpdir(), "mode-tools-"));
		const path = writeDeclaration(
			dir,
			"mode.yaml",
			[
				"id: x",
				"kind: mode",
				"title: X",
				"summary: y",
				"doctrine:",
				"  file: doctrine.md",
				"capabilities: {}",
				"tools: {}",
				"",
			].join("\n"),
		);
		expect(() => loadMode(path)).toThrow(/tools\.promote/);
	});
});
