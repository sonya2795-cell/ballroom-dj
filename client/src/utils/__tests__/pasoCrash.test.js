import { describe, expect, it } from "vitest";
import {
  getCrashSeconds,
  getCrashRelativeDurationSeconds,
  getEarliestAbsoluteCutoff,
  normalizeDanceId,
  PASO_DANCE_ID,
} from "../pasoCrash.js";

const mockSong = {
  danceId: "Paso",
  crash1Ms: 70000,
  crash2Ms: 95000,
};

describe("paso crash helpers", () => {
  it("normalizes different Paso labels to the Paso id", () => {
    expect(normalizeDanceId("Paso")).toBe(PASO_DANCE_ID);
    expect(normalizeDanceId("paso doble")).toBe(PASO_DANCE_ID);
    expect(normalizeDanceId({ dance: "Paso Doble" })).toBe(PASO_DANCE_ID);
    expect(normalizeDanceId("  PaSo_DoBlE  ")).toBe(PASO_DANCE_ID);
  });

  it("converts crash metadata into seconds", () => {
    expect(getCrashSeconds(mockSong, "crash1")).toBe(70);
    expect(getCrashSeconds(mockSong, "crash2")).toBe(95);
    expect(getCrashSeconds(mockSong, "crash3")).toBeNull();
  });

  it("calculates relative crash duration from clip start", () => {
    expect(getCrashRelativeDurationSeconds(mockSong, "crash1", 10)).toBe(60);
    expect(getCrashRelativeDurationSeconds(mockSong, "crash1", 80)).toBe(0);
  });

  it("selects the earliest absolute cutoff when crash precedes duration", () => {
    const cutoff = getEarliestAbsoluteCutoff({
      clipStartSeconds: 5,
      clipEndSeconds: 120,
      durationSeconds: 90,
      crashSeconds: 85,
    });

    expect(cutoff).toBe(85);
  });
});
