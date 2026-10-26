const App = (() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  let currentPage = 'home';
  let browseGenres = { movie: [], tv: [] };
  let browseState = { type: 'movie', genre: null, page: 1, loading: false };
  let searchDebounce = null;
  let currentDetail = null;

  // ===== INITIALIZATION =====
  async function init() {
    setupNavigation();
    setupSearch();
    setupSettings();
    setupModal();
    setupPlayer();
    setupScrollNav();

    if (!Storage.getApiKey()) {
      showSetup();
    } else {
      await loadHome();
    }
    hideLoading();
  }

  function hideLoading() {
    const overlay = $('#loadingOverlay');
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 500);
  }

  // ===== SETUP SCREEN =====
  function showSetup() {
    $('#app').innerHTML = UI.renderSetup();
    const btn = $('#setupSaveBtn');
    const input = $('#setupApiKey');
    const status = $('#setupStatus');

    btn.addEventListener('click', async () => {
      const key = input.value.trim();
      if (!key) {
        status.textContent = 'Please enter an API key';
        status.className = 'settings-status error';
        return;
      }
      btn.textContent = 'Validating...';
      btn.disabled = true;
      const valid = await API.validateKey(key);
      if (valid) {
        Storage.setApiKey(key);
        status.textContent = 'Key validated!';
        status.className = 'settings-status success';
        await loadHome();
      } else {
        status.textContent = 'Invalid API key. Please check and try again.';
        status.className = 'settings-status error';
        btn.textContent = 'Get Started';
        btn.disabled = false;
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });
  }

  // ===== NAVIGATION =====
  function setupNavigation() {
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('[data-navigate]');
      if (navLink) {
        e.preventDefault();
        const page = navLink.dataset.navigate;
        navigateTo(page);
      }
    });
  }

  function navigateTo(page) {
    currentPage = page;
    updateActiveNav(page);
    window.scrollTo(0, 0);

    switch (page) {
      case 'home': loadHome(); break;
      case 'movies': loadBrowse('movie'); break;
      case 'tv': loadBrowse('tv'); break;
      case 'mylist': loadMyList(); break;
      case 'search': focusSearch(); break;
    }
  }

  function updateActiveNav(page) {
    $$('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.navigate === page));
    $$('.mobile-nav-item').forEach(a => a.classList.toggle('active', a.dataset.navigate === page));
  }

  function setupScrollNav() {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const nav = $('#navbar');
      nav.classList.toggle('scrolled', window.scrollY > 50);
      lastScroll = window.scrollY;
    }, { passive: true });
  }

  // ===== HOME =====
  async function loadHome() {
    const app = $('#app');
    app.innerHTML = '<div style="padding-top:45vh;text-align:center"><div class="inline-spinner"></div></div>';
    try {
      const data = await API.getHomeData();
      app.innerHTML = UI.renderHome(data);
      setupCardListeners();
    } catch (err) {
      app.innerHTML = UI.renderError('Failed to load content', err.message, 'home');
    }
  }

  // ===== BROWSE =====
  async function loadBrowse(type) {
    browseState = { type, genre: null, page: 1, loading: false };

    if (browseGenres[type].length === 0) {
      try {
        const data = await API.genres(type);
        browseGenres[type] = data.genres || [];
      } catch { browseGenres[type] = []; }
    }

    await fetchBrowseContent();
  }

  async function fetchBrowseContent(append = false) {
    if (browseState.loading) return;
    browseState.loading = true;

    const { type, genre, page } = browseState;
    const app = $('#app');

    if (!append) {
      app.innerHTML = '<div style="padding-top:45vh;text-align:center"><div class="inline-spinner"></div></div>';
    }

    try {
      const params = { page, sort_by: 'popularity.desc' };
      if (genre) params.with_genres = genre;

      const data = await API.discover(type, params);
      const items = data.results || [];

      if (append) {
        const grid = $('#contentGrid');
        if (grid) grid.innerHTML += items.map(i => UI.renderCard({ ...i, media_type: type })).join('');
      } else {
        const title = type === 'movie' ? 'Movies' : 'TV Shows';
        const subtitle = type === 'movie' ? 'Browse our full movie catalog' : 'Discover TV series to binge';
        app.innerHTML = UI.renderBrowse(title, subtitle, browseGenres[type], items.map(i => ({ ...i, media_type: type })), genre);
      }

      setupCardListeners();
      setupFilterListeners();
      setupLoadMore(data.total_pages);
    } catch (err) {
      if (!append) {
        app.innerHTML = UI.renderError('Failed to load', err.message, type === 'tv' ? 'tv' : 'movies');
      }
    }
    browseState.loading = false;
  }

  function setupFilterListeners() {
    $$('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const genreId = chip.dataset.genre;
        browseState.genre = genreId ? parseInt(genreId) : null;
        browseState.page = 1;
        fetchBrowseContent();
      });
    });
  }

  function setupLoadMore(totalPages) {
    const btn = $('#loadMoreBtn');
    if (!btn) return;
    const container = $('#loadMore');

    if (browseState.page >= totalPages) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    btn.onclick = () => {
      browseState.page++;
      fetchBrowseContent(true);
    };
  }

  // ===== MY LIST =====
  function loadMyList() {
    $('#app').innerHTML = UI.renderMyList();
    setupCardListeners();
  }

  // ===== SEARCH =====
  function setupSearch() {
    const container = $('#searchContainer');
    const toggle = $('#searchToggle');
    const input = $('#searchInput');
    const results = $('#searchResults');

    toggle.addEventListener('click', () => {
      container.classList.toggle('active');
      if (container.classList.contains('active')) {
        input.focus();
      } else {
        input.value = '';
        results.classList.remove('visible');
      }
    });

    input.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      const query = input.value.trim();
      if (query.length < 2) {
        results.classList.remove('visible');
        return;
      }
      searchDebounce = setTimeout(async () => {
        try {
          const data = await API.search(query);
          results.innerHTML = UI.renderSearchDropdown(data.results);
          results.classList.add('visible');
          setupSearchResultListeners();
        } catch {}
      }, 350);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query) {
          results.classList.remove('visible');
          container.classList.remove('active');
          loadSearchResults(query);
        }
      }
      if (e.key === 'Escape') {
        container.classList.remove('active');
        input.value = '';
        results.classList.remove('visible');
      }
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        results.classList.remove('visible');
      }
    });
  }

  function focusSearch() {
    const container = $('#searchContainer');
    const input = $('#searchInput');
    container.classList.add('active');
    input.focus();
  }

  function setupSearchResultListeners() {
    $$('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        const type = item.dataset.type;
        openDetail(id, type);
        $('#searchResults').classList.remove('visible');
        $('#searchContainer').classList.remove('active');
        $('#searchInput').value = '';
      });
    });
  }

  async function loadSearchResults(query) {
    currentPage = 'search';
    const app = $('#app');
    app.innerHTML = '<div style="padding-top:45vh;text-align:center"><div class="inline-spinner"></div></div>';
    try {
      const data = await API.search(query);
      app.innerHTML = UI.renderSearchPage(query, data.results);
      setupCardListeners();
    } catch (err) {
      app.innerHTML = UI.renderSearchPage(query, []);
    }
  }

  // ===== CARD INTERACTIONS =====
  function setupCardListeners() {
    $$('.card, .card-wide').forEach(card => {
      card.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        const id = parseInt(card.dataset.id);
        const type = card.dataset.type;

        if (card.dataset.resume) {
          const entry = Storage.getHistory().find(h => h.id === id && h.media_type === type);
          playContent(id, type, card.dataset.season, card.dataset.episode, entry?.episode_name, entry);
        } else if (actionBtn) {
          e.stopPropagation();
          const action = actionBtn.dataset.action;
          if (action === 'play') {
            playContent(id, type);
          } else if (action === 'watchlist') {
            toggleWatchlist(id, type);
            const inList = Storage.isInWatchlist(id, type);
            actionBtn.classList.toggle('in-list', inList);
            actionBtn.title = inList ? 'Remove from list' : 'Add to list';
            actionBtn.innerHTML = UI.watchlistBtnInner(inList, false);
          } else if (action === 'info') {
            openDetail(id, type);
          }
        } else {
          openDetail(id, type);
        }
      });
    });

    // Hero buttons
    const hero = $('.hero');
    if (hero) {
      hero.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(hero.dataset.id);
          const type = hero.dataset.type;
          if (btn.dataset.action === 'play') {
            playContent(id, type);
          } else if (btn.dataset.action === 'info') {
            openDetail(id, type);
          }
        });
      });
    }
  }

  function toggleWatchlist(id, type) {
    if (Storage.isInWatchlist(id, type)) {
      Storage.removeFromWatchlist(id, type);
      UI.toast('Removed from My List', 'info');
    } else {
      Storage.addToWatchlist(UI.lookup(id, type) || { id, media_type: type, title: 'Untitled' });
      UI.toast('Added to My List', 'success');
    }
    if (currentPage === 'mylist') loadMyList();
  }

  // ===== DETAIL MODAL =====
  function setupModal() {
    const overlay = $('#detailModal');
    const closeBtn = $('#modalClose');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if ($('#playerOverlay').classList.contains('visible')) {
          closePlayer();
        } else if (overlay.classList.contains('visible')) {
          closeModal();
        }
      }
    });
  }

  async function openDetail(id, type) {
    const overlay = $('#detailModal');
    const body = $('#modalBody');

    overlay.classList.add('visible');
    body.innerHTML = '<div style="padding:80px;text-align:center"><div class="inline-spinner"></div></div>';

    try {
      const data = await API.details(type, id);
      currentDetail = data;
      body.innerHTML = UI.renderDetailModal(data, type);
      setupModalListeners(data, type);

      if (type === 'tv' && data.seasons?.length) {
        const firstSeason = data.seasons.find(s => s.season_number > 0);
        if (firstSeason) loadEpisodes(id, firstSeason.season_number);
      }
    } catch (err) {
      body.innerHTML = UI.renderError('Failed to load details', err.message);
    }
  }

  function setupModalListeners(item, type) {
    const body = $('#modalBody');

    body.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;

        if (action === 'play') {
          playContent(item.id, type);
          closeModal();
        } else if (action === 'watchlist') {
          toggleWatchlist(item.id, type);
          btn.innerHTML = UI.watchlistBtnInner(Storage.isInWatchlist(item.id, type), true);
        } else if (action === 'trailer') {
          openTrailer(btn.dataset.key);
        }
      });
    });

    // Season selector
    const seasonSelect = body.querySelector('#seasonSelect');
    if (seasonSelect) {
      seasonSelect.addEventListener('change', () => {
        const tvId = parseInt(seasonSelect.dataset.tvId);
        const seasonNum = parseInt(seasonSelect.value);
        loadEpisodes(tvId, seasonNum);
      });
    }

    // Cards within modal (similar section)
    body.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(card.dataset.id);
        const cardType = card.dataset.type;
        openDetail(id, cardType);
      });
    });

    // Genre tags
    body.querySelectorAll('.genre-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        closeModal();
        browseState.genre = parseInt(tag.dataset.genre);
        browseState.page = 1;
        browseState.type = tag.dataset.type || type;
        navigateTo(browseState.type === 'tv' ? 'tv' : 'movies');
      });
    });
  }

  async function loadEpisodes(tvId, seasonNum) {
    const list = $('#episodeList');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:20px"><div class="inline-spinner"></div></div>';

    try {
      const data = await API.tvSeasonDetails(tvId, seasonNum);
      list.innerHTML = UI.renderEpisodes(data.episodes, tvId, seasonNum);
      list.querySelectorAll('.episode-item').forEach(ep => {
        ep.addEventListener('click', () => {
          const season = parseInt(ep.dataset.season);
          const episode = parseInt(ep.dataset.episode);
          const name = ep.dataset.name;
          playContent(tvId, 'tv', season, episode, name);
          closeModal();
        });
      });
    } catch {
      list.innerHTML = '<p style="color:var(--text-muted);padding:16px">Failed to load episodes</p>';
    }
  }

  function closeModal() {
    $('#detailModal').classList.remove('visible');
    currentDetail = null;
  }

  function openTrailer(youtubeKey) {
    const overlay = $('#playerOverlay');
    const frame = $('#playerFrame');
    const title = $('#playerTitle');
    const sources = $('#playerSources');

    title.textContent = 'Trailer';
    sources.innerHTML = '';
    applySandbox(frame);
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeKey)}?autoplay=1&rel=0`;
    overlay.classList.add('visible');
  }

  // No allow-popups / allow-top-navigation: blocks the ad tabs and redirect hijacks embed hosts use.
  const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-presentation';
  function applySandbox(frame) {
    if (Storage.getBlockPopups()) frame.setAttribute('sandbox', SANDBOX);
    else frame.removeAttribute('sandbox');
  }

  // ===== PLAYER =====
  function setupPlayer() {
    $('#playerBack').addEventListener('click', closePlayer);
  }

  function playContent(id, type, season, episode, episodeName, meta) {
    const overlay = $('#playerOverlay');
    const frame = $('#playerFrame');
    const titleEl = $('#playerTitle');
    const sourcesEl = $('#playerSources');
    const enabled = Providers.getEnabled();

    if (enabled.length === 0) {
      UI.toast('All sources are disabled. Enable one in Settings.', 'error');
      return;
    }

    const info = meta || UI.lookup(id, type) || { title: '' };

    if (type === 'tv') {
      season = parseInt(season) || 1;
      episode = parseInt(episode) || 1;
    }

    let label = info.title || '';
    if (type === 'tv') {
      label += ` S${season}:E${episode}`;
      if (episodeName) label += ` - ${episodeName}`;
    }
    titleEl.textContent = label;

    const urlFor = src => (type === 'tv' ? src.tvUrl(id, season, episode) : src.movieUrl(id));
    const preferredIdx = Math.max(0, enabled.findIndex(s => s.id === Storage.getPreferredSource()));

    sourcesEl.innerHTML = enabled.map((src, i) => `
      <button class="source-btn ${i === preferredIdx ? 'active' : ''}" data-source-idx="${i}" title="${UI.esc(src.note || '')}">${UI.esc(src.name)}</button>
    `).join('');

    applySandbox(frame);
    frame.src = urlFor(enabled[preferredIdx]);
    overlay.classList.add('visible');

    sourcesEl.querySelectorAll('.source-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sourcesEl.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        frame.src = urlFor(enabled[parseInt(btn.dataset.sourceIdx)]);
      });
    });

    Storage.addToHistory({
      id, media_type: type,
      title: info.title,
      poster_path: info.poster_path,
      backdrop_path: info.backdrop_path,
      vote_average: info.vote_average,
      season: type === 'tv' ? season : undefined,
      episode: type === 'tv' ? episode : undefined,
      episode_name: episodeName
    });
  }

  function closePlayer() {
    const overlay = $('#playerOverlay');
    const frame = $('#playerFrame');
    frame.src = '';
    overlay.classList.remove('visible');
  }

  // ===== SETTINGS =====
  function setupSettings() {
    const overlay = $('#settingsOverlay');
    const openBtn = $('#settingsBtn');
    const closeBtn = $('#settingsClose');

    openBtn.addEventListener('click', () => {
      populateSettings();
      overlay.classList.add('visible');
    });

    closeBtn.addEventListener('click', () => overlay.classList.remove('visible'));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('visible');
    });

    // Save API key
    $('#saveApiKey').addEventListener('click', async () => {
      const input = $('#apiKeyInput');
      const status = $('#apiKeyStatus');
      const key = input.value.trim();

      if (!key) {
        status.textContent = 'Please enter a key';
        status.className = 'settings-status error';
        return;
      }

      status.textContent = 'Validating...';
      status.className = 'settings-status';
      const valid = await API.validateKey(key);
      if (valid) {
        Storage.setApiKey(key);
        status.textContent = 'API key saved and validated';
        status.className = 'settings-status success';
        if (currentPage === 'home') loadHome();
      } else {
        status.textContent = 'Invalid API key';
        status.className = 'settings-status error';
      }
    });

    // Preferred source
    $('#preferredSource').addEventListener('change', (e) => {
      Storage.setPreferredSource(e.target.value);
    });

    // Toggles
    $('#adultContent').addEventListener('change', (e) => Storage.setAdultContent(e.target.checked));
    $('#blockPopups').addEventListener('change', (e) => Storage.setBlockPopups(e.target.checked));

    // Export
    $('#exportData').addEventListener('click', () => {
      const data = Storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'streamvault-watchlist.json';
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('Watchlist exported', 'success');
    });

    // Import
    $('#importData').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            Storage.importData(ev.target.result);
            UI.toast('Watchlist imported', 'success');
            if (currentPage === 'mylist') loadMyList();
          } catch {
            UI.toast('Invalid file format', 'error');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });

    // Clear data
    $('#clearData').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
        Storage.clearAll();
        UI.toast('All data cleared', 'info');
        if (currentPage === 'mylist') loadMyList();
      }
    });
  }

  function populateSettings() {
    const apiInput = $('#apiKeyInput');
    apiInput.value = Storage.getApiKey();

    // Source selector
    const select = $('#preferredSource');
    const sources = Providers.getAll();
    select.innerHTML = sources.map(s => `<option value="${s.id}">${s.name}${s.reliable ? '' : ' (unstable)'}</option>`).join('');
    select.value = sources.some(s => s.id === Storage.getPreferredSource()) ? Storage.getPreferredSource() : sources[0].id;

    // Source list
    const list = $('#sourceList');
    const disabled = Storage.getDisabledSources();
    list.innerHTML = sources.map(s => `
      <div class="source-item" data-source-id="${s.id}">
        <span class="drag-handle">&#9776;</span>
        <span class="source-name">${s.name}</span>
        <label style="display:flex;align-items:center">
          <input type="checkbox" class="toggle-input source-toggle" data-source-id="${s.id}" ${!disabled.includes(s.id) ? 'checked' : ''}>
          <span class="toggle-slider" style="width:36px;height:20px"></span>
        </label>
      </div>
    `).join('');

    list.querySelectorAll('.source-toggle').forEach(toggle => {
      toggle.addEventListener('change', () => {
        const sourceId = toggle.dataset.sourceId;
        let dis = Storage.getDisabledSources();
        if (toggle.checked) {
          dis = dis.filter(d => d !== sourceId);
        } else {
          dis.push(sourceId);
        }
        Storage.setDisabledSources(dis);
      });
    });

    // Drag-and-drop for source ordering
    setupDragDrop(list);

    // Toggles
    $('#adultContent').checked = Storage.getAdultContent();
    $('#blockPopups').checked = Storage.getBlockPopups();
  }

  function setupDragDrop(container) {
    let dragItem = null;

    container.querySelectorAll('.source-item').forEach(item => {
      item.draggable = true;

      item.addEventListener('dragstart', () => {
        dragItem = item;
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        const order = [...container.querySelectorAll('.source-item')].map(i => i.dataset.sourceId);
        Storage.setSourceOrder(order);
        dragItem = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragItem && dragItem !== item) {
          const rect = item.getBoundingClientRect();
          const mid = rect.top + rect.height / 2;
          if (e.clientY < mid) {
            container.insertBefore(dragItem, item);
          } else {
            container.insertBefore(dragItem, item.nextSibling);
          }
        }
      });
    });
  }

  // ===== KEYBOARD SHORTCUTS =====
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === '/' || e.key === 's') {
      e.preventDefault();
      focusSearch();
    }
  });

  // ===== BOOT =====
  document.addEventListener('DOMContentLoaded', init);

  return { navigateTo, openDetail, playContent };
})();
