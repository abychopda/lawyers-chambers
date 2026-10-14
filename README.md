# Lawyer's Chambers

A private, searchable research library for case briefs, academic papers,
statutory notes and news clippings. No build step, no server, no bill.

Runs standalone in local mode out of the box (entries saved only in the
browser that opens it) and upgrades to a synced, signed-in mode once you
provision Firebase — see **Setup** below. Either way it's a plain static
site: open `index.html` in a browser, or serve the folder from anywhere.

## Why it's built this way

- **No build step.** Every file here is the file the browser runs — no
  bundler, no `npm install`, no framework version to go stale. Open
  `index.html` in any browser, today or in ten years, and it works. The one
  dependency this trades away is a component library; for an app this size
  that's a good trade.
- **Dependencies are vendored, not fetched.** `vendor/` holds pinned copies
  of Firebase and MiniSearch. They were patched on download (see
  `vendor/minisearch.js`'s trailing comment and the Firebase files' internal
  imports) so the whole set works with no network calls to a CDN. Upgrading
  a vendored file means re-downloading and re-applying that same patch —
  each file says so at the point that needs it.
- **Search runs on the device**, over her own words, not a server query.
  See `js/search.js`.

## Repository layout

```
index.html              page shell
css/app.css              all styling — design tokens at the top
js/
  app.js                 rendering + all interaction
  store.js               Firestore (or local-storage fallback) + auth
  search.js               MiniSearch indexing and querying
  taxonomy.js             subjects, courts, entry-type field definitions
  config.js                ← the one file you edit to set this up
vendor/                  pinned, patched copies of Firebase + MiniSearch
icons/                   PWA icons (icon.svg is the source; PNGs are derived)
manifest.webmanifest     PWA metadata — the install name lives here too
sw.js                    offline shell caching (does NOT cache her data)
firestore.rules          paste into the Firebase console — this is what
                          actually enforces who can read/write, not config.js
```

## Setup (15–20 minutes, no command line)

### 1. Try it first, locally
Open `index.html` directly in a browser (or run any static file server — even
`python3 -m http.server` from this folder). It works immediately in **local
mode**: no sign-in, entries saved in that browser only. Good for checking the
whole thing before provisioning anything.

### 2. Create the Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com) →
   **Add project**. Name it anything (`lawyers-chambers` keeps it tidy). No
   credit card needed — the Spark (free) plan is enough forever at this scale.
2. **Build → Firestore Database → Create database.** Start in production
   mode (we supply our own rules in step 4). Pick any region.
3. **Build → Authentication → Get started → Sign-in method → Google →
   Enable.**
4. **Project settings (gear icon) → General → Your apps → Web app (`</>`
   icon).** Register an app (any nickname). Copy the `firebaseConfig` object
   it shows you.

### 3. Wire it into the app
Open `js/config.js` and paste the config values into the `FIREBASE` object.
Then fill in `ALLOWED_EMAILS` with the two Gmail addresses that should be
able to sign in (this list only drives a friendlier error message — the real
gate is step 4).

### 4. Lock it down
In the Firebase console: **Firestore Database → Rules**. Replace the
contents with everything in `firestore.rules` from this repo, substituting
the two placeholder emails for the real ones. Click **Publish**.

This is the step that actually matters for privacy: a static site's config
values are necessarily visible to anyone who loads the page, so the rules —
not the config — are what stops a stranger with the link from reading or
writing anything. Until you publish real rules here, don't rely on `config.js`
alone.

### 5. Put the site somewhere
**GitHub Pages** (what this repo is set up for):
1. Push this repo to GitHub (keep it public — there are no secrets in it;
   Firebase web config is meant to be public, and Firestore rules are what
   actually protects the data).
2. Repo → **Settings → Pages → Source: Deploy from a branch → main → / (root)**.
3. The site appears at `https://<you>.github.io/lawyers-chambers/` within a
   few minutes.

Any other static host (Cloudflare Pages, Netlify, a plain web server) works
identically — there's nothing GitHub-specific in the code.

### 6. Hand it over
Open the live URL on her phone. She signs in with Google **once** — after
that the session persists and she's never asked again on that device. Then:

- **iPhone (Safari):** Share icon → **Add to Home Screen.**
- **Android (Chrome):** menu (⋮) → **Add to Home Screen** (or Chrome may
  prompt automatically).

It opens full-screen from the home screen icon, like any other app.

## Maintenance notes (for future you)

- **Changing what an entry type captures:** edit `js/taxonomy.js`. The
  capture form, the reader, and search indexing are all generated from those
  definitions — nothing else needs to change.
- **Adding a subject to the curated list:** same file, the `SUBJECTS` array.
- **Rotating or upgrading a vendored library:** re-download it, then re-apply
  the patch described in the comment at the point that needed it (Firebase's
  internal import URLs, MiniSearch's missing ESM export).
- **Bumping the PWA cache:** change `CACHE_VERSION` in `sw.js` whenever you
  change a cached file, or returning visitors may see a stale copy until it
  naturally expires.
- **Seeded example entries:** two real landmark cases ship pre-loaded,
  flagged "example — verify the citation." Their holdings are right in
  substance; their exact SCC volume/page numbers were not checked against
  SCC Online or Manupatra before shipping. Verify before relying on them, or
  clear them from the in-app "About" screen.

## What this deliberately doesn't do

No deadlines, no application tracker, no citation formatting, no file
attachments, no cross-linking between entries. `tags[]` and the per-type
field schema in `taxonomy.js` are where any of those would hook in, if it's
ever worth adding.
