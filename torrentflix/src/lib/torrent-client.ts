import WebTorrent from 'webtorrent';

export interface FileInfo {
  index: number;
  name: string;
  path: string;
  length: number;
  type: 'video' | 'audio' | 'subtitle' | 'other';
}

export interface TorrentMeta {
  infoHash: string;
  name: string;
  files: FileInfo[];
}

export interface TorrentStats {
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  downloaded: number;
  uploaded: number;
  timeRemaining: number;
}

const VIDEO_EXTS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.ogg'];
const AUDIO_EXTS = ['.mp3', '.flac', '.aac', '.ogg', '.wav', '.m4a'];
const SUB_EXTS = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];

function classifyFile(name: string): FileInfo['type'] {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (SUB_EXTS.includes(ext)) return 'subtitle';
  return 'other';
}

// WebSocket trackers that bridge WebRTC peers to the torrent network
const WS_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.files.fm:7073/announce',
  'wss://tracker.webtorrent.dev',
  'wss://spacetradersapi-chatbox.herokuapp.com:443/announce',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

function getClient(): any {
  if (!client) {
    client = new WebTorrent();
  }
  return client;
}

export type PeerCallback = (numPeers: number) => void;

export function addMagnet(
  magnetURI: string,
  onPeerUpdate?: PeerCallback,
): Promise<TorrentMeta> {
  return new Promise((resolve, reject) => {
    const c = getClient();

    const existing = c.get(magnetURI);
    if (existing && existing.ready) {
      resolve(torrentToMeta(existing));
      return;
    }

    // Inject WebSocket trackers into the magnet link for better browser connectivity
    let enrichedURI = magnetURI;
    for (const ws of WS_TRACKERS) {
      if (!enrichedURI.includes(encodeURIComponent(ws))) {
        enrichedURI += '&tr=' + encodeURIComponent(ws);
      }
    }

    const torrent = c.add(enrichedURI);

    let peerInterval: ReturnType<typeof setInterval> | null = null;
    if (onPeerUpdate) {
      peerInterval = setInterval(() => onPeerUpdate(torrent.numPeers), 1000);
    }

    const cleanup = () => {
      if (peerInterval) clearInterval(peerInterval);
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('NO_WEBRTC_PEERS'));
    }, 30000);

    torrent.on('ready', () => {
      clearTimeout(timeout);
      cleanup();
      resolve(torrentToMeta(torrent));
    });

    torrent.on('error', (err: Error) => {
      clearTimeout(timeout);
      cleanup();
      reject(err);
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function torrentToMeta(torrent: any): TorrentMeta {
  return {
    infoHash: torrent.infoHash,
    name: torrent.name,
    files: torrent.files.map((f: any, i: number) => ({
      index: i,
      name: f.name,
      path: f.path,
      length: f.length,
      type: classifyFile(f.name),
    })),
  };
}

export function renderFileToElement(
  infoHash: string,
  fileIndex: number,
  element: HTMLVideoElement | HTMLAudioElement,
): void {
  const c = getClient();
  const torrent = c.torrents.find((t: any) => t.infoHash === infoHash);
  if (!torrent) return;

  torrent.files.forEach((f: any) => f.deselect());
  const file = torrent.files[fileIndex];
  if (!file) return;
  file.select();

  file.renderTo(element, { autoplay: true, controls: false }, (err: Error | null) => {
    if (err) console.error('renderTo error:', err);
  });
}

export function getStats(infoHash: string): TorrentStats | null {
  const c = getClient();
  const torrent = c.torrents.find((t: any) => t.infoHash === infoHash);
  if (!torrent) return null;

  return {
    progress: torrent.progress,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    numPeers: torrent.numPeers,
    downloaded: torrent.downloaded,
    uploaded: torrent.uploaded,
    timeRemaining: torrent.timeRemaining,
  };
}

export function removeTorrent(infoHash: string): void {
  const c = getClient();
  const torrent = c.torrents.find((t: any) => t.infoHash === infoHash);
  if (torrent) {
    torrent.destroy({ destroyStore: true });
  }
}
