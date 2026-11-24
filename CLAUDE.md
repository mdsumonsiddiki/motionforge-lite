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
1. Read the spec section for the phase and `PROGRESS_LOG.md`.
2. Write a short plan (files to create/change, tests to add) and show it to the user in Bangla.
3. Implement in small steps. Clean code with clear comments.
4. Delegate verification to the `tester` subagent. Fix failures and re-test, at most 3 rounds. If it still fails, stop and report.
5. Delegate a spec check to the `spec-reviewer` subagent. Fix real issues.
6. Check every "Done when" item of the phase.
7. Update the spec checklist and `PROGRESS_LOG.md`, then `git add -A` and `git commit -m "Phase N: <title>"`.
8. **Push to GitHub** only if the tester reported PASS: `git push origin main`. Before pushing, run `git status --ignored` and confirm `.env`, `node_modules` and build output are not tracked. If the push fails, report the error and stop (never force-push).
9. Report to the user in Bangla: what was done, test results, push status (commit link if possible), how to test it manually, anything that needs the user.
- No screenshots: do not add Playwright or a screenshot script.

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
- Commands that must pass before a commit: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## Secrets
- API keys live in `.env` (development) or Electron `safeStorage` (app). Never print a key, never commit `.env` (it must be in `.gitignore`).
