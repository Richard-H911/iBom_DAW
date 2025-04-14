// import React, { useRef, useEffect, useState } from "react";
// import WaveSurfer from "wavesurfer.js";

// export default function SimpleDAW() {
//   const waveformRef = useRef(null);
//   const wavesurfer = useRef(null);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [audioFile, setAudioFile] = useState(null);

//   useEffect(() => {
//     if (waveformRef.current && !wavesurfer.current) {
//       wavesurfer.current = WaveSurfer.create({
//         container: waveformRef.current,
//         waveColor: "#ccc",
//         progressColor: "#4f46e5",
//         height: 100,
//       });
//     }
//   }, []);

//   useEffect(() => {
//     if (audioFile && wavesurfer.current) {
//       wavesurfer.current.loadBlob(audioFile);
//     }
//   }, [audioFile]);

//   const togglePlay = () => {
//     if (wavesurfer.current) {
//       wavesurfer.current.playPause();
//       setIsPlaying(!isPlaying);
//     }
//   };

//   return (
//     <div style={{ padding: "20px" }}>
//       <h1>Test DAW </h1>
//       <input
//         type="file"
//         accept="audio/*"
//         onChange={(e) => setAudioFile(e.target.files[0])}
//       />
//       <div ref={waveformRef} style={{ border: "1px solid #ccc", margin: "10px 0" }} />
//       <button onClick={togglePlay}>
//         {isPlaying ? "暫停" : "播放"}
//       </button>
//     </div>
//   );
// }

import React, { useRef, useState, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";

export default function SimpleDAW() {
  const [tracks, setTracks] = useState([]);

  const addTrack = (file) => {
    const id = Date.now();
    setTracks((prev) => [
      ...prev,
      {
        id,
        file,
        fileName: file.name,
        volume: 1,
        isPlaying: false,
      },
    ]);
  };

  const toggleAllTracks = () => {
    setTracks((prevTracks) =>
      prevTracks.map((track) => {
        track.wavesurfer?.isPlaying()
          ? track.wavesurfer.pause()
          : track.wavesurfer.play();
        return { ...track, isPlaying: !track.isPlaying };
      })
    );
  };

  const updateTrackVolume = (id, volume) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id === id) {
          track.wavesurfer?.setVolume(volume);
          return { ...track, volume };
        }
        return track;
      })
    );
  };

  const toggleTrackPlay = (id) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id === id) {
          track.wavesurfer?.playPause();
          return { ...track, isPlaying: !track.isPlaying };
        }
        return track;
      })
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>簡易多軌 DAW 工具</h1>
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => addTrack(e.target.files[0])}
      />
      <div style={{ margin: "20px 0" }}>
        <button onClick={toggleAllTracks}>播放/暫停 所有音軌</button>
      </div>
      {tracks.map((track) => (
        <TrackPlayer
          key={track.id}
          track={track}
          onPlayPause={() => toggleTrackPlay(track.id)}
          onVolumeChange={(v) => updateTrackVolume(track.id, v)}
        />
      ))}
    </div>
  );
}

function TrackPlayer({ track, onPlayPause, onVolumeChange }) {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);

  useEffect(() => {
    if (!track.file) return;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#ccc",
      progressColor: "#4f46e5",
      height: 80,
    });

    ws.loadBlob(track.file);
    ws.setVolume(track.volume);
    wavesurferRef.current = ws;

    // Attach to track object
    track.wavesurfer = ws;

    return () => {
      ws.destroy();
    };
  }, [track.file]);

  return (
    <div style={{ marginBottom: "30px" }}>
      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{track.fileName}</div>
      <div ref={waveformRef} />
      <div style={{ marginTop: "5px" }}>
        <button onClick={onPlayPause}>{track.isPlaying ? "暫停" : "播放"}</button>
        <label style={{ marginLeft: "10px" }}>
          音量：
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{ marginLeft: "5px" }}
          />
        </label>
      </div>
    </div>
  );
}
