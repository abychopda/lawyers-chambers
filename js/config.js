/**
 * config.js — the only file you need to edit to set this up.
 *
 * Until FIREBASE.apiKey is filled in, the app runs in LOCAL MODE: everything
 * works, but entries are saved only in this browser. That is deliberate, so you
 * can try the whole thing before provisioning anything. Fill in the Firebase
 * block and it switches to synced mode on the next reload.
 *
 * See README.md for the walkthrough.
 */

/* ------------------------------------------------------------------ *
 * 1. Firebase — from the Firebase console:
 *    Project settings → General → Your apps → Web app → SDK setup.
 *    These values are PUBLIC by design; they are safe in a public repo.
 *    Access is controlled by the security rules, not by hiding these.
 * ------------------------------------------------------------------ */
export const FIREBASE = {
  apiKey: 'AIzaSyBtSPg9vTpeV1KtYZFpf2gMjVeuzgqluSo',
  authDomain: 'lawyers-chambers.firebaseapp.com',
  projectId: 'lawyers-chambers',
  storageBucket: 'lawyers-chambers.firebasestorage.app',
  messagingSenderId: '855254375425',
  appId: '1:855254375425:web:bcd08b00488d02dadcf400',
};

/* ------------------------------------------------------------------ *
 * 2. Who may sign in.
 *
 *    Left empty on purpose — the real allowlist lives ONLY in the
 *    Firestore security rules, set directly in the Firebase console
 *    (see README.md), never in this file or in this repo. That keeps
 *    real email addresses out of git entirely, including its history.
 *
 *    store.js asks Firestore itself whether a signed-in account was
 *    refused, rather than keeping a second copy of the allowlist here
 *    that could drift out of sync with the real rules. Filling this in
 *    is optional: it only buys a slightly faster refusal message for
 *    someone signed in with the wrong account, at the cost of putting
 *    real emails back in the repo — not recommended.
 * ------------------------------------------------------------------ */
export const ALLOWED_EMAILS = [];

/* ------------------------------------------------------------------ *
 * 3. What she sees. The repo stays impersonal; this is the one place
 *    her name appears, alongside manifest.webmanifest and index.html.
 * ------------------------------------------------------------------ */
export const APP_NAME = "Radhika's Chambers";
export const APP_TAGLINE = 'corporate law';

/** Shown once under "About", not on the front page. */
export const DEDICATION = [
  "You read more than anyone I know, and you're going to be excellent at this. This is a place to keep it all: the cases, the arguments, the reading that's quietly building the lawyer you're going to be.",
  "It's not a card. I built it because I believe in where you're headed, and I wanted something that's still useful to you in ten years, not just today.",
  'I see how hard you work, and I’m proud of you. Happy birthday, Radhika. I love you.',
];
export const DEDICATION_SIGNOFF = 'A';

/** True once Firebase has been filled in. */
export function isConfigured() {
  return Boolean(FIREBASE.apiKey && FIREBASE.projectId);
}
