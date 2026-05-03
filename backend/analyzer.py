import asyncio
import base64
import json
import os
import re
from pathlib import Path

import anthropic
import httpx
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
PLANT_ID_KEY = os.getenv("PLANT_ID_API_KEY")
CLAUDE_MODEL = "claude-haiku-4-5-20251001"

_cache_path = Path(__file__).parent / "plant_cache.json"
_plant_cache: dict = {}


def _load_cache() -> None:
    global _plant_cache
    if _plant_cache or not _cache_path.exists():
        return
    with open(_cache_path, encoding="utf-8") as f:
        entries = json.load(f)
    _plant_cache = {e["species"].lower(): e for e in entries}


_load_cache()


async def identify_species(image_bytes: bytes) -> tuple[str, float]:
    encoded = base64.b64encode(image_bytes).decode()
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            "https://api.plant.id/v2/identify",
            json={"images": [encoded], "plant_details": ["common_names"]},
            headers={"Api-Key": PLANT_ID_KEY},
        )
    resp.raise_for_status()
    data = resp.json()
    suggestion = data["suggestions"][0]
    return suggestion["plant_name"], round(suggestion["probability"], 2)


async def detect_symptoms(image_bytes: bytes, media_type: str) -> dict | None:
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_KEY)
    encoded = base64.b64encode(image_bytes).decode()

    msg = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": encoded,
                    },
                },
                {
                    "type": "text",
                    "text": (
                        "Examine this plant image for visible health symptoms: yellowing leaves, "
                        "brown tips, brown edges, spots, drooping, wilting, root rot, or pest damage. "
                        "If the plant looks healthy, respond with exactly: null\n"
                        "If you detect symptoms, respond with valid JSON only (no extra text):\n"
                        '{"detected": true, "symptoms": ["symptom1", "symptom2"], '
                        '"severity": "mild|moderate|severe", '
                        '"summary": "1-2 sentence diagnosis explaining likely cause and remedy"}'
                    ),
                },
            ],
        }],
    )

    text = msg.content[0].text.strip()
    if text.lower() in ("null", ""):
        return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return None


def _care_from_cache(species: str) -> dict | None:
    _load_cache()
    return _plant_cache.get(species.lower())


async def _care_from_claude(species: str, home_environment: dict | None = None) -> dict:
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_KEY)

    env_parts = []
    if home_environment:
        if home_environment.get("humidity"):
            env_parts.append(f"humidity: {home_environment['humidity'].replace('_', ' ')}")
        if home_environment.get("light"):
            env_parts.append(f"light level: {home_environment['light']}")
        if home_environment.get("temperature"):
            env_parts.append(f"temperature: {home_environment['temperature']}")

    env_context = (
        f"\n\nHome environment — {', '.join(env_parts)}. "
        "Tailor water frequency, sunlight, humidity, and placement advice to suit these conditions."
        if env_parts else ""
    )

    msg = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": (
                f"Provide care information for {species} as valid JSON only (no extra text):\n"
                '{"species": "...", "common_name": "...", "water": "...", "sunlight": "...", '
                '"soil": "...", "humidity": "...", "placement": "...", '
                '"health_tips": ["tip1", "tip2", "tip3"], "difficulty": "easy|moderate|hard"}'
                f"{env_context}"
            ),
        }],
    )

    text = msg.content[0].text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Could not parse care data for {species}")


async def get_care_for_species(species: str, home_environment: dict | None = None) -> dict:
    """Return care data for a named species without an image."""
    cached = _care_from_cache(species)
    if cached:
        return {**cached, "source": "cache"}
    care = await _care_from_claude(species, home_environment)
    return {**care, "source": "claude"}


async def parse_water_interval(water_text: str) -> dict:
    """Return { intervalDays: int, label: str } for a plain-text watering description."""
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_KEY)
    msg = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=80,
        messages=[{
            "role": "user",
            "content": (
                f'A plant care guide says: "{water_text}"\n'
                "How many days between waterings? Respond with valid JSON only (no extra text):\n"
                '{"intervalDays": <integer>, "label": "<short human label e.g. Every 7 days>"}'
            ),
        }],
    )
    text = msg.content[0].text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {"intervalDays": 7, "label": "Every 7 days"}


async def diagnose_text(species: str, symptom: str, care: dict | None = None) -> dict:
    """Return a text-only Claude diagnosis for a species + symptom."""
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_KEY)

    care_lines = []
    if care:
        if care.get("water"):
            care_lines.append(f"- Water: {care['water']}")
        if care.get("humidity"):
            care_lines.append(f"- Humidity: {care['humidity']}")
        if care.get("soil"):
            care_lines.append(f"- Soil: {care['soil']}")
        if care.get("sunlight"):
            care_lines.append(f"- Sunlight: {care['sunlight']}")

    care_context = (
        f"Baseline care for this plant:\n" + "\n".join(care_lines) + "\n\n"
        if care_lines else ""
    )
    conflict_note = (
        "If your advice conflicts with the baseline (e.g. recommending misting for a "
        "low-humidity plant), briefly acknowledge why the symptom warrants it. "
        if care_lines else ""
    )

    msg = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": (
                f"{care_context}"
                f"A {species} is showing: {symptom}. "
                "Give a short, actionable plant health diagnosis. "
                f"{conflict_note}"
                "Respond with valid JSON only (no extra text):\n"
                '{"title": "short cause title (e.g. Likely overwatered)", '
                '"body": "2-3 sentences explaining the likely cause and specific remedy"}'
            ),
        }],
    )
    text = msg.content[0].text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {"title": "Issue detected", "body": text[:300]}


async def analyze_plant(
    image_bytes: bytes,
    media_type: str,
    user_symptom: str | None,
    known_species: str | None = None,
) -> dict:
    if known_species:
        species, confidence = known_species, 1.0
    else:
        species, confidence = await identify_species(image_bytes)

    vision_task = asyncio.create_task(detect_symptoms(image_bytes, media_type))

    cached = _care_from_cache(species)
    if cached:
        care = cached
        source = "cache"
    else:
        care = await _care_from_claude(species)
        source = "claude"

    auto_symptoms = await vision_task

    if user_symptom:
        final_symptom = user_symptom
        symptom_source = "user"
    elif auto_symptoms and auto_symptoms.get("detected"):
        symptoms_list = auto_symptoms.get("symptoms", [])
        final_symptom = symptoms_list[0] if symptoms_list else None
        symptom_source = "auto" if final_symptom else None
    else:
        final_symptom = None
        symptom_source = None

    return {
        "species": care.get("species", species),
        "common_name": care.get("common_name", ""),
        "confidence": confidence,
        "source": source,
        "water": care.get("water", ""),
        "sunlight": care.get("sunlight", ""),
        "soil": care.get("soil", ""),
        "humidity": care.get("humidity", ""),
        "placement": care.get("placement", ""),
        "health_tips": care.get("health_tips", []),
        "difficulty": care.get("difficulty", "moderate"),
        "symptom": final_symptom,
        "symptom_source": symptom_source,
        "auto_symptom_detail": auto_symptoms,
    }
