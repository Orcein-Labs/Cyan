import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_AGENT_DIR, SELF_UPDATE_INTERACTIVE_CHILD_ENV } from "../src/config.js";
import { main } from "../src/main.js";
import { handlePackageCommand } from "../src/package-manager-cli.js";

function restoreEnv(name: string, value: string | undefined): void {
	if (value === undefined) {
		delete process.env[name];
		return;
	}
	process.env[name] = value;
}

async function runSelfUpdateInstallChild(args: string[]): Promise<void> {
	const previousValue = process.env[SELF_UPDATE_INTERACTIVE_CHILD_ENV];
	process.env[SELF_UPDATE_INTERACTIVE_CHILD_ENV] = "1";
	try {
		await main(args);
	} finally {
		restoreEnv(SELF_UPDATE_INTERACTIVE_CHILD_ENV, previousValue);
	}
}

describe("package commands", () => {
	let tempDir: string;
	let agentDir: string;
	let projectDir: string;
	let packageDir: string;
	let originalCwd: string;
	let originalAgentDir: string | undefined;
	let originalPiPackageDir: string | undefined;
	let originalPrimeAgentDownloadBaseUrl: string | undefined;
	let originalTmpDir: string | undefined;
	let originalExitCode: typeof process.exitCode;
	let originalExecPath: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `pi-package-commands-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		agentDir = join(tempDir, "agent");
		projectDir = join(tempDir, "project");
		packageDir = join(tempDir, "local-package");
		mkdirSync(agentDir, { recursive: true });
		mkdirSync(projectDir, { recursive: true });
		mkdirSync(packageDir, { recursive: true });

		originalCwd = process.cwd();
		originalAgentDir = process.env[ENV_AGENT_DIR];
		originalPiPackageDir = process.env.PI_PACKAGE_DIR;
		originalPrimeAgentDownloadBaseUrl = process.env.PRIME_AGENT_DOWNLOAD_BASE_URL;
		originalTmpDir = process.env.TMPDIR;
		originalExitCode = process.exitCode;
		originalExecPath = process.execPath;
		process.exitCode = undefined;
		process.env[ENV_AGENT_DIR] = agentDir;
		process.env.TMPDIR = tempDir;
		process.chdir(projectDir);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		process.chdir(originalCwd);
		process.exitCode = originalExitCode;
		restoreEnv(ENV_AGENT_DIR, originalAgentDir);
		restoreEnv("PI_PACKAGE_DIR", originalPiPackageDir);
		restoreEnv("PRIME_AGENT_DOWNLOAD_BASE_URL", originalPrimeAgentDownloadBaseUrl);
		restoreEnv("TMPDIR", originalTmpDir);
		Object.defineProperty(process, "execPath", { value: originalExecPath, configurable: true });
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should persist global relative local package paths relative to settings.json", async () => {
		const relativePkgDir = join(projectDir, "packages", "local-package");
		mkdirSync(relativePkgDir, { recursive: true });

		await main(["package", "install", "./packages/local-package"]);

		const settingsPath = join(agentDir, "settings.json");
		const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as { packages?: string[] };
		expect(settings.packages?.length).toBe(1);
		const stored = settings.packages?.[0] ?? "";
		const resolvedFromSettings = realpathSync(join(agentDir, stored));
		expect(resolvedFromSettings).toBe(realpathSync(relativePkgDir));
	});

	it("should remove local packages using a path with a trailing slash", async () => {
		await main(["package", "install", `${packageDir}/`]);

		const settingsPath = join(agentDir, "settings.json");
		const installedSettings = JSON.parse(readFileSync(settingsPath, "utf-8")) as { packages?: string[] };
		expect(installedSettings.packages?.length).toBe(1);

		await main(["package", "remove", `${packageDir}/`]);

		const removedSettings = JSON.parse(readFileSync(settingsPath, "utf-8")) as { packages?: string[] };
		expect(removedSettings.packages ?? []).toHaveLength(0);
	});

	it("rejects --nightly for extension-only updates", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await handlePackageCommand(["update", "--extensions", "--nightly"]);
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("only apply to cyan itself"));
		expect(process.exitCode).toBe(1);
	});

	interface SelfUpdateFixtureOptions {
		/** Scope the running CLI is installed under; drives the rename/alias paths. */
		scope?: string;
		/** Body the update manifest fetch returns. */
		manifest: Record<string, unknown>;
		downloadBaseUrl?: string;
		/** Also write a project-scoped npmCommand, to prove the global one wins. */
		projectNpmCommand?: boolean;
		/** Make the fake npm fail `install`, like a broken registry package. */
		failInstall?: boolean;
	}

	/**
	 * Self-update shares one fixture: a fake npm that records every invocation, an
	 * installed-package directory for the running CLI, and a stubbed update manifest.
	 * Installing the wrong package or prefix is the footgun these cases guard.
	 */
	function setupSelfUpdate(options: SelfUpdateFixtureOptions) {
		const globalPrefix = join(tempDir, "global-prefix");
		const projectPrefix = join(tempDir, "project-prefix");
		const selfPackageDir = join(
			globalPrefix,
			"lib",
			"node_modules",
			options.scope ?? "@earendil-works",
			"pi-coding-agent",
		);
		const fakeNpmPath = join(tempDir, "fake-npm.cjs");
		const recordPath = join(tempDir, "self-update.json");
		mkdirSync(selfPackageDir, { recursive: true });
		writeFileSync(
			fakeNpmPath,
			`const fs=require("node:fs"),path=require("node:path"),args=process.argv.slice(2),prefix=args[args.indexOf("--prefix")+1];
if(args.includes("root")) {
	console.log(path.join(prefix,"lib","node_modules"));
	process.exit(0);
}
const records=fs.existsSync(${JSON.stringify(recordPath)})?JSON.parse(fs.readFileSync(${JSON.stringify(recordPath)},"utf-8")):[];
records.push(args);
fs.writeFileSync(${JSON.stringify(recordPath)},JSON.stringify(records));
${options.failInstall ? 'if(args.includes("install")) process.exit(23);' : ""}
`,
		);
		writeFileSync(
			join(agentDir, "settings.json"),
			JSON.stringify({ npmCommand: [originalExecPath, fakeNpmPath, "--prefix", globalPrefix] }, null, 2),
		);
		if (options.projectNpmCommand) {
			mkdirSync(join(projectDir, ".prime", "agent"), { recursive: true });
			writeFileSync(
				join(projectDir, ".prime", "agent", "settings.json"),
				JSON.stringify({ npmCommand: [originalExecPath, fakeNpmPath, "--prefix", projectPrefix] }, null, 2),
			);
		}
		process.env.PI_PACKAGE_DIR = selfPackageDir;
		if (options.downloadBaseUrl) process.env.PRIME_AGENT_DOWNLOAD_BASE_URL = options.downloadBaseUrl;
		Object.defineProperty(process, "execPath", {
			value: join(selfPackageDir, "dist", "cli.js"),
			configurable: true,
		});
		const fetchMock = vi.fn(async () => Response.json(options.manifest));
		vi.stubGlobal("fetch", fetchMock);
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		return {
			globalPrefix,
			projectPrefix,
			fetchMock,
			errorSpy,
			stdout: () => logSpy.mock.calls.map(([message]) => String(message)).join("\n"),
			stderr: () => errorSpy.mock.calls.map(([message]) => String(message)).join("\n"),
			/** Every argv the fake npm saw, in order. */
			npmCalls: () => JSON.parse(readFileSync(recordPath, "utf-8")) as string[][],
			ranNpm: () => existsSync(recordPath),
		};
	}

	it.each([
		[["update"]],
		[["update", "--self", "--force"]],
		[["update", "--rollback"]],
		[["update", "--nightly", "--force"]],
		[["update", "--internal-update-restart-coordinator"]],
	])("refuses upstream self-update %j without fetching or installing", async (args: string[]) => {
		const fixture = setupSelfUpdate({ manifest: { version: "99.0.0", package: "prime-agent" } });
		await handlePackageCommand(args);
		expect(fixture.stderr()).toContain("upstream binary updates are disabled");
		expect(fixture.fetchMock).not.toHaveBeenCalled();
		expect(fixture.ranNpm()).toBe(false);
		expect(process.exitCode).toBe(1);
		process.exitCode = undefined;
		await runSelfUpdateInstallChild(args);
		expect(process.exitCode).toBe(1);
		expect(fixture.fetchMock).not.toHaveBeenCalled();
		expect(fixture.ranNpm()).toBe(false);
	});

	it("suggests the configured source when update input omits the npm prefix", async () => {
		const settingsPath = join(agentDir, "settings.json");
		writeFileSync(settingsPath, JSON.stringify({ packages: ["npm:pi-formatter"] }, null, 2));

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		try {
			await expect(main(["package", "update", "pi-formatter"])).resolves.toBeUndefined();

			const stderr = errorSpy.mock.calls.map(([message]) => String(message)).join("\n");
			const stdout = logSpy.mock.calls.map(([message]) => String(message)).join("\n");
			expect(stderr).toContain("Did you mean npm:pi-formatter?");
			expect(stdout).not.toContain("Updated pi-formatter");
			expect(process.exitCode).toBe(1);

			const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as { packages?: string[] };
			expect(settings.packages).toContain("npm:pi-formatter");
		} finally {
			errorSpy.mockRestore();
			logSpy.mockRestore();
		}
	});
});
