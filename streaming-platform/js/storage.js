const Storage = (() => {
  const PREFIX = 'sv_';

  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
    catch { /* quota exceeded */ }
  }

  function remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch {}
  }

  // API Key
  function getApiKey() { return get('api_key', ''); }
  function setApiKey(key) { set('api_key', key); }

  // Watchlist
  function getWatchlist() { return get('watchlist', []); }

  function addToWatchlist(item) {
    const list = getWatchlist();
    if (!list.find(i => i.id === item.id && i.media_type === item.media_type)) {
      list.unshift({
        id: item.id,
        media_type: item.media_type,
        title: item.title || item.name,
        poster_path: item.poster_path,
        vote_average: item.vote_average,
        release_date: item.release_date || item.first_air_date,
        added_at: Date.now()
      });
      set('watchlist', list);
    }
  }

  function removeFromWatchlist(id, mediaType) {
    const list = getWatchlist().filter(i => !(i.id === id && i.media_type === mediaType));
    set('watchlist', list);
  }

  function isInWatchlist(id, mediaType) {
    return getWatchlist().some(i => i.id === id && i.media_type === mediaType);
  }

  // Watch History / Continue Watching
  function getHistory() { return get('history', []); }

  function addToHistory(item) {
    let history = getHistory().filter(i => !(i.id === item.id && i.media_type === item.media_type));
    history.unshift({
      id: item.id,
      media_type: item.media_type,
      title: item.title || item.name,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      progress: item.progress || 0,
      season: item.season,
      episode: item.episode,
      episode_name: item.episode_name,
      watched_at: Date.now()
    });
    if (history.length > 50) history = history.slice(0, 50);
    set('history', history);
  }

  // Source Preferences
  function getSourceOrder() { return get('source_order', null); }
  function setSourceOrder(order) { set('source_order', order); }
  function getPreferredSource() { return get('preferred_source', 0); }
  function setPreferredSource(idx) { set('preferred_source', idx); }
  function getDisabledSources() { return get('disabled_sources', []); }
  function setDisabledSources(arr) { set('disabled_sources', arr); }

  // Misc preferences
  function getAdultContent() { return get('adult_content', false); }
  function setAdultContent(v) { set('adult_content', v); }

  // Export/Import
  function exportData() {
    return JSON.stringify({
      watchlist: getWatchlist(),
      history: getHistory(),
      exported_at: new Date().toISOString()
    }, null, 2);
  }

  function importData(json) {
    const data = JSON.parse(json);
    if (data.watchlist) set('watchlist', data.watchlist);
    if (data.history) set('history', data.history);
  }

  function clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }

  return {
    get, set, remove,
    getApiKey, setApiKey,
    getWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
    getHistory, addToHistory,
    getSourceOrder, setSourceOrder,
    getPreferredSource, setPreferredSource,
    getDisabledSources, setDisabledSources,
    getAdultContent, setAdultContent,
    exportData, importData, clearAll
  };
})();
