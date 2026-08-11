"""
==========================================================
TerraMind Weather Routes
==========================================================
"""

from flask import Blueprint, jsonify, request, session
from services.farm_service import FarmService
from services.weather_service import get_weather

weather_bp = Blueprint(
    "weather",
    __name__,
    url_prefix="/api"
)


@weather_bp.route("/weather", methods=["GET"])
def weather():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    farm_id = request.args.get("farm_id")
    farms = []

    try:
        if farm_id:
            farm = FarmService.get_farm(user_id, farm_id)
            if farm:
                farms = [farm]
        else:
            farms = FarmService.get_farms(user_id) or []
    except Exception as e:
        print("Error fetching farm for weather:", e)
        farms = []

    if not farms:
        farm = {}
        lat = 22.5726
        lon = 88.3639
        location_name = "Howrah"
    else:
        farm = farms[0]
        lat = farm.get("latitude")
        lon = farm.get("longitude")
        location_name = farm.get("farm_name") or farm.get("name") or "My Farm"

        if lat is None or lon is None:
            lat = 22.5726
            lon = 88.3639
            location_name = farm.get("farm_name") or "Howrah"

    weather_data = get_weather(float(lat), float(lon))

    if not weather_data.get("available"):
        return jsonify(weather_data)

    # Reconcile weather_service.py's field names to what the frontend expects
    curr = weather_data.get("current", {})
    formatted_response = {
        "available": True,
        "location": location_name,
        "farm_id": farm.get("id"),
        "current": {
            "temperature": curr.get("temperature_c"),
            "condition": curr.get("condition", "Unknown"),
            "weather_code": curr.get("weather_code"),
            "humidity": curr.get("humidity_pct"),
            "wind_speed": curr.get("wind_kmh"),
            "rain_probability": curr.get("precipitation_mm", 0),
            "uv_index": curr.get("uv_index")
        },
        "forecast_7day": weather_data.get("forecast_7day", [])
    }

    return jsonify(formatted_response)