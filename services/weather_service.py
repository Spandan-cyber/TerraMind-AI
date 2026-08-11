"""
=============================================================
TerraMind Weather Service
-------------------------------------------------------------
Open-Meteo integration (no API key required).
https://open-meteo.com/en/docs
=============================================================
"""

import time

import requests

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Cache Open-Meteo responses per (rounded) location for a few minutes.
# The dashboard fires one request per farm, plus an auto-refresh every
# 5 minutes — without this, a handful of farms + a couple of refreshes
# is enough to hit Open-Meteo's free-tier rate limit (429).
_CACHE = {}
_CACHE_TTL_SECONDS = 900  # 15 minutes


def _cache_key(lat, lon):
    # Round to ~100m precision so nearby farms share a cache entry.
    return f"{round(lat, 3)},{round(lon, 3)}"

# WMO Weather interpretation codes, as used by Open-Meteo.
# https://open-meteo.com/en/docs#weathervariables
WEATHER_CODE_DESCRIPTIONS = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail"
}


def describe_weather_code(code):
    """Map an Open-Meteo/WMO weather code to a short human label."""
    return WEATHER_CODE_DESCRIPTIONS.get(code, "Unknown")


def get_weather(lat, lon):
    """
    Fetch current conditions + 7-day forecast for a farm location.

    Returns a dict always shaped the same way, with
    "available": False on any failure so callers never crash.

    Results are cached per location for _CACHE_TTL_SECONDS. On a
    failed fetch (including 429 rate limits), falls back to the last
    known-good cached result for that location if one exists.
    """

    key = _cache_key(lat, lon)
    now = time.time()
    cached = _CACHE.get(key)

    if cached and (now - cached["timestamp"]) < _CACHE_TTL_SECONDS:
        return cached["data"]

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": (
            "temperature_2m,relative_humidity_2m,"
            "wind_speed_10m,precipitation,weather_code"
        ),
        "hourly": "uv_index",
        "daily": (
            "temperature_2m_max,temperature_2m_min,"
            "precipitation_sum,precipitation_probability_max,"
            "windspeed_10m_max,et0_fao_evapotranspiration"
        ),
        "timezone": "auto",
        "forecast_days": 7
    }

    try:

        response = requests.get(
            OPEN_METEO_URL,
            params=params,
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

    except Exception as e:

        # Fall back to stale cached data rather than failing outright —
        # useful when we hit a rate limit but had a recent result.
        if cached:
            return cached["data"]

        return {
            "available": False,
            "error": str(e)
        }

    current = data.get("current", {})
    daily = data.get("daily", {})
    hourly = data.get("hourly", {})

    # Match the current observation's timestamp against the hourly
    # array to pull out "right now"'s UV index.
    hourly_times = hourly.get("time", [])
    uv_values = hourly.get("uv_index", [])
    current_time = current.get("time")

    uv_index = None

    if current_time and hourly_times:
        # Compare only up to the hour
        current_hour = current_time[:13]

        for i, t in enumerate(hourly_times):
            if t.startswith(current_hour):
                if i < len(uv_values):
                    uv_index = uv_values[i]
                break

    dates = daily.get("time", [])

    def day_value(key, i):
        values = daily.get(key, [])
        return values[i] if i < len(values) else None

    forecast = [
        {
            "date": date,
            "temp_max_c": day_value("temperature_2m_max", i),
            "temp_min_c": day_value("temperature_2m_min", i),
            "rain_mm": day_value("precipitation_sum", i),
            "rain_probability_pct": day_value(
                "precipitation_probability_max", i
            ),
            "wind_kmh": day_value("windspeed_10m_max", i),
            "et0_mm": day_value("et0_fao_evapotranspiration", i)
        }
        for i, date in enumerate(dates)
    ]

    result = {
        "available": True,

        "current": {
            "temperature_c": current.get("temperature_2m"),
            "humidity_pct": current.get("relative_humidity_2m"),
            "wind_kmh": current.get("wind_speed_10m"),
            "precipitation_mm": current.get("precipitation"),
            "weather_code": current.get("weather_code"),
            "condition": describe_weather_code(current.get("weather_code")),
            "uv_index": uv_index
        },

        "forecast_7day": forecast
    }

    _CACHE[key] = {"data": result, "timestamp": now}

    return result
