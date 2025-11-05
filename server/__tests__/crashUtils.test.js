const test = require("node:test");
const assert = require("node:assert");

const {
  parseTimeValueToMilliseconds,
  extractCrashMetadata,
  buildCrashUpdateFromPayload,
} = require("../crashUtils");

test("parseTimeValueToMilliseconds handles seconds and timestamps", () => {
  assert.strictEqual(parseTimeValueToMilliseconds(45000), 45000);
  assert.strictEqual(parseTimeValueToMilliseconds("90"), 90000);
  assert.strictEqual(parseTimeValueToMilliseconds("1:15"), 75000);
  assert.strictEqual(parseTimeValueToMilliseconds("2m 5s"), null);
});

test("extractCrashMetadata pulls aliases and nested maps", () => {
  const payload = {
    firstCrash: "1:10",
    metadata: {
      "2nd crash": "95",
    },
    customMetadata: new Map([
      ["ThirdCrashMs", 123000],
    ]),
  };

  const metadata = extractCrashMetadata(payload);
  assert.strictEqual(metadata.crash1Ms, 70000);
  assert.strictEqual(metadata.crash2Ms, 95000);
  assert.strictEqual(metadata.crash3Ms, 123000);
});

test("buildCrashUpdateFromPayload normalizes inputs and rejects invalid values", () => {
  const validPayload = {
    crash1: "70",
    crash2Ms: 85000,
    crash3Seconds: "100.5",
  };

  const { hasUpdate, crashData, error } = buildCrashUpdateFromPayload(validPayload);
  assert.strictEqual(hasUpdate, true);
  assert.strictEqual(error, null);
  assert.strictEqual(crashData.crash1Ms, 70000);
  assert.strictEqual(crashData.crash2Ms, 85000);
  assert.strictEqual(crashData.crash3Ms, 100500);

  const invalidPayload = { crash1: "abc" };
  const invalidResult = buildCrashUpdateFromPayload(invalidPayload);
  assert.strictEqual(invalidResult.error.includes("Invalid value for crash1"), true);
});
