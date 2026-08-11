from supabase import create_client

from config import SUPABASE_URL
from config import SUPABASE_KEY
from config import SUPABASE_SERVICE_KEY

# Regular client — respects RLS, safe for user-scoped reads/writes.
supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)

# Service-role client — BYPASSES RLS. Only use for trusted, server-only
# operations (e.g. creating a profile row right after signup). Never
# expose this key or client to the frontend.
supabase_admin = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
)