"""
TravelNex configuration loaded from environment variables.

Keep secrets out of version control.
Store sensitive values in a .env file locally or
as Environment Variables in Railway/Vercel.
"""

import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


# ==========================
# Database Configuration
# ==========================

# Database settings

DB_HOST = os.getenv("MYSQLHOST", os.getenv("DB_HOST", "localhost"))
DB_PORT = int(os.getenv("MYSQLPORT", os.getenv("DB_PORT", "3306")))
DB_USER = os.getenv("MYSQLUSER", os.getenv("DB_USER", "root"))
DB_PASSWORD = os.getenv("MYSQLPASSWORD", os.getenv("DB_PASSWORD", ""))
DB_NAME = os.getenv("MYSQLDATABASE", os.getenv("DB_NAME", "travelnex"))


# ==========================
# API Keys
# ==========================

GEOAPIFY_KEY = os.getenv("GEOAPIFY_KEY", "")
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_KEY", "")
UNSPLASH_KEY = os.getenv("UNSPLASH_KEY", "")
PEXELS_KEY = os.getenv("PEXELS_KEY", "")