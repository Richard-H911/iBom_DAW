import React, { useRef, useState, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/plugins/regions";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const ItemType = {
  TRACK: "TRACK",
};

export default function SimpleDAW() {
  const MAX_TRACKS = 12;
  const GROUPS = ["Group A", "Group B"];
  const [tracks, setTracks] = useState(
    Array.from({ length: MAX_TRACKS }, (_, index) => ({
      id: index,
      file: null,
      fileName: `Track ${index + 1}`,
      volume: 1,
      group: index < MAX_TRACKS / 2 ? "Group A" : "Group B",
    }))
  );

  const addTrack = (file) => {
    setTracks((prev) => {
      const nextEmptyIndex = prev.findIndex((t) => t.file === null);
      if (nextEmptyIndex === -1) return prev;
      const updated = [...prev];
      updated[nextEmptyIndex] = {
        ...updated[nextEmptyIndex],
        file,
        fileName: file.name,
      };
      return updated;
    });
  };

  const toggleGroupPlayback = (groupName, play) => {
    const groupWavesurfers = window.waveRefs?.[groupName] || [];
    groupWavesurfers.forEach((ws) => {
      if (play) ws.play();
      else ws.pause();
    });
  };

  const moveTrack = (dragIndex, hoverIndex, group) => {
    setTracks((prev) => {
      const grouped = prev.filter((t) => t.group === group);
      const others = prev.filter((t) => t.group !== group);
      const copied = [...grouped];
      const [moved] = copied.splice(dragIndex, 1);
      copied.splice(hoverIndex, 0, moved);
      const updated = [...others, ...copied];
      return updated;
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          padding: "20px",
          backgroundColor: "#0f0f1b",
          minHeight: "100vh",
          color: "#e0e0ff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", color: "#bb86fc", textShadow: "0 0 10px #bb86fc" }}>
          🎵 DAW 工具
        </h1>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => addTrack(e.target.files[0])}
          style={{
            margin: "10px 0",
            backgroundColor: "#1f1f2e",
            color: "#fff",
            border: "1px solid #444",
            padding: "5px 10px",
          }}
        />
        {GROUPS.map((group) => {
          const groupTracks = tracks.filter((t) => t.group === group);
          return (
            <div key={group} style={{ width: "100%", maxWidth: 960 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ color: "#888", marginTop: "30px" }}>{group}</h2>
                <div>
                  <button
                    onClick={() => toggleGroupPlayback(group, true)}
                    style={{ marginRight: 10, padding: "5px 10px" }}
                  >
                    ▶ 播放 {group}
                  </button>
                  <button
                    onClick={() => toggleGroupPlayback(group, false)}
                    style={{ padding: "5px 10px" }}
                  >
                    ⏸ 暫停 {group}
                  </button>
                </div>
              </div>
              {groupTracks.map((track, i) => (
                <DraggableTrackPlayer
                  key={track.id}
                  track={track}
                  index={i}
                  group={group}
                  moveTrack={moveTrack}
                />
              ))}
            </div>
          );
        })}
      </div>
    </DndProvider>
  );
}

function DraggableTrackPlayer({ track, index, group, moveTrack }) {
  const ref = useRef(null);
  const [, drop] = useDrop({
    accept: ItemType.TRACK,
    hover(item) {
      if (item.index === index) return;
      moveTrack(item.index, index, group);
      item.index = index;
    },
  });
  const [, drag] = useDrag({
    type: ItemType.TRACK,
    item: { index },
  });

  drag(drop(ref));

  return (
    <div ref={ref}>
      <TrackPlayer track={track} index={index} group={group} />
    </div>
  );
}

function TrackPlayer({ track, index, group }) {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [region, setRegion] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(track.volume);
  const [isClippingMode, setIsClippingMode] = useState(false);
  const regionRef = useRef(null);

  useEffect(() => {
    if (!track.file) return;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#666",
      progressColor: "#bb86fc",
      height: 100,
      cursorColor: "#fff",
      plugins: [RegionsPlugin.create({})],
    });
    ws.loadBlob(track.file);
    ws.setVolume(volume);
    ws.on("ready", () => setDuration(ws.getDuration().toFixed(2)));
    ws.on("audioprocess", () => setCurrentTime(ws.getCurrentTime().toFixed(2)));
    ws.on("region-created", (r) => {
      setRegion(r);
      regionRef.current = r;
    });
    ws.on("region-updated", (r) => {
      setRegion(r);
      regionRef.current = r;
    });
    wavesurferRef.current = ws;
    window.waveRefs = window.waveRefs || {};
    window.waveRefs[group] = window.waveRefs[group] || [];
    window.waveRefs[group].push(ws);
    return () => {
      ws.destroy();
      window.waveRefs[group] = (window.waveRefs[group] || []).filter((w) => w !== ws);
    };
  }, [track.file]);

  const handlePlayPause = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
    setIsPlaying(wavesurferRef.current.isPlaying());
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    wavesurferRef.current?.setVolume(newVolume);
  };

  const handleClipToggle = () => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    if (!isClippingMode) {
      const regions = ws?.regions;
      if (regions?.list) Object.values(regions.list).forEach((r) => r.remove());
      const duration = ws.getDuration();
      if (ws.regions) {
        const newRegion = ws.regions.add({
          start: 0,
          end: duration * 0.5,
          color: "rgba(187, 134, 252, 0.3)",
          drag: true,
          resize: true,
        });
        setRegion(newRegion);
        regionRef.current = newRegion;
      }
    } else {
      const region = regionRef.current;
      if (!ws.backend || !ws.backend.buffer || !region) return;
      const sampleRate = ws.backend.buffer.sampleRate;
      const channels = ws.backend.buffer.numberOfChannels;
      const originalBuffer = ws.backend.buffer;
      const startOffset = Math.floor(region.start * sampleRate);
      const endOffset = Math.floor(region.end * sampleRate);
      const newLength = endOffset - startOffset;
      const clippedBuffer = ws.backend.ac.createBuffer(channels, newLength, sampleRate);
      for (let ch = 0; ch < channels; ch++) {
        const oldData = originalBuffer.getChannelData(ch);
        const newData = clippedBuffer.getChannelData(ch);
        for (let i = 0; i < newLength; i++) {
          newData[i] = oldData[i + startOffset];
        }
      }
      ws.clearRegions();
      ws.loadDecodedBuffer(clippedBuffer);
    }
    setIsClippingMode(!isClippingMode);
  };

  return (
    <div
      style={{
        marginBottom: "30px",
        padding: "15px",
        backgroundColor: "#1b1b2a",
        borderRadius: "10px",
        boxShadow: "0 0 15px rgba(187, 134, 252, 0.2)",
        maxWidth: "900px",
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "80px",
          textAlign: "center",
          fontWeight: "bold",
          paddingRight: "10px",
          color: isPlaying ? "#03dac6" : "#888",
        }}
      >
        Track {index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#bb86fc" }}>
          {track.file && track.fileName}
        </div>
        <div ref={waveformRef} style={{ width: "100%" }} />
        {track.file && (
          <div style={{ marginTop: "5px" }}>
            <button
              onClick={handlePlayPause}
              style={{
                backgroundColor: "#bb86fc",
                color: "#0f0f1b",
                padding: "5px 10px",
                border: "none",
                borderRadius: "4px",
              }}
            >
              {isPlaying ? "暫停" : "播放"}
            </button>
            <label style={{ marginLeft: "10px", color: "#ccc" }}>
              音量：
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                style={{ marginLeft: "5px" }}
              />
            </label>
            <span style={{ marginLeft: "15px", color: "#aaa" }}>
              時間：{currentTime} / {duration}s
            </span>
            <button
              style={{
                marginLeft: "15px",
                backgroundColor: isClippingMode ? "#03dac6" : "#333",
                color: "#fff",
                border: "1px solid #555",
                padding: "5px 10px",
                borderRadius: "4px",
              }}
              onClick={handleClipToggle}
            >
              {isClippingMode ? "✅ 確認剪輯" : "✂ 選擇剪輯區域"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
