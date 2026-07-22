const API = '';
let _currentPage = 'landing';
let _lastNonGuidePage = 'landing';

// ─────────────────────────────────────
// PAGE NAVIGATION
// ─────────────────────────────────────
function goTo(page) {
  if (page !== _currentPage) {
    if (_currentPage && _currentPage !== 'guide') {
      _lastNonGuidePage = _currentPage;
    }
    _currentPage = page;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  const navbar = document.getElementById('navbar');
  navbar.style.display = (page === 'landing' || page === 'login' || page === 'signup') ? 'none' : 'flex';
  const robo = document.getElementById('guide-robo-launcher');
  const popup = document.getElementById('guide-robo-popup');
  if (robo) robo.style.display = page === 'guide' ? 'flex' : 'none';
  if (popup && page !== 'guide') popup.style.display = 'none';
  if (page !== 'guide') closeGuideExplore();

  if (page === 'history') loadHistory();
  if (page === 'admin')   loadAdminPackages();
  if (page === 'guide')   initGuideChat();
}

function goBackFromGuide() {
  goTo(_lastNonGuidePage && _lastNonGuidePage !== 'guide' ? _lastNonGuidePage : 'home');
}

// ─────────────────────────────────────
// TOAST
// ─────────────────────────────────────
let _toastTimer = null;
function getToastTheme(type = 'success') {
  if (type === 'error') {
    return { color: '#e74c3c', icon: 'fas fa-exclamation-circle' };
  }
  if (type === 'warning') {
    return { color: 'var(--gold)', icon: 'fas fa-exclamation-triangle' };
  }
  if (type === 'info') {
    return { color: 'var(--sky)', icon: 'fas fa-info-circle' };
  }
  return { color: 'var(--teal)', icon: 'fas fa-check-circle' };
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  const m = document.getElementById('toast-msg');
  if (!t || !m) return;
  const theme = getToastTheme(type);

  m.textContent = msg;
  t.style.borderColor = theme.color;
  t.style.color = theme.color;
  t.querySelector('i').className = theme.icon;

  t.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ─────────────────────────────────────
// LOADING OVERLAY
// ─────────────────────────────────────
function showLoading() {
  const overlay = document.getElementById('loading');
  if (!overlay) return;
  overlay.classList.add('show');

  // Reset steps
  ['step1','step2','step3','step4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('done');
      el.querySelector('i').className = id === 'step1' ? 'fas fa-circle-notch fa-spin' : 'fas fa-clock';
    }
  });

  // Animate steps
  const delays = [400, 900, 1500, 2200];
  ['step1','step2','step3','step4'].forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('done');
        el.querySelector('i').className = 'fas fa-check-circle';
      }
    }, delays[i]);
  });
}

function hideLoading() {
  const overlay = document.getElementById('loading');
  if (overlay) overlay.classList.remove('show');
}

// ─────────────────────────────────────
// AUTH
// ─────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;

  if (!username || !password) return showToast('Enter username and password', 'error');

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      setLoggedUser(data.username, data.role);
      goTo('home');
      showToast(`Welcome back, ${data.username}! ✈️`);
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Cannot connect to server', 'error');
  }
}

async function doSignup() {
  const username = document.getElementById('signup-user').value.trim();
  const password = document.getElementById('signup-pass').value;

  if (!username || !password) return showToast('Fill all fields', 'error');

  try {
    const res = await fetch(`${API}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      setLoggedUser(data.username, 'user');
      goTo('home');
      showToast(`Account created! Welcome, ${data.username} 🎉`);
    } else {
      showToast(data.message || 'Signup failed', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Cannot connect to server', 'error');
  }
}

async function doLogout() {
  try {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) { /* ignore */ }
  goTo('landing');
  showToast('Logged out successfully');
}

function setLoggedUser(username, role) {
  const avatarEl   = document.getElementById('nav-avatar');
  const usernameEl = document.getElementById('nav-username');
  const adminBtn   = document.getElementById('admin-nav-btn');

  if (avatarEl)   avatarEl.textContent   = username.charAt(0).toUpperCase();
  if (usernameEl) usernameEl.textContent = username;
  if (adminBtn)   adminBtn.style.display = (role === 'admin') ? 'inline-flex' : 'none';
}

// ─────────────────────────────────────
// TRIP TYPE SELECTOR
// ─────────────────────────────────────
function selectTripType(type, btn) {
  document.querySelectorAll('.trip-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('trip-type').value = type;

  // Auto-set adults for solo/honeymoon
  const adultsEl = document.getElementById('adults');
  if (type === 'Solo' && adultsEl)      adultsEl.value = '1';
  if (type === 'Honeymoon' && adultsEl) adultsEl.value = '2';
}

function syncAdultsToTripType() {
  const adults = parseInt(document.getElementById('adults')?.value || 2);
  const tripType = document.getElementById('trip-type')?.value;

  if (adults === 1) {
    selectTripType('Solo', document.getElementById('tt-solo'));
  } else if (adults === 2 && tripType === 'Solo') {
    selectTripType('Friends', document.getElementById('tt-friends'));
  }
}

// ─────────────────────────────────────
// TABS
// ─────────────────────────────────────
function switchTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const tabEl = document.getElementById('tab-' + tab);
  if (tabEl) tabEl.classList.add('active');
}

// ─────────────────────────────────────
// ITINERARY ACCORDION
// ─────────────────────────────────────
function toggleDay(header) {
  const body   = header.nextElementSibling;
  const toggle = header.querySelector('.day-toggle i');
  const isOpen = body.style.display !== 'none';

  body.style.display = isOpen ? 'none' : 'block';
  if (toggle) toggle.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

// ─────────────────────────────────────
// SEARCH (wraps doSearch with loading)
// ─────────────────────────────────────
const _origDoSearch = window.doSearch;  // will be defined below

async function logAffiliateClick(provider, dest) {
  try {
    await fetch(`${API}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ provider, destination: dest })
    });
  } catch (err) {
    console.error('Affiliate click logging failed:', err);
  }
}

async function handleBookingClick(event, provider, dest, url) {
  if (!url || url.trim() === '') {
    event.preventDefault();
    showToast('Booking link not available for this package', 'error');
    return false;
  }

  await logAffiliateClick(provider, dest);
  showToast(`Opening ${provider}... 🔗`);
  return true;
}

function renderFallbackLinks(dest, budget, days, adults, tripType, links, dateShow) {
  const grid = document.getElementById('pkg-grid');
  grid.innerHTML = buildFallbackCards(dest, budget, days, adults, tripType, links, dateShow);
}

function buildFallbackCards(dest, budget, days, adults, tripType, links, dateShow, startIndex = 0, heading = '') {
  if (!links || links.length === 0) return '';

  const siteColors = {
    makemytrip: { bg: 'linear-gradient(135deg,#e91e8c,#f44336)', label: 'MakeMyTrip' },
    goibibo:    { bg: 'linear-gradient(135deg,#e91e63,#9c27b0)', label: 'Goibibo' },
    yatra:      { bg: 'linear-gradient(135deg,#ff6d00,#ffa000)', label: 'Yatra' },
    cleartrip:  { bg: 'linear-gradient(135deg,#0080ff,#00c6ff)', label: 'Cleartrip' },
    easemytrip: { bg: 'linear-gradient(135deg,#00897b,#26a69a)', label: 'EaseMyTrip' },
    thomascook: { bg: 'linear-gradient(135deg,#1a237e,#283593)', label: 'Thomas Cook' },
  };

  const ttEmoji = { Honeymoon:'💑', Family:'👨‍👩‍👧‍👦', Friends:'👫', Solo:'🧳' };

  const cards = links.map((l, i) => {
    const site = siteColors[l.cls] || { bg: 'linear-gradient(135deg,#333,#555)', label: l.name };
    return `
      <div class="pkg-card" style="animation-delay:${(startIndex + i) * 0.08}s">
        <!-- Site header banner -->
        <div style="background:${site.bg};padding:14px 20px;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:1.1rem;font-weight:800;color:#fff">${l.icon} ${l.name}</div>
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.8);background:rgba(0,0,0,0.2);padding:4px 10px;border-radius:20px">
            Live Packages
          </div>
        </div>

        <div class="card-body" style="padding:16px 20px">
          <div class="stats-row">
            <div class="stat">
              <i class="fas fa-map-marker-alt"></i>
              <div class="val" style="font-size:0.82rem">${dest}</div>
              <div class="lbl">Destination</div>
            </div>
            <div class="stat">
              <i class="fas fa-calendar-alt"></i>
              <div class="val">${days}D/${days-1}N</div>
              <div class="lbl">Duration</div>
            </div>
            <div class="stat">
              <i class="fas fa-users"></i>
              <div class="val">${adults}</div>
              <div class="lbl">Adults</div>
            </div>
          </div>

          <div style="margin-top:10px;padding:10px 14px;background:rgba(0,194,255,0.06);border:1px solid rgba(0,194,255,0.15);border-radius:10px;font-size:0.8rem;color:var(--text)">
            ${ttEmoji[tripType] || '✈️'} <b style="color:var(--white)">${tripType}</b> &nbsp;•&nbsp;
            💰 Budget: <b style="color:var(--teal)">₹${Number(budget).toLocaleString('en-IN')}/person</b>
            ${dateShow ? `&nbsp;•&nbsp; 📅 <b style="color:var(--white)">${dateShow}</b>` : ''}
          </div>

          <div style="margin-top:10px;font-size:0.78rem;color:var(--text);text-align:center">
            Click below to see available packages matching your search
          </div>
        </div>

        <div class="card-footer">
          <a class="btn-book"
             href="${l.url}"
             target="_blank"
             rel="noopener noreferrer"
             onclick="return handleBookingClick(event, '${l.name}', '${dest}', '${l.url}')"
             style="background:${site.bg};border:none;color:#fff">
            <i class="fas fa-external-link-alt"></i> Search on ${l.name}
          </a>
        </div>
      </div>
    `;
  }).join('');

  if (!heading) return cards;

  return `
    <div style="grid-column:1/-1;margin-bottom:-4px">
      <div style="font-size:0.82rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--sky)">
        ${heading}
      </div>
    </div>
    ${cards}
  `;
}

function renderResults(dest, budget, days, ttype, packages, itinerary, fallbackLinks = []) {
  const adults = parseInt(document.getElementById('adults')?.value) || 2;
  const tripType = document.getElementById('trip-type')?.value || 'Friends';
  const dateVal = document.getElementById('travel-date')?.value;
  const fromCity = document.getElementById('from-city')?.value.trim() || '';

  let dateShow = '';
  if (dateVal) {
    dateShow = new Date(dateVal + 'T00:00:00')
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const ttEmoji = { Honeymoon:'💑', Family:'👨‍👩‍👧‍👦', Friends:'👫', Solo:'🧳' };

  document.getElementById('results-title').innerHTML =
    `Recommendations for <span style="color:var(--sky)">${dest}</span>`;

  document.getElementById('results-sub').innerHTML =
    `AI search completed &nbsp;•&nbsp;`
    + `${ttEmoji[tripType] || '✈️'} ${tripType} &nbsp;•&nbsp; 👥 ${adults} Adult${adults > 1 ? 's' : ''}`
    + (dateShow ? ` &nbsp;•&nbsp; 📅 ${dateShow}` : '')
    ;

  const grid = document.getElementById('pkg-grid');

  if (!packages || packages.length === 0) {
    renderFallbackLinks(dest, budget, days, adults, tripType, fallbackLinks, dateShow);
  } else {
    const packageCards = packages.map((pkg, i) => {
      const ttIcon = tripType === 'Honeymoon' ? 'fa-heart'
                   : tripType === 'Family' ? 'fa-home'
                   : tripType === 'Solo' ? 'fa-user'
                   : 'fa-users';

      return `
        <div class="pkg-card ${i === 0 ? 'best-match' : ''}">
          ${i === 0 ? `<div class="best-badge">BEST MATCH</div>` : ''}

          <div class="card-head">
            <div>
              <div class="provider-line">${pkg.provider}</div>
              <h3>${pkg.package_name}</h3>
              <p>${pkg.destination}</p>
            </div>
            <div class="price-box">
              <div class="price">₹${Number(pkg.price).toLocaleString('en-IN')}</div>
              <div class="per-person">per person</div>
            </div>
          </div>

          <div class="card-body">
            <div class="stats-row">
              <div class="stat">
                <i class="fas fa-calendar-alt"></i>
                <div class="val">${pkg.days}D / ${pkg.nights}N</div>
                <div class="lbl">Duration</div>
              </div>
              <div class="stat">
                <i class="fas fa-map"></i>
                <div class="val">${pkg.travel_type}</div>
                <div class="lbl">Type</div>
              </div>
              <div class="stat">
                <i class="fas ${ttIcon}"></i>
                <div class="val" style="font-size:0.78rem">${tripType}</div>
                <div class="lbl">${adults} Adult${adults > 1 ? 's' : ''}</div>
              </div>
            </div>

            <div class="stars">
              ${[...Array(Math.floor(pkg.rating))].map(() => '<i class="fas fa-star"></i>').join('')}
              ${pkg.rating % 1 >= 0.5 ? '<i class="fas fa-star-half-alt"></i>' : ''}
              <span>${pkg.rating}/5.0</span>
            </div>

            <div class="score-row">
              <span class="score-lbl">AI Score</span>
              <div class="score-bar">
                <div class="score-fill" style="width:${pkg.match_pct}%"></div>
              </div>
              <span class="score-num">${pkg.ai_score}/100</span>
            </div>

            ${dateShow ? `<div style="margin-top:8px;font-size:0.78rem;color:var(--text)">📅 Travel date: <b style="color:var(--white)">${dateShow}</b></div>` : ''}
          </div>

          <div class="card-footer">
            <a class="btn-book ${i === 0 ? 'btn-book-gold' : ''}"
               href="${pkg.booking_url || '#'}"
               target="_blank"
               rel="noopener noreferrer"
               onclick="return handleBookingClick(event, '${pkg.provider}', '${dest}', '${pkg.booking_url || ''}')">
              <i class="fas fa-external-link-alt"></i> Book on ${pkg.provider}
            </a>
          </div>
        </div>
      `;
    }).join('');

    const secondaryLinks = (fallbackLinks || []).slice(0, Math.max(0, 5 - packages.length));
    const fallbackCards = secondaryLinks.length > 0
      ? buildFallbackCards(dest, budget, days, adults, tripType, secondaryLinks, dateShow, packages.length, 'More Package Options')
      : '';

    grid.innerHTML = packageCards + fallbackCards;
  }

  renderItinerary(itinerary, budget);
  document.getElementById('results-section').style.display = 'block';

  setTimeout(() => {
    document.getElementById('results-section')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Activate itinerary tab first (index 0), packages second
  // Itinerary is tab index 0, Packages is tab index 1
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('.tab-content').forEach((c, i) => c.classList.toggle('active', i === 0));

  showToast(
    packages && packages.length > 0
      ? `Found ${packages.length} matching packages for ${dest}! 🎯`
      : `Trip plan ready! Check packages tab for booking options 🗺️`
  );
}

function renderItinerary(itinerary, userBudget) {
  const b = itinerary.budget || {};

  const total = Number(b.total || 0);
  const hotel = Number(b.hotel || 0);
  const food = Number(b.food || 0);
  const travel = Number(b.travel || 0);
  const activities = Number(b.activities || 0);
  const saved = userBudget - total;

  document.getElementById('total-cost').textContent = '₹' + total.toLocaleString('en-IN');
  document.getElementById('saved-amount').innerHTML = saved >= 0
    ? `✅ You save ₹${saved.toLocaleString('en-IN')} from your budget`
    : `⚠️ ₹${Math.abs(saved).toLocaleString('en-IN')} over your budget — try reducing days`;

  document.getElementById('saved-amount').style.color = saved >= 0 ? 'var(--teal)' : '#e74c3c';

  document.getElementById('b-hotel').textContent = '₹' + hotel.toLocaleString('en-IN');
  document.getElementById('b-food').textContent = '₹' + food.toLocaleString('en-IN');
  document.getElementById('b-travel').textContent = '₹' + travel.toLocaleString('en-IN');
  document.getElementById('b-act').textContent = '₹' + activities.toLocaleString('en-IN');

  const wEl = document.getElementById('weather-card');
  if (wEl) {
    const w = itinerary.weather;

    if (w) {
      wEl.style.display = 'flex';
      wEl.innerHTML = `
        <div style="flex:1">
          <div style="font-size:1.3rem;font-weight:700;color:var(--sky)">
            ${w.temp}°C
            <span style="font-size:0.85rem;font-weight:400;color:var(--text);text-transform:capitalize">
              &nbsp;${w.description || w.condition || ''}
            </span>
          </div>
          <div style="font-size:0.78rem;color:var(--text);margin-top:2px">
            Current weather in destination
          </div>
        </div>`;
    } else {
      wEl.style.display = 'none';
    }
  }

  // Load day-wise photos of itinerary places in Guide page
  const _dest = document.getElementById('dest')?.value || '';
  if (_dest) setTimeout(() => loadItineraryPhotos(_dest, itinerary.days || []), 800);

  document.getElementById('itinerary-days').innerHTML = (itinerary.days || []).map((day, i) => `
    <div class="day-card" style="animation-delay:${i * 0.1}s">
      <div class="day-header" onclick="toggleDay(this)">
        <div class="day-num">D${i + 1}</div>
        <div>
          <div class="day-title">${day.title}</div>
          <div class="day-subtitle">${day.slots.length} activities</div>
        </div>
        <div class="day-toggle"><i class="fas fa-chevron-down"></i></div>
      </div>
      <div class="day-body">
        ${day.slots.map(slot => `
          <div class="slot">
            <div class="slot-time ${slot.time.toLowerCase()}">${slot.icon}</div>
            <div class="slot-info">
              <div class="slot-period">${slot.time}</div>
              <div class="slot-name">${slot.name}</div>
              <div class="slot-desc">${slot.desc}</div>
            </div>
            ${slot.rating ? `<div class="slot-rating"><i class="fas fa-star"></i> ${slot.rating}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

async function doSearch() {
  const destination = document.getElementById('dest').value.trim();
  const budget = parseInt(document.getElementById('budget').value);
  const days = parseInt(document.getElementById('days').value);
  const travel_type = document.getElementById('ttype').value;
  const adults = parseInt(document.getElementById('adults')?.value || 2);
  const trip_category = document.getElementById('trip-type')?.value || 'Friends';
  const travel_date = document.getElementById('travel-date')?.value || '';
  const from_city = document.getElementById('from-city')?.value.trim() || '';

  if (!destination || !budget || !days || !travel_type) {
    return showToast('Please fill all required fields', 'error');
  }

  showLoading();

  try {
    const res = await fetch(`${API}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        destination,
        budget,
        days,
        travel_type,
        adults,
        trip_category,
        travel_date,
        from_city
      })
    });

    const data = await res.json();
    hideLoading();

    if (!data.success) {
      return showToast(data.message || 'Search failed', 'error');
    }

    renderResults(
      destination,
      budget,
      days,
      travel_type,
      data.packages || [],
      data.itinerary || {},
      data.fallback_links || []
    );
  } catch (err) {
    hideLoading();
    console.error(err);
    showToast('Cannot connect to server', 'error');
  }
}

// ─────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────
async function loadHistory() {
  const tbody = document.getElementById('history-body');
  const empty = document.getElementById('history-empty');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text)">Loading...</td></tr>';

  try {
    const res = await fetch(`${API}/history`, { credentials: 'include' });
    const data = await res.json();

    if (!data.success || !data.history || data.history.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = data.history.map((row, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><b style="color:var(--white)">${row.destination}</b></td>
        <td>₹${Number(row.budget).toLocaleString('en-IN')}</td>
        <td>${row.days} days</td>
        <td><span class="type-chip">${row.travel_type}</span></td>
        <td style="color:var(--text);font-size:0.82rem">${row.searched_at}</td>
        <td>
          <button class="btn-again" onclick="repeatSearch('${row.destination}','${row.budget}','${row.days}','${row.travel_type}')">
            Search Again
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#e74c3c">Failed to load history</td></tr>';
  }
}

function repeatSearch(dest, budget, days, ttype) {
  document.getElementById('dest').value    = dest;
  document.getElementById('budget').value  = budget;
  document.getElementById('days').value    = days;
  document.getElementById('ttype').value   = ttype;
  goTo('home');
  setTimeout(doSearch, 200);
}

// ─────────────────────────────────────
// ADMIN PAGE
// ─────────────────────────────────────
let adminPackagesCache = [];
let editingPackageId = null;

function setAdminFormMode(isEditing, pkg = null) {
  const title = document.getElementById('admin-form-title');
  const subtitle = document.getElementById('admin-form-subtitle');
  const saveBtn = document.getElementById('admin-save-btn');
  const cancelBtn = document.getElementById('admin-cancel-btn');

  if (!title || !subtitle || !saveBtn || !cancelBtn) return;

  if (isEditing && pkg) {
    title.innerHTML = '<i class="fas fa-pen"></i> Edit Package';
    subtitle.textContent = `Updating ${pkg.destination} package details.`;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    cancelBtn.style.display = 'inline-flex';
  } else {
    title.innerHTML = '<i class="fas fa-plus-circle"></i> Add Package';
    subtitle.textContent = 'Create a new package for recommendations.';
    saveBtn.innerHTML = '<i class="fas fa-plus"></i> Add Package';
    cancelBtn.style.display = 'none';
  }
}

function clearAdminFormInputs() {
  ['a-provider','a-dest','a-price','a-days','a-rating','a-url'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const typeEl = document.getElementById('a-type');
  if (typeEl) typeEl.value = 'Beach';
}

function resetAdminForm() {
  editingPackageId = null;
  clearAdminFormInputs();
  setAdminFormMode(false);
}

function startEditPackage(id) {
  const pkg = adminPackagesCache.find(p => Number(p.id) === Number(id));
  if (!pkg) {
    showToast('Package not found', 'error');
    return;
  }

  editingPackageId = Number(id);
  document.getElementById('a-provider').value = pkg.provider || '';
  document.getElementById('a-dest').value = pkg.destination || '';
  document.getElementById('a-price').value = pkg.price_per_person || '';
  document.getElementById('a-days').value = pkg.days || '';
  document.getElementById('a-type').value = pkg.travel_type || 'Beach';
  document.getElementById('a-rating').value = pkg.rating || '';
  document.getElementById('a-url').value = pkg.booking_url || '';
  setAdminFormMode(true, pkg);
  document.getElementById('page-admin')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getAdminFormPayload() {
  return {
    provider: document.getElementById('a-provider').value.trim(),
    destination: document.getElementById('a-dest').value.trim(),
    price: document.getElementById('a-price').value,
    days: document.getElementById('a-days').value,
    travel_type: document.getElementById('a-type').value,
    rating: document.getElementById('a-rating').value,
    url: document.getElementById('a-url').value.trim()
  };
}

async function loadAdminPackages() {
  const tbody = document.getElementById('admin-tbody');
  const countEl = document.getElementById('pkg-count');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text)">Loading...</td></tr>';

  try {
    const res = await fetch(`${API}/admin/packages`, { credentials: 'include' });
    const data = await res.json();

    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#e74c3c">${data.message || 'Access denied'}</td></tr>`;
      return;
    }

    const pkgs = data.packages || [];
    adminPackagesCache = pkgs;
    if (countEl) countEl.textContent = pkgs.length;

    if (editingPackageId && !pkgs.some(p => Number(p.id) === Number(editingPackageId))) {
      resetAdminForm();
    }

    if (pkgs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text);padding:20px">No packages yet</td></tr>';
      return;
    }

    tbody.innerHTML = pkgs.map(p => `
      <tr>
        <td>${p.provider}</td>
        <td>${p.destination}</td>
        <td>₹${Number(p.price_per_person).toLocaleString('en-IN')}</td>
        <td>${p.days}D</td>
        <td><span class="type-chip">${p.travel_type}</span></td>
        <td>⭐ ${p.rating}</td>
        <td>
          <div class="admin-actions">
            <button class="btn-edit" onclick="startEditPackage(${p.id})">Edit</button>
            <button class="btn-del" onclick="deletePackage(${p.id})">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#e74c3c">Failed to load packages</td></tr>';
  }
}

async function savePackage() {
  const payload = getAdminFormPayload();

  if (!payload.provider || !payload.destination || !payload.price || !payload.days || !payload.url) {
    return showToast('Fill all fields', 'error');
  }

  try {
    const isEditing = editingPackageId !== null;
    const res = await fetch(isEditing ? `${API}/admin/packages/${editingPackageId}` : `${API}/admin/packages`, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      showToast(isEditing ? 'Package updated ✅' : 'Package added ✅');
      resetAdminForm();
      loadAdminPackages();
    } else {
      showToast(data.message || (isEditing ? 'Failed to update package' : 'Failed to add package'), 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server', 'error');
  }
}

async function addPackage() {
  return savePackage();
}

async function deletePackage(id) {
  if (!confirm('Delete this package?')) return;

  try {
    const res = await fetch(`${API}/admin/packages/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();

    if (data.success) {
      showToast('Package deleted');
      if (Number(editingPackageId) === Number(id)) {
        resetAdminForm();
      }
      loadAdminPackages();
    } else {
      showToast(data.message || 'Delete failed', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server', 'error');
  }
}

// ─────────────────────────────────────
// RENDER LIVE PACKAGES FROM MMT/GOIBIBO
// ─────────────────────────────────────
function renderLivePackages(livePackages, fallbackLinks, dest, budget, days, adults, tripType, dateShow) {
  const grid = document.getElementById('pkg-grid');

  if (livePackages && livePackages.length > 0) {
    // Show real package cards fetched from MMT/Goibibo
    const cards = livePackages.map((pkg, i) => {
      const stars = Math.floor(pkg.rating || 4);
      const srcBadgeColor = pkg.cls === 'makemytrip'
        ? 'linear-gradient(135deg,#e91e8c,#f44336)'
        : 'linear-gradient(135deg,#e91e63,#9c27b0)';

      return `
        <div class="pkg-card ${i === 0 ? 'best-match' : ''}" style="animation-delay:${i*0.1}s">
          ${i === 0 ? '<div class="best-badge">BEST MATCH</div>' : ''}

          ${pkg.image ? `
            <div style="width:100%;height:160px;overflow:hidden;border-bottom:1px solid var(--border)">
              <img src="${pkg.image}" alt="${pkg.name}"
                style="width:100%;height:100%;object-fit:cover"
                onerror="this.parentElement.style.display='none'">
            </div>` : ''}

          <div class="card-head">
            <div>
              <div style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;color:#fff;background:${srcBadgeColor};margin-bottom:6px">
                ${pkg.icon} ${pkg.source}
              </div>
              <h3 style="font-size:0.92rem;font-weight:700;margin-bottom:2px;line-height:1.3">${pkg.name}</h3>
              <p style="font-size:0.78rem;color:var(--text)">${pkg.destination}</p>
            </div>
            <div class="price-box">
              ${pkg.price > 0
                ? `<div class="price">₹${Number(pkg.price).toLocaleString('en-IN')}</div>
                   <div class="per-person">per person</div>`
                : `<div style="font-size:0.75rem;color:var(--text)">View price<br>on site</div>`
              }
            </div>
          </div>

          <div class="card-body">
            <div class="stats-row">
              <div class="stat">
                <i class="fas fa-calendar-alt"></i>
                <div class="val">${pkg.days}D / ${pkg.nights}N</div>
                <div class="lbl">Duration</div>
              </div>
              <div class="stat">
                <i class="fas fa-users"></i>
                <div class="val">${adults}</div>
                <div class="lbl">Adults</div>
              </div>
              <div class="stat">
                <i class="fas fa-star" style="color:#f9a825"></i>
                <div class="val">${pkg.rating}</div>
                <div class="lbl">Rating</div>
              </div>
            </div>
            ${dateShow ? `<div style="font-size:0.78rem;color:var(--text);margin-top:6px">📅 <b style="color:var(--white)">${dateShow}</b></div>` : ''}
          </div>

          <div class="card-footer">
            <a class="btn-book ${i === 0 ? 'btn-book-gold' : ''}"
               href="${pkg.url || '#'}"
               target="_blank" rel="noopener noreferrer"
               onclick="return handleBookingClick(event, '${pkg.source}', '${dest}', '${pkg.url || ''}')">
              <i class="fas fa-external-link-alt"></i> Book on ${pkg.source}
            </a>
          </div>
        </div>
      `;
    }).join('');

    // Also append fallback links below cards
    grid.innerHTML = cards + `
      <div style="grid-column:1/-1;margin-top:8px;padding:16px 20px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:14px;text-align:center">
        <p style="font-size:0.8rem;color:var(--text);margin-bottom:12px">🔗 Also search directly on:</p>
        <div class="no-pkg-links">
          ${fallbackLinks.map(l => `
            <a class="no-pkg-link ${l.cls}" href="${l.url}" target="_blank" rel="noopener noreferrer"
               onclick="return handleBookingClick(event, '${l.name}', '${dest}', '${l.url}')">
              ${l.icon} ${l.name}
            </a>
          `).join('')}
        </div>
      </div>
    `;

  } else {
    // API failed — show fallback redirect links only
    renderFallbackLinks(dest, budget, days, adults, tripType, fallbackLinks, dateShow);
  }
}

// ════════════════════════════════════════════════════════
//  GUIDE PAGE — Place Identifier + Gallery + Itinerary Photos
// ════════════════════════════════════════════════════════

// API calls go through Flask backend — keys stored in config.py
let _snapIdentifiedPlace = '';
let _galleryCurrentDest  = '';
let _guideChatContext = { destination: '', placeName: '' };
let _guideChatBooted = false;
let _guidePetTipIndex = 0;
let _guidePetBooted = false;
let _guideExploreState = { category: '', context: '', photo: null };
let _photoFallbackNoticeShown = false;

const GUIDE_PET_TIPS = [
  {
    mood: 'idle',
    title: 'Travel Guide',
    bubble: 'Trip help'
  },
  {
    mood: 'happy',
    title: 'TravelNex',
    bubble: 'Travel only'
  },
  {
    mood: 'listening',
    title: 'Ask',
    bubble: 'Destinations'
  },
  {
    mood: 'typing',
    title: 'Plan',
    bubble: 'Itineraries'
  }
];

// ── Fetch photos from Unsplash ───────────────────────────
async function fetchUnsplashPhotos(query, count = 9) {
  try {
    const res = await fetch(`${API}/guide/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, count })
    });
    const data = await res.json();
    if (data.success && data.photos && data.photos.length > 0) return data.photos;
    throw new Error('No photos');
  } catch (e) {
    return [];
  }
}

// ── Render photo grid ────────────────────────────────────
function renderGalleryGrid(photos, containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  if (!Array.isArray(photos) || photos.length === 0) {
    grid.innerHTML = '<div class="gallery-empty-state">No Unsplash photos found right now.</div>';
    return;
  }
  grid.innerHTML = photos.map((p, i) => `
    <div class="gallery-item" style="animation-delay:${i*0.05}s;animation:fadeUp 0.4s ease both">
      <img src="${p.thumb || p.url || ''}" alt="${p.name || 'Unsplash photo'}" loading="lazy">
      <div class="gallery-item-label">${p.name || ''}</div>
    </div>
  `).join('');
}

// ── Snap: handle file upload ─────────────────────────────
function handleSnapUpload(e) {
  const file = e.target.files[0];
  if (file) showSnapPreview(file);
}
function handleSnapDrop(e) {
  e.preventDefault();
  document.getElementById('snap-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return showToast('Drop an image file', 'error');
  showSnapPreview(file);
}
function showSnapPreview(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Choose an image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const rawImage = e.target.result;
    const optimizedImage = await optimizeSnapImage(rawImage, file.type);

    document.getElementById('snap-placeholder').style.display = 'none';
    const prev = document.getElementById('snap-preview');
    prev.src = optimizedImage;
    prev.style.display = 'block';
    document.getElementById('snap-btn').style.display = 'flex';
    document.getElementById('snap-result').style.display = 'none';
    window._snapImageData = optimizedImage;
    window._snapImageMeta = { fileName: file.name || '' };
  };
  reader.readAsDataURL(file);
}

async function optimizeSnapImage(dataUrl, mimeType = 'image/jpeg') {
  try {
    const img = await loadImageElement(dataUrl);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const outputType = 'image/jpeg';
    const quality = 0.78;
    return canvas.toDataURL(outputType, quality);
  } catch (err) {
    console.error('Snap image optimization failed', err);
    return dataUrl;
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getSnapPreviewDisplaySize() {
  const preview = document.getElementById('snap-preview');
  if (!preview || preview.style.display === 'none') return null;

  const rect = preview.getBoundingClientRect();
  const width = Math.round(rect.width || 0);
  const height = Math.round(rect.height || 0);

  if (!width || !height) return null;

  return { width, height };
}

function syncSnapPhotoGridSize() {
  const grid = document.getElementById('snap-photos-grid');
  if (!grid) return;

  const previewSize = getSnapPreviewDisplaySize();
  if (!previewSize) {
    grid.style.removeProperty('--single-place-photo-width');
    grid.style.removeProperty('--single-place-photo-height');
    return;
  }

  const width = Math.max(320, Math.min(560, previewSize.width));
  const height = Math.max(220, Math.min(320, previewSize.height));

  grid.style.setProperty('--single-place-photo-width', `${width}px`);
  grid.style.setProperty('--single-place-photo-height', `${height}px`);
}

// ── Snap: Identify place via Claude API ──────────────────
async function identifyPlace() {
  if (!window._snapImageData) return showToast('Upload an image first', 'error');
  document.getElementById('snap-btn').style.display    = 'none';
  document.getElementById('snap-loading').style.display = 'block';
  document.getElementById('snap-result').style.display  = 'none';

  try {
    const base64    = window._snapImageData.split(',')[1];
    const mediaType = window._snapImageData.split(';')[0].split(':')[1];

    const res = await fetch(`${API}/guide/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ image_base64: base64, media_type: mediaType })
    });
    const data = await res.json();
    const info = data.success ? data.data : null;

    document.getElementById('snap-loading').style.display = 'none';
    if (!info) throw new Error('Parse failed');

    _snapIdentifiedPlace = info.place_name;

    // Safely extract fields with fallbacks
    const placeName  = info.place_name  || info.name        || info.landmark   || 'Unknown Place';
    const location   = info.location    || info.city        || info.country    || '';
    const confidence = info.confidence  || info.score       || 90;
    const desc       = info.description || info.about       || info.summary    || '';
    const bestTime   = info.best_time   || info.best_season || info.visit_time || 'Year round';
    const tip        = info.travel_tip  || info.tip         || info.advice     || '';
    const knownFor   = info.known_for   || info.features    || info.highlights || [];
    const alts       = info.alternatives|| info.similar     || [];

    _snapIdentifiedPlace = placeName;

    document.getElementById('snap-result-inner').innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-size:0.75rem;color:var(--text);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Identified Place</div>
          <div class="snap-place-name">📍 ${placeName}</div>
          ${location ? `<div style="font-size:0.88rem;color:var(--text);margin-bottom:8px"><i class="fas fa-map-marker-alt" style="color:var(--sky)"></i> ${location}</div>` : ''}
          <div class="snap-confidence"><i class="fas fa-bullseye"></i> Confidence: ${confidence}%</div>
        </div>
        ${alts.length > 0 ? `<div style="font-size:0.78rem;color:var(--text)"><div style="margin-bottom:6px;font-weight:600;color:var(--white)">Could also be:</div>${alts.map(a=>`<div>• ${a}</div>`).join('')}</div>` : ''}
      </div>
      ${desc ? `<p style="font-size:0.9rem;color:var(--text);line-height:1.6;margin:14px 0">${desc}</p>` : ''}
      ${showTravelFacts ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:10px 14px">
          <div style="font-size:0.72rem;color:var(--text);margin-bottom:3px">⏰ Best Time to Visit</div>
          <div style="font-size:0.85rem;font-weight:600">${bestTime}</div>
        </div>
        ${tip ? `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:10px 14px">
          <div style="font-size:0.72rem;color:var(--text);margin-bottom:3px">💡 Travel Tip</div>
          <div style="font-size:0.85rem">${tip}</div>
        </div>` : ''}
      </div>` : ''}
      ${knownFor.length > 0 ? `<div class="snap-tags" style="margin-bottom:14px">${knownFor.map(t=>`<span class="snap-tag">✨ ${t}</span>`).join('')}</div>` : ''}
      <div style="font-size:0.82rem;color:var(--text);margin-bottom:10px">📸 Photos of ${placeName}:</div>
      <div id="snap-photos-grid" class="gallery-grid"></div>
    `;

    document.getElementById('snap-result').style.display = 'block';
    document.getElementById('snap-btn').style.display    = 'flex';
    document.getElementById('snap-plan-btn').style.display = 'block';

    fetchUnsplashPhotos(info.place_name + ' ' + info.location, 6)
      .then(photos => renderGalleryGrid(photos, 'snap-photos-grid'));

    showToast(`Identified: ${info.place_name} 🎯`);

  } catch (err) {
    document.getElementById('snap-loading').style.display = 'none';
    document.getElementById('snap-btn').style.display    = 'flex';
    console.error(err);
    showToast('Could not identify place. Try a clearer photo.', 'error');
  }
}

function planFromSnap() {
  if (!_snapIdentifiedPlace) return;
  document.getElementById('dest').value = _snapIdentifiedPlace;
  goTo('home');
  showToast(`Destination set to ${_snapIdentifiedPlace}! Fill details and search 🗺️`);
}

// ── Gallery ──────────────────────────────────────────────
function quickGallery(dest) {
  document.getElementById('gallery-dest').value = dest;
  loadGallery();
}

async function loadGallery() {
  const dest = document.getElementById('gallery-dest').value.trim();
  if (!dest) return showToast('Enter a destination', 'error');
  _galleryCurrentDest = dest;

  document.getElementById('gallery-loading').style.display = 'block';
  document.getElementById('gallery-result').style.display  = 'none';

  try {
    const [photos, aiInfo] = await Promise.all([
      fetchUnsplashPhotos(dest, 9),
      fetchDestinationInfo(dest)
    ]);

    document.getElementById('gallery-loading').style.display = 'none';
    document.getElementById('gallery-result').style.display  = 'block';

    if (aiInfo) {
      document.getElementById('gallery-ai-info').innerHTML = `
        <div class="gallery-ai-card">
          <h4>✨ ${aiInfo.name}</h4>
          <p>${aiInfo.description}</p>
          <div class="gallery-ai-facts">
            <div class="gallery-fact"><b>🌤️ Best Time</b>${aiInfo.best_time}</div>
            <div class="gallery-fact"><b>💰 Budget</b>${aiInfo.avg_budget}</div>
            <div class="gallery-fact"><b>✈️ Type</b>${aiInfo.trip_type}</div>
            <div class="gallery-fact"><b>⏱️ Ideal Duration</b>${aiInfo.ideal_days}</div>
          </div>
        </div>`;
    }

    renderGalleryGrid(photos, 'gallery-grid');
    document.getElementById('gallery-plan-btn').style.display = 'block';
    showToast(`Gallery loaded for ${dest} 🖼️`);
  } catch (err) {
    document.getElementById('gallery-loading').style.display = 'none';
    showToast('Failed to load gallery', 'error');
  }
}

async function fetchDestinationInfo(dest) {
  try {
    const res = await fetch(`${API}/guide/destination`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ destination: dest })
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch { return null; }
}

function planFromGallery() {
  if (!_galleryCurrentDest) return;
  document.getElementById('dest').value = _galleryCurrentDest;
  goTo('home');
  showToast(`Destination set to ${_galleryCurrentDest}! Fill details and search 🗺️`);
}

// ── Itinerary photos (called after search) ───────────────
function cleanItineraryPlaceName(place) {
  return String(place || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(day\s*\d+|morning|afternoon|evening|night)\b/gi, ' ')
    .replace(/^[^a-z0-9]*(visit|explore|discover|enjoy|relax at|relax|see|stop at|head to|walk through|experience)\s+/i, '')
    .replace(/\b(top attractions|travel photography|scenic view|travel view|best places|tourism)\b/gi, '')
    .replace(/\b(photo stop|sightseeing|highlight|must see|viewpoint)\b/gi, ' ')
    .replace(/\b(attraction|spot)\s+\d+\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlaceholderItineraryPlaceName(place) {
  const normalized = cleanItineraryPlaceName(place).toLowerCase();
  if (!normalized) return true;

  return /^(destination|trip highlight|travel spot|local scene|arrival view|scenic finish)$/.test(normalized)
    || /\battraction\s*\d+\b/.test(normalized)
    || /\bday trip\b/.test(normalized);
}

function collectItineraryPlaces(destination, places = [], count = 3) {
  const cleanDestination = cleanItineraryPlaceName(destination || '').trim().toLowerCase();
  const uniquePlaces = [];

  for (const rawPlace of places || []) {
    const place = cleanItineraryPlaceName(rawPlace);
    if (!place || isPlaceholderItineraryPlaceName(place)) continue;
    if (place.toLowerCase() === cleanDestination) continue;
    if (!uniquePlaces.some(item => item.toLowerCase() === place.toLowerCase())) {
      uniquePlaces.push(place);
    }
    if (uniquePlaces.length >= count) break;
  }

  return uniquePlaces;
}

function normalizeItineraryPlaceKey(place = '') {
  return cleanItineraryPlaceName(place).trim().toLowerCase();
}

function collectDayWiseItineraryStops(days = [], destination = '') {
  return (Array.isArray(days) ? days : []).map((day, dayIndex) => {
    const slots = (Array.isArray(day?.slots) ? day.slots : [])
      .map((slot, slotIndex) => {
        const placeName = cleanItineraryPlaceName(slot?.name || '');
        if (!placeName || isPlaceholderItineraryPlaceName(placeName)) return null;

        return {
          ...slot,
          slotIndex,
          time: String(slot?.time || `Stop ${slotIndex + 1}`).trim(),
          name: placeName,
          desc: String(slot?.desc || '').trim(),
          place_key: normalizeItineraryPlaceKey(placeName),
          place_query: `${placeName} ${destination}`.trim()
        };
      })
      .filter(Boolean);

    return {
      ...day,
      dayIndex,
      title: String(day?.title || `Day ${dayIndex + 1}`).trim(),
      slots
    };
  }).filter(day => day.slots.length > 0);
}

function buildItineraryPhotoQueries(destination, places = []) {
  const cleanDestination = (destination || '').trim();
  const uniquePlaces = collectItineraryPlaces(cleanDestination, places, 3);
  const placeVariantGroups = uniquePlaces.map(place => buildPlacePhotoSearchVariants(place, cleanDestination).slice(0, 4));
  const queries = [];

  for (let variantIndex = 0; variantIndex < 4; variantIndex += 1) {
    for (const variants of placeVariantGroups) {
      if (variants[variantIndex]) {
        queries.push(variants[variantIndex]);
      }
    }
  }

  if (queries.length < 6) {
    queries.push(...buildPhotoQueries(cleanDestination).slice(0, 6 - queries.length));
  }
  queries.push(cleanDestination);

  return [...new Set(queries.filter(Boolean))];
}

function buildItineraryStoryPhotos(photos, destination, places = []) {
  const cleanDestination = (destination || '').trim();
  const uniquePlaces = collectItineraryPlaces(cleanDestination, places, 3);

  const fallbackLabels = [
    `${cleanDestination} Arrival View`,
    `${cleanDestination} Signature Stop`,
    `${cleanDestination} Scenic Finish`
  ];
  const fallbackBadges = ['Trip Start', 'Top Stop', 'Scenic Finish'];

  return (photos || []).slice(0, 3).map((photo, index) => {
    const placeLabel = uniquePlaces[index] || fallbackLabels[index] || cleanDestination || 'Trip Highlight';
    return {
      ...photo,
      name: placeLabel,
      badge: fallbackBadges[index] || 'Trip Highlight',
      query: placeLabel,
      place_query: `${placeLabel} ${cleanDestination}`.trim()
    };
  });
}

function normalizePhotoAssetKey(photo = {}) {
  const sourceUrl = normalizeExternalPhotoUrl(photo?.source_url || '');
  const imageUrl = normalizeExternalPhotoUrl(photo?.url || photo?.thumb || '');
  return String(sourceUrl || imageUrl || '')
    .split('?')[0]
    .trim()
    .toLowerCase();
}

async function fetchItineraryPlacePhotos(placeName, destination) {
  const cleanPlace = cleanItineraryPlaceName(placeName);
  const cleanDestination = cleanItineraryPlaceName(destination);
  const queries = buildPlacePhotoSearchVariants(cleanPlace, cleanDestination).slice(0, 6);

  if (queries.length === 0) return [];

  const photos = await fetchUnsplashPhotos(queries, 4);
  return (Array.isArray(photos) ? photos : [])
    .map((photo, index) => ({
      ...photo,
      name: cleanPlace,
      badge: photo?.badge || (index === 0 ? 'Must See' : 'Travel Pick'),
      query: photo?.query || queries[0] || cleanPlace,
      place_query: `${cleanPlace} ${cleanDestination}`.trim()
    }));
}

function renderDayWiseItineraryPhotoSections(dayEntries, destination, photoByPlace) {
  const container = document.getElementById('itinerary-photos-grid');
  if (!container) return;

  container.innerHTML = dayEntries.map((day, index) => `
    <div class="itinerary-day-photo-block" style="animation-delay:${index * 0.06}s;animation:fadeUp 0.45s ease both">
      <div class="itinerary-day-photo-header">
        <div>
          <div class="itinerary-day-photo-title">${escapeHtml(day.title)}</div>
          <div class="itinerary-day-photo-subtitle">${day.slots.length} places from your itinerary</div>
        </div>
      </div>
      <div id="itinerary-day-grid-${index}" class="gallery-grid itinerary-day-photo-grid"></div>
    </div>
  `).join('');

  dayEntries.forEach((day, index) => {
    const dayPhotos = day.slots.map(slot => {
      const photo = photoByPlace.get(slot.place_key);
      if (!photo) return null;
      return {
        ...photo,
        name: slot.name,
        badge: `${day.title} • ${slot.time}`,
        query: slot.place_query,
        place_query: slot.place_query,
        photographer: photo?.photographer || 'Unsplash creator',
        source_label: photo?.source_label || 'Unsplash'
      };
    }).filter(Boolean);

    const dayGrid = document.getElementById(`itinerary-day-grid-${index}`);
    if (!dayGrid) return;
    if (dayPhotos.length === 0) {
      dayGrid.innerHTML = '<div class="gallery-empty-state">No Unsplash photos found for these stops right now.</div>';
      return;
    }
    renderGalleryGrid(dayPhotos, `itinerary-day-grid-${index}`);
  });
}

function makePhotoFallback(placeName, destination) {
  return null;
}

async function loadItineraryPhotos(destination, days = []) {
  const section  = document.getElementById('itinerary-photos-section');
  const grid     = document.getElementById('itinerary-photos-grid');
  const subtitle = document.getElementById('itinerary-photos-subtitle');
  if (!section || !grid) return;

  const cleanDestination = String(destination || '').trim();
  const dayEntries = collectDayWiseItineraryStops(days, cleanDestination);

  if (dayEntries.length === 0) {
    section.style.display = 'none';
    grid.innerHTML = '';
    return;
  }

  subtitle.textContent = `${cleanDestination} itinerary photos, day by day`;
  section.style.display = 'block';
  grid.innerHTML = '<div class="itinerary-photos-loading">Loading day-wise place photos...</div>';

  const uniquePlaces = [...new Map(
    dayEntries
      .flatMap(day => day.slots)
      .map(slot => [slot.place_key, slot.name])
  ).entries()];

  const photoEntries = await Promise.allSettled(
    uniquePlaces.map(async ([placeKey, placeName]) => {
      const photos = await fetchItineraryPlacePhotos(placeName, cleanDestination);
      return [placeKey, photos];
    })
  );

  const photoByPlace = new Map();
  const usedPhotoKeys = new Set();
  photoEntries.forEach(entry => {
    if (entry.status === 'fulfilled') {
      const [placeKey, photos] = entry.value;
      const candidates = Array.isArray(photos) ? photos : [];
      const uniquePhoto = candidates.find(photo => {
        const assetKey = normalizePhotoAssetKey(photo);
        return assetKey && !usedPhotoKeys.has(assetKey);
      });
      const selectedPhoto = uniquePhoto || candidates[0] || null;
      if (placeKey && selectedPhoto) {
        const assetKey = normalizePhotoAssetKey(selectedPhoto);
        if (assetKey) usedPhotoKeys.add(assetKey);
        photoByPlace.set(placeKey, selectedPhoto);
      }
      return;
    }

  });

  if (photoByPlace.size === 0) {
    subtitle.textContent = `${cleanDestination} itinerary photos, day by day`;
    grid.innerHTML = '<div class="gallery-empty-state">Unsplash photos are unavailable for this itinerary right now.</div>';
    return;
  }

  const previewOnly = [...photoByPlace.values()].every(photo => isPreviewOnlyPhoto(photo));
  subtitle.textContent = previewOnly
    ? `${cleanDestination} itinerary photos, day by day · Preview mode (Unsplash unavailable)`
    : `${cleanDestination} itinerary photos, day by day`;

  renderDayWiseItineraryPhotoSections(dayEntries, cleanDestination, photoByPlace);
}

const GUIDE_GALLERY_PROFILES = [
  {
    match: /goa|andaman|bali|maldives|phuket|coast|beach|island/i,
    tripType: 'Beach Escape',
    bestTime: 'October to March',
    avgBudget: 'Rs. 18000-38000 / person',
    idealDays: '4-6 days',
    highlights: ['Sunset views', 'Sea-facing stays', 'Water adventures', 'Relaxed cafes'],
    photoQueries: ['{dest} beach sunset', '{dest} tropical coast', '{dest} luxury beach resort', '{dest} palm shoreline']
  },
  {
    match: /manali|shimla|ooty|ladakh|mount|hill|valley|snow/i,
    tripType: 'Hill Station',
    bestTime: 'October to June',
    avgBudget: 'Rs. 15000-32000 / person',
    idealDays: '4-6 days',
    highlights: ['Mountain viewpoints', 'Scenic drives', 'Misty mornings', 'Cozy stays'],
    photoQueries: ['{dest} mountain panorama', '{dest} valley view', '{dest} scenic road trip', '{dest} pine forest']
  },
  {
    match: /rajasthan|jaipur|udaipur|jodhpur|varanasi|temple|fort|palace|heritage/i,
    tripType: 'Culture and Heritage',
    bestTime: 'October to March',
    avgBudget: 'Rs. 14000-30000 / person',
    idealDays: '3-5 days',
    highlights: ['Iconic architecture', 'Historic streets', 'Golden hour views', 'Local experiences'],
    photoQueries: ['{dest} palace view', '{dest} fort sunset', '{dest} heritage street', '{dest} landmark photography']
  },
  {
    match: /rishikesh|spiritual|river|yoga|wellness/i,
    tripType: 'Adventure and Wellness',
    bestTime: 'September to April',
    avgBudget: 'Rs. 12000-26000 / person',
    idealDays: '3-4 days',
    highlights: ['Riverfront scenes', 'Adventure spots', 'Peaceful stays', 'Sunrise moments'],
    photoQueries: ['{dest} river view', '{dest} suspension bridge', '{dest} adventure rafting', '{dest} retreat landscape']
  }
];

function pickGuideGalleryProfile(dest) {
  return GUIDE_GALLERY_PROFILES.find(profile => profile.match.test(dest)) || {
    tripType: 'Scenic Getaway',
    bestTime: 'October to March',
    avgBudget: 'Rs. 18000-35000 / person',
    idealDays: '3-5 days',
    highlights: ['Scenic spots', 'Popular attractions', 'Local flavor', 'Memorable stays'],
    photoQueries: ['{dest} scenic view', '{dest} travel photography', '{dest} top attractions', '{dest} best places']
  };
}

function buildLocalDestinationInfo(dest) {
  const cleanDest = (dest || 'Destination').trim();
  const profile = pickGuideGalleryProfile(cleanDest);
  const prettyName = cleanDest
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Destination';

  return {
    name: prettyName,
    description: `${prettyName} is a strong travel pick for people who want a photogenic trip with memorable views, local character, and enough variety to make the plan feel exciting from day one.`,
    best_time: profile.bestTime,
    avg_budget: profile.avgBudget,
    trip_type: profile.tripType,
    ideal_days: profile.idealDays,
    highlights: [...profile.highlights],
    photo_queries: profile.photoQueries.map(query => query.replaceAll('{dest}', prettyName))
  };
}

function buildPhotoQueries(dest, extraQueries = []) {
  const info = buildLocalDestinationInfo(dest);
  const queries = [...extraQueries, ...info.photo_queries, `${dest} travel`, `${dest} tourism`]
    .map(item => (item || '').trim())
    .filter(Boolean);

  return [...new Set(queries)];
}

function makePhotoPlaceholderDataUrl(label = 'Travel Photo') {
  return '';
}

function getPhotoFallbackUrl(photo, label = 'Travel Photo') {
  return '';
}

function inferFallbackBaseQuery(queries = []) {
  const safeQueries = (Array.isArray(queries) ? queries : [])
    .map(query => cleanItineraryPlaceName(query || '').trim())
    .filter(Boolean);

  if (safeQueries.length === 0) {
    return 'travel';
  }

  const ranked = [...safeQueries].sort((a, b) => {
    const aWords = a.split(/\s+/).filter(Boolean).length;
    const bWords = b.split(/\s+/).filter(Boolean).length;
    if (aWords !== bWords) return aWords - bWords;
    return a.length - b.length;
  });

  return ranked[0] || safeQueries[0] || 'travel';
}

function isPreviewOnlyPhoto(photo) {
  const sourceLabel = String(photo?.source_label || '').toLowerCase();
  const sourceUrl = String(photo?.source_url || photo?.url || photo?.thumb || '').trim().toLowerCase();
  return sourceLabel.includes('travelnex preview') || sourceUrl.startsWith('data:image/');
}

function mergePhotoFallbackSets(primaryPhotos = [], reservePhotos = [], count = 9) {
  const results = [];
  const seenIds = new Set();
  const reserveQueue = (Array.isArray(reservePhotos) ? reservePhotos : []).filter(photo => !isPreviewOnlyPhoto(photo));

  const takePhoto = (photo) => {
    if (!photo) return null;
    const photoId = String(photo?.source_url || photo?.url || photo?.thumb || '').trim();
    if (photoId && seenIds.has(photoId)) return null;
    if (photoId) seenIds.add(photoId);
    return photo;
  };

  for (const photo of Array.isArray(primaryPhotos) ? primaryPhotos : []) {
    let chosen = photo;

    if (isPreviewOnlyPhoto(photo) && reserveQueue.length > 0) {
      chosen = reserveQueue.shift();
    }

    const accepted = takePhoto(chosen);
    if (accepted) {
      results.push(accepted);
    }
    if (results.length >= count) {
      return results.slice(0, count);
    }
  }

  for (const photo of reserveQueue) {
    const accepted = takePhoto(photo);
    if (accepted) {
      results.push(accepted);
    }
    if (results.length >= count) {
      break;
    }
  }

  return results.slice(0, count);
}

function buildFallbackGalleryPhotos(dest, count = 9, extraQueries = []) {
  return [];
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const PHOTO_REQUEST_CACHE = new Map();

function clonePhotoList(photos = []) {
  return (Array.isArray(photos) ? photos : []).map(photo => (
    photo && typeof photo === 'object' ? { ...photo } : photo
  ));
}

function normalizePhotoMatchText(value = '') {
  return cleanItineraryPlaceName(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMeaningfulPhotoTokens(value = '', ignoredTokens = []) {
  const ignored = new Set(Array.isArray(ignoredTokens) ? ignoredTokens : []);
  return [...new Set(
    normalizePhotoMatchText(value)
      .split(' ')
      .map(token => token.trim())
      .filter(token => token.length >= 4 && !ignored.has(token))
  )];
}

function countPhotoTokenMatches(haystack = '', tokens = []) {
  return (tokens || []).filter(token => haystack.includes(token)).length;
}

function inferPlacePhotoHint(placeName = '') {
  const normalized = normalizePhotoMatchText(placeName);
  if (!normalized) return 'sightseeing';
  if (/(beach|coast|shore|bay)/.test(normalized)) return 'beach';
  if (/(waterfall|falls|cascade)/.test(normalized)) return 'waterfall';
  if (/(elephant|wildlife|sanctuary|national park|park|zoo|safari|bird)/.test(normalized)) return 'wildlife';
  if (/(lake|backwater|river|dam)/.test(normalized)) return 'waterfront';
  if (/(hill|peak|mount|mountain|valley|tea garden|tea estate)/.test(normalized)) return 'hillscape';
  if (/(resort|hotel|villa|stay|suite)/.test(normalized)) return 'resort';
  if (/(church|chapel|cathedral|basilica|temple|mosque|fort|palace|museum|plantation|monastery|convent)/.test(normalized)) return 'landmark';
  return 'sightseeing';
}

function buildPlacePhotoSearchVariants(placeName = '', destination = '') {
  const cleanDestination = cleanItineraryPlaceName(destination || '').trim();
  const cleanPlace = cleanItineraryPlaceName(placeName || '').trim();
  const escapedDestination = cleanDestination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const strippedPlace = cleanDestination
    ? cleanPlace.replace(new RegExp(`\\b${escapedDestination}\\b`, 'ig'), '').replace(/\s+/g, ' ').trim()
    : cleanPlace;
  const photoHint = inferPlacePhotoHint(strippedPlace || cleanPlace);
  const destinationHint = photoHint === 'beach'
    ? `${cleanDestination} beach`
    : photoHint === 'waterfall'
      ? `${cleanDestination} waterfall`
      : photoHint === 'wildlife'
        ? `${cleanDestination} wildlife`
        : photoHint === 'waterfront'
          ? `${cleanDestination} lake`
          : photoHint === 'hillscape'
            ? `${cleanDestination} hills`
            : photoHint === 'resort'
              ? `${cleanDestination} resort`
              : cleanDestination
                ? `${cleanDestination} landmark`
                : '';
  const placeHint = strippedPlace
    ? photoHint === 'beach'
      ? `${strippedPlace} beach`
      : photoHint === 'waterfall'
        ? `${strippedPlace} waterfall`
        : photoHint === 'wildlife'
          ? `${strippedPlace} wildlife`
          : photoHint === 'waterfront'
            ? `${strippedPlace} lake`
            : photoHint === 'hillscape'
              ? `${strippedPlace} hills`
              : photoHint === 'resort'
                ? `${strippedPlace} resort`
                : `${strippedPlace} landmark`
    : '';
  const scenicHint = cleanDestination
    ? photoHint === 'waterfall'
      ? `${cleanDestination} nature waterfall`
      : photoHint === 'wildlife'
        ? `${cleanDestination} nature wildlife`
        : photoHint === 'hillscape'
          ? `${cleanDestination} scenic hills`
          : photoHint === 'waterfront'
            ? `${cleanDestination} river lake`
            : `${cleanDestination} sightseeing`
    : '';

  return [...new Set([
    `${cleanPlace} ${cleanDestination}`.trim(),
    strippedPlace,
    cleanPlace,
    placeHint,
    destinationHint,
    scenicHint,
    cleanDestination
  ])].filter(Boolean);
}

function normalizeExternalPhotoUrl(url = '') {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return '';
  return rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
}

function scoreClientFallbackPage(page, query = '') {
  const normalizedQuery = normalizePhotoMatchText(query);
  const normalizedTitle = normalizePhotoMatchText(page?.title || '');
  const queryTokens = buildMeaningfulPhotoTokens(query, ['the', 'and', 'city', 'district', 'state']);
  let score = 0;

  if (normalizedTitle && normalizedQuery) {
    if (normalizedTitle === normalizedQuery) score += 12;
    if (normalizedTitle.includes(normalizedQuery)) score += 8;
    if (normalizedQuery.includes(normalizedTitle)) score += 5;
  }

  score += countPhotoTokenMatches(normalizedTitle, queryTokens) * 3;

  if (page?.thumbnail?.source) score += 4;
  if (typeof page?.index === 'number') score += Math.max(0, 6 - page.index);

  const title = String(page?.title || '').toLowerCase();
  if (title.includes('disambiguation')) score -= 10;
  if (title.startsWith('list of ')) score -= 8;

  return score;
}

function scoreCommonsFilePage(page, query = '') {
  const rawTitle = String(page?.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]{2,5}$/i, '');
  const normalizedTitle = normalizePhotoMatchText(rawTitle);
  const normalizedQuery = normalizePhotoMatchText(query);
  const queryTokens = buildMeaningfulPhotoTokens(query, ['the', 'and', 'city', 'district', 'state']);
  let score = 0;

  if (normalizedTitle && normalizedQuery) {
    if (normalizedTitle === normalizedQuery) score += 14;
    if (normalizedTitle.includes(normalizedQuery)) score += 10;
    if (normalizedQuery.includes(normalizedTitle)) score += 6;
  }

  score += countPhotoTokenMatches(normalizedTitle, queryTokens) * 3;

  const title = rawTitle.toLowerCase();
  if (/(logo|icon|map|flag|symbol|seal|banner|route|location map)/.test(title)) score -= 12;
  if (/(aerial|panorama|view|beach|fort|church|palace|temple|coast|resort|waterfall|falls|wildlife|lake|river)/.test(title)) score += 4;

  return score;
}

async function fetchUnsplashPhotos(queryOrQueries, count = 9, options = {}) {
  const queries = Array.isArray(queryOrQueries)
    ? queryOrQueries.map(q => (q || '').trim()).filter(Boolean)
    : [(queryOrQueries || '').trim()].filter(Boolean);
  const cacheKey = JSON.stringify({ queries, count });

  if (PHOTO_REQUEST_CACHE.has(cacheKey)) {
    return clonePhotoList(PHOTO_REQUEST_CACHE.get(cacheKey));
  }

  try {
    const res = await fetch(`${API}/guide/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: queries[0] || '',
        queries,
        count
      })
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.photos) && data.photos.length > 0) {
      const resolvedPhotos = data.photos.map((photo, index) => ({
        ...photo,
        badge: photo.badge || (index === 0 ? 'Must See' : index < 4 ? 'Popular' : 'Travel Pick')
      }));
      PHOTO_REQUEST_CACHE.set(cacheKey, resolvedPhotos);
      return clonePhotoList(resolvedPhotos);
    }
    notifyPhotoFallback(data.message || 'No photos');
    throw new Error(data.message || 'No photos');
  } catch (e) {
    notifyPhotoFallback(e?.message || String(e || ''));
    PHOTO_REQUEST_CACHE.set(cacheKey, []);
    return [];
  }
}

function buildMapsSearchUrl(query) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function getPhotoTravelContext(photo) {
  return (photo.place_query || photo.query || photo.name || 'travel').trim();
}

function getPhotoSourceUrl(photo) {
  return (photo.source_url || photo.url || photo.thumb || '').trim();
}

function normalizeGuideExploreCategory(category = '') {
  const normalized = String(category || '').trim().toLowerCase();
  if (['food', 'foods', 'restaurant', 'restaurants', 'dining'].includes(normalized)) return 'restaurants';
  if (['hotel', 'hotels', 'stay', 'stays'].includes(normalized)) return 'hotels';
  return 'attractions';
}

function getGuideExploreLabel(category = '') {
  const normalized = normalizeGuideExploreCategory(category);
  if (normalized === 'hotels') return 'Hotels';
  if (normalized === 'restaurants') return 'Restaurants';
  return 'Attractions';
}

function buildGuideExploreContext(photo = {}, containerId = '') {
  const containerContext = containerId === 'gallery-grid'
    ? _galleryCurrentDest
    : containerId === 'snap-photos-grid'
      ? _snapIdentifiedPlace
      : '';
  const rawContext = containerContext
    || photo.guide_context
    || photo.place_query
    || photo.query
    || _guideChatContext.placeName
    || _snapIdentifiedPlace
    || _guideChatContext.destination
    || _galleryCurrentDest
    || photo.name
    || '';

  return String(rawContext || '')
    .replace(/\b(golden hour view|travel view|coastal escape|mountain view|local scene|stay inspiration|waterfront view|heritage detail)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderGuideExploreLoading(label, context, photo = {}) {
  const modal = document.getElementById('guide-explore-modal');
  const title = document.getElementById('guide-explore-title');
  const subtitle = document.getElementById('guide-explore-subtitle');
  const kicker = document.getElementById('guide-explore-kicker');
  const body = document.getElementById('guide-explore-body');
  if (!modal || !title || !subtitle || !kicker || !body) return;

  const previewImage = escapeHtml(photo.thumb || photo.url || '');
  const previewName = escapeHtml(photo.name || context || label);
  const heroMedia = previewImage
    ? `
      <div class="guide-explore-hero-media">
        <img src="${previewImage}" alt="${previewName}" loading="lazy">
      </div>
    `
    : '';
  kicker.textContent = 'TravelNex Guide';
  title.textContent = `${label} near ${context || 'this place'}`;
  subtitle.textContent = 'Loading nearby places inside TravelNex';
  body.innerHTML = `
    <div class="guide-explore-hero">
      ${heroMedia}
      <div class="guide-explore-hero-copy">
        <h4>${previewName}</h4>
        <p>TravelNex is finding nearby ${label.toLowerCase()} for this spot so you can keep browsing inside the site without jumping out to Google Maps.</p>
        <div class="guide-explore-chip-row">
          <span class="guide-explore-chip">Inside TravelNex</span>
          <span class="guide-explore-chip">Live nearby search</span>
        </div>
      </div>
    </div>
    <div class="guide-explore-loading">
      <i class="fas fa-circle-notch fa-spin"></i>
      Loading nearby ${label.toLowerCase()}...
    </div>
  `;

  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function renderGuideExploreResults(payload, photo = {}, requestedContext = '') {
  const modal = document.getElementById('guide-explore-modal');
  const title = document.getElementById('guide-explore-title');
  const subtitle = document.getElementById('guide-explore-subtitle');
  const kicker = document.getElementById('guide-explore-kicker');
  const body = document.getElementById('guide-explore-body');
  if (!modal || !title || !subtitle || !kicker || !body) return;

  const label = getGuideExploreLabel(payload?.category || _guideExploreState.category);
  const resolvedContext = payload?.resolved_context || requestedContext || _guideExploreState.context || 'this place';
  const resolvedAddress = payload?.resolved_address || '';
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const previewImage = escapeHtml(photo.thumb || photo.url || '');
  const previewName = escapeHtml(photo.name || requestedContext || label);
  const sourceUrl = escapeHtml(getPhotoSourceUrl(photo) || photo.url || photo.thumb || '');
  const heroMedia = previewImage
    ? (
        sourceUrl
          ? `<a class="guide-explore-hero-media" href="${sourceUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open image source for ${previewName}">
        <img src="${previewImage}" alt="${previewName}" loading="lazy">
      </a>`
          : `<div class="guide-explore-hero-media">
        <img src="${previewImage}" alt="${previewName}" loading="lazy">
      </div>`
      )
    : '';
  const photoSourceChip = sourceUrl
    ? `<a class="guide-explore-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">Open Photo Source</a>`
    : '';

  kicker.textContent = 'TravelNex Guide';
  title.textContent = `${label} near ${resolvedContext}`;
  subtitle.textContent = resolvedAddress || `Showing nearby ${label.toLowerCase()} inside TravelNex`;

  const cards = items.length > 0
    ? items.map(item => `
        <div class="guide-explore-card">
          <div class="guide-explore-card-top">
            <div>
              <h5>${escapeHtml(item.name || label)}</h5>
              <div class="guide-explore-kind">${escapeHtml(item.kind || label)}</div>
            </div>
            <div class="guide-explore-distance">${escapeHtml(item.distance_text || 'Nearby')}</div>
          </div>
          <div class="guide-explore-summary">${escapeHtml(item.summary || '')}</div>
          <div class="guide-explore-address">${escapeHtml(item.address || resolvedContext)}</div>
          <div class="guide-explore-card-actions">
            <a class="guide-explore-link primary" href="${escapeHtml(item.map_url || buildMapsSearchUrl(item.map_query || `${item.name || ''} ${resolvedContext}`))}" target="_blank" rel="noopener noreferrer">Navigate</a>
            ${item.website ? `<a class="guide-explore-link" href="${escapeHtml(item.website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
            ${item.phone ? `<a class="guide-explore-link" href="tel:${escapeHtml(item.phone)}">Call</a>` : ''}
          </div>
        </div>
      `).join('')
    : `
      <div class="guide-explore-empty">
        <i class="fas fa-map-signs"></i>
        No ${label.toLowerCase()} were found for this spot right now. You can still use navigation below.
      </div>
    `;

  body.innerHTML = `
    <div class="guide-explore-hero">
      ${heroMedia}
      <div class="guide-explore-hero-copy">
        <h4>${previewName}</h4>
        <p>Browsing nearby ${label.toLowerCase()} inside TravelNex. Use Navigate only when you actually want directions outside the site.</p>
        <div class="guide-explore-chip-row">
          <span class="guide-explore-chip">${escapeHtml(label)}</span>
          <span class="guide-explore-chip">${escapeHtml(resolvedContext)}</span>
          ${photoSourceChip}
        </div>
      </div>
    </div>
    <div class="guide-explore-results">${cards}</div>
  `;

  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

async function openGuideExplore(category, photo = {}, containerId = '') {
  const normalizedCategory = normalizeGuideExploreCategory(category);
  const label = getGuideExploreLabel(normalizedCategory);
  const context = buildGuideExploreContext(photo, containerId);
  if (!context) return showToast(`Pick a place before opening ${label.toLowerCase()}`, 'error');

  _guideExploreState = { category: normalizedCategory, context, photo: { ...photo } };
  renderGuideExploreLoading(label, context, photo);

  try {
    const res = await fetch(`${API}/guide/explore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        category: normalizedCategory,
        context,
        count: 6
      })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || `Could not load ${label.toLowerCase()}`);
    }
    renderGuideExploreResults(data, photo, context);
  } catch (err) {
    console.error(err);
    renderGuideExploreResults({
      category: normalizedCategory,
      resolved_context: context,
      resolved_address: '',
      items: []
    }, photo, context);
    showToast(`Could not load ${label.toLowerCase()} right now`, 'error');
  }
}

function closeGuideExplore() {
  const modal = document.getElementById('guide-explore-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function isUnsplashAuthErrorMessage(message = '') {
  const text = String(message || '').toLowerCase();
  return text.includes('oauth error')
    || text.includes('invalid access token')
    || (text.includes('unsplash') && text.includes('401'));
}

function isUnsplashRateLimitMessage(message = '') {
  const text = String(message || '').toLowerCase();
  return text.includes('rate limit exceeded')
    || text.includes('rate limit')
    || (text.includes('unsplash') && text.includes('403'));
}

function notifyPhotoFallback(message = '') {
  if (_photoFallbackNoticeShown) return;
  _photoFallbackNoticeShown = true;

  if (isUnsplashAuthErrorMessage(message)) {
    showToast('Unsplash key is invalid in config.py, so photos could not be loaded.', 'error');
    return;
  }

  if (isUnsplashRateLimitMessage(message)) {
    showToast('Unsplash rate limit is reached right now, so photos could not be loaded.', 'error');
    return;
  }

  showToast('Could not load Unsplash photos right now.', 'error');
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeGuideExplore();
  }
});

document.addEventListener('click', event => {
  if (event.target?.id === 'guide-explore-modal') {
    closeGuideExplore();
  }
});

function renderGalleryGrid(photos, containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  const useHighResImage = containerId === 'snap-photos-grid';

  const safePhotos = (Array.isArray(photos) ? photos : []).filter(photo => String(photo?.thumb || photo?.url || '').trim());
  if (safePhotos.length === 0) {
    grid.innerHTML = '<div class="gallery-empty-state">No Unsplash photos found right now.</div>';
    return;
  }

  grid.innerHTML = safePhotos.map((photo, index) => {
    const name = escapeHtml(photo.name || 'Travel View');
    const badge = escapeHtml(photo.badge || (index === 0 ? 'Must See' : 'Travel Pick'));
    const imageUrl = escapeHtml(
      useHighResImage
        ? (photo.url || photo.thumb || '')
        : (photo.thumb || photo.url || '')
    );
    const sourceLabel = escapeHtml(photo.source_label || 'Unsplash');
    const photographer = escapeHtml(photo.photographer || 'Unsplash creator');
    const sourceUrl = escapeHtml(getPhotoSourceUrl(photo) || photo.url || photo.thumb || '');
    return `
      <div class="gallery-item ${index === 0 ? 'featured' : ''}" style="animation-delay:${index * 0.05}s;animation:fadeUp 0.45s ease both">
        ${sourceUrl ? `<a class="gallery-item-hitbox" href="${sourceUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open source for ${name}"></a>` : ''}
        <img src="${imageUrl}" alt="${name}" loading="lazy">
        <div class="gallery-item-badge">${badge}</div>
        <div class="gallery-item-content">
          <div class="gallery-item-label">${name}</div>
          <div class="gallery-item-meta">Photo by ${photographer} on ${sourceLabel}</div>
          <div class="gallery-item-actions">
            <button class="gallery-item-action primary" type="button" data-guide-category="attractions" data-photo-index="${index}">Attractions</button>
            <button class="gallery-item-action" type="button" data-guide-category="hotels" data-photo-index="${index}">Hotels</button>
            <button class="gallery-item-action" type="button" data-guide-category="restaurants" data-photo-index="${index}">Restaurants</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-guide-category]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const photoIndex = Number.parseInt(button.dataset.photoIndex || '-1', 10);
      const category = button.dataset.guideCategory || 'attractions';
      const selectedPhoto = Number.isInteger(photoIndex) && photoIndex >= 0 ? safePhotos[photoIndex] : null;
      openGuideExplore(category, selectedPhoto || {}, containerId);
    });
  });
}

function renderGalleryInfo(info) {
  const highlights = Array.isArray(info.highlights) ? info.highlights.slice(0, 4) : [];
  document.getElementById('gallery-ai-info').innerHTML = `
    <div class="gallery-ai-card">
      <div class="gallery-ai-kicker">Destination Spotlight</div>
      <h4>${escapeHtml(info.name)}</h4>
      <p>${escapeHtml(info.description)}</p>
      <div class="gallery-ai-facts">
        <div class="gallery-fact"><b>Best Time</b>${escapeHtml(info.best_time)}</div>
        <div class="gallery-fact"><b>Budget</b>${escapeHtml(info.avg_budget)}</div>
        <div class="gallery-fact"><b>Style</b>${escapeHtml(info.trip_type)}</div>
        <div class="gallery-fact"><b>Ideal Stay</b>${escapeHtml(info.ideal_days)}</div>
      </div>
      <div class="gallery-highlight-row">
        ${highlights.map(item => `<span class="gallery-highlight-chip">${escapeHtml(item)}</span>`).join('')}
      </div>
    </div>`;
}

function normalizeIdentifyList(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;\n|]/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeIdentifyInfo(info, fallbackMessage = '') {
  const raw = info && typeof info === 'object' ? info : {};
  const placeName = raw.place_name || raw.name || raw.landmark || raw.destination || raw.title || '';
  const location = raw.location || raw.city || raw.country || '';
  const description = raw.description || raw.about || raw.summary || fallbackMessage || '';
  const bestTime = raw.best_time || raw.best_season || raw.visit_time || 'Year round';
  const travelTip = raw.travel_tip || raw.tip || raw.advice || '';
  const knownFor = normalizeIdentifyList(raw.known_for || raw.features || raw.highlights);
  const alternatives = normalizeIdentifyList(raw.alternatives || raw.similar);
  const parsedConfidence = Number.parseInt(String(raw.confidence ?? raw.score ?? 0).replace('%', '').trim(), 10);
  const confidence = Number.isFinite(parsedConfidence) ? Math.max(0, Math.min(parsedConfidence, 100)) : 0;
  const isFallback = Boolean(raw.is_fallback || !placeName);
  const canPlan = raw.can_plan !== false && Boolean(placeName) && placeName !== 'Live identify unavailable';

  return {
    placeName,
    location,
    confidence,
    description,
    bestTime,
    travelTip,
    knownFor,
    alternatives,
    isFallback,
    fallbackReason: raw.fallback_reason || '',
    canPlan
  };
}

function getSnapHighlightMeta(item) {
  const lower = String(item || '').toLowerCase();

  if (/(shrine|temple|church|cathedral|mosque|monastery|sacred|spiritual|worship|langar)/i.test(lower)) {
    return {
      emoji: '🙏',
      description: 'The atmosphere matters here, so a calm and respectful visit usually feels more meaningful.'
    };
  }
  if (/(architecture|facade|palace|fort|design|mughal|baroque|landmark|tower|windows)/i.test(lower)) {
    return {
      emoji: '🏛️',
      description: 'The craftsmanship and visual details are a big part of why this place stands out in person.'
    };
  }
  if (/(heritage|historic|history|unesco|ancient|oldest|memorial)/i.test(lower)) {
    return {
      emoji: '🕰️',
      description: 'Expect a strong sense of history here, with stories and cultural value layered into the experience.'
    };
  }
  if (/(sunrise|sunset|view|views|skyline|lights|observation|panorama)/i.test(lower)) {
    return {
      emoji: '🌅',
      description: 'Soft morning or evening light usually makes this feature even more memorable and photo-friendly.'
    };
  }
  if (/(water|beach|river|lake|sea|harbour|coast|waterfront)/i.test(lower)) {
    return {
      emoji: '🌊',
      description: 'The setting adds open views and a more relaxed atmosphere around the visit.'
    };
  }
  if (/(market|street|food|cafe|walk|bazaar)/i.test(lower)) {
    return {
      emoji: '🍽️',
      description: 'The nearby streets and local stops usually add extra charm once you finish seeing the main sight.'
    };
  }

  return {
    emoji: '✨',
    description: 'This is one of the signature details that makes the place easy to remember after the trip.'
  };
}

function renderSnapHighlightCards(items) {
  const visibleItems = Array.isArray(items) ? items.slice(0, 3) : [];
  if (visibleItems.length === 0) return '';

  return `
    <div class="snap-insight-grid">
      ${visibleItems.map(item => {
        const meta = getSnapHighlightMeta(item);
        return `
          <div class="snap-insight-card">
            <div class="snap-insight-icon">${meta.emoji}</div>
            <div>
              <div class="snap-insight-title">${escapeHtml(item)}</div>
              <div class="snap-insight-text">${escapeHtml(meta.description)}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function identifyPlace() {
  if (!window._snapImageData) return showToast('Upload an image first', 'error');
  document.getElementById('snap-btn').style.display    = 'none';
  document.getElementById('snap-loading').style.display = 'block';
  document.getElementById('snap-result').style.display  = 'none';

  try {
    const base64    = window._snapImageData.split(',')[1];
    const mediaType = window._snapImageData.split(';')[0].split(':')[1];
    const fileName  = window._snapImageMeta?.fileName || '';

    const res = await fetch(`${API}/guide/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        image_base64: base64,
        media_type: mediaType,
        file_name: fileName
      })
    });
    const data = await res.json();
    const info = data.success ? normalizeIdentifyInfo(data.data, data?.message || '') : null;

    document.getElementById('snap-loading').style.display = 'none';
    if (!info) throw new Error(data?.message || 'Parse failed');

    const placeName  = info.placeName || 'Unknown Place';
    const location   = info.location || '';
    const confidence = info.confidence || 0;
    const desc       = info.description || '';
    const bestTime   = info.bestTime || 'Year round';
    const tip        = info.travelTip || '';
    const knownFor   = Array.isArray(info.knownFor) ? info.knownFor : [];
    const alts       = Array.isArray(info.alternatives) ? info.alternatives : [];
    const statusNote = data?.message || '';
    const fallbackReason = info.fallbackReason || '';
    const isQuotaFallback = fallbackReason === 'quota';
    const isNetworkFallback = fallbackReason === 'network';
    const fallbackBorder = isQuotaFallback
      ? 'rgba(245,200,66,0.35)'
      : isNetworkFallback
        ? 'rgba(0,194,255,0.28)'
        : 'rgba(0,229,192,0.24)';
    const fallbackBackground = isQuotaFallback
      ? 'rgba(245,200,66,0.10)'
      : isNetworkFallback
        ? 'rgba(0,194,255,0.08)'
        : 'rgba(0,229,192,0.08)';
    const fallbackTextColor = isQuotaFallback ? 'var(--gold)' : 'var(--text)';
    const fallbackBanner = info.isFallback && statusNote
      ? `<div style="margin:0 0 12px;padding:10px 12px;border-radius:12px;border:1px solid ${fallbackBorder};background:${fallbackBackground};font-size:0.82rem;color:${fallbackTextColor}">${escapeHtml(statusNote)}</div>`
      : '';

    _snapIdentifiedPlace = info.canPlan ? placeName : '';
    setGuideChatContext({ placeName: info.canPlan ? placeName : '', destination: location || (info.canPlan ? placeName : '') });

    document.getElementById('snap-result-inner').innerHTML = `
      ${fallbackBanner}
      <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-size:0.75rem;color:var(--text);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Identified Place</div>
          <div class="snap-place-name">${escapeHtml(placeName)}</div>
          ${location ? `<div style="font-size:0.88rem;color:var(--text);margin-bottom:8px"><i class="fas fa-map-marker-alt" style="color:var(--sky)"></i> ${escapeHtml(location)}</div>` : ''}
          <div class="snap-confidence"><i class="fas fa-bullseye"></i> Confidence: ${escapeHtml(confidence)}</div>
        </div>
        ${alts.length > 0 ? `<div style="font-size:0.78rem;color:var(--text)"><div style="margin-bottom:6px;font-weight:600;color:var(--white)">Could also be:</div>${alts.slice(0, 3).map(item => `<div>• ${escapeHtml(item)}</div>`).join('')}</div>` : ''}
      </div>
      ${desc ? `<p style="font-size:0.9rem;color:var(--text);line-height:1.6;margin:14px 0">${escapeHtml(desc)}</p>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:10px 14px">
          <div style="font-size:0.72rem;color:var(--text);margin-bottom:3px">Best Time to Visit</div>
          <div style="font-size:0.85rem;font-weight:600">${escapeHtml(bestTime)}</div>
        </div>
        ${tip ? `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:10px 14px">
          <div style="font-size:0.72rem;color:var(--text);margin-bottom:3px">Travel Tip</div>
          <div style="font-size:0.85rem">${escapeHtml(tip)}</div>
        </div>` : ''}
      </div>
      ${knownFor.length > 0 ? `<div class="snap-tags" style="margin-bottom:14px">${knownFor.map(item => `<span class="snap-tag">${escapeHtml(item)}</span>`).join('')}</div>` : ''}
      ${info.canPlan ? `<div style="font-size:0.82rem;color:var(--text);margin-bottom:10px">Photo of ${escapeHtml(placeName)}:</div>
      <div id="snap-photos-grid" class="gallery-grid single-place-photo-grid"></div>` : ''}
    `;

    document.getElementById('snap-result').style.display = 'block';
    document.getElementById('snap-btn').style.display    = 'flex';
    document.getElementById('snap-plan-btn').style.display = info.canPlan ? 'block' : 'none';
    syncSnapPhotoGridSize();

    if (info.canPlan) {
      fetchUnsplashPhotos([`${placeName} ${location}`.trim(), ...knownFor.map(item => `${placeName} ${item}`)], 1)
        .then(photos => renderGalleryGrid(photos, 'snap-photos-grid'));
    }

    if (data.source === 'filename-fallback') {
      showToast(`Using file-name fallback for ${placeName}.`, 'info');
    } else if (data.source === 'temporary-fallback') {
      if (info.canPlan) {
        showToast(`Live identify is busy, so TravelNex switched to a fallback for ${placeName}.`, 'warning');
      } else {
        showToast(statusNote || 'Live identify is temporarily unavailable.', 'warning');
      }
    } else {
      showToast(`Identified: ${placeName}`);
    }
  } catch (err) {
    document.getElementById('snap-loading').style.display = 'none';
    document.getElementById('snap-btn').style.display    = 'flex';
    console.error(err);
    showToast(err?.message || 'Could not identify place. Try another photo or use Destination Gallery.', 'error');
  }
}

async function fetchDestinationInfo(dest) {
  try {
    const res = await fetch(`${API}/guide/destination`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ destination: dest })
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

async function loadGallery() {
  const dest = document.getElementById('gallery-dest').value.trim();
  if (!dest) return showToast('Enter a destination', 'error');
  _galleryCurrentDest = dest;

  document.getElementById('gallery-loading').style.display = 'block';
  document.getElementById('gallery-result').style.display  = 'none';

  try {
    const aiInfo = await fetchDestinationInfo(dest);
    const photoQueries = buildPhotoQueries(dest, aiInfo?.photo_queries || []);
    const photos = await fetchUnsplashPhotos(photoQueries, 3);

    document.getElementById('gallery-loading').style.display = 'none';
    document.getElementById('gallery-result').style.display  = 'block';
    document.getElementById('gallery-grid').classList.add('snap-gallery-grid');

    if (aiInfo) {
      document.getElementById('gallery-ai-info').innerHTML = `
        <div class="gallery-ai-card">
          <h4>${escapeHtml(aiInfo.name)}</h4>
          <p>${escapeHtml(aiInfo.description)}</p>
          <div class="gallery-ai-facts">
            <div class="gallery-fact"><b>Best Time</b>${escapeHtml(aiInfo.best_time)}</div>
            <div class="gallery-fact"><b>Budget</b>${escapeHtml(aiInfo.avg_budget)}</div>
            <div class="gallery-fact"><b>Type</b>${escapeHtml(aiInfo.trip_type)}</div>
            <div class="gallery-fact"><b>Ideal Duration</b>${escapeHtml(aiInfo.ideal_days)}</div>
          </div>
        </div>`;
    } else {
      document.getElementById('gallery-ai-info').innerHTML = '';
    }

    renderGalleryGrid(photos, 'gallery-grid');
    document.getElementById('gallery-plan-btn').style.display = 'block';
    showToast(`Gallery loaded for ${dest}`);
  } catch (err) {
    document.getElementById('gallery-loading').style.display = 'none';
    showToast('Failed to load gallery', 'error');
  }
}

function setGuidePetState(mood = 'idle', bubble = '', title = '') {
  const pet = document.getElementById('guide-pet');
  const bubbleEl = document.getElementById('guide-pet-bubble');
  const titleEl = document.getElementById('guide-pet-title');
  if (!pet || !bubbleEl || !titleEl) return;

  pet.dataset.mood = mood;
  if (title) titleEl.textContent = title;
  if (bubble) bubbleEl.textContent = bubble;
}

function openGuideRoboChat() {
  initGuideChat();
  const popup = document.getElementById('guide-robo-popup');
  if (popup) {
    popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
  }
  setGuidePetState('happy', 'Travel-only help', 'Travel Guide');

  const input = document.getElementById('guide-chat-input');
  if (popup && popup.style.display === 'block' && input) {
    setTimeout(() => input.focus(), 260);
  }
}

function closeGuideRoboChat() {
  const popup = document.getElementById('guide-robo-popup');
  if (popup) popup.style.display = 'none';
}

function cycleGuidePetTip() {
  _guidePetTipIndex = (_guidePetTipIndex + 1) % GUIDE_PET_TIPS.length;
  const tip = GUIDE_PET_TIPS[_guidePetTipIndex];
  setGuidePetState(tip.mood, tip.bubble, tip.title);
}

function initGuidePet() {
  if (_guidePetBooted) return;
  const input = document.getElementById('guide-chat-input');
  if (!input) return;

  setGuidePetState('idle', GUIDE_PET_TIPS[0].bubble, GUIDE_PET_TIPS[0].title);

  input.addEventListener('focus', () => {
    setGuidePetState('listening', '', 'Ask');
  });

  input.addEventListener('input', () => {
    const hasText = input.value.trim().length > 0;
    if (hasText) {
      setGuidePetState('typing', '', 'Plan');
    } else {
      setGuidePetState('idle', GUIDE_PET_TIPS[0].bubble, GUIDE_PET_TIPS[0].title);
    }
  });

  input.addEventListener('blur', () => {
    if (!input.value.trim()) {
      setGuidePetState('idle', GUIDE_PET_TIPS[0].bubble, GUIDE_PET_TIPS[0].title);
    }
  });

  _guidePetBooted = true;
}

function initGuideChat() {
  const box = document.getElementById('guide-chat-messages');
  if (!box || _guideChatBooted) return;

  box.innerHTML = '';
  appendGuideChatMessage(
    'bot',
    'I am your TravelNex Guide. Ask me about destinations, itineraries, budgets, hotels, food, or the best time to visit.'
  );
  initGuidePet();
  _guideChatBooted = true;
}

function getGuideChatContextLabel() {
  return _guideChatContext.placeName || _guideChatContext.destination || '';
}

function getGuideSuggestionText(kind) {
  const contextLabel = getGuideChatContextLabel();

  switch (kind) {
    case 'best-time':
      return contextLabel
        ? `Best time to visit ${contextLabel}?`
        : 'Best time to visit this place?';
    case 'must-visit':
      return contextLabel
        ? `What are the must visit places around ${contextLabel}?`
        : 'What are the must visit places?';
    case 'budget':
      return contextLabel
        ? `How much budget do I need for ${contextLabel}?`
        : 'How much budget do I need?';
    case 'trip-plan':
      return contextLabel
        ? `Plan a 3 day trip for ${contextLabel}`
        : 'Plan a 3 day trip for me';
    default:
      return kind;
  }
}

function updateGuideSuggestionChips() {
  const chips = document.querySelectorAll('[data-guide-suggestion]');
  if (!chips.length) return;

  chips.forEach((chip) => {
    const kind = chip.dataset.guideSuggestion || '';
    const prompt = getGuideSuggestionText(kind);
    chip.dataset.prompt = prompt;
    chip.title = prompt;
  });
}

function setGuideChatContext({ destination = null, placeName = null } = {}) {
  if (destination !== null) _guideChatContext.destination = destination;
  if (placeName !== null) _guideChatContext.placeName = placeName;

  const input = document.getElementById('guide-chat-input');
  const contextLabel = getGuideChatContextLabel();

  updateGuideSuggestionChips();
  if (!input) return;

  input.placeholder = contextLabel
    ? `Ask about ${contextLabel}...`
    : 'Ask about destinations, budgets, food, or itineraries...';
}

function appendGuideChatMessage(role, text) {
  const box = document.getElementById('guide-chat-messages');
  if (!box) return;

  const item = document.createElement('div');
  item.className = `guide-chat-message ${role}`;
  item.innerHTML = escapeHtml(text || '').replaceAll('\n', '<br>');
  box.appendChild(item);
  box.scrollTop = box.scrollHeight;
}

function sendGuideSuggestion(text) {
  const input = document.getElementById('guide-chat-input');
  if (!input) return;
  const suggestionText = getGuideSuggestionText(text);
  input.value = suggestionText;
  setGuidePetState('happy', `Nice pick. I am getting a travel answer ready for: ${suggestionText}`, 'Mood: Ready');
  sendGuideChat();
}

async function sendGuideChat() {
  initGuideChat();

  const input = document.getElementById('guide-chat-input');
  const sendBtn = document.getElementById('guide-chat-send');
  if (!input || !sendBtn) return;

  const message = input.value.trim();
  if (!message) return showToast('Type a message for the guide', 'error');

  appendGuideChatMessage('user', message);
  setGuidePetState('thinking', '', 'Thinking');
  input.value = '';
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Thinking';

  try {
    const res = await fetch(`${API}/guide/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message,
        destination: _guideChatContext.destination || _galleryCurrentDest || '',
        place_name: _guideChatContext.placeName || _snapIdentifiedPlace || ''
      })
    });
    const data = await res.json();

    if (!data.success || !data.reply) {
      throw new Error(data.message || 'Guide chat failed');
    }

    appendGuideChatMessage('bot', data.reply);
    setGuidePetState('happy', 'Travel answer ready. Ask a follow-up and I can refine the plan.', 'Mood: Helpful');
  } catch (err) {
    console.error(err);
    appendGuideChatMessage(
      'bot',
      'I could not answer live right now. Try again, or open the destination gallery first so I have stronger travel context.'
    );
    setGuidePetState('listening', 'I missed that one, but I am still here. Try again with a place or trip style.', 'Mood: Retry');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
  }
}
