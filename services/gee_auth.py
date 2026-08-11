import os
import json
# pyrefly: ignore [missing-import]
import ee
from dotenv import load_dotenv

load_dotenv()

_INITIALIZED = False


def _find_service_account_key():
    """
    Search known locations for Google Earth Engine service account key.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    candidates = [
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        os.path.join(base_dir, "credentials", "service_account.json"),
        os.path.join(base_dir, "credentials", "terramind-render.json"),
        r"C:\Users\spand\Downloads\terramind-504413-5da9a7bea72d.json",
        r"E:\keys\terramind-render.json"
    ]
    
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("type") == "service_account" and data.get("client_email"):
                        return candidate, data.get("client_email"), data.get("project_id")
            except Exception:
                continue
                
    return None, None, None


def initialize():
    global _INITIALIZED

    if _INITIALIZED:
        return

    project = os.getenv("EE_PROJECT", "terramind-504413")
    key_path, key_email, key_project = _find_service_account_key()
    
    service_account_email = os.getenv(
        "EE_SERVICE_ACCOUNT",
        os.getenv("GEE_SERVICE_ACCOUNT_EMAIL", key_email or "terramind-render@terramind-504413.iam.gserviceaccount.com")
    )
    
    if key_project and not os.getenv("EE_PROJECT"):
        project = key_project

    try:
        if key_path and os.path.exists(key_path):
            credentials = ee.ServiceAccountCredentials(
                service_account_email,
                key_path
            )
            ee.Initialize(credentials, project=project)
            print(f"[GEE] Earth Engine initialized successfully with Service Account: {service_account_email}")
        else:
            ee.Initialize(project=project)
            print("[GEE] Earth Engine initialized using default/local credentials")

        _INITIALIZED = True

    except Exception as e:
        print(f"[GEE ERROR] Earth Engine initialization failed: {e}")
        raise Exception(f"Earth Engine initialization failed: {e}")