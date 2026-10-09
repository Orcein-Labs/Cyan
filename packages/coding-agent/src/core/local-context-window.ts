/**
 * Context-window discovery for OpenAI-compatible servers running on the local
 * machine or the LAN (llama-server, Ollama, LM Studio, vLLM).
 *
 * Without a configured `contextWindow`, a local model used to get a silent
 * 128k default. A server with a smaller window then rejected requests before
 * compaction could fire. This module asks llama-server for its real per-request
 * window and provides the fallback used when it cannot.
 */

/**
 * Used when a local model has no configured `contextWindow` and the server
 * cannot report one. 8192 is the smallest window that still fits a system
 * prompt, tool schemas, and a few turns for a Cyan session. Too small is the
 * cheap failure: compaction runs early. Too large is the expensive one: the
 * server rejects the request and the session stops. Ollama's historical 4096
 * default is below this, so a 4k Ollama model needs an explicit `contextWindow`.
 */
export const LOCAL_CONTEXT_WINDOW_FALLBACK = 8192;

/** Sent as the bearer token for keyless local providers. llama-server ignores it unless started with --api-key. */
export const LOCAL_KEYLESS_API_KEY = "local";

const PROBE_TIMEOUT_MS = 2000;

export type LocalContextWindowSource = "llama-server /props" | "llama-server /v1/models";

export interface LocalContextWindowResult {
	contextWindow: number;
	source: LocalContextWindowSource;
}

export interface LocalContextWindowFailure {
	error: string;
}

export type LocalContextWindowProbe = LocalContextWindowResult | LocalContextWindowFailure;

type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<Response>;

const successfulProbes = new Map<string, LocalContextWindowResult>();

/**
 * True when the URL points at this machine or a private (RFC 1918) IPv4 network.
 * Only these hosts are probed and treated as keyless-capable.
 */
export function isLocalBaseUrl(baseUrl: string | undefined): boolean {
	if (!baseUrl) return false;
	let hostname: string;
	try {
		hostname = new URL(baseUrl).hostname.toLowerCase();
	} catch {
		return false;
	}
	if (hostname === "localhost" || hostname === "[::1]") return true;
	const ipv4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(hostname);
	if (!ipv4) return false;
	const first = Number(ipv4[1]);
	const second = Number(ipv4[2]);
	return (
		first === 127 ||
		first === 10 ||
		(first === 192 && second === 168) ||
		(first === 172 && second >= 16 && second <= 31)
	);
}

/** The server root that hosts /props and /v1/models, with any trailing /v1 removed. */
function serverRoot(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");
}

function positiveInteger(value: unknown): number | undefined {
	return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

async function getJson(url: string, fetchImpl: FetchLike, timeoutMs: number): Promise<unknown> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetchImpl(url, { signal: controller.signal });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.json();
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Read the per-request context window from a llama-server.
 *
 * `/props` is tried first. Its `default_generation_settings.n_ctx` is the slot
 * size (`meta->slot_n_ctx` in tools/server/server-context.cpp), which is the
 * real limit for one request. With --parallel N, the slot is the total window
 * divided by N. Router-mode servers report 0 there, so `/v1/models` is tried
 * next, reading `data[].meta.n_ctx` from the entry matching the model id.
 *
 * Results are cached per server root and model id. Failures are not cached, so
 * a server that starts later is picked up on the next attempt.
 */
export async function probeLocalContextWindow(options: {
	baseUrl: string;
	modelId: string;
	fetch?: FetchLike;
	timeoutMs?: number;
}): Promise<LocalContextWindowProbe> {
	const root = serverRoot(options.baseUrl);
	const cacheKey = `${root}\0${options.modelId}`;
	const cached = successfulProbes.get(cacheKey);
	if (cached) return cached;

	const fetchImpl: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
	const timeoutMs = options.timeoutMs ?? PROBE_TIMEOUT_MS;
	const failures: string[] = [];

	try {
		const props = (await getJson(`${root}/props`, fetchImpl, timeoutMs)) as {
			default_generation_settings?: { n_ctx?: unknown };
		};
		const nCtx = positiveInteger(props?.default_generation_settings?.n_ctx);
		if (nCtx !== undefined) {
			const result: LocalContextWindowResult = { contextWindow: nCtx, source: "llama-server /props" };
			successfulProbes.set(cacheKey, result);
			return result;
		}
		failures.push("/props has no default_generation_settings.n_ctx");
	} catch (error) {
		failures.push(`/props: ${describeError(error)}`);
	}

	try {
		const listing = (await getJson(`${root}/v1/models`, fetchImpl, timeoutMs)) as { data?: unknown };
		const entries = Array.isArray(listing?.data)
			? (listing.data as Array<{ id?: unknown; meta?: { n_ctx?: unknown } }>)
			: [];
		const entry =
			entries.find((item) => item?.id === options.modelId) ?? (entries.length === 1 ? entries[0] : undefined);
		const nCtx = positiveInteger(entry?.meta?.n_ctx);
		if (nCtx !== undefined) {
			const result: LocalContextWindowResult = { contextWindow: nCtx, source: "llama-server /v1/models" };
			successfulProbes.set(cacheKey, result);
			return result;
		}
		failures.push("/v1/models has no data[].meta.n_ctx for this model");
	} catch (error) {
		failures.push(`/v1/models: ${describeError(error)}`);
	}

	return { error: failures.join("; ") };
}

function describeError(error: unknown): string {
	if (error instanceof Error) {
		return error.name === "AbortError" ? "timed out" : error.message;
	}
	return String(error);
}

/** Test hook: forget cached probe results. */
export function clearLocalContextWindowCache(): void {
	successfulProbes.clear();
}
