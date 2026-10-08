import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import { PALETTE_RLM_REQUEST_TYPES, type PaletteToolOptions } from "./palette.js";

interface PaletteRuntimeConfig {
	sdkPath?: string;
	hostBin?: string;
	depotPath?: string;
	juliaBin?: string;
}

function readConfig(path: string): PaletteRuntimeConfig {
	if (!existsSync(path)) return {};
	const value: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`cyan: ${path} must contain a runtime configuration object`);
	}
	const config = value as Record<string, unknown>;
	for (const [key, entry] of Object.entries(config)) {
		if (!["sdkPath", "hostBin", "depotPath", "juliaBin"].includes(key)) {
			throw new Error(`cyan: unknown Palette runtime setting ${key}`);
		}
		if (typeof entry !== "string" || !isAbsolute(entry)) {
			throw new Error(`cyan: Palette runtime setting ${key} must be an absolute path`);
		}
	}
	return config as PaletteRuntimeConfig;
}

function requirePath(path: string | undefined, name: string): string {
	if (!path || !isAbsolute(path)) {
		throw new Error(`cyan: ${name} is not configured as an absolute path; run cyan setup --sdk /path/to/Palette`);
	}
	return path;
}

/** Resolve once at session creation; workers never choose their own runtime or ceiling. */
export function resolvePaletteRuntime(agentDir: string, env: NodeJS.ProcessEnv = process.env): PaletteToolOptions {
	const configPath = env.CYAN_PALETTE_CONFIG ?? join(agentDir, "palette.json");
	if (env.CYAN_PALETTE_CONFIG && !existsSync(configPath)) {
		throw new Error(`cyan: Palette runtime configuration does not exist: ${configPath}`);
	}
	const config = readConfig(configPath);
	const sdkPath = requirePath(env.PALETTE_PROJECT_DIR ?? config.sdkPath, "Palette SDK");
	const projectPath = join(sdkPath, "Project.toml");
	if (!existsSync(projectPath) || !/^name\s*=\s*"Palette"\s*$/m.test(readFileSync(projectPath, "utf8"))) {
		throw new Error(`cyan: ${sdkPath} is not a Palette SDK project`);
	}
	if (!existsSync(join(sdkPath, "runtime", "scripts", "session_loop.jl"))) {
		throw new Error(`cyan: ${sdkPath} is missing the Palette runtime`);
	}
	const hostBin = requirePath(
		env.PALETTE_HOST_BIN ?? config.hostBin ?? join(sdkPath, "runtime", "host", "target", "release", "palette-host"),
		"Palette host",
	);
	try {
		accessSync(hostBin, constants.X_OK);
	} catch {
		throw new Error(`cyan: Palette host is not executable: ${hostBin}; run cyan setup --sdk ${sdkPath}`);
	}
	const depotPath = env.JULIA_DEPOT_PATH ?? config.depotPath;
	// Palette uses the final depot entry for its isolated session clone.
	const selectedDepot = depotPath?.split(delimiter).at(-1);
	if (selectedDepot && !existsSync(selectedDepot))
		throw new Error(`cyan: Julia depot does not exist: ${selectedDepot}`);
	const juliaBin = env.PALETTE_JULIA_BIN ?? config.juliaBin;
	if (juliaBin) accessSync(juliaBin, constants.X_OK);
	return {
		projectDir: sdkPath,
		repoDir: env.PALETTE_REPO_DIR ?? sdkPath,
		hostBin,
		depotPath,
		juliaBin,
		stateRoot: join(agentDir, "palette-state"),
		maxOutputChars: 24_000,
		ceiling: {
			host_request: { allowed_types: [...PALETTE_RLM_REQUEST_TYPES, "goal.get", "goal.create", "goal.complete"] },
		},
	};
}

export function cyanSubstrate(env: NodeJS.ProcessEnv = process.env): "palette" | "ipython" | undefined {
	const value = env.CYAN_SUBSTRATE;
	if (value === undefined) return undefined;
	if (value !== "palette" && value !== "ipython") {
		throw new Error(`cyan: unsupported CYAN_SUBSTRATE=${value}; expected palette or ipython`);
	}
	return value;
}
