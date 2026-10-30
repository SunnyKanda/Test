import { useState } from 'react';
import { useTorrentStore } from './stores/torrent-store';
import { Search } from './components/Search';
import { MagnetInput } from './components/MagnetInput';
import { LoadingScreen } from './components/LoadingScreen';
import { NoPeersScreen } from './components/NoPeersScreen';
import { FileList } from './components/FileList';
import { Player } from './components/Player';

type Tab = 'search' | 'magnet';

export default function App() {
  const view = useTorrentStore((s) => s.view);
  const [tab, setTab] = useState<Tab>('search');

  if (view === 'player') return <Player />;

  return (
    <div className="h-screen flex flex-col bg-surface-900 overflow-hidden">
      <Header />

      {view === 'loading' && <LoadingScreen />}
      {view === 'no-peers' && <NoPeersScreen />}
      {view === 'file-select' && <FileList />}

      {view === 'home' && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-surface-600 bg-surface-800 px-4">
            <button
              onClick={() => setTab('search')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === 'search'
                  ? 'text-accent border-accent'
                  : 'text-white/40 border-transparent active:text-white/60'
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setTab('magnet')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === 'magnet'
                  ? 'text-accent border-accent'
                  : 'text-white/40 border-transparent active:text-white/60'
              }`}
            >
              Magnet Link
            </button>
          </div>

          <main className="flex-1 overflow-hidden">
            {tab === 'search' && <Search />}
            {tab === 'magnet' && <MagnetInput />}
          </main>
        </>
      )}
    </div>
  );
}

function Header() {
  const view = useTorrentStore((s) => s.view);
  const goHome = useTorrentStore((s) => s.goHome);
  const torrentMeta = useTorrentStore((s) => s.torrentMeta);

  return (
    <header className="h-12 bg-surface-800 flex items-center px-4 shrink-0">
      <div className="flex items-center gap-3">
        {view !== 'home' && (
          <button
            onClick={goHome}
            className="text-white/60 active:text-white transition-colors text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-accent font-bold text-sm tracking-wide">TorrentFlix</span>
        </div>
        {torrentMeta && view !== 'home' && (
          <span className="text-white/40 text-xs truncate max-w-[200px] sm:max-w-[400px]">{torrentMeta.name}</span>
        )}
      </div>
    </header>
  );
}
