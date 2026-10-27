import * as http from 'http';
import { TorrentEngine } from './torrent-engine';
import * as path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.srt': 'text/plain',
  '.vtt': 'text/vtt',
};

export class StreamServer {
  private server: http.Server | null = null;
  private port = 0;
  private engine: TorrentEngine;

  constructor(engine: TorrentEngine) {
    this.engine = engine;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      // Listen on random available port
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address();
        if (addr && typeof addr !== 'string') {
          this.port = addr.port;
        }
        console.log(`Stream server running on http://127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  stop(): void {
    this.server?.close();
  }

  getStreamURL(infoHash: string, fileIndex: number): string {
    return `http://127.0.0.1:${this.port}/stream/${infoHash}/${fileIndex}`;
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // CORS headers for renderer access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
    const match = url.pathname.match(/^\/stream\/([a-f0-9]+)\/(\d+)$/);

    if (!match) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const [, infoHash, fileIndexStr] = match;
    const fileIndex = parseInt(fileIndexStr, 10);
    const file = this.engine.getFile(infoHash, fileIndex);

    if (!file) {
      res.writeHead(404);
      res.end('File not found in torrent');
      return;
    }

    const ext = path.extname(file.name).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileSize = file.length;

    // Handle range requests for seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      const stream = file.createReadStream({ start, end });
      stream.pipe(res);
      stream.on('error', () => res.end());
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });

      const stream = file.createReadStream();
      stream.pipe(res);
      stream.on('error', () => res.end());
    }
  }
}
