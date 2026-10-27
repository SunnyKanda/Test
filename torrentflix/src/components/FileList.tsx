import { useTorrentStore } from '../stores/torrent-store';

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function FileList() {
  const torrentMeta = useTorrentStore((s) => s.torrentMeta);
  const selectFile = useTorrentStore((s) => s.selectFile);

  if (!torrentMeta) return null;

  const videoFiles = torrentMeta.files.filter((f) => f.type === 'video');
  const otherFiles = torrentMeta.files.filter((f) => f.type !== 'video');

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="w-full max-w-2xl">
        <h2 className="text-white text-xl font-semibold mb-1">Select a file to play</h2>
        <p className="text-white/40 text-sm mb-6">{torrentMeta.name}</p>

        <div className="space-y-2">
          {videoFiles.map((file) => (
            <button
              key={file.index}
              onClick={() => selectFile(file)}
              className="w-full text-left bg-surface-700 hover:bg-surface-600 border border-surface-600 hover:border-accent/30 rounded-xl px-5 py-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-accent shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <div className="text-white group-hover:text-accent text-sm truncate transition-colors">
                    {file.name}
                  </div>
                  <div className="text-white/30 text-xs mt-0.5">{formatSize(file.length)}</div>
                </div>
                <svg className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {otherFiles.length > 0 && (
          <details className="mt-6">
            <summary className="text-white/30 text-xs cursor-pointer hover:text-white/50 transition-colors">
              {otherFiles.length} other file{otherFiles.length > 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-1">
              {otherFiles.map((file) => (
                <div key={file.index} className="flex items-center gap-3 px-4 py-2 text-white/30 text-xs">
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 ml-auto">{formatSize(file.length)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
