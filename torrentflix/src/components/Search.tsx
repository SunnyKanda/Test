import { useState, useRef } from 'react';
import { useTorrentStore } from '../stores/torrent-store';
import {
  searchTorrents,
  formatSize,
  formatDate,
  getCategoryName,
  getCategoryIcon,
  SEARCH_CATEGORIES,
  type SearchResult,
} from '../lib/search';

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [category, setCategory] = useState('');
  const addMagnet = useTorrentStore((s) => s.addMagnet);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = async (q: string, cat: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await searchTorrents(trimmed, cat);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query, category);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    if (query.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(query, cat), 150);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search header */}
      <div className="px-4 pt-4 pb-3 space-y-3 border-b border-surface-600 bg-surface-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search torrents..."
              className="w-full bg-surface-700 border border-surface-600 rounded-lg pl-9 pr-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-accent/50 text-sm"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-accent hover:bg-accent-hover disabled:bg-surface-600 disabled:text-white/20 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors active:scale-95 shrink-0"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </form>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
          {SEARCH_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat.value
                  ? 'bg-accent text-white'
                  : 'bg-surface-700 text-white/50 active:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-white/20 px-4">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">Search for a movie, show, or anything</p>
          </div>
        )}

        {searched && !loading && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-white/20 px-4">
            <p className="text-sm">No results found</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="divide-y divide-surface-700">
            {results.map((item) => (
              <ResultRow key={item.id} item={item} onPlay={() => addMagnet(item.magnet)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({ item, onPlay }: { item: SearchResult; onPlay: () => void }) {
  const icon = getCategoryIcon(item.category);

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-surface-800/50 transition-colors group">
      {/* Category icon */}
      <div className="mt-0.5 shrink-0">
        {icon === 'movie' && (
          <svg className="w-5 h-5 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        )}
        {icon === 'tv' && (
          <svg className="w-5 h-5 text-purple-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
        {icon === 'music' && (
          <svg className="w-5 h-5 text-green-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
        )}
        {icon === 'other' && (
          <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm leading-snug break-words">{item.name}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-white/30">
          <span>{formatSize(item.size)}</span>
          <span className="text-green-400/70">{item.seeders} seed</span>
          <span className="text-red-400/50">{item.leechers} leech</span>
          <span>{getCategoryName(item.category)}</span>
          {item.added > 0 && <span>{formatDate(item.added)}</span>}
        </div>
      </div>

      {/* Play button */}
      <button
        onClick={onPlay}
        className="shrink-0 mt-1 bg-accent/10 hover:bg-accent active:bg-accent text-accent hover:text-white active:text-white rounded-lg px-3 py-2 sm:px-4 text-xs font-medium transition-all active:scale-95 flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span className="hidden sm:inline">Play</span>
      </button>
    </div>
  );
}
