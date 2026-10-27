import { useState } from 'react';
import { useTorrentStore } from '../stores/torrent-store';

export function MagnetInput() {
  const [input, setInput] = useState('');
  const addMagnet = useTorrentStore((s) => s.addMagnet);
  const error = useTorrentStore((s) => s.error);
  const history = useTorrentStore((s) => s.history);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed.startsWith('magnet:')) {
      addMagnet(trimmed);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').trim();
    if (text.startsWith('magnet:')) {
      e.preventDefault();
      setInput(text);
      addMagnet(text);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain').trim();
    if (text.startsWith('magnet:')) {
      setInput(text);
      addMagnet(text);
    }
  };

  const isValid = input.trim().startsWith('magnet:');

  return (
    <div
      className="flex flex-col items-center justify-start sm:justify-center h-full px-4 pt-8 sm:pt-0 overflow-auto"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="w-full max-w-2xl">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 mb-4">
            <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">TorrentFlix</h1>
          <p className="text-white/50 text-sm">Paste a magnet link to start streaming in your browser</p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            placeholder="magnet:?xt=urn:btih:..."
            className="w-full bg-surface-700 border border-surface-600 rounded-xl px-4 py-4 text-white placeholder-white/25 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all text-sm font-mono"
            autoFocus
          />
          <button
            type="submit"
            disabled={!isValid}
            className="w-full sm:w-auto sm:float-right bg-accent hover:bg-accent-hover disabled:bg-surface-600 disabled:text-white/20 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors active:scale-95"
          >
            Play
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <p className="text-center text-white/20 text-xs mt-4">
          or drag &amp; drop a magnet link here
        </p>

        {/* Browser compatibility note */}
        <div className="mt-6 bg-surface-700/50 border border-surface-600/50 rounded-lg px-4 py-3 text-white/30 text-xs text-center">
          Streams via WebRTC — works best with torrents that have WebTorrent-compatible seeders.
          <br />MP4 and WebM play natively. MKV support varies by browser.
        </div>

        {/* Recent history */}
        {history.length > 0 && (
          <div className="mt-10">
            <h3 className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">Recent</h3>
            <div className="space-y-1">
              {history.slice(0, 8).map((item, i) => (
                <button
                  key={i}
                  onClick={() => addMagnet(item.magnetURI)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-surface-700 transition-colors group"
                >
                  <div className="text-white/70 group-hover:text-white text-sm truncate">{item.name}</div>
                  <div className="text-white/20 text-xs mt-0.5">{new Date(item.timestamp).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
