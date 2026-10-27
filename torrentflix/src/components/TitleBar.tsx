import { useTorrentStore } from '../stores/torrent-store';

export function TitleBar() {
  const view = useTorrentStore((s) => s.view);
  const goHome = useTorrentStore((s) => s.goHome);
  const torrentInfo = useTorrentStore((s) => s.torrentInfo);

  return (
    <div
      className="h-10 bg-surface-800 border-b border-surface-600 flex items-center justify-between px-4 shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {view !== 'home' && (
          <button
            onClick={goHome}
            className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <span className="text-accent font-bold text-sm tracking-wide">TorrentFlix</span>
        {torrentInfo && view !== 'home' && (
          <span className="text-white/40 text-xs truncate max-w-[300px]">{torrentInfo.name}</span>
        )}
      </div>

      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => window.torrentflix?.windowMinimize()}
          className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-surface-600 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect y="11" width="24" height="2" />
          </svg>
        </button>
        <button
          onClick={() => window.torrentflix?.windowMaximize()}
          className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-surface-600 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
          </svg>
        </button>
        <button
          onClick={() => window.torrentflix?.windowClose()}
          className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500/80 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
