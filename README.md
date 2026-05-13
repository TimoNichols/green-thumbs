# Green Thumbs

A mobile app that identifies houseplants from a photo and returns a personalised care guide, health diagnosis, and watering schedule.

![Green Thumbs Demo](./assets/demo.gif)

---

## Features

- **Plant identification** — photograph any plant and get species name, common name, and confidence score via Plant.id
- **Care reports** — water frequency, sunlight, soil, humidity, placement, and health tips tailored to your home environment
- **AI diagnosis** — describe a symptom (yellow edges, brown tips, drooping, spots) and get a Claude-powered text diagnosis that acknowledges conflicts with the plant's baseline care
- **Garden scheduler** — four task types (water, wipe leaves, fertilise, rotate) with AI-suggested intervals; week and month calendar views with overdue tracking
- **Scan history** — full plant library stored in Supabase, filterable by health status, with swipe-to-delete and photo upload
- **Offline-friendly cache** — a pre-populated `plant_cache.json` covers common species so care lookups skip the Claude API entirely

---

## Architecture

```
┌─────────────────────┐
│  Phone (RN + Expo)  │
│  image + symptom    │
└────────┬────────────┘
         │ POST /analyze
         ▼
┌─────────────────────────────────────────────────┐
│  FastAPI  (Railway)                             │
│                                                 │
│  1. Plant.id API ──► species + confidence       │
│                                                 │
│  2. plant_cache.json                            │
│       hit  ──► care data (instant, free)        │
│       miss ──► Claude Haiku (text prompt only)  │
│                ──► care JSON                    │
│                                                 │
│  3. (only if user flagged a symptom)            │
│       Claude Haiku (vision) ──► symptom detail  │
│                                                 │
│  4. Assemble response ──► JSON                  │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Supabase           │
│  plants table       │
│  care_activity      │
│  plant-photos       │
└─────────────────────┘
```

**Why Claude never sees images on a normal scan.** Plant.id handles all image classification — it is purpose-built for it and cheaper per call. Claude Haiku only receives a base64-encoded image when the user has already selected a symptom chip before shooting. For the majority of scans where symptom is "None", Claude only ever processes text prompts (species name → care JSON, watering text → interval days). This avoids false-positive diagnosis cards appearing on healthy plants and keeps vision API costs close to zero for routine use.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.81 + Expo SDK 54 |
| Backend | FastAPI + Python 3.12 |
| Plant ID | Plant.id API v2 |
| AI / Care | Claude Haiku (`claude-haiku-4-5-20251001`) |
| Climate data | Open-Meteo geocoding + archive API |
| Auth + DB | Supabase (email/password, `plants`, `care_activity`, `home_environment`) |
| Photo storage | Supabase Storage (`plant-photos` bucket) |
| Backend hosting | Railway |
| App distribution | EAS Build (iOS + Android) |

---

## Running Locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
PLANT_ID_API_KEY=...
```

Start the server:

```bash
py -3.12 -m uvicorn main:app --reload --host 0.0.0.0
```

The API will be at `http://localhost:8000`. Update `frontend/src/utils/api.js` → `API_BASE_URL` to your machine's local IP for device testing (`ipconfig` → IPv4 under Wi-Fi).

### Frontend

```bash
cd frontend
npm install
npx expo start --tunnel
```

Scan the QR code in Expo Go, or press `i` / `a` for simulators. A Supabase project is required — update `src/lib/supabase.js` with your own URL and anon key if forking.

---

## Project Structure

```
green-thumbs/
├── backend/
│   ├── main.py              # FastAPI routes (/analyze, /care, /diagnose, /parse-interval, /parse-schedule)
│   ├── analyzer.py          # Plant.id identification, Claude care + diagnosis logic, JSON cache
│   ├── plant_cache.json     # Pre-populated species care data (avoids Claude calls for common plants)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app.json             # Expo config (bundle IDs, EAS project ID)
    ├── eas.json             # EAS build profiles (development, preview, production)
    ├── package.json
    └── src/
        ├── screens/
        │   ├── HomeScreen.js        # Dashboard: stats, recent scans, up-next task
        │   ├── CameraScreen.js      # Live viewfinder, symptom chips, gallery picker
        │   ├── AnalyzingScreen.js   # Animated loading; runs analysis + photo upload in parallel
        │   ├── ReportScreen.js      # Plant detail: care tiles, diagnosis card, symptom picker
        │   ├── MyPlantsScreen.js    # Plant + wishlist lists with filters
        │   ├── GardenScreen.js      # Calendar, task cards, schedule sheet
        │   ├── ProfileScreen.js     # Stats, achievements, home environment, settings
        │   ├── LoginScreen.js
        │   └── RegisterScreen.js
        ├── components/
        │   ├── Ico.js               # All SVG icon components
        │   ├── HomeEnvironmentCard.js  # Humidity / light / temp pickers + Open-Meteo auto-detect
        │   └── NoConnectionScreen.js
        ├── navigation/
        │   └── RootNavigator.js     # Auth gate → tab navigator → modal stack
        ├── context/
        │   └── AuthContext.js       # Supabase session, signIn, signUp, signOut, retryConnection
        ├── lib/
        │   └── supabase.js
        └── utils/
            ├── api.js               # Fetch wrappers for all backend endpoints
            ├── history.js           # Supabase CRUD for plants table + photo upload
            ├── wishlist.js          # Wishlist subset of plants table (status = 'wishlist')
            ├── activity.js          # care_activity log (powers streak + this-week stats)
            ├── homeEnvironment.js   # home_environment upsert / fetch
            └── theme.js             # Colors, fonts, radii, shadows, gradients
```

---

## Lessons Learned

**Claude always adds text even when told not to.** Every Claude call instructs "respond with valid JSON only (no extra text)" but the model occasionally wraps the output in a markdown code block or prefaces it with a sentence. Every response runs a `re.search(r"\{.*\}", text, re.DOTALL)` fallback to extract the JSON object, with a hardcoded default if that also fails. Without this, the app would crash on a small but consistent percentage of requests.

**Symptom vision is a liability without a gate.** An early version ran `detect_symptoms()` on every scan. Healthy plants with dramatic lighting (deep shadows, backlit leaves) were frequently flagged as diseased, and users would land on a diagnosis card for a perfectly healthy plant. Gating vision strictly to scans where the user already selected a symptom chip eliminated false positives entirely.

**Gesture conflicts need explicit coordination.** The swipeable delete row uses `Gesture.Pan()` with `simultaneousWithExternalGesture(flatListRef)` and `failOffsetY([-10, 10])`. Without `failOffsetY`, the pan gesture would capture vertical scroll events and make the list feel sticky. Without `simultaneousWithExternalGesture`, swiping would conflict with the FlatList's native scroll handler and either gesture would cancel the other.

**SVG pattern IDs must be unique per instance.** React Native SVG shares a single namespace for `<Pattern id>` values. Using a static ID like `id="stripe"` means the second rendered `PlantPlaceholder` overwrites the first's pattern definition and all instances render the same (often wrong) pattern. The fix is a module-level counter (`_ppCount++`) assigned once per component via `useRef`.

**Parallel API calls matter on the analyze screen.** Uploading the photo to Supabase Storage and calling the analysis backend are independent operations. Running them sequentially added ~1–2 seconds to every scan. `Promise.all([analyzeImage(...), uploadPlantPhoto(...)])` brings the two operations down to whichever takes longer rather than the sum of both.

**Open-Meteo archive has a ~5-day lag.** The climate archive endpoint requires `end_date` to be at least 5 days in the past. Passing today's date returns an empty dataset with no error. The fix is `end.setDate(end.getDate() - 5)` before constructing the request — not obvious from the API docs.

**One `plants` table serves both library and wishlist.** Using a `status` column (`'owned'` vs `'wishlist'`) instead of a separate table simplified CRUD, kept foreign key relationships clean, and made the "GOT IT" flow (move wishlist → owned) a single `update` call. The tradeoff is that every query must filter by status explicitly.

---

## Roadmap

- [x] Plant identification via camera and gallery
- [x] AI-powered care reports with home environment personalisation
- [x] Text-based symptom diagnosis (species + symptom → Claude)
- [x] Garden scheduler with week/month calendar
- [x] Wishlist with "Got it" promotion to owned
- [x] Supabase auth, cloud sync, photo storage
- [x] EAS build config for iOS and Android
- [ ] Push notifications for watering reminders
- [ ] Share my garden (public profile / plant cards)
- [ ] Widget for today's garden tasks
- [ ] Scan streak and social achievements
- [ ] Offline mode with local SQLite fallback

---

## Author

Tim Nichols — [github.com/TimoNichols](https://github.com/TimoNichols)
