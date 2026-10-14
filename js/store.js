/**
 * store.js — where entries live, and who is allowed to see them.
 *
 * Two modes, same interface:
 *
 *   synced  Firebase is configured. Google sign-in, Firestore, offline cache.
 *           Entries sync between her phone and her laptop.
 *   local   Firebase is not configured yet. Entries are kept in this browser
 *           only, with no sign-in. Everything else behaves identically, so the
 *           app is fully usable before anything is provisioned.
 *
 * Timestamps are stored as plain ISO strings rather than Firestore Timestamps.
 * That costs nothing and means an exported backup is still readable, by a
 * person or any other program, long after this app is forgotten.
 */

import { FIREBASE, ALLOWED_EMAILS, isConfigured } from './config.js';

const LOCAL_KEY = 'lc.entries.v1';

let mode = 'local';
let fb = null; // { app, auth, dbRef, api }
let authCb = null;
let lastAuthEvent = null; // replayed to a late subscriber — see onAuth()
let entriesCb = null;
let unsubscribeEntries = null;
let currentUser = null;

export function getMode() {
  return mode;
}
export function getUser() {
  return currentUser;
}

/* ------------------------------------------------------------------ *
 * init
 * ------------------------------------------------------------------ */

export async function init() {
  if (!isConfigured()) {
    mode = 'local';
    return { mode };
  }
  try {
    const [appMod, authMod, fsMod] = await Promise.all([
      import('../vendor/firebase-app.js'),
      import('../vendor/firebase-auth.js'),
      import('../vendor/firebase-firestore.js'),
    ]);

    const app = appMod.initializeApp(FIREBASE);

    // Offline cache, multi-tab safe. If it fails (private window, storage
    // blocked) fall back to the default in-memory cache rather than dying.
    let dbRef;
    try {
      dbRef = fsMod.initializeFirestore(app, {
        localCache: fsMod.persistentLocalCache({
          tabManager: fsMod.persistentMultipleTabManager(),
        }),
      });
    } catch (e) {
      console.warn('Offline cache unavailable; continuing without it.', e);
      dbRef = fsMod.getFirestore(app);
    }

    const auth = authMod.getAuth(app);
    fb = { app, auth, dbRef, authMod, fsMod };
    mode = 'synced';

    // Complete a redirect sign-in, if that is how we got here.
    try {
      await authMod.getRedirectResult(auth);
    } catch (e) {
      if (e && e.code !== 'auth/no-auth-event') console.warn('Redirect sign-in:', e);
    }

    authMod.onAuthStateChanged(auth, (user) => {
      if (user && !isAllowed(user.email)) {
        // Signed in with an account that is not on the list. Refuse and
        // sign out, so we never render someone else's view of the data.
        currentUser = null;
        authMod.signOut(auth);
        emitAuth({ state: 'refused', email: user.email || '' });
        return;
      }
      currentUser = user
        ? { email: (user.email || '').toLowerCase(), name: user.displayName || '', photo: user.photoURL || '' }
        : null;
      emitAuth({ state: user ? 'in' : 'out', user: currentUser });
    });

    return { mode };
  } catch (e) {
    console.error('Firebase failed to start; falling back to local mode.', e);
    mode = 'local';
    fb = null;
    return { mode, error: e };
  }
}

function isAllowed(email) {
  if (!ALLOWED_EMAILS.length) return true; // not locked down yet
  return ALLOWED_EMAILS.map((s) => s.toLowerCase()).includes((email || '').toLowerCase());
}

/* ------------------------------------------------------------------ *
 * auth
 * ------------------------------------------------------------------ */

// Firebase's own auth listener is registered inside init(), which can fire
// its first event (even a plain "signed out") before a caller has gotten
// around to subscribing with onAuth() below — the two happen on different
// ticks, and there is no guaranteed order between them. Without this, that
// first event is silently lost and the UI never leaves its initial state.
// So every event is remembered here and replayed immediately to a late
// subscriber, not just delivered to whoever happens to be listening live.
function emitAuth(evt) {
  lastAuthEvent = evt;
  if (authCb) authCb(evt);
}

export function onAuth(cb) {
  authCb = cb;
  if (mode === 'local') { cb({ state: 'local' }); return; }
  if (lastAuthEvent) cb(lastAuthEvent);
}

export async function signIn() {
  if (mode !== 'synced') return;
  const { authMod, auth } = fb;
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await authMod.signInWithPopup(auth, provider);
  } catch (e) {
    const code = e && e.code;
    // Installed PWAs and some mobile browsers refuse popups. Redirect works
    // there, so try it rather than leaving her staring at a dead button.
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      if (code === 'auth/popup-closed-by-user') return; // she changed her mind
      await authMod.signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export async function signOutNow() {
  if (mode === 'synced' && fb) await fb.authMod.signOut(fb.auth);
}

/* ------------------------------------------------------------------ *
 * entries
 * ------------------------------------------------------------------ */

export function subscribe(cb) {
  entriesCb = cb;
  if (mode === 'local') {
    cb(readLocal());
    return () => {};
  }
  if (!currentUser) {
    cb([]);
    return () => {};
  }
  const { fsMod, dbRef } = fb;
  if (unsubscribeEntries) unsubscribeEntries();
  unsubscribeEntries = fsMod.onSnapshot(
    fsMod.collection(dbRef, 'entries'),
    (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push(Object.assign({ id: d.id }, d.data())));
      cb(rows);
    },
    (err) => {
      console.error('Entry subscription failed:', err);
      // A signed-in account that Firestore's own rules don't allow shows up
      // HERE, as 'permission-denied' — there is no client-side copy of the
      // allowlist to check against (see config.js). Treat this exactly like
      // a refused sign-in: sign them out and send them back to the gate
      // with a plain explanation, rather than leaving them staring at a
      // library that silently never loads.
      if (err && err.code === 'permission-denied' && fb) {
        const email = (currentUser && currentUser.email) || '';
        fb.authMod.signOut(fb.auth);
        emitAuth({ state: 'refused', email });
        return;
      }
      cb([], err);
    }
  );
  return unsubscribeEntries;
}

export function stopSubscription() {
  if (unsubscribeEntries) {
    unsubscribeEntries();
    unsubscribeEntries = null;
  }
}

export async function save(entry) {
  const now = new Date().toISOString();
  const row = Object.assign({}, entry, {
    updatedAt: now,
    createdAt: entry.createdAt || now,
    addedBy: entry.addedBy || (currentUser ? currentUser.email : 'local'),
  });

  if (mode === 'local') {
    const rows = readLocal();
    if (!row.id) row.id = newId();
    const i = rows.findIndex((r) => r.id === row.id);
    if (i >= 0) rows[i] = row;
    else rows.unshift(row);
    writeLocal(rows);
    if (entriesCb) entriesCb(rows);
    return row.id;
  }

  const { fsMod, dbRef } = fb;
  const id = row.id || newId();
  const body = Object.assign({}, row);
  delete body.id;
  await fsMod.setDoc(fsMod.doc(dbRef, 'entries', id), body);
  return id;
}

export async function remove(id) {
  if (mode === 'local') {
    const rows = readLocal().filter((r) => r.id !== id);
    writeLocal(rows);
    if (entriesCb) entriesCb(rows);
    return;
  }
  const { fsMod, dbRef } = fb;
  await fsMod.deleteDoc(fsMod.doc(dbRef, 'entries', id));
}

/* ------------------------------------------------------------------ *
 * local-mode storage
 * ------------------------------------------------------------------ */

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    return [];
  }
}

function writeLocal(rows) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  } catch (e) {
    console.warn('Could not save locally:', e);
  }
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
