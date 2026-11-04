'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import './beam-original.css';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Copy,
  Check,
  Folder,
  Music2,
  Clock,
  Calendar as CalendarIcon,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type Tab = 'music' | 'files' | 'timer' | 'calendar';
type PillState = 'music' | 'files' | 'timer' | 'idle';

export function InteractiveStage() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('music');
  const [pillState, setPillState] = useState<PillState>('music');

  // Music state
  const tracks = [
    { title: 'Pyar Ki Ek Kahani', artist: 'Google Chrome · YouTube Music', duration: 228 },
    { title: 'Naah', artist: 'Karan Aujla · Spotify', duration: 194 },
    { title: 'Allah Maaf Kare', artist: 'Desi Melodies · Spotify', duration: 215 },
  ];
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [trackProgress, setTrackProgress] = useState(48);
  const currentTrack = tracks[trackIndex];

  // Web Audio synth chime
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTone = (freq: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch {
      // AudioContext unavailable
    }
  };

  // Music progress ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTrackProgress((p) => (p >= currentTrack.duration ? 0 : p + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack.duration]);

  // Timer countdown
  const [timerSeconds, setTimerSeconds] = useState(299); // 4:59
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPreset, setTimerPreset] = useState<number | null>(300);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          playTone(880);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Files state
  const initialFiles = [
    { id: '1', name: 'design-tokens.json', size: '4.2 KB' },
    { id: '2', name: 'hero-spec.pdf', size: '1.8 MB' },
    { id: '3', name: 'schema.sql', size: '240 B' },
  ];
  const [files, setFiles] = useState(initialFiles);
  const [lastRemoved, setLastRemoved] = useState<{ id: string; name: string; size: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleCopyRow = (name: string) => {
    navigator.clipboard?.writeText(`C:\\Users\\Beam\\Documents\\${name}`);
    setStatusMsg(`Copied ${name} to clipboard`);
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleCopyAll = () => {
    const paths = files.map((f) => `C:\\Users\\Beam\\Documents\\${f.name}`).join('\n');
    navigator.clipboard?.writeText(paths);
    setStatusMsg(`Copied ${files.length} paths as CF_HDROP clipboard`);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleRemoveRow = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target) {
      setLastRemoved(target);
      setFiles((f) => f.filter((item) => item.id !== id));
      setStatusMsg('File removed');
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleUndo = () => {
    if (lastRemoved) {
      setFiles((prev) => [...prev, lastRemoved]);
      setLastRemoved(null);
      setStatusMsg('Restored');
      setTimeout(() => setStatusMsg(null), 2000);
    }
  };

  // Calendar state
  const [monthOffset, setMonthOffset] = useState(0);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const baseMonth = 10; // November
  const displayMonth = (baseMonth + monthOffset + 1200) % 12;
  const displayYear = 2026 + Math.floor((baseMonth + monthOffset) / 12);

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* State Switcher Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6 p-1.5 bg-surface/90 backdrop-blur border border-k-line rounded-pill shadow-sm">
        <span className="text-[11px] font-medium text-ink-muted px-2.5">Capsule state:</span>
        {(['music', 'files', 'timer', 'idle'] as PillState[]).map((st) => (
          <button
            key={st}
            onClick={() => {
              setPillState(st);
              if (st !== 'idle') {
                setActiveTab(st as Tab);
              }
            }}
            className={`px-3 py-1 rounded-pill text-xs font-medium capitalize transition-all ${
              pillState === st
                ? 'bg-ink text-white shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-fill/70'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Dedicated Interactive Stage Box */}
      <div className="beam-scope w-full max-w-[452px] flex flex-col items-center">
        {/* The Authentic 94px Capsule Pill */}
        <div className="relative mb-4 flex flex-col items-center">
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={`pill expands ${panelOpen ? 'ring-2 ring-[#ffaa00]' : ''}`}
            data-state={pillState}
            title={`Click to ${panelOpen ? 'close' : 'open'} panel`}
          >
            {pillState === 'idle' && (
              <div className="flex items-center gap-2">
                <div className="mascot w-4 h-4">
                  <Image src="/mascot.svg" alt="star" width={16} height={16} />
                </div>
                <span className="text-xs font-medium tracking-tight text-white/90">beam</span>
              </div>
            )}

            {pillState === 'music' && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 bg-[#252527] flex items-center justify-center">
                  <Image src="/mascot.svg" alt="art" width={12} height={12} />
                </div>
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isPlaying ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs font-medium tracking-tight text-white/95 truncate">
                  {currentTrack.title}
                </span>
              </div>
            )}

            {pillState === 'files' && (
              <div className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-folder" />
                <span className="text-xs font-medium tracking-tight text-white/95">
                  {files.length} files
                </span>
              </div>
            )}

            {pillState === 'timer' && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-play" />
                <span className="text-xs font-mono font-medium tracking-tight text-white/95">
                  {formatMinSec(timerSeconds)}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* The Authentic 420x284 Panel */}
        {panelOpen && (
          <div className="panel-window animate-in fade-in zoom-in-95 duration-150">
            {/* Tab Bar */}
            <div className="tab-bar">
              <div className="flex-1 flex gap-1">
                <button
                  onClick={() => {
                    setActiveTab('music');
                    setPillState('music');
                  }}
                  className="tab-item"
                  data-active={activeTab === 'music'}
                >
                  <Music2 className="w-3.5 h-3.5" />
                  <span>Music</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('files');
                    setPillState('files');
                  }}
                  className="tab-item"
                  data-active={activeTab === 'files'}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Files</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('timer');
                    setPillState('timer');
                  }}
                  className="tab-item"
                  data-active={activeTab === 'timer'}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Timer</span>
                </button>

                <button
                  onClick={() => setActiveTab('calendar')}
                  className="tab-item"
                  data-active={activeTab === 'calendar'}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>
              </div>

              <button
                onClick={() => setPanelOpen(false)}
                className="icon-btn ml-1"
                title="Collapse panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="panel-body">
              {/* MUSIC VIEW */}
              {activeTab === 'music' && (
                <div className="music-view">
                  <div className="music-art">
                    <Image
                      src="/mascot.svg"
                      alt="Art"
                      width={80}
                      height={80}
                      className="opacity-95 object-contain"
                    />
                    <div
                      className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                        isPlaying ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  </div>

                  <div className="music-info">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-emerald-400 tracking-wide uppercase">
                        {isPlaying ? 'Playing' : 'Paused'}
                      </span>
                      <h4 className="text-base font-semibold text-white truncate leading-snug">
                        {currentTrack.title}
                      </h4>
                      <p className="text-xs text-[#8a8a8a] truncate mt-0.5">
                        {currentTrack.artist}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => {
                          setTrackIndex((i) => (i === 0 ? tracks.length - 1 : i - 1));
                          setTrackProgress(0);
                        }}
                        className="icon-btn"
                        title="Previous Track"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setIsPlaying(!isPlaying);
                          if (!isPlaying) playTone(600);
                        }}
                        className="icon-btn primary"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setTrackIndex((i) => (i + 1) % tracks.length);
                          setTrackProgress(0);
                        }}
                        className="icon-btn"
                        title="Next Track"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 mt-1">
                      <div className="track-bar">
                        <div
                          className="track-fill"
                          style={{
                            width: `${(trackProgress / currentTrack.duration) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-[#8a8a8a] font-mono">
                        <span>{formatMinSec(trackProgress)}</span>
                        <span>{formatMinSec(currentTrack.duration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FILES VIEW */}
              {activeTab === 'files' && (
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-center justify-between pb-1 text-xs text-[#8a8a8a]">
                    <span>Shelf ({files.length} files)</span>
                    <div className="flex items-center gap-2">
                      {lastRemoved && (
                        <button
                          onClick={handleUndo}
                          className="text-[11px] text-sel font-medium hover:underline"
                        >
                          Undo
                        </button>
                      )}
                      <button
                        onClick={handleCopyAll}
                        className="text-[11px] text-sel font-medium hover:underline"
                      >
                        Copy All
                      </button>
                    </div>
                  </div>

                  {statusMsg && (
                    <div className="text-[11px] text-emerald-400 font-medium py-0.5">
                      {statusMsg}
                    </div>
                  )}

                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                    {files.map((file) => (
                      <div key={file.id} className="file-row">
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className="w-3.5 h-3.5 text-folder shrink-0" />
                          <span className="truncate text-white/90">{file.name}</span>
                          <span className="text-[10px] text-[#8a8a8a] font-mono">
                            {file.size}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyRow(file.name)}
                            className="p-1 rounded text-[#8a8a8a] hover:text-white"
                            title="Copy path"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveRow(file.id)}
                            className="p-1 rounded text-[#8a8a8a] hover:text-white"
                            title="Remove from shelf"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-[#8a8a8a] border-t border-[rgba(255,255,255,0.08)]">
                    <span>Files clear on quit</span>
                    <span>0 MB disk usage</span>
                  </div>
                </div>
              )}

              {/* TIMER VIEW */}
              {activeTab === 'timer' && (
                <div className="flex flex-col h-full items-center justify-center gap-4">
                  <div className="text-4xl font-mono font-bold tracking-tight text-white flex items-center gap-2">
                    <span>{formatMinSec(timerSeconds)}</span>
                    {timerRunning && (
                      <span className="w-2.5 h-2.5 rounded-full bg-play animate-ping" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {[
                      { label: '5m', sec: 300 },
                      { label: '10m', sec: 600 },
                      { label: '25m', sec: 1500 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          setTimerSeconds(p.sec);
                          setTimerPreset(p.sec);
                          setTimerRunning(false);
                        }}
                        className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                          timerPreset === p.sec
                            ? 'bg-[#ffaa00] text-black font-semibold'
                            : 'bg-[#252527] text-white/80 hover:bg-[#303032]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTimerRunning(!timerRunning);
                        playTone(700);
                      }}
                      className={`px-4 py-1.5 rounded-pill text-xs font-medium transition-all ${
                        timerRunning
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-white text-black font-semibold hover:bg-white/90'
                      }`}
                    >
                      {timerRunning ? 'Pause' : 'Start Timer'}
                    </button>

                    <button
                      onClick={() => {
                        setTimerSeconds(300);
                        setTimerRunning(false);
                      }}
                      className="icon-btn"
                      title="Reset"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* CALENDAR VIEW */}
              {activeTab === 'calendar' && (
                <div className="flex flex-col h-full gap-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[rgba(255,255,255,0.08)]">
                    <span className="text-xs font-semibold text-white">
                      {monthNames[displayMonth]} {displayYear}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setMonthOffset((o) => o - 1)}
                        className="p-1 rounded text-[#8a8a8a] hover:text-white"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setMonthOffset(0)}
                        className="px-2 py-0.5 text-[10px] rounded bg-[#252527] text-white/80 hover:text-white"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setMonthOffset((o) => o + 1)}
                        className="p-1 rounded text-[#8a8a8a] hover:text-white"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#8a8a8a] font-medium py-0.5">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs flex-1">
                    {Array.from({ length: 30 }, (_, i) => {
                      const day = i + 1;
                      const isToday = day === 4 && monthOffset === 0;
                      return (
                        <div
                          key={day}
                          className={`h-6 flex items-center justify-center rounded font-mono text-[11px] ${
                            isToday
                              ? 'bg-[#ffaa00] text-black font-bold'
                              : 'text-white/70 hover:bg-white/5'
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
