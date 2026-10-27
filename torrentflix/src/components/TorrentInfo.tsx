import { useEffect } from 'react';
import { useTorrentStore } from '../stores/torrent-store';

function formatSpeed(bps: number): string {
  if (bps < 1024) return bps + ' B/s';
  if (bps < 1024 * 1024) return (bps / 1024).toFixed(1) + ' KB/s';
  return (bps / (1024 * 1024)).toFixed(1) + ' MB/s';
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function TorrentInfoOverlay() {
  const stats = useTorrentStore((s) => s.stats);
  const updateStats = useTorrentStore((s) => s.updateStats);

  useEffect(() => {
    updateStats();
    const id = setInterval(updateStats, 1000);
    return () => clearInterval(id);
  }, [updateStats]);

  if (!stats) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 px-4 py-3 text-xs font-mono space-y-1.5 min-w-[200px] pointer-events-none">
      <div className="text-white/60 font-sans font-medium text-[11px] uppercase tracking-wider mb-2">Torrent Info</div>
      <Row label="Progress" value={`${(stats.progress * 100).toFixed(1)}%`} />
      <Row label="Download" value={formatSpeed(stats.downloadSpeed)} className="text-green-400" />
      <Row label="Upload" value={formatSpeed(stats.uploadSpeed)} className="text-blue-400" />
      <Row label="Peers" value={String(stats.numPeers)} />
      <Row label="Downloaded" value={formatSize(stats.downloaded)} />
      <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${stats.progress * 100}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value, className = 'text-white' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/40">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
