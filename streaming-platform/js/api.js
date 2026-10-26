const API = (() => {
  const BASE = 'https://api.themoviedb.org/3';
  const IMG_BASE = 'https://image.tmdb.org/t/p';
  const cache = new Map();
  const CACHE_TTL = 10 * 60 * 1000;

  function getKey() { return Storage.getApiKey(); }

  async function request(endpoint, params = {}) {
    const key = getKey();
    if (!key) throw new Error('API key not set');

    const url = new URL(BASE + endpoint);
    url.searchParams.set('api_key', key);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const cacheKey = url.toString();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

    const res = await fetch(url.toString());
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid API key');
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    cache.set(cacheKey, { data, ts: Date.now() });
    if (cache.size > 200) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      cache.delete(oldest[0]);
    }
    return data;
  }

  function img(path, size = 'w500') {
    if (!path) return null;
    return `${IMG_BASE}/${size}${path}`;
  }

  function backdrop(path) { return img(path, 'w1280'); }
  function poster(path, size) { return img(path, size || 'w500'); }
  function profile(path) { return img(path, 'w185'); }

  async function validateKey(key) {
    try {
      const res = await fetch(`${BASE}/configuration?api_key=${key}`);
      return res.ok;
    } catch { return false; }
  }

  // Endpoints
  async function trending(mediaType = 'all', timeWindow = 'week', page = 1) {
    return request(`/trending/${mediaType}/${timeWindow}`, { page });
  }

  async function popular(type = 'movie', page = 1) {
    return request(`/${type}/popular`, { page });
  }

  async function topRated(type = 'movie', page = 1) {
    return request(`/${type}/top_rated`, { page });
  }

  async function nowPlaying(page = 1) {
    return request('/movie/now_playing', { page });
  }

  async function airingToday(page = 1) {
    return request('/tv/airing_today', { page });
  }

  async function onTheAir(page = 1) {
    return request('/tv/on_the_air', { page });
  }

  async function upcoming(page = 1) {
    return request('/movie/upcoming', { page });
  }

  async function details(type, id) {
    return request(`/${type}/${id}`, { append_to_response: 'credits,similar,videos,external_ids' });
  }

  async function tvSeasonDetails(tvId, seasonNum) {
    return request(`/tv/${tvId}/season/${seasonNum}`);
  }

  async function search(query, page = 1) {
    return request('/search/multi', { query, page, include_adult: Storage.getAdultContent() });
  }

  async function genres(type = 'movie') {
    return request(`/genre/${type}/list`);
  }

  async function discover(type = 'movie', params = {}) {
    return request(`/discover/${type}`, params);
  }

  async function getHomeData() {
    const [trendingData, popularMovies, popularTv, topRatedMovies, nowPlayingData, upcomingData] = await Promise.all([
      trending('all', 'week'),
      popular('movie'),
      popular('tv'),
      topRated('movie'),
      nowPlaying(),
      upcoming()
    ]);

    return {
      trending: trendingData.results,
      popularMovies: popularMovies.results,
      popularTv: popularTv.results,
      topRatedMovies: topRatedMovies.results,
      nowPlaying: nowPlayingData.results,
      upcoming: upcomingData.results
    };
  }

  return {
    request, img, backdrop, poster, profile, validateKey,
    trending, popular, topRated, nowPlaying, airingToday, onTheAir, upcoming,
    details, tvSeasonDetails, search, genres, discover, getHomeData
  };
})();
