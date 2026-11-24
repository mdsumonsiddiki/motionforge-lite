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
