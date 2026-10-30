import { useTorrentStore } from '../stores/torrent-store';

export function NoPeersScreen() {
  const magnetURI = useTorrentStore((s) => s.magnetURI);
  const goHome = useTorrentStore((s) => s.goHome);
  const openInApp = useTorrentStore((s) => s.openInApp);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-14 h-14 mb-5 rounded-full bg-yellow-500/10 flex items-center justify-center">
        <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>

      <h2 className="text-white text-lg font-semibold mb-2">No WebRTC Peers Found</h2>

      <p className="text-white/50 text-sm max-w-xs mb-6 leading-relaxed">
        Browsers can only connect to WebRTC peers. This torrent's seeders
        are using regular BitTorrent, which requires a native app.
      </p>

      <button
        onClick={openInApp}
        className="w-full max-w-xs bg-accent text-white font-medium py-3 px-4 rounded-xl
                   active:bg-accent/80 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Open in Torrent App
      </button>

      <p className="text-white/30 text-xs mt-3 max-w-xs">
        Opens the magnet link in Stremio, LibreTorrent, or any installed torrent app
      </p>

      <button
        onClick={() => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(magnetURI);
          }
        }}
        className="mt-4 text-accent/70 text-xs active:text-accent transition-colors underline"
      >
        Copy magnet link
      </button>

      <button
        onClick={goHome}
        className="mt-6 text-white/40 text-sm active:text-white/60 transition-colors"
      >
        Go Back
      </button>
    </div>
  );
}
