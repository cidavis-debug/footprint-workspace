# Footprint AI Clipper

A small Chrome/Edge extension that saves the page you are reading, or just the text you highlighted, into a Footprint AI workspace.

## Install (no store, no approval)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose this `extension` folder.
4. Click the puzzle-piece icon in the toolbar and pin **Footprint AI Clipper**.

Chrome will show a notice about developer-mode extensions when it starts; that is expected for unpacked extensions.

## Use

1. Open the extension and sign in with your Footprint AI **email and password** (Google sign-in is not supported here yet; an account created only through Google has no password).
2. Pick a workspace.
3. **Save website** saves the page's web address as a link source. The next time you open Footprint AI it reads the page (menus and scripts stripped), like Add link. **Save selection** stores only the text you highlighted, exactly as it appears in your browser. Highlight first, then open the popup. Use Save selection for pages behind a login, because the app reads websites from its server and cannot sign in.
4. In Footprint AI, open the Sources panel and run **Analyze existing sources** so the new source is checked for conflicts.

Saved websites show as links (first as processing until the app opens and reads them); selections show as text sources with the original page address. Both can be searched, cited in chat, and analyzed like any other source. Saving the same website or the same selected text twice is skipped.

## Configure

`config.js` holds the Supabase project URL, its **publishable** key (a public key, never a secret key), and the web app's address. It was generated from the repo's `.env`. If you switch Supabase projects or deploy the app, edit it (see `config.example.js`) and click **Reload** on the extension's card.

## What it can and cannot do

- **Save selection** works on pages behind a login, because it reads the page already open in your browser. **Save website** only works for public pages.
- Cannot save browser-internal pages (`chrome://…`). Save selection also cannot read the Chrome Web Store or PDFs shown in Chrome's built-in viewer; for PDFs, download the file and upload it in the app.
- Asks only for permission to act on the tab you click it on (`activeTab`), plus storage for your sign-in and access to `*.supabase.co`.
- Your sign-in token is kept in the extension's local storage on this browser. Use **Sign out** on shared computers.
