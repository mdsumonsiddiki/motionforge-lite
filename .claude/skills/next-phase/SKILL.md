---
name: next-phase
description: Build the next unfinished phase of MotionForge Lite from MOTIONFORGE_LITE_SPEC.md, test it, review it, commit it, then stop for the user.
disable-model-invocation: true
argument-hint: "[phase number, optional]"
---

Build one phase of MotionForge Lite.

1. Read `CLAUDE.md`, `MOTIONFORGE_LITE_SPEC.md` and `PROGRESS_LOG.md`.
2. Pick the phase: if `$ARGUMENTS` is a number, use that phase; otherwise the first unchecked item in the spec's Progress Checklist. Tell the user in Bangla which phase you are starting.
3. Follow the "Workflow for every phase" in `CLAUDE.md` exactly: plan → implement → `tester` subagent (fix, max 3 rounds) → `spec-reviewer` subagent → check "Done when" → update checklist and `PROGRESS_LOG.md` → commit.
4. Respect every "Hard stop" in `CLAUDE.md`. When one is hit, stop and ask the user in Bangla.
5. Finish with a Bangla report: what was built, test results, exact steps for the user to test it manually, and what the next phase is.
6. Stop. Do not start the next phase.
