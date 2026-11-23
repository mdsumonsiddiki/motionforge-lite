# MotionForge Lite — Claude Code Instructions

## Source of truth
- Product spec: `MOTIONFORGE_LITE_SPEC.md`. Read it before any work. Never add features that are not in it.
- Progress: the "Progress Checklist" at the end of the spec. Update it after each finished phase.
- Phase log: `PROGRESS_LOG.md`. Append a short entry after each phase (what was built, test results, open issues).

## Talking to the user
- The user is a MERN developer. Explain in **Bangla**; keep code, file names and technical terms in English.
- If something in the spec is unclear or contradictory, ask the user. Do not guess.
- If the user's decision looks risky, warn before doing it.

## Prerequisite check (start of Phase 0, and whenever a tool seems missing)
Check each item and show the user a Bangla table: tool, required, found version, OK / missing.

| Tool | Command | Required | When needed |
|---|---|---|---|
| Node.js | `node -v` | LTS 22 or newer | Phase 0 |
| npm | `npm -v` | 10 or newer | Phase 0 |
| Git | `git --version` | any recent | Phase 0 |
| Git identity | `git config --global user.name` and `user.email` | set | first commit |
| GitHub access | `git ls-remote <repo-url>` after the remote is added, or `gh auth status` | working | first push |
| GitHub CLI (optional) | `gh --version` | any | only to create the repo automatically |
| OBS Studio | check `C:\Program Files\obs-studio\bin\64bit\obs64.exe` | 28 or newer | Phase 5 (warn only, don't block earlier phases) |

Rules:
- Do not install or upgrade anything by yourself. If something is missing, stop and give the user the exact install steps in Bangla (official download link or a `winget install` command they can run), then wait.
- After the user says it is installed, check again before continuing.
- Never change the user's global git config without asking.

## Workflow for every phase
The user watches progress from the phone (Claude app Remote Control + GitHub app), so work in **small steps** and push each one with a screenshot.

1. Read the spec section for the phase and `PROGRESS_LOG.md`.
2. Split the phase into **small steps** (one visible feature or one logic unit each, e.g. "Dashboard buttons", "Theme switch", "Settings: language"). Show the numbered step list to the user in Bangla.
3. **For each step:**
   1. Implement it. Clean code with clear comments.
   2. Run `npm run typecheck`, `npm test` and `npm run build`. Fix failures (max 3 rounds, then stop and report).
   3. If the step changes anything visible, run `npm run screenshot -- <phase>-<NN>-<short-name>` (see "Step screenshots").
   4. Commit: `git commit -m "Phase N step NN: <short description>"`, then `git push origin main`.
   5. Tell the user in 1–2 Bangla lines: step done, and the screenshot path.
4. **End of phase:** delegate to the `tester` subagent (full check incl. lint), then the `spec-reviewer`. Fix real issues (max 3 rounds).
5. Check every "Done when" item of the phase.
6. Update the spec checklist and `PROGRESS_LOG.md` (list every step with its screenshot path), commit `Phase N: <title> complete`, and push.
7. Before any push, confirm `git status --ignored` shows `.env`, `node_modules`, `out/`, `.tmp/` are not tracked. Never push code that fails typecheck/test/build. If a push fails, report and stop (never force-push).
8. Report to the user in Bangla: what was done, test results, the GitHub link to `docs/screenshots/phase-N/`, how to test it manually, anything that needs the user.

## Step screenshots (live-ish preview for the phone)
- One-time setup (do it in the current phase if missing): add `playwright-core` as a devDependency and create `scripts/screenshot.mjs`, plus the npm script `"screenshot": "node scripts/screenshot.mjs"`.
- `scripts/screenshot.mjs <name>`: launch the **built** app with Playwright's `_electron.launch({ args: ['.'] })`, wait for the first window to finish loading, set the window to 1280×800, wait 1 second, save `docs/screenshots/phase-<N>/<name>.png`, close the app. Exit with an error if the window never appears (30 s timeout).
- Optional second argument: a route or UI state to open first (e.g. `settings`, `dark`), so one step can show the screen it changed.
- Screenshots are committed and pushed, so the user can open them in the GitHub app. Keep them small (PNG, 1280×800 only).
- Steps with no visible change (pure logic, storage, IPC) skip the screenshot; say "no UI change" in the step message.
- Phase 1 sample images from the cloud test also go in `docs/screenshots/phase-1/`.

## GitHub
- Remote: `origin`, branch `main`, **private** repository.
- If no remote exists yet (first time, in Phase 0): ask the user for the GitHub repo URL. If the user prefers and `gh` CLI is installed and logged in, offer to create it with `gh repo create motionforge-lite --private --source . --remote origin` and run it only after the user says yes.
- Never push code that fails tests. Never push secrets.

## Hard stops (always stop and ask the user)
- Phase 1 provider choice, and any time an API key or paid account is needed.
- Anything that costs money (cloud calls beyond a few test calls).
- Manual checks only a human can do (OBS, Virtual Camera, video call apps).
- Deleting files outside this project, force-push, or rewriting git history (`git reset --hard`, `git rebase`, `git push --force`).
- Creating the GitHub repository (first time only).
- A "Done when" item that cannot be met.

## Working without getting stuck (user is often away, approving from phone)
- To read or search files, use the built-in Read / Grep / Glob tools, not `cat`, `tail`, `head`, `grep` in Bash. They need no permission.
- Write command output you need later to a file inside the project (e.g. `.tmp/`, add it to `.gitignore`) instead of `$TEMP`, then read it with Read.
- Avoid shell variables (`$TEMP`, `$HOME`, `%VAR%`) and `env` in Bash commands; they trigger a permission prompt every time. Use literal project-relative paths.
- Combine checks into one command or one script (`node scripts/check-x.mjs`) rather than many small commands.
- If you are stuck on the same problem for more than 3 attempts, stop and explain it to the user in Bangla instead of trying more variations.

## Debug code
- Temporary debug code must be marked `// TEMP-DEBUG` and removed before the phase commit. The `spec-reviewer` must fail the review if any `TEMP-DEBUG` remains.

## Code rules
- Stack: Electron + electron-vite + React + TypeScript + Tailwind + Zustand + i18next (see spec section 3).
- `contextIsolation: true`, no `nodeIntegration` in the renderer. All cloud calls and file access go through the main process via IPC.
- Every user-visible string goes through i18next (`en.json` and `bn.json`).
- Heavy work (OCR, inpaint) runs in Web Workers, never on the UI thread.
- Tests: Vitest for logic (storage, backup, command validation/clamp, pose cache, OBS path detection). Keep tests fast.
- `.gitignore` must also contain `*.tsbuildinfo` and `.tmp/`.
- Every step commit: `npm run typecheck`, `npm test`, `npm run build` must pass. Phase-end commit: also `npm run lint` and the `tester` subagent.

## Secrets
- API keys live in `.env` (development) or Electron `safeStorage` (app). Never print a key, never commit `.env` (it must be in `.gitignore`).
