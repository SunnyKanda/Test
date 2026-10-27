import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import * as path from 'path';
import { TorrentEngine } from './torrent-engine';
import { StreamServer } from './stream-server';

let mainWindow: BrowserWindow | null = null;
const torrentEngine = new TorrentEngine();
const streamServer = new StreamServer(torrentEngine);

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register as magnet: link handler
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('magnet', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('magnet');
}

// Handle magnet links on macOS
app.on('open-url', (_event, url) => {
  if (url.startsWith('magnet:')) {
    mainWindow?.webContents.send('magnet-link', url);
  }
});

// Handle magnet links from argv (Windows/Linux)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const magnetLink = commandLine.find((arg) => arg.startsWith('magnet:'));
    if (magnetLink) {
      mainWindow?.webContents.send('magnet-link', magnetLink);
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  await streamServer.start();
  createWindow();

  // Check if launched with a magnet link
  const magnetArg = process.argv.find((arg) => arg.startsWith('magnet:'));
  if (magnetArg) {
    mainWindow?.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('magnet-link', magnetArg);
    });
  }
});

app.on('window-all-closed', () => {
  torrentEngine.destroyAll();
  streamServer.stop();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// IPC handlers

ipcMain.handle('add-magnet', async (_event, magnetURI: string) => {
  try {
    const torrent = await torrentEngine.addMagnet(magnetURI);
    return {
      infoHash: torrent.infoHash,
      name: torrent.name,
      files: torrent.files.map((f, i) => ({
        index: i,
        name: f.name,
        path: f.path,
        length: f.length,
        type: getMediaType(f.name),
      })),
    };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('select-file', async (_event, infoHash: string, fileIndex: number) => {
  const url = streamServer.getStreamURL(infoHash, fileIndex);
  return { url };
});

ipcMain.handle('get-torrent-stats', (_event, infoHash: string) => {
  return torrentEngine.getStats(infoHash);
});

ipcMain.handle('remove-torrent', (_event, infoHash: string) => {
  torrentEngine.remove(infoHash);
  return { ok: true };
});

ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window-close', () => mainWindow?.close());

function getMediaType(filename: string): 'video' | 'audio' | 'subtitle' | 'other' {
  const ext = path.extname(filename).toLowerCase();
  if (['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.m4v', '.flv'].includes(ext)) return 'video';
  if (['.mp3', '.flac', '.aac', '.ogg', '.wav', '.m4a'].includes(ext)) return 'audio';
  if (['.srt', '.vtt', '.ass', '.ssa', '.sub'].includes(ext)) return 'subtitle';
  return 'other';
}
