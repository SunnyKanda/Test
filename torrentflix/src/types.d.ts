interface TorrentFileInfo {
  index: number;
  name: string;
  path: string;
  length: number;
  type: 'video' | 'audio' | 'subtitle' | 'other';
}

interface TorrentInfo {
  infoHash: string;
  name: string;
  files: TorrentFileInfo[];
  error?: string;
}

interface TorrentStats {
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

interface TorrentFlixAPI {
  addMagnet: (magnetURI: string) => Promise<TorrentInfo>;
  selectFile: (infoHash: string, fileIndex: number) => Promise<{ url: string }>;
  getStats: (infoHash: string) => Promise<TorrentStats | null>;
  removeTorrent: (infoHash: string) => Promise<{ ok: boolean }>;
  onMagnetLink: (callback: (magnetURI: string) => void) => void;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
}

interface Window {
  torrentflix: TorrentFlixAPI;
}
