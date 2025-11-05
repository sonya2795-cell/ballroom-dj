import { useContext } from "react";
import AudioPlayerContext from "../context/audioPlayerContext.js";

export default function useAudioPlayerContext() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayerContext must be used within an AudioPlayerProvider");
  }
  return context;
}
