import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cyanSubstrate, resolvePaletteRuntime } from "../src/core/tools/palette-runtime.js";

describe("Cyan Palette runtime configuration", () => {
	let root: string;
	let sdk: string;
	let host: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "cyan-runtime-"));
		sdk = join(root, "sdk");
		mkdirSync(join(sdk, "runtime", "scripts"), { recursive: true });
		writeFileSync(join(sdk, "Project.toml"), 'name = "Palette"\n');
		writeFileSync(join(sdk, "runtime", "scripts", "session_loop.jl"), "");
		host = join(root, "host");
		writeFileSync(host, "");
		chmodSync(host, 0o700);
		writeFileSync(join(root, "palette.json"), JSON.stringify({ sdkPath: sdk, hostBin: host }));
	});
	afterEach(() => rmSync(root, { recursive: true, force: true }));

	it("resolves runtime and durable state without granting network or arbitrary host authority", () => {
		const options = resolvePaletteRuntime(root, {});
		expect(options.projectDir).toBe(sdk);
		expect(options.hostBin).toBe(host);
		expect(options.stateRoot).toBe(join(root, "palette-state"));
		expect(options.network).toBeUndefined();
		expect(options.ceiling).not.toHaveProperty("exec");
	});

	it.each(["unknown", "sdkPath"])("rejects invalid %s configuration before startup", (key) => {
		writeFileSync(
			join(root, "palette.json"),
			JSON.stringify({ sdkPath: sdk, hostBin: host, [key]: key === "unknown" ? sdk : "relative" }),
		);
		expect(() => resolvePaletteRuntime(root, {})).toThrow(/unknown|absolute path/);
	});

	it("does not silently replace a missing explicitly selected configuration", () => {
		expect(() => resolvePaletteRuntime(root, { CYAN_PALETTE_CONFIG: join(root, "missing") })).toThrow(
			/does not exist/,
		);
	});

	it("rejects an SDK without the runtime and a host without execution permission", () => {
		rmSync(join(sdk, "runtime"), { recursive: true });
		expect(() => resolvePaletteRuntime(root, {})).toThrow(/missing the Palette runtime/);
		mkdirSync(join(sdk, "runtime", "scripts"), { recursive: true });
		writeFileSync(join(sdk, "runtime", "scripts", "session_loop.jl"), "");
		chmodSync(host, 0o600);
		expect(() => resolvePaletteRuntime(root, {})).toThrow(/not executable/);
	});

	it("selects only known explicit substrates", () => {
		expect(cyanSubstrate({ CYAN_SUBSTRATE: "palette" })).toBe("palette");
		expect(cyanSubstrate({ CYAN_SUBSTRATE: "ipython" })).toBe("ipython");
		expect(cyanSubstrate({})).toBeUndefined();
		expect(() => cyanSubstrate({ CYAN_SUBSTRATE: "typo" })).toThrow(/unsupported/);
	});
});
