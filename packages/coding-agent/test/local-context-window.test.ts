import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearLocalContextWindowCache,
	isLocalBaseUrl,
	LOCAL_CONTEXT_WINDOW_FALLBACK,
	probeLocalContextWindow,
} from "../src/core/local-context-window.js";

type Route = { status?: number; body?: unknown; error?: Error };

function jsonResponse(route: Route): Response {
	return new Response(JSON.stringify(route.body ?? {}), {
		status: route.status ?? 200,
		headers: { "content-type": "application/json" },
	});
}

/** A fetch stub keyed by URL. Unknown URLs fail as a refused connection. */
function stubServer(routes: Record<string, Route>) {
	const calls: string[] = [];
	const fetchImpl = vi.fn(async (input: string) => {
		calls.push(input);
		const route = routes[input];
		if (!route) throw new TypeError("fetch failed: ECONNREFUSED");
		if (route.error) throw route.error;
		return jsonResponse(route);
	});
	return { fetchImpl, calls };
}

const ROOT = "http://127.0.0.1:8080";
const BASE = `${ROOT}/v1`;

describe("isLocalBaseUrl", () => {
	it.each([
		["http://localhost:8080/v1", true],
		["http://127.0.0.1:8080/v1", true],
		["http://127.5.1.9:1234", true],
		["http://[::1]:8080/v1", true],
		["http://192.168.1.20:8080/v1", true],
		["http://10.0.0.5:8080/v1", true],
		["http://172.16.0.1:8080/v1", true],
		["http://172.31.255.1:8080/v1", true],
		["http://172.32.0.1:8080/v1", false],
		["https://openrouter.ai/api/v1", false],
		["https://api.example.com", false],
		["not a url", false],
		[undefined, false],
	])("isLocalBaseUrl(%s) => %s", (url, expected) => {
		expect(isLocalBaseUrl(url)).toBe(expected);
	});
});

describe("probeLocalContextWindow", () => {
	beforeEach(() => {
		clearLocalContextWindowCache();
	});

	it("reads default_generation_settings.n_ctx from /props, stripping the /v1 suffix", async () => {
		const { fetchImpl, calls } = stubServer({
			[`${ROOT}/props`]: { body: { default_generation_settings: { n_ctx: 32768 } } },
		});

		const result = await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl });

		expect(result).toEqual({ contextWindow: 32768, source: "llama-server /props" });
		expect(calls).toEqual([`${ROOT}/props`]);
	});

	it("falls back to /v1/models when /props reports n_ctx 0 (router mode)", async () => {
		const { fetchImpl, calls } = stubServer({
			[`${ROOT}/props`]: { body: { default_generation_settings: { n_ctx: 0 } } },
			[`${ROOT}/v1/models`]: {
				body: {
					object: "list",
					data: [
						{ id: "other", meta: { n_ctx: 4096 } },
						{ id: "qwen", meta: { n_ctx: 16384 } },
					],
				},
			},
		});

		const result = await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl });

		expect(result).toEqual({ contextWindow: 16384, source: "llama-server /v1/models" });
		expect(calls).toEqual([`${ROOT}/props`, `${ROOT}/v1/models`]);
	});

	it("uses the single /v1/models entry when its id does not match", async () => {
		const { fetchImpl } = stubServer({
			[`${ROOT}/props`]: { status: 404, body: {} },
			[`${ROOT}/v1/models`]: { body: { data: [{ id: "renamed-alias", meta: { n_ctx: 8192 } }] } },
		});

		const result = await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl });

		expect(result).toEqual({ contextWindow: 8192, source: "llama-server /v1/models" });
	});

	it("fails with both causes when neither endpoint answers", async () => {
		const { fetchImpl } = stubServer({});

		const result = await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl });

		expect(result).toEqual({
			error: "/props: fetch failed: ECONNREFUSED; /v1/models: fetch failed: ECONNREFUSED",
		});
	});

	it("fails on a non-OK status and on a body with no context field", async () => {
		const { fetchImpl } = stubServer({
			[`${ROOT}/props`]: { status: 500, body: {} },
			[`${ROOT}/v1/models`]: { body: { data: [{ id: "qwen" }] } },
		});

		const result = await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl });

		expect(result).toEqual({
			error: "/props: HTTP 500; /v1/models has no data[].meta.n_ctx for this model",
		});
	});

	it("rejects non-integer and non-positive context values", async () => {
		const { fetchImpl } = stubServer({
			[`${ROOT}/props`]: { body: { default_generation_settings: { n_ctx: -1 } } },
			[`${ROOT}/v1/models`]: { body: { data: [{ id: "qwen", meta: { n_ctx: 1.5 } }] } },
		});

		const result = await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl });

		expect("error" in result).toBe(true);
	});

	it("times out instead of hanging on an unresponsive server", async () => {
		const fetchImpl = vi.fn(
			(_input: string, init?: { signal?: AbortSignal }) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						const error = new Error("aborted");
						error.name = "AbortError";
						reject(error);
					});
				}),
		);

		const result = await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl, timeoutMs: 20 });

		expect(result).toEqual({ error: "/props: timed out; /v1/models: timed out" });
	});

	it("caches a success per server and model, so a second probe does not fetch", async () => {
		const { fetchImpl } = stubServer({
			[`${ROOT}/props`]: { body: { default_generation_settings: { n_ctx: 65536 } } },
		});

		await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl });
		const second = await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl });

		expect(second).toEqual({ contextWindow: 65536, source: "llama-server /props" });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it("does not cache a failure, so a server that starts later is found", async () => {
		const routes: Record<string, Route> = {};
		const { fetchImpl } = stubServer(routes);

		expect("error" in (await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl }))).toBe(
			true,
		);

		routes[`${ROOT}/props`] = { body: { default_generation_settings: { n_ctx: 4096 } } };
		const retry = await probeLocalContextWindow({ baseUrl: BASE, modelId: "qwen", fetch: fetchImpl });

		expect(retry).toEqual({ contextWindow: 4096, source: "llama-server /props" });
	});

	it("keeps the fallback constant at 8192", () => {
		expect(LOCAL_CONTEXT_WINDOW_FALLBACK).toBe(8192);
	});
});
