import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, describe } from "vitest";
import { useState } from "react";
import PasoCrashSelector from "../PasoCrashSelector.jsx";

const options = [
  { id: "crash1", label: "Crash 1", seconds: 70 },
  { id: "crash2", label: "Crash 2", seconds: 90 },
];

const formatTime = (timeInSeconds) => {
  const totalSeconds = Math.max(0, Math.floor(timeInSeconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

function CrashHarness() {
  const [selectedCrash, setSelectedCrash] = useState(null);
  const baseDurationSeconds = 100;
  const crashSeconds =
    selectedCrash != null
      ? options.find((option) => option.id === selectedCrash)?.seconds ?? null
      : null;
  const effectiveSeconds = crashSeconds ?? baseDurationSeconds;

  return (
    <div>
      <PasoCrashSelector
        hasCrashMetadata
        options={options}
        selectedCrash={selectedCrash}
        onChange={setSelectedCrash}
        formatTime={formatTime}
      />
      <p data-testid="effective-duration">{formatTime(effectiveSeconds)}</p>
    </div>
  );
}

describe("PasoCrashSelector", () => {
  it("updates the effective duration when a crash point is selected", () => {
    render(<CrashHarness />);

    expect(screen.getByTestId("effective-duration")).toHaveTextContent("1:40");

    fireEvent.click(screen.getByLabelText(/Crash 1/));
    expect(screen.getByTestId("effective-duration")).toHaveTextContent("1:10");

    fireEvent.click(screen.getByLabelText(/Use duration slider/));
    expect(screen.getByTestId("effective-duration")).toHaveTextContent("1:40");
  });
});
