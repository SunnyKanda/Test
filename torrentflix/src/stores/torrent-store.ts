import { create } from 'zustand';

type View = 'home' | 'loading' | 'file-select' | 'player';

interface TorrentState {
  view: View;
  magnetURI: string;
  torrentInfo: TorrentInfo | null;
  streamURL: string | null;
  selectedFile: TorrentFileInfo | null;
  stats: TorrentStats | null;
  error: string | null;
  history: Array<{ name: string; magnetURI: string; timestamp: number }>;

  setView: (view: View) => void;
  setError: (error: string | null) => void;
  addMagnet: (magnetURI: string) => Promise<void>;
  selectFile: (file: TorrentFileInfo) => Promise<void>;
  updateStats: () => Promise<void>;
  goHome: () => void;
  removeCurrent: () => void;
}

export const useTorrentStore = create<TorrentState>((set, get) => ({
  view: 'home',
  magnetURI: '',
  torrentInfo: null,
  streamURL: null,
  selectedFile: null,
  stats: null,
  error: null,
  history: JSON.parse(localStorage.getItem('torrentflix-history') || '[]'),

  setView: (view) => set({ view }),
  setError: (error) => set({ error }),

  addMagnet: async (magnetURI: string) => {
    set({ view: 'loading', magnetURI, error: null, torrentInfo: null });

    try {
      const info = await window.torrentflix.addMagnet(magnetURI);

      if (info.error) {
        set({ view: 'home', error: info.error });
        return;
      }

      // Save to history
      const { history } = get();
      const newHistory = [
        { name: info.name, magnetURI, timestamp: Date.now() },
        ...history.filter((h) => h.magnetURI !== magnetURI),
      ].slice(0, 50);
      localStorage.setItem('torrentflix-history', JSON.stringify(newHistory));

      const videoFiles = info.files.filter((f) => f.type === 'video');

      if (videoFiles.length === 1) {
        // Auto-select if there's only one video file
        set({ torrentInfo: info, history: newHistory });
        get().selectFile(videoFiles[0]);
      } else if (videoFiles.length > 1) {
        set({ view: 'file-select', torrentInfo: info, history: newHistory });
      } else {
        set({
          view: 'home',
          error: 'No playable video files found in this torrent',
          history: newHistory,
        });
      }
    } catch (err: any) {
      set({ view: 'home', error: err.message || 'Failed to load torrent' });
    }
  },

  selectFile: async (file: TorrentFileInfo) => {
    const { torrentInfo } = get();
    if (!torrentInfo) return;

    set({ view: 'loading', selectedFile: file });

    try {
      const { url } = await window.torrentflix.selectFile(torrentInfo.infoHash, file.index);
      set({ view: 'player', streamURL: url });
    } catch (err: any) {
      set({ view: 'home', error: err.message || 'Failed to start stream' });
    }
  },

  updateStats: async () => {
    const { torrentInfo } = get();
    if (!torrentInfo) return;

    const stats = await window.torrentflix.getStats(torrentInfo.infoHash);
    set({ stats });
  },

  goHome: () => {
    const { torrentInfo } = get();
    if (torrentInfo) {
      window.torrentflix.removeTorrent(torrentInfo.infoHash);
    }
    set({
      view: 'home',
      magnetURI: '',
      torrentInfo: null,
      streamURL: null,
      selectedFile: null,
      stats: null,
      error: null,
    });
  },

  removeCurrent: () => {
    const { torrentInfo } = get();
    if (torrentInfo) {
      window.torrentflix.removeTorrent(torrentInfo.infoHash);
    }
  },
}));
