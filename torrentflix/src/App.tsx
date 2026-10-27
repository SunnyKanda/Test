import { useEffect } from 'react';
import { useTorrentStore } from './stores/torrent-store';
import { TitleBar } from './components/TitleBar';
import { MagnetInput } from './components/MagnetInput';
import { LoadingScreen } from './components/LoadingScreen';
import { FileList } from './components/FileList';
import { Player } from './components/Player';

export default function App() {
  const view = useTorrentStore((s) => s.view);
  const addMagnet = useTorrentStore((s) => s.addMagnet);

  useEffect(() => {
    // Listen for magnet links opened from outside the app
    if (window.torrentflix) {
      window.torrentflix.onMagnetLink((uri) => addMagnet(uri));
    }
  }, [addMagnet]);

  return (
    <div className="h-screen flex flex-col bg-surface-900 overflow-hidden">
      <TitleBar />
      <main className="flex-1 overflow-auto">
        {view === 'home' && <MagnetInput />}
        {view === 'loading' && <LoadingScreen />}
        {view === 'file-select' && <FileList />}
        {view === 'player' && <Player />}
      </main>
    </div>
  );
}
