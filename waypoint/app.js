/* Waypoint — offline-first travel companion. Vanilla JS, data in localStorage. */
(() => {
  'use strict';

  // ---------- utils ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
  const todayISO = () => iso(new Date());
  const fmtDay = (s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => parseISO(s).toLocaleDateString('en-US', opts);
  const hm = (t) => { const [h, m] = t.split(':').map(Number); return { h12: ((h + 11) % 12) + 1, m: pad(m), ap: h >= 12 ? 'pm' : 'am' }; };
  const fmtTime = (t) => { if (!t) return ''; const x = hm(t); return `${x.h12}:${x.m}${x.ap}`; };
  const dayRange = (a, b) => { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; };
  const mapsSearch = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const mapsDir = (q) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  const placeQuery = (it) => [it.place, it.address].filter(Boolean).join(', ') || '';
  const isPhone = (v) => /^\+?[\d\s\-()]{3,}$/.test(v.trim());
  const isUrl = (v) => /^https?:\/\//i.test(v.trim());
  const isAddress = (v) => /^\d+[\d-]*\s+\w|street|avenue|\bst\b|\bave\b|\bcity\b|-ku\b/i.test(v);
  const tel = (v) => `tel:${v.replace(/[^\d+]/g, '')}`;

  // ---------- icons (lucide-style line icons) ----------
  const P = (d) => d.split('|').map((x) => `<path d="${x}"/>`).join('');
  const ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/>' + P('M12 2v2|M12 20v2|m4.93 4.93 1.41 1.41|m17.66 17.66 1.41 1.41|M2 12h2|M20 12h2|m6.34 17.66-1.41 1.41|m19.07 4.93-1.41 1.41'),
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/>' + P('M16 2v4|M8 2v4|M3 10h18'),
    ticket: P('M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z|M13 5v2|M13 17v2|M13 11v2'),
    checkCircle: '<circle cx="12" cy="12" r="10"/>' + P('m8.5 12 2.5 2.5 5-5'),
    info: '<circle cx="12" cy="12" r="10"/>' + P('M12 16v-4|M12 8h.01'),
    flight: P('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'),
    stay: P('M2 4v16|M2 8h18a2 2 0 0 1 2 2v10|M2 17h20|M6 8v9'),
    train: '<rect x="4" y="3" width="16" height="16" rx="2"/>' + P('M4 11h16|M12 3v8|m8 19-2 3|m18 22-2-3|M8 15h.01|M16 15h.01'),
    transport: P('M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2|M9 17h6') + '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    activity: P('M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z|M13 5v2|M13 17v2|M13 11v2'),
    food: P('M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2|M7 2v20|M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'),
    other: P('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z') + '<circle cx="12" cy="10" r="3"/>',
    pin: P('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z') + '<circle cx="12" cy="10" r="3"/>',
    nav: P('M3 11l19-9-9 19-2-8-8-2z'),
    copy: '<rect x="8" y="8" width="14" height="14" rx="2"/>' + P('M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'),
    phone: P('M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'),
    external: P('M15 3h6v6|M10 14 21 3|M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'),
    expand: P('M15 3h6v6|M9 21H3v-6|M21 3l-7 7|M3 21l7-7'),
    plus: P('M12 5v14|M5 12h14'),
    check: P('M20 6 9 17l-5-5'),
    x: P('M18 6 6 18|M6 6l12 12'),
    left: P('m15 18-6-6 6-6'),
    right: P('m9 18 6-6-6-6'),
    edit: P('M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'),
    trash: P('M3 6h18|M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6|M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'),
    download: P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3'),
    upload: P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12'),
    paste: '<rect x="8" y="2" width="8" height="4" rx="1"/>' + P('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'),
    swap: P('m17 2 4 4-4 4|M3 11v-1a4 4 0 0 1 4-4h14|m7 22-4-4 4-4|M21 13v1a4 4 0 0 1-4 4H3'),
    refresh: P('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8|M21 3v5h-5|M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16|M8 16H3v5'),
  };
  const ic = (name, size = 18, sw = 1.75) => `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  const TYPES = {
    flight: { label: 'Flight', plural: 'Flights' },
    stay: { label: 'Stay', plural: 'Stays' },
    train: { label: 'Train', plural: 'Trains' },
    transport: { label: 'Transport', plural: 'Transport' },
    activity: { label: 'Activity', plural: 'Activities' },
    food: { label: 'Food', plural: 'Food' },
    other: { label: 'Other', plural: 'Other' },
  };
  const CATS = ['Docs', 'Chores', 'Packing', 'Booking', 'Other'];

  // ---------- state ----------
  const STORE = 'waypoint.v1';
  let state = load();
  save();
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE)); } catch (e) { /* storage unavailable */ }
    if (!s || !Array.isArray(s.trips)) s = { trips: [] };
    s.trips = s.trips.filter((t) => t.id !== 'japan-2026'); // retired demo trip
    s.seeded = s.seeded || [];
    const seed = window.SEED_TRIP;
    // Seed once per trip id, so later in-app edits are never overwritten.
    if (seed && !s.seeded.includes(seed.id)) {
      s.trips = s.trips.filter((t) => t.id !== seed.id);
      s.trips.unshift(clone(seed)); s.seeded.push(seed.id); s.activeId = seed.id;
    }
    const stored = seed && s.trips.find((t) => t.id === seed.id);
    if (stored && (stored.seedVersion || 0) < (seed.seedVersion || 0)) {
      for (const k of ['regions']) if (seed[k]) stored[k] = clone(seed[k]);
      stored.seedVersion = seed.seedVersion;
    }
    if (!s.trips.find((t) => t.id === s.activeId)) s.activeId = s.trips[0]?.id;
    return s;
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  const trip = () => state.trips.find((t) => t.id === state.activeId) || state.trips[0];

  // ---------- derived ----------
  const tripDays = (t = trip()) => dayRange(t.start, t.end);
  function focusDay(t = trip()) {
    const td = todayISO();
    return td < t.start ? t.start : td > t.end ? t.end : td;
  }
  const stayTonight = (d, t = trip()) => t.items.find((i) => i.type === 'stay' && i.date <= d && d < (i.endDate || i.date));
  // Entries shown on a day's timeline: items starting that day + stay check-outs + multi-day arrivals.
  function entriesFor(d, t = trip()) {
    const out = [];
    for (const it of t.items) {
      if (it.date === d) out.push({ it, time: it.time || '', kind: it.type === 'stay' ? 'checkin' : 'main' });
      if (it.type === 'stay' && it.endDate === d && it.endDate !== it.date) out.push({ it, time: it.endTime || '', kind: 'checkout' });
      if (it.type !== 'stay' && it.endDate && it.endDate !== it.date && it.endDate === d) out.push({ it, time: it.endTime || '', kind: 'arrive' });
    }
    return out.sort((a, b) => ((a.time || '99') < (b.time || '99') ? -1 : 1));
  }
  function cityFor(d, t = trip()) {
    if (t.cities?.[d]) return t.cities[d];
    const s = stayTonight(d, t);
    if (!s || !s.address) return '';
    // "street, district, City 123-4567, Country" → "City"
    const parts = s.address.split(',').map((x) => x.trim()).filter(Boolean);
    const p = parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 1];
    return (p || '').replace(/[\d-]{3,}/g, '').replace(/\b[A-Z]{2}\s*$/, '').trim();
  }
  const nowHM = () => { const n = new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; };
  function untilText(d, t) {
    const [h, m] = t.split(':').map(Number);
    const target = parseISO(d); target.setHours(h, m, 0, 0);
    const diff = Math.round((target - new Date()) / 60000);
    if (diff <= 0) return 'Now';
    if (diff < 60) return `In ${diff} min`;
    const hh = Math.floor(diff / 60), mm = diff % 60;
    if (hh < 24) return `In ${hh}h${mm ? ' ' + mm + 'm' : ''}`;
    const dd = Math.round(diff / 1440);
    return `In ${dd} day${dd === 1 ? '' : 's'}`;
  }

  // ---------- rendering helpers ----------
  function entryLabel(e) {
    const it = e.it;
    if (e.kind === 'checkin') return `Check in · ${it.title}`;
    if (e.kind === 'checkout') return `Check out · ${it.title}`;
    if (e.kind === 'arrive') return `Arrive${it.to ? ' ' + it.to : ''} · ${it.title}`;
    return it.title;
  }
  function entrySub(e) {
    const it = e.it, bits = [];
    if (e.kind === 'arrive' && it.from && it.to) {
      bits.push(`${it.from} → ${it.to}${it.time ? ' · left ' + fmtTime(it.time) + ' the day before' : ''}`);
    } else if (e.kind === 'main' && ['flight', 'train', 'transport'].includes(it.type) && it.from && it.to) {
      bits.push(`${it.from} → ${it.to}${it.endTime ? ' · arr ' + fmtTime(it.endTime) + (it.endDate && it.endDate !== it.date ? ' +1' : '') : ''}`);
    } else if (it.place && it.place !== it.title) bits.push(it.place);
    else if (it.address) bits.push(it.address);
    if (it.conf) bits.push(it.conf);
    return bits.join(' · ');
  }
  const timeCell = (t) => {
    if (!t) return '<div class="tm none">—</div>';
    const x = hm(t);
    return `<div class="tm">${x.h12}:${x.m}<small>${x.ap}</small></div>`;
  };
  // Which schedule entry is expanded. One at a time; on today's date the next item opens by default.
  let expanded = { day: null, key: null };
  const entryKey = (e) => `${e.it.id}:${e.kind}`;
  function openKeyFor(d, entries) {
    if (expanded.day === d) return expanded.key;
    if (d !== todayISO()) return null;
    const next = entries.find((e) => e.time && e.time >= nowHM());
    return next ? entryKey(next) : null;
  }
  function expandPanel(it) {
    const q = placeQuery(it);
    const field = (label, v, mono) => (v ? `<div class="xp-f"><div class="body"><div class="lbl">${label}</div><div class="v${mono ? ' mono' : ''}">${esc(v)}</div></div><button class="ib ghost" data-copy="${esc(v)}" aria-label="Copy ${label}">${ic('copy', 15)}</button></div>` : '');
    const acts = [
      q && `<a class="chipbtn primary" href="${mapsDir(q)}" target="_blank" rel="noopener">${ic('nav', 14, 2)}Directions</a>`,
      q && `<a class="chipbtn" href="${mapsSearch(q)}" target="_blank" rel="noopener">${ic('pin', 14, 2)}Map</a>`,
      it.url && `<a class="chipbtn" href="${esc(it.url)}" target="_blank" rel="noopener">${ic('external', 14, 2)}Booking</a>`,
      it.phone && `<a class="chipbtn" href="${esc(tel(it.phone))}">${ic('phone', 14, 2)}Call</a>`,
      it.address && `<button class="chipbtn" data-taxi="${it.id}">${ic('expand', 14, 2)}Show</button>`,
    ].filter(Boolean).join('');
    return `<div class="xp"><div class="xp-in"><div class="xp-pad">
      ${field('Confirmation', it.conf, true)}${field('Address', it.address)}
      ${it.notes ? `<div class="xp-notes">${esc(it.notes)}</div>` : ''}
      <div class="xp-acts">${acts}<button class="chipbtn ghost" data-open="${it.id}">Details${ic('right', 14, 2)}</button></div>
    </div></div></div>`;
  }
  function itemRow(e, { day, openKey } = {}) {
    const it = e.it, key = entryKey(e);
    const past = day && day === todayISO() && e.time && e.time < nowHM() && e.kind !== 'checkin';
    const q = placeQuery(it);
    return `<div class="entry${past ? ' past' : ''}${key === openKey ? ' open' : ''}" data-entry="${key}" data-day="${day || ''}">
      <div class="row tap" data-expand>
        ${timeCell(e.time)}
        <div class="body">
          <div class="t">${esc(entryLabel(e))}</div>
          <div class="s">${ic(it.type, 13, 2)}<span>${esc(entrySub(e) || TYPES[it.type].label)}</span></div>
        </div>
        ${q ? `<a class="ib" href="${mapsDir(q)}" target="_blank" rel="noopener" data-stop aria-label="Directions">${ic('nav', 16)}</a>` : ''}
      </div>
      ${expandPanel(it)}
    </div>`;
  }
  function scheduleList(d, entries, emptyText) {
    if (!entries.length) return `<div class="list"><div class="empty">${emptyText}</div></div>`;
    const openKey = openKeyFor(d, entries);
    return `<div class="list">${entries.map((e) => itemRow(e, { day: d, openKey })).join('')}</div>`;
  }
  function stayRow(s, label, day) {
    if (!s) return '';
    const q = placeQuery(s), key = `${s.id}:stay`;
    const out = s.endDate ? `Check-out ${fmtDay(s.endDate, { weekday: 'short', month: 'short', day: 'numeric' })}${s.endTime ? ', ' + fmtTime(s.endTime) : ''}` : '';
    return `<div class="list"><div class="entry stay-entry${expanded.day === day && expanded.key === key ? ' open' : ''}" data-entry="${key}" data-day="${day || ''}">
      <div class="row tap stay" data-expand>
        <div class="ico">${ic('stay', 18)}</div>
        <div class="body"><div class="lbl">${esc(label)}</div><div class="t">${esc(s.title)}</div>${out ? `<div class="s"><span>${out}</span></div>` : ''}</div>
        ${q ? `<a class="ib" href="${mapsDir(q)}" target="_blank" rel="noopener" data-stop aria-label="Directions">${ic('nav', 16)}</a>` : ''}
      </div>
      ${expandPanel(s)}
    </div></div>`;
  }
  function todoRow(td) {
    const t = trip(), today = todayISO();
    const over = !td.done && td.date && td.date < today && today >= t.start;
    const meta = [td.cat, td.date ? (over ? `<span class="over">Overdue · ${fmtDay(td.date)}</span>` : fmtDay(td.date)) : ''].filter(Boolean).join(' · ');
    return `<div class="row todo${td.done ? ' done' : ''}">
      <button class="check" data-toggle="${td.id}" aria-label="Toggle">${ic('check', 13, 3)}</button>
      <div class="body tap" data-edit-todo="${td.id}" style="cursor:pointer">
        <div class="t">${esc(td.text)}</div>
        ${meta ? `<div class="s"><span>${meta}</span></div>` : ''}
      </div>
    </div>`;
  }
  const addTodoRow = (date) => `<form class="row add-row" data-quick-todo="${date || ''}">
      <span class="plus">${ic('plus', 18)}</span>
      <input name="text" placeholder="Add a to-do" autocomplete="off" enterkeyhint="done">
    </form>`;
  const weekStart = (d) => addDays(d, -parseISO(d).getDay()); // weeks start Sunday
  const TRAVEL = ['flight', 'train', 'transport'];
  const isTravelDay = (d) => entriesFor(d).some((e) => TRAVEL.includes(e.it.type));
  const clampTrip = (d, t = trip()) => (d < t.start ? t.start : d > t.end ? t.end : d);
  const nDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5) + 1;
  function citiesIn(days) {
    const out = [];
    days.forEach((d) => cityFor(d).split('→').map((c) => c.trim()).filter(Boolean).forEach((c) => { if (out[out.length - 1] !== c) out.push(c); }));
    return out;
  }
  // Where the "jump back" button goes: today during the trip, Day 1 before it, nothing after.
  function jumpTarget(t = trip()) {
    const today = todayISO();
    if (today >= t.start && today <= t.end) return { d: today, label: 'Today' };
    if (today < t.start) return { d: t.start, label: 'Day 1' };
    return null;
  }
  function weekStrip(sel) {
    const t = trip(), today = todayISO();
    const ws = weekStart(sel), first = weekStart(t.start), last = weekStart(t.end);
    const days = dayRange(ws, addDays(ws, 6));
    const wk = Math.round((parseISO(ws) - parseISO(first)) / 6048e5) + 1;
    const total = Math.round((parseISO(last) - parseISO(first)) / 6048e5) + 1;
    const inTrip = (d) => d >= t.start && d <= t.end;
    const sameMonth = parseISO(days[0]).getMonth() === parseISO(days[6]).getMonth();
    const range = `${fmtDay(days[0], { month: 'short', day: 'numeric' })} – ${fmtDay(days[6], sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}`;
    const jump = jumpTarget(t);
    const prev = ws > first ? clampTrip(addDays(sel, -7)) : '';
    const next = ws < last ? clampTrip(addDays(sel, 7)) : '';
    return `<div class="wk">
      <div class="wk-head">
        <a class="wk-label" href="#/calendar">
          <div class="wk-t">${range}<span>Week ${wk} of ${total}</span></div>
          <div class="wk-c">${esc(citiesIn(days.filter(inTrip)).join(' → '))}</div>
        </a>
        ${jump && jump.d !== sel ? `<a class="wk-jump" href="#/day/${jump.d}">${jump.label}</a>` : ''}
        <button class="wk-nav" data-go="${prev}"${prev ? '' : ' disabled'} aria-label="Previous week">${ic('left', 18)}</button>
        <button class="wk-nav" data-go="${next}"${next ? '' : ' disabled'} aria-label="Next week">${ic('right', 18)}</button>
      </div>
      <div class="wk-days" data-swipe>${days.map((d) => {
        const inner = `<span class="w">${fmtDay(d, { weekday: 'narrow' })}</span><span class="n">${parseISO(d).getDate()}</span><span class="mk${inTrip(d) && isTravelDay(d) ? ' on' : ''}"></span>`;
        const cls = `dchip${d === sel ? ' on' : ''}${d === today ? ' today' : ''}`;
        return inTrip(d) ? `<a class="${cls}" href="#/day/${d}">${inner}</a>` : `<span class="${cls} out">${inner}</span>`;
      }).join('')}</div>
    </div>`;
  }
  function bindSwipe() {
    const el = document.querySelector('[data-swipe]');
    if (!el) return;
    let x0 = null, y0 = 0;
    el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      const btn = document.querySelectorAll('.wk-nav')[dx > 0 ? 0 : 1];
      if (btn && !btn.disabled) btn.click();
    });
  }
  // Legs: runs of consecutive days that share a city label
  function tripLegs(t = trip()) {
    const out = [];
    tripDays(t).forEach((d) => { const c = cityFor(d, t) || ''; const L = out[out.length - 1]; if (L && L.c === c) L.to = d; else out.push({ c, from: d, to: d }); });
    return out;
  }
  const legOf = (d) => tripLegs().find((L) => d >= L.from && d <= L.to);
  function dayKicker(d) {
    const t = trip(), idx = tripDays().indexOf(d), city = cityFor(d);
    const n = idx >= 0 ? `Day ${idx + 1} of ${tripDays().length} · ` : '';
    return `${n}<button class="kick-edit" data-edit-city="${d}">${city ? esc(city) : 'Add city'}${ic('edit', 12, 2)}</button>`;
  }
  function openCityEditor(d) {
    const t = trip(), L = legOf(d), cur = cityFor(d);
    const n = L ? nDays(L.from, L.to) : 1;
    const short = (x) => fmtDay(x, { month: 'short', day: 'numeric' });
    openSheet(`<h2>City</h2>
      <form class="form" id="cityForm">
        <div class="f"><label>Name</label><input name="city" value="${esc(cur)}" placeholder="e.g. Oaxaca" autocomplete="off"></div>
        ${n > 1 ? `<div class="f"><label>Apply to</label><div class="radios">
          <label class="radio"><input type="radio" name="scope" value="leg" checked><span>All ${n} days${L.c ? ` of ${esc(L.c)}` : ''}<small>${short(L.from)} – ${short(L.to)}</small></span></label>
          <label class="radio"><input type="radio" name="scope" value="day"><span>Only this day<small>${fmtDay(d)}</small></span></label>
        </div></div>` : ''}
        <p class="hint">For travel days, use an arrow, e.g. “Lima → Los Angeles”. Leave it empty to use the hotel's city.</p>
        ${sheetBtns()}
      </form>`, (sh) => {
      $('#cityForm', sh).addEventListener('submit', (ev) => {
        ev.preventDefault();
        const f = Object.fromEntries(new FormData(ev.target));
        const v = f.city.trim().replace(/\s*->\s*/g, ' → ');
        const days = f.scope === 'leg' && L ? dayRange(L.from, L.to) : [d];
        t.cities = t.cities || {};
        days.forEach((x) => { if (v) t.cities[x] = v; else delete t.cities[x]; });
        save(); closeSheet(); render(); toast('City updated');
      });
    });
  }
  const daysSeg = (which) => `<div class="seg seg-2"><a class="${which === 'list' ? 'on' : ''}" href="#/days">List</a><a class="${which === 'calendar' ? 'on' : ''}" href="#/calendar">Calendar</a></div>`;
  const section = (title, right = '') => `<div class="sh"><h3>${title}</h3>${right}</div>`;
  const moreLink = (href, text) => `<a class="lk" href="${href}">${text}${ic('right', 14)}</a>`;

  function nowCard(label, right, time, title, sub, actions) {
    const x = time ? hm(time) : null;
    return `<div class="now">
      <div class="now-top"><span class="lbl">${label}</span>${right ? `<span class="in">${right}</span>` : ''}</div>
      ${x ? `<div class="now-time">${x.h12}:${x.m}<small>${x.ap}</small></div>` : '<div style="height:16px"></div>'}
      <div class="now-title">${esc(title)}</div>
      ${sub ? `<div class="now-sub">${esc(sub)}</div>` : ''}
      ${actions ? `<div class="now-actions">${actions}</div>` : ''}
    </div>`;
  }

  // ---------- views ----------
  const views = {
    today() {
      const t = trip(), d = focusDay(), today = todayISO();
      const entries = entriesFor(d);
      const inTrip = today >= t.start && today <= t.end;
      let hero;
      if (today < t.start) {
        const n = Math.round((parseISO(t.start) - parseISO(today)) / 86400000);
        const first = entriesFor(t.start)[0];
        hero = nowCard('Trip starts', `In ${n} day${n === 1 ? '' : 's'}`, first?.time, first ? entryLabel(first) : t.name, fmtDay(t.start, { weekday: 'long', month: 'long', day: 'numeric' }), '');
      } else {
        const next = inTrip ? entries.find((e) => e.time && e.time >= nowHM()) : null;
        const tmr = addDays(d, 1);
        const tFirst = inTrip && d < t.end ? entriesFor(tmr)[0] : null;
        if (next) {
          const q = placeQuery(next.it);
          hero = nowCard('Next up', untilText(d, next.time), next.time, entryLabel(next), entrySub(next),
            `${q ? `<a class="pill inv" href="${mapsDir(q)}" target="_blank" rel="noopener">${ic('nav', 15, 2)}Directions</a>` : ''}<button class="pill ghost" data-open="${next.it.id}">Details</button>`);
        } else if (tFirst) {
          hero = nowCard('Tomorrow, first up', '', tFirst.time, entryLabel(tFirst), [fmtDay(tmr, { weekday: 'long' }), entrySub(tFirst)].filter(Boolean).join(' · '),
            `<button class="pill inv" data-open="${tFirst.it.id}">Details</button><a class="pill ghost" href="#/day/${tmr}">See tomorrow</a>`);
        } else {
          hero = nowCard(inTrip ? 'Nothing scheduled' : 'Trip complete', '', '', inTrip ? 'Free time' : 'Welcome home', inTrip ? 'See your rough plan below.' : t.name, '');
        }
      }
      const todos = t.todos.filter((x) => !x.done && x.date && x.date <= d);
      return {
        kicker: dayKicker(d),
        title: d === today ? 'Today' : fmtDay(d, { weekday: 'long' }),
        html: `${weekStrip(d)}
        ${hero}
        ${section('Schedule', moreLink(`#/day/${d}`, 'Day view'))}
        ${scheduleList(d, entries, 'Nothing booked today')}
        ${section('Sleeping')}
        ${stayRow(stayTonight(d), d === today ? 'Tonight' : fmtDay(d), d) || '<div class="list"><div class="empty">No stay tonight</div></div>'}
        ${section('To-do', moreLink('#/todos', 'All'))}
        <div class="list">${todos.map(todoRow).join('')}${addTodoRow(d)}</div>
        ${section('Rough plan')}
        <textarea class="notes" data-daynote="${d}" placeholder="Morning… afternoon… dinner idea…">${esc(t.dayNotes?.[d] || '')}</textarea>`,
        fab: () => openItemEditor(null, d),
        after: bindSwipe,
      };
    },

    days() {
      const t = trip(), today = todayISO();
      return {
        kicker: `${fmtDay(t.start, { month: 'short', day: 'numeric' })} – ${fmtDay(t.end, { month: 'short', day: 'numeric' })} · ${tripDays().length} days`,
        title: 'Days',
        html: `${daysSeg('list')}<div class="list">${tripDays().map((d, i) => {
          const es = entriesFor(d);
          const open = t.todos.filter((x) => !x.done && x.date === d).length;
          const note = (t.dayNotes?.[d] || '').split('\n')[0];
          const city = cityFor(d);
          const summary = es.length ? es.map((e) => esc(e.kind === 'main' ? e.it.title : entryLabel(e))).join(' · ') : note ? esc(note) : 'Open day';
          return `<a class="row tap dayrow${d === today ? ' today' : ''}${d < today ? ' past' : ''}" href="#/day/${d}">
            <div class="dn"><div class="d">${parseISO(d).getDate()}</div><div class="w">${fmtDay(d, { weekday: 'short' })}</div></div>
            <div class="body">
              <div class="t">${city ? esc(city) : `Day ${i + 1}`}${d === today ? ' <span class="badge accent">Today</span>' : ''}${open ? ` <span class="badge">${open} to-do</span>` : ''}</div>
              <div class="s2">${summary}</div>
            </div>
            <span class="chev">${ic('right', 16)}</span>
          </a>`;
        }).join('')}</div>`,
        fab: () => openItemEditor(null, focusDay()),
      };
    },

    calendar() {
      const t = trip(), today = todayISO();
      const regions = t.regions || [];
      const PAL = ['#E0703F', '#3B82C4', '#8E6BD0', '#2E9E6B', '#C9962B', '#8C8C91'];
      const regionOf = (d) => regions.findIndex((r) => d >= r.from && d <= r.to);
      const colorOf = (d) => { const i = regionOf(d); return i >= 0 ? PAL[i % PAL.length] : '#8C8C91'; };
      const short = (d) => fmtDay(d, { month: 'short', day: 'numeric' });
      const months = [];
      for (let m = t.start.slice(0, 8) + '01'; m <= t.end; m = iso(new Date(parseISO(m).getFullYear(), parseISO(m).getMonth() + 1, 1))) months.push(m);
      const grid = (m) => {
        const mo = parseISO(m).getMonth();
        const lastDay = iso(new Date(parseISO(m).getFullYear(), mo + 1, 0));
        // only weeks that overlap the trip
        const from = [weekStart(m), weekStart(t.start)].sort()[1];
        const to = [addDays(weekStart(lastDay), 6), addDays(weekStart(t.end), 6)].sort()[0];
        const cells = dayRange(from, to).map((d) => {
          if (parseISO(d).getMonth() !== mo) return '<span class="cd blank"></span>';
          const n = parseISO(d).getDate();
          if (d < t.start || d > t.end) return `<span class="cd out">${n}</span>`;
          return `<a class="cd in${d === today ? ' today' : ''}${d < today ? ' past' : ''}" href="#/day/${d}" style="--rc:${colorOf(d)}">${n}${isTravelDay(d) ? '<i></i>' : ''}</a>`;
        }).join('');
        return `<div class="mon"><div class="mon-h">${parseISO(m).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          <div class="cal">${'SMTWTFS'.split('').map((x) => `<span class="cw">${x}</span>`).join('')}${cells}</div></div>`;
      };
      // Route legs: consecutive days that share a city label
      const legs = tripLegs();
      const legend = regions.map((r, i) => `<span class="lg"><i style="background:${PAL[i % PAL.length]}"></i>${esc(r.name)}<b>${nDays(r.from, r.to)}d</b></span>`).join('');
      return {
        kicker: `${short(t.start)} – ${short(t.end)} · ${tripDays().length} days`,
        title: 'Days',
        html: `${daysSeg('calendar')}
        ${legend ? `<div class="legend">${legend}<span class="lg"><i class="dot-travel"></i>Travel day</span></div>` : ''}
        ${months.map(grid).join('')}
        ${section('Route')}
        <div class="list">${legs.map((L) => {
          const travel = L.c.includes('→'), n = nDays(L.from, L.to);
          return `<a class="row tap leg${L.to < today ? ' past' : ''}" href="#/day/${L.from}">
            <span class="leg-dot" style="background:${colorOf(L.from)}"></span>
            <div class="body"><div class="t">${esc(L.c || 'Add city')}</div><div class="s"><span>${short(L.from)}${L.to !== L.from ? ' – ' + short(L.to) : ''}</span></div></div>
            <span class="badge">${travel ? 'Travel' : `${n} day${n > 1 ? 's' : ''}`}</span>
            <button class="ib ghost" data-edit-city="${L.from}" aria-label="Edit city">${ic('edit', 15)}</button>
          </a>`;
        }).join('')}</div>`,
        fab: null,
      };
    },

    day(d) {
      const t = trip();
      if (!d || d < t.start || d > t.end) d = focusDay();
      const es = entriesFor(d);
      const todos = t.todos.filter((x) => x.date === d);
      const idx = tripDays().indexOf(d);
      return {
        kicker: dayKicker(d),
        title: fmtDay(d, { weekday: 'long', month: 'short', day: 'numeric' }),
        html: `${weekStrip(d)}
        ${section('Schedule', `<button class="lk" data-add-item="${d}">${ic('plus', 14)}Add</button>`)}
        ${scheduleList(d, es, 'Nothing scheduled yet')}
        ${stayTonight(d) ? section('Sleeping') + stayRow(stayTonight(d), 'Sleeping at', d) : ''}
        ${section('Rough plan')}
        <textarea class="notes" data-daynote="${d}" placeholder="Rough ideas for the day — saves automatically">${esc(t.dayNotes?.[d] || '')}</textarea>
        ${section('To-do')}
        <div class="list">${todos.map(todoRow).join('')}${addTodoRow(d)}</div>`,
        fab: () => openItemEditor(null, d),
        after: bindSwipe,
      };
    },

    bookings(filter = 'all') {
      const t = trip();
      const types = ['all', ...Object.keys(TYPES).filter((k) => t.items.some((i) => i.type === k))];
      const list = t.items.filter((i) => filter === 'all' || i.type === filter)
        .sort((a, b) => ((a.date + (a.time || '')) < (b.date + (b.time || '')) ? -1 : 1));
      const byDay = {};
      list.forEach((it) => (byDay[it.date] = byDay[it.date] || []).push(it));
      const rows = Object.entries(byDay).map(([d, its]) => `<div class="dhead">${fmtDay(d, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        <div class="list">${its.map((it) => `<div class="row tap" data-open="${it.id}">
          <div class="ico">${ic(it.type, 18)}</div>
          <div class="body"><div class="t">${esc(it.title)}</div><div class="s"><span>${[it.time && fmtTime(it.time), it.type === 'stay' && it.endDate && `until ${fmtDay(it.endDate, { month: 'short', day: 'numeric' })}`, it.conf].filter(Boolean).map(esc).join(' · ') || TYPES[it.type].label}</span></div></div>
          <span class="chev">${ic('right', 16)}</span>
        </div>`).join('')}</div>`).join('');
      return {
        kicker: `${t.items.length} items`,
        title: 'Bookings',
        html: `<div class="seg">${types.map((k) => `<a class="${k === filter ? 'on' : ''}" href="#/bookings/${k}">${k === 'all' ? 'All' : TYPES[k].plural}</a>`).join('')}</div>
        ${rows || '<div class="list"><div class="empty">Nothing here yet</div></div>'}`,
        fab: () => openItemEditor(null, focusDay(), filter !== 'all' ? filter : undefined),
      };
    },

    todos() {
      const t = trip(), today = todayISO();
      const open = t.todos.filter((x) => !x.done);
      const done = t.todos.filter((x) => x.done);
      const now = open.filter((x) => x.date && x.date <= today);
      const later = open.filter((x) => x.date && x.date > today).sort((a, b) => (a.date < b.date ? -1 : 1));
      const any = open.filter((x) => !x.date);
      const block = (title, arr) => (arr.length ? section(title) + `<div class="list">${arr.map(todoRow).join('')}</div>` : '');
      return {
        kicker: `${open.length} open · ${done.length} done`,
        title: 'To-dos',
        html: `<div class="list">${addTodoRow('')}</div>
        ${block('Now', now)}${block('Upcoming', later)}${block('Anytime', any)}
        ${!open.length ? '<div class="empty" style="margin-top:24px">All done.</div>' : ''}
        ${done.length ? `<details class="done-group"><summary>${section(`Done · ${done.length}`, `<span class="lk">Show${ic('right', 14)}</span>`)}</summary><div class="list">${done.map(todoRow).join('')}</div></details>` : ''}`,
        fab: () => openTodoEditor(null),
      };
    },

    info() {
      const t = trip();
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      const menuRow = (act, icon, label) => `<button class="row tap" style="width:100%;text-align:left" data-act="${act}"><div class="ico">${ic(icon, 18)}</div><div class="body"><div class="t">${label}</div></div><span class="chev">${ic('right', 16)}</span></button>`;
      return {
        kicker: 'Trip',
        title: 'Info',
        html: `<div class="trip-head">
          <div class="nm">${esc(t.name)}</div>
          <div class="meta">${fmtDay(t.start)} – ${fmtDay(t.end)} · ${tripDays().length} days</div>
          <div class="links"><button data-act="edit-trip">Edit</button>${state.trips.length > 1 ? '<button data-act="switch-trip">Switch trip</button>' : ''}<button data-act="new-trip">New trip</button></div>
        </div>
        ${section('Essentials', `<button class="lk" data-act="add-info">${ic('plus', 14)}Add</button>`)}
        <div class="list">${t.info.map((r) => {
          const v = r.value || '';
          const action = isPhone(v) ? `<a class="ib" href="${esc(tel(v))}" aria-label="Call">${ic('phone', 16)}</a>`
            : isUrl(v) ? `<a class="ib" href="${esc(v)}" target="_blank" rel="noopener" aria-label="Open">${ic('external', 16)}</a>`
            : isAddress(v) ? `<a class="ib" href="${mapsSearch(v)}" target="_blank" rel="noopener" aria-label="Map">${ic('pin', 16)}</a>` : '';
          return `<div class="row"><div class="body tap" data-edit-info="${r.id}" style="cursor:pointer"><div class="lbl">${esc(r.label)}</div><div class="v">${esc(v)}</div></div>
            ${action}<button class="ib ghost" data-copy="${esc(v)}" aria-label="Copy">${ic('copy', 16)}</button></div>`;
        }).join('') || '<div class="empty">Emergency numbers, embassy, wifi…</div>'}</div>
        ${section('Data')}
        <div class="list">
          ${menuRow('paste-import', 'paste', 'Paste rows from Google Sheets')}
          ${menuRow('export', 'download', 'Export backup')}
          ${menuRow('import-json', 'upload', 'Restore backup')}
          ${window.SEED_TRIP ? menuRow('reset', 'refresh', 'Reload trip data') : ''}
        </div>
        <input type="file" id="jsonFile" accept="application/json,.json" hidden>
        ${section('Install')}
        ${standalone ? '<p class="hint">Installed. Works offline.</p>'
          : isIOS ? '<p class="hint">In Safari, tap <b>Share</b> → <b>Add to Home Screen</b>. Opens full-screen and works offline.</p>'
          : `<p class="hint">In Chrome, open the menu → <b>Install app</b>.</p>${deferredInstall ? '<button class="pill solid" style="margin-top:10px" data-act="install">Install Waypoint</button>' : ''}`}
        <div class="foot"><button class="txtbtn danger" data-act="delete-trip">${ic('trash', 15)}Delete trip</button></div>
        <p class="foot-note">Stored only on this device.<br><a href="spec.html">Product spec</a></p>`,
        fab: null,
      };
    },
  };

  function itemDetail(it) {
    const q = placeQuery(it);
    const travel = TRAVEL.includes(it.type) && it.from && it.to;
    const kv = (k, v, { mono } = {}) => (v ? `<div class="row"><div class="body"><div class="lbl">${k}</div><div class="v${mono ? ' mono' : ''}">${esc(v)}</div></div><button class="ib ghost" data-copy="${esc(v)}" aria-label="Copy">${ic('copy', 16)}</button></div>` : '');
    const when = it.type === 'stay'
      ? `${fmtDay(it.date)}${it.time ? ', ' + fmtTime(it.time) : ''} → ${it.endDate ? fmtDay(it.endDate) : ''}${it.endTime ? ', ' + fmtTime(it.endTime) : ''}`
      : `${fmtDay(it.date, { weekday: 'long', month: 'short', day: 'numeric' })}${it.time ? ' · ' + fmtTime(it.time) : ''}${it.endTime && !travel ? ' – ' + fmtTime(it.endTime) : ''}`;
    const nights = it.type === 'stay' && it.endDate ? nDays(it.date, it.endDate) - 1 : 0;
    const act = (inner, label, primary) => `<div class="act${primary ? ' primary' : ''}">${inner}<span>${label}</span></div>`;
    const fields = kv('Confirmation', it.conf, { mono: true }) + kv('Place', it.place !== it.title ? it.place : '') + kv('Address', it.address) + kv('Phone', it.phone);
    return `<div class="d-type">${ic(it.type, 15, 2)}${TYPES[it.type].label}</div>
      <h2 class="d-title">${esc(it.title)}</h2>
      <div class="d-when">${when}${nights ? ` · ${nights} night${nights > 1 ? 's' : ''}` : ''}</div>
      ${travel ? `<div class="route"><div class="end"><div class="c">${esc(it.from)}</div><div class="tt">${fmtTime(it.time)}</div></div><div class="line">${ic(it.type, 16)}</div><div class="end r"><div class="c">${esc(it.to)}</div><div class="tt">${fmtTime(it.endTime)}${it.endDate && it.endDate !== it.date ? ' +1' : ''}</div></div></div>` : ''}
      <div class="acts">
        ${q ? act(`<a class="ib" href="${mapsDir(q)}" target="_blank" rel="noopener">${ic('nav', 20)}</a>`, 'Directions', true) + act(`<a class="ib" href="${mapsSearch(q)}" target="_blank" rel="noopener">${ic('pin', 20)}</a>`, 'Map') : ''}
        ${it.url ? act(`<a class="ib" href="${esc(it.url)}" target="_blank" rel="noopener">${ic('external', 20)}</a>`, 'Booking') : ''}
        ${it.phone ? act(`<a class="ib" href="${esc(tel(it.phone))}">${ic('phone', 20)}</a>`, 'Call') : ''}
        ${it.address ? act(`<button class="ib" data-taxi="${it.id}">${ic('expand', 20)}</button>`, 'Show') : ''}
      </div>
      ${fields ? `<div class="list" style="margin-top:20px">${fields}</div>` : ''}
      ${it.notes ? section('Notes') + `<div class="notes-box">${esc(it.notes)}</div>` : ''}
      <div class="foot">
        <button class="txtbtn" data-edit-item="${it.id}">${ic('edit', 15)}Edit</button>
        <button class="txtbtn danger" data-del-item="${it.id}">${ic('trash', 15)}Delete</button>
      </div>`;
  }
  function openItemSheet(id) {
    const it = trip().items.find((x) => x.id === id);
    if (it) openSheet(itemDetail(it));
  }

  // ---------- router ----------
  let current = null, lastTab = 'today';
  function welcome() {
    return { kicker: '', title: '', html: `<div class="welcome">
      <img src="icons/icon.svg" width="72" height="72" alt="">
      <h2>Waypoint</h2>
      <p>Your trips live only on this device. Restore a backup file to load a trip, or start a new one.</p>
      <button class="pill solid" data-act="import-json">${ic('upload', 16, 2)}Restore backup</button>
      <button class="pill soft" data-act="new-trip">${ic('plus', 16, 2)}Start a new trip</button>
      <input type="file" id="jsonFile" accept=".json,application/json" hidden>
    </div>` };
  }
  function render() {
    const [, name = 'today', arg] = (location.hash || '#/today').split('/');
    $('#tabbar').style.display = trip() ? '' : 'none';
    if (!trip()) {
      const v = welcome(); current = v;
      $('.topbar').style.display = 'none';
      $('#view').innerHTML = v.html;
      return;
    }
    const fn = views[name] || views.today;
    const v = fn(arg ? decodeURIComponent(arg) : undefined);
    current = v;
    $('#kicker').innerHTML = v.kicker ?? '';
    $('#pageTitle').textContent = v.title;
    $('.topbar').style.display = v.title ? '' : 'none';
    $('#view').innerHTML = v.html + (v.fab ? `<button class="fab" data-act="fab" aria-label="Add">${ic('plus', 24, 2)}</button>` : '');
    const tab = name === 'day' || name === 'calendar' ? 'days' : name === 'item' ? lastTab : (views[name] ? name : 'today');
    lastTab = tab;
    document.querySelectorAll('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
    v.after?.();
  }
  document.querySelectorAll('#tabbar a').forEach((a) => a.insertAdjacentHTML('afterbegin', ic(a.dataset.icon, 23, 1.6)));
  window.addEventListener('hashchange', () => { closeSheet(); render(); window.scrollTo(0, 0); });

  // ---------- toast / clipboard ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 1600);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast('Copied');
  }

  // ---------- sheet ----------
  function openSheet(html, onMount) {
    const sh = $('#sheet');
    sh.innerHTML = `<div class="grab"></div>${html}`;
    sh.classList.add('on'); $('#backdrop').classList.add('on');
    onMount?.(sh);
  }
  function closeSheet() { $('#sheet').classList.remove('on'); $('#backdrop').classList.remove('on'); }
  $('#backdrop').addEventListener('click', closeSheet);
  (() => {
    const sh = $('#sheet');
    let y0 = null, dy = 0;
    sh.addEventListener('touchstart', (e) => { if (sh.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
    sh.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { sh.style.transition = 'none'; sh.style.transform = `translateY(${dy}px)`; }
    }, { passive: true });
    sh.addEventListener('touchend', () => {
      if (y0 === null) return;
      sh.style.transition = ''; sh.style.transform = '';
      if (dy > 90) closeSheet();
      y0 = null;
    });
  })();
  const sheetBtns = (left = '<button type="button" class="pill soft" data-act="close">Cancel</button>') => `<div class="btns">${left}<button class="pill solid">Save</button></div>`;

  const ITEM_FIELDS = [
    { k: 'title', label: 'Title', ph: { flight: 'UA 837 SFO → NRT', stay: 'Hotel name', train: 'Shinkansen to Kyoto', default: 'What is it?' }, req: true },
    { row: [{ k: 'date', label: 'Date', type: 'date', req: true }, { k: 'time', label: 'Time', type: 'time' }] },
    { row: [{ k: 'from', label: 'From' }, { k: 'to', label: 'To' }], types: ['flight', 'train', 'transport'] },
    { row: [{ k: 'endDate', label: { stay: 'Check-out', default: 'End / arrival date' }, type: 'date' }, { k: 'endTime', label: { stay: 'Check-out time', default: 'End / arrival time' }, type: 'time' }] },
    { k: 'place', label: 'Place name (for Maps)' },
    { k: 'address', label: 'Address' },
    { k: 'conf', label: 'Confirmation #' },
    { row: [{ k: 'url', label: 'Link', type: 'url' }, { k: 'phone', label: 'Phone', type: 'tel' }] },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const pick = (v, type) => (typeof v === 'object' ? v[type] || v.default : v) || '';
  function fieldHTML(f, it) {
    const lbl = pick(f.label, it.type), ph = f.ph ? pick(f.ph, it.type) : '';
    const val = esc(it[f.k] || '');
    const ctl = f.type === 'textarea' ? `<textarea name="${f.k}" placeholder="${esc(ph)}">${val}</textarea>`
      : `<input name="${f.k}" type="${f.type || 'text'}" value="${val}" placeholder="${esc(ph)}"${f.req ? ' required' : ''}>`;
    return `<div class="f"><label>${lbl}</label>${ctl}</div>`;
  }
  function openItemEditor(id, date, type) {
    const t = trip();
    const existing = id ? t.items.find((x) => x.id === id) : null;
    const it = existing ? clone(existing) : { id: uid(), type: type || 'activity', date: date || focusDay() };
    const draw = () => {
      openSheet(`<h2>${existing ? 'Edit' : 'New plan'}</h2>
        <form class="form" id="itemForm">
          <div class="typepick">${Object.entries(TYPES).map(([k, v]) => `<button type="button" class="${k === it.type ? 'on' : ''}" data-type="${k}">${ic(k, 15, 2)}${v.label}</button>`).join('')}</div>
          ${ITEM_FIELDS.filter((f) => !f.types || f.types.includes(it.type)).map((f) => (f.row ? `<div class="row2">${f.row.map((x) => fieldHTML(x, it)).join('')}</div>` : fieldHTML(f, it))).join('')}
          ${sheetBtns()}
        </form>`, (sh) => {
        const form = $('#itemForm', sh);
        sh.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
          Object.assign(it, Object.fromEntries(new FormData(form)));
          it.type = b.dataset.type; draw();
        }));
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          Object.assign(it, Object.fromEntries(new FormData(form)));
          for (const k of Object.keys(it)) if (it[k] === '') delete it[k];
          if (existing) {
            for (const k of Object.keys(existing)) if (!(k in it)) delete existing[k];
            Object.assign(existing, it);
          } else t.items.push(it);
          extendTrip(t, it.date); extendTrip(t, it.endDate);
          save(); closeSheet(); render(); toast(existing ? 'Saved' : 'Added');
        });
      });
    };
    draw();
  }
  function extendTrip(t, d) { if (!d) return; if (d < t.start) t.start = d; if (d > t.end) t.end = d; }

  function openTodoEditor(id) {
    const t = trip();
    const existing = id ? t.todos.find((x) => x.id === id) : null;
    const td = existing ? clone(existing) : { id: uid(), text: '', date: null, cat: 'Chores', done: false };
    openSheet(`<h2>${existing ? 'Edit to-do' : 'New to-do'}</h2>
      <form class="form" id="todoForm">
        <div class="f"><label>To-do</label><input name="text" value="${esc(td.text)}" required placeholder="Do laundry, visa photos…"></div>
        <div class="row2">
          <div class="f"><label>Day</label><select name="date"><option value="">Anytime</option>${dayRange(addDays(t.start, -14), t.end).map((d) => `<option value="${d}"${d === td.date ? ' selected' : ''}>${fmtDay(d)}${d < t.start ? ' (before)' : ''}</option>`).join('')}</select></div>
          <div class="f"><label>Category</label><select name="cat">${CATS.map((c) => `<option${c === td.cat ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
        </div>
        ${sheetBtns(existing ? '<button type="button" class="pill soft" style="color:var(--danger)" id="tdDel">Delete</button>' : undefined)}
      </form>`, (sh) => {
      $('#tdDel', sh)?.addEventListener('click', () => { t.todos = t.todos.filter((x) => x.id !== id); save(); closeSheet(); render(); });
      $('#todoForm', sh).addEventListener('submit', (ev) => {
        ev.preventDefault();
        const f = Object.fromEntries(new FormData(ev.target));
        Object.assign(td, { text: f.text.trim(), date: f.date || null, cat: f.cat });
        if (existing) Object.assign(existing, td); else t.todos.push(td);
        save(); closeSheet(); render();
      });
    });
  }

  function openInfoEditor(id) {
    const t = trip();
    const existing = id ? t.info.find((x) => x.id === id) : null;
    openSheet(`<h2>${existing ? 'Edit' : 'Add'} essential</h2>
      <form class="form" id="infoForm">
        <div class="f"><label>Label</label><input name="label" required value="${esc(existing?.label)}" placeholder="Hotel wifi, embassy, insurance…"></div>
        <div class="f"><label>Value</label><input name="value" required value="${esc(existing?.value)}" placeholder="Phone numbers become tap-to-call"></div>
        ${sheetBtns(existing ? '<button type="button" class="pill soft" style="color:var(--danger)" id="infoDel">Delete</button>' : undefined)}
      </form>`, (sh) => {
      $('#infoDel', sh)?.addEventListener('click', () => { t.info = t.info.filter((x) => x.id !== id); save(); closeSheet(); render(); });
      $('#infoForm', sh).addEventListener('submit', (ev) => {
        ev.preventDefault();
        const f = Object.fromEntries(new FormData(ev.target));
        if (existing) Object.assign(existing, f); else t.info.push({ id: uid(), ...f });
        save(); closeSheet(); render();
      });
    });
  }

  function openTripEditor(isNew) {
    const t = isNew ? { id: uid(), name: '', start: todayISO(), end: addDays(todayISO(), 6), items: [], todos: [], info: [], dayNotes: {} } : trip();
    openSheet(`<h2>${isNew ? 'New trip' : 'Edit trip'}</h2>
      <form class="form" id="tripForm">
        <div class="f"><label>Trip name</label><input name="name" required value="${esc(t.name)}" placeholder="Lisbon & Porto"></div>
        <div class="row2"><div class="f"><label>Start</label><input type="date" name="start" required value="${t.start}"></div><div class="f"><label>End</label><input type="date" name="end" required value="${t.end}"></div></div>
        ${sheetBtns()}
      </form>`, (sh) => {
      $('#tripForm', sh).addEventListener('submit', (ev) => {
        ev.preventDefault();
        const f = Object.fromEntries(new FormData(ev.target));
        if (f.end < f.start) return toast('End date is before start');
        Object.assign(t, f);
        if (isNew) { state.trips.push(t); state.activeId = t.id; }
        save(); closeSheet(); location.hash = '#/today'; render();
      });
    });
  }

  function openTripSwitcher() {
    openSheet(`<h2>Switch trip</h2><div class="list">${state.trips.map((t) => `
      <button class="row tap" style="width:100%;text-align:left" data-switch="${t.id}"><div class="body"><div class="t">${esc(t.name)}</div><div class="s"><span>${fmtDay(t.start)} – ${fmtDay(t.end)}</span></div></div>${t.id === state.activeId ? ic('check', 18, 2) : ''}</button>`).join('')}</div>`, (sh) => {
      sh.querySelectorAll('[data-switch]').forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.switch; save(); closeSheet(); location.hash = '#/today'; render(); }));
    });
  }

  // ---------- spreadsheet import ----------
  function parseDelimited(text) {
    const delim = text.includes('\t') ? '\t' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"' && cell === '') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim()));
  }
  const HEADER_MAP = [
    ['date', /^(date|day|when)$/i], ['time', /^(time|start|start time|depart|departure)$/i], ['endTime', /^(end|end time|arrive|arrival|until)$/i],
    ['type', /^(type|category|kind)$/i], ['title', /^(title|activity|what|plan|event|item|description|name|itinerary)$/i],
    ['place', /^(place|location|where|venue|city)$/i], ['address', /^(address|addr)$/i], ['conf', /^(conf|confirmation|confirmation #|booking|booking #|ref|reference|pnr)$/i],
    ['url', /^(link|url|website|booking link)$/i], ['phone', /^(phone|tel|contact)$/i], ['notes', /^(notes?|comments?|details|remarks)$/i],
  ];
  function guessType(s) {
    if (/\b[A-Z0-9]{2}\s?\d{2,4}\b/.test(s) && /→|->|\bto\b/i.test(s)) return 'flight'; // "UA 837 SFO → NRT"
    s = s.toLowerCase();
    if (/flight|\bfly|airline|✈/.test(s)) return 'flight';
    if (/lunch|dinner|breakfast|brunch|restaurant|cafe|coffee|food|bar|market/.test(s)) return 'food';
    if (/hotel|airbnb|hostel|stay|check.?in|ryokan|\binn\b|resort/.test(s)) return 'stay';
    if (/train|shinkansen|rail|jr |metro|subway|eurostar/.test(s)) return 'train';
    if (/taxi|uber|\bcar\b|\bbus\b|transfer|ferry|drive|shuttle/.test(s)) return 'transport';
    return 'activity';
  }
  function parseLooseDate(s, year) {
    s = s.trim(); if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/);
    if (m) { const y = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : year; return `${y}-${pad(m[1])}-${pad(m[2])}`; }
    const d = new Date(/\d{4}/.test(s) ? s : `${s} ${year}`);
    return isNaN(d) ? null : iso(d);
  }
  function parseLooseTime(s) {
    s = (s || '').trim().toLowerCase(); if (!s) return '';
    const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?/); if (!m) return '';
    let h = +m[1]; const mm = m[2] || '00';
    if (m[3]?.startsWith('p') && h < 12) h += 12; if (m[3]?.startsWith('a') && h === 12) h = 0;
    return h < 24 ? `${pad(h)}:${mm}` : '';
  }
  function importRows(text) {
    const t = trip();
    const rows = parseDelimited(text);
    if (rows.length < 2) return { items: [], err: 'Need a header row plus at least one row.' };
    const header = rows[0].map((h) => h.trim());
    const cols = header.map((h) => (HEADER_MAP.find(([, re]) => re.test(h)) || [null])[0]);
    if (!cols.includes('date') || !(cols.includes('title') || cols.includes('place'))) return { items: [], err: `Couldn't find Date and Title/Activity columns. Saw: ${header.join(', ')}` };
    const year = t.start.slice(0, 4);
    let lastDate = null; const items = [];
    for (const r of rows.slice(1)) {
      const rec = {}; cols.forEach((k, i) => { if (k && r[i]?.trim()) rec[k] = r[i].trim(); });
      const date = rec.date ? parseLooseDate(rec.date, year) : lastDate;
      if (!date) continue; lastDate = date;
      if (!rec.title && !rec.place) continue;
      const blob = [rec.type, rec.title, rec.place].join(' ');
      const type = Object.keys(TYPES).find((k) => rec.type && (k === rec.type.toLowerCase() || TYPES[k].label.toLowerCase() === rec.type.toLowerCase())) || guessType(blob);
      items.push({ id: uid(), type, title: rec.title || rec.place, date, time: parseLooseTime(rec.time), endTime: parseLooseTime(rec.endTime),
        place: rec.place, address: rec.address, conf: rec.conf, url: rec.url, phone: rec.phone, notes: rec.notes });
    }
    items.forEach((it) => Object.keys(it).forEach((k) => (it[k] === '' || it[k] === undefined) && delete it[k]));
    return { items };
  }
  function openPasteImport() {
    openSheet(`<h2>Paste from Sheets</h2>
      <p class="lead">Copy your itinerary rows <b>with the header row</b> and paste below. Columns like Date, Time, Activity, Location, Address, Confirmation, Link and Notes are picked up automatically. Rows with no date use the date of the row above.</p>
      <form class="form" id="pasteForm">
        <div class="f"><textarea name="text" class="mono-ta" placeholder="Date&#9;Time&#9;Activity&#9;Location&#10;10/12&#9;10:00&#9;teamLab Planets&#9;Toyosu, Tokyo"></textarea></div>
        <div id="pastePreview" class="preview"></div>
        <div class="btns"><button type="button" class="pill soft" data-act="close">Cancel</button><button class="pill solid">Import</button></div>
      </form>`, (sh) => {
      const form = $('#pasteForm', sh), prev = $('#pastePreview', sh);
      form.text.addEventListener('input', () => {
        const r = importRows(form.text.value);
        prev.innerHTML = r.err ? `<span class="err">${esc(r.err)}</span>` : `Found <b>${r.items.length}</b> items: ${r.items.slice(0, 4).map((i) => `${esc(i.title)} <span style="opacity:.6">(${TYPES[i.type].label})</span>`).join(', ')}${r.items.length > 4 ? '…' : ''}`;
      });
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const r = importRows(form.text.value);
        if (r.err || !r.items.length) return toast(r.err ? 'Check the format' : 'Nothing to import');
        const t = trip();
        t.items.push(...r.items); r.items.forEach((i) => extendTrip(t, i.date));
        save(); closeSheet(); location.hash = '#/days'; render(); toast(`Imported ${r.items.length} items`);
      });
    });
  }

  // ---------- global events ----------
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-edit-city],[data-expand],[data-go],[data-copy],[data-open],[data-toggle],[data-edit-todo],[data-edit-item],[data-del-item],[data-add-item],[data-edit-info],[data-taxi],[data-act],[data-stop]');
    if (!el) return;
    const d = el.dataset;
    if (d.editCity) { ev.preventDefault(); return openCityEditor(d.editCity); }
    if (d.go !== undefined) { if (d.go) location.hash = `#/day/${d.go}`; return; }
    if (d.copy !== undefined) { ev.preventDefault(); ev.stopPropagation(); return copy(d.copy); }
    if (d.stop !== undefined) { ev.stopPropagation(); return; } // links inside tappable rows
    if (d.open) return openItemSheet(d.open);
    if (d.expand !== undefined) {
      const entry = el.closest('.entry'), key = entry.dataset.entry, day = entry.dataset.day;
      const wasOpen = entry.classList.contains('open');
      document.querySelectorAll('.entry.open').forEach((x) => x.classList.remove('open'));
      if (!wasOpen) entry.classList.add('open');
      expanded = { day, key: wasOpen ? null : key };
      return;
    }
    const t = trip();
    if (d.toggle) { const td = t.todos.find((x) => x.id === d.toggle); td.done = !td.done; save(); render(); if (td.done) toast('Done'); return; }
    if (d.editTodo) return openTodoEditor(d.editTodo);
    if (d.editItem) return openItemEditor(d.editItem);
    if (d.addItem) return openItemEditor(null, d.addItem);
    if (d.editInfo) return openInfoEditor(d.editInfo);
    if (d.delItem) { if (confirm('Delete this item?')) { t.items = t.items.filter((x) => x.id !== d.delItem); save(); closeSheet(); render(); toast('Deleted'); } return; }
    if (d.taxi) {
      const it = t.items.find((x) => x.id === d.taxi);
      const ov = document.createElement('div'); ov.className = 'taxi';
      ov.innerHTML = `<button class="x" aria-label="Close">${ic('x', 20, 2)}</button><div class="l">Please take me to</div><div class="n">${esc(it.place || it.title)}</div><div class="a">${esc(it.address)}</div>${it.phone ? `<div class="a" style="margin-top:18px;font-size:20px;color:#666">${esc(it.phone)}</div>` : ''}`;
      ov.addEventListener('click', () => ov.remove()); document.body.appendChild(ov); return;
    }
    switch (d.act) {
      case 'fab': return current?.fab?.();
      case 'close': return closeSheet();
      case 'edit-trip': return openTripEditor(false);
      case 'new-trip': return openTripEditor(true);
      case 'switch-trip': return openTripSwitcher();
      case 'add-info': return openInfoEditor(null);
      case 'paste-import': return openPasteImport();
      case 'export': {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `waypoint-backup-${todayISO()}.json`; a.click();
        return toast('Backup downloaded');
      }
      case 'import-json': return $('#jsonFile').click();
      case 'install': deferredInstall?.prompt(); deferredInstall = null; return;
      case 'delete-trip':
        if (!confirm(`Delete "${t.name}"? This can't be undone.`)) return;
        state.trips = state.trips.filter((x) => x.id !== t.id);
        if (!state.trips.length && window.SEED_TRIP) state.trips.push(clone(window.SEED_TRIP));
        state.activeId = state.trips[0]?.id; save(); location.hash = '#/today'; return render();
      case 'reset': {
        if (!confirm(`Reload "${window.SEED_TRIP.name}" from the built-in data? In-app changes to that trip are lost; other trips are kept.`)) return;
        const s = clone(window.SEED_TRIP);
        state.trips = state.trips.filter((x) => x.id !== s.id); state.trips.push(s); state.activeId = s.id;
        save(); location.hash = '#/today'; return render();
      }
    }
  });
  document.addEventListener('submit', (ev) => {
    const f = ev.target.closest('[data-quick-todo]');
    if (!f) return;
    ev.preventDefault();
    const text = f.text.value.trim(); if (!text) return;
    trip().todos.push({ id: uid(), text, date: f.dataset.quickTodo || null, cat: 'Chores', done: false });
    save(); render(); toast('Added');
    setTimeout(() => document.querySelector(`[data-quick-todo="${f.dataset.quickTodo}"] input`)?.focus(), 0);
  });
  let noteTimer;
  document.addEventListener('input', (ev) => {
    const ta = ev.target.closest('[data-daynote]');
    if (!ta) return;
    const t = trip(); t.dayNotes = t.dayNotes || {};
    t.dayNotes[ta.dataset.daynote] = ta.value;
    clearTimeout(noteTimer); noteTimer = setTimeout(save, 300);
  });
  document.addEventListener('change', (ev) => {
    if (ev.target.id !== 'jsonFile') return;
    const file = ev.target.files[0]; if (!file) return;
    file.text().then((txt) => {
      try {
        const s = JSON.parse(txt);
        if (!Array.isArray(s.trips)) throw new Error('bad');
        if (!confirm(`Restore ${s.trips.length} trip(s)? This replaces what's on this device.`)) return;
        state = s; save(); location.hash = '#/today'; render(); toast('Restored');
      } catch { toast("That file isn't a Waypoint backup"); }
    });
  });

  // ---------- PWA ----------
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (location.hash.startsWith('#/info')) render(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  // keep the "next up" countdown fresh
  setInterval(() => {
    const busy = $('#sheet').classList.contains('on') || ['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName);
    if ((location.hash || '#/today').startsWith('#/today') && !busy) render();
  }, 60000);

  render();
})();
