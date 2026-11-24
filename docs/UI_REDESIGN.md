# UI Redesign — App Shell (Dark 3D + Light Glass)

Source of truth for the new look. The approved interactive demo is `docs/ui-reference/AppShell.reference.html`
(design-canvas format: plain HTML/inline styles + a small `Component` class at the bottom that holds the state and
the theme tokens). **Match it exactly: layout, sizes, spacing, radii, colours, shadows, copy, behaviour.**
Read that file fully before starting. Where this doc and the reference differ, the reference wins for visuals,
this doc wins for behaviour and scope.

Approved by the user on 2026-11-25.

---

## 0. Scope rules
- This is a **UI/shell change only**. Do not change Document Editor logic, OCR, inpaint, storage, backup, IPC or tests' meaning.
- Re-skin existing screens inside the new shell; do not rebuild features.
- Features that are not built yet (Human Studio controls, Text command, OBS "LIVE" detection) are shown as **disabled UI with a "Coming soon" tooltip/label** — never fake behaviour.
- Keep i18n: every new string goes into `en` and `bn` locale files. Bengali text uses `Hind Siliguri` / `Noto Sans Bengali` as fallback font.
- Keep existing theme persistence (Settings → theme is saved and restored on restart).
- Do not start Phase 6.

## 1. Fonts
- UI: `Poppins` 400/500/600/700, Bengali fallback `Hind Siliguri` 500. Bundle via `@fontsource` (offline), do NOT load Google Fonts at runtime.
- `font-family: 'Poppins', 'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif`.

## 2. Theme tokens (exact values — put in one tokens file, e.g. `src/styles/tokens.css` as CSS variables, `[data-theme="dark"]` / `[data-theme="light"]`)

| Token | Dark (3D neumorphic) | Light (lavender glass) |
|---|---|---|
| page | `#17181c` | `radial-gradient(circle at 15% 10%, #f6d9ff 0%, rgba(246,217,255,0) 40%), radial-gradient(circle at 85% 85%, #d4ccff 0%, rgba(212,204,255,0) 45%), #ece8fb` |
| shell | `#25272c` | `rgba(255,255,255,0.35)` |
| shellBorder | `#2c2f34` | `rgba(255,255,255,0.8)` |
| shellShadow | `0 30px 60px rgba(0,0,0,0.5)` | `0 30px 70px rgba(91,43,224,0.18)` |
| blur (backdrop-filter) | `none` | `blur(18px)` |
| side | `#25272c` | `rgba(255,255,255,0.72)` |
| sideSolid | `#25272c` | `#ffffff` |
| right | `#25272c` | `rgba(255,255,255,0.55)` |
| panel | `#25272c` | `rgba(255,255,255,0.85)` |
| panelSolid | `#25272c` | `#ffffff` |
| inset | `#1f2125` | `rgba(255,255,255,0.6)` |
| border | `#2f3238` | `rgba(109,61,245,0.14)` |
| cardBorder | `transparent` | `rgba(255,255,255,0.9)` |
| text | `#e8e9ec` | `#1c1638` |
| muted | `#a6aab2` | `#5f5980` |
| accent | `#5eead4` | `#6d3df5` |
| onAccent | `#0f2a25` | `#ffffff` |
| accentText | `#5eead4` | `#5b2be0` |
| inputBorder | `#8a8a8a` | `#8f86b8` |
| pink | `#f17a98` | `#c0267a` |
| purple | `#c084fc` | `#6d3df5` |
| teal | `#5eead4` | `#0e7c86` |
| feature (backup card) | `#3b2a7a` | `radial-gradient(circle at 80% 20%, #c13af0 0%, rgba(193,58,240,0) 50%), #2a0f8c` |
| profile ring | `conic-gradient(from 210deg, #5eead4, #0f766e, #ccfbf1, #2dd4bf, #5eead4)` | `conic-gradient(from 210deg, #6d3df5, #c13af0, #b9a3ff, #4b1fd1, #6d3df5)` |
| ringGlow | `0 0 20px rgba(94,234,212,0.35)` | `0 0 22px rgba(109,61,245,0.35)` |
| initials | `#5eead4` | `#5b2be0` |
| badge | `linear-gradient(135deg, #99f6e4, #2dd4bf)` | `linear-gradient(135deg, #6d3df5, #a43ae8)` |
| accentLine (profile borders) | `rgba(94,234,212,0.30)` | `rgba(109,61,245,0.30)` |
| profileBg | `linear-gradient(145deg, #2b2d33, #222428)` | `linear-gradient(145deg, rgba(255,255,255,0.95), rgba(246,240,255,0.85))` |
| avatarBg | `#1a1b1f` | `#ffffff` |
| profileHead | `linear-gradient(135deg, rgba(94,234,212,0.14), rgba(94,234,212,0) 70%)` | `linear-gradient(135deg, rgba(109,61,245,0.14), rgba(193,58,240,0.06) 60%, rgba(255,255,255,0) 90%)` |

Fixed colours: LIVE green `#22c55e` (dot), Go Live button `#16a34a`, Stop/Quit `#dc2626`, power icon `#f87171`, offline dot `#8a8f98`, focus ring `#8b5cf6`.

## 3. Depth classes (copy exactly from the reference `<style>`)
- `.btn3d` (reference `.as-btn`): every clickable button.
  - Dark: raised `7px 7px 15px #0f1013, -5px -5px 12px #363940, inset 1px 1px 0 rgba(255,255,255,0.05)`; hover lifts `translateY(-3px)` + `11px 11px 22px #0c0d10, -7px -7px 16px #3a3d44`; `:active` and selected (`.is-on`) sink: `inset 6px 6px 12px #121316, inset -5px -5px 10px #34373e`.
  - Light: raised `0 10px 24px rgba(91,43,224,0.16), inset 0 1px 0 rgba(255,255,255,0.95)`; hover `0 16px 32px rgba(91,43,224,0.22)`; active/selected `inset 0 3px 9px rgba(60,20,160,0.28)`.
- `.raise` (cards): dark `12px 12px 26px #101114, -8px -8px 20px #33363c`; light `0 16px 36px rgba(91,43,224,0.14), inset 0 1px 0 rgba(255,255,255,0.95)`.
- `.sink` (preview areas, inputs, tracks): dark `inset 6px 6px 14px #131417, inset -6px -6px 14px #2f3238`; light `inset 0 2px 8px rgba(91,43,224,0.12)`.
- Rule: things you press float (raised); selected/active things and things you look into (previews, inputs) are sunken.
- Add Settings → "Reduce effects" (default off): turns off `backdrop-filter` and hover lift (for 4 GB / no-GPU PCs). Also respect `prefers-reduced-motion`.

## 4. Layout (window min size 1100×700; shell has 20px page padding, radius 28px)
```
┌──────────┬────────────────────────────────────────────────────┐
│ SIDEBAR  │ NAVBAR: ☰ | page title | OBS pill | EN/বাংলা | ☀/🌙 | ⏻ │
│ 244px    ├──────────────────────────────────┬─────────────────┤
│ (88px    │ CENTER WORKSPACE (fluid)         │ RIGHT CONTROL   │
│ collapsed│ content of the selected section  │ PANEL 280–340px │
│ )        │                                  │ controls of the │
│          │                                  │ selected section│
└──────────┴──────────────────────────────────┴─────────────────┘
```
- Below ~1100px wide the right panel wraps under the center (flex-wrap), sidebar stays.

### 4.1 Sidebar
- Logo tile (40px, radius 13, accent bg) + "MotionForge".
- Items (52px high, radius 16, 3D buttons): Home · label "STUDIOS" · Human Studio · Document Editor · Webcam Output. Selected item = sunken + accent text (dark) / solid `#6d3df5` + white text (light).
- Bottom: Settings item (gear icon), then the **profile card**.
- ☰ in navbar toggles collapse (244 ↔ 88px, `transition: flex-basis .25s`), labels hidden when collapsed, icons stay; collapsed state persisted.

### 4.2 Navbar
- ☰ collapse button (46px, radius 14).
- Title block: small "MotionForge Lite" + current section name.
- **OBS pill**: `OBS · Offline` (grey dot) / `OBS · Running` (accent dot, when the OBS process the app launched is running — we already launch/close OBS) / `OBS · LIVE` (green pulsing dot, `.as-live` keyframes). LIVE needs OBS WebSocket → **not in this task**; implement Offline/Running only, keep the LIVE style ready behind a flag.
- Language segmented control EN / বাংলা (existing i18n switch).
- Theme toggle (sun icon in dark, moon icon in light).
- **Power** button (red icon) → menu: "Restart app" (`app.relaunch(); app.exit(0)`), "Quit app" (red, `app.quit()`), hint "Unsaved work is saved first. OBS keeps running." Before either: run the existing unsaved-changes check; if Output window is open, warn that it will close.

### 4.3 Profile (local only, no account)
- Card: avatar 50px with theme ring + glow, initials (from name, max 2 letters), green online dot, name, badge "STUDIO OWNER" (badge gradient, onAccent text), chevron. Collapsed sidebar → avatar only.
- Click → popover above it (290px): big avatar 66px, name, "Local profile · this PC"; **Display name** input (max 24, live-updates sidebar, initials and the Home greeting); 2×2 tiles: Change photo, My Library, Backup, Shortcuts (Shortcuts may be "Coming soon"); footer "MotionForge Lite · <app version>" + Done.
- Store `{ name, photoPath? }` in the existing settings store; include it in Backup/Restore. Photo replaces initials.

## 5. Sections (center + right panel)

### Home (default on launch)
- Center: "Hello, {name}" / "Here is where you left off." → **Continue Editing** card (last opened document thumbnail, name, "Document Editor · Slot N · All changes saved", buttons Resume / Send to Output) → two cards: **Live Output** (mini 16:9 preview of current output source/background + status) and **Getting Started** (3 steps with progress bar: Edit your first document ✓ when ≥1 document · Create a character · Go live in OBS) → **Library** grid of saved documents (+ "No characters yet" tile → Human Studio).
- Right: Overview (saved documents count, saved characters count, editor slots in use "n/3"), **Back up your work** card (feature colour) → existing Backup.
- If no documents yet: Continue Editing card becomes "Open your first document".

### Human Studio
- Center: sunken preview stage with dashed silhouette, "No character yet", chips "Saved characters: N", "Head turn limit: ±20°".
- Right: Character (Upload photo, Generate), Pose & Expression sliders (Head turn, Head tilt, Eyes, Smile, Zoom), Text command input, Save character. **All disabled + "Coming soon (Phase 6–8)"** until those phases exist.

### Document Editor (move the existing editor in here — no logic change)
- Center: slot tabs (open documents, "+ Open document", "n / 3 open · All changes saved"), sunken canvas area with the existing editor canvas.
- Right: the existing editor controls re-skinned in this order: Edit Text (lines found / uncertain count, detected text, textarea, Font select, hint, Apply), Replace Image (Select area), Undo · Redo · Export.

### Webcam Output (existing Phase 5 features)
- Center: sunken frame with 16:9 live preview of the output, "Source: …" label, chips "1280 × 720 · 24 FPS", "Background: …".
- Right: Source (Human | Document — Human disabled until Phase 9), Background (Original | Green | Custom), Open output window, Launch OBS, Go Live button (only when LIVE detection exists; for now hide it or show disabled "Coming soon").

## 6. Accessibility
- Real `<button>`/`<a>`/`<input>`/`<label>`; icon-only buttons have `aria-label`; menus `role="menu"`, popover `role="dialog"`, `aria-expanded`.
- Focus ring `2px solid #8b5cf6`, offset 3px, on every control. Text contrast ≥ 4.5:1 (tokens above pass).
- Keep the existing dark-mode input border contrast test; extend it to both themes.

## 7. Work order (one commit each, tests green, PROGRESS_LOG updated)
1. Tokens + depth classes + fonts + theme switch wiring (both themes) + Reduce effects.
2. Shell layout: sidebar (collapse, persisted), navbar (title, language, theme, power menu with unsaved check), right-panel slot, routing Home/Human/Document/Webcam.
3. Profile card + popover + settings storage + backup inclusion.
4. Home section.
5. Move Document Editor into center/right panel (pure re-skin; all existing tests must still pass).
6. Webcam Output section re-skin + OBS pill Offline/Running.
7. Human Studio placeholder section.
8. i18n bn strings for everything new; contrast tests for both themes.

## 8. Done when
- Side-by-side with the reference, every section looks the same in both themes.
- Theme, language, sidebar collapse and profile name survive a restart.
- Power → Restart and Quit work and respect unsaved changes.
- typecheck, lint, all tests, build pass. Manual test steps written in PROGRESS_LOG.md for the user.
