<<<<<<< HEAD
"""
TravelNex configuration loaded from environment variables.

Keep secrets out of version control.
Store sensitive values in a .env file locally or
as Environment Variables in Railway/Vercel.
=======
"""TravelNex configuration loaded from environment variables.

Keep secrets out of version control. Set these values in your local shell,
your `.env` file, or your deployment provider's environment settings.
>>>>>>> 43e8055e7695590d6ebad290c516893cce2008f0
"""

import os

try:
    from dotenv import load_dotenv
<<<<<<< HEAD
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

=======

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
>>>>>>> 43e8055e7695590d6ebad290c516893cce2008f0
GEOAPIFY_KEY = os.getenv("GEOAPIFY_KEY", "")
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_KEY", "")
UNSPLASH_KEY = os.getenv("UNSPLASH_KEY", "")
<<<<<<< HEAD
PEXELS_KEY = os.getenv("PEXELS_KEY", "")
=======
PEXELS_KEY = os.getenv("PEXELS_KEY", "")
>>>>>>> 43e8055e7695590d6ebad290c516893cce2008f0
