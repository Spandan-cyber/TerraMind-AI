import os
import time
import math
import json
from werkzeug.utils import secure_filename
from flask import Blueprint
from flask import request
from flask import jsonify
from flask import render_template
from flask import session
from flask import redirect
from flask import url_for

from services.farm_service import FarmService
from services.supabase_service import supabase
from services.supabase_service import supabase_admin

auth = Blueprint("auth", __name__)


@auth.route("/login", methods=["GET", "POST"])
@auth.route("/api/login", methods=["POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")

    data = request.get_json(silent=True) or request.form.to_dict()
    if not data:
        return jsonify({"success": False, "message": "No credentials provided"}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400

    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        if response.user:
            session.permanent = True
            session["user_id"] = response.user.id
            session["email"] = response.user.email
            session["logged_in"] = True

            try:
                prof = FarmService.get_profile(response.user.id)
                if prof:
                    session["full_name"] = prof.get("full_name") or response.user.email.split("@")[0]
                    session["profile_photo"] = prof.get("profile_image")
            except Exception:
                pass

            if not request.is_json and request.form:
                return redirect(url_for("dashboard"))

            return jsonify({
                "success": True,
                "access_token": response.session.access_token if response.session else None
            })

        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    except Exception as e:
        err_msg = str(e)
        if "Invalid login credentials" in err_msg:
            err_msg = "Invalid email or password. Please check your credentials."
        return jsonify({
            "success": False,
            "message": err_msg
        }), 400


@auth.route("/register", methods=["GET", "POST"])
@auth.route("/api/register", methods=["POST"])
def register():
    if request.method == "GET":
        return render_template("register.html")

    data = request.get_json(silent=True) or request.form.to_dict()
    if not data:
        return jsonify({"success": False, "message": "No registration details provided"}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    full_name = (data.get("full_name") or data.get("name") or "").strip()
    phone = data.get("phone", "").strip()

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })

        user = response.user
        if not user:
            return jsonify({
                "success": False,
                "message": "Registration failed. Please try again."
            }), 400

        user_display_name = full_name or email.split("@")[0]

        # Create or update TerraMind profile
        try:
            supabase_admin.table("profiles").upsert({
                "id": user.id,
                "full_name": user_display_name,
                "phone": phone
            }).execute()
        except Exception as pe:
            print("Profile upsert notice:", pe)

        # CRITICAL FIX: Save the typed name into the session so the dashboard picks it up
        session.permanent = True
        session["user_id"] = user.id
        session["email"] = user.email
        session["full_name"] = user_display_name
        session["logged_in"] = True

        if not request.is_json and request.form:
            return redirect(url_for("dashboard"))

        return jsonify({
            "success": True,
            "message": "Registration successful.",
            "logged_in": True
        })

    except Exception as e:
        err_msg = str(e)
        if "User already registered" in err_msg:
            err_msg = "An account with this email already exists. Please log in."
        return jsonify({
            "success": False,
            "message": err_msg
        }), 400


# ===============================
# GOOGLE LOGIN
# ===============================

@auth.route("/auth/google")
@auth.route("/login/google")
def google_login():

    try:
        redirect_url = request.host_url.rstrip("/") + "/auth/google/callback"

        response = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": redirect_url
            }
        })

        return redirect(response.url)

    except Exception as e:
        print("Google login error:", e)
        return redirect("/login?error=google_login_failed")

@auth.route("/auth/google/callback")
def google_callback():

    code = request.args.get("code")

    if not code:
        print("Google callback: no authorization code")
        return redirect("/login?error=google_auth_failed")

    try:
        # Exchange Google's authorization code for a Supabase session
        response = supabase.auth.exchange_code_for_session({"auth_code": code})

        user = response.user

        if not user:
            print("Google callback: no user returned")
            return redirect("/login?error=google_auth_failed")

        user_id = user.id
        email = user.email

        # Google-provided information
        metadata = user.user_metadata or {}

        full_name = (
            metadata.get("full_name")
            or metadata.get("name")
            or ""
        )

        profile_image = (
            metadata.get("avatar_url")
            or metadata.get("picture")
        )

        # Check whether TerraMind profile already exists
        profile_response = (
            supabase_admin
            .table("profiles")
            .select("*")
            .eq("id", user_id)
            .execute()
        )

        profile = None

        if profile_response.data:
            profile = profile_response.data[0]

        # Create TerraMind profile for first-time Google users
        if not profile:
            supabase_admin.table("profiles").insert({
                "id": user_id,
                "full_name": full_name,
                "phone": None,
                "profile_image": profile_image
            }).execute()
            print("[OK] Created TerraMind profile for Google user")
        else:
            if not full_name and profile.get("full_name"):
                full_name = profile.get("full_name")
            if not profile_image and profile.get("profile_image"):
                profile_image = profile.get("profile_image")

        # Set Flask permanent session with full user details for Frosted UI
        session.permanent = True
        session["user_id"] = user_id
        session["email"] = email
        session["full_name"] = full_name or email.split("@")[0]
        session["profile_photo"] = profile_image
        session["logged_in"] = True

        print("[OK] Google login successful:", email)

        return redirect(url_for("dashboard"))

    except Exception as e:

        print("Google callback error:", e)

        return redirect("/login?error=google_auth_failed")




@auth.route("/api/me", methods=["GET"])
def me():

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({
            "message": "Unauthorized"
        }), 401

    profile = FarmService.get_profile(user_id)

    summary = FarmService.dashboard_summary(user_id)

    return jsonify({

        "id": user_id,

        "email": session.get("email"),

        "full_name": profile.get("full_name") if profile else "",

        "phone": profile.get("phone") if profile else "",

        "farm_count": summary["farm_count"],

        "total_area": summary["total_area"],

        "healthy_farms": summary["healthy_farms"],

        "latest_farm": summary["latest_farm"],

        "profile_image": profile.get("profile_image") if profile else None

    })


@auth.route("/api/profile", methods=["PUT"])
def update_profile():

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({

            "success": False,

            "message": "Unauthorized"

        }), 401

    data = request.form.to_dict()
    image = request.files.get("profile_image")  
    

    try:

        profile = FarmService.update_profile(user_id, data, image)

        return jsonify({

            "success": True,

            "profile": profile

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


@auth.route("/logout", methods=["GET", "POST"])
@auth.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    if request.method == "GET" or not request.is_json:
        return redirect("/login")
    return jsonify({
        "success": True
    })

@auth.route("/farms")
def farms_page():
    if "user_id" not in session:
        return redirect("/login")
    try:
        farms = FarmService.get_farms(session["user_id"])
    except Exception as e:
        farms = []
    return render_template("farms.html", farms=farms)

@auth.route("/add-farm", methods=["GET", "POST"])
def add_farm_page():
    if "user_id" not in session:
        return redirect("/login")
    
    if request.method == "POST":
        data = request.form.to_dict()
        boundaries_str = data.get("farm_boundaries")
        boundary = None
        lat = None
        lon = None
        area_ha = None
        if boundaries_str:
            try:
                boundary = json.loads(boundaries_str)
                coords = boundary.get("coordinates", [])
                ring = coords[0] if coords else []

                if len(ring) >= 4:
                    lons = [float(pt[0]) for pt in ring]
                    lats = [float(pt[1]) for pt in ring]
                    lon = sum(lons) / len(lons)
                    lat = sum(lats) / len(lats)

                    # Calculate geodesic polygon area on the server so the
                    # stored value cannot disagree with the submitted boundary.
                    radius_m = 6378137.0
                    area_sum = 0.0
                    for i in range(len(ring)):
                        lon1, lat1 = lons[i], lats[i]
                        lon2, lat2 = lons[(i + 1) % len(ring)], lats[(i + 1) % len(ring)]
                        area_sum += (
                            math.radians(lon2 - lon1)
                            * (2.0 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2)))
                        )

                    area_m2 = abs(area_sum * radius_m * radius_m / 2.0)
                    area_ha = area_m2 / 10000.0
                else:
                    return jsonify({
                        "success": False,
                        "message": "Invalid farm boundary: polygon needs at least 3 points."
                    }), 400

            except (ValueError, TypeError, KeyError, IndexError, json.JSONDecodeError) as e:
                print("Error parsing boundary geojson:", e)
                return jsonify({
                    "success": False,
                    "message": "Invalid farm boundary."
                }), 400

        payload = {
            "farm_name": data.get("farm_name"),
            "crop": data.get("crop_type") or data.get("crop"),
            "village": data.get("village"),
            "district": data.get("district"),
            "state": data.get("state"),
            "notes": data.get("notes"),
            "area": round(area_ha, 6) if area_ha is not None else None,
            "latitude": lat or 22.5726,
            "longitude": lon or 88.3639,
            "boundary": boundary
        }

        try:
            FarmService.create_farm(session["user_id"], payload)
        except Exception as e:
            print("Error creating farm:", e)
        return redirect("/farms")

    return render_template("add_farm.html")

@auth.route("/weather")
def weather_page():
    if "user_id" not in session:
        return redirect("/login")
    try:
        from services.weather_service import get_weather
        farms = FarmService.get_farms(session["user_id"])
        weather_cards = []
        for farm in farms:
            lat = farm.get("latitude")
            lon = farm.get("longitude")
            if lat is not None and lon is not None:
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                    w = get_weather(lat_f, lon_f)
                    if w and w.get("available"):
                        curr = w.get("current", {})
                        forecast = w.get("forecast_7day", [])
                        card = {
                            "farm_name": farm.get("farm_name") or farm.get("name") or "My Farm",
                            "location": farm.get("location") or farm.get("village") or farm.get("district") or "My Farm",
                            "current": {
                                "temperature": curr.get("temperature_c") if curr.get("temperature_c") is not None else curr.get("temperature"),
                                "condition": curr.get("condition", "Clear Sky"),
                                "humidity": curr.get("humidity_pct") if curr.get("humidity_pct") is not None else curr.get("humidity"),
                                "wind_speed": curr.get("wind_kmh") if curr.get("wind_kmh") is not None else curr.get("wind_speed"),
                                "rain_probability": curr.get("precipitation_mm", 0) or curr.get("rain_probability", 0),
                                "weather_code": curr.get("weather_code")
                            },
                            "daily": [
                                {
                                    "date": f.get("date"),
                                    "temp_min": f.get("temp_min_c") if f.get("temp_min_c") is not None else f.get("temp_min"),
                                    "temp_max": f.get("temp_max_c") if f.get("temp_max_c") is not None else f.get("temp_max"),
                                    "rain_probability": f.get("rain_probability_pct") or f.get("rain_mm") or 0,
                                    "weather_code": f.get("weather_code")
                                }
                                for f in forecast
                            ]
                        }
                        weather_cards.append(card)
                except Exception as ex:
                    print("Error parsing weather for farm:", ex)
    except Exception as e:
        print("Error in weather_page:", e)
        weather_cards = []
    return render_template("weather.html", weather_cards=weather_cards)

@auth.route("/history")
def history_page():
    if "user_id" not in session:
        return redirect("/login")
    try:
        from services.analysis_service import AnalysisService
        history_records = AnalysisService.get_all_history(session["user_id"])
    except Exception as e:
        history_records = []
    return render_template("history.html", history_records=history_records)

@auth.route("/advisory")
def advisory_page():
    if "user_id" not in session:
        return redirect("/login")
    try:
        from services.analysis_service import AnalysisService
        advisories = AnalysisService.get_latest_advisory(session["user_id"])
    except Exception as e:
        advisories = []
    return render_template("advisory.html", advisories=advisories)

@auth.route("/profile", methods=["GET", "POST"])
def profile_page():
    if "user_id" not in session:
        return redirect("/login")
    
    if request.method == "POST":
        full_name = request.form.get("full_name")
        if full_name:
            session["full_name"] = full_name.strip()
        
        image = request.files.get("profile_photo") or request.files.get("profile_image")
        if image and image.filename != "":
            filename = secure_filename(image.filename)
            uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            unique_filename = f"{session.get('user_id', 'user')}_{int(time.time())}_{filename}"
            filepath = os.path.join(uploads_dir, unique_filename)
            image.save(filepath)
            session["profile_photo"] = f"/static/uploads/{unique_filename}"
        
        try:
            data = {}
            if full_name:
                data["full_name"] = full_name.strip()
            FarmService.update_profile(session["user_id"], data, image)
        except Exception as e:
            print("Error updating profile in database:", e)
            
        return redirect("/profile")

    return render_template("profile.html")

@auth.route("/settings")
def settings_page():
    if "user_id" not in session:
        return redirect("/login")
    return render_template("settings.html")


@auth.route("/analyze/<farm_id>")
@auth.route("/analysis/<farm_id>")
def analysis_page(farm_id):
    if "user_id" not in session:
        return redirect("/login")
    farm = None
    try:
        farm = FarmService.get_farm(session["user_id"], farm_id)
    except Exception as e:
        print("Error fetching farm for analysis:", e)
    return render_template("analysis.html", farm_id=farm_id, farm=farm)

@auth.route("/farms/edit/<farm_id>")
def edit_farm_page(farm_id):
    if "user_id" not in session:
        return redirect("/login")
    return render_template("edit_farm.html", farm_id=farm_id)
