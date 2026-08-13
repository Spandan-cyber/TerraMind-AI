from datetime import timedelta
import os
from dotenv import load_dotenv

# Deterministic multi-location .env loading
_config_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_config_dir)

for _env_path in [
    os.path.join(_config_dir, ".env"),
    os.path.join(_parent_dir, ".env"),
    os.path.join(os.getcwd(), ".env"),
    os.path.join(os.getcwd(), "terramindpush-main", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=False)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
