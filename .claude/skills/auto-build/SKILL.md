---
name: auto-build
description: Build MotionForge Lite phase after phase without stopping, until a hard stop or the end of the plan.
disable-model-invocation: true
---

Build MotionForge Lite continuously.

1. Read `CLAUDE.md`, `MOTIONFORGE_LITE_SPEC.md` and `PROGRESS_LOG.md`.
2. Starting from the first unchecked phase in the Progress Checklist, do each phase with the full "Workflow for every phase" from `CLAUDE.md` (plan, implement, `tester`, `spec-reviewer`, "Done when", checklist, log, commit).
3. After committing a phase, give the user a 3–5 line Bangla summary, then continue with the next phase without waiting.
4. Stop immediately and ask the user in Bangla when:
   - any "Hard stop" in `CLAUDE.md` is hit (Phase 1 provider choice, API key, money, manual OBS/video test, risky git action),
   - tests still fail after 3 fix rounds,
   - a "Done when" item cannot be met.
5. When you stop, say which phase you are on, what is finished, and exactly what you need from the user. After the user answers, continue from where you stopped.
