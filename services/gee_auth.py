import os
import json
import tempfile
import ee
from dotenv import load_dotenv

# Ensure .env is deterministically loaded regardless of current working directory
_service_dir = os.path.dirname(os.path.abspath(__file__))
_base_dir = os.path.dirname(_service_dir)
_parent_dir = os.path.dirname(_base_dir)

for _env_candidate in [
    os.path.join(_base_dir, ".env"),
    os.path.join(_parent_dir, ".env"),
    os.path.join(os.getcwd(), ".env"),
    os.path.join(os.getcwd(), "terramindpush-main", ".env"),
]:
    if os.path.exists(_env_candidate):
        load_dotenv(_env_candidate, override=False)

_INITIALIZED = False
_INIT_ERROR = None


def _find_service_account_key():
    """
    Search known locations and environment variables for Google Earth Engine service account key.
    Supports filepaths, relative paths, and raw JSON strings in environment variables.
    """
    # 1. Check for raw JSON string in environment variables
    for env_var in ["GEE_SERVICE_ACCOUNT_JSON", "EE_SERVICE_ACCOUNT_KEY", "GOOGLE_APPLICATION_CREDENTIALS", "SERVICE_ACCOUNT_KEY"]:
        raw_val = os.getenv(env_var)
        if raw_val and raw_val.strip().startswith("{") and "service_account" in raw_val:
            try:
                data = json.loads(raw_val)
                if data.get("type") == "service_account" and data.get("client_email"):
                    # Cache to a temporary credentials file
                    temp_dir = os.path.join(_base_dir, "credentials")
                    os.makedirs(temp_dir, exist_ok=True)
                    cached_path = os.path.join(temp_dir, "service_account_cached.json")
                    with open(cached_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2)
                    return cached_path, data.get("client_email"), data.get("project_id")
            except Exception as e:
                print(f"[GEE] Could not parse inline JSON from {env_var}: {e}")

    # 2. Check candidate filepaths
    candidates = []

    # If GOOGLE_APPLICATION_CREDENTIALS points to a file path (absolute or relative)
    cred_env = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_env and not cred_env.strip().startswith("{"):
        candidates.extend([
            cred_env,
            os.path.join(_base_dir, cred_env),
            os.path.join(_parent_dir, cred_env),
            os.path.join(os.getcwd(), cred_env),
        ])

    # Standard candidate file paths
    candidates.extend([
        os.path.join(_base_dir, "credentials", "service_account.json"),
        os.path.join(_base_dir, "credentials", "terramind-render.json"),
        os.path.join(_parent_dir, "credentials", "service_account.json"),
        os.path.join(_parent_dir, "terramindpush-main", "credentials", "service_account.json"),
        os.path.join(os.getcwd(), "credentials", "service_account.json"),
        os.path.join(os.getcwd(), "terramindpush-main", "credentials", "service_account.json"),
        r"C:\Users\spand\Downloads\terramind-504413-5da9a7bea72d.json",
        r"C:\Users\spand\Downloads\service_account.json",
        r"E:\keys\terramind-render.json"
    ])

    # Also scan any *.json files in credentials folder
    for folder in [os.path.join(_base_dir, "credentials"), os.path.join(_parent_dir, "credentials")]:
        if os.path.isdir(folder):
            for file_name in os.listdir(folder):
                if file_name.endswith(".json"):
                    candidates.append(os.path.join(folder, file_name))

    for candidate in candidates:
        if candidate and os.path.isfile(candidate):
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("type") == "service_account" and data.get("client_email"):
                        return os.path.abspath(candidate), data.get("client_email"), data.get("project_id")
            except Exception:
                continue

    return None, None, None


def is_initialized() -> bool:
    """Returns True if Earth Engine has been successfully initialized."""
    global _INITIALIZED
    return _INITIALIZED


def get_initialization_error():
    """Returns last initialization error message if any."""
    global _INIT_ERROR
    return _INIT_ERROR


def initialize():
    """
    Initializes Google Earth Engine using Service Account credentials or local credentials.
    """
    global _INITIALIZED, _INIT_ERROR

    if _INITIALIZED:
        return True

    project = os.getenv("EE_PROJECT", "terramind-504413")
    key_path, key_email, key_project = _find_service_account_key()

    if key_project and not os.getenv("EE_PROJECT"):
        project = key_project

    service_account_email = os.getenv(
        "EE_SERVICE_ACCOUNT",
        os.getenv("GEE_SERVICE_ACCOUNT_EMAIL", key_email or "terramind-render@terramind-504413.iam.gserviceaccount.com")
    )

    try:
        if key_path and os.path.exists(key_path):
            credentials = ee.ServiceAccountCredentials(
                service_account_email,
                key_path
            )
            ee.Initialize(credentials, project=project)
            print(f"[GEE] Earth Engine initialized successfully with Service Account: {service_account_email} (Project: {project})")
        else:
            ee.Initialize(project=project)
            print(f"[GEE] Earth Engine initialized using default/local credentials (Project: {project})")

        _INITIALIZED = True
        _INIT_ERROR = None
        return True

    except Exception as e:
        _INITIALIZED = False
        _INIT_ERROR = str(e)
        print(f"[GEE ERROR] Earth Engine initialization failed: {e}")
        raise Exception(f"Earth Engine initialization failed: {e}")