const Providers = (() => {
  const sources = [
    {
      name: 'VidSrc',
      id: 'vidsrc',
      movieUrl: (id) => `https://vidsrc.sh/embed/movie/${id}`,
      tvUrl: (id, s, e) => `https://vidsrc.sh/embed/tv/${id}/${s}/${e}`,
      reliable: true,
      note: 'Primary source - high reliability'
    },
    {
      name: 'Embed.su',
      id: 'embedsu',
      movieUrl: (id) => `https://embed.su/embed/movie/${id}`,
      tvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
      reliable: true,
      note: 'Good alternative with multiple servers'
    },
    {
      name: 'AutoEmbed',
      id: 'autoembed',
      movieUrl: (id) => `https://autoembed.me/movie/tmdb/${id}`,
      tvUrl: (id, s, e) => `https://autoembed.me/tv/tmdb/${id}-${s}-${e}`,
      reliable: true,
      note: 'Reliable, TMDB-native IDs'
    },
    {
      name: 'SuperEmbed',
      id: 'superembed',
      movieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
      tvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
      reliable: true,
      note: 'Multi-server, good quality'
    },
    {
      name: '2Embed',
      id: '2embed',
      movieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
      tvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
      reliable: false,
      note: 'May be intermittent'
    },
    {
      name: 'MoviesAPI',
      id: 'moviesapi',
      movieUrl: (id) => `https://moviesapi.to/movie/${id}`,
      tvUrl: (id, s, e) => `https://moviesapi.to/tv/${id}-${s}-${e}`,
      reliable: true,
      note: 'Clean player, decent catalog'
    },
    {
      name: 'VidLink',
      id: 'vidlink',
      movieUrl: (id) => `https://vidlink.pro/movie/${id}`,
      tvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
      reliable: false,
      note: 'Backup source'
    },
    {
      name: 'VidFast',
      id: 'vidfast',
      movieUrl: (id) => `https://vidfast.vc/embed/movie/${id}`,
      tvUrl: (id, s, e) => `https://vidfast.vc/embed/tv/${id}/${s}/${e}`,
      reliable: false,
      note: 'Newer provider'
    }
  ];

  function getAll() {
    const order = Storage.getSourceOrder();
    if (order) {
      const ordered = [];
      order.forEach(id => {
        const src = sources.find(s => s.id === id);
        if (src) ordered.push(src);
      });
      sources.forEach(s => {
        if (!ordered.find(o => o.id === s.id)) ordered.push(s);
      });
      return ordered;
    }
    return [...sources];
  }

  function getEnabled() {
    const disabled = Storage.getDisabledSources();
    return getAll().filter(s => !disabled.includes(s.id));
  }

  function getMovieUrl(tmdbId, sourceIndex = 0) {
    const enabled = getEnabled();
    const idx = Math.min(sourceIndex, enabled.length - 1);
    return enabled[idx]?.movieUrl(tmdbId) || null;
  }

  function getTvUrl(tmdbId, season, episode, sourceIndex = 0) {
    const enabled = getEnabled();
    const idx = Math.min(sourceIndex, enabled.length - 1);
    return enabled[idx]?.tvUrl(tmdbId, season, episode) || null;
  }

  return { sources, getAll, getEnabled, getMovieUrl, getTvUrl };
})();
