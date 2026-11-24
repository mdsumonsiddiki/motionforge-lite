# MotionForge Lite — Final Build Spec (Claude Code-এর জন্য)

> **Claude Code-এর প্রতি নির্দেশ:** এই ফাইলটাই প্রজেক্টের একমাত্র Source of Truth।
> কাজ করবে **শুধু একটা Phase করে**। প্রতিটা Phase শেষ হলে "Done when" তালিকা মিলিয়ে দেখবে, তারপর থেমে User-কে test করতে বলবে।
> এই Spec-এর বাইরে কোনো Feature যোগ করবে না। কোনো কিছু অস্পষ্ট লাগলে নিজে অনুমান না করে User-কে প্রশ্ন করবে।
> Section 13-এর Progress Checklist প্রতিটা Phase শেষে update করবে।

---

## ০. মূল Brief থেকে কী কী সংশোধন করা হয়েছে

| # | মূল Brief-এ যা ছিল | সমস্যা | সংশোধন |
|---|---|---|---|
| 1 | Output Background: Transparent | OBS Window Capture আর Virtual Camera transparency (alpha) পাঠাতে পারে না | Output-এ **Green Screen** (OBS-এ Chroma Key দিয়ে সরানো যাবে)। Transparent শুধু Human Studio Preview আর PNG Save-এ থাকবে |
| 2 | Offline Manual Control, আবার একই সঙ্গে খুব Lightweight | Photoreal ছবি নড়াতে AI Model লাগে, Local-এ চালাতে GPU লাগে | **Offline Control বাদ (User-এর সিদ্ধান্ত)।** Head (Yaw/Pitch), Eyes, Mouth-এর প্রতিটা পরিবর্তন **Cloud AI দিয়ে Render হবে**। Local PC-তে কোনো AI Model চলবে না, তাই App হালকা থাকবে আর GPU লাগবে না। শুধু Tilt, Zoom আর Position Local-এ সাধারণ 2D Transform দিয়ে হবে |
| 3 | Text Command উদাহরণে "মুখে হালকা হাসি" | Mouth-এ কোনো মাত্রা (intensity) নেই | Mouth-এর শুধু ৪টি State: smile / neutral / open / close। "হালকা হাসি" → `smile` |
| 4 | Head "Rotation Slider" | কোন দিকে rotation, বোঝা যায় না | **Tilt (Roll), মাথা কাত করা, -15° থেকে +15°**। Left/Right/Up/Down Button-এর মাধ্যমে হবে (Assumption, User বদলাতে পারবেন) |
| 5 | Original Font হুবহু রাখা | বাংলা Font নিজে থেকে শনাক্ত করার নির্ভরযোগ্য উপায় নেই | User Font List থেকে Font বেছে নেবে। Size, Position আর Color App নিজে মিলিয়ে নেবে |
| 6 | Settings: শুধু Language, OBS Path, Output | Cloud AI চালাতে API Key লাগবে | Settings-এ **Cloud API Key** Field যোগ হলো (Personal Use ধরে নেওয়া হয়েছে) |
| 7 | Document Editor-এ Undo নেই | Editing-এর জন্য Undo অপরিহার্য | **Undo / Redo** যোগ হলো (Session-এর মধ্যে) |
| 8 | Photo Upload-এ কোনো শর্ত নেই | Cloud AI-এর ToS আর আইনি ঝুঁকি | Upload-এর সময় **"এই ব্যক্তির সম্মতি আছে"** Checkbox থাকবে। Check না করলে Generate হবে না |
| 9 | 9:16 Portrait Output | OBS-এর Canvas 16:9 হলে ছবি কেটে যায় | User-কে OBS Canvas 720×1280 করতে বলার নির্দেশনা App-এর ভিতরে দেখাবে |
| 10 | "সর্বোচ্চ ৩টি Document" | Save করা মোট সংখ্যা নাকি একসঙ্গে খোলা, অস্পষ্ট | **একসঙ্গে সর্বোচ্চ ৩টি Document খোলা (Slot) থাকবে**। Save করা Document-এর কোনো সীমা নেই |

---

## ১. অ্যাপ পরিচিতি

MotionForge Lite হলো একটি ছোট, হালকা Windows Desktop App। এর তিনটি কাজ:
1. **Human Studio**: একটি ছবি থেকে Photorealistic Digital Human তৈরি ও নিয়ন্ত্রণ
2. **Document Editor**: Document Image-এর লেখা ও ছবি সম্পাদনা
3. **Webcam Output**: Human বা Document আলাদা Window-তে দেখানো, যা OBS Window Capture দিয়ে Virtual Camera হিসেবে ব্যবহার করা যাবে

**Design Goal:** কম RAM, CPU ও GPU ব্যবহার। দ্রুত ও সহজ।

---

## ২. Minimum PC Requirement

| | Minimum | Recommended |
|---|---|---|
| OS | Windows 10/11 64-bit | Windows 11 |
| RAM | 4 GB | 8 GB |
| GPU | আলাদা GPU লাগবে না (সব AI কাজ Cloud-এ) | — |
| Disk | 1 GB | 2 GB |
| Internet | Human Generation আর Character Control-এর জন্য বাধ্যতামূলক | Stable Broadband |
| অন্যান্য | Output ব্যবহারের জন্য OBS Studio 28+ | — |

---

## ৩. Tech Stack

| অংশ | Technology | কারণ |
|---|---|---|
| Desktop Shell | **Electron** + `electron-vite` | React জানা আছে, দ্রুত বানানো যায় |
| UI | **React + TypeScript** | Type থাকলে Claude Code কম ভুল করে |
| Styling | Tailwind CSS | হালকা; Dark/Light সহজ |
| State | Zustand | ছোট ও সহজ |
| Language | i18next (`en`, `bn`) | Default English |
| OCR | `tesseract.js` (`eng` + `ben` traineddata App-এর সঙ্গে bundled, Offline) | সবচেয়ে হালকা বিকল্প, Web Worker-এ চলে |
| Image Processing | Canvas 2D + `opencv.js` (inpaint), Web Worker-এ | পুরোনো লেখা মোছার জন্য |
| Character Pose | Cloud `PoseRenderer` (Section 9) + Local Pose Cache | Head/Eyes/Mouth Control; Local-এ কোনো AI Model নেই |
| Storage | Local JSON + Image File | Database লাগবে না |
| Backup | `archiver` (zip তৈরি) + `extract-zip` (Restore) | — |
| Installer | `electron-builder` (NSIS) | Single Installer |
| Cloud AI | Provider Interface (Section 9); Provider ঠিক হবে Phase 1-এ | Provider পরে বদলানো যাবে |

**Process Rule:** ভারী কাজ (OCR, Inpaint) কখনো UI Thread-এ চলবে না। এগুলো Web Worker-এ চলবে। Cloud Call চলবে Main Process থেকে।
**Lightweight Rule:** কোনো Background Service, Auto Save, Auto Backup বা Startup Task থাকবে না। Local PC-তে কোনো AI Model থাকবে না।

---

## ৪. Folder Structure (Code)

```
motionforge-lite/
├── electron/
│   ├── main.ts              # App window, IPC, close confirmation
│   ├── preload.ts           # Safe IPC bridge (contextIsolation: true)
│   ├── ipc/                 # storage, backup, obs, cloud, pose handlers
│   ├── services/
│   │   ├── storage.ts
│   │   ├── backup.ts
│   │   ├── obs.ts
│   │   ├── cloud/           # provider interface + implementations
│   │   └── poseCache.ts     # cloud-rendered pose image cache
│   └── windows/outputWindow.ts
├── src/                     # React renderer
│   ├── pages/ Dashboard, HumanStudio, DocumentEditor, WebcamOutput, Settings
│   ├── components/
│   ├── workers/ ocr.worker.ts, inpaint.worker.ts
│   ├── store/
│   └── i18n/ en.json, bn.json
├── resources/ tessdata/, fonts/, icon.ico
└── MOTIONFORGE_LITE_SPEC.md
```

---

## ৫. Data Storage

Location: Electron `app.getPath('userData')`, অর্থাৎ `%APPDATA%\MotionForge Lite\`

```
userData/
├── settings.json
├── characters/<id>/
│   ├── meta.json          # { id, name, createdAt, background: "original|transparent|custom" }
│   ├── source.jpg         # User-এর দেওয়া মূল ছবি
│   ├── generated.png      # Cloud-এ তৈরি Photoreal ছবি
│   ├── cutout.png         # Background Remove করা (থাকলে)
│   ├── custom-bg.*        # Custom Background (থাকলে)
│   └── poses/<stateKey>.png  # Cloud থেকে আসা Pose Image Cache (একই Pose আবার চাইলে Cloud Call হবে না)
└── documents/<id>/
    ├── meta.json          # { id, name, createdAt, updatedAt }
    ├── original.(jpg|png) # কখনো বদলাবে না
    ├── edits.json         # OCR box, text edit, image replace (Edit layer)
    └── edited.png         # শেষ Save করা Render
```

- **Uninstall করলেও userData মুছবে না** (`deleteAppDataOnUninstall: false`)।
- Auto Save নেই। শুধু Save Button চাপলে Save হবে। Unsaved Change থাকলে Tab (Document) বা App বন্ধ করার আগে সতর্ক করবে।
  - User-এর সিদ্ধান্ত (2026-11-24): Page বদলালে সতর্কবার্তা দেখাবে না (খোলা Document হারায় না)। শুধু Tab বা App বন্ধ করার সময় দেখাবে।
- Delete আর Restore করার আগে Confirmation চাইবে।
- **Backup** = `characters/` + `documents/` + `settings.json` মিলিয়ে একটা `.zip` (API Key Backup-এ যাবে না)। Backup কোথায় রাখবে, User Folder বেছে দেবে।

---

## ৬. Dashboard ও Interface

- App খুললে সরাসরি Dashboard দেখাবে। কোনো Intro বা Splash Animation থাকবে না।
- Dashboard-এ ৩টি বড় Button থাকবে: Human Studio, Document Editor, Webcam Output। এর সঙ্গে Settings Icon।
- Saved Item-এর বড় Preview Card থাকবে না। ছোট Name List-ই যথেষ্ট।
- Layout: **বামে Controls, ডানে Preview** (Human Studio আর Document Editor দুটোতেই)।
- Theme Dark/Light (Switch করা যাবে)। Language English/বাংলা।
- Logo: ছোট Custom Icon আর পাশে "MotionForge Lite" লেখা।
- Notification শুধু দুই রকম: Generation Complete আর Error।
- App Close করার আগে Confirmation চাইবে।

---

## ৭. Human Studio

### ৭.১ Generation Flow
1. User একটি Photo Upload করবে (JPG/PNG, প্রতিবার ১টি)। পাশে Tip দেখাবে: একজন ব্যক্তি, সামনের দিকে মুখ, মাথা থেকে কোমর পর্যন্ত।
2. **Consent Checkbox** ("এই ব্যক্তির ছবি ব্যবহারের সম্মতি আছে") Check করতে হবে, তারপর Generate Button কাজ করবে।
3. Cloud AI `HumanGenerator`-কে ছবি পাঠাবে। ফেরত আসবে Photorealistic ছবি, যেখানে Face Identity, Skin Tone আর পোশাক অপরিবর্তিত থাকবে। Cartoon বা Anime Style হবে না।
4. Preview দেখাবে। User দুটো বিকল্প পাবে: **Save (নাম দিয়ে)** অথবা **Regenerate**।
5. Internet না থাকলে Error দেখাবে: "Generation-এর জন্য Internet প্রয়োজন"।

### ৭.২ Character Control (Internet লাগবে)

**কীভাবে কাজ করবে:**
- Head Yaw/Pitch, Eyes বা Mouth বদলালে নতুন `CharacterState` Cloud `PoseRenderer`-এ পাঠানো হবে। Cloud সেই Pose-এর একটা ছবি ফেরত দেবে।
- ছবি আসার আগ পর্যন্ত Preview-তে আগের ছবি থাকবে, সঙ্গে ছোট Loading Indicator। ছবি এলে ~300ms Crossfade হবে।
- **Pose Cache:** প্রতিটা Pose-এর ছবি `poses/<stateKey>.png`-এ জমা থাকবে। একই Pose আবার চাইলে Cloud Call না করে Cache থেকে দেখাবে। এতে সময় আর খরচ দুটোই বাঁচবে।
- **Debounce:** User দ্রুত কয়েকবার Button চাপলে শুধু শেষ State-টাই Cloud-এ যাবে (৪০০ms debounce)।
- **Tilt (Roll), Zoom, Position:** এগুলো Local 2D Transform (rotate/scale/translate), তাই Cloud লাগবে না।
- **Idle Blink:** বর্তমান Pose দেখানোর পর তার Eyes-closed সংস্করণ একবার Cloud থেকে আনা হবে, তারপর Cache থেকে প্রতি ৩–৬ সেকেন্ডে ~150ms দেখাবে।
- Internet না থাকলে Control Button disabled থাকবে, সঙ্গে বার্তা: "Character Control-এর জন্য Internet প্রয়োজন"। Saved Character-এর শেষ ছবি তখনো দেখা যাবে।

| অংশ | Control | মান |
|---|---|---|
| Head | Left / Right Button | Yaw, প্রতি চাপে 5°, সীমা ±25° |
| Head | Up / Down Button | Pitch, প্রতি চাপে 5°, সীমা ±15° |
| Head | Rotation Slider | Tilt/Roll, -15° থেকে +15° |
| Head | Reset Head | সব 0° |
| Eyes | Left / Right / Up / Down / Center | Gaze direction (discrete) |
| Eyes | Open / Close | Eyelid state |
| Mouth | Smile / Neutral / Open / Close | ৪টি discrete state |
| — | Reset All | Head 0°, Eyes center + open, Mouth neutral |

- Eye বা Mouth-এর জন্য কোনো Slider থাকবে না। Mouse Drag দিয়ে Control হবে না।
- Movement Speed স্থির ("Normal"): নতুন ছবি এলে ~300ms Crossfade। Tilt Slider Local হওয়ায় সঙ্গে সঙ্গে smooth।
- Idle অবস্থায় শুধু Eye Blink হবে (উপরের নিয়ম অনুযায়ী)। মাথা বা মুখ নিজে থেকে নড়বে না।
- Yaw/Pitch ৫° ধাপে থাকায় Pose সংখ্যা সীমিত, তাই Cache কাজে লাগবে।

**Internal Character State** (Control, AI Command আর Output, তিন জায়গাতেই এই একই State ব্যবহার হবে):
```ts
type CharacterState = {
  head: { yaw: number; pitch: number; roll: number };          // degrees
  eyes: { direction: 'center'|'left'|'right'|'up'|'down'; open: boolean };
  mouth: 'neutral'|'smile'|'open'|'close';
};
```

### ৭.৩ AI Text Command (Cloud)
- একটা Text Box আর একটা Execute Button থাকবে। বাংলা ও English দুটোই চলবে। এক Command-এ একাধিক নির্দেশ দেওয়া যাবে।
- Cloud `CommandParser` Text-কে নিচের JSON-এ রূপান্তর করবে। শুধু যে অংশ বদলাবে, সেটুকুই ফেরত আসবে:
```json
{ "head": { "yaw": 15 }, "eyes": { "direction": "left" }, "mouth": "smile" }
```
- উদাহরণ: "মাথা ডানে, চোখ বামে, মুখে হাসি" → উপরের JSON।
- Cloud-এর Response সবসময় Schema দিয়ে Validate হবে। মান সীমার বাইরে গেলে Clamp হবে। বুঝতে না পারলে "Command বোঝা যায়নি" দেখাবে।
- Voice বা Speech Recognition থাকবে না।

### ৭.৪ Camera View ও Background
- Zoom In/Out আর Position Adjust (Up/Down/Left/Right) Button থাকবে, সঙ্গে Reset View।
- Background তিন রকম: **Original** / **Transparent** (Cloud Background Removal, Preview-তে checkerboard দেখাবে) / **Custom** (User-এর Upload করা ছবি)। Built-in Background Library থাকবে না।

---

## ৮. Document Editor

- একসঙ্গে সর্বোচ্চ **৩টি Document Slot** (Tab) খোলা থাকবে। প্রতিটা আলাদাভাবে Edit ও Save হবে।
- Input শুধু Image (JPG/PNG)। PDF বা DOCX চলবে না।

### Edit Flow
1. Image খুললে **OCR** (tesseract.js, `eng+ben`) চলবে, Worker-এ। চলার সময় Progress দেখাবে।
2. OCR-এ পাওয়া Text Box গুলো Image-এর ওপরে Outline হিসেবে **Preview** দেখাবে। AI দিয়ে অনুমান বা Auto-Correct হবে না।
3. User একটা Box-এ Click করে Text Edit করবে।
4. Apply চাপলে:
   - পুরোনো লেখার জায়গা `opencv.js inpaint` দিয়ে মুছে যাবে
   - নতুন লেখা Render হবে। Size, Position আর Color স্বয়ংক্রিয়ভাবে মেলানো হবে (Box height থেকে Size, আশেপাশের Dark pixel থেকে Color)
   - **Font: User Dropdown থেকে বেছে নেবে।** Bundled Font: Noto Sans Bengali, Noto Serif Bengali, Hind Siliguri, Noto Sans, Noto Serif (সবগুলো OFL License)। সঙ্গে System-এ Install থাকা Font।
5. **Image Replace:** User একটা জায়গা (Rectangle) Select করে নতুন ছবি বসাবে। এরপর Drag আর Resize Handle দিয়ে Size ও Position ঠিক করবে।
6. **Undo / Redo** (Ctrl+Z / Ctrl+Y), শুধু Session-এর মধ্যে।
7. `original.*` কখনো বদলাবে না। সব Edit `edits.json`-এ Layer হিসেবে থাকবে, Save চাপলে `edited.png` তৈরি হবে।
- Export শুধু JPG ও PNG। PDF Export থাকবে না।
- Save / Open / Delete থাকবে। Delete করার আগে Confirmation চাইবে।

---

## ৯. Cloud Service Interface

সব Cloud কাজ একটা Interface-এর পিছনে থাকবে, যাতে Provider পরে বদলানো যায়:
```ts
interface HumanGenerator   { generate(photo: Buffer): Promise<Buffer> }     // photoreal PNG
interface BackgroundRemover { remove(image: Buffer): Promise<Buffer> }      // PNG with alpha
interface CommandParser    { parse(text: string, current: CharacterState): Promise<Partial<CharacterState>> }
interface PoseRenderer     { render(base: Buffer, state: CharacterState): Promise<Buffer> } // roll বাদে (roll Local-এ হয়)
```
- `PoseRenderer`-কে অবশ্যই Face Identity, Skin Tone আর পোশাক অপরিবর্তিত রাখতে হবে। Phase 1-এ এটাই যাচাই হবে।
- Cloud Call হবে **শুধু Main Process থেকে**। API Key Renderer-এ কখনো যাবে না।
- API Key রাখা হবে Electron `safeStorage` দিয়ে Encrypt করে।
- Cloud Call শুধু User-এর কোনো কাজের ফলে হবে। একমাত্র ব্যতিক্রম: বর্তমান Pose-এর Blink ছবি একবার আনা। এর বাইরে কোনো Background Call থাকবে না।
- Timeout 60s। Error হলে স্পষ্ট বার্তা দেখাবে: Internet নেই / Key ভুল / Quota শেষ।
- **Open Decision (Phase 1-এ User ঠিক করবেন):** কোন Provider ব্যবহার হবে।

---

## ১০. Webcam Output ও OBS

### Output Window
- আলাদা, ছোট, Resizable Normal Window। Title Bar, Minimize আর Close Button থাকবে। **Always on Top** থাকবে।
- Window-এর ভিতরে কোনো Control থাকবে না, শুধু Live Output দেখাবে।
- Window বন্ধ করলে শুধু Output বন্ধ হবে, MotionForge Lite চালু থাকবে।
- Resolution: **1280×720 (16:9)** অথবা **720×1280 (9:16)**, Switch করা যাবে। Window resize করলে aspect ratio লক থাকবে।
- Frame Rate **24 FPS**, স্থির।

### Control (মূল App-এর Webcam Output Page থেকে)
- **Human / Document Mode Switch** (তাৎক্ষণিক পরিবর্তন হবে)।
- Human Mode: Human Studio-র বর্তমান Character আর State Live দেখাবে।
- Document Mode: খোলা সর্বোচ্চ ৩টি Document-এর মধ্যে কোনটা দেখাবে, সেটা Switch করা যাবে। Zoom In/Out, Up/Down/Left/Right আর Reset Position থাকবে।
- Background: **Original / Green Screen (#00FF00) / Custom Image**।
  - User-এর সিদ্ধান্ত (2026-11-24): Original-এ Document-এর চারপাশ **সাদা (#FFFFFF)** দেখাবে।

### OBS
- Settings-এ OBS Path থাকবে (Default: `C:\Program Files\obs-studio\bin\64bit\obs64.exe`, Auto-detect করার চেষ্টা করবে)।
- **Launch OBS** Button: `obs64.exe` চালাবে, আর working directory (`cwd`) হবে ওই `bin\64bit` Folder। এটা না করলে OBS ঠিকমতো চালু হয় না।
- **Close OBS** Button: OBS-কে স্বাভাবিকভাবে বন্ধ হতে বলবে। Force-kill করবে না।
- App-এর ভিতরে একটা ছোট "How to use with OBS" নির্দেশনা থাকবে:
  1. OBS-এ Source যোগ করুন: Window Capture → "MotionForge Lite Output" বেছে নিন
  2. Green Screen ব্যবহার করলে: Source-এ Filter যোগ করুন → Chroma Key
  3. 9:16 ব্যবহার করলে: OBS Settings → Video → Canvas 720×1280
  4. OBS-এ Start Virtual Camera চাপুন
- MotionForge Lite নিজের কোনো Virtual Camera Driver তৈরি করবে না।

---

## ১১. Settings

শুধু এগুলো থাকবে: Language (English/বাংলা), Theme (Dark/Light), OBS Path, Cloud API Key, Backup, Restore, আর Output তথ্য (720p, 24 FPS, শুধু দেখানোর জন্য, বদলানো যাবে না)।

## ১২. Offline / Online

| Feature | Internet লাগবে? |
|---|---|
| App চালু, Dashboard, Saved Character দেখা (শেষ ছবি), Tilt/Zoom/Position | না |
| Document OCR ও Editing | না |
| Output Window, OBS (Document Mode, আর Human Mode-এ ইতিমধ্যে Cache-এ থাকা Pose) | না |
| Human Generation, Background Removal, AI Text Command, **Head/Eyes/Mouth Control (নতুন Pose)** | **হ্যাঁ** |

## Lite-এর বাইরে (যোগ করা যাবে না)
Multi-Scene/Multi-Human, Digital Twin, VR/AR, AI World Generator, AI Acting, Virtual Production, AI Live Presenter, Native Virtual Camera Driver, Voice/Lip-Sync, Marketplace, Plugin System, Auto Save, Auto Backup, Auto Update, Startup Launch, PDF/DOCX, 1080p/30 FPS।

---

## ১৩. Build Plan — ধাপে ধাপে (Phase)

> প্রতিটা Phase শেষে: App চালিয়ে দেখবে → Test (typecheck, lint, test, build) → "Done when" মিলাবে → git commit → **Test PASS হলে GitHub-এ Push** → থেমে User-কে test করতে বলবে।

### Phase 0 — Project Setup
- **সবার আগে Prerequisite Check** (`CLAUDE.md`-এর তালিকা অনুযায়ী): Node.js, npm, Git, Git identity, GitHub access; OBS শুধু সতর্কতা হিসেবে। কিছু না থাকলে থেমে User-কে install-এর নির্দেশনা দেবে, নিজে install করবে না।
- electron-vite + React + TS + Tailwind + Zustand + i18next দিয়ে project setup
- ESLint/Prettier, Vitest, git init, `.gitignore` (`node_modules`, `out`, `dist`, `.env`)
- GitHub-এ Private Repository যুক্ত করা (`origin`, `main`); User-এর অনুমতি নিয়ে
- **Done when:** Prerequisite টেবিল সব OK; `npm run dev` চালালে একটা খালি Window খোলে; `npm run build` কোনো Error ছাড়া শেষ হয়; প্রথম Commit GitHub-এ Push হয়েছে।

### Phase 1 — Cloud Pose Feasibility Test (সবচেয়ে বড় ঝুঁকি, তাই আগে)
- ২–৩টা Cloud AI Service-এর তুলনা (Human Generation আর Pose Control দুটো কাজই পারে কি না), User-এর সঙ্গে আলোচনা করে বাছাই
- আলাদা একটা ছোট test script দিয়ে: একটা Portrait ছবি নিয়ে Yaw/Pitch, Eye direction ও open/close, আর Mouth state বদলে Cloud থেকে ছবি আনা
- মাপতে হবে: প্রতি Pose-এ কত সেকেন্ড লাগে, প্রতি Call-এ কত খরচ, Face Identity কতটা ঠিক থাকে, পরপর Pose-এ মুখ বা পোশাক বদলে যায় কি না
- Provider-এর ToS আর ব্যবহারের শর্ত যাচাই করা
- **Done when:** User-কে একটা ছোট Report দেওয়া হয়েছে: Latency, খরচ, মান (Sample ছবিসহ), আর Go/No-Go সুপারিশ। **User সিদ্ধান্ত না দেওয়া পর্যন্ত Phase 6-এ যাওয়া যাবে না।**
- User-এর সিদ্ধান্ত (2026-11-24): quota শেষ, বাকি ৪টা test পরে হবে। এর মধ্যে Phase 2, 3, 4, 5 করা যাবে। Phase 6–9 শুরু হবে শুধু Phase 1 শেষ হলে আর User Go দিলে।

### Phase 2 — App Shell
- Dashboard, Routing, Dark/Light Theme, English/বাংলা, Settings Page (Language, Theme, OBS Path)
- App Close Confirmation, Logo, Notification (Toast) system
- **Done when:** ৩টি Page-এ যাওয়া যায়; Theme আর Language বদলালে সঙ্গে সঙ্গে কাজ করে, আর App restart করার পরও থেকে যায়।

### Phase 3 — Storage, Backup, Restore
- `storage.ts` (Character/Document CRUD), Delete Confirmation
- Backup (zip, User Folder বেছে নেবে), Restore (Confirmation সহ)
- **Done when:** Dummy data Save, Open আর Delete হয়; Backup নিয়ে সব মুছে Restore করলে সব ফিরে আসে।

### Phase 4 — Document Editor (Image + Text)
- ৩টি Slot, Image Open, OCR Worker (eng+ben), Box Preview
- Text Edit → Inpaint → Font Dropdown দিয়ে Render
- Image Replace (Select, তারপর Drag/Resize), Undo/Redo, Save, Export JPG/PNG
- **Done when:** একটা বাংলা আর একটা English Document-এ লেখা বদলে Export করা যায়, আর original ফাইল অপরিবর্তিত থাকে।

### Phase 5 — Webcam Output (Document Mode) + OBS
- Output Window (Always on Top, aspect lock, 24 FPS)
- Document Mode: Switch, Zoom/Position
- Background: Original/Green/Custom, 16:9 ↔ 9:16
- OBS Launch/Close, "How to use" নির্দেশনা
- **Done when:** OBS-এর Window Capture-এ Output দেখা যায়, আর OBS Virtual Camera দিয়ে কোনো Video Call App-এ Document দেখা যায়।

### Phase 6 — Cloud Setup + Human Generation
- Phase 1-এ বাছাই করা Provider ব্যবহার হবে
- API Key (safeStorage), `HumanGenerator`, `BackgroundRemover`
- Upload, Consent Checkbox, Generate, Preview, Save/Regenerate
- Background: Original/Transparent/Custom
- **Done when:** একটা ছবি থেকে Photoreal Character Generate করে নাম দিয়ে Save করা যায়; Internet না থাকলে ঠিক Error দেখায়।

### Phase 7 — Character Control
- `PoseRenderer`, Pose Cache, Debounce, Loading Indicator, Crossfade
- সব Button, Local Tilt Slider, Idle Blink, Reset Head/Reset All
- Camera View: Zoom/Position (Local)
- Internet না থাকলে Control disabled আর বার্তা দেখানো
- **Done when:** সব Control কাজ করে; একই Pose দ্বিতীয়বার চাইলে Cloud Call ছাড়াই সঙ্গে সঙ্গে দেখায়; Cloud-এর উত্তরের অপেক্ষায় UI আটকে যায় না।

### Phase 8 — AI Text Command
- `CommandParser`, JSON Schema Validate + Clamp, Error Message
- **Done when:** বাংলা আর English মিলিয়ে ৫টি Multi-instruction Command সঠিকভাবে কাজ করে।

### Phase 9 — Webcam Output (Human Mode)
- Human/Document Switch, Live Character State, Green/Original/Custom Background
- **Done when:** OBS-এর মাধ্যমে Live Character দেখা যায়, Control বদলালে নতুন Pose এলেই (Cache-এ থাকলে সঙ্গে সঙ্গে) Output-এ বদলায়, আর Mode Switch তাৎক্ষণিক হয়।

### Phase 10 — Polish, Performance, Installer
- Idle অবস্থায় RAM ও CPU মাপা, Pose Cache-এর আকার যাচাই
- electron-builder NSIS Installer (Startup Launch নেই, Uninstall-এ userData থাকবে)
- **Done when:** অন্য একটা PC-তে Install, ব্যবহার আর Uninstall করা যায়, আর Uninstall-এর পরও Data থেকে যায়।

### Progress Checklist
- [x] Phase 0 — Setup
- [ ] Phase 1 — Cloud Pose Feasibility (আংশিক: 8/12 test)
- [x] Phase 2 — App Shell
- [x] Phase 3 — Storage/Backup
- [ ] Phase 4 — Document Editor (code + tests done; manual "Done when" test by user pending)
- [ ] Phase 5 — Output (Document) + OBS (code + tests done; manual OBS / Virtual Camera test by user pending)
- [ ] Phase 6 — Cloud + Human Generation
- [ ] Phase 7 — Character Control
- [ ] Phase 8 — AI Text Command
- [ ] Phase 9 — Output (Human)
- [ ] Phase 10 — Polish + Installer
