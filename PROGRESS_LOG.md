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
