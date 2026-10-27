import { useRef, useState, useEffect, useCallback } from 'react';
import { useTorrentStore } from '../stores/torrent-store';
import { renderFileToElement } from '../lib/torrent-client';
import { TorrentInfoOverlay } from './TorrentInfo';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Player() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const torrentMeta = useTorrentStore((s) => s.torrentMeta);
  const selectedFile = useTorrentStore((s) => s.selectedFile);
  const goHome = useTorrentStore((s) => s.goHome);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const hideRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!videoRef.current || !torrentMeta || !selectedFile) return;
    setBuffering(true);
    renderFileToElement(torrentMeta.infoHash, selectedFile.index, videoRef.current);
  }, [torrentMeta, selectedFile]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const v = videoRef.current;
    const c = containerRef.current;
    if (!v || !c) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (c.requestFullscreen) {
      c.requestFullscreen();
    } else if ((v as any).webkitEnterFullscreen) {
      // iOS Safari fallback — fullscreen the video element directly
      (v as any).webkitEnterFullscreen();
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) { videoRef.current.volume = vol; videoRef.current.muted = vol === 0; }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => { if (playing) setShowControls(false); }, 3000);
  };

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'ArrowLeft': e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); break;
        case 'ArrowRight': e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 10); break;
        case 'ArrowUp': e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); setVolume(v.volume); break;
        case 'ArrowDown': e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); setVolume(v.volume); break;
        case 'm': e.preventDefault(); v.muted = !v.muted; setMuted(v.muted); break;
        case 'i': e.preventDefault(); setShowInfo((p) => !p); break;
        case 'Escape': if (!document.fullscreenElement) goHome(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [playing, togglePlay, toggleFullscreen, goHome]);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keep screen awake while playing
  useEffect(() => {
    let wakeLock: any = null;
    if (playing && 'wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((wl: any) => { wakeLock = wl; }).catch(() => {});
    }
    return () => { wakeLock?.release(); };
  }, [playing]);

  return (
    <div
      ref={containerRef}
      className="relative h-full bg-black flex items-center justify-center"
      style={{ cursor: showControls ? 'default' : 'none' }}
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        webkit-playsinline=""
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => { setPlaying(true); setBuffering(false); }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
      />

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      )}

      {showInfo && <TorrentInfoOverlay />}

      {/* Back button */}
      <button
        onClick={goHome}
        className={`absolute top-4 left-4 text-white/80 bg-black/50 active:bg-black/70 rounded-lg px-3 py-2.5 text-sm flex items-center gap-1 transition-all ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Bottom controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="text-white/60 text-xs mb-2 truncate">{selectedFile?.name}</div>

        {/* Seek bar — taller touch target on mobile */}
        <div className="mb-2 py-1">
          <input
            type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek} step="any"
            className="w-full h-1.5 sm:h-1 bg-white/20 rounded-full appearance-none cursor-pointer touch-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 sm:[&::-webkit-slider-thumb]:w-3 sm:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
            style={{ background: `linear-gradient(to right, #6d5dfc ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) 0%)` }}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Play/Pause — larger touch target */}
          <button onClick={togglePlay} className="text-white active:text-accent transition-colors p-1">
            {playing ? (
              <svg className="w-7 h-7 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
            ) : (
              <svg className="w-7 h-7 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          {/* Time */}
          <span className="text-white/60 text-xs font-mono tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume — hidden on mobile (use hardware buttons) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => { if (videoRef.current) { videoRef.current.muted = !videoRef.current.muted; setMuted(!muted); } }}
              className="text-white/60 hover:text-white transition-colors"
            >
              {muted || volume === 0 ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={handleVolume}
              className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          {/* Info toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`text-xs px-2 py-1.5 rounded transition-colors ${showInfo ? 'text-accent bg-accent/10' : 'text-white/40 active:text-white/60'}`}
          >
            INFO
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white/60 active:text-white transition-colors p-1">
            {fullscreen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m7 1l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m7-1l5 5m0 0v-4m0 4h-4" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Big centered play button when paused */}
      {!playing && !buffering && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-20 h-20 rounded-full bg-accent/80 flex items-center justify-center active:bg-accent transition-colors">
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}
    </div>
  );
}
