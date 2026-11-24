# Phase 1 — Cloud Pose Feasibility Report

তারিখ: 2026-11-24 · অবস্থা: **আংশিক (8/12 test)** · সিদ্ধান্ত: **User দেবেন** (Phase 6 শুরু হয়নি)

## ১. কী test করা হলো

- Model: **LivePortrait expression editor** (ComfyUI-AdvancedLivePortrait), free Hugging Face Space `fffiloni/expression-editor` দিয়ে। Replicate-এ একই model আছে: `fofr/expression-editor`।
- Script: `scripts/feasibility/pose-test.mjs` (CharacterState → model parameter: `poseMapping.mjs`)। Raw ফল: `docs/screenshots/phase-1/monalisa-results.json`।
- Input: একটা portrait (Mona Lisa ছবি, public domain)। **সতর্কতা:** এটা একটা painting, photoreal মানুষ নয়। Phase 6-এর generated photoreal character-এ মান আলাদা হতে পারে।

| # | Test | ফল | সময় |
|---|---|---|---|
| 00 | Neutral | ✅ | 5.85 s (প্রথম call) |
| 01 | Yaw +15 | ✅ | 2.18 s |
| 02 | Yaw −15 | ✅ | 2.13 s |
| 03 | Yaw +25 (model-এ ±20-এ clamp) | ✅ | 2.13 s |
| 04 | Pitch +10 | ✅ | 2.14 s |
| 05 | Pitch −10 | ✅ | 2.10 s |
| 06 | Eyes left | ✅ | 2.34 s |
| 07 | Eyes right | ✅ | 2.23 s |
| 08 | Eyes up | ❌ চালানো যায়নি — ZeroGPU quota শেষ | — |
| 09 | Eyes down | ⏸ বাকি | — |
| 10 | Eyes closed | ⏸ বাকি | — |
| 11–12 | Mouth smile / open | ⏸ বাকি | — |

- 2026-11-24-এ বাকি test আবার একবার চেষ্টা করা হয়েছে: প্রথম call-এই `You have exceeded your free ZeroGPU quota (60s requested vs. 0s left)`। নির্দেশ অনুযায়ী আর চেষ্টা করা হয়নি।
- আবার চালাতে (quota ফিরলে): `node --env-file-if-exists=.env scripts/feasibility/pose-test.mjs .tmp/s9.jpg monalisa 08,09,10,11,12` — আগের সফল ফল রেখে শুধু বাকিগুলো চালাবে।

## ২. Latency

- Connect: ~3 s (একবার)। প্রথম call ~5.9 s, পরের call **গড় ~2.2 s** (8টা সফল call-এর গড় 2.6 s)।
- Replicate-এর page অনুযায়ী এই model "typically complete within 1 seconds" (L40S GPU)। Network আর upload মিলিয়ে বাস্তবে ~2–4 s ধরা নিরাপদ। **Cold start** (model ঘুমিয়ে থাকলে) কয়েক সেকেন্ড থেকে মিনিট লাগতে পারে — মাপা হয়নি।
- Spec-এর Pose Cache থাকায় একই pose দ্বিতীয়বার সঙ্গে সঙ্গে দেখাবে; নতুন pose-এ ২–৪ s অপেক্ষা (Loading indicator + crossfade) গ্রহণযোগ্য মনে হয়।

## ৩. মান (Sample ছবি দেখে)

দেখা ছবি: `monalisa-00-neutral.webp`, `-03-yaw+25-clamped`, `-04-pitch+10`, `-06-eyes-left` (সব `docs/screenshots/phase-1/`-এ)।

- **Face identity:** ভালোভাবে থাকে — একই মুখ বলে চেনা যায়।
- **Skin tone, পোশাক, background, হাত:** অপরিবর্তিত। Model শুধু মুখের অংশ বদলায়, বাকি ছবি একই থাকে (spec section 9-এর শর্ত পূরণ করে)।
- **Yaw:** মাথা ঘোরা স্পষ্ট দেখা যায়। ±20°-এর বেশি model পারে না, তাই spec-এর ±25° = ±20°-এর মতো দেখাবে (Phase 7-এ clamp বা spec বদলের সিদ্ধান্ত লাগবে)।
- **Pitch:** কাজ করে, তবে চুলের কিনারায় (মুখের বাম পাশে) হালকা ঝাপসা/বিকৃতি দেখা যায়।
- **Eyes left/right:** চোখের মণি সরে, কিন্তু পরিবর্তন হালকা — ছোট output window-এ খুব চোখে পড়বে না। Mapping (`pupil_x ±12`) বাড়িয়ে দেখা যেতে পারে।
- **পরপর pose-এ মুখ বা পোশাক বদলায় কি না:** প্রতিটা call মূল ছবি থেকে হয় (chain হয় না), তাই drift দেখা যায়নি।
- **যাচাই বাকি:** চোখ বন্ধ (Blink), চোখ ওপরে/নিচে, মুখ smile/open — Blink আর mouth-এর মান এখনো অজানা।

## ৪. খরচ

| Provider | খরচ | মন্তব্য |
|---|---|---|
| HF Space (free ZeroGPU) | ফ্রি | Free account দৈনিক **5 min** GPU quota (HF docs); প্রতি call **60 s** reserve করে, তাই দিনে মাত্র কয়েকটা call। App-এর জন্য **ব্যবহারযোগ্য নয়**। PRO ($9/month): docs-এ 40 min/day (error message-এ 25 min লেখা — অমিল)। |
| **Replicate `fofr/expression-editor`** | **~$0.001–0.003 / call** (page-এ ~$0.00098, অর্থাৎ ~1 s GPU) | L40S GPU, $0.000975/s, শুধু GPU-তে চলার সময় bill হয়। Page বলে ~1 s; আমাদের মাপা 2–3 s-এর মধ্যে network/upload আছে, তবে GPU সময় বেশি হলে খরচ ২–৩ গুণ হতে পারে। Public model-এ setup/idle-এর টাকা লাগে না (pricing page অনুযায়ী)। |

আনুমানিক ব্যবহার (Replicate): একটা session-এ ৫০টা নতুন pose (+ প্রতিটার Blink ছবি) ≈ 100 call ≈ **$0.10–0.30**। দিনে ৫টা session ≈ $0.50–1.50/দিন ≈ $15–45/মাস। Cache-এ থাকা pose-এর খরচ নেই।

এর বাইরে Phase 6-এ **Human Generation, Background Removal আর AI Text Command**-এর জন্য আলাদা model/provider লাগবে — expression-editor ওগুলো পারে না। সেগুলোর খরচ এই হিসেবে নেই।

## ৫. ToS ও License

**ছোট উত্তর: LivePortrait-এর নিজের face-detection model (InsightFace) non-commercial — হ্যাঁ। কিন্তু আমরা যে expression-editor ব্যবহার করছি সেটা InsightFace ব্যবহার করে না, YOLO face detector (`face_yolov8n.pt`) ব্যবহার করে। তার license-ও commercial ব্যবহারের আগে যাচাই করতে হবে।**

| অংশ | License / শর্ত | সূত্র |
|---|---|---|
| LivePortrait code | MIT | github.com/KwaiVGI/LivePortrait `LICENSE` |
| LivePortrait-এর InsightFace detection model | "for **non-commercial research purposes only**"; commercial ব্যবহারে "remove and replace InsightFace's detection models" | একই `LICENSE` ফাইল |
| InsightFace pretrained model (buffalo_l ইত্যাদি) | non-commercial research only; buffalo_l-এর জন্য licensing-এ যোগাযোগ করতে বলে | github.com/deepinsight/insightface README |
| ComfyUI-AdvancedLivePortrait (expression editor) | detector: Ultralytics YOLO `face_yolov8n.pt` (Bingsu/adetailer থেকে) — **InsightFace নয়** | `nodes.py`; HF Space `app.py`; `fofr/cog-expression-editor` `predict.py` |
| Ultralytics (YOLO library) | AGPL-3.0 (commercial-এর জন্য আলাদা Enterprise license) — *এই report-এ fetch করে যাচাই করা হয়নি* | — |
| `face_yolov8n.pt` weights, LivePortrait weights | license **যাচাই করা যায়নি** (model page-এ উল্লেখ নেই) | — |
| `fofr/cog-expression-editor` wrapper | MIT (GitHub page) | — |
| Replicate ToS (2026-04-01) | Output-এর মালিক customer; commercial ব্যবহার অনুমোদিত "**subject to any Third Party Terms**" — অর্থাৎ model-এর license মানার দায় আমাদের | replicate.com/terms §2.5, §3.1, §5.1 |
| HF ZeroGPU | Free tier; app backend হিসেবে ব্যবহার নিয়ে docs-এ কিছু বলা নেই; quota খুব কম | huggingface.co/docs/hub/spaces-zerogpu |

ব্যাখ্যা:
- **ব্যক্তিগত / non-commercial ব্যবহারে** বড় বাধা দেখা যাচ্ছে না।
- **বিক্রি বা commercial ব্যবহারের আগে** দরকার: (ক) `face_yolov8n.pt` আর LivePortrait weights-এর license নিশ্চিত করা, (খ) Ultralytics AGPL-এর প্রভাব (সাধারণত AGPL-এর দায় service চালানো পক্ষের — এখানে Replicate/model owner — তবে আইনি পরামর্শ নিন)। এটা আইনি পরামর্শ নয়।
- Spec-এর Consent Checkbox (অন্যের ছবি ব্যবহারে অনুমতি) Phase 6-এ থাকবেই।

## ৬. Go / No-Go সুপারিশ

**সুপারিশ: শর্তসাপেক্ষে GO — Provider: Replicate (`fofr/expression-editor`) PoseRenderer হিসেবে।**

কারণ:
- Identity, skin tone, পোশাক ঠিক থাকে; head yaw/pitch আর চোখের দিক কাজ করে।
- Latency ~2–3 s, Pose Cache দিয়ে UX চলবে।
- খরচ খুব কম (~$0.001/call)।
- HF free Space শুধু test-এর জন্য; App-এ ব্যবহার করা যাবে না (quota)।

শর্ত (Phase 6 শুরুর আগে):
1. বাকি ৪টা test (eyes up/down, eyes closed, mouth smile/open) চালানো — Replicate-এ চালালে মোট খরচ < $0.05, কিন্তু **Replicate API key আর paid account লাগবে (User-এর সিদ্ধান্ত)**। অথবা HF quota reset হলে free-তে।
2. অন্তত ১–২টা **photoreal** মুখে test (painting যথেষ্ট নয়)।
3. Blink আর mouth-এর মান খারাপ হলে No-Go বা parameter বদল।
4. App commercial হলে license যাচাই (section ৫)।
5. Human Generation / Background Removal / Text Command-এর provider আলাদাভাবে ঠিক করা।
6. Spec-এর yaw ±25° বনাম model ±20° — কোনটা রাখা হবে।

**No-Go হবে যদি:** Blink/mouth অগ্রহণযোগ্য হয়, অথবা commercial ব্যবহারের দরকার থাকে আর license পরিষ্কার না হয়।
