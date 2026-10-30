import { useEffect, useState } from 'react';
import { useTorrentStore } from '../stores/torrent-store';

export function LoadingScreen() {
  const peerCount = useTorrentStore((s) => s.peerCount);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-surface-600" />
        <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>

      <p className="text-white/60 text-sm">Resolving torrent metadata...</p>
      <p className="text-white/30 text-xs mt-2">Finding peers via WebRTC</p>

      <div className="mt-6 flex items-center gap-4 text-xs text-white/40">
        <span>{peerCount} peer{peerCount !== 1 ? 's' : ''} found</span>
        <span>{elapsed}s elapsed</span>
      </div>

      {elapsed >= 10 && peerCount === 0 && (
        <p className="mt-4 text-yellow-400/70 text-xs text-center max-w-xs">
          No WebRTC peers yet. Most torrents only have regular BitTorrent seeders
          which browsers can't reach. If this times out, you'll get an option
          to open in a torrent app.
        </p>
      )}
    </div>
  );
}
