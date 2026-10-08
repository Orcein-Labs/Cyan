import { describe, expect, it } from "vitest";
import {
	type DaemonInfo,
	evaluateShutdownQuietPeriod,
	isWorkerSocketPath,
	planReap,
	planShutdownAll,
	planShutdownConfirmation,
	shutdownSocketPathScope,
	verifyHelloSupervisorPid,
} from "../src/cli/daemon-ps.js";
import { getProcessStartId } from "../src/core/session-lease.js";
import { defaultDaemonSocketPath } from "../src/modes/daemon/daemon-socket.js";

describe("shutdownSocketPathScope", () => {
	it.each(["CYAN_AGENT_DIR", "CYAN_CODING_AGENT_DIR", "PRIME_AGENT_CODING_AGENT_DIR"])(
		"scopes Cyan shutdown to its selected daemon socket when %s is set",
		(agentDirEnv) => {
			const agentDirEnvs = ["CYAN_AGENT_DIR", "CYAN_CODING_AGENT_DIR", "PRIME_AGENT_CODING_AGENT_DIR"] as const;
			const previousAgentDirs = new Map(agentDirEnvs.map((key) => [key, process.env[key]]));
			const previousSubstrate = process.env.CYAN_SUBSTRATE;
			try {
				for (const key of agentDirEnvs) delete process.env[key];
				process.env.CYAN_SUBSTRATE = "palette";
				process.env[agentDirEnv] = "/tmp/cyan-agent";
				expect(shutdownSocketPathScope()).toBe(
					process.platform === "win32" ? undefined : defaultDaemonSocketPath(),
				);
			} finally {
				if (previousSubstrate === undefined) delete process.env.CYAN_SUBSTRATE;
				else process.env.CYAN_SUBSTRATE = previousSubstrate;
				for (const [key, value] of previousAgentDirs) {
					if (value === undefined) delete process.env[key];
					else process.env[key] = value;
				}
			}
		},
	);

	it("honors an explicitly selected socket", () => {
		expect(shutdownSocketPathScope("/tmp/custom-daemon.sock")).toBe("/tmp/custom-daemon.sock");
	});

	it("keeps upstream shutdown unscoped outside Cyan", () => {
		const previousSubstrate = process.env.CYAN_SUBSTRATE;
		const previousAgentDir = process.env.PRIME_AGENT_CODING_AGENT_DIR;
		try {
			delete process.env.CYAN_SUBSTRATE;
			process.env.PRIME_AGENT_CODING_AGENT_DIR = "/tmp/cyan-agent";
			expect(shutdownSocketPathScope()).toBeUndefined();
		} finally {
			if (previousSubstrate === undefined) delete process.env.CYAN_SUBSTRATE;
			else process.env.CYAN_SUBSTRATE = previousSubstrate;
			if (previousAgentDir === undefined) delete process.env.PRIME_AGENT_CODING_AGENT_DIR;
			else process.env.PRIME_AGENT_CODING_AGENT_DIR = previousAgentDir;
		}
	});
});

it("recognizes Windows worker named pipes on every platform", () => {
	expect(isWorkerSocketPath("\\\\.\\pipe\\prime-agent-worker-98ed5cb228d2-5b1d3aeb91ee")).toBe(true);
	expect(isWorkerSocketPath("\\\\.\\pipe\\prime-agent-daemon")).toBe(false);
});

describe("evaluateShutdownQuietPeriod", () => {
	it("requires a full quiet period independently of the convergence window", () => {
		expect(evaluateShutdownQuietPeriod(10_500, 10_000)).toBe("waiting");
		expect(evaluateShutdownQuietPeriod(11_000, 10_000)).toBe("complete");
	});
});

describe("verifyHelloSupervisorPid", () => {
	it("accepts the hello pid only while its process identity still matches", () => {
		const processStartId = getProcessStartId(process.pid);
		expect(verifyHelloSupervisorPid(process.pid, processStartId)).toBe(process.pid);
		if (processStartId) {
			expect(verifyHelloSupervisorPid(process.pid, `${processStartId}-stale`)).toBeUndefined();
		}
	});
});

describe("planReap", () => {
	it("never touches the default daemon or daemons with live sessions", () => {
		const plan = planReap(
			[
				makeDaemon({ socketPath: "/tmp/default.sock", status: "stale", isDefault: true, sessionCount: 0, pid: 1 }),
				makeDaemon({ socketPath: "/tmp/busy.sock", status: "current", sessionCount: 3, pid: 2 }),
			],
			true,
		);
		expect(plan.map((action) => action.kind)).toEqual(["skip", "skip"]);
	});

	it("removes orphan files and stops reachable idle non-default daemons", () => {
		const plan = planReap(
			[
				makeDaemon({ socketPath: "/tmp/idle.sock", status: "current", sessionCount: 0, pid: 5 }),
				makeDaemon({ socketPath: "/tmp/orphan.sock", status: "orphan-file" }),
			],
			false,
		);
		expect(plan.map((action) => action.kind)).toEqual(["shutdown", "remove-file"]);
	});

	it("removes a stale default socket file", () => {
		const plan = planReap(
			[makeDaemon({ socketPath: "/tmp/default.sock", status: "orphan-file", isDefault: true })],
			true,
		);
		expect(plan[0]!.kind).toBe("remove-file");
	});

	it("only kills unreachable daemons with --force", () => {
		const daemon = makeDaemon({ socketPath: "/tmp/hung.sock", status: "unreachable", pid: 7 });
		const skipped = planReap([daemon], false)[0]!;
		expect(skipped.kind).toBe("skip");
		expect(skipped.kind === "skip" ? skipped.reason : "").toContain("prime-agent shutdown --force");
		expect(planReap([daemon], true)[0]!.kind).toBe("kill");
	});

	it("refuses to kill a pid that backs more than one discovered daemon", () => {
		const plan = planReap(
			[
				makeDaemon({ socketPath: "/tmp/listening.sock", status: "current", sessionCount: 4, pid: 99 }),
				makeDaemon({ socketPath: "/tmp/phantom.sock", status: "unreachable", pid: 99 }),
			],
			true,
		);
		const phantom = plan.find((action) => action.daemon.socketPath === "/tmp/phantom.sock");
		expect(phantom?.kind).toBe("skip");
		expect(phantom && phantom.kind === "skip" ? phantom.reason : "").toContain("also backs another daemon");
	});
});

describe("planShutdownAll", () => {
	it("targets every service when forced", () => {
		const plan = planShutdownAll(
			[
				makeDaemon({
					socketPath: "/tmp/default.sock",
					status: "current",
					isDefault: true,
					sessionCount: 0,
					pid: 1,
				}),
				makeDaemon({ socketPath: "/tmp/busy.sock", status: "current", sessionCount: 3, pid: 2 }),
				makeDaemon({ socketPath: "/tmp/hung.sock", status: "unreachable", pid: 7 }),
				makeDaemon({ socketPath: "/tmp/orphan.sock", status: "orphan-file" }),
			],
			true,
		);
		expect(plan.map((action) => action.kind)).toEqual(["shutdown", "shutdown", "kill", "remove-file"]);
	});

	it("never skips a service when forced", () => {
		const plan = planShutdownAll(
			[
				makeDaemon({ socketPath: "/tmp/a.sock", status: "stale", pid: 9 }),
				makeDaemon({ socketPath: "/tmp/b.sock", status: "unreachable", pid: 10 }),
			],
			true,
		);
		expect(plan.some((action) => action.kind === "skip")).toBe(false);
	});

	it("removes the socket file for an unreachable daemon with no pid", () => {
		const plan = planShutdownAll([makeDaemon({ socketPath: "/tmp/c.sock", status: "unreachable" })], false);
		expect(plan[0]!.kind).toBe("remove-file");
	});

	it("requires force for unreachable tracked workers", () => {
		const daemon = makeDaemon({
			socketPath: "/tmp/worker-only.sock",
			status: "unreachable",
			hasTrackedWorkers: true,
		});
		expect(planShutdownAll([daemon], false)[0]!.kind).toBe("skip");
		expect(planShutdownAll([daemon], true)[0]!.kind).toBe("remove-file");
	});
});

describe("planShutdownConfirmation", () => {
	it("never prompts when JSON output was requested", () => {
		expect(planShutdownConfirmation(1, true, false, true)).toBe("json-error");
	});

	it("prompts only for non-JSON shutdown at a TTY", () => {
		expect(planShutdownConfirmation(1, false, false, true)).toBe("prompt");
		expect(planShutdownConfirmation(1, false, false, false)).toBe("tty-error");
		expect(planShutdownConfirmation(1, true, true, true)).toBe("none");
		expect(planShutdownConfirmation(0, false, false, true)).toBe("none");
	});
});

function makeDaemon(options: Partial<DaemonInfo> & { socketPath: string; status: DaemonInfo["status"] }): DaemonInfo {
	return {
		isDefault: false,
		...options,
	};
}
