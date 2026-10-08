import { afterEach, describe, expect, test } from "vitest";
import { InteractiveMode } from "../../../src/modes/interactive/interactive-mode.js";
import { createHarness, type Harness } from "../harness.js";

describe("Cyan configured-model onboarding regression", () => {
	const harnesses: Harness[] = [];
	afterEach(() => {
		for (const harness of harnesses.splice(0)) harness.cleanup();
	});

	test.each([false, true])(
		"configured local model reaches chat without trace solicitation (traces=%s)",
		async (enabled) => {
			const harness = await createHarness({ withConfiguredAuth: true });
			harnesses.push(harness);
			harness.settingsManager.setAgentTracesEnabled(enabled);
			const mode = Object.create(InteractiveMode.prototype) as {
				uiServices: unknown;
				connectionState: unknown;
				runOnboardingFlow(): Promise<boolean>;
			};
			mode.uiServices = { modelRegistry: harness.session.modelRegistry, settingsManager: harness.settingsManager };
			mode.connectionState = { model: harness.getModel() };
			// No UI or auth flow is installed: asking for login or traces fails here.
			await expect(mode.runOnboardingFlow()).resolves.toBe(true);
			expect(harness.settingsManager.getAgentTracesEnabled()).toBe(enabled);
		},
	);
});
