import { useTorrentStore } from '../stores/torrent-store';

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

const TYPE_ICONS: Record<string, string> = {
  video: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
  audio: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z',
  subtitle: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
  other: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

export function FileList() {
  const torrentInfo = useTorrentStore((s) => s.torrentInfo);
  const selectFile = useTorrentStore((s) => s.selectFile);

  if (!torrentInfo) return null;

  const videoFiles = torrentInfo.files.filter((f) => f.type === 'video');
  const otherFiles = torrentInfo.files.filter((f) => f.type !== 'video');

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="w-full max-w-2xl">
        <h2 className="text-white text-xl font-semibold mb-1">Select a file to play</h2>
        <p className="text-white/40 text-sm mb-6">{torrentInfo.name}</p>

        {/* Video files */}
        <div className="space-y-2">
          {videoFiles.map((file) => (
            <button
              key={file.index}
              onClick={() => selectFile(file)}
              className="w-full text-left bg-surface-700 hover:bg-surface-600 border border-surface-600 hover:border-accent/30 rounded-xl px-5 py-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TYPE_ICONS.video} />
                </svg>
                <div className="min-w-0 flex-1">
                  <div className="text-white group-hover:text-accent text-sm truncate transition-colors">
                    {file.name}
                  </div>
                  <div className="text-white/30 text-xs mt-0.5">{formatSize(file.length)}</div>
                </div>
                <svg
                  className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Other files (collapsed) */}
        {otherFiles.length > 0 && (
          <details className="mt-6">
            <summary className="text-white/30 text-xs cursor-pointer hover:text-white/50 transition-colors">
              {otherFiles.length} other file{otherFiles.length > 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-1">
              {otherFiles.map((file) => (
                <div
                  key={file.index}
                  className="flex items-center gap-3 px-4 py-2 text-white/30 text-xs"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={TYPE_ICONS[file.type] || TYPE_ICONS.other}
                    />
                  </svg>
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
