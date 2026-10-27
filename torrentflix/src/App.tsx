import { useTorrentStore } from './stores/torrent-store';
import { MagnetInput } from './components/MagnetInput';
import { LoadingScreen } from './components/LoadingScreen';
import { FileList } from './components/FileList';
import { Player } from './components/Player';

export default function App() {
  const view = useTorrentStore((s) => s.view);

  return (
    <div className="h-screen flex flex-col bg-surface-900 overflow-hidden">
      {/* Nav bar */}
      {view !== 'player' && (
        <Header />
      )}
      <main className="flex-1 overflow-auto">
        {view === 'home' && <MagnetInput />}
        {view === 'loading' && <LoadingScreen />}
        {view === 'file-select' && <FileList />}
        {view === 'player' && <Player />}
      </main>
    </div>
  );
}

function Header() {
  const view = useTorrentStore((s) => s.view);
  const goHome = useTorrentStore((s) => s.goHome);
  const torrentMeta = useTorrentStore((s) => s.torrentMeta);

  return (
    <header className="h-12 bg-surface-800 border-b border-surface-600 flex items-center px-5 shrink-0">
      <div className="flex items-center gap-3">
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
        {torrentMeta && view !== 'home' && (
          <span className="text-white/40 text-xs truncate max-w-[400px]">{torrentMeta.name}</span>
        )}
      </div>
    </header>
  );
}
