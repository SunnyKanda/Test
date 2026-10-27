import { create } from 'zustand';
import * as engine from '../lib/torrent-client';
import type { FileInfo, TorrentMeta, TorrentStats } from '../lib/torrent-client';

type View = 'home' | 'loading' | 'file-select' | 'player';

interface HistoryItem {
  name: string;
  magnetURI: string;
  timestamp: number;
}

function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem('torrentflix-history') || '[]'); }
  catch { return []; }
}

interface TorrentState {
  view: View;
  magnetURI: string;
  torrentMeta: TorrentMeta | null;
  selectedFile: FileInfo | null;
  stats: TorrentStats | null;
  error: string | null;
  history: HistoryItem[];

  addMagnet: (magnetURI: string) => Promise<void>;
  selectFile: (file: FileInfo) => void;
  updateStats: () => void;
  goHome: () => void;
  setError: (error: string | null) => void;
}

export const useTorrentStore = create<TorrentState>((set, get) => ({
  view: 'home',
  magnetURI: '',
  torrentMeta: null,
  selectedFile: null,
  stats: null,
  error: null,
  history: loadHistory(),

  addMagnet: async (magnetURI: string) => {
    set({ view: 'loading', magnetURI, error: null, torrentMeta: null });

    try {
      const meta = await engine.addMagnet(magnetURI);

      const { history } = get();
      const updated = [
        { name: meta.name, magnetURI, timestamp: Date.now() },
        ...history.filter((h) => h.magnetURI !== magnetURI),
      ].slice(0, 50);
      try { localStorage.setItem('torrentflix-history', JSON.stringify(updated)); } catch {}

      const videoFiles = meta.files.filter((f) => f.type === 'video');

      if (videoFiles.length === 1) {
        set({ torrentMeta: meta, selectedFile: videoFiles[0], view: 'player', history: updated });
      } else if (videoFiles.length > 1) {
        set({ view: 'file-select', torrentMeta: meta, history: updated });
      } else {
        set({ view: 'home', error: 'No playable video files found in this torrent.', history: updated });
      }
    } catch (err: any) {
      set({ view: 'home', error: err.message || 'Failed to load torrent' });
    }
  },

  selectFile: (file: FileInfo) => {
    set({ selectedFile: file, view: 'player' });
  },

  updateStats: () => {
    const { torrentMeta } = get();
    if (!torrentMeta) return;
    const stats = engine.getStats(torrentMeta.infoHash);
    set({ stats });
  },

  goHome: () => {
    const { torrentMeta } = get();
    if (torrentMeta) engine.removeTorrent(torrentMeta.infoHash);
    set({ view: 'home', magnetURI: '', torrentMeta: null, selectedFile: null, stats: null, error: null });
  },

  setError: (error) => set({ error }),
}));
