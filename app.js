/**
 * VOYAGER v2 — Enhanced AI Travel Planner | app.js
 * Features:
 *  • Theme switcher (6 colour themes + dark mode + bg styles)
 *  • Search hub (domestic / international / multi-destination)
 *  • Destination filter
 *  • Multi-step planner with domestic/international toggle
 *  • Trip Tracker with world map pins
 *  • AI itinerary generation (server-side Gemini)
 *  • Booking integrations, toast, modal
 */

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initNavbar();
  initTagButtons();
  initDateDefaults();
  initThemePanel();
  initTrackerFromStorage();
  renderMapPins();
});

/* ════════════════════════════════════════
   NAVBAR
════════════════════════════════════════ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
}

function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}

function scrollToPlanner() {
  document.getElementById('planner').scrollIntoView({ behavior: 'smooth' });
}
function scrollToDestinations() {
  document.getElementById('destinations').scrollIntoView({ behavior: 'smooth' });
}

/* ════════════════════════════════════════
   THEME PANEL
════════════════════════════════════════ */
function initThemePanel() {
  const btn = document.getElementById('themeToggleBtn');
  const drawer = document.getElementById('themeDrawer');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    drawer.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!document.getElementById('themePanel').contains(e.target)) {
      drawer.classList.remove('open');
    }
  });
}

function closeThemeDrawer() {
  document.getElementById('themeDrawer').classList.remove('open');
  lucide.createIcons();
}

function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === theme);
  });
  showToast(`Theme changed to ${theme.charAt(0).toUpperCase() + theme.slice(1)} ✦`);
}

function setBg(bg) {
  document.body.setAttribute('data-bg', bg);
  document.querySelectorAll('.bg-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.bg === bg);
  });
}

function setMode(mode) {
  document.body.classList.toggle('dark-mode', mode === 'dark');
  document.getElementById('modeLight').classList.toggle('active', mode === 'light');
  document.getElementById('modeDark').classList.toggle('active', mode === 'dark');
  showToast(mode === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on');
}

/* ════════════════════════════════════════
   SEARCH HUB
════════════════════════════════════════ */
function switchSearchTab(tab, el) {
  document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.search-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  lucide.createIcons();
}

function swapCities(fromId, toId) {
  const fromEl = document.getElementById(fromId);
  const toEl   = document.getElementById(toId);
  const temp   = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value   = temp;
}

function setQuickSearch(inputId, value) {
  document.getElementById(inputId).value = value;
  showToast(`"${value}" selected ✦`);
}

function quickSearch(type) {
  if (type === 'domestic') {
    const from = document.getElementById('dom-from').value;
    const to   = document.getElementById('dom-to').value;
    if (!from || !to) { showToast('Please fill in both cities 📍'); return; }
    document.getElementById('destination').value = to;
    document.getElementById('fromCity').value    = from;
    scrollToPlanner();
    showToast(`Searching ${from} → ${to} ✈️`);
  } else if (type === 'international') {
    const from = document.getElementById('int-from').value;
    const to   = document.getElementById('int-to').value;
    if (!from || !to) { showToast('Please fill in both fields 📍'); return; }
    document.getElementById('destination').value = to;
    document.getElementById('fromCity').value    = from;
    scrollToPlanner();
    showToast(`Searching international trip to ${to} ✈️`);
  } else if (type === 'multi') {
    const stops = document.querySelectorAll('.multi-stop');
    const froms = [...stops].map(s => s.querySelector('.stop-from').value).filter(Boolean);
    const tos   = [...stops].map(s => s.querySelector('.stop-to').value).filter(Boolean);
    if (tos.length < 1) { showToast('Add at least one destination ✦'); return; }
    document.getElementById('destination').value = tos.join(' → ');
    document.getElementById('fromCity').value    = froms[0] || '';
    scrollToPlanner();
    showToast(`Multi-destination trip planned! ✈️`);
  }
}

/* Multi-stop management */
let stopCount = 1;
function addStop() {
  stopCount++;
  const container = document.getElementById('multiStops');
  const div = document.createElement('div');
  div.className = 'multi-stop';
  div.dataset.stop = stopCount;
  div.innerHTML = `
    <span class="stop-num">✦ ${stopCount}</span>
    <input type="text" placeholder="From city" class="stop-from" list="india-cities" />
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    <input type="text" placeholder="To city" class="stop-to" />
    <input type="date" class="stop-date" />
    <button class="remove-stop" onclick="removeStop(this)">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  `;
  container.appendChild(div);
  if (stopCount > 1) {
    document.querySelectorAll('.remove-stop').forEach(b => b.style.display = 'flex');
  }
}

function removeStop(btn) {
  btn.closest('.multi-stop').remove();
  stopCount--;
  document.querySelectorAll('.multi-stop').forEach((el, i) => {
    el.querySelector('.stop-num').textContent = `✦ ${i + 1}`;
  });
  if (stopCount <= 1) {
    document.querySelectorAll('.remove-stop').forEach(b => b.style.display = 'none');
  }
}

/* ════════════════════════════════════════
   DESTINATION FILTER
════════════════════════════════════════ */
function filterDest(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.dest-card').forEach(card => {
    const cats = card.dataset.cat || '';
    if (cat === 'all' || cats.includes(cat)) {
      card.classList.remove('filtered-out');
    } else {
      card.classList.add('filtered-out');
    }
  });
}

/* ════════════════════════════════════════
   QUICK PLAN
════════════════════════════════════════ */
function quickPlan(destination) {
  document.getElementById('destination').value = destination;
  scrollToPlanner();
  setTimeout(() => {
    document.getElementById('destination').focus();
    showToast(`"${destination}" pre-filled ✈️`);
  }, 800);
}

/* ════════════════════════════════════════
   TRIP TYPE TOGGLE
════════════════════════════════════════ */
function setTripType(type) {
  document.getElementById('ttDomestic').classList.toggle('active', type === 'domestic');
  document.getElementById('ttInternational').classList.toggle('active', type === 'international');
}

/* ════════════════════════════════════════
   TAG BUTTONS
════════════════════════════════════════ */
function initTagButtons() {
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });
}

/* ════════════════════════════════════════
   DATE DEFAULTS
════════════════════════════════════════ */
function initDateDefaults() {
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];

  const next7  = new Date(today); next7.setDate(today.getDate() + 7);
  const next14 = new Date(today); next14.setDate(today.getDate() + 14);
  const next3  = new Date(today); next3.setDate(today.getDate() + 3);
  const next30 = new Date(today); next30.setDate(today.getDate() + 30);

  if (document.getElementById('startDate')) document.getElementById('startDate').value = fmt(next7);
  if (document.getElementById('endDate'))   document.getElementById('endDate').value   = fmt(next14);
  if (document.getElementById('dom-date'))  document.getElementById('dom-date').value  = fmt(next3);
  if (document.getElementById('int-depart')) document.getElementById('int-depart').value = fmt(next7);
  if (document.getElementById('int-return')) document.getElementById('int-return').value = fmt(next14);
  if (document.getElementById('tr-start'))  document.getElementById('tr-start').value  = fmt(next30);
  const endTrip = new Date(today); endTrip.setDate(today.getDate() + 37);
  if (document.getElementById('tr-end'))    document.getElementById('tr-end').value    = fmt(endTrip);
}

/* ════════════════════════════════════════
   MULTI-STEP FORM
════════════════════════════════════════ */
let currentStep = 1;

function nextStep(fromStep) {
  if (fromStep === 1) {
    const dest = document.getElementById('destination').value.trim();
    const from = document.getElementById('fromCity').value.trim();
    if (!from) { showToast('Please enter your departure city 📍'); return; }
    if (!dest) { showToast('Please enter a destination 🗺️'); return; }
  }
  if (fromStep === 2) {
    const start = document.getElementById('startDate').value;
    const end   = document.getElementById('endDate').value;
    if (!start || !end) { showToast('Please choose your travel dates 📅'); return; }
    if (new Date(end) <= new Date(start)) { showToast('Return date must be after departure date'); return; }
  }
  goToStep(fromStep + 1);
}

function prevStep(fromStep) { goToStep(fromStep - 1); }

function goToStep(step) {
  document.querySelectorAll('.form-step').forEach(el => el.classList.add('hidden'));
  document.getElementById(`form-step-${step}`).classList.remove('hidden');
  for (let i = 1; i <= 3; i++) {
    const ind = document.getElementById(`step-ind-${i}`);
    ind.classList.remove('active', 'done');
    if (i < step)  ind.classList.add('done');
    if (i === step) ind.classList.add('active');
  }
  document.querySelectorAll('.step-line').forEach((line, idx) => {
    line.classList.toggle('done', idx < step - 1);
  });
  currentStep = step;
  lucide.createIcons();
}

/* ════════════════════════════════════════
   GENERATE ITINERARY
════════════════════════════════════════ */
async function generateItinerary() {
  const fromCity      = document.getElementById('fromCity').value.trim();
  const destination   = document.getElementById('destination').value.trim();
  const startDate     = document.getElementById('startDate').value;
  const endDate       = document.getElementById('endDate').value;
  const travellers    = document.getElementById('travellers').value;
  const budget        = document.getElementById('budget').value;
  const accommodation = document.getElementById('accommodation').value;
  const pace          = document.getElementById('pace').value;
  const special       = document.getElementById('specialRequests').value.trim();
  const activities    = Array.from(document.querySelectorAll('.tag-btn.active'))
    .map(b => b.dataset.val).join(', ');

  if (!destination) { showToast('Please enter a destination 🗺️'); return; }

  const nights = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  const days   = nights + 1;
  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  openModal();
  setLoading(true);

  const messages = [
    'Scanning 10,000+ flights ✈️',
    'Finding best hotels 🏨',
    'Curating local experiences 🗺️',
    'Building your itinerary 📋',
    'Estimating costs 💰'
  ];

  let msgIdx = 0;
  const msgEl  = document.getElementById('loadingMsg');
  const fillEl = document.getElementById('loadingFill');

  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % messages.length;
    msgEl.textContent = messages[msgIdx];
    fillEl.style.width = `${Math.min(90, (msgIdx + 1) * 20)}%`;
  }, 1200);

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination,
        days,
        budget,
        interests: activities || 'General sightseeing',
        fromCity,
        accommodation,
        pace,
        travellers,
        specialRequests: special
      })
    });

    const data = await response.json();
    clearInterval(msgInterval);
    fillEl.style.width = '100%';

    if (!response.ok) throw new Error(data.error || 'Server error');

    const itinerary = data;

    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    renderItinerary(itinerary, destination, fmtDate(startDate), fmtDate(endDate), days, travellers);

  } catch (err) {
    clearInterval(msgInterval);
    setLoading(false);
    closeModal();
    showToast(`Error: ${err.message}`);
    console.error(err);
  }
}

/* ════════════════════════════════════════
   RENDER ITINERARY
════════════════════════════════════════ */
function renderItinerary(data, destination, startDate, endDate, days, travellers) {
  document.getElementById('itinTitle').textContent = data.title || `${days} Days in ${destination}`;
  document.getElementById('itinMeta').textContent  =
    `${startDate} → ${endDate} · ${days} days · ${travellers} traveller${+travellers > 1 ? 's' : ''}`;

  document.getElementById('bookFlight').textContent    = data.estimatedCosts?.flight    || '—';
  document.getElementById('bookHotel').textContent     = data.estimatedCosts?.hotel     || '—';
  document.getElementById('bookTransport').textContent = data.estimatedCosts?.transport || '—';
  document.getElementById('bookTotal').textContent     = data.estimatedCosts?.total     || '—';

  window._tripData = { destination, startDate, endDate };

  const body = document.getElementById('itinBody');
  let html = '';

  if (data.summary) {
    html += `<p style="font-size:.93rem;color:var(--text-mid);margin-bottom:24px;padding:16px;background:var(--surface);border-radius:12px;border-left:4px solid var(--accent);">
      ✦ ${data.summary}
    </p>`;
  }

  if (data.days?.length) {
    html += `<div class="itin-section-title">📅 Day-by-Day Itinerary</div>`;
    data.days.forEach(day => {
      const acts    = (day.activities || []).map(a => `<li>${a}</li>`).join('');
      const meals   = day.meals ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(201,150,74,.08);border-radius:8px;font-size:.82rem;">
        🍳 <strong>B:</strong> ${day.meals.breakfast||'—'} &nbsp;|&nbsp;
        🍜 <strong>L:</strong> ${day.meals.lunch||'—'} &nbsp;|&nbsp;
        🍽️ <strong>D:</strong> ${day.meals.dinner||'—'}
      </div>` : '';
      const tip     = day.tips ? `<div style="margin-top:8px;font-size:.79rem;color:var(--accent3);">💡 ${day.tips}</div>` : '';

      html += `<div class="itin-day">
        <h3>
          <span style="background:var(--accent);color:var(--primary);width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.76rem;font-weight:700;flex-shrink:0;">${day.day}</span>
          ${day.title || `Day ${day.day}`}
          ${day.date ? `<span style="font-size:.73rem;color:var(--text-lt);font-weight:400;margin-left:auto;">${day.date}</span>` : ''}
        </h3>
        ${day.theme ? `<p style="font-size:.8rem;color:var(--text-lt);margin-bottom:10px;font-style:italic;">${day.theme}</p>` : ''}
        <ul>${acts}</ul>
        ${meals}${tip}
      </div>`;
    });
  }

  if (data.packingList?.length) {
    html += `<div class="itin-section-title" style="margin-top:24px;">🧳 Packing List</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
        ${data.packingList.map(item => `<span style="background:var(--surface);padding:5px 12px;border-radius:100px;font-size:.79rem;color:var(--text-mid);">✓ ${item}</span>`).join('')}
      </div>`;
  }

  if (data.importantNotes?.length) {
    html += `<div class="itin-section-title">📌 Important Notes</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${data.importantNotes.map(note => `<div style="padding:10px 14px;background:rgba(224,112,85,.06);border-left:3px solid var(--accent2);border-radius:0 8px 8px 0;font-size:.84rem;color:var(--text-mid);">⚠️ ${note}</div>`).join('')}
      </div>`;
  }

  body.innerHTML = html;
}

/* ════════════════════════════════════════
   TRIP TRACKER
════════════════════════════════════════ */
let trips = [];

function initTrackerFromStorage() {
  try {
    const saved = localStorage.getItem('voyager_trips');
    if (saved) {
      trips = JSON.parse(saved);
      trips.forEach(trip => renderTripCard(trip));
      updateTrackerEmpty();
      updateMapPins();
    }
  } catch (e) { /* first load */ }
}

function saveTripsToStorage() {
  try { localStorage.setItem('voyager_trips', JSON.stringify(trips)); } catch (e) {}
}

function addTrip() {
  const name   = document.getElementById('tr-name').value.trim();
  const dest   = document.getElementById('tr-dest').value.trim();
  const start  = document.getElementById('tr-start').value;
  const end    = document.getElementById('tr-end').value;
  const status = document.getElementById('tr-status').value;
  const budget = document.getElementById('tr-budget').value.trim();

  if (!name || !dest) { showToast('Please enter trip name and destination 📍'); return; }

  const trip = {
    id: Date.now(),
    name,
    dest,
    start,
    end,
    status,
    budget
  };

  trips.push(trip);
  saveTripsToStorage();
  renderTripCard(trip);
  updateTrackerEmpty();
  updateMapCount();
  addMapPin(dest);

  // Reset form
  document.getElementById('tr-name').value   = '';
  document.getElementById('tr-dest').value   = '';
  document.getElementById('tr-budget').value = '';

  showToast(`"${name}" added to your trip board 🗺️`);
}

function removeTrip(id) {
  trips = trips.filter(t => t.id !== id);
  saveTripsToStorage();
  const card = document.getElementById(`trip-card-${id}`);
  if (card) card.remove();
  updateTrackerEmpty();
  rebuildMapPins();
}

function renderTripCard(trip) {
  const board = document.getElementById('trackerBoard');
  const empty = document.getElementById('trackerEmpty');
  if (empty) empty.style.display = 'none';

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
  const statusMap = { planning: 'Planning', booked: 'Booked', upcoming: 'Upcoming', completed: 'Completed' };

  const card = document.createElement('div');
  card.className = 'trip-card';
  card.id = `trip-card-${trip.id}`;
  card.innerHTML = `
    <div class="trip-card-header">
      <div class="trip-card-name">${trip.name}</div>
      <button class="trip-card-remove" onclick="removeTrip(${trip.id})">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="trip-card-dest">📍 ${trip.dest}</div>
    <div class="trip-card-dates">📅 ${fmtDate(trip.start)} – ${fmtDate(trip.end)}</div>
    <span class="trip-status status-${trip.status}">${statusMap[trip.status]}</span>
    ${trip.budget ? `<div class="trip-card-budget">💰 ${trip.budget}</div>` : ''}
  `;
  board.appendChild(card);
}

function updateTrackerEmpty() {
  const empty = document.getElementById('trackerEmpty');
  if (!empty) return;
  empty.style.display = trips.length === 0 ? 'flex' : 'none';
}

/* ════════════════════════════════════════
   WORLD MAP PINS
════════════════════════════════════════ */
// Approximate lat/lng to pixel % on the world map SVG
const cityCoords = {
  'Maldives':     { x: 64, y: 58 },
  'Manali':       { x: 67, y: 39 },
  'Goa':          { x: 66, y: 50 },
  'Bali':         { x: 78, y: 60 },
  'Kerala':       { x: 66, y: 52 },
  'Rajasthan':    { x: 65, y: 43 },
  'Ladakh':       { x: 67, y: 37 },
  'Kyoto':        { x: 82, y: 40 },
  'Paris':        { x: 48, y: 31 },
  'Santorini':    { x: 53, y: 38 },
  'Tokyo':        { x: 83, y: 38 },
  'Dubai':        { x: 60, y: 45 },
  'Singapore':    { x: 76, y: 58 },
  'Bangkok':      { x: 76, y: 52 },
  'London':       { x: 47, y: 28 },
  'New York':     { x: 25, y: 36 },
};

function getApproxCoords(dest) {
  const key = Object.keys(cityCoords).find(k => dest.toLowerCase().includes(k.toLowerCase()));
  return key ? cityCoords[key] : { x: 50 + Math.random() * 20 - 10, y: 40 + Math.random() * 20 - 10 };
}

function renderMapPins() {
  trips.forEach(t => addMapPin(t.dest, false));
  updateMapCount();
}

function addMapPin(dest, animate = true) {
  const container = document.getElementById('mapPins');
  const coords    = getApproxCoords(dest);
  const pin       = document.createElement('div');
  pin.className   = 'map-pin';
  pin.style.left  = `${coords.x}%`;
  pin.style.top   = `${coords.y}%`;
  pin.title       = dest;
  pin.innerHTML   = `<div class="pin-dot"></div><div class="pin-label">${dest.split(',')[0]}</div>`;
  container.appendChild(pin);
  if (animate) pin.style.animation = 'cardIn .4s ease';
  updateMapCount();
}

function updateMapCount() {
  const pins = document.querySelectorAll('.map-pin').length;
  document.getElementById('mapCount').textContent = `${pins} destination${pins !== 1 ? 's' : ''}`;
}

function updateMapPins() {
  document.querySelectorAll('.map-pin').forEach(p => p.remove());
  renderMapPins();
}

function rebuildMapPins() {
  document.querySelectorAll('.map-pin').forEach(p => p.remove());
  renderMapPins();
}

/* ════════════════════════════════════════
   SAVE TRIP FROM MODAL
════════════════════════════════════════ */
function saveTrip() {
  const title = document.getElementById('itinTitle').textContent;
  const meta  = document.getElementById('itinMeta').textContent;
  const dest  = window._tripData?.destination || title;

  const trip = {
    id:     Date.now(),
    name:   title,
    dest:   dest,
    start:  window._tripData?.startDate || '',
    end:    window._tripData?.endDate   || '',
    status: 'planning',
    budget: document.getElementById('bookTotal').textContent || ''
  };

  trips.push(trip);
  saveTripsToStorage();
  renderTripCard(trip);
  updateTrackerEmpty();
  addMapPin(dest);
  showToast('Trip saved to your board ✦');
}

/* ════════════════════════════════════════
   BOOKING LINKS
════════════════════════════════════════ */
function openBooking(type) {
  const trip = window._tripData || {};
  const dest = encodeURIComponent(trip.destination || '');
  const urls = {
    flights:    `https://www.skyscanner.co.in/transport/flights/from/${dest}/`,
    hotels:     `https://www.booking.com/searchresults.en-gb.html?ss=${dest}`,
    transport:  `https://www.redbus.in/`,
    activities: `https://www.klook.com/en-IN/search/?query=${dest}`,
  };
  window.open(urls[type] || 'https://www.google.com', '_blank');
}

/* ════════════════════════════════════════
   MODAL
════════════════════════════════════════ */
function openModal() {
  document.getElementById('itineraryModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('itineraryModal').classList.remove('open');
  document.body.style.overflow = '';
  setLoading(true);
  document.getElementById('loadingFill').style.width = '0%';
  document.getElementById('loadingMsg').textContent = 'Scanning 10,000+ flights ✈️';
}
function setLoading(isLoading) {
  document.getElementById('modalLoading').classList.toggle('hidden', !isLoading);
  document.getElementById('modalContent').classList.toggle('hidden', isLoading);
}

document.getElementById('itineraryModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ════════════════════════════════════════
   PRINT & COPY
════════════════════════════════════════ */
function printItinerary() { window.print(); }

async function copyItinerary() {
  const text = document.getElementById('itinBody').innerText;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Itinerary copied to clipboard ✓');
  } catch {
    showToast('Could not copy — please select text manually');
  }
}

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
let toastTimer;
function showToast(msg, duration = 3500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ════════════════════════════════════════
   UTILS
════════════════════════════════════════ */
const delay = ms => new Promise(r => setTimeout(r, ms));
/* ════════════════════════════════════════
   CUSTOM AUTOCOMPLETE
════════════════════════════════════════ */
const ALL_DESTINATIONS = [
  'Manali, Himachal Pradesh','Goa','Kerala, India','Rajasthan, India',
  'Ladakh, India','Andaman Islands','Coorg, Karnataka','Ooty, Tamil Nadu',
  'Varanasi, UP','Jaipur, Rajasthan','Rishikesh, Uttarakhand','Darjeeling',
  'Munnar, Kerala','Hampi, Karnataka','Puducherry','Mysore, Karnataka',
  'Bali, Indonesia','Dubai, UAE','Singapore','Bangkok, Thailand',
  'Tokyo, Japan','Kyoto, Japan','Paris, France','London, UK',
  'New York, USA','Maldives','Santorini, Greece','Phuket, Thailand',
  'Colombo, Sri Lanka','Kathmandu, Nepal','Bhutan','Istanbul, Turkey',
  'Rome, Italy','Barcelona, Spain','Amsterdam, Netherlands','Zurich, Switzerland'
];

const INDIA_CITIES = [
  'Chennai','Mumbai','Delhi','Bangalore','Hyderabad','Kolkata',
  'Kochi','Pune','Ahmedabad','Jaipur','Surat','Amritsar','Goa'
];

function buildDropdown(dropdownId, items, inputId) {
  const dropdown = document.getElementById(dropdownId);
  dropdown.innerHTML = '';
  if (!items.length) { dropdown.style.display = 'none'; return; }
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.textContent = item;
    div.onclick = () => {
      document.getElementById(inputId).value = item;
      dropdown.style.display = 'none';
    };
    dropdown.appendChild(div);
  });
  dropdown.style.display = 'block';
}

function showDestSuggestions() {
  buildDropdown('destDropdown', ALL_DESTINATIONS, 'destination');
}
function filterDestSuggestions(val) {
  const filtered = val
    ? ALL_DESTINATIONS.filter(d => d.toLowerCase().includes(val.toLowerCase()))
    : ALL_DESTINATIONS;
  buildDropdown('destDropdown', filtered, 'destination');
}

function showFromSuggestions() {
  buildDropdown('fromDropdown', INDIA_CITIES, 'fromCity');
}
function filterFromSuggestions(val) {
  const filtered = val
    ? INDIA_CITIES.filter(c => c.toLowerCase().includes(val.toLowerCase()))
    : INDIA_CITIES;
  buildDropdown('fromDropdown', filtered, 'fromCity');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.form-group')) {
    document.querySelectorAll('.autocomplete-dropdown')
      .forEach(d => d.style.display = 'none');
  }
});
