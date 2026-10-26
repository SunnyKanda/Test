const LiveTV = (() => {
  const BASE = 'https://iptv-org.github.io/iptv';
  const PLAYLISTS = [
    { key: 'favourites', label: 'Favourites' },
    { key: 'uk', label: 'UK', path: 'countries/uk.m3u' },
    { key: 'ie', label: 'Ireland', path: 'countries/ie.m3u' },
    { key: 'us', label: 'USA', path: 'countries/us.m3u' },
    { key: 'news', label: 'News', path: 'categories/news.m3u' },
    { key: 'sports', label: 'Sports', path: 'categories/sports.m3u' },
    { key: 'movies', label: 'Movies', path: 'categories/movies.m3u' },
    { key: 'music', label: 'Music', path: 'categories/music.m3u' },
    { key: 'kids', label: 'Kids', path: 'categories/kids.m3u' },
    { key: 'documentary', label: 'Documentary', path: 'categories/documentary.m3u' },
    { key: 'comedy', label: 'Comedy', path: 'categories/comedy.m3u' }
  ];
  const cache = new Map();

  function attr(line, name) {
    const m = line.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1].trim() : '';
  }

  // Keeps only streams a browser on an https page can play directly.
  function parse(text) {
    const channels = [];
    const seen = new Set();
    let pending = null;

    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('#EXTINF')) {
        const comma = line.lastIndexOf(',');
        pending = {
          name: comma >= 0 ? line.slice(comma + 1).trim() : 'Unknown',
          logo: attr(line, 'tvg-logo'),
          group: attr(line, 'group-title'),
          needsHeaders: false
        };
      } else if (line.startsWith('#EXTVLCOPT') || line.startsWith('#KODIPROP')) {
        if (pending) pending.needsHeaders = true;
      } else if (!line.startsWith('#') && pending) {
        const url = line;
        const adult = /xxx|adult/i.test(pending.group);
        if (url.startsWith('https://') && !pending.needsHeaders && !adult && !seen.has(url)) {
          seen.add(url);
          const group = pending.group.split(';').filter(g => g && g !== 'Undefined').join(' · ');
          channels.push({
            name: pending.name.replace(/\s*\[(Not 24\/7|Geo-blocked)\]/gi, '').trim() || 'Unknown',
            logo: pending.logo.startsWith('https://') ? pending.logo : '',
            group,
            geo: /\[Geo-blocked\]/i.test(pending.name),
            url
          });
        }
        pending = null;
      }
    }
    return channels.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function load(key) {
    if (key === 'favourites') return Storage.getFavouriteChannels();
    if (cache.has(key)) return cache.get(key);
    const playlist = PLAYLISTS.find(p => p.key === key);
    if (!playlist) throw new Error('Unknown playlist');
    const res = await fetch(`${BASE}/${playlist.path}`);
    if (!res.ok) throw new Error(`Couldn't load channel list (${res.status})`);
    const channels = parse(await res.text());
    cache.set(key, channels);
    return channels;
  }

  return { PLAYLISTS, load, parse };
})();
