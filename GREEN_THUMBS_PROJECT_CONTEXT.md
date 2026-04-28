# Green Thumbs — Project Context

## What This Is

Green Thumbs is a mobile app where users take a photo of a plant and get a care report: species identification, watering needs, sunlight preferences, soil type, health observations, and placement advice. The name keeps the focus on the user being a good plant parent — AI works quietly in the background.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Mobile frontend | React Native + Expo |
| Backend | FastAPI (Python) |
| Plant identification | Plant.id API (free tier: 100 calls/day) |
| Symptom detection | Claude Haiku Vision (auto-detects visible symptoms from image) |
| Care advice | Claude Haiku text (cheaper than vision, runs in parallel) |
| Cache | Local JSON file (100 common houseplants) |
| Hosting (backend) | Railway |

---

## Architecture

Three-step pipeline. Claude Haiku Vision is a new step added so the app can automatically detect visible symptoms (yellow leaves, brown tips, spots, etc.) even when the user doesn't select a symptom chip. Steps 2 and 3 run in parallel to keep response time fast.

```
User (phone)
    ↓ photo + optional symptom chip selection
FastAPI backend (POST /analyze)
    ↓
Step 1 — Plant.id API → species name + confidence
    ↓
Step 2 (parallel) ──────────────────── Step 3 (parallel)
Claude Haiku Vision                    Cache lookup (plant_cache.json)
→ auto_symptoms dict or null               ├── Cache HIT → cached care report
                                           └── Cache MISS → Claude Haiku text
    ↓ (both steps complete)
Merge results:
  - user symptom chip wins if selected
  - auto_symptoms used as fallback if user picked "None"
    ↓
Return full report JSON to app
```

---

## Project File Structure

```
green-thumb/
├── .gitignore
├── backend/
│   ├── .env.example
│   ├── .env                 # your actual keys (gitignored)
│   ├── analyzer.py          # full pipeline: Plant.id + vision + care report
│   ├── main.py              # FastAPI app, POST /analyze endpoint
│   ├── plant_cache.json     # 100 houseplants with care data
│   └── requirements.txt
└── frontend/
    ├── App.js
    ├── app.json
    ├── package.json
    └── src/
        ├── navigation/
        │   └── RootNavigator.js    # bottom tabs + modal stack
        ├── screens/
        │   ├── HomeScreen.js       # daily glance / landing
        │   ├── CameraScreen.js     # camera + symptom chips
        │   ├── AnalyzingScreen.js  # animated 3-step loading
        │   ├── ReportScreen.js     # full care report + diagnosis card
        │   ├── MyPlantsScreen.js   # plant collection + wishlist
        │   ├── GardenScreen.js     # care calendar / reminders
        │   └── ProfileScreen.js    # account + settings
        ├── components/
        └── utils/
            ├── api.js              # API_BASE_URL config
            ├── history.js          # AsyncStorage for scan history
            └── theme.js            # colors, fonts, spacing (use as-is from design)
```

---

## Backend Details

### `main.py`
- FastAPI app titled "Green Thumbs API"
- CORS enabled (allow all origins for dev)
- `GET /` — health check, returns `{"status": "Green Thumbs API is running 🌿"}`
- `POST /analyze` — accepts multipart image upload + optional `symptom` form field
  - Validates file type (JPEG, PNG, WebP, HEIC) and size (max 5MB)
  - Calls `analyze_plant()` from `analyzer.py`
  - Returns full report JSON

### `analyzer.py`
Three functions + one main entry point:

**`identify_species(image_bytes)`**
- POSTs image to Plant.id as base64
- Returns `(species_name, confidence)` tuple

**`detect_symptoms(image_bytes, media_type)`**
- Sends image to Claude Haiku Vision
- Prompt asks it to look for yellowing, brown tips, spots, drooping, etc.
- Returns `None` if plant looks healthy, or:
```json
{
  "detected": true,
  "symptoms": ["yellowing leaves", "brown edges"],
  "severity": "mild",
  "summary": "The leaves show early chlorosis, likely from overwatering..."
}
```

**`_care_from_cache(species)` / `_care_from_claude(species)`**
- Checks plant_cache.json first (normalized lowercase key match)
- Falls back to Claude Haiku text if not cached
- Returns care dict matching cache schema

**`analyze_plant(image_bytes, media_type, user_symptom)`**
- Runs all three steps, steps 2+3 in parallel via asyncio
- Symptom priority: user-selected chip wins; auto-detection is fallback
- Returns merged report dict

### `plant_cache.json`
100 common houseplants. Each entry:
```json
{
  "species": "Monstera deliciosa",
  "common_name": "Swiss Cheese Plant",
  "water": "Every 1-2 weeks, allow soil to dry between waterings",
  "sunlight": "Bright indirect light; avoid direct sun",
  "soil": "Well-draining potting mix with perlite",
  "humidity": "High humidity preferred; mist regularly",
  "placement": "Near a bright window, away from drafts",
  "health_tips": ["Yellow leaves = overwatering", "Aerial roots are normal"],
  "difficulty": "easy"
}
```

### `requirements.txt`
```
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.12
anthropic==0.36.0
httpx==0.27.2
pydantic==2.9.2
python-dotenv==1.0.1
```

### `.env.example`
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PLANT_ID_API_KEY=your_plant_id_api_key_here
```

---

## Report JSON Shape

This is what `POST /analyze` returns to the app:

```json
{
  "species": "Monstera deliciosa",
  "common_name": "Swiss Cheese Plant",
  "confidence": 0.94,
  "source": "cache",
  "water": "Every 1-2 weeks, allow soil to dry between waterings",
  "sunlight": "Bright indirect light; avoid direct sun",
  "soil": "Well-draining potting mix with perlite",
  "humidity": "High humidity preferred",
  "placement": "Near a bright window, away from drafts",
  "health_tips": ["Yellow leaves = overwatering", "Aerial roots are normal"],
  "difficulty": "easy",
  "symptom": "yellowing leaves",
  "symptom_source": "auto",
  "auto_symptom_detail": {
    "detected": true,
    "symptoms": ["yellowing leaves"],
    "severity": "mild",
    "summary": "The lower leaves show early chlorosis, likely from overwatering or low light."
  }
}
```

**Symptom fields explained:**
- `symptom` — the symptom string to show on the Report screen (null if plant is healthy)
- `symptom_source` — `"user"` (they tapped a chip) | `"auto"` (Claude Vision detected it) | `null`
- `auto_symptom_detail` — full vision result, used to populate the diagnosis card body

**Report screen logic:**
- If `symptom` is null → no diagnosis card shown
- If `symptom_source === "auto"` → show "We noticed something" label on the amber card
- If `symptom_source === "user"` → show "DIAGNOSIS" label as normal

---

## Frontend Details

### Navigation structure
- Bottom tab bar: Home | Plants | **Scan (modal CTA)** | Garden | Profile
- Camera and Analyzing screens are modals (no tab bar visible)

### Screens

**HomeScreen.js** — daily glance dashboard

**CameraScreen.js**
- Live camera viewfinder with rule-of-thirds grid + focus brackets
- Flash toggle, flip camera, gallery picker
- Symptom chips: `['None', 'Yellow edges', 'Brown tips', 'Drooping', 'Spots']`
- Sends image + selected symptom to backend as multipart form data
- Navigates to AnalyzingScreen on shoot

**AnalyzingScreen.js**
- Animated 3-step pipeline display
- Steps: "Identifying species" → "Checking care database" → "Generating diagnosis"
- Progress bar, auto-navigates to Report when done

**ReportScreen.js**
- Species name + confidence pill + difficulty pill
- 2×2 care grid: Water / Light / Soil / Humidity
- Amber diagnosis card — shown when `symptom` is not null
  - Label says "We noticed something" if `symptom_source === "auto"`
  - Label says "DIAGNOSIS" if `symptom_source === "user"`
  - Body text comes from `auto_symptom_detail.summary` or is generated by Claude
- Health tips list

**MyPlantsScreen.js**
- Plants tab + Wishlist tab (segmented control)
- Filter: All / Healthy / Flagged
- Swipe-to-delete
- Add plant / add to wishlist bottom sheet
- Tapping a plant navigates to its Report

**GardenScreen.js** — care calendar / reminders

**ProfileScreen.js** — account + settings

### Utils

**api.js**
```js
export const API_BASE_URL = "http://YOUR_LOCAL_IP:8000"; // dev
// Replace with Railway URL for production
```

**history.js** — AsyncStorage key `"green_thumbs_history"`, stores report objects with timestamp

**theme.js** — copy as-is from the design file. All color/font/spacing tokens live here.

---

## How to Run Locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
cp .env.example .env         # fill in your API keys
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Visit `http://localhost:8000` — should return the running status JSON.

### Frontend
```bash
cd frontend
npm install
# Edit src/utils/api.js → set API_BASE_URL to your machine's local IP
# Find your IP: ipconfig (Windows) or ifconfig (Mac) → look for IPv4 under Wi-Fi
npx expo start
# Scan QR code in Expo Go on your phone
```

---

## API Keys Needed

| Key | Where to get | Notes |
|-----|-------------|-------|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Used for both vision + text steps |
| `PLANT_ID_API_KEY` | plant.id | Free tier: 100 calls/day — plenty for dev |

---

## Deployment (Railway)

- Backend deploys directly from GitHub repo
- Set `ANTHROPIC_API_KEY` and `PLANT_ID_API_KEY` as env vars in Railway dashboard
- Railway auto-detects `requirements.txt` and runs uvicorn
- Update `API_BASE_URL` in `frontend/src/utils/api.js` to the Railway public URL

---

## Roadmap / Phases

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Backend: Plant.id + cache layer | ✅ Done |
| 2 | Backend: Claude vision symptom detection + FastAPI routing | ✅ Done |
| 3 | Frontend: Navigation + all 7 screens | 🔨 In progress |
| 4 | Scan history with AsyncStorage | ⬜ Todo |
| 5 | Railway deploy + portfolio README | ⬜ Todo |

---

## Portfolio Notes

- **GitHub**: github.com/TimoNichols — repo `green-thumb`
- Key selling points: multimodal AI (vision + text), smart parallel pipeline, polished mobile UI
- For the README: include a demo GIF, architecture diagram, and "lessons learned" section
- Pairs well with SmogBot to show range of AI-powered projects
