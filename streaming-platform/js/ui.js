const UI = (() => {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ESC[c]);
  }

  // Items rendered on screen, so watchlist/history can store real metadata without a refetch.
  const seen = new Map();
  function remember(item, type) {
    seen.set(`${type}:${item.id}`, {
      id: item.id,
      media_type: type,
      title: getTitle(item),
      poster_path: item.poster_path || null,
      backdrop_path: item.backdrop_path || null,
      vote_average: item.vote_average || 0,
      release_date: item.release_date || item.first_air_date || null
    });
  }
  function lookup(id, type) {
    return seen.get(`${type}:${id}`) || null;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).getFullYear() || '';
  }

  function formatRating(rating) {
    return rating ? Number(rating).toFixed(1) : 'N/A';
  }

  function formatRuntime(mins) {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function formatAgo(ts) {
    if (!ts) return '';
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }

  function getMediaType(item) {
    return item.media_type || (item.first_air_date ? 'tv' : 'movie');
  }

  function isWatchable(item) {
    const t = getMediaType(item);
    return t === 'movie' || t === 'tv';
  }

  function getTitle(item) {
    return item.title || item.name || 'Untitled';
  }

  function getYear(item) {
    return formatDate(item.release_date || item.first_air_date);
  }

  function starSvg() {
    return '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="#ffd700" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
  }

  function playSvg(size = 16) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
  }

  function plusSvg() {
    return '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';
  }

  function checkSvg() {
    return '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
  }

  function infoSvg() {
    return '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
  }

  function watchlistBtnInner(inList, withLabel) {
    if (!withLabel) return inList ? checkSvg() : plusSvg();
    return inList ? `${checkSvg()} In My List` : `${plusSvg()} Add to List`;
  }

  function renderCard(item) {
    const type = getMediaType(item);
    remember(item, type);
    const title = esc(getTitle(item));
    const year = getYear(item);
    const posterUrl = API.poster(item.poster_path, 'w342');
    const rating = item.vote_average;
    const inList = Storage.isInWatchlist(item.id, type);

    return `
      <div class="card" data-id="${Number(item.id)}" data-type="${esc(type)}">
        <div class="card-poster-wrap">
          ${posterUrl
            ? `<img class="card-poster" src="${esc(posterUrl)}" alt="${title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <div class="card-poster-placeholder" ${posterUrl ? 'style="display:none"' : ''}>${title}</div>
          ${rating > 0 ? `<div class="card-rating">${starSvg()} ${formatRating(rating)}</div>` : ''}
          <div class="card-overlay">
            <div class="card-overlay-title">${title}</div>
            <div class="card-overlay-meta">
              <span>${year}</span>
              <span>${type === 'tv' ? 'TV' : 'Movie'}</span>
            </div>
            <div class="card-overlay-actions">
              <button class="card-action-btn play-btn" data-action="play" title="Play">${playSvg()}</button>
              <button class="card-action-btn ${inList ? 'in-list' : ''}" data-action="watchlist" title="${inList ? 'Remove from list' : 'Add to list'}">${watchlistBtnInner(inList, false)}</button>
              <button class="card-action-btn" data-action="info" title="More info">${infoSvg()}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderWideCard(item, rank) {
    const type = getMediaType(item);
    remember(item, type);
    const title = esc(getTitle(item));
    const backdropUrl = API.backdrop(item.backdrop_path);
    const year = getYear(item);

    return `
      <div class="card-wide" data-id="${Number(item.id)}" data-type="${esc(type)}">
        <div class="card-wide-poster-wrap">
          ${backdropUrl
            ? `<img src="${esc(backdropUrl)}" alt="${title}" loading="lazy">`
            : `<div class="card-poster-placeholder">${title}</div>`}
          <div class="card-wide-overlay">
            ${rank ? `<div class="card-wide-rank">#${rank}</div>` : ''}
            <div class="card-wide-title">${title}</div>
            <div class="card-wide-meta">
              ${year} &bull; ${formatRating(item.vote_average)} ${starSvg()} &bull; ${type === 'tv' ? 'TV Series' : 'Movie'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderContinueCard(item) {
    const backdropUrl = API.backdrop(item.backdrop_path) || API.poster(item.poster_path);
    const title = esc(item.title);
    const episodeLabel = item.media_type === 'tv' && item.season
      ? `S${Number(item.season)}:E${Number(item.episode)} ${esc(item.episode_name || '')} &bull; `
      : '';

    return `
      <div class="card-wide" data-resume="1" data-id="${Number(item.id)}" data-type="${esc(item.media_type)}" data-season="${Number(item.season) || ''}" data-episode="${Number(item.episode) || ''}">
        <div class="card-wide-poster-wrap">
          ${backdropUrl
            ? `<img src="${esc(backdropUrl)}" alt="${title}" loading="lazy">`
            : `<div class="card-poster-placeholder">${title}</div>`}
          <div class="card-wide-overlay">
            <div class="card-wide-title">${playSvg(14)} ${title}</div>
            <div class="card-wide-meta">${episodeLabel}${formatAgo(item.watched_at)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderRow(title, items, renderFn = renderCard, ranked = false) {
    if (!items || items.length === 0) return '';
    const cards = items.map((item, i) => renderFn(item, ranked ? i + 1 : undefined)).join('');
    return `
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">${esc(title)}</h2>
        </div>
        <div class="content-row">${cards}</div>
      </section>
    `;
  }

  function renderHero(item) {
    if (!item) return '';
    const type = getMediaType(item);
    remember(item, type);
    const title = esc(getTitle(item));
    const backdropUrl = API.backdrop(item.backdrop_path);

    return `
      <section class="hero" data-id="${Number(item.id)}" data-type="${esc(type)}">
        <div class="hero-backdrop">
          ${backdropUrl ? `<img src="${esc(backdropUrl)}" alt="${title}">` : ''}
        </div>
        <div class="hero-content">
          <div class="hero-badge">${type === 'tv' ? 'TV Series' : 'Movie'} &bull; Trending</div>
          <h1 class="hero-title">${title}</h1>
          <div class="hero-meta">
            <span class="hero-rating">${starSvg()} ${formatRating(item.vote_average)}</span>
            <span>${getYear(item)}</span>
          </div>
          <p class="hero-overview">${esc(item.overview || '')}</p>
          <div class="hero-buttons">
            <button class="btn-play" data-action="play">${playSvg(20)} Play</button>
            <button class="btn-info" data-action="info">${infoSvg()} More Info</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderHome(data) {
    const trending = (data.trending || []).filter(isWatchable);
    const history = Storage.getHistory();

    return `
      ${renderHero(trending[0])}
      ${history.length ? renderRow('Continue Watching', history.slice(0, 10), renderContinueCard) : ''}
      ${renderRow('Trending Now', trending.slice(1, 20), renderWideCard, true)}
      ${renderRow('Popular Movies', data.popularMovies)}
      ${renderRow('Popular TV Shows', data.popularTv)}
      ${renderRow('Top Rated', data.topRatedMovies)}
      ${renderRow('Now Playing in Theaters', data.nowPlaying)}
      ${renderRow('Upcoming', data.upcoming)}
    `;
  }

  function renderBrowse(title, subtitle, genres, items, activeGenre = null) {
    const genreChips = genres.map(g => `
      <button class="filter-chip ${activeGenre === g.id ? 'active' : ''}" data-genre="${Number(g.id)}">${esc(g.name)}</button>
    `).join('');

    return `
      <div class="page-header">
        <h1 class="page-title">${esc(title)}</h1>
        <p class="page-subtitle">${esc(subtitle)}</p>
      </div>
      <div class="filter-bar">
        <button class="filter-chip ${!activeGenre ? 'active' : ''}" data-genre="">All</button>
        ${genreChips}
      </div>
      <div class="content-grid" id="contentGrid">${items.map(renderCard).join('')}</div>
      <div class="load-more" id="loadMore">
        <button class="btn-secondary btn-sm" id="loadMoreBtn">Load More</button>
      </div>
    `;
  }

  function renderSearchPage(query, results) {
    const filtered = (results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
    const q = esc(query);

    if (filtered.length === 0) {
      return `
        <div class="page-header">
          <h1 class="page-title">Search Results</h1>
          <p class="page-subtitle">${q ? `No results for "${q}"` : 'Start typing to search'}</p>
        </div>
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" width="64" height="64"><path fill="var(--text-muted)" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </div>
          <h3>No results found</h3>
          <p>Try different keywords or browse our categories</p>
        </div>
      `;
    }

    return `
      <div class="page-header">
        <h1 class="page-title">Search Results</h1>
        <p class="page-subtitle">${filtered.length} results for "${q}"</p>
      </div>
      <div class="content-grid">${filtered.map(renderCard).join('')}</div>
    `;
  }

  function renderMyList() {
    const list = Storage.getWatchlist();
    if (list.length === 0) {
      return `
        <div class="page-header">
          <h1 class="page-title">My List</h1>
          <p class="page-subtitle">Your saved movies and shows</p>
        </div>
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" width="64" height="64"><path fill="var(--text-muted)" d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>
          </div>
          <h3>Your list is empty</h3>
          <p>Add movies and TV shows to your list to watch later</p>
        </div>
      `;
    }

    return `
      <div class="page-header">
        <h1 class="page-title">My List</h1>
        <p class="page-subtitle">${list.length} saved items</p>
      </div>
      <div class="content-grid">${list.map(renderCard).join('')}</div>
    `;
  }

  function renderDetailModal(item, type) {
    remember(item, type);
    const title = esc(getTitle(item));
    const backdropUrl = API.backdrop(item.backdrop_path);
    const runtime = type === 'movie' ? formatRuntime(item.runtime) : '';
    const seasons = type === 'tv' && item.number_of_seasons
      ? `${Number(item.number_of_seasons)} Season${item.number_of_seasons !== 1 ? 's' : ''}`
      : '';
    const genres = (item.genres || []).map(g =>
      `<span class="genre-tag" data-genre="${Number(g.id)}" data-type="${esc(type)}">${esc(g.name)}</span>`
    ).join('');

    const cast = (item.credits?.cast || []).slice(0, 12).map(person => {
      const photo = API.profile(person.profile_path);
      return `
        <div class="cast-item">
          ${photo
            ? `<img class="cast-photo" src="${esc(photo)}" alt="${esc(person.name)}" loading="lazy">`
            : `<div class="cast-photo" style="display:flex;align-items:center;justify-content:center;background:var(--bg-card);font-size:0.625rem;color:var(--text-muted)">${esc((person.name || '?').charAt(0))}</div>`}
          <div class="cast-name">${esc(person.name)}</div>
          <div class="cast-character">${esc(person.character || '')}</div>
        </div>
      `;
    }).join('');

    const similar = (item.similar?.results || []).slice(0, 10).map(s => renderCard({ ...s, media_type: type })).join('');
    const trailer = (item.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const inList = Storage.isInWatchlist(item.id, type);

    let episodeSection = '';
    if (type === 'tv' && item.seasons) {
      const mainSeasons = item.seasons.filter(s => s.season_number > 0);
      episodeSection = `
        <div class="season-selector">
          <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:12px">Episodes</h3>
          <select class="season-select" id="seasonSelect" data-tv-id="${Number(item.id)}">
            ${mainSeasons.map(s => `<option value="${Number(s.season_number)}">Season ${Number(s.season_number)} (${Number(s.episode_count) || 0} episodes)</option>`).join('')}
          </select>
        </div>
        <div class="episode-list" id="episodeList">
          <div style="text-align:center;padding:20px"><div class="inline-spinner"></div></div>
        </div>
      `;
    }

    const details = [];
    if (item.production_companies?.length) details.push(`<p><span>Studio: </span>${esc(item.production_companies[0].name)}</p>`);
    if (item.original_language) details.push(`<p><span>Language: </span>${esc(item.original_language.toUpperCase())}</p>`);
    if (item.budget) details.push(`<p><span>Budget: </span>$${(item.budget / 1e6).toFixed(0)}M</p>`);
    if (item.revenue) details.push(`<p><span>Revenue: </span>$${(item.revenue / 1e6).toFixed(0)}M</p>`);

    return `
      <div class="modal-backdrop">
        ${backdropUrl ? `<img src="${esc(backdropUrl)}" alt="${title}">` : ''}
        <div class="modal-backdrop-content">
          <h2 class="modal-title">${title}</h2>
          <div class="modal-actions">
            <button class="btn-play" data-action="play">${playSvg(18)} Play</button>
            ${trailer ? `<button class="btn-info" data-action="trailer" data-key="${esc(trailer.key)}">Trailer</button>` : ''}
            <button class="btn-info" data-action="watchlist">${watchlistBtnInner(inList, true)}</button>
          </div>
        </div>
      </div>
      <div class="modal-body-inner">
        <div class="modal-info-grid">
          <div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
              <span class="hero-rating">${starSvg()} ${formatRating(item.vote_average)}</span>
              <span style="color:var(--text-secondary)">${getYear(item)}</span>
              ${runtime ? `<span style="color:var(--text-secondary)">${runtime}</span>` : ''}
              ${seasons ? `<span style="color:var(--text-secondary)">${seasons}</span>` : ''}
              ${item.status ? `<span style="color:var(--text-muted);font-size:0.8125rem">${esc(item.status)}</span>` : ''}
            </div>
            <p class="modal-overview">${esc(item.overview || 'No overview available.')}</p>
            <div class="modal-details">${details.join('')}</div>
            ${cast ? `<div class="modal-cast"><h3>Cast</h3><div class="cast-list">${cast}</div></div>` : ''}
            ${episodeSection}
          </div>
          <div class="modal-sidebar">
            ${genres ? `<h3>Genres</h3><div class="genre-tags">${genres}</div>` : ''}
          </div>
        </div>
        ${similar ? `
          <div class="similar-section">
            <h3>More Like This</h3>
            <div class="content-row">${similar}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderEpisodes(episodes, tvId, seasonNum) {
    if (!episodes || episodes.length === 0) {
      return '<p style="color:var(--text-muted);padding:16px">No episodes available</p>';
    }

    return episodes.map(ep => {
      const thumbUrl = ep.still_path ? API.img(ep.still_path, 'w300') : null;
      const num = Number(ep.episode_number);
      return `
        <div class="episode-item" data-tv-id="${Number(tvId)}" data-season="${Number(seasonNum)}" data-episode="${num}" data-name="${esc(ep.name || '')}">
          <span class="episode-number">${num}</span>
          ${thumbUrl
            ? `<img class="episode-thumb" src="${esc(thumbUrl)}" alt="Episode ${num}" loading="lazy">`
            : `<div class="episode-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-card);color:var(--text-muted);font-size:0.75rem">Ep ${num}</div>`}
          <div class="episode-info">
            <div class="episode-name">${esc(ep.name || `Episode ${num}`)}</div>
            <div class="episode-desc">${esc(ep.overview || '')}</div>
          </div>
          ${ep.runtime ? `<span class="episode-runtime">${formatRuntime(ep.runtime)}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  function renderSearchDropdown(results) {
    if (!results || results.length === 0) return '';
    return results.filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 8).map(item => {
      remember(item, item.media_type);
      const posterUrl = API.poster(item.poster_path, 'w92');
      const title = esc(getTitle(item));
      return `
        <div class="search-result-item" data-id="${Number(item.id)}" data-type="${esc(item.media_type)}">
          ${posterUrl
            ? `<img class="search-result-poster" src="${esc(posterUrl)}" alt="${title}" loading="lazy">`
            : `<div class="search-result-poster" style="display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--text-muted)">${esc(getTitle(item).charAt(0))}</div>`}
          <div class="search-result-info">
            <h4>${title}</h4>
            <p>${getYear(item)}</p>
          </div>
          <span class="search-result-type">${esc(item.media_type)}</span>
        </div>
      `;
    }).join('');
  }

  function renderSetup() {
    return `
      <div class="setup-screen">
        <div class="setup-card">
          <svg viewBox="0 0 140 32" class="logo-svg" style="display:block">
            <defs>
              <linearGradient id="setupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#e50914"/>
                <stop offset="100%" style="stop-color:#ff6b6b"/>
              </linearGradient>
            </defs>
            <text x="10" y="26" font-family="Inter, system-ui, sans-serif" font-size="28"><tspan font-weight="900" fill="url(#setupGrad)">STREAM</tspan><tspan font-weight="300" fill="#f1f1f1">V</tspan></text>
          </svg>
          <h1>Welcome to StreamVault</h1>
          <p>Enter your free TMDB key to get started. It powers all movie and TV metadata, posters and search.</p>
          <ol class="setup-steps">
            <li>Sign in at <a href="https://www.themoviedb.org/login" target="_blank" rel="noopener">themoviedb.org</a></li>
            <li>Open <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">Settings &rarr; API</a> and request a key (type "Developer", personal use)</li>
            <li>Copy either the <strong>API Key</strong> or the longer <strong>API Read Access Token</strong> and paste it below</li>
          </ol>
          <input type="text" class="settings-input" id="setupApiKey" placeholder="Paste your TMDB API key or read access token" autocomplete="off" spellcheck="false">
          <div id="setupStatus" class="settings-status" style="margin-bottom:12px"></div>
          <button class="btn-primary" id="setupSaveBtn">Get Started</button>
        </div>
      </div>
    `;
  }

  function renderError(title, message, retryPage) {
    return `
      <div class="empty-state" style="padding-top:30vh">
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
        ${retryPage ? `<button class="btn-primary btn-sm" style="margin-top:16px" data-navigate="${esc(retryPage)}">Retry</button>` : ''}
      </div>
    `;
  }

  function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  return {
    esc, lookup, remember, watchlistBtnInner,
    renderCard, renderWideCard, renderContinueCard, renderRow,
    renderHero, renderHome, renderBrowse, renderSearchPage,
    renderMyList, renderDetailModal, renderEpisodes, renderSearchDropdown,
    renderSetup, renderError, toast, getMediaType, getTitle, getYear, formatRating
  };
})();
