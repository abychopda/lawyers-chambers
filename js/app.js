/**
 * app.js — rendering and interaction. No framework: state in `S`, render
 * functions rebuild innerHTML from it, one delegated click handler routes
 * every action by its `data-act` / `data-open` / `data-sub` attribute.
 */

import * as store from './store.js';
import * as search from './search.js';
import {
  SUBJECTS, COURTS, TYPES, TYPE_KEYS, COMMON_FIELDS,
  fieldsFor, featureField, typeLabel, blankEntry,
} from './taxonomy.js';
import { APP_NAME, APP_TAGLINE, DEDICATION, DEDICATION_SIGNOFF } from './config.js';
import { SEED_ENTRIES } from './seed.js';

const SEED_FLAG = 'lc.seeded.v1';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

const S = {
  entries: [],
  q: '',
  subject: '',
  typeFilter: '',
  starredOnly: false,
  open: null, // { type: 'new'|'edit'|'read'|'about', entry, draft }
};

/* ===================== util ===================== */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function nl2sp(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function toast(msg) {
  const t = $('#toast');
  t.innerHTML = '<div>' + esc(msg) + '</div>';
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 3600);
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
}
function byId(id) { return S.entries.find((e) => e.id === id) || null; }

/* ===================== header ===================== */
function renderHeader() {
  const user = store.getUser();
  const acct = $('#acct');
  if (!acct) return;
  if (store.getMode() === 'synced' && user) {
    acct.innerHTML = user.photo
      ? '<img src="' + esc(user.photo) + '" alt="">'
      : '<span class="initial">' + esc((user.name || user.email || '?')[0].toUpperCase()) + '</span>';
  } else {
    acct.innerHTML = '<span class="initial">⋯</span>';
  }
  $('#hdrsub').textContent = S.entries.length
    ? S.entries.length + (S.entries.length === 1 ? ' entry' : ' entries')
    : APP_TAGLINE;
}

/* ===================== filtering + ordering ===================== */
function visibleEntries() {
  let rows = S.entries;
  if (S.typeFilter) rows = rows.filter((e) => e.type === S.typeFilter);
  if (S.subject) rows = rows.filter((e) => (e.subjects || []).includes(S.subject));
  if (S.starredOnly) rows = rows.filter((e) => e.starred);

  const q = S.q.trim();
  if (!q) {
    return rows.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }
  const ids = search.search(q) || [];
  const rank = new Map(ids.map((id, i) => [id, i]));
  return rows.filter((e) => rank.has(e.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
}

/* ===================== list view ===================== */
function renderList() {
  const el = $('#list');
  if (!el) return;

  // subject chip row, with live counts over the type/star filtered set (not
  // subject-filtered itself, so counts don't collapse when one is picked)
  const base = S.entries.filter((e) => (!S.typeFilter || e.type === S.typeFilter) && (!S.starredOnly || e.starred));
  const counts = {};
  base.forEach((e) => (e.subjects || []).forEach((s) => { counts[s] = (counts[s] || 0) + 1; }));
  const chipsRow = $('#subjectChips');
  let ch = '<button class="fchip" data-sub="" aria-pressed="' + (S.subject ? 'false' : 'true') + '">All</button>';
  SUBJECTS.filter((s) => counts[s] || s === S.subject).forEach((s) => {
    ch += '<button class="fchip" data-sub="' + esc(s) + '" aria-pressed="' + (S.subject === s ? 'true' : 'false') + '">'
      + esc(s) + (counts[s] ? ' <span class="tnum">' + counts[s] + '</span>' : '') + '</button>';
  });
  chipsRow.innerHTML = ch;

  const rows = visibleEntries();

  if (!S.entries.length) {
    el.innerHTML = emptyState();
    return;
  }
  if (!rows.length) {
    el.innerHTML = '<div class="empty"><h4>Nothing matches</h4><p>Try a different word, or clear a filter.</p></div>';
    return;
  }

  let h = '<div class="band"><h3>' + esc(bandLabel()) + '</h3><span class="rule"></span><span class="n">' + rows.length + '</span></div><div class="stack">';
  rows.forEach((e) => { h += slipHTML(e); });
  h += '</div>';
  el.innerHTML = h;
}

function bandLabel() {
  if (S.q.trim()) return 'Results';
  if (S.subject) return S.subject;
  if (S.typeFilter) return typeLabel(S.typeFilter) + 's';
  if (S.starredOnly) return 'Starred';
  return 'All entries';
}

function emptyState() {
  return '<div class="empty"><h4>The library is empty</h4>'
    + '<p>Add the last case, paper, provision or article you read. Citation, what it says, and the point in your own words — about a minute, and you will have it for good.</p></div>';
}

function slipHTML(e) {
  const feat = featureField(e.type);
  const featVal = feat ? e[feat.key] : '';
  const citeBits = [e.citation, e.court, e.year].filter(Boolean).join(' · ')
    || [e.act, e.section].filter(Boolean).join(' · ')
    || [e.authors, e.year].filter(Boolean).join(' · ')
    || [e.publication, e.date].filter(Boolean).join(' · ');
  let h = '<button class="slip' + (e.starred ? ' starred' : '') + '" data-open="' + esc(e.id) + '">';
  h += '<h4>' + esc(e.title || 'Untitled') + '</h4>';
  if (citeBits) h += '<div class="cite">' + esc(citeBits) + '</div>';
  if (featVal) h += '<p class="feature">' + esc(nl2sp(featVal)) + '</p>';
  else if (e.note) h += '<p class="feature">' + esc(nl2sp(e.note)) + '</p>';
  h += '<span class="foot"><span class="chip">' + esc(typeLabel(e.type)) + '</span>';
  (e.subjects || []).slice(0, 2).forEach((s) => { h += '<span class="chip sub">' + esc(s) + '</span>'; });
  (e.tags || []).slice(0, 2).forEach((t) => { h += '<span class="chip">#' + esc(t) + '</span>'; });
  if (e.starred) h += '<span class="chip star">★ starred</span>';
  if (e.example) h += '<span class="chip brass">example — verify</span>';
  h += '</span></button>';
  return h;
}

/* ===================== reader ===================== */
function openReader(e) {
  S.open = { type: 'read', id: e.id };
  const defs = fieldsFor(e.type);
  const citeBits = [e.citation, e.court, e.year].filter(Boolean).join(' · ')
    || [e.act, e.year].filter(Boolean).join(' · ')
    || [e.authors, e.journal, e.year].filter(Boolean).join(' · ')
    || [e.publication, e.date].filter(Boolean).join(' · ');

  let h = '<div class="rd"><h3>' + esc(e.title || 'Untitled') + '</h3>';
  if (citeBits) h += '<div class="cite">' + esc(citeBits) + '</div>';
  h += '<div class="chips" style="margin-top:11px"><span class="chip">' + esc(typeLabel(e.type)) + '</span>';
  (e.subjects || []).forEach((s) => { h += '<span class="chip sub">' + esc(s) + '</span>'; });
  (e.tags || []).forEach((t) => { h += '<span class="chip">#' + esc(t) + '</span>'; });
  if (e.starred) h += '<span class="chip star">★ starred</span>';
  if (e.example) h += '<span class="chip brass">example — verify the citation</span>';
  h += '</div>';

  defs.forEach((f) => {
    if (f.kind === 'extracts') {
      const rows = Array.isArray(e.extracts) ? e.extracts.filter((x) => x && (x.quote || x.page)) : [];
      if (!rows.length) return;
      h += '<div class="part"><span class="lbl">' + esc(f.label) + '</span>';
      rows.forEach((x) => {
        h += '<div class="extract"><p>“' + esc(x.quote || '') + '”</p>'
          + (x.page ? '<div class="pg">p. ' + esc(x.page) + '</div>' : '') + '</div>';
      });
      h += '</div>';
      return;
    }
    const v = e[f.key];
    if (!v || f.key === 'citation' || f.key === 'court' || f.key === 'year' || f.key === 'authors'
      || f.key === 'journal' || f.key === 'volume' || f.key === 'pages' || f.key === 'act'
      || f.key === 'section' || f.key === 'publication' || f.key === 'date' || f.key === 'doi') return;
    const cls = 'part' + (f.feature ? ' feature' : (f.key === 'note' ? ' note' : ''));
    h += '<div class="' + cls + '"><span class="lbl">' + esc(f.label) + '</span><p>' + esc(v) + '</p></div>';
  });

  if (e.source) {
    h += '<div class="part"><span class="lbl">Source</span><p style="font-family:var(--font-mono);font-size:12px;word-break:break-all"><a href="' + esc(e.source) + '" target="_blank" rel="noopener">' + esc(e.source) + '</a></p></div>';
  }
  h += '<p class="muted" style="font-size:12px;margin-top:24px">Added ' + esc(fmtDate(e.createdAt) || '—') + '</p></div>';

  const foot = '<button class="btn" data-act="star" data-id="' + esc(e.id) + '">' + (e.starred ? '★ Starred' : '☆ Star') + '</button>'
    + '<span class="sp"></span>'
    + '<button class="btn" data-act="edit" data-id="' + esc(e.id) + '">Edit</button>';
  openSheet('Entry', h, foot);
}

/* ===================== capture / edit form ===================== */
function openForm(entry) {
  const isNew = !entry;
  const draft = entry ? deepClone(entry) : blankEntry('case');
  S.open = { type: isNew ? 'new' : 'edit', id: entry ? entry.id : null, draft };
  renderForm();
}

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function renderForm() {
  const d = S.open.draft;
  const defs = fieldsFor(d.type).filter((f) => f.key !== 'note' && f.key !== 'source');

  let body = '<div class="field"><span class="lbl">Type</span><div class="seg" id="typeseg">';
  TYPE_KEYS.forEach((k) => {
    body += '<button type="button" data-type="' + k + '" aria-pressed="' + (d.type === k ? 'true' : 'false') + '">' + esc(typeLabel(k)) + '</button>';
  });
  body += '</div></div>';

  const t = TYPES[d.type];
  body += fieldHTML('title', { label: t.titleLabel, kind: 'text', hint: t.titleHint }, d.title);

  defs.forEach((f) => { body += fieldHTML(f.key, f, d[f.key]); });

  body += '<div class="field"><span class="lbl">Subjects</span><div class="subgrid" id="subgrid">';
  SUBJECTS.forEach((s) => {
    body += '<button type="button" data-s="' + esc(s) + '" aria-pressed="' + ((d.subjects || []).includes(s) ? 'true' : 'false') + '">' + esc(s) + '</button>';
  });
  body += '</div></div>';

  body += '<div class="field"><label class="lbl" for="tagin">Your own tags</label>'
    + '<input class="in" id="tagin" placeholder="Type a tag and press Enter" autocomplete="off">'
    + '<div class="tagrow" id="tagrow">' + tagsHTML(d.tags || []) + '</div></div>';

  body += fieldHTML('note', { label: 'Your note', kind: 'textarea', hint: 'Why it matters, where it fits, what you disagree with.' }, d.note);
  body += fieldHTML('source', { label: 'Source link', kind: 'url', hint: 'https://', mono: true }, d.source);

  const foot = '<button class="btn primary" data-act="save">Save</button><span class="sp"></span>'
    + (S.open.id ? '<button class="btn danger sm" data-act="delete" data-id="' + esc(S.open.id) + '">Delete</button>' : '');

  openSheet(S.open.id ? 'Edit entry' : 'New entry', body, foot);
}

function fieldHTML(key, f, val) {
  const id = 'f_' + key;
  if (f.kind === 'select') {
    let h = '<div class="field"><label class="lbl" for="' + id + '">' + esc(f.label) + '</label><select class="in" id="' + id + '"><option value="">—</option>';
    (f.options || []).forEach((o) => { h += '<option value="' + esc(o) + '"' + (String(val) === String(o) ? ' selected' : '') + '>' + esc(o) + '</option>'; });
    return h + '</select></div>';
  }
  if (f.kind === 'extracts') {
    return '<div class="field"><span class="lbl">' + esc(f.label) + '</span><p class="muted" style="font-size:12px;margin:0 0 9px">' + esc(f.hint || '') + '</p>'
      + '<div id="extracts">' + extractsHTML(val || []) + '</div>'
      + '<button type="button" class="btn sm" data-act="add-extract">Add a passage</button></div>';
  }
  const cls = 'in' + (f.mono ? ' mono' : '');
  const input = f.kind === 'textarea'
    ? '<textarea class="' + cls + '" id="' + id + '" placeholder="' + esc(f.hint || '') + '">' + esc(val || '') + '</textarea>'
    : '<input class="' + cls + '" id="' + id + '" type="' + (f.kind === 'url' ? 'url' : 'text') + '" value="' + esc(val || '') + '" placeholder="' + esc(f.hint || '') + '" autocomplete="off">';
  return '<div class="field"><label class="lbl" for="' + id + '">' + esc(f.label) + '</label>' + input + '</div>';
}

function extractsHTML(rows) {
  if (!rows.length) rows = [{ quote: '', page: '' }];
  return rows.map((r, i) => (
    '<div class="extract-row" data-i="' + i + '"><div class="exrow-top">'
    + '<input class="in" data-ex="quote" placeholder="The passage" value="' + esc(r.quote || '') + '">'
    + '<input class="in pgin" data-ex="page" placeholder="p. 42" value="' + esc(r.page || '') + '">'
    + '</div><button type="button" class="btn ghost sm" data-act="rm-extract" data-i="' + i + '">Remove</button></div>'
  )).join('');
}

function tagsHTML(tags) {
  return tags.map((t) => '<span class="tagchip">#' + esc(t) + '<button type="button" data-act="rm-tag" data-tag="' + esc(t) + '" aria-label="Remove tag">×</button></span>').join('');
}

function readExtractsFromDOM() {
  const rows = $$('.extract-row');
  return rows.map((r) => ({
    quote: ($('[data-ex="quote"]', r) || {}).value || '',
    page: ($('[data-ex="page"]', r) || {}).value || '',
  })).filter((r) => r.quote.trim() || r.page.trim());
}

/* ===================== about ===================== */
function openAbout() {
  S.open = { type: 'about' };
  let h = '<div class="ded">';
  DEDICATION.forEach((p) => { h += '<p>' + esc(p) + '</p>'; });
  h += '<p class="sig">' + esc(DEDICATION_SIGNOFF) + '</p></div>';

  const examples = S.entries.filter((e) => e.example);
  if (examples.length) {
    h += '<div class="band"><h3>Housekeeping</h3><span class="rule"></span></div>'
      + '<div class="card"><p style="margin:0 0 10px;font-size:14px">There ' + (examples.length === 1 ? 'is 1 example entry' : 'are ' + examples.length + ' example entries') + ' in here to show the shape of things. Verify the citations before relying on them, or clear them out.</p>'
      + '<button class="btn danger sm" data-act="clear-examples">Clear example entries</button></div>';
  }

  h += '<div class="band"><h3>About</h3><span class="rule"></span></div>'
    + '<div class="card"><p style="margin:0;font-size:13px;line-height:1.6" class="muted">'
    + esc(APP_NAME) + ' · a private research library. '
    + (store.getMode() === 'synced' ? 'Signed in and synced.' : 'Saved only in this browser.')
    + '</p></div>';

  openSheet('About', h, store.getMode() === 'synced' ? '<button class="btn ghost sm" data-act="signout">Sign out</button>' : '');
}

/* ===================== sheet plumbing ===================== */
function openSheet(title, bodyHTML, footHTML) {
  const s = $('#sheet');
  s.innerHTML = '<div class="sheet-hdr"><button class="btn ghost sm" data-act="close-sheet">Close</button><span class="t">' + esc(title) + '</span></div>'
    + '<div class="sheet-body"><div class="sheet-inner">' + bodyHTML + '</div></div>'
    + (footHTML ? '<div class="sheet-foot">' + footHTML + '</div>' : '');
  s.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  const s = $('#sheet');
  s.hidden = true;
  s.innerHTML = '';
  document.body.style.overflow = '';
  S.open = null;
}

/* ===================== writes ===================== */
function val(id) { const e = $('#' + id); return e ? String(e.value || '').trim() : ''; }

async function saveEntry() {
  const d = S.open.draft;
  const title = val('f_title');
  if (!title) { toast('Give it a title at least.'); return; }

  const entry = Object.assign({}, d, { title });
  if (S.open.id) entry.id = S.open.id;

  fieldsFor(d.type).forEach((f) => {
    if (f.key === 'title' || f.kind === 'extracts') return;
    entry[f.key] = val('f_' + f.key);
  });
  entry.extracts = readExtractsFromDOM();
  entry.note = val('f_note');
  entry.source = val('f_source');

  // Strip fields that belong to other types, so switching type in an edit
  // does not leave stale data behind.
  const keep = new Set(['id','type','title','subjects','tags','note','source','starred','createdAt','updatedAt','addedBy','example']);
  fieldsFor(d.type).forEach((f) => keep.add(f.key));
  Object.keys(entry).forEach((k) => { if (!keep.has(k)) delete entry[k]; });

  try {
    await store.save(entry);
    closeSheet();
    toast(S.open && S.open.id ? 'Saved.' : 'In the library.');
  } catch (e) {
    handleWriteError(e);
  }
}

function handleWriteError(e) {
  const c = e && e.code;
  if (c === 'permission-denied') toast('You do not have write access here.');
  else if (c === 'resource-exhausted') toast('Too many changes at once — try again shortly.');
  else toast('Could not save. Try again.');
  console.error(e);
}

function deleteEntry(id) {
  const foot = $('.sheet-foot');
  if (!foot) return;
  foot.innerHTML = '<span style="font-size:13px;color:var(--crit);flex:1">Delete this entry?</span>'
    + '<button class="btn ghost sm" data-act="cancel-del" data-id="' + esc(id) + '">Keep</button>'
    + '<button class="btn danger sm" data-act="do-del" data-id="' + esc(id) + '">Delete</button>';
}
async function doDelete(id) {
  try { await store.remove(id); closeSheet(); toast('Deleted.'); }
  catch (e) { handleWriteError(e); }
}
async function toggleStar(id) {
  const e = byId(id);
  if (!e) return;
  try { await store.save(Object.assign({}, e, { starred: !e.starred })); openReader(byId(id) || e); }
  catch (err) { handleWriteError(err); }
}
async function clearExamples() {
  const examples = S.entries.filter((e) => e.example);
  try {
    for (const e of examples) await store.remove(e.id);
    toast('Examples cleared.');
  } catch (e) { handleWriteError(e); }
}

/* ===================== render ===================== */
function render() {
  renderHeader();
  renderList();
}

/* ===================== events ===================== */
document.addEventListener('click', (ev) => {
  const t = ev.target.closest && ev.target.closest('[data-act],[data-open],[data-sub],[data-type],[data-s],[data-filter-type]');
  if (!t) return;

  const sub = t.getAttribute('data-sub');
  if (sub !== null) { S.subject = (S.subject === sub ? '' : sub); renderList(); return; }

  const ftype = t.getAttribute('data-filter-type');
  if (ftype !== null) {
    S.typeFilter = (S.typeFilter === ftype ? '' : ftype);
    $$('#typeFilterRow [data-filter-type]').forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-filter-type') === S.typeFilter ? 'true' : 'false'));
    renderList();
    return;
  }

  const dtype = t.getAttribute('data-type');
  if (dtype && S.open) {
    S.open.draft.type = dtype;
    renderForm();
    return;
  }

  const s = t.getAttribute('data-s');
  if (s && S.open && S.open.draft) {
    const arr = S.open.draft.subjects || (S.open.draft.subjects = []);
    const i = arr.indexOf(s);
    if (i >= 0) arr.splice(i, 1); else arr.push(s);
    t.setAttribute('aria-pressed', arr.includes(s) ? 'true' : 'false');
    return;
  }

  const open = t.getAttribute('data-open');
  if (open) { const e = byId(open); if (e) openReader(e); return; }

  const a = t.getAttribute('data-act');
  if (!a) return;

  if (a === 'close-sheet') { closeSheet(); return; }
  if (a === 'new') { openForm(null); return; }
  if (a === 'edit') { const e = byId(t.getAttribute('data-id')); if (e) openForm(e); return; }
  if (a === 'save') { saveEntry(); return; }
  if (a === 'delete') { deleteEntry(t.getAttribute('data-id')); return; }
  if (a === 'cancel-del') {
    const e = byId(t.getAttribute('data-id'));
    if (e) openForm(e); else closeSheet();
    return;
  }
  if (a === 'do-del') { doDelete(t.getAttribute('data-id')); return; }
  if (a === 'star') { toggleStar(t.getAttribute('data-id')); return; }
  if (a === 'about') { openAbout(); return; }
  if (a === 'clear-examples') { clearExamples(); return; }
  if (a === 'signin') { store.signIn().catch((e) => toast('Could not sign in: ' + (e && e.message ? e.message : 'try again'))); return; }
  if (a === 'signout') { store.signOutNow(); closeSheet(); return; }
  if (a === 'star-filter') {
    S.starredOnly = !S.starredOnly;
    t.setAttribute('aria-pressed', S.starredOnly ? 'true' : 'false');
    renderList();
    return;
  }
  if (a === 'add-extract') {
    const wrap = $('#extracts');
    wrap.insertAdjacentHTML('beforeend', extractsHTML([{ quote: '', page: '' }]).trim());
    return;
  }
  if (a === 'rm-extract') {
    const row = t.closest('.extract-row');
    if (row) row.remove();
    return;
  }
  if (a === 'rm-tag') {
    const tag = t.getAttribute('data-tag');
    const arr = S.open.draft.tags || [];
    const i = arr.indexOf(tag);
    if (i >= 0) arr.splice(i, 1);
    $('#tagrow').innerHTML = tagsHTML(arr);
    return;
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && !$('#sheet').hidden) closeSheet();
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'tagin') {
    ev.preventDefault();
    const v = ev.target.value.trim().toLowerCase().replace(/\s+/g, '-');
    if (v) {
      const arr = S.open.draft.tags || (S.open.draft.tags = []);
      if (!arr.includes(v)) arr.push(v);
      $('#tagrow').innerHTML = tagsHTML(arr);
    }
    ev.target.value = '';
  }
});

document.addEventListener('input', (ev) => {
  if (ev.target && ev.target.id === 'searchInput') {
    S.q = ev.target.value;
    const pos = ev.target.selectionStart;
    renderList();
    const el = $('#searchInput');
    if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} }
  }
});

/* ===================== boot ===================== */
function setupHeader() {
  $('#appname').textContent = APP_NAME;
}

// TEMPORARY — remove once the sign-in refusal issue is confirmed fixed.
// Visit the site with #debug on the end of the URL (e.g. .../index.html#debug)
// to see a running, on-screen log of auth events and any load errors —
// exactly what's happening, in plain text, instead of a guess from a
// one-line description. Invisible and inert with no #debug in the URL.
const DEBUG = location.hash.indexOf('debug') >= 0;
function debugLog(line) {
  if (!DEBUG) return;
  let panel = document.getElementById('debugPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'debugPanel';
    panel.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:999;max-height:40vh;overflow:auto;'
      + 'background:#000;color:#0f0;font:11px/1.5 monospace;padding:8px;white-space:pre-wrap;';
    document.body.appendChild(panel);
  }
  const t = new Date().toISOString().slice(11, 19);
  panel.textContent += '[' + t + '] ' + line + '\n';
  panel.scrollTop = panel.scrollHeight;
}

async function boot() {
  setupHeader();
  render();

  const info = await store.init();
  debugLog('store.init -> ' + JSON.stringify(info));

  if (info.mode === 'local') {
    showGate(false);
  } else {
    store.onAuth((evt) => {
      debugLog('auth event -> ' + JSON.stringify(evt));
      if (evt.state === 'in') { hideGate(); mountEntries(); }
      else if (evt.state === 'out') { showGate(true); S.entries = []; render(); }
      else if (evt.state === 'refused') {
        showGate(true, 'This account doesn’t have access to this library.', true);
      }
    });
  }

  if (info.mode === 'local') mountEntries();
}

let seedAttempted = false;
function mountEntries() {
  store.subscribe((rows, err) => {
    if (err) {
      debugLog('subscribe error -> code=' + (err && err.code) + ' message=' + (err && err.message));
      toast('Could not load entries. Check your connection.');
      return;
    }
    debugLog('subscribe ok -> ' + rows.length + ' row(s)');
    S.entries = rows;
    search.reindex(rows);
    render();
    maybeSeed(rows);
  });
}

function maybeSeed(rows) {
  if (seedAttempted) return;
  seedAttempted = true;
  let already = false;
  try { already = localStorage.getItem(SEED_FLAG) === '1'; } catch (e) {}
  if (already || rows.length) return;
  try { localStorage.setItem(SEED_FLAG, '1'); } catch (e) {}
  Promise.all(SEED_ENTRIES.map((e) => store.save(Object.assign({}, e)))).catch((e) => {
    console.warn('Seeding examples failed:', e);
  });
}

function showGate(needsSignIn, message, denied) {
  const gate = $('#gate');
  const shell = $('#shell');
  if (!needsSignIn) { gate.hidden = true; shell.hidden = false; return; }
  shell.hidden = true;
  gate.hidden = false;
  const banner = denied
    ? '<div class="gate-denied"><span class="gate-denied-icon" aria-hidden="true">!</span>'
      + esc(message || 'This account doesn’t have access to this library.') + '</div>'
      + '<p>Sign in with the account this was set up for.</p>'
    : '<p>' + esc(message || 'Sign in once to open your library. You will not be asked again on this device.') + '</p>';
  gate.innerHTML = '<div class="gate">'
    + '<p class="wordmark-lg">' + esc(APP_NAME) + '</p>'
    + banner
    + '<button class="btn primary" data-act="signin">Sign in with Google</button>'
    + '</div>';
}
function hideGate() {
  $('#gate').hidden = true;
  $('#shell').hidden = false;
}

boot();
