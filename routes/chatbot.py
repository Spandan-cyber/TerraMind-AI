"""
==========================================================
TerraMind Chatbot Route (Gemini API & AI Agronomist)
==========================================================
"""

import requests
from flask import Blueprint, jsonify, request, session

from config import GEMINI_API_KEY

chatbot_bp = Blueprint(
    "chatbot",
    __name__,
    url_prefix="/api"
)

GEMINI_MODELS = [
    "gemini-flash-latest",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-pro"
]

SYSTEM_CONTEXT = """
You are the TerraMind AI Agronomist, an expert precision agriculture advisor and in-app guide for TerraMind. TerraMind empowers farmers with:
- Farm mapping & boundary polygon drawing
- Sentinel-2 satellite orbital analysis (NDVI vegetation vigor, NDWI water stress, EVI, SAVI, NDMI canopy moisture)
- Live weather & 7-day predictive meteorological forecasting
- Prescriptive tri-pillar agronomy advisories (irrigation balancing, nutrient fertilization, pest & disease outbreak prevention)
- Historical spectral trend analytics

Answer questions about crop management, soil moisture, satellite index interpretations, irrigation, and app features with practical, grower-friendly agronomic guidance. Keep answers concise, clear, and action-oriented (2-4 sentences).
"""

FALLBACK_KNOWLEDGE = {
    "ndvi": "NDVI (Normalized Difference Vegetation Index) measures live green plant density. Values from 0.6 to 0.9 indicate dense, healthy vegetation; 0.2 to 0.4 indicate sparse vegetation or water/nitrogen stress.",
    "ndwi": "NDWI (Normalized Difference Water Index) detects plant canopy water content. Positive values indicate adequate hydration, while negative values point toward irrigation deficit.",
    "ndmi": "NDMI (Normalized Difference Moisture Index) tracks moisture levels in crop leaves, helping predict drought stress before visible wilting occurs.",
    "evi": "EVI (Enhanced Vegetation Index) optimizes vegetation signal in high biomass regions and corrects for atmospheric and soil background interference.",
    "savi": "SAVI (Soil-Adjusted Vegetation Index) adds a soil correction factor, making it ideal for early-stage crops where bare ground is exposed.",
    "weather": "TerraMind integrates live Open-Meteo telemetry (precipitation, temperature, humidity, wind velocity, and reference evapotranspiration ET0) to optimize irrigation windows.",
    "farm": "You can add a farm anytime from the 'Add Farm' tab by drawing your field boundary on the interactive satellite map.",
    "irrigation": "Irrigate during cooler morning or evening hours to minimize evapotranspiration losses. Check your 7-day forecast on TerraMind to avoid watering before expected rainfall."
}


@chatbot_bp.route("/chatbot", methods=["POST"])
def chatbot():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"reply": "Please log in to chat with the AI Agronomist."}), 401

    data = request.get_json() or {}
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"reply": "Ask me anything about your crops, satellite indices, or farming advice!"}), 200

    # Rule-based agronomy matching helper for fallback
    lower_msg = message.lower()
    fallback_reply = None
    for kw, ans in FALLBACK_KNOWLEDGE.items():
        if kw in lower_msg:
            fallback_reply = ans
            break
    if not fallback_reply:
        fallback_reply = "I recommend checking your latest farm scan for NDVI and NDWI indicators, and monitoring the 7-day forecast before scheduling irrigation or chemical application."

    if not GEMINI_API_KEY:
        return jsonify({"reply": fallback_reply}), 200

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{SYSTEM_CONTEXT}\n\nUser question: {message}"}]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 300
        }
    }

    # Try Gemini models in sequence
    for model_name in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        try:
            response = requests.post(
                url,
                params={"key": GEMINI_API_KEY},
                json=payload,
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                reply = (
                    result
                    .get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
                )
                if reply:
                    return jsonify({"reply": reply})
        except Exception as e:
            print(f"[WARN] Gemini model {model_name} error: {e}")
            continue

    # Return intelligent fallback if all API attempts are unreachable
    return jsonify({"reply": fallback_reply}), 200