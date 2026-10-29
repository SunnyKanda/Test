export interface SearchResult {
  id: string;
  name: string;
  info_hash: string;
  magnet: string;
  size: number;
  seeders: number;
  leechers: number;
  category: number;
  added: number;
  username: string;
}

// PirateBay category codes
const CATEGORY_MAP: Record<number, string> = {
  100: 'Audio', 101: 'Music', 102: 'Audiobook', 103: 'Sound Clip', 104: 'FLAC', 199: 'Other Audio',
  200: 'Video', 201: 'Movies', 202: 'Movies DVDR', 203: 'Music Videos', 204: 'Movie Clips',
  205: 'TV Shows', 206: 'Handheld', 207: 'HD Movies', 208: 'HD TV Shows', 209: '3D', 210: 'CAM/TS',
  211: 'UHD/4K Movies', 212: 'UHD/4K TV Shows', 299: 'Other Video',
  300: 'Applications', 400: 'Games', 500: 'Porn', 600: 'Other',
};

export function getCategoryName(code: number): string {
  return CATEGORY_MAP[code] || 'Other';
}

export function getCategoryIcon(code: number): 'movie' | 'tv' | 'music' | 'other' {
  if (code >= 200 && code <= 299) {
    if (code === 205 || code === 208 || code === 212) return 'tv';
    return 'movie';
  }
  if (code >= 100 && code <= 199) return 'music';
  return 'other';
}

export function formatSize(bytes: number): string {
  if (bytes <= 0) return '?';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function formatDate(timestamp: number): string {
  if (timestamp <= 0) return '';
  return new Date(timestamp * 1000).toLocaleDateString();
}

export async function searchTorrents(query: string, category?: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (category) params.set('cat', category);

  const res = await fetch(`./api/search.php?${params}`);
  if (!res.ok) throw new Error('Search failed');

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export const SEARCH_CATEGORIES = [
  { value: '', label: 'All' },
  { value: '201,202,207,210,211', label: 'Movies' },
  { value: '205,208,212', label: 'TV Shows' },
  { value: '101,104', label: 'Music' },
  { value: '207,211', label: 'HD/4K' },
];
