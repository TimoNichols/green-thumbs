import json
import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from analyzer import analyze_plant, get_care_for_species, diagnose_text, parse_water_interval, parse_care_schedule

load_dotenv()

app = FastAPI(title="Green Thumbs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@app.get("/")
def health_check():
    return {"status": "Green Thumbs API is running 🌿"}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    symptom: str = Form(default="None"),
    known_species: str = Form(default=""),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use JPEG, PNG, WebP, or HEIC.",
        )

    image_bytes = await file.read()

    if len(image_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 5 MB.",
        )

    user_symptom = None if symptom in ("None", "", "none") else symptom
    known = known_species.strip() or None
    result = await analyze_plant(image_bytes, file.content_type, user_symptom, known)
    return result


@app.post("/care")
async def care(
    species: str = Form(...),
    home_environment: str | None = Form(None),
):
    if not species.strip():
        raise HTTPException(status_code=400, detail="species is required")
    env = None
    if home_environment:
        try:
            env = json.loads(home_environment)
        except (json.JSONDecodeError, ValueError):
            env = None
    return await get_care_for_species(species.strip(), env)


@app.post("/parse-interval")
async def parse_interval(water_text: str = Form(...)):
    if not water_text.strip():
        raise HTTPException(status_code=400, detail="water_text is required")
    return await parse_water_interval(water_text.strip())


@app.post("/parse-schedule")
async def parse_schedule(
    plant_name: str = Form(...),
    care_data: str | None = Form(None),
):
    if not plant_name.strip():
        raise HTTPException(status_code=400, detail="plant_name is required")
    care = {}
    if care_data:
        try:
            care = json.loads(care_data)
        except (json.JSONDecodeError, ValueError):
            care = {}
    return await parse_care_schedule(plant_name.strip(), care)


@app.post("/diagnose")
async def diagnose(
    species: str = Form(...),
    symptom: str = Form(...),
    care_data: str | None = Form(None),
):
    if not species.strip() or not symptom.strip():
        raise HTTPException(status_code=400, detail="species and symptom are required")
    care = None
    if care_data:
        try:
            care = json.loads(care_data)
        except (json.JSONDecodeError, ValueError):
            care = None
    return await diagnose_text(species.strip(), symptom.strip(), care)
