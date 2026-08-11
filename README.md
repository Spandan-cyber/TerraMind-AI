# 🛰️ TerraMind AI — Precision Agriculture Intelligence Platform

<div align="center">

![TerraMind Logo](static/images/logo-terramind.png)

**Next-Generation Satellite Remote Sensing & Generative AI Agronomy for Smart Agriculture**

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-10b981.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/framework-Flask-000000.svg?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Google Earth Engine](https://img.shields.io/badge/Earth%20Engine-Sentinel--2-4285F4.svg?style=for-the-badge&logo=google-cloud&logoColor=white)](https://earthengine.google.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%20Pro-8E75B2.svg?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/database-Supabase-3ECF8E.svg?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

[Key Features](#-key-features) • [Tech Stack](#-tech-stack) • [Quickstart](#-quickstart-guide) • [Architecture](#-architecture--data-flow) • [Environment Variables](#-environment-variables) • [License](#-license)

</div>

---

## 🌾 Overview

**TerraMind AI** is a state-of-the-art agricultural intelligence and remote sensing platform designed to empower farmers, agronomists, and researchers with orbital telemetry, automated multispectral health indices, and generative AI agronomy advisories.

By synthesizing **Sentinel-2 Copernicus satellite imagery** via **Google Earth Engine** with **Google Gemini AI**, TerraMind provides automated, high-resolution crop health diagnostics, irrigation recommendations, disease risk mitigation, and hyper-local weather forecasting in an immersive **Frost UI Glassmorphism** interface.

---

## ✨ Key Features

### 🛰️ Orbital Telemetry & Multispectral Indices
- **Sentinel-2 Multispectral Processing**: Automated retrieval and cloud-filtered composite rendering from ESA Copernicus constellation.
- **Multispectral Spectral Indices**:
  - **NDVI (Normalized Difference Vegetation Index)**: Crop vigor, chlorophyll density, and canopy biomass.
  - **NDWI (Normalized Difference Water Index)**: Canopy water stress and plant moisture content.
  - **EVI (Enhanced Vegetation Index)**: High-biomass sensitivity with atmospheric and soil background decoupling.
  - **SAVI (Soil-Adjusted Vegetation Index)**: Early-growth stage monitoring with soil calibration factors.
  - **NDMI (Normalized Difference Moisture Index)**: Moisture stress indicators across field acreage.
- **Natural RGB vs. False-Color NDVI Comparison**: Side-by-side satellite image visual comparison.

### 🤖 Generative AI Agronomist (Google Gemini)
- **Automated Field Diagnostics**: Gemini analyzes multispectral index distributions, weather patterns, and soil conditions to generate customized agronomy advisories.
- **Tri-Pillar Recommendations**:
  - 💧 **Precision Irrigation Scheduling**: Deficit/surplus water guidance tailored to canopy stress.
  - 🌿 **Crop Nutrition & Fertilizer Formulation**: Targeted N-P-K nutrient balancing based on biomass metrics.
  - 🛡️ **Disease & Pest Outbreak Risk**: Proactive mitigation advice based on humidity and vegetation stress thresholds.

### 🗺️ Interactive Geospatial Farm Mapping
- **Leaflet.js + Leaflet Draw**: Interactive satellite polygon boundary delineation.
- **Automated Geodesic Calculations**: Instant centroid latitude/longitude and precise acre calculation.
- **Reverse Geocoding**: Live reverse geocoding via OpenStreetMap Nominatim for automatic city/region detection.

### 📊 Magic Bento Grid & Analytics Dashboard
- **12-Column Responsive Bento Layout**: Health distribution cards, metadata gauges, Chart.js trends, and active alert timeline.
- **Live Confidence Scoring**: Automated score synthesis with real-time DOM-synced visual indicators.
- **High-Definition PDF Export Engine**: One-click client-side report export via `html2pdf.js` with high-DPI canvas capture.

### ⛅ Hyper-Local Weather Intelligence
- **Open-Meteo Integration**: 7-day predictive meteorological forecasting (temperature, UV index, precipitation probability, humidity, wind velocity).
- **Dynamic Weather Visuals Engine**: Animated weather hero with keyframe-animated icons and SVG morphing.
- **Lottie Micro-Interactions**: High-performance JSON animations via `lottie-web`.

### 🎨 Frost UI Design System
- **Deep Black Glassmorphism**: High-contrast slate typography (`#cbd5e1`), vivid emerald accents (`#10b981`), ambient floating refractions.
- **Trigonometric Click Spark Engine**: 8-particle radial physics explosion on user clicks.
- **Staggered Full-Screen Menu**: Smooth GSAP-powered navigation overlay.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Python 3.10+, Flask, Gunicorn / Waitress |
| **Cloud Remote Sensing** | Google Earth Engine API (`earthengine-api`) |
| **Generative AI** | Google Gemini Generative AI SDK (`google-generativeai`) |
| **Database & Auth** | Supabase (PostgreSQL), Supabase Python Client |
| **Mapping & GIS** | Leaflet.js, Leaflet Draw, OpenStreetMap Nominatim |
| **Frontend & UI** | Vanilla JS, Bootstrap 5.3, GSAP, Chart.js, HTML5/CSS3 |
| **Animation Engines** | Lottie-Web (`lottie.js`), CSS Keyframe Engines |
| **PDF Generation** | `html2pdf.js` (Canvas + jsPDF) |
| **Weather Telemetry** | Open-Meteo REST API |

---

## 📁 Project Structure

```text
terramindpush-main/
├── app.py                      # Flask Application Factory & Server Entrypoint
├── config.py                   # Centralized Configuration & Environment Loader
├── requirements.txt            # Production Python Dependencies
├── Procfile                    # Deployment Process Manager (Gunicorn)
├── .env.example                # Environment Variable Template
├── .gitignore                  # Git Ignore Rules
│
├── credentials/                # Google Service Account Credentials (Ignored in Git)
│   └── service_account.json
│
├── routes/                     # Modular Flask Route Blueprints
│   ├── analysis_routes.py      # Satellite Analysis & Vegetation API
│   ├── auth_routes.py          # Supabase User Authentication & Sessions
│   ├── farm_routes.py          # Geospatial Farm Creation & Management
│   ├── main_routes.py          # Dashboard, Navigation & Page Views
│   └── weather_routes.py       # Weather Intelligence & Telemetry API
│
├── services/                   # Business Logic & Third-Party Service Wrappers
│   ├── ai_service.py           # Google Gemini AI Agronomist Service
│   ├── ee_service.py           # Google Earth Engine Sentinel-2 Pipeline
│   ├── supabase_service.py     # Database CRUD Operations
│   └── weather_service.py      # Open-Meteo Integration Pipeline
│
├── static/                     # Static Client Assets
│   ├── css/                    # Custom Stylesheets (Frost UI, Specular Buttons)
│   ├── js/                     # Client Scripts (analysis.js, dashboard.js, ClickSpark.js)
│   ├── json/                   # Lottie Animation JSON Schemas
│   ├── images/                 # Brand Assets (logo-terramind.png)
│   └── videos/                 # Atmospheric Background Media
│
└── templates/                  # Jinja2 HTML Templates
    ├── index.html              # Marketing Landing Page
    ├── login.html              # Authentication (Login)
    ├── register.html           # Authentication (Register)
    ├── dashboard.html          # Main User Dashboard & Weather Hero
    ├── farms.html              # Farm Portfolio Management
    ├── add_farm.html           # Farm Boundary Polygon Mapping Tool
    ├── analysis.html           # Satellite Analysis Workspace (Magic Bento Grid)
    ├── history.html            # Historical Spectral Scan Timeline
    ├── weather.html            # 7-Day Weather Intelligence Forecast
    ├── advisory.html           # AI Agronomist Advisory Center
    └── profile.html            # User Settings & Profile Hub
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python 3.10+** installed on your system.
- **Google Cloud Platform (GCP)** account with Earth Engine API enabled.
- **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).
- **Supabase Project** with URL and API keys.

### 2. Clone the Repository
```bash
git clone https://github.com/Spandan-cyber/TerraMind-AI.git
cd TerraMind-AI
```

### 3. Setup Virtual Environment
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Create a `.env` file in the root directory by copying the template:
```bash
cp .env.example .env
```

Edit `.env` with your actual API credentials:
```env
# Flask
SECRET_KEY=your_secure_random_flask_secret_key
FLASK_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Google Earth Engine
EE_PROJECT=your-gcp-project-id
GEE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_APPLICATION_CREDENTIALS=credentials/service_account.json
```

### 6. Run the Application
```bash
python app.py
```
Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 🔐 Environment Variables

| Variable | Description | Required |
|---|---|:---:|
| `SECRET_KEY` | Secret key for signing Flask user session cookies | Yes |
| `SUPABASE_URL` | Endpoint URL for your Supabase project instance | Yes |
| `SUPABASE_KEY` | Anonymous public API key for Supabase client requests | Yes |
| `SUPABASE_SERVICE_KEY` | Service role key for administrative Supabase actions | Yes |
| `GEMINI_API_KEY` | Google Gemini API key for automated crop advisory generation | Yes |
| `EE_PROJECT` | Google Cloud Project ID with Earth Engine API enabled | Yes |
| `GEE_SERVICE_ACCOUNT_EMAIL` | Service Account email address authorized for Earth Engine | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS`| Path to the Google Service Account JSON key file | Yes |
| `FLASK_ENV` | Environment mode (`development` or `production`) | Optional |

---

## 🛰️ Sentinel-2 Index Formulas

| Index | Name | Formula | Agricultural Meaning |
|---|---|---|---|
| **NDVI** | Normalized Difference Vegetation Index | $\frac{B8 - B4}{B8 + B4}$ | Primary plant health, chlorophyll content, and canopy density |
| **NDWI** | Normalized Difference Water Index | $\frac{B8 - B11}{B8 + B11}$ | Canopy water stress and plant tissue hydration level |
| **EVI** | Enhanced Vegetation Index | $2.5 \times \frac{B8 - B4}{B8 + 6 \times B4 - 7.5 \times B2 + 1}$ | Improved sensitivity in high biomass regions with canopy background isolation |
| **SAVI** | Soil-Adjusted Vegetation Index | $\frac{(B8 - B4) \times (1 + L)}{B8 + B4 + L} \quad (L=0.5)$ | Calibrated vegetation index for low canopy / high soil visibility |
| **NDMI** | Normalized Difference Moisture Index | $\frac{B8 - B11}{B8 + B11}$ | Moisture levels to detect field drought stress |

---

## 🚢 Deployment (Render / Cloud Platforms)

TerraMind includes a production-ready `Procfile` for one-click deployment on **Render**, **Heroku**, or **Railway**:

```text
web: gunicorn app:app
```

When deploying on Render:
1. Connect your GitHub repository.
2. Select **Python 3** Environment.
3. Build Command: `pip install -r requirements.txt`.
4. Start Command: `gunicorn app:app`.
5. Add your `.env` variables under **Environment Variables**.
6. Upload your `service_account.json` under **Secret Files** and set `GOOGLE_APPLICATION_CREDENTIALS` to `/etc/secrets/service_account.json`.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by Spandan Das and the TerraMind Team. Powered by Google Earth Engine & Google Gemini.</sub>
</div>
