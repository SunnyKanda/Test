const UI = (() => {
  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).getFullYear();
  }

  function formatRating(rating) {
    return rating ? rating.toFixed(1) : 'N/A';
  }

  function formatRuntime(mins) {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function getMediaType(item) {
    return item.media_type || (item.first_air_date ? 'tv' : 'movie');
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

  // Card rendering
  function renderCard(item) {
    const type = getMediaType(item);
    const title = getTitle(item);
    const year = getYear(item);
    const posterUrl = API.poster(item.poster_path, 'w342');
    const rating = item.vote_average;
    const inList = Storage.isInWatchlist(item.id, type);

    return `
      <div class="card" data-id="${item.id}" data-type="${type}">
        <div class="card-poster-wrap">
          ${posterUrl
            ? `<img class="card-poster" src="${posterUrl}" alt="${title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
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
              <button class="card-action-btn ${inList ? 'in-list' : ''}" data-action="watchlist" title="${inList ? 'Remove from list' : 'Add to list'}">${inList ? checkSvg() : plusSvg()}</button>
              <button class="card-action-btn" data-action="info" title="More info">${infoSvg()}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderWideCard(item, rank) {
    const type = getMediaType(item);
    const title = getTitle(item);
    const backdropUrl = API.backdrop(item.backdrop_path);
    const rating = item.vote_average;
    const year = getYear(item);

    return `
      <div class="card-wide" data-id="${item.id}" data-type="${type}">
        <div class="card-wide-poster-wrap">
          ${backdropUrl
            ? `<img src="${backdropUrl}" alt="${title}" loading="lazy">`
            : `<div class="card-poster-placeholder">${title}</div>`}
          <div class="card-wide-overlay">
            ${rank ? `<div class="card-wide-rank">#${rank}</div>` : ''}
            <div class="card-wide-title">${title}</div>
            <div class="card-wide-meta">
              ${year} &bull; ${formatRating(rating)} ${starSvg()} &bull; ${type === 'tv' ? 'TV Series' : 'Movie'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderContinueCard(item) {
    const backdropUrl = API.backdrop(item.backdrop_path) || API.poster(item.poster_path);
    const title = item.title;
    const progress = item.progress || Math.floor(Math.random() * 70 + 10);
    const detail = item.media_type === 'tv' && item.season
      ? `S${item.season}:E${item.episode} ${item.episode_name || ''}`
      : '';

    return `
      <div class="card-wide" data-id="${item.id}" data-type="${item.media_type}" data-season="${item.season || ''}" data-episode="${item.episode || ''}">
        <div class="card-wide-poster-wrap">
          ${backdropUrl
            ? `<img src="${backdropUrl}" alt="${title}" loading="lazy">`
            : `<div class="card-poster-placeholder">${title}</div>`}
          <div class="card-wide-overlay">
            <div class="card-wide-title">${title}</div>
            <div class="card-wide-meta">${detail}</div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
          </div>
        </div>
      </div>
    `;
  }

  // Content Row
  function renderRow(title, items, renderFn = renderCard, extraArgs = false) {
    if (!items || items.length === 0) return '';
    const cards = items.map((item, i) => renderFn(item, extraArgs ? i + 1 : undefined)).join('');
    return `
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">${title}</h2>
        </div>
        <div class="content-row">${cards}</div>
      </section>
    `;
  }

  // Hero
  function renderHero(item) {
    if (!item) return '';
    const type = getMediaType(item);
    const title = getTitle(item);
    const backdropUrl = API.backdrop(item.backdrop_path);
    const rating = item.vote_average;
    const year = getYear(item);
    const overview = item.overview || '';

    return `
      <section class="hero" data-id="${item.id}" data-type="${type}">
        <div class="hero-backdrop">
          ${backdropUrl ? `<img src="${backdropUrl}" alt="${title}">` : ''}
        </div>
        <div class="hero-content">
          <div class="hero-badge">${type === 'tv' ? 'TV Series' : 'Movie'} &bull; Trending</div>
          <h1 class="hero-title">${title}</h1>
          <div class="hero-meta">
            <span class="hero-rating">${starSvg()} ${formatRating(rating)}</span>
            <span>${year}</span>
            ${type === 'tv' ? '' : ''}
          </div>
          <p class="hero-overview">${overview}</p>
          <div class="hero-buttons">
            <button class="btn-play" data-action="play">${playSvg(20)} Play</button>
            <button class="btn-info" data-action="info">${infoSvg()} More Info</button>
          </div>
        </div>
      </section>
    `;
  }

  // Home Page
  function renderHome(data) {
    const hero = data.trending && data.trending.length > 0
      ? renderHero(data.trending[0])
      : '';

    const continueWatching = Storage.getHistory();
    const continueSection = continueWatching.length > 0
      ? renderRow('Continue Watching', continueWatching.slice(0, 10), renderContinueCard)
      : '';

    return `
      ${hero}
      ${continueSection}
      ${renderRow('Trending Now', data.trending?.slice(1, 20), renderWideCard, true)}
      ${renderRow('Popular Movies', data.popularMovies)}
      ${renderRow('Popular TV Shows', data.popularTv)}
      ${renderRow('Top Rated', data.topRatedMovies)}
      ${renderRow('Now Playing in Theaters', data.nowPlaying)}
      ${renderRow('Upcoming', data.upcoming)}
    `;
  }

  // Browse Page (Movies or TV)
  function renderBrowse(title, subtitle, genres, items, activeGenre = null) {
    const genreChips = genres.map(g => `
      <button class="filter-chip ${activeGenre === g.id ? 'active' : ''}" data-genre="${g.id}">${g.name}</button>
    `).join('');

    const grid = items.map(item => renderCard(item)).join('');

    return `
      <div class="page-header">
        <h1 class="page-title">${title}</h1>
        <p class="page-subtitle">${subtitle}</p>
      </div>
      <div class="filter-bar">
        <button class="filter-chip ${!activeGenre ? 'active' : ''}" data-genre="">All</button>
        ${genreChips}
      </div>
      <div class="content-grid" id="contentGrid">${grid}</div>
      <div class="load-more" id="loadMore">
        <button class="btn-secondary btn-sm" id="loadMoreBtn">Load More</button>
      </div>
    `;
  }

  // Search Page
  function renderSearchPage(query, results) {
    if (!results || results.length === 0) {
      return `
        <div class="page-header">
          <h1 class="page-title">Search Results</h1>
          <p class="page-subtitle">${query ? `No results for "${query}"` : 'Start typing to search'}</p>
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

    const filtered = results.filter(r => r.media_type === 'movie' || r.media_type === 'tv');
    const grid = filtered.map(item => renderCard(item)).join('');

    return `
      <div class="page-header">
        <h1 class="page-title">Search Results</h1>
        <p class="page-subtitle">${filtered.length} results for "${query}"</p>
      </div>
      <div class="content-grid">${grid}</div>
    `;
  }

  // My List Page
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

    const grid = list.map(item => renderCard(item)).join('');
    return `
      <div class="page-header">
        <h1 class="page-title">My List</h1>
        <p class="page-subtitle">${list.length} saved items</p>
      </div>
      <div class="content-grid">${grid}</div>
    `;
  }

  // Detail Modal
  function renderDetailModal(item, type) {
    const title = getTitle(item);
    const year = getYear(item);
    const backdropUrl = API.backdrop(item.backdrop_path);
    const rating = item.vote_average;
    const overview = item.overview || 'No overview available.';
    const runtime = type === 'movie' ? formatRuntime(item.runtime) : '';
    const seasons = type === 'tv' ? `${item.number_of_seasons} Season${item.number_of_seasons !== 1 ? 's' : ''}` : '';
    const status = item.status || '';
    const genres = (item.genres || []).map(g => `<span class="genre-tag" data-genre="${g.id}" data-type="${type}">${g.name}</span>`).join('');

    const cast = (item.credits?.cast || []).slice(0, 12).map(person => `
      <div class="cast-item">
        ${API.profile(person.profile_path)
          ? `<img class="cast-photo" src="${API.profile(person.profile_path)}" alt="${person.name}" loading="lazy">`
          : `<div class="cast-photo" style="display:flex;align-items:center;justify-content:center;background:var(--bg-card);font-size:0.625rem;color:var(--text-muted)">${person.name.charAt(0)}</div>`
        }
        <div class="cast-name">${person.name}</div>
        <div class="cast-character">${person.character || ''}</div>
      </div>
    `).join('');

    const similar = (item.similar?.results || []).slice(0, 10).map(s => renderCard({ ...s, media_type: type })).join('');

    const trailer = (item.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');

    const inList = Storage.isInWatchlist(item.id, type);

    let episodeSection = '';
    if (type === 'tv' && item.seasons) {
      const mainSeasons = item.seasons.filter(s => s.season_number > 0);
      episodeSection = `
        <div class="season-selector">
          <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:12px">Episodes</h3>
          <select class="season-select" id="seasonSelect" data-tv-id="${item.id}">
            ${mainSeasons.map(s => `<option value="${s.season_number}">Season ${s.season_number} (${s.episode_count} episodes)</option>`).join('')}
          </select>
        </div>
        <div class="episode-list" id="episodeList">
          <div style="text-align:center;padding:20px"><div class="inline-spinner"></div></div>
        </div>
      `;
    }

    const details = [];
    if (item.production_companies?.length) details.push(`<p><span>Studio: </span>${item.production_companies[0].name}</p>`);
    if (item.original_language) details.push(`<p><span>Language: </span>${item.original_language.toUpperCase()}</p>`);
    if (item.budget) details.push(`<p><span>Budget: </span>$${(item.budget / 1e6).toFixed(0)}M</p>`);
    if (item.revenue) details.push(`<p><span>Revenue: </span>$${(item.revenue / 1e6).toFixed(0)}M</p>`);

    return `
      <div class="modal-backdrop">
        ${backdropUrl ? `<img src="${backdropUrl}" alt="${title}">` : ''}
        <div class="modal-backdrop-content">
          <h2 class="modal-title">${title}</h2>
          <div class="modal-actions">
            <button class="btn-play" data-action="play" data-id="${item.id}" data-type="${type}">${playSvg(18)} Play</button>
            ${trailer ? `<button class="btn-info" data-action="trailer" data-key="${trailer.key}">Trailer</button>` : ''}
            <button class="btn-info" data-action="watchlist" data-id="${item.id}" data-type="${type}">
              ${inList ? checkSvg() + ' In My List' : plusSvg() + ' Add to List'}
            </button>
          </div>
        </div>
      </div>
      <div class="modal-body-inner">
        <div class="modal-info-grid">
          <div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
              <span class="hero-rating">${starSvg()} ${formatRating(rating)}</span>
              <span style="color:var(--text-secondary)">${year}</span>
              ${runtime ? `<span style="color:var(--text-secondary)">${runtime}</span>` : ''}
              ${seasons ? `<span style="color:var(--text-secondary)">${seasons}</span>` : ''}
              ${status ? `<span style="color:var(--text-muted);font-size:0.8125rem">${status}</span>` : ''}
            </div>
            <p class="modal-overview">${overview}</p>
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

  // Episode List
  function renderEpisodes(episodes, tvId, seasonNum) {
    if (!episodes || episodes.length === 0) {
      return '<p style="color:var(--text-muted);padding:16px">No episodes available</p>';
    }

    return episodes.map(ep => {
      const thumbUrl = ep.still_path ? API.img(ep.still_path, 'w300') : null;
      return `
        <div class="episode-item" data-action="play-episode" data-tv-id="${tvId}" data-season="${seasonNum}" data-episode="${ep.episode_number}" data-name="${ep.name || ''}">
          <span class="episode-number">${ep.episode_number}</span>
          ${thumbUrl
            ? `<img class="episode-thumb" src="${thumbUrl}" alt="Episode ${ep.episode_number}" loading="lazy">`
            : `<div class="episode-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-card);color:var(--text-muted);font-size:0.75rem">Ep ${ep.episode_number}</div>`
          }
          <div class="episode-info">
            <div class="episode-name">${ep.name || `Episode ${ep.episode_number}`}</div>
            <div class="episode-desc">${ep.overview || ''}</div>
          </div>
          ${ep.runtime ? `<span class="episode-runtime">${formatRuntime(ep.runtime)}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  // Search dropdown results
  function renderSearchDropdown(results) {
    if (!results || results.length === 0) return '';
    const filtered = results.filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 8);
    return filtered.map(item => {
      const posterUrl = API.poster(item.poster_path, 'w92');
      const title = getTitle(item);
      const year = getYear(item);
      return `
        <div class="search-result-item" data-id="${item.id}" data-type="${item.media_type}">
          ${posterUrl
            ? `<img class="search-result-poster" src="${posterUrl}" alt="${title}" loading="lazy">`
            : `<div class="search-result-poster" style="display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--text-muted)">${title.charAt(0)}</div>`
          }
          <div class="search-result-info">
            <h4>${title}</h4>
            <p>${year}</p>
          </div>
          <span class="search-result-type">${item.media_type}</span>
        </div>
      `;
    }).join('');
  }

  // Setup screen
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
            <text x="10" y="26" font-family="Inter" font-weight="900" font-size="28" fill="url(#setupGrad)">STREAM</text>
            <text x="108" y="26" font-family="Inter" font-weight="300" font-size="28" fill="#f1f1f1">V</text>
          </svg>
          <h1>Welcome to StreamVault</h1>
          <p>Enter your free TMDB API key to get started. This powers all movie and TV metadata, posters, and search.</p>
          <ol class="setup-steps">
            <li>Go to <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener">themoviedb.org</a> and create a free account</li>
            <li>Navigate to Settings &rarr; API</li>
            <li>Request an API key (choose "Developer")</li>
            <li>Copy the "API Key (v3 auth)" and paste it below</li>
          </ol>
          <input type="text" class="settings-input" id="setupApiKey" placeholder="Paste your TMDB API key here">
          <div id="setupStatus" class="settings-status" style="margin-bottom:12px"></div>
          <button class="btn-primary" id="setupSaveBtn">Get Started</button>
        </div>
      </div>
    `;
  }

  // Toast
  function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  return {
    renderCard, renderWideCard, renderContinueCard, renderRow,
    renderHero, renderHome, renderBrowse, renderSearchPage,
    renderMyList, renderDetailModal, renderEpisodes, renderSearchDropdown,
    renderSetup, toast, getMediaType, getTitle, getYear, formatRating
  };
})();
