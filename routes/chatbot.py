"""
==========================================================
TerraMind Chatbot Route (Gemini API)
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

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"
)

SYSTEM_CONTEXT = """
You are the TerraMind Assistant, a helpful in-app guide for TerraMind —
a precision agriculture platform for farmers. TerraMind lets farmers:
- Add farms by drawing boundaries on a map
- Run satellite analysis (NDVI, NDWI, EVI, SAVI, NDMI, crop health,
  RGB/NDVI imagery) via Sentinel-2 and Google Earth Engine
- View live weather and 7-day forecasts per farm
- Get AI-generated advisory recommendations after each analysis
- Track analysis history over time

Answer questions about how to use TerraMind (e.g. "how do I add a farm",
"what does NDVI mean", "where do I see my forecast") clearly and briefly.
You can also answer general farming or agriculture questions.
If asked something completely unrelated to farming or the app, answer
briefly and steer the conversation back to how TerraMind can help.
Keep answers short — a few sentences, not an essay — since this is a
small chat widget, not a full page.
"""


@chatbot_bp.route("/chatbot", methods=["POST"])
def chatbot():

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"reply": "Please log in to use the assistant."}), 401

    if not GEMINI_API_KEY:
        return jsonify({
            "reply": "The assistant isn't configured yet. Ask your admin to set GEMINI_API_KEY."
        }), 200

    data = request.get_json() or {}
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"reply": "Ask me anything about TerraMind!"}), 200

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{SYSTEM_CONTEXT}\n\nUser question: {message}"}]
            }
        ]
    }

    try:
        response = requests.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            json=payload,
            timeout=15
        )

        response.raise_for_status()

        result = response.json()

        reply = (
            result
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )

        if not reply:
            reply = "Sorry, I couldn't come up with an answer for that. Try rephrasing?"

        return jsonify({"reply": reply})

    except Exception as e:

        return jsonify({
            "reply": "The assistant is temporarily unavailable. Please try again shortly."
        }), 200