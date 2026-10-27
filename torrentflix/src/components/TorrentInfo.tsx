import { useEffect } from 'react';
import { useTorrentStore } from '../stores/torrent-store';

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return bytesPerSec + ' B/s';
  if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
  return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function TorrentInfo() {
  const stats = useTorrentStore((s) => s.stats);
  const updateStats = useTorrentStore((s) => s.updateStats);

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [updateStats]);

  if (!stats) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 px-4 py-3 text-xs font-mono space-y-1.5 min-w-[200px]">
      <div className="text-white/60 font-sans font-medium text-[11px] uppercase tracking-wider mb-2">
        Torrent Info
      </div>
      <div className="flex justify-between">
        <span className="text-white/40">Progress</span>
        <span className="text-white">{(stats.progress * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/40">Download</span>
        <span className="text-green-400">{formatSpeed(stats.downloadSpeed)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/40">Upload</span>
        <span className="text-blue-400">{formatSpeed(stats.uploadSpeed)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/40">Peers</span>
        <span className="text-white">{stats.numPeers}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/40">Downloaded</span>
        <span className="text-white">{formatSize(stats.downloaded)}</span>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${stats.progress * 100}%` }}
        />
      </div>
    </div>
  );
}
