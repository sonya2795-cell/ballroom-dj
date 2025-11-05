import AudioPlayerContext from "./audioPlayerContext.js";
import useAudioPlayer from "../hooks/useAudioPlayer.js";

export default function AudioPlayerProvider({ children }) {
  const controller = useAudioPlayer();
  return (
    <AudioPlayerContext.Provider value={controller}>
      {children}
    </AudioPlayerContext.Provider>
  );
}
