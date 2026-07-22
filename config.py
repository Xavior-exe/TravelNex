"""TravelNex configuration loaded from environment variables.

Keep secrets out of version control. Set these values in your local shell,
your `.env` file, or your deployment provider's environment settings.
"""

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    # The app still works when python-dotenv is not installed, as long as the
    # environment variables are provided by the shell or hosting platform.
    pass


# Database settings
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "travelnex")


# API keys
GEOAPIFY_KEY = os.getenv("GEOAPIFY_KEY", "")
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_KEY", "")
UNSPLASH_KEY = os.getenv("UNSPLASH_KEY", "")
PEXELS_KEY = os.getenv("PEXELS_KEY", "")
