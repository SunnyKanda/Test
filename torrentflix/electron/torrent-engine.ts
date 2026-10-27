import WebTorrent from 'webtorrent';
import type { Torrent, TorrentFile } from 'webtorrent';

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

export class TorrentEngine {
  private client: WebTorrent.Instance;

  constructor() {
    this.client = new WebTorrent();
  }

  addMagnet(magnetURI: string): Promise<Torrent> {
    return new Promise((resolve, reject) => {
      const existing = this.client.get(magnetURI);
      if (existing) {
        resolve(existing);
        return;
      }

      const torrent = this.client.add(magnetURI, {
        // Store in OS temp dir, cleaned up on remove
        path: require('os').tmpdir() + '/torrentflix',
      });

      torrent.on('ready', () => resolve(torrent));
      torrent.on('error', (err) => reject(err));

      // Timeout after 30 seconds if metadata doesn't resolve
      setTimeout(() => {
        if (!torrent.ready) {
          reject(new Error('Timed out resolving torrent metadata'));
        }
      }, 30000);
    });
  }

  getTorrent(infoHash: string): Torrent | undefined {
    return this.client.torrents.find((t) => t.infoHash === infoHash);
  }

  getFile(infoHash: string, fileIndex: number): TorrentFile | undefined {
    const torrent = this.getTorrent(infoHash);
    return torrent?.files[fileIndex];
  }

  getStats(infoHash: string): TorrentStats | null {
    const torrent = this.getTorrent(infoHash);
    if (!torrent) return null;

    return {
      infoHash: torrent.infoHash,
      name: torrent.name,
      progress: torrent.progress,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed,
      numPeers: torrent.numPeers,
      downloaded: torrent.downloaded,
      uploaded: torrent.uploaded,
      timeRemaining: torrent.timeRemaining,
      ready: torrent.ready,
    };
  }

  selectFile(infoHash: string, fileIndex: number): void {
    const torrent = this.getTorrent(infoHash);
    if (!torrent) return;

    // Deselect all files, then select just the one we want
    torrent.files.forEach((f) => f.deselect());
    torrent.files[fileIndex]?.select();
  }

  remove(infoHash: string): void {
    const torrent = this.getTorrent(infoHash);
    if (torrent) {
      torrent.destroy({ destroyStore: true });
    }
  }

  destroyAll(): void {
    this.client.destroy();
  }
}
