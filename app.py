import os
from datetime import timedelta
from dotenv import load_dotenv
from flask import Flask, redirect, render_template, session, jsonify
from flask_cors import CORS

from routes.analysis import analysis_bp
from routes.auth import auth
from routes.farms import farms
from routes.weather import weather_bp
from routes.chatbot import chatbot_bp
from routes.feedback import feedback_bp

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "terramind-dev-fallback-key-replace-in-production")

# Configure CORS for cross-origin requests (e.g., React frontend hosted on a separate URL)
CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": "*"}},
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
)

# Session configuration
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.getenv("FLASK_ENV") == "production"
app.config["SESSION_REFRESH_EACH_REQUEST"] = True

# Register route blueprints
app.register_blueprint(auth)
app.register_blueprint(analysis_bp)
app.register_blueprint(farms)
app.register_blueprint(weather_bp)
app.register_blueprint(chatbot_bp)
app.register_blueprint(feedback_bp)

# Auto-initialize Google Earth Engine
try:
    from services.gee_auth import initialize as init_earth_engine
    init_earth_engine()
except Exception as _gee_err:
    print("[WARN] Earth Engine startup warning:", _gee_err)


@app.route("/api/health")
@app.route("/ping")
def health():
    """Lightweight endpoint for Render keep-alive / health-checks"""
    return jsonify({
        "status": "healthy",
        "service": "TerraMind API"
    }), 200


@app.route("/")
def home():
    return render_template("landing.html")


@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect("/login")
    return render_template("dashboard.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)