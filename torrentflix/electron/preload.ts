import { contextBridge, ipcRenderer } from 'electron';

export interface TorrentFileInfo {
  index: number;
  name: string;
  path: string;
  length: number;
  type: 'video' | 'audio' | 'subtitle' | 'other';
}

export interface TorrentInfo {
  infoHash: string;
  name: string;
  files: TorrentFileInfo[];
  error?: string;
}

export interface TorrentStats {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  downloaded: number;
  uploaded: number;
  timeRemaining: number;
  ready: boolean;
}

const api = {
  addMagnet: (magnetURI: string): Promise<TorrentInfo> =>
    ipcRenderer.invoke('add-magnet', magnetURI),

  selectFile: (infoHash: string, fileIndex: number): Promise<{ url: string }> =>
    ipcRenderer.invoke('select-file', infoHash, fileIndex),

  getStats: (infoHash: string): Promise<TorrentStats | null> =>
    ipcRenderer.invoke('get-torrent-stats', infoHash),

  removeTorrent: (infoHash: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('remove-torrent', infoHash),

  onMagnetLink: (callback: (magnetURI: string) => void) => {
    ipcRenderer.on('magnet-link', (_event, uri) => callback(uri));
  },

  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
};

contextBridge.exposeInMainWorld('torrentflix', api);
