import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from analyzer import analyze_plant

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
    result = await analyze_plant(image_bytes, file.content_type, user_symptom)
    return result
