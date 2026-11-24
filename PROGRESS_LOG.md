# MotionForge Lite — Progress Log

Claude Code প্রতিটা Phase শেষে এখানে একটা ছোট Entry যোগ করবে।

<!-- Format:
## Phase N — Title (YYYY-MM-DD)
- Built: ...
- Tests: typecheck ✅ lint ✅ test ✅ build ✅
- Manual test for user: ...
- Open issues: ...
-->

## Phase 0 — Project Setup (2026-11-23)
- Prerequisites: Node v26.13.1 ✅, npm 12.2.3 ✅, Git 2.56.1 ✅, Git identity ✅, gh CLI ❌ (optional), OBS not found at default path ⚠️ (needed from Phase 5).
- Built: electron-vite + React 19 + TypeScript 6.0 + Tailwind v4 + Zustand + i18next (`en`/`bn`); `electron/main.ts` (contextIsolation, sandbox, no nodeIntegration), `electron/preload.ts`, renderer in `src/`; CSP injected by a Vite plugin (strict in build, relaxed for dev HMR); ESLint flat config + Prettier; Vitest (`themeStore` test); `.gitignore`; `git init -b main`.
- Notes: TypeScript pinned to `~6.0.3` (typescript-eslint does not support TS 7 yet). Electron 45 no longer downloads its binary on install, so `package.json` has `"postinstall": "install-electron"`.
- Tests: typecheck ✅ lint ✅ test ✅ (2 tests) build ✅ — tester PASS; spec-reviewer: no violations.
- Manual test for user: run `npm run dev` → an empty dark window with "MotionForge Lite" should open.
- Open issues: Electron could not be launched from Claude Code's tool environment (process hangs, no output), so the dev window was not verified by Claude — user check pending. GitHub remote not added yet (repo URL needed from user).

## Phase 2 — App Shell (2026-11-24)
- Cleanup first: step-screenshot workflow removed per user (`scripts/screenshot.mjs`, `playwright-core`, `"screenshot"` script, empty `docs/screenshots/phase-2/`). `.vscode/` added to `.gitignore`.
- Built: state-based routing (`navStore`); Dashboard with 3 big buttons + Settings gear in header; placeholder pages (Human Studio, Document Editor, Webcam Output) using the left-controls / right-preview layout; Settings page (Language, Theme, OBS Path with Browse + Auto-detect); Logo (SVG icon + name); toast system (`success` / `error` only); app close confirmation (main cancels first close → translated dialog in renderer → `app:confirm-close`).
- Main process: `electron/shared/settings.ts` (types, defaults, allow-list validation), `electron/services/settingsFile.ts` (`userData/settings.json`, atomic write, corrupt-file fallback), `electron/services/obs.ts` (OBS path detection), `electron/ipc/settings.ts`. Old `themeStore` replaced by `settingsStore` (optimistic update, revert + error toast on failure).
- Tests: typecheck ✅ lint ✅ test ✅ (8 files, 30 tests: settings validation, settings file round-trip, OBS detection, nav, toast, settings store, en/bn key parity) build ✅ — tester PASS; spec-reviewer: no violations.
- Manual test for user: `npm run dev` → Dashboard → open each of the 3 pages → Settings: switch Theme and Language (changes instantly) → close the app (confirmation dialog appears) → reopen: Theme and Language are kept.
- Open issues: Electron still cannot be launched from Claude Code's environment, so the restart-persistence check is covered by unit tests only — user check pending. Phase 5 must validate `obsPath` (e.g. ends with `obs64.exe`) before launching it.

## Phase 3 — Storage, Backup, Restore (2026-11-24)
- Built: `electron/services/storage.ts` (Character/Document CRUD in `userData/characters|documents/<id>/`, spec section 5 layout; file-name allow-list + id pattern against path traversal; only one `original.*` and it can never be replaced; all files validated before any write; meta.json shape + id/folder check, bad items skipped). `electron/services/backup.ts` (`archiver` zip of `characters/` + `documents/` + `settings.json` only; refuses a target inside userData; partial zip removed on error. Restore via `extract-zip` into `.restore-tmp`, validates entries / types / no symlinks / file count, moves current data to `.restore-old`, swaps in, rolls back on failure). IPC `storage:list|delete`, `backup:create|restore` (folder / file pickers in main). Renderer: reusable `ConfirmDialog` (also used by close confirmation), `libraryStore`, Dashboard small name lists (Saved Characters / Documents) with Delete + confirmation, Settings → Backup & Restore (Restore asks for confirmation; result shown as inline text, not a toast).
- New deps: `archiver`, `extract-zip`, `@types/archiver` (all listed in spec section 3).
- Tests: typecheck ✅ lint ✅ test ✅ (11 files, 54 tests: storage CRUD/validation/traversal/write-once, backup → delete all → restore round-trip, rollback on failed move, bad zips, library store) build ✅ — tester PASS; spec-reviewer must-fixes (non-atomic restore, unvalidated meta.json) fixed.
- Done when: "Save / Open / Delete dummy data" is met at the storage-service level (unit tests). Save and Open from the UI arrive with the editors in Phase 4 (Documents) and Phase 6 (Characters); Phase 3 UI has list + delete only.
- Manual test for user: `npm run dev` → Settings → Backup… (pick a folder) → a `MotionForge-Backup-*.zip` appears → change Theme → Restore… → confirm → pick the zip → Theme returns to the backed-up value.
- Open issues: none new.

## Phase 4 — Document Editor (2026-11-24)
- Built:
  - Offline assets: `scripts/copy-assets.mjs` (runs before `dev` and `build`) copies eng+ben `best_int` traineddata, the tesseract.js worker + LSTM cores and `opencv.js` from node_modules into `resources/` (Vite `publicDir`, git-ignored). Fonts: `@fontsource` Noto Sans Bengali, Noto Serif Bengali, Hind Siliguri, Noto Sans, Noto Serif (OFL) + Windows fonts via Local Font Access (only `local-fonts` permission is granted).
  - Main: built renderer served from `app://bundle/` (workers + fetch of local traineddata do not work reliably under `file://`), path-traversal-safe handler, `will-navigate` guard. IPC `document:pick-image|load|save|export` (JPG/PNG magic-byte check, 25 MB limit, `original.*` written only for a new document).
  - Renderer: `editor/` pure modules (types, history, geometry, textStyle, edits, ocrBoxes, inpaintPlan, fonts, render) + `session.ts` glue; OCR via tesseract.js in its own Web Worker (`workers/ocrClient.ts`); inpaint in `workers/inpaint.worker.ts` (OpenCV TELEA on a crop, only the mask area is drawn back); `documentStore` (3 slots, undo/redo, unsaved state); UI: slot tabs, left controls (open / open saved / name / Save / Export PNG / Export JPG / Delete, OCR progress, text edit with font dropdown + automatic size & color, Image Replace with rectangle select + drag / 4-corner resize, Undo/Redo + Ctrl+Z / Ctrl+Y), right preview with OCR box outlines. Unsaved-changes warning on closing a slot and on leaving the page.
  - edits.json = `{ version, ocrDone, ocr[], layers[] }`; replaced pictures are embedded as data URLs (max 8 MB each). Save / Export wait until all inpaint patches and images are ready.
- Tests: typecheck ✅ lint ✅ test ✅ (22 files, 97 tests) build ✅ — tester PASS; spec-reviewer: no spec violations, 3 bugs fixed (export before patches ready, patch margin overwriting neighbour edits, OCR lost when saved mid-OCR).
- Manual test for user (the "Done when" — Claude cannot launch Electron here): `npm run dev` → Document Editor → Open image… with a Bangla document → wait for OCR → click a box → type new text → pick a font → Apply → Export PNG. Repeat with an English document. Then Save, reopen it from "Open a saved document…", and check that `%APPDATA%\MotionForge Lite\documents\<id>\original.*` is unchanged.
- Open issues / assumptions: replaced image is placed on top of the selected area (the area under it is not inpainted). Text is drawn left-aligned at the box start; long text may overflow the box. Phone JPEGs with EXIF rotation should be checked manually (box alignment). System font list depends on Electron's Local Font Access support.

## Phase 5 — Webcam Output (Document Mode) + OBS (2026-11-24)
- Built: `electron/windows/outputWindow.ts` — separate Output window ("MotionForge Lite Output", fixed title for OBS), resizable, minimize/close, always on top, aspect ratio locked, no controls inside, `backgroundThrottling: false`; closing it only ends the output; closing the main window also closes it. 16:9 (1280×720) ↔ 9:16 (720×1280) switch resizes it (fitted to the screen). Same React bundle in `#output` mode (`src/output/OutputApp.tsx`): fixed-resolution canvas, 24 FPS timer that paints only when something changed. `useOutputSync` (main window) renders the chosen open document to PNG (debounced) and sends it with view/background state via main (sender-checked IPC).
- Webcam Output page: open/close window, size switch, document switch (up to 3 open slots), Zoom In/Out, ↑↓←→, Reset Position, Background Original (white around the document) / Green Screen #00FF00 / Custom image, FPS info, Launch OBS / Close OBS, "How to use with OBS" (4 steps).
- OBS: launch only the saved path, only if its file name is `obs64.exe` and it exists, `cwd` = its `bin\64bit` folder, detached. Close = `taskkill /IM obs64.exe` without `/F` (graceful).
- Tests: typecheck ✅ lint ✅ test ✅ (24 files, 113 tests: output layout math, zoom/pan limits, window fit, OBS path check, launch/close commands, output store) build ✅ — tester PASS; spec-reviewer: no must-fix.
- Manual test for user (the "Done when" — hard stop): open a document in Document Editor → Webcam Output → Open output window → Launch OBS → in OBS add Window Capture "MotionForge Lite Output" → (Green Screen + Chroma Key filter) → Start Virtual Camera → in a video-call app pick "OBS Virtual Camera" and check the document is visible. Also try 9:16 with OBS Canvas 720×1280, and Close OBS.
- Open issues: Custom background is kept only for the session.

## Fix — User decisions after Phase 5 (2026-11-24)
- Dev environment: `npm run dev` seemed stuck at "[optimizer] bundling dependencies…". Real cause: the installed `node_modules\electron\dist\electron.exe` hung on open (even `--version`); a fresh extraction of the same Electron 45.4.1 zip works. The optimizer itself finishes in < 1 s; Vite prints no "done" line, so its last message looked stuck. No code change; if it happens again, delete `node_modules\electron` and run `npm install`.
- Webcam Output "Original" background: white (#FFFFFF) around the document (user decision, recorded in the spec). Output window base color also white, so no dark flash before the first frame.
- Unsaved warning: no longer shown when changing pages (open documents stay in memory). Shown only when closing a document tab or the app; the app close dialog now says when open documents have unsaved changes (user decision, recorded in spec section 5).
- Tests: typecheck ✅ lint ✅ test ✅ (24 files, 114 tests: new `backgroundFill` tests, simplified nav test) build ✅ — tester PASS; spec-reviewer: no must-fix.
- Manual test for user: Webcam Output → Background Original → white around the document. Edit a document, go to another page and back (no warning, edits kept). Close its tab (warning) / close the app (warning says there are unsaved changes).

## Phase 4 + 5 — Manual test (2026-11-24)
- Phase 4: manual test passed by user (2026-11-24) — Bangla and English documents edited and exported.
- Phase 5: manual test passed by user (2026-11-24) — document shown in a video call through OBS Window Capture + Virtual Camera.
- Spec checklist: Phase 4 and Phase 5 ticked.

## Phase 1 — Remaining pose tests + Report (2026-11-24)
- `pose-test.mjs` got an optional 3rd argument (case-name prefixes) so only missing cases are sent.
- Run of 08–12 (eyes up/down, eyes closed, mouth smile/open): first call failed with "exceeded your free ZeroGPU quota"; tried once only, as instructed. Still 8/12.
- Written: `docs/PHASE1_REPORT.md` (latency, quality, Replicate cost, ToS/License, conditional Go recommendation). Phase 6 not started — waiting for the user's decision.
- Open issues: 4 tests pending (needs HF quota reset or a Replicate key); test on a photoreal face still missing.

## Fix — Phase 4 open issues: EXIF rotation + long text fit (2026-11-24)
- EXIF: tesseract.js only detects big-endian ("MM") EXIF orientation in the first 500 bytes, while `createImageBitmap` applies every orientation, so little-endian ("II") phone JPEGs got OCR boxes in the wrong (unrotated) coordinates. New `src/editor/exif.ts` (`readJpegOrientation`); when orientation ≠ 1, OCR now gets the decoded, already-upright pixels as PNG. `decode` sets `imageOrientation: 'from-image'` explicitly.
- Text fit: `fitFontSize` in `render.ts` shrinks the drawn size so the widest line fits the box width and all lines fit the box height (min 6 px, never larger than the layer size). The layer keeps its size; only drawing changes (preview, Save, Export, Webcam Output).
- Tests: new `exif.test.ts` (II/MM, APP0 first, broken/truncated/PNG) and `fitFontSize` tests.
- Manual test for user: open a phone photo taken in portrait (JPEG) → OCR boxes sit on the text. Type a much longer text into a box → Apply → it stays inside the box (smaller).
- Open issues: documents saved earlier from such rotated JPEGs keep their old (wrong) OCR boxes; open the image again as a new document.

## Fix — Old text not removed when editing a text box (2026-11-24)
- Root cause: in `npm run dev`, Vite serves `inpaint.worker.ts` as a **classic** worker (`?worker_file&type=classic`, `importScripts("/@vite/env")`), but the `import type` line left `export {};` in the served code → SyntaxError in a classic worker → the worker never started → every box went silently to `failedPatches` → new text drawn over the old. The build (iife bundle) was not affected.
- (1) `inpaint.worker.ts` now has no `import`/`export` at all (inline `import('…')` types, code in an IIFE), stays classic so `importScripts` for OpenCV works; clear error if it ever runs as a module worker; OpenCV load retried after a failure. `scripts/check-inpaint-worker.mjs` runs the dev-transformed and the built worker in a classic-worker sandbox with the real opencv.js and checks the text is removed (dev: OK, build: OK).
- (2) A failed removal now shows an error toast (`errors.inpaintFailed`, en + bn), at most one per 5 s (`editor/inpaintFailure.ts`).
- (3) Mask padding = ~15% of the box height (min 2 px) instead of a fixed 2 px, so matra, vowel signs and descenders are removed too.
- (4) `editor/solidFill.ts`: if a 4 px ring around the mask is one color (≥ 90% of pixels within ±24 of the median), the mask is filled with that color on the main thread (small, cheap); otherwise OpenCV TELEA in the worker.
- Tests: `inpaintWorker.test.ts` (no import/export; dev-mode worker really removes text), `inpaintFailure.test.ts`, `inpaintPlan.test.ts` (15% padding, matra above the box), `solidFill.test.ts` (plain / noisy / striped / gradient backgrounds).
- Manual test for user: `npm run dev` → Document Editor → open a document → edit a box on a white page → Apply → only the new text is visible. Also try a box on a coloured/patterned area, and a Bangla line with matra. Repeat once with the installed/built app.
- Render order (spec-reviewer finding): all removal patches are drawn first, then new text and images, so a padded patch can no longer cover a neighbouring line's new text (`renderDocument` test with a recording fake context).
- Spec section 8: the solid-colour fill, 15% padding and error toast recorded as user decisions (2026-11-24).
- Open issues: if the padded mask touches a neighbouring line that was NOT edited, a bit of that line's original ink could be erased; tell me with a sample image if you see it. A box whose removal failed is retried only after reopening the document.

## Fix — Document Editor manual-test issues: letter-only inpaint, glyph-size text, OCR filters, box adjust, dark fields (2026-11-24)
- Root causes: (1) worker masked the whole (15%-padded) rectangle and solid-fill covered it → faces/background inside and around the box were wiped; (2) font size = 0.8 × OCR box height and text centred in the box; colour = darkest 20% (wrong for light text); (3) only a confidence ≥ 30 filter; (4) OCR boxes could not be moved/resized; (5) dark field border #404040 on #171717 ≈ 1.7:1.
- (1) New `editor/textMask.ts`: Otsu threshold inside the box, minority class = text (dark or light text), dilate 2 px (box < 30 px) / 3 px; no clear text (contrast < 40) → whole box. `inpaintPlan.ts` builds a box-sized removal mask; plain background → mask pixels filled with the background colour, else TELEA in the worker with a per-pixel mask (`InpaintRequest.mask` is now a byte array). Patch = box-sized, transparent outside the mask, drawn with `drawImage` (ImageBitmap). Padding removed: no pixel outside the box changes.
- (2) `matchStyle` (session.ts) + `matchPlacement` (textStyle.ts): old OCR text measured in the chosen font (`actualBoundingBox*`), font size = old glyph height / measured ink height; one-line text drawn on the old baseline from the old left edge (`TextLayer.anchor`, optional in edits.json). Colour = median of the strongest text-mask pixels.
- (3) `ocrBoxes.ts`: confidence < 60 or < 50% letters → yellow box + "Uncertain" label; < 30, no letters/digits, taller than 25% of the image or outside the image → dropped. ≥ 50% uncertain lines → "handwriting or unclear image" warning.
- (4) Selected OCR box: drag to move, corner handles to resize (before Apply). Patch cache key = box id + rect, so an adjusted box is inpainted again.
- (5) `index.css`: dark-mode input/textarea/select border #8a8a8a (5.2:1), focus ring #818cf8 (5.9:1); `styles.test.ts` checks ≥ 3:1.
- Spec section 8: updated with these user decisions (replaces the 15% padding decision).
- Tests: typecheck ✅ lint ✅ test ✅ (165 tests; new textMask, inpaintPlan, solidFill, textStyle.matchPlacement, ocrBoxes, render anchor/drawImage, edits anchor, styles contrast) build ✅ check-inpaint-worker build+dev ✅ (also checks a pixel outside the mask is unchanged).
- Manual test for user: open a document with text over a photo/face → edit a box → Apply → only the letters change, the face stays. New text has the same height, baseline and colour as the old. A handwritten image → yellow "Uncertain" boxes + warning. Select a box → drag/resize it → Apply. Dark mode → field borders and focus ring are clearly visible.
- Open issues: a matra outside the OCR box is no longer removed automatically — enlarge the box first (resolved by the next entry). Font matching relies on the OCR text; for badly recognised lines the size may be off (falls back to max 1.5 × box height). Adjusting a box is not part of undo/redo (resolved later the same day).

## Fix — Bangla matra above the OCR box (2026-11-24)
- `inpaintPlan.findText`: the text search reaches ~25% of the box height (min 3 px) above the box. In that strip only text-coloured pixels (same Otsu threshold/polarity as the box) that are 8-connected to the letters inside the box are taken (flood fill) — the matra, not unrelated marks above. Strip pixels are removed only within the dilation radius of matra pixels, so a letter touching the box top does not erase background above it.
- Patch / crop / solid-fill now use the "area" (box + strip). `matchStyle` uses the same region, so the matra counts in the glyph height (font size).
- Spec section 8: matra exception recorded as user decision.
- Tests: typecheck ✅ lint ✅ test ✅ (169; new: matra above the box removed, unconnected dot kept, no growth without matra, ink box incl. matra) build ✅ check-inpaint-worker build+dev ✅.
- Manual test for user: Bangla document where the OCR box cuts the matra → edit the line → Apply → the old matra is gone too; marks above the line that do not touch the letters stay.
- Open issues: a matra more than ~25% of the box height above the box is still not reached (adjust the box).

## Fix — Box move / resize in Undo / Redo (2026-11-24)
- `documentStore`: history is now `History<EditState>` with `EditState = { layers, boxRects }`; `commitBoxRect` records a moved/resized OCR box, `commitLayers` keeps the box state. Ctrl+Z / Ctrl+Y undo box changes and layer edits in one order. `slot.ocr` stays the recognised boxes; `slotBoxes(slot)` applies the adjustments; `slotLayers(slot)` replaces `history.present` in callers. `savedLayers` → `savedEdits`, so a box move also counts as an unsaved change. Save writes the adjusted boxes to edits.json (format unchanged).
- Tests: typecheck ✅ lint ✅ test ✅ (170; new: box move undo/redo interleaved with a layer edit, dirty state) build ✅.
- Manual test for user: select a box → drag / resize it → Ctrl+Z (box jumps back) → Ctrl+Y (moved again). Apply text, then Ctrl+Z twice: first the text, then the box move is undone.
- Open issues: none new.

## Fix — Untranslated strings (en/bn) (2026-11-24)
- Audit (script over en.json / bn.json and all .ts/.tsx in src + electron): no missing keys, no t() key without a translation, no hard-coded user-visible text in components (only `Ctrl+Z` / `Ctrl+Y` shortcut hints and file-filter format names in main, which stay as they are).
- Translated 18 bn values that were plain English: Settings, Theme, Dark, Light, OBS Path, Auto-detect, Backup…, Restore…, Document (editor section), Save, PNG/JPG Export, Font, Apply, Undo / Redo, Undo, Redo.
- Kept in English on purpose: app and page names (MotionForge Lite, Human Studio, Document Editor, Webcam Output), "English", OBS Studio, aspect ratios. Webcam Output strings (`output.*`) were not changed (out of scope for this task).
- `i18n.test.ts`: new checks — every bn string has Bengali letters unless it is on the allow-list, and no string is empty.
- Tests: typecheck ✅ lint ✅ test ✅ (172) build ✅.
- Manual test for user: Settings → Language বাংলা → Settings page, Document Editor buttons (Save, Apply, Undo/Redo, Font) are in Bangla.
- Open issues: `output.*` still has English-only Bangla values (Zoom In, Background, Original…); translate when Webcam Output may be changed.

## UI Redesign — Step 1: tokens, depth classes, fonts, theme wiring, Reduce effects (2026-11-25, branch `ui-redesign`)
- Source: `docs/UI_REDESIGN.md` + `docs/ui-reference/AppShell.reference.html` (user-approved 2026-11-25; spec section 6 updated).
- `src/styles/tokens.css`: every section-2 token as CSS variables for `[data-theme="dark"]` / `[data-theme="light"]`, fixed colours, `.as-btn` / `.as-raise` / `.as-sink` / `.as-live` / `.as-range` copied from the reference; `.as-glass` for the light blur. Reduce effects (`data-reduce-effects="true"`) and `prefers-reduced-motion` turn off blur, hover lift and pulsing.
- Fonts: `@fontsource/poppins` 400/500/600/700 + Hind Siliguri 500 (offline). UI font stack `'Poppins', 'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif`.
- Theme wiring: `<html data-theme>` follows Settings → Theme (the `dark` class stays for not-yet-reskinned screens). New setting `reduceEffects` (default off, validated, persisted) + Settings → "Reduce effects" Off / On (en + bn).
- Form fields: border `var(--input-border)` and focus ring 2px #8b5cf6, offset 3px, in both themes.
- Tests: new `styles/tokens.test.ts` (text / muted ≥ 4.5:1 on every surface, accent / on-accent ≥ 4.5:1, input border + focus ring ≥ 3:1, both themes); `styles.test.ts` now checks both themes; settings validation + persistence for `reduceEffects`. typecheck ✅ lint ✅ test ✅ (180) build ✅.
- Manual test for user: Settings → Theme Light / Dark → text font is Poppins; Reduce effects On → restart → still On.

## UI Redesign — Step 2: shell layout (2026-11-25, branch `ui-redesign`)
- `src/shell/`: `Shell` (20px page padding, 28px rounded glass shell, sidebar | navbar + center + right-panel slot, flex-wrap), `Sidebar` (logo, Home · STUDIOS · Human Studio · Document Editor · Webcam Output, Settings at the bottom; 244 ↔ 88px with `transition: flex-basis .25s`, labels hidden when collapsed), `Navbar` (☰, title block, OBS pill, EN / বাংলা, theme toggle, power), `PowerMenu`, `ObsPill` (Offline now; Running / LIVE styles ready), `icons.tsx`, `ui.tsx` (Btn / Card / Sink / Chip helpers). All sizes and colours from the reference.
- Routing: `navStore` pages `home | human | document | output | settings`, opens on Home (Home shows the old Dashboard until step 4). Old `AppHeader` / `Logo` removed.
- New setting `sidebarCollapsed` (validated, persisted → survives a restart). Window min size 1100×700.
- Power menu: Restart app / Quit app → `CloseConfirmDialog` (now also used for window ✕) runs the existing unsaved-documents check and warns when the Output window is open. Restart = new IPC `app:restart` (sender-checked; `app.relaunch(); app.exit(0)`), Quit = existing `app:confirm-close`. ConfirmDialog re-skinned with the new tokens.
- Note: the reference hint "Unsaved work is saved first" does not match the app (no auto-save; the user is asked). Copy used: "You are asked about unsaved work first. OBS keeps running." — waiting for user confirmation.
- Tests: `shell/exitText.test.ts` (close / quit / restart texts, unsaved + Output warnings), settings validation for `sidebarCollapsed`, nav pages. typecheck ✅ lint ✅ test ✅ (185) build ✅.
- Manual test for user (step 2): ☰ collapses the sidebar → restart → still collapsed; EN / বাংলা and ☀ / 🌙 in the navbar switch and persist; Power → Restart app with an unsaved document → dialog → Restart without saving → app reopens; Power → Quit app with the Output window open → warning mentions the Output window.

## UI Redesign — Step 3: profile card + popover (2026-11-25, branch `ui-redesign`)
- `src/shell/ProfileCard.tsx`: sidebar card (50px ring avatar + glow, initials or photo, green online dot, name, STUDIO OWNER badge, chevron; collapsed sidebar → avatar only) and 290px popover (66px avatar, name, "Local profile · this PC", Display name input max 24, tiles Change photo / My Library / Backup / Shortcuts (disabled, "Coming soon"), footer "MotionForge Lite · version" + Done). Sizes and colours from the reference.
- Settings: new `profileName` (max 24 code points, control characters removed) and `profilePhoto` (PNG / JPEG data URL only, max 300 KB; the picked image is downscaled to 128px JPEG in the renderer). Stored in settings.json, so Backup / Restore includes the profile. Name saves 250 ms after typing stops and live-updates the sidebar.
- Change photo uses the existing image picker IPC (no new IPC). Backup tile uses the existing backup IPC (`useBackup` hook).
- Tests: `shell/profile.test.ts` (default name, initials incl. Bangla, photo downscale size), settings validation for name / photo, settings round trip, backup restores the profile. typecheck ✅ lint ✅ test ✅ (190) build ✅.
- Manual test for user: click the profile card → type a name → sidebar updates → restart → name kept; Change photo → pick a JPG → avatar shows the photo; Backup tile → choose folder → status line shows the zip path; collapse sidebar → only the avatar shows.

## UI Redesign — Step 4: Home section (2026-11-25, branch `ui-redesign`)
- `src/pages/home/Home.tsx` (center): "Hello, {name}" + subtitle; Continue Editing card (active / first open document with its thumbnail, "Document Editor · Slot N · All changes saved / Unsaved changes", Resume → editor, Send to Output → output shows that document; nothing open → newest saved document is opened on Resume; nothing at all → "Open your first document" with the image picker); Live Output card (mini 16:9 preview of the shown document + background, "Document · 720p" chip, status Offline); Getting Started (3 steps + progress bar; Go live stays open until LIVE detection exists); Library grid (saved documents open in the editor; "+ No characters yet" → Human Studio).
- `src/pages/home/HomePanel.tsx` (right): Overview counts (saved documents purple, saved characters pink, editor slots n/3 teal) + "Back up your work" feature card → existing Backup (status line under the button).
- Old Dashboard + SavedList removed. Deleting a saved document stays in the Document Editor (Delete button, with confirmation).
- `BlobImage` shows image bytes via a blob URL that is revoked on change / unmount. `openErrors.ts`: open-error mapping shared by the editor and Home (moved, unchanged).
- Tests: `pages/home/homeModel.test.ts` (continue target, getting-started steps). typecheck ✅ lint ✅ test ✅ (195) build ✅.
- Manual test for user: start with no documents → "Open your first document" → pick a JPG → editor opens; back to Home → card shows the document + thumbnail + Slot 1; Send to Output → Webcam Output shows it; Back up now → choose folder → status shows the zip path.

## UI Redesign — Step 5: Document Editor re-skin (2026-11-25, branch `ui-redesign`)
- Center: slot tabs (46px, radius 14; active tab sunken + accent text; dirty dot; ✕ close with the existing unsaved confirmation), one "+ Open document" tab per free slot (popover with the existing Open image / Open saved controls), "n / 3 open · All changes saved / Unsaved changes"; sunken canvas area (radius 26, min 480px) with the existing preview. Empty state: "No document open".
- Right panel (`DocumentPanel` → `DocControls`), in the spec order: Edit Text (OCR progress / "n lines found · m uncertain (yellow)" / error + Try again / handwriting warning, Detected line, textarea, Font, hint, Apply 48px), Replace Image (Select area, Remove selected image), Undo · Redo · Export (Export shows PNG / JPG), then Document (name, Save, Delete).
- No editor logic changed: same session / store calls; only markup, styles and the shared `selectingArea` flag (moved to `docUiStore` because preview and controls are now in different slots). Overlay colours follow the reference (selected #8b5cf6, boxes #38bdf8, uncertain dashed #eab308); canvas shadow from the reference.
- New tokens `--warn` / `--danger-text` (warning / error text), checked ≥ 4.5:1 on every surface in both themes.
- Tests: all existing editor tests unchanged and passing. typecheck ✅ lint ✅ test ✅ (195) build ✅.
- Manual test for user: open 1 document → tabs show it + two "+ Open document"; click a text box → right panel shows Detected / textarea / Font / Apply; Apply works as before; Select area → drag → pick image; Undo / Redo; Export → PNG; Save; Delete.
