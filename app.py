from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from database import get_db
from recommendation import score_and_rank_packages
from trip_planner import get_itinerary
from scraper import build_live_search_links
import os
import json
import re
import requests as req_lib
from config import GEMINI_KEY, UNSPLASH_KEY, PEXELS_KEY, GEOAPIFY_KEY

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-only-secret-change-me")

CORS(app, supports_credentials=True)

FRONTEND_FOLDER = os.path.dirname(os.path.abspath(__file__))

DESTINATION_GUIDE_SEEDS = {
    "goa": {
        "description": "Goa blends golden beaches, lively beach shacks, sunset cruises, and a relaxed coastal vibe that makes quick escapes feel special.",
        "best_time": "November to February",
        "avg_budget": "Rs. 18000-35000 / person",
        "trip_type": "Beach Escape",
        "ideal_days": "4-5 days",
        "highlights": ["Beach sunsets", "Portuguese streets", "Night markets", "Water sports"],
        "photo_queries": ["Goa beach sunset", "Goa palm beach", "Fontainhas Goa", "Goa luxury resort", "Goa coastline aerial"]
    },
    "manali": {
        "description": "Manali is perfect for mountain lovers with snowy peaks, pine valleys, winding roads, and cozy cafes that make every frame feel cinematic.",
        "best_time": "October to February for snow, March to June for pleasant weather",
        "avg_budget": "Rs. 16000-32000 / person",
        "trip_type": "Hill Station",
        "ideal_days": "4-6 days",
        "highlights": ["Snow peaks", "Valley views", "Riverside cafes", "Scenic drives"],
        "photo_queries": ["Manali snow mountains", "Solang Valley Manali", "Manali pine forest", "Manali river view", "Old Manali cafe"]
    },
    "kerala": {
        "description": "Kerala offers dreamy backwaters, tea-covered hills, tranquil beaches, and lush green landscapes that feel slow, romantic, and deeply refreshing.",
        "best_time": "September to March",
        "avg_budget": "Rs. 22000-42000 / person",
        "trip_type": "Nature Retreat",
        "ideal_days": "5-7 days",
        "highlights": ["Backwaters", "Tea gardens", "Houseboats", "Ayurveda stays"],
        "photo_queries": ["Kerala backwaters houseboat", "Munnar tea plantations", "Kerala beach sunset", "Alleppey boat ride", "Kerala resort nature"]
    },
    "rajasthan": {
        "description": "Rajasthan surrounds travelers with royal forts, desert sunsets, ornate palaces, and colorful bazaars that make the journey feel grand and unforgettable.",
        "best_time": "October to March",
        "avg_budget": "Rs. 20000-40000 / person",
        "trip_type": "Heritage Tour",
        "ideal_days": "5-7 days",
        "highlights": ["Palaces", "Fort views", "Desert camps", "Colorful bazaars"],
        "photo_queries": ["Rajasthan palace sunset", "Jaipur hawa mahal", "Udaipur lake palace", "Jaisalmer desert camp", "Rajasthan fort aerial"]
    },
    "ladakh": {
        "description": "Ladakh delivers dramatic mountain passes, crystal lakes, monasteries, and raw high-altitude landscapes that feel adventurous and larger than life.",
        "best_time": "May to September",
        "avg_budget": "Rs. 28000-55000 / person",
        "trip_type": "Adventure Expedition",
        "ideal_days": "6-8 days",
        "highlights": ["High-altitude lakes", "Monasteries", "Road trips", "Mountain passes"],
        "photo_queries": ["Ladakh Pangong Lake", "Ladakh mountain road trip", "Ladakh monastery", "Nubra Valley dunes", "Ladakh scenic pass"]
    },
    "andaman": {
        "description": "Andaman is all about turquoise water, white-sand beaches, snorkeling spots, and tropical calm that instantly triggers vacation mode.",
        "best_time": "November to April",
        "avg_budget": "Rs. 26000-50000 / person",
        "trip_type": "Island Getaway",
        "ideal_days": "5-7 days",
        "highlights": ["Turquoise beaches", "Snorkeling", "Island hopping", "Sunset points"],
        "photo_queries": ["Andaman beach turquoise water", "Havelock Island Andaman", "Radhanagar beach", "Andaman tropical resort", "Andaman island aerial"]
    },
    "shimla": {
        "description": "Shimla mixes colonial charm, hillside roads, pine forests, and cool mountain air into an easy and scenic getaway.",
        "best_time": "March to June and December to February",
        "avg_budget": "Rs. 14000-28000 / person",
        "trip_type": "Hill Station",
        "ideal_days": "3-5 days",
        "highlights": ["Mall Road", "Pine hills", "Toy train views", "Snowy winters"],
        "photo_queries": ["Shimla mountain view", "Shimla mall road", "Shimla snowfall", "Shimla pine forest", "Shimla heritage architecture"]
    },
    "rishikesh": {
        "description": "Rishikesh balances river adventures, yoga retreats, mountain air, and spiritual energy in a way that feels both exciting and restorative.",
        "best_time": "September to April",
        "avg_budget": "Rs. 12000-26000 / person",
        "trip_type": "Adventure and Wellness",
        "ideal_days": "3-4 days",
        "highlights": ["Ganga ghats", "River rafting", "Yoga retreats", "Bridge views"],
        "photo_queries": ["Rishikesh ganga river", "Lakshman Jhula Rishikesh", "Rishikesh rafting", "Rishikesh yoga retreat", "Rishikesh mountain river"]
    },
    "ooty": {
        "description": "Ooty is a soft, green hill escape with misty valleys, lake views, tea estates, and a peaceful old-world mood.",
        "best_time": "October to June",
        "avg_budget": "Rs. 14000-26000 / person",
        "trip_type": "Hill Station",
        "ideal_days": "3-4 days",
        "highlights": ["Tea gardens", "Lake views", "Misty mornings", "Toy train routes"],
        "photo_queries": ["Ooty tea garden", "Ooty lake", "Ooty misty hills", "Ooty train view", "Ooty mountain resort"]
    },
    "varanasi": {
        "description": "Varanasi offers ancient ghats, river rituals, temple lanes, and unforgettable sunrise scenes that feel soulful and timeless.",
        "best_time": "October to March",
        "avg_budget": "Rs. 10000-22000 / person",
        "trip_type": "Spiritual and Cultural",
        "ideal_days": "2-3 days",
        "highlights": ["Ganga aarti", "Sunrise boat rides", "Temple lanes", "Historic ghats"],
        "photo_queries": ["Varanasi ghat sunrise", "Varanasi ganga aarti", "Varanasi boat ride", "Kashi temple street", "Varanasi riverfront"]
    }
}

THEME_GUIDE_SEEDS = [
    {
        "keywords": ["beach", "island", "coast", "shore", "bay"],
        "trip_type": "Beach Escape",
        "best_time": "October to March",
        "avg_budget": "Rs. 18000-36000 / person",
        "ideal_days": "4-6 days",
        "highlights": ["Beach sunsets", "Sea views", "Coastal cafes", "Water activities"],
        "photo_queries": ["{dest} beach sunset", "{dest} coast aerial", "{dest} sea view", "{dest} resort beach"],
        "description": "{dest} offers sun-filled days, open sea views, and a laid-back holiday atmosphere that is easy to fall in love with."
    },
    {
        "keywords": ["hill", "mount", "valley", "snow", "manali", "shimla", "ooty"],
        "trip_type": "Hill Station",
        "best_time": "October to June",
        "avg_budget": "Rs. 15000-30000 / person",
        "ideal_days": "3-5 days",
        "highlights": ["Mountain views", "Cool weather", "Scenic drives", "Misty mornings"],
        "photo_queries": ["{dest} mountain view", "{dest} valley", "{dest} scenic road", "{dest} pine forest"],
        "description": "{dest} is a refreshing mountain escape with scenic viewpoints, cool air, and the kind of landscapes that instantly slow you down."
    },
    {
        "keywords": ["temple", "spiritual", "ghat", "heritage", "fort", "palace"],
        "trip_type": "Cultural Journey",
        "best_time": "October to March",
        "avg_budget": "Rs. 12000-28000 / person",
        "ideal_days": "3-5 days",
        "highlights": ["Historic landmarks", "Local culture", "Sunrise and sunset spots", "Iconic architecture"],
        "photo_queries": ["{dest} heritage landmark", "{dest} sunrise view", "{dest} architecture", "{dest} cultural street"],
        "description": "{dest} rewards travelers with rich history, striking architecture, and memorable local experiences that stay with you long after the trip."
    },
    {
        "keywords": ["city", "paris", "dubai", "london", "tokyo", "singapore"],
        "trip_type": "City Break",
        "best_time": "Year round",
        "avg_budget": "Rs. 25000-55000 / person",
        "ideal_days": "4-6 days",
        "highlights": ["Skyline views", "Food scenes", "Landmarks", "Night lights"],
        "photo_queries": ["{dest} skyline night", "{dest} city landmark", "{dest} city street", "{dest} rooftop view"],
        "description": "{dest} combines iconic sights, vibrant neighborhoods, and stylish urban energy that makes every day of the trip feel full."
    }
]

LANDMARK_HINTS = {
    "taj mahal": {
        "place_name": "Taj Mahal",
        "location": "Agra, India",
        "best_time": "October to March",
        "known_for": ["Marble mausoleum", "Mughal architecture", "Sunrise views"],
        "travel_tip": "Go early morning for softer light and shorter queues."
    },
    "eiffel tower": {
        "place_name": "Eiffel Tower",
        "location": "Paris, France",
        "best_time": "April to June and September to October",
        "known_for": ["Paris skyline", "Night lights", "Iconic observation decks"],
        "travel_tip": "Book a timed entry ticket in advance for sunset hours."
    },
    "gate of india": {
        "place_name": "Gateway of India",
        "location": "Mumbai, India",
        "best_time": "November to February",
        "known_for": ["Waterfront monument", "Harbour views", "South Mumbai walks"],
        "travel_tip": "Visit early morning to avoid the heaviest crowd."
    },
    "india gate": {
        "place_name": "India Gate",
        "location": "New Delhi, India",
        "best_time": "October to March",
        "known_for": ["War memorial", "Evening lights", "City landmark"],
        "travel_tip": "Evenings are lively, but mornings are calmer for photos."
    },
    "qutub minar": {
        "place_name": "Qutub Minar",
        "location": "New Delhi, India",
        "best_time": "October to March",
        "known_for": ["UNESCO site", "Historic complex", "Tower views"],
        "travel_tip": "Combine it with nearby Mehrauli heritage spots."
    },
    "golden temple": {
        "place_name": "Golden Temple",
        "location": "Amritsar, India",
        "best_time": "October to March",
        "known_for": ["Sacred shrine", "Night reflections", "Langar experience"],
        "travel_tip": "Cover your head and allow extra time for security."
    },
    "charminar": {
        "place_name": "Charminar",
        "location": "Hyderabad, India",
        "best_time": "October to February",
        "known_for": ["Old city icon", "Night market", "Heritage architecture"],
        "travel_tip": "Visit near sunset and try the nearby street food after."
    },
    "hawa mahal": {
        "place_name": "Hawa Mahal",
        "location": "Jaipur, India",
        "best_time": "October to March",
        "known_for": ["Pink City facade", "Jaipur landmark", "Historic windows"],
        "travel_tip": "The opposite side of the road gives the classic full-front photo."
    }
}


# ─────────────────────────────────────
# FRONTEND ROUTES
# ─────────────────────────────────────
@app.route("/")
def home():
    return send_from_directory(FRONTEND_FOLDER, "index_new.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(FRONTEND_FOLDER, path)


# ─────────────────────────────────────
# HELPERS
# ─────────────────────────────────────
def get_logged_user_role(username):
    if not username:
        return None

    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE username = %s", (username,))
        row = cursor.fetchone()
        return row["role"] if row else None
    finally:
        cursor.close()
        db.close()


def extract_message_text(result):
    content = result.get("content", [])
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            return (block.get("text") or "").strip()
        if isinstance(block, dict) and block.get("text"):
            return block.get("text").strip()
    return ""


def parse_json_object(text):
    if not text:
        return {}

    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return {}
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}


def clean_text(value, default=""):
    if isinstance(value, str) and value.strip():
        return value.strip()
    return default


def clean_list(value):
    if not isinstance(value, list):
        return []
    cleaned = []
    for item in value:
        text = clean_text(item)
        if text and text not in cleaned:
            cleaned.append(text)
    return cleaned


def coerce_string_list(value):
    if isinstance(value, list):
        return clean_list(value)
    if isinstance(value, str):
        parts = re.split(r"[,;\n|]", value)
        return clean_list(parts)
    return []


def normalize_identify_info(info, fallback_message=""):
    info = info if isinstance(info, dict) else {}

    place_name = (
        clean_text(info.get("place_name"))
        or clean_text(info.get("name"))
        or clean_text(info.get("landmark"))
        or clean_text(info.get("destination"))
        or clean_text(info.get("title"))
    )
    location = (
        clean_text(info.get("location"))
        or clean_text(info.get("city"))
        or clean_text(info.get("country"))
    )
    description = (
        clean_text(info.get("description"))
        or clean_text(info.get("about"))
        or clean_text(info.get("summary"))
        or clean_text(fallback_message)
    )
    best_time = (
        clean_text(info.get("best_time"))
        or clean_text(info.get("best_season"))
        or clean_text(info.get("visit_time"))
        or "Year round"
    )
    travel_tip = (
        clean_text(info.get("travel_tip"))
        or clean_text(info.get("tip"))
        or clean_text(info.get("advice"))
    )
    known_for = (
        coerce_string_list(info.get("known_for"))
        or coerce_string_list(info.get("features"))
        or coerce_string_list(info.get("highlights"))
    )
    alternatives = (
        coerce_string_list(info.get("alternatives"))
        or coerce_string_list(info.get("similar"))
    )

    confidence_raw = info.get("confidence", info.get("score", 0))
    try:
        confidence = int(float(str(confidence_raw).replace("%", "").strip()))
    except Exception:
        confidence = 0
    confidence = max(0, min(confidence, 100))

    return {
        "place_name": place_name,
        "location": location,
        "confidence": confidence,
        "description": description,
        "best_time": best_time,
        "known_for": known_for,
        "travel_tip": travel_tip,
        "alternatives": alternatives,
        "is_fallback": bool(info.get("is_fallback")),
        "fallback_reason": clean_text(info.get("fallback_reason")),
        "can_plan": info.get("can_plan") is not False and bool(place_name) and place_name != "Live identify unavailable"
    }


def normalize_hint_text(value):
    text = clean_text(value).lower()
    text = text.replace("_", " ").replace("-", " ")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def classify_identify_error(exc):
    message = str(exc or "")
    lowered = message.lower()

    if any(token in lowered for token in [
        "failed to establish a new connection",
        "max retries exceeded",
        "forbidden by its access permissions",
        "name or service not known",
        "connection aborted",
        "connection error",
        "read timed out",
        "timeout"
    ]):
        return {
            "reason": "network",
            "message": "TravelNex could not reach the live Gemini image service. Check internet, firewall, or VPN settings and try again."
        }

    if "429" in lowered or "quota" in lowered or "rate limit" in lowered:
        return {
            "reason": "quota",
            "message": "Live image identify is busy right now because the request limit was reached. TravelNex switched to a fallback so you can keep exploring while it resets."
        }

    if any(token in lowered for token in ["403", "401", "api key", "permission denied", "access not configured"]):
        return {
            "reason": "auth",
            "message": "The Gemini API key is missing, invalid, or does not have image access enabled."
        }

    if any(token in lowered for token in ["400", "payload", "request too large", "invalid argument"]):
        return {
            "reason": "request",
            "message": "The uploaded photo could not be processed. Try a clearer image or a smaller file."
        }

    return {
        "reason": "unknown",
        "message": "Live image identify is unavailable right now. Try another photo or continue with the guide tools."
    }


def build_hint_identification(hint_text):
    normalized = normalize_hint_text(hint_text)
    if not normalized:
        return None

    for alias, info in LANDMARK_HINTS.items():
        alias_norm = normalize_hint_text(alias)
        if alias_norm and alias_norm in normalized:
            return {
                **info,
                "confidence": 58,
                "description": f"This looks like {info['place_name']}. The app inferred it from the uploaded file hint while live image identification was unavailable.",
                "alternatives": [],
                "is_fallback": True,
                "fallback_reason": "filename",
                "can_plan": True
            }

    for destination in DESTINATION_GUIDE_SEEDS.keys():
        if normalize_hint_text(destination) in normalized:
            details = build_destination_fallback(destination)
            return {
                "place_name": details["name"],
                "location": "",
                "confidence": 52,
                "description": f"The app inferred this destination from the uploaded file hint because live image identification was unavailable.",
                "best_time": details["best_time"],
                "known_for": details["highlights"][:3],
                "travel_tip": "Use the photo cards below to verify the match and explore nearby places.",
                "alternatives": [],
                "is_fallback": True,
                "fallback_reason": "filename",
                "can_plan": True
            }

    return None


def extract_readable_file_hint(file_name):
    normalized = normalize_hint_text(file_name)
    if not normalized:
        return ""

    ignored = {
        "img", "image", "photo", "pic", "picture", "screenshot", "upload", "travelnex",
        "camera", "scan", "snap", "whatsapp", "px", "edit", "edited", "copy", "final",
        "jpg", "jpeg", "png", "webp", "gif", "heic", "bmp"
    }
    tokens = []
    for token in normalized.split():
        # Skip camera-style names like IMG20240504162126 or DSC00123 that are not useful place hints.
        if token in ignored or token.isdigit() or len(token) < 3:
            continue
        if re.match(r"^(?:img|image|photo|pic|dsc|pxl|mvimg|vid|whatsapp)[a-z0-9]*$", token):
            continue
        digit_count = sum(1 for char in token if char.isdigit())
        alpha_count = sum(1 for char in token if char.isalpha())
        if digit_count >= 4 and alpha_count <= 4:
            continue
        if token not in tokens:
            tokens.append(token)

    if not tokens:
        return ""

    return title_case_words(" ".join(tokens[:4]))


def build_identify_unavailable_fallback(reason, file_name=""):
    file_hint = extract_readable_file_hint(file_name)
    if file_hint:
        details = build_destination_fallback(file_hint)
        return {
            "place_name": file_hint,
            "location": "",
            "confidence": 32,
            "description": (
                f"Live image identification is temporarily unavailable, so TravelNex is using the uploaded file name "
                f"as a soft hint for \"{file_hint}\". Use the photo cards below to confirm whether it matches."
            ),
            "best_time": details["best_time"],
            "known_for": details["highlights"][:3],
            "travel_tip": "If this guess looks wrong, rename the file more clearly or try again later when live identify is available.",
            "alternatives": [],
            "is_fallback": True,
            "fallback_reason": reason,
            "can_plan": True
        }

    if reason == "quota":
        description = (
            "Live image identification is busy right now because the request limit was reached. "
            "TravelNex is still ready to help with destination browsing, nearby stays, and food ideas."
        )
    elif reason == "network":
        description = (
            "TravelNex could not reach the live image service just now. "
            "You can keep exploring with the guide tools while the connection recovers."
        )
    else:
        description = (
            "Live image identification is unavailable right now. "
            "You can still continue with Destination Gallery and nearby place tools."
        )

    return {
        "place_name": "Live identify unavailable",
        "location": "",
        "confidence": 0,
        "description": description,
        "best_time": "Try again later",
        "known_for": ["Destination Gallery", "Nearby attractions", "Hotels and restaurants"],
        "travel_tip": "Upload a clearer photo later, or use a descriptive file name like taj-mahal.jpg for a better fallback.",
        "alternatives": [],
        "is_fallback": True,
        "fallback_reason": reason,
        "can_plan": False
    }


def infer_theme_seed(dest):
    lowered = dest.lower()
    for theme in THEME_GUIDE_SEEDS:
        if any(keyword in lowered for keyword in theme["keywords"]):
            return theme
    return {
        "trip_type": "Scenic Getaway",
        "best_time": "October to March",
        "avg_budget": "Rs. 18000-35000 / person",
        "ideal_days": "3-5 days",
        "highlights": ["Scenic viewpoints", "Local food", "Relaxed stays", "Popular attractions"],
        "photo_queries": ["{dest} scenic view", "{dest} landmark", "{dest} travel photography", "{dest} best places"],
        "description": "{dest} is the kind of destination that offers memorable views, easy photo moments, and enough variety to turn a simple plan into an exciting trip."
    }


def build_destination_fallback(dest):
    lowered = dest.lower()
    seed = None
    for key, value in DESTINATION_GUIDE_SEEDS.items():
        if key in lowered or lowered in key:
            seed = value
            break

    if seed is None:
        seed = infer_theme_seed(dest)

    name = " ".join(part.capitalize() for part in dest.split()) or "Destination"
    photo_queries = [
        query.replace("{dest}", name)
        for query in seed.get("photo_queries", [])
    ]

    if not photo_queries:
        photo_queries = [
            f"{name} scenic view",
            f"{name} landmarks",
            f"{name} travel photography"
        ]

    return {
        "name": name,
        "description": seed["description"].replace("{dest}", name),
        "best_time": seed.get("best_time", "Year round"),
        "avg_budget": seed.get("avg_budget", "Rs. 18000-35000 / person"),
        "trip_type": seed.get("trip_type", "Scenic Getaway"),
        "ideal_days": seed.get("ideal_days", "3-5 days"),
        "highlights": clean_list(seed.get("highlights", [])),
        "photo_queries": clean_list(photo_queries)
    }


def merge_destination_info(dest, info):
    fallback = build_destination_fallback(dest)
    merged = {
        "name": clean_text(info.get("name"), fallback["name"]),
        "description": clean_text(info.get("description"), fallback["description"]),
        "best_time": clean_text(info.get("best_time"), fallback["best_time"]),
        "avg_budget": clean_text(info.get("avg_budget"), fallback["avg_budget"]),
        "trip_type": clean_text(info.get("trip_type"), fallback["trip_type"]),
        "ideal_days": clean_text(info.get("ideal_days"), fallback["ideal_days"]),
        "highlights": clean_list(info.get("highlights")) or fallback["highlights"],
        "photo_queries": clean_list(info.get("photo_queries")) or fallback["photo_queries"],
    }
    return merged


def title_case_words(value):
    words = [part for part in re.split(r"\s+", clean_text(value)) if part]
    if not words:
        return ""
    return " ".join(word[:1].upper() + word[1:] for word in words)


def build_photo_title(search_query):
    query = clean_text(search_query, "travel view")
    lowered = query.lower()
    tokens = re.findall(r"[a-z0-9]+", lowered)

    generic_tokens = {
        "travel", "tourism", "photography", "photo", "view", "views", "best", "place", "places",
        "landmark", "landmarks", "attraction", "attractions", "scenic", "beautiful", "popular",
        "architecture", "heritage", "street", "streets", "city", "coast", "coastal", "beach",
        "mountain", "mountains", "valley", "forest", "night", "sunrise", "sunset", "aerial",
        "rooftop", "resort", "hotel", "luxury", "sea", "river", "lake", "backwater", "backwaters"
    }
    subject_tokens = [token for token in tokens if token not in generic_tokens]
    if not subject_tokens:
        subject_tokens = tokens[:4]

    subject = title_case_words(" ".join(subject_tokens[:4])) or "Travel Spot"

    if any(token in lowered for token in ["sunrise", "sunset", "golden hour"]):
        suffix = "Golden Hour View"
    elif any(token in lowered for token in ["fort", "palace", "temple", "church", "basilica", "gate", "tower", "monastery", "minar"]):
        suffix = "Landmark View"
    elif any(token in lowered for token in ["beach", "coast", "sea"]):
        suffix = "Coastal Escape"
    elif any(token in lowered for token in ["mountain", "valley", "snow", "hill"]):
        suffix = "Mountain View"
    elif any(token in lowered for token in ["street", "market", "bazaar", "cafe"]):
        suffix = "Local Scene"
    elif any(token in lowered for token in ["resort", "hotel", "stay"]):
        suffix = "Stay Inspiration"
    elif any(token in lowered for token in ["lake", "river", "backwater"]):
        suffix = "Waterfront View"
    elif any(token in lowered for token in ["architecture", "heritage"]):
        suffix = "Heritage Detail"
    else:
        suffix = "Travel View"

    return f"{subject} {suffix}".strip()


def build_photo_source_info(photo):
    photo = photo if isinstance(photo, dict) else {}
    user = photo.get("user", {}) if isinstance(photo.get("user"), dict) else {}
    links = photo.get("links", {}) if isinstance(photo.get("links"), dict) else {}
    user_links = user.get("links", {}) if isinstance(user.get("links"), dict) else {}

    return {
        "source_label": "Unsplash",
        "source_url": clean_text(links.get("html"), clean_text(photo.get("urls", {}).get("regular"))),
        "photographer": clean_text(user.get("name"), "Unsplash creator"),
        "photographer_url": clean_text(user_links.get("html"), clean_text(links.get("html")))
    }


def build_pexels_photo_source_info(photo):
    photo = photo if isinstance(photo, dict) else {}
    src = photo.get("src", {}) if isinstance(photo.get("src"), dict) else {}

    return {
        "source_label": "Pexels",
        "source_url": clean_text(photo.get("url"), clean_text(src.get("original"))),
        "photographer": clean_text(photo.get("photographer"), "Pexels creator"),
        "photographer_url": clean_text(photo.get("photographer_url"), clean_text(photo.get("url")))
    }


def fetch_unsplash_photo_candidates(deduped_queries, count):
    photos = []
    seen_ids = set()
    per_page = min(max(count * 3, 6), 10)
    query_results = []

    for search_query in deduped_queries[:6]:
        resp = req_lib.get(
            "https://api.unsplash.com/search/photos",
            params={
                "query": search_query,
                "per_page": per_page,
                "orientation": "landscape",
                "content_filter": "high",
                "order_by": "relevant"
            },
            headers={"Authorization": f"Client-ID {UNSPLASH_KEY}"},
            timeout=10
        )
        resp.raise_for_status()
        data_r = resp.json()
        ranked_results = rank_unsplash_results(data_r.get("results", []), search_query)
        query_results.append((search_query, ranked_results))

    for search_query, results in query_results:
        for p in results:
            photo_id = p.get("id")
            if not photo_id or photo_id in seen_ids:
                continue

            seen_ids.add(photo_id)
            source_info = build_photo_source_info(p)
            photos.append({
                "url": p["urls"]["regular"],
                "thumb": p["urls"]["small"],
                "name": build_photo_title(search_query),
                "badge": "Must See" if not photos else "Travel Pick",
                "query": search_query,
                "place_query": title_case_words(search_query),
                **source_info
            })
            break

        if len(photos) >= count:
            return photos

    if len(photos) < count:
        overflow_candidates = []
        for query_index, (search_query, results) in enumerate(query_results):
            for result_index, p in enumerate(results):
                photo_id = p.get("id")
                if not photo_id or photo_id in seen_ids:
                    continue
                overflow_candidates.append((
                    score_unsplash_photo(p, search_query),
                    -query_index,
                    -result_index,
                    photo_id,
                    search_query,
                    p
                ))

        overflow_candidates.sort(reverse=True)

        for _, _, _, _, search_query, p in overflow_candidates:
            photo_id = p.get("id")
            if not photo_id or photo_id in seen_ids:
                continue

            seen_ids.add(photo_id)
            source_info = build_photo_source_info(p)
            photos.append({
                "url": p["urls"]["regular"],
                "thumb": p["urls"]["small"],
                "name": build_photo_title(search_query),
                "badge": "Must See" if not photos else "Travel Pick",
                "query": search_query,
                "place_query": title_case_words(search_query),
                **source_info
            })

            if len(photos) >= count:
                break

    return photos


def fetch_pexels_photo_candidates(deduped_queries, count):
    if not clean_text(PEXELS_KEY):
        raise ValueError("Pexels backup key is not configured")

    photos = []
    seen_ids = set()
    per_page = min(max(count * 3, 6), 15)
    query_results = []

    for search_query in deduped_queries[:6]:
        resp = req_lib.get(
            "https://api.pexels.com/v1/search",
            params={
                "query": search_query,
                "per_page": per_page
            },
            headers={"Authorization": PEXELS_KEY},
            timeout=10
        )
        resp.raise_for_status()
        data_r = resp.json()
        ranked_results = rank_pexels_results(data_r.get("photos", []), search_query)
        query_results.append((search_query, ranked_results))

    for search_query, results in query_results:
        for p in results:
            photo_id = p.get("id")
            src = p.get("src", {}) if isinstance(p.get("src"), dict) else {}
            if not photo_id or photo_id in seen_ids or not src:
                continue

            seen_ids.add(photo_id)
            source_info = build_pexels_photo_source_info(p)
            photos.append({
                "url": clean_text(src.get("large2x"), clean_text(src.get("large"), clean_text(src.get("original")))),
                "thumb": clean_text(src.get("medium"), clean_text(src.get("large"), clean_text(src.get("original")))),
                "name": build_photo_title(search_query),
                "badge": "Must See" if not photos else "Travel Pick",
                "query": search_query,
                "place_query": title_case_words(search_query),
                **source_info
            })
            break

        if len(photos) >= count:
            return photos

    if len(photos) < count:
        for search_query, results in query_results:
            for p in results:
                photo_id = p.get("id")
                src = p.get("src", {}) if isinstance(p.get("src"), dict) else {}
                if not photo_id or photo_id in seen_ids or not src:
                    continue

                seen_ids.add(photo_id)
                source_info = build_pexels_photo_source_info(p)
                photos.append({
                    "url": clean_text(src.get("large2x"), clean_text(src.get("large"), clean_text(src.get("original")))),
                    "thumb": clean_text(src.get("medium"), clean_text(src.get("large"), clean_text(src.get("original")))),
                    "name": build_photo_title(search_query),
                    "badge": "Must See" if not photos else "Travel Pick",
                    "query": search_query,
                    "place_query": title_case_words(search_query),
                    **source_info
                })

                if len(photos) >= count:
                    return photos

    return photos


GUIDE_EXPLORE_CATEGORY_CONFIG = {
    "attractions": {
        "label": "Attractions",
        "categories": "tourism.sights,tourism.attraction,entertainment.theme_park,entertainment.activity_park,heritage,leisure.park",
        "radius": 14000,
        "fallback_icon": "Top pick"
    },
    "hotels": {
        "label": "Hotels",
        "categories": "accommodation.hotel,accommodation.guest_house,accommodation.motel,accommodation.hostel,accommodation.apartment,accommodation.chalet,accommodation.hut,accommodation",
        "radius": 18000,
        "fallback_icon": "Stay"
    },
    "restaurants": {
        "label": "Restaurants",
        "categories": "catering.restaurant,catering.cafe,catering.fast_food,catering.pub,catering.bar",
        "radius": 12000,
        "fallback_icon": "Food"
    }
}


def normalize_guide_explore_category(value):
    normalized = clean_text(value).lower()
    if normalized in {"food", "foods", "restaurant", "restaurants", "dining"}:
        return "restaurants"
    if normalized in {"hotel", "hotels", "stay", "stays"}:
        return "hotels"
    return "attractions"


def extract_feature_coordinates(feature):
    feature = feature if isinstance(feature, dict) else {}
    properties = feature.get("properties", {}) if isinstance(feature.get("properties"), dict) else {}

    for lon_key, lat_key in [("lon", "lat"), ("lng", "lat")]:
        lon = properties.get(lon_key)
        lat = properties.get(lat_key)
        if lon is not None and lat is not None:
            try:
                return float(lon), float(lat)
            except Exception:
                pass

    geometry = feature.get("geometry", {}) if isinstance(feature.get("geometry"), dict) else {}
    coordinates = geometry.get("coordinates")
    if isinstance(coordinates, list) and len(coordinates) >= 2:
        try:
            return float(coordinates[0]), float(coordinates[1])
        except Exception:
            return None, None

    return None, None


def format_distance_text(distance_value):
    try:
        distance = float(distance_value)
    except Exception:
        return ""

    if distance <= 0:
        return ""
    if distance < 1000:
        return f"{int(round(distance))} m away"
    return f"{distance / 1000:.1f} km away"


def build_place_kind_label(category_key, categories):
    categories = categories if isinstance(categories, list) else []
    preferred = []
    for raw in categories:
        text = clean_text(raw)
        if not text:
            continue
        leaf = text.split(".")[-1].replace("_", " ").strip()
        if not leaf:
            continue
        label = title_case_words(leaf)
        if label not in preferred:
            preferred.append(label)

    if preferred:
        return preferred[0]

    return GUIDE_EXPLORE_CATEGORY_CONFIG[category_key]["fallback_icon"]


def build_guide_explore_item_summary(category_key, kind_label, context, address):
    base = {
        "attractions": f"{kind_label} around {context}",
        "hotels": f"{kind_label} stay option near {context}",
        "restaurants": f"{kind_label} dining option near {context}"
    }.get(category_key, f"{kind_label} near {context}")

    if address:
        return f"{base}. {address}"
    return base


def fetch_geoapify_places_batch(lon, lat, categories, radius, limit):
    places_resp = req_lib.get(
        "https://api.geoapify.com/v2/places",
        params={
            "categories": categories,
            "filter": f"circle:{lon},{lat},{radius}",
            "bias": f"proximity:{lon},{lat}",
            "limit": min(max(int(limit), 1), 8),
            "apiKey": GEOAPIFY_KEY
        },
        timeout=12
    )
    places_resp.raise_for_status()
    places_data = places_resp.json()
    return places_data.get("features", []) if isinstance(places_data, dict) else []


def fetch_geoapify_guide_explore_items(context, category_key, limit=6):
    config = GUIDE_EXPLORE_CATEGORY_CONFIG[category_key]
    place_text = clean_text(context)

    geocode_resp = req_lib.get(
        "https://api.geoapify.com/v1/geocode/search",
        params={
            "text": place_text,
            "limit": 1,
            "format": "json",
            "apiKey": GEOAPIFY_KEY
        },
        timeout=10
    )
    geocode_resp.raise_for_status()
    geocode_data = geocode_resp.json()
    geocode_results = geocode_data.get("results", []) if isinstance(geocode_data, dict) else []
    if not geocode_results:
        raise ValueError("Location not found")

    resolved = geocode_results[0] if isinstance(geocode_results[0], dict) else {}
    lon = resolved.get("lon")
    lat = resolved.get("lat")
    if lon is None or lat is None:
        raise ValueError("Location coordinates unavailable")

    lon = float(lon)
    lat = float(lat)
    resolved_name = clean_text(
        resolved.get("city")
        or resolved.get("state")
        or resolved.get("county")
        or resolved.get("name")
        or resolved.get("formatted"),
        place_text
    )
    requested_limit = min(max(int(limit), 1), 8)
    search_radii = []
    for candidate in [
        config["radius"],
        max(config["radius"] * 2, 28000),
        max(config["radius"] * 4, 65000)
    ]:
        if candidate not in search_radii:
            search_radii.append(candidate)

    features = []
    seen_feature_ids = set()
    for radius in search_radii:
        batch = fetch_geoapify_places_batch(lon, lat, config["categories"], radius, requested_limit)
        for feature in batch:
            feature_id = clean_text(
                feature.get("properties", {}).get("place_id")
                if isinstance(feature.get("properties"), dict) else ""
            ) or json.dumps(feature, sort_keys=True)
            if feature_id in seen_feature_ids:
                continue
            seen_feature_ids.add(feature_id)
            features.append(feature)
        if len(features) >= requested_limit:
            break

    items = []
    seen = set()

    for feature in features:
        properties = feature.get("properties", {}) if isinstance(feature.get("properties"), dict) else {}
        name = clean_text(properties.get("name"))
        address = clean_text(properties.get("formatted") or properties.get("address_line2"))
        if not name:
            continue

        dedupe_key = (name.lower(), address.lower())
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        item_lon, item_lat = extract_feature_coordinates(feature)
        website = clean_text(properties.get("website") or properties.get("website_url"))
        phone = clean_text(properties.get("contact", {}).get("phone") if isinstance(properties.get("contact"), dict) else "")
        categories = properties.get("categories", []) if isinstance(properties.get("categories"), list) else []
        kind_label = build_place_kind_label(category_key, categories)
        map_query = ", ".join(part for part in [name, address or resolved_name] if part)
        distance_text = format_distance_text(properties.get("distance"))

        items.append({
            "name": name,
            "address": address,
            "kind": kind_label,
            "summary": build_guide_explore_item_summary(category_key, kind_label, resolved_name, address),
            "distance_text": distance_text,
            "website": website,
            "phone": phone,
            "map_query": map_query,
            "map_url": f"https://www.google.com/maps/search/{req_lib.utils.quote(map_query)}",
            "lat": item_lat,
            "lon": item_lon
        })

    return {
        "resolved_context": resolved_name,
        "resolved_address": clean_text(resolved.get("formatted"), place_text),
        "items": items
    }


def normalize_photo_match_text(value):
    return re.sub(r"[^a-z0-9]+", " ", clean_text(value).lower()).strip()


def build_photo_match_tokens(value, ignored_tokens=None):
    ignored = set(ignored_tokens or [])
    generic_tokens = {
        "travel", "tourism", "photography", "photo", "photos", "view", "views", "best", "place", "places",
        "top", "beautiful", "popular", "destination", "destinations", "trip", "guide", "india", "indian",
        "landmark", "landmarks", "attraction", "attractions", "scenic", "nature", "vacation", "holiday",
        "old", "new", "north", "south", "east", "west", "central", "upper", "lower"
    }
    tokens = []
    for token in re.findall(r"[a-z0-9]+", normalize_photo_match_text(value)):
        if len(token) < 3 or token.isdigit() or token in generic_tokens or token in ignored:
            continue
        if token not in tokens:
            tokens.append(token)
    return tokens


def count_photo_token_matches(haystack, tokens):
    return sum(1 for token in tokens if token and token in haystack)


PLACE_PHOTO_TERMS = {
    "beach", "coast", "shore", "island", "mountain", "valley", "hill", "fort", "palace", "temple",
    "church", "chapel", "cathedral", "basilica", "monastery", "convent", "museum", "lake", "river",
    "waterfall", "street", "bazaar", "market", "sunset", "sunrise", "skyline", "aerial", "landscape",
    "architecture", "heritage", "resort", "forest", "garden", "waterfront", "bridge", "harbor",
    "harbour", "viewpoint", "lighthouse", "plaza", "square", "cliff", "bay", "lagoon"
}

PERSON_PHOTO_TERMS = {
    "portrait", "selfie", "fashion", "wedding", "studio", "model", "headshot", "person", "people",
    "human", "face", "man", "woman", "boy", "girl", "gentleman", "lady", "elderly", "smile",
    "closeup", "close up", "profile"
}


def extract_unsplash_photo_match_text(photo):
    photo = photo if isinstance(photo, dict) else {}
    pieces = [
        photo.get("alt_description"),
        photo.get("description"),
        photo.get("slug")
    ]

    user = photo.get("user", {}) if isinstance(photo.get("user"), dict) else {}
    location = photo.get("location", {}) if isinstance(photo.get("location"), dict) else {}
    pieces.extend([
        location.get("title"),
        location.get("city"),
        location.get("country")
    ])

    tags = photo.get("tags")
    if isinstance(tags, list):
        for tag in tags[:8]:
            if isinstance(tag, dict):
                pieces.append(tag.get("title"))
            elif isinstance(tag, str):
                pieces.append(tag)

    breadcrumbs = photo.get("breadcrumbs")
    if isinstance(breadcrumbs, list):
        for crumb in breadcrumbs[:6]:
            if isinstance(crumb, dict):
                pieces.append(crumb.get("title"))

    return normalize_photo_match_text(" ".join(clean_text(piece) for piece in pieces if clean_text(piece)))


def extract_pexels_photo_match_text(photo):
    photo = photo if isinstance(photo, dict) else {}
    pieces = [
        photo.get("alt"),
        photo.get("url")
    ]

    src = photo.get("src", {}) if isinstance(photo.get("src"), dict) else {}
    pieces.extend([
        src.get("original"),
        src.get("large2x"),
        src.get("large")
    ])

    return normalize_photo_match_text(" ".join(clean_text(piece) for piece in pieces if clean_text(piece)))


def extract_place_photo_terms(value):
    normalized = normalize_photo_match_text(value)
    return {term for term in PLACE_PHOTO_TERMS if term in normalized}


def has_person_photo_terms(value):
    normalized = normalize_photo_match_text(value)
    return any(term in normalized for term in PERSON_PHOTO_TERMS)


def is_relevant_place_photo(metadata, search_query):
    normalized_query = normalize_photo_match_text(search_query)
    query_tokens = build_photo_match_tokens(search_query, {"the", "and", "for", "with", "from"})
    token_hits = count_photo_token_matches(metadata, query_tokens)
    metadata_place_terms = extract_place_photo_terms(metadata)
    query_place_terms = extract_place_photo_terms(search_query)

    if not metadata:
        return False

    if has_person_photo_terms(metadata) and not metadata_place_terms:
        return False

    if normalized_query and normalized_query in metadata:
        return True

    if token_hits >= 2 and metadata_place_terms:
        return True

    if token_hits >= 1 and query_place_terms.intersection(metadata_place_terms):
        return True

    if token_hits >= 1 and len(query_tokens) <= 1 and len(metadata_place_terms) >= 2:
        return True

    if token_hits == 0 and not query_tokens and metadata_place_terms:
        return True

    return False


def score_unsplash_photo(photo, search_query):
    metadata = extract_unsplash_photo_match_text(photo)
    normalized_query = normalize_photo_match_text(search_query)
    query_tokens = build_photo_match_tokens(search_query, {"the", "and", "for", "with", "from"})
    score = 0

    if normalized_query and metadata:
        if metadata == normalized_query:
            score += 18
        if normalized_query in metadata:
            score += 14
        if metadata in normalized_query:
            score += 8

    score += count_photo_token_matches(metadata, query_tokens) * 5

    positive_terms = PLACE_PHOTO_TERMS
    negative_terms = PERSON_PHOTO_TERMS | {
        "food", "dish", "menu", "cocktail", "drink", "product", "wallpaper", "poster", "illustration",
        "logo", "map"
    }

    score += sum(2 for term in positive_terms if term in metadata)
    score -= sum(6 for term in negative_terms if term in metadata)

    if has_person_photo_terms(metadata) and not extract_place_photo_terms(metadata):
        score -= 20

    width = int(photo.get("width") or 0)
    height = int(photo.get("height") or 0)
    if width and height and width >= height:
        score += 2

    likes = int(photo.get("likes") or 0)
    score += min(likes // 25, 4)

    return score


def rank_unsplash_results(results, search_query):
    decorated = []
    for photo in results if isinstance(results, list) else []:
        if not isinstance(photo, dict) or not photo.get("id"):
            continue
        metadata = extract_unsplash_photo_match_text(photo)
        if not is_relevant_place_photo(metadata, search_query):
            continue
        decorated.append((score_unsplash_photo(photo, search_query), photo))

    decorated.sort(
        key=lambda item: (
            item[0],
            int(item[1].get("likes") or 0),
            clean_text(item[1].get("alt_description"))
        ),
        reverse=True
    )
    return [photo for _, photo in decorated]


def score_pexels_photo(photo, search_query):
    metadata = extract_pexels_photo_match_text(photo)
    query_tokens = build_photo_match_tokens(search_query, {"the", "and", "for", "with", "from"})
    score = count_photo_token_matches(metadata, query_tokens) * 5
    score += sum(2 for term in PLACE_PHOTO_TERMS if term in metadata)
    score -= sum(6 for term in PERSON_PHOTO_TERMS if term in metadata)

    width = int(photo.get("width") or 0)
    height = int(photo.get("height") or 0)
    if width and height and width >= height:
        score += 2

    return score


def rank_pexels_results(results, search_query):
    decorated = []
    for photo in results if isinstance(results, list) else []:
        if not isinstance(photo, dict) or not photo.get("id"):
            continue
        metadata = extract_pexels_photo_match_text(photo)
        if not is_relevant_place_photo(metadata, search_query):
            continue
        decorated.append((score_pexels_photo(photo, search_query), photo))

    decorated.sort(key=lambda item: item[0], reverse=True)
    return [photo for _, photo in decorated]


def extract_gemini_text(result):
    candidates = result.get("candidates", [])
    if not candidates:
        return ""

    parts = candidates[0].get("content", {}).get("parts", [])
    texts = []
    for part in parts:
        text = part.get("text")
        if isinstance(text, str) and text.strip():
            texts.append(text.strip())
    return "\n".join(texts).strip()


def build_gemini_error(resp):
    status_code = getattr(resp, "status_code", "unknown")
    message = ""

    try:
        payload = resp.json()
        error_info = payload.get("error", {}) if isinstance(payload, dict) else {}
        message = clean_text(error_info.get("message"))
    except Exception:
        message = ""

    if not message:
        message = clean_text(getattr(resp, "text", ""))

    message = message or "Gemini request failed"
    return RuntimeError(f"{status_code} {message}")


def call_gemini(parts, response_mime_type="text/plain", temperature=0.4, max_output_tokens=900):
    model_candidates = [
        "gemini-2.5-flash",
        "gemini-2.0-flash"
    ]
    payload = {
        "contents": [{
            "role": "user",
            "parts": parts
        }],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": response_mime_type
        }
    }

    last_error = None
    for model_name in model_candidates:
        try:
            resp = req_lib.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent",
                params={"key": GEMINI_KEY},
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=30
            )
            if resp.status_code >= 400:
                error = build_gemini_error(resp)
                if resp.status_code in {400, 401, 403, 429}:
                    raise error
                last_error = error
                continue
            return resp.json()
        except Exception as exc:
            last_error = exc

    raise last_error if last_error else RuntimeError("Gemini request failed")


def identify_place_with_gemini(image_b64, media_type):
    prompts = [
        {
            "response_mime_type": "application/json",
            "prompt": (
                "You are a travel guide. Identify the landmark or destination in this image. "
                "Reply only as JSON with this exact shape: "
                '{"place_name":"name","location":"city, country","confidence":95,'
                '"description":"2 short sentences for travelers","best_time":"e.g. Oct-Mar",'
                '"known_for":["thing1","thing2","thing3"],'
                '"travel_tip":"one useful travel tip","alternatives":["place1","place2"]}'
            ),
        },
        {
            "response_mime_type": "text/plain",
            "prompt": (
                "You are a travel guide. Identify the landmark or destination in this image. "
                "Respond with a plain JSON object only using the keys "
                "place_name, location, confidence, description, best_time, known_for, travel_tip, alternatives."
            ),
        },
    ]

    last_error = None
    for attempt in prompts:
        try:
            result = call_gemini(
                parts=[
                    {
                        "inline_data": {
                            "mime_type": media_type,
                            "data": image_b64
                        }
                    },
                    {
                        "text": attempt["prompt"]
                    }
                ],
                response_mime_type=attempt["response_mime_type"],
                temperature=0.2,
                max_output_tokens=700
            )
            info = normalize_identify_info(parse_json_object(extract_gemini_text(result)))
            if info.get("place_name"):
                return info
            last_error = ValueError("Unable to identify place from model response")
        except Exception as exc:
            last_error = exc

    raise last_error if last_error else RuntimeError("Unable to identify place")


def extract_trip_days_from_message(message, default=3):
    match = re.search(r"(\d+)\s*[- ]?\s*day", clean_text(message).lower())
    if not match:
        return default
    try:
        return max(1, min(int(match.group(1)), 7))
    except Exception:
        return default


def infer_guide_chat_topic(message="", destination="", place_name=""):
    normalized = normalize_hint_text(message)
    if normalized:
        for alias, info in LANDMARK_HINTS.items():
            alias_norm = normalize_hint_text(alias)
            if alias_norm and alias_norm in normalized:
                return clean_text(info.get("place_name"), title_case_words(alias))

        for known_destination in sorted(DESTINATION_GUIDE_SEEDS.keys(), key=len, reverse=True):
            destination_norm = normalize_hint_text(known_destination)
            if destination_norm and destination_norm in normalized:
                return title_case_words(known_destination)

        patterns = [
            r"\b(?:to|for|in|at|around|near|visit)\s+([a-z][a-z\s]{1,48})"
        ]
        stop_words = re.compile(
            r"\b(?:with|from|under|within|budget|cost|price|weather|season|best|time|places|attractions|restaurants|food|hotels|hotel|cafes|cafe|days|day)\b",
            re.IGNORECASE
        )

        for pattern in patterns:
            match = re.search(pattern, normalized, re.IGNORECASE)
            if not match:
                continue
            candidate = stop_words.split(match.group(1), maxsplit=1)[0].strip()
            candidate = title_case_words(" ".join(candidate.split()[:4]))
            if candidate and normalize_hint_text(candidate) not in {
                "this place", "this trip", "this destination", "the place", "the destination",
                "here", "there", "my trip", "our trip", "visit this place", "visit this destination",
                "visit here", "visit there"
            }:
                return candidate

    explicit_topic = clean_text(place_name) or clean_text(destination)
    if explicit_topic:
        return explicit_topic

    return "travel"


def detect_guide_chat_intent(message):
    lowered = clean_text(message).lower()
    if re.search(r"\b(plan|itinerary|trip|day\s*plan|\d+\s*day)\b", lowered):
        return "itinerary"
    if re.search(r"\b(best time|when to visit|season|weather)\b", lowered):
        return "best_time"
    if re.search(r"\b(budget|cost|price|expense|how much)\b", lowered):
        return "budget"
    if re.search(r"\b(must visit|must-see|top places|places to visit|what to see|attractions|highlights)\b", lowered):
        return "places"
    if re.search(r"\b(food|restaurant|eat|cafe|dining)\b", lowered):
        return "food"
    return "general"


def build_general_chat_fallback(message):
    lowered = clean_text(message).lower()

    if re.search(r"\b(hi|hello|hey)\b", lowered):
        return "Hello. I am your TravelNex Guide. Ask me about destinations, itineraries, budgets, hotels, food, or the best time to visit."
    if re.search(r"\b(your name|who are you|what are you)\b", lowered):
        return "I am the TravelNex Guide. I focus on trip planning, destination ideas, travel tips, food, and stays."
    if re.search(r"\b(what can you do|help|capabilities)\b", lowered):
        return "\n".join([
            "I can help with:",
            "• General questions",
            "• Travel plans and destination tips",
            "• Budgets, best time, places, and food"
        ])
    if re.search(r"\b(how are you)\b", lowered):
        return "I am doing well and ready to help with your next trip."
    if re.search(r"\b(thank you|thanks)\b", lowered):
        return "You are welcome. I can help with your next destination too."

    return (
        "I stay focused on travel help only. Ask me about destinations, itineraries, hotels, restaurants, budgets, or the best time to visit."
    )


def detect_guide_chat_scope(message, destination="", place_name=""):
    lowered = clean_text(message).lower()

    if re.search(r"\b(hi|hello|hey|thanks|thank you|your name|who are you|what are you|what can you do|help|capabilities|how are you)\b", lowered):
        return "meta"

    if (clean_text(place_name) or clean_text(destination)) and (
        detect_guide_chat_intent(message) != "general"
        or re.search(r"\b(this place|this trip|this destination|here|there|nearby|around here|for this)\b", lowered)
    ):
        return "travel"

    travel_patterns = [
        r"\b(travel|trip|itinerary|vacation|holiday|honeymoon|getaway|weekend)\b",
        r"\b(visit|best time|weather|season|places to visit|attractions|sightseeing|must visit)\b",
        r"\b(budget|cost|price|expense|stay|hotel|resort|hostel|restaurant|food|cafe)\b",
        r"\b(route|transport|flight|train|bus|airport|metro|packing|visa|passport)\b"
    ]
    if any(re.search(pattern, lowered) for pattern in travel_patterns):
        return "travel"

    inferred_topic = infer_guide_chat_topic(message)
    if inferred_topic and inferred_topic != "travel":
        return "travel"

    return "off_topic"


def build_guide_chat_meta_reply(message):
    lowered = clean_text(message).lower()

    if re.search(r"\b(hi|hello|hey)\b", lowered):
        return "Hello. I am your TravelNex Guide. Ask me about destinations, itineraries, budgets, hotels, food, or the best time to visit."
    if re.search(r"\b(your name|who are you|what are you)\b", lowered):
        return "I am the TravelNex Guide. I focus only on trip planning, destination ideas, travel tips, food, stays, and day-wise plans."
    if re.search(r"\b(what can you do|help|capabilities)\b", lowered):
        return "\n".join([
            "I can help with:",
            "- Destination ideas and must-visit spots",
            "- Day-wise itineraries and trip budgets",
            "- Hotels, food, and best time to visit"
        ])
    if re.search(r"\b(how are you)\b", lowered):
        return "I am ready to help with your trip. Tell me where you want to go or what kind of travel plan you need."
    if re.search(r"\b(thank you|thanks)\b", lowered):
        return "You are welcome. If you want, I can help with your next destination, budget, or itinerary."

    return "I am your TravelNex Guide, so I stay focused on travel help only. Ask me about destinations, itineraries, budgets, food, or stays."


def build_guide_chat_off_topic_reply(destination="", place_name=""):
    topic = clean_text(place_name) or clean_text(destination)
    if topic:
        return (
            f"I am the TravelNex Guide, so I stay focused on travel for {topic}. "
            "Ask me about places to visit, best time, budget, hotels, food, or a day-wise plan."
        )

    return (
        "I am the TravelNex Guide, so I only help with travel. "
        "Ask me about destinations, itineraries, hotels, restaurants, budgets, or the best time to visit."
    )


def map_trip_type_for_chat_itinerary(value):
    lowered = clean_text(value).lower()
    if any(token in lowered for token in ["beach", "island", "coast", "sea"]):
        return "Beach"
    if any(token in lowered for token in ["hill", "mountain", "nature", "retreat"]):
        return "Hill Station"
    if any(token in lowered for token in ["adventure", "expedition", "trek", "rafting"]):
        return "Adventure"
    return "City Tour"


def parse_budget_amount(value, default=25000):
    numbers = [int(piece.replace(",", "")) for piece in re.findall(r"\d[\d,]*", clean_text(value))]
    if not numbers:
        return default
    if len(numbers) == 1:
        return numbers[0]
    return int(sum(numbers[:2]) / 2)


def build_compact_trip_plan_reply(topic, info, message):
    trip_days = extract_trip_days_from_message(message, 3)
    travel_type = map_trip_type_for_chat_itinerary(info.get("trip_type"))
    budget_amount = parse_budget_amount(info.get("avg_budget"))
    destination_name = info.get("name", "Destination")

    try:
        itinerary = get_itinerary(topic, trip_days, travel_type, budget_amount)
        days = itinerary.get("days", []) if isinstance(itinerary, dict) else []
        day_lines = []
        for day in days[:trip_days]:
            slots = day.get("slots", []) if isinstance(day, dict) else []
            names = [clean_text(slot.get("name")) for slot in slots[:3] if clean_text(slot.get("name"))]
            if names:
                day_lines.append(f"{day.get('title', 'Day')}: {' • '.join(names)}")
        if day_lines:
            return "\n".join([
                f"{destination_name} • {trip_days}-Day Plan",
                *day_lines,
                f"Best Time: {info['best_time']}",
                f"Budget: {info['avg_budget']}"
            ])
    except Exception:
        pass

    highlights = clean_list(info.get("highlights", [])) or ["Top spots", "Local food", "Relaxed evening"]
    padded = (highlights * 3)[:trip_days * 3]
    day_lines = []
    for index in range(trip_days):
        start = index * 3
        day_lines.append(f"Day {index + 1}: {' • '.join(padded[start:start+3])}")

    return "\n".join([
        f"{destination_name} • {trip_days}-Day Plan",
        *day_lines,
        f"Best Time: {info['best_time']}",
        f"Budget: {info['avg_budget']}"
    ])


def build_guide_chat_fallback(message, destination="", place_name=""):
    topic = infer_guide_chat_topic(message, destination, place_name) or "your trip"
    info = build_destination_fallback(topic if topic != "your trip" else "travel")
    hints = ", ".join(info.get("highlights", [])[:3]) or "best time, budget, and top places"
    user_message = clean_text(message, "this destination")
    intent = detect_guide_chat_intent(message)
    scope = detect_guide_chat_scope(message, destination, place_name)

    if scope == "meta":
        return build_guide_chat_meta_reply(message)
    if scope == "off_topic":
        return build_guide_chat_off_topic_reply(destination, place_name)

    if intent == "itinerary":
        return build_compact_trip_plan_reply(topic, info, user_message)
    if intent == "best_time":
        return "\n".join([
            f"Best Time: {info['best_time']}",
            f"Trip Style: {info['trip_type']}",
            f"Good For: {hints}"
        ])
    if intent == "budget":
        return "\n".join([
            f"Budget: {info['avg_budget']}",
            f"Ideal Stay: {info['ideal_days']}",
            f"Best For: {info['trip_type']}"
        ])
    if intent == "places":
        return "\n".join([
            f"Top Places in {info['name']}",
            *[f"• {item}" for item in info.get("highlights", [])[:4]]
        ])
    if intent == "food":
        return "\n".join([
            f"Food Tip for {info['name']}",
            "• Eat near the main sightseeing area",
            "• Keep one evening for local specialties",
            "• Match cafe stops with your route"
        ])

    return (
        f"I could not reach the live guide assistant just now, but here is a quick travel hint for {info['name']}. "
        f"It is best for a {info['trip_type'].lower()} and usually works well in {info['best_time']}. "
        f"Typical budget is {info['avg_budget']} and a good stay is {info['ideal_days']}. "
        f"If you are planning around \"{user_message}\", start with {hints}."
    )


def fetch_packages_from_db(destination=None):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        if destination:
            cursor.execute("""
                SELECT
                    id,
                    provider,
                    destination,
                    price_per_person,
                    days,
                    travel_type,
                    rating,
                    booking_url,
                    created_at
                FROM packages
                WHERE LOWER(destination) = LOWER(%s)
                ORDER BY rating DESC, price_per_person ASC
            """, (destination,))
        else:
            cursor.execute("""
                SELECT
                    id,
                    provider,
                    destination,
                    price_per_person,
                    days,
                    travel_type,
                    rating,
                    booking_url,
                    created_at
                FROM packages
                ORDER BY created_at DESC, rating DESC
            """)

        return cursor.fetchall()
    finally:
        cursor.close()
        db.close()


def parse_admin_package_payload(data):
    provider = data.get("provider", "").strip()
    destination = data.get("destination", "").strip()
    travel_type = data.get("travel_type", "").strip()
    url = data.get("url", "").strip()

    try:
        price = int(data.get("price", 0))
        days = int(data.get("days", 0))
        rating = float(data.get("rating", 4.0))
    except Exception:
        return None, "Invalid numeric values"

    if not provider or not destination or not travel_type or not url:
        return None, "Fill all fields"

    if price <= 0 or days <= 0:
        return None, "Price and days must be greater than 0"

    if rating < 0 or rating > 5:
        return None, "Rating must be between 0 and 5"

    return {
        "provider": provider,
        "destination": destination,
        "travel_type": travel_type,
        "url": url,
        "price": price,
        "days": days,
        "rating": rating,
    }, None


# ─────────────────────────────────────
# SIGNUP
# ─────────────────────────────────────
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"success": False, "message": "Fill all fields"})

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (username, password) VALUES (%s, %s)",
            (username, password)
        )
        db.commit()
        session["user"] = username
        return jsonify({"success": True, "username": username})
    except Exception:
        return jsonify({"success": False, "message": "Username already exists"})
    finally:
        cursor.close()
        db.close()


# ─────────────────────────────────────
# LOGIN
# ─────────────────────────────────────
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM users WHERE username=%s AND password=%s",
            (username, password)
        )
        user = cursor.fetchone()

        if user:
            session["user"] = username
            return jsonify({
                "success": True,
                "username": username,
                "role": user.get("role", "user")
            })

        return jsonify({"success": False, "message": "Wrong username or password"})
    finally:
        cursor.close()
        db.close()


# ─────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────
@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


# ─────────────────────────────────────
# SEARCH
# ─────────────────────────────────────
@app.route("/search", methods=["POST"])
def search():
    data = request.get_json() or {}
    username = session.get("user", "guest")

    destination = data.get("destination", "").strip()
    travel_type = data.get("travel_type", "Beach").strip()
    trip_category = data.get("trip_category", "Friends").strip()
    travel_date = data.get("travel_date", None)
    from_city = data.get("from_city", "").strip()

    try:
        budget = int(data.get("budget", 20000))
        days = int(data.get("days", 3))
        adults = int(data.get("adults", 2))
    except Exception:
        return jsonify({"success": False, "message": "Invalid number input"})

    if not destination:
        return jsonify({"success": False, "message": "Enter destination"})

    # Save search history
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute(
            """INSERT INTO search_history
               (username, destination, budget, days, travel_type)
               VALUES (%s, %s, %s, %s, %s)""",
            (username, destination, budget, days, travel_type)
        )
        db.commit()
    finally:
        cursor.close()
        db.close()

    # Show admin-added packages only when they match the searched destination.
    # The remaining slots are filled on the frontend with provider options
    # like MakeMyTrip/Goibibo instead of unrelated admin packages.
    db_packages = fetch_packages_from_db(destination)

    packages = score_and_rank_packages(
        raw_packages=db_packages,
        destination=destination,
        budget=budget,
        days=days,
        travel_type=travel_type,
        trip_category=trip_category
    )

    # Live direct search links as secondary options when DB packages are
    # limited, and as the full fallback when none are available.
    fallback_links = []
    if len(packages) < 5:
        fallback_links = build_live_search_links(
            destination=destination,
            days=days,
            adults=adults,
            travel_date=travel_date,
            from_city=from_city,
            trip_category=trip_category
        )

    itinerary = get_itinerary(destination, days, travel_type, budget)

    return jsonify({
        "success": True,
        "packages": packages,
        "fallback_links": fallback_links,
        "itinerary": itinerary
    })


# ─────────────────────────────────────
# SEARCH HISTORY
# ─────────────────────────────────────
@app.route("/history", methods=["GET"])
def history():
    username = session.get("user")

    if not username:
        return jsonify({"success": False, "message": "Not logged in", "history": []})

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            """SELECT destination, budget, days, travel_type,
                      DATE_FORMAT(searched_at, '%d %b %Y, %h:%i %p') AS searched_at
               FROM search_history
               WHERE username = %s
               ORDER BY searched_at DESC
               LIMIT 20""",
            (username,)
        )
        rows = cursor.fetchall()
        return jsonify({"success": True, "history": rows})
    finally:
        cursor.close()
        db.close()


# ─────────────────────────────────────
# AFFILIATE CLICK LOG
# ─────────────────────────────────────
@app.route("/book", methods=["POST"])
def book():
    data = request.get_json() or {}
    username = session.get("user", "guest")
    provider = data.get("provider", "").strip()
    destination = data.get("destination", "").strip()

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "INSERT INTO affiliate_clicks (username, provider, destination) VALUES (%s, %s, %s)",
            (username, provider, destination)
        )
        db.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    finally:
        cursor.close()
        db.close()


# ─────────────────────────────────────
# ADMIN — LIST PACKAGES
# ─────────────────────────────────────
@app.route("/admin/packages", methods=["GET"])
def admin_get_packages():
    username = session.get("user")
    role = get_logged_user_role(username)

    if role != "admin":
        return jsonify({"success": False, "message": "Admin only", "packages": []})

    rows = fetch_packages_from_db()
    return jsonify({"success": True, "packages": rows})


# ─────────────────────────────────────
# ADMIN — ADD PACKAGE
# ─────────────────────────────────────
@app.route("/admin/packages", methods=["POST"])
def admin_add_package():
    username = session.get("user")
    role = get_logged_user_role(username)

    if role != "admin":
        return jsonify({"success": False, "message": "Admin only"})

    payload, error = parse_admin_package_payload(request.get_json() or {})
    if error:
        return jsonify({"success": False, "message": error})

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("""
            INSERT INTO packages
            (provider, destination, price_per_person, days, travel_type, rating, booking_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            payload["provider"],
            payload["destination"],
            payload["price"],
            payload["days"],
            payload["travel_type"],
            payload["rating"],
            payload["url"],
        ))
        db.commit()
        return jsonify({"success": True, "message": "Package added"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    finally:
        cursor.close()
        db.close()


# ─────────────────────────────────────
# ADMIN — DELETE PACKAGE
# ─────────────────────────────────────
@app.route("/admin/packages/<int:pkg_id>", methods=["PUT"])
def admin_update_package(pkg_id):
    username = session.get("user")
    role = get_logged_user_role(username)

    if role != "admin":
        return jsonify({"success": False, "message": "Admin only"})

    payload, error = parse_admin_package_payload(request.get_json() or {})
    if error:
        return jsonify({"success": False, "message": error})

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("""
            UPDATE packages
            SET provider = %s,
                destination = %s,
                price_per_person = %s,
                days = %s,
                travel_type = %s,
                rating = %s,
                booking_url = %s
            WHERE id = %s
        """, (
            payload["provider"],
            payload["destination"],
            payload["price"],
            payload["days"],
            payload["travel_type"],
            payload["rating"],
            payload["url"],
            pkg_id,
        ))
        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Package not found"})

        return jsonify({"success": True, "message": "Package updated"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    finally:
        cursor.close()
        db.close()


@app.route("/admin/packages/<int:pkg_id>", methods=["DELETE"])
def admin_delete_package(pkg_id):
    username = session.get("user")
    role = get_logged_user_role(username)

    if role != "admin":
        return jsonify({"success": False, "message": "Admin only"})

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute("DELETE FROM packages WHERE id = %s", (pkg_id,))
        db.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    finally:
        cursor.close()
        db.close()



# ─────────────────────────────────────
# GUIDE — Identify Place (Gemini API)
# ─────────────────────────────────────
@app.route("/guide/identify", methods=["POST"])
def guide_identify():
    return guide_identify_fixed()


# ─────────────────────────────────────
# GUIDE — Destination Info (Gemini API)
# ─────────────────────────────────────
@app.route("/guide/destination", methods=["POST"])
def guide_destination():
    return guide_destination_gemini()


@app.route("/guide/photos", methods=["POST"])
def guide_photos():
    data  = request.get_json() or {}
    query = data.get("query", "").strip()
    count = min(int(data.get("count", 9)), 15)

    if not query:
        return jsonify({"success": False, "message": "No query"})

    try:
        resp = req_lib.get(
            "https://api.unsplash.com/search/photos",
            params={
                "query": query + " travel",
                "per_page": count,
                "orientation": "landscape"
            },
            headers={"Authorization": f"Client-ID {UNSPLASH_KEY}"},
            timeout=10
        )
        data_r = resp.json()
        photos = [
            {
                "url":   p["urls"]["regular"],
                "thumb": p["urls"]["small"],
                "name":  p.get("alt_description") or query,
            }
            for p in data_r.get("results", [])
        ]
        return jsonify({"success": True, "photos": photos})

    except Exception as e:
        return jsonify({"success": False, "message": str(e), "photos": []})


def guide_destination_fixed():
    return guide_destination_gemini()


def guide_photos_fixed():
    data = request.get_json() or {}
    raw_query = data.get("query", "")
    query = raw_query.strip() if isinstance(raw_query, str) else ""
    raw_queries = data.get("queries", [])
    count = min(int(data.get("count", 9)), 15)

    queries = []
    if isinstance(raw_queries, list):
        queries.extend(clean_list(raw_queries))
    if query:
        queries.insert(0, query)

    deduped_queries = []
    for item in queries:
        if item not in deduped_queries:
            deduped_queries.append(item)

    if not deduped_queries:
        return jsonify({"success": False, "message": "No query", "photos": []})

    unsplash_error = None

    try:
        photos = fetch_unsplash_photo_candidates(deduped_queries, count)
        if photos:
            return jsonify({
                "success": True,
                "photos": photos,
                "queries": deduped_queries,
                "source": "unsplash"
            })
        unsplash_error = ValueError("No destination photos found on Unsplash")
    except Exception as e:
        unsplash_error = e

    try:
        photos = fetch_pexels_photo_candidates(deduped_queries, count)
        if photos:
            return jsonify({
                "success": True,
                "photos": photos,
                "queries": deduped_queries,
                "source": "pexels",
                "message": "Unsplash was unavailable, so TravelNex used Pexels backup photos."
            })
        raise ValueError("No destination photos found on Pexels")
    except Exception as pexels_error:
        message = str(unsplash_error or pexels_error)
        if clean_text(PEXELS_KEY):
            message = f"{message} | Pexels backup failed: {pexels_error}"
        return jsonify({
            "success": False,
            "message": message,
            "photos": [],
            "queries": deduped_queries
        })


def guide_identify_fixed():
    data = request.get_json() or {}
    image_b64 = data.get("image_base64", "")
    media_type = data.get("media_type", "image/jpeg")
    file_name = clean_text(data.get("file_name"))

    if not image_b64:
        return jsonify({"success": False, "message": "No image provided"})

    try:
        info = normalize_identify_info(identify_place_with_gemini(image_b64, media_type))
        return jsonify({"success": True, "data": info, "source": "gemini"})
    except Exception as gemini_error:
        print(f"[Guide Identify Gemini] Error: {gemini_error}")
        hint_match = build_hint_identification(file_name)
        if hint_match:
            return jsonify({
                "success": True,
                "data": normalize_identify_info(hint_match),
                "source": "filename-fallback",
                "message": "TravelNex inferred this place from the uploaded file name because live image identify was unavailable."
            })
        error_info = classify_identify_error(str(gemini_error))
        fallback_info = build_identify_unavailable_fallback(error_info["reason"], file_name)
        return jsonify({
            "success": True,
            "data": normalize_identify_info(fallback_info, error_info["message"]),
            "source": "temporary-fallback",
            "message": error_info["message"]
        })


def guide_destination_gemini():
    data = request.get_json() or {}
    dest = data.get("destination", "").strip()

    if not dest:
        return jsonify({"success": False, "message": "No destination"})

    fallback = build_destination_fallback(dest)

    try:
        result = call_gemini(
            parts=[{
                "text": (
                    f'Travel info about "{dest}". Reply only as JSON with this exact shape: '
                    '{"name":"full name","description":"2 sentences for travelers",'
                    '"best_time":"e.g. Oct-Mar","avg_budget":"e.g. Rs. 15000-25000 / person",'
                    '"trip_type":"e.g. Beach Escape","ideal_days":"e.g. 4-6 days",'
                    '"highlights":["thing1","thing2","thing3","thing4"],'
                    '"photo_queries":["query 1","query 2","query 3","query 4"]}'
                )
            }],
            response_mime_type="application/json",
            temperature=0.4,
            max_output_tokens=650
        )
        info = merge_destination_info(dest, parse_json_object(extract_gemini_text(result)))
        return jsonify({"success": True, "data": info, "source": "gemini"})
    except Exception as e:
        print(f"[Guide Destination Gemini] Fallback for {dest}: {e}")
        return jsonify({"success": True, "data": fallback, "source": "fallback"})


@app.route("/guide/explore", methods=["POST"])
def guide_explore():
    data = request.get_json() or {}
    context = clean_text(data.get("context"))
    category_key = normalize_guide_explore_category(data.get("category"))

    try:
        count = max(1, min(int(data.get("count", 6)), 8))
    except Exception:
        count = 6

    if not context:
        return jsonify({"success": False, "message": "No place selected", "items": []})

    try:
        payload = fetch_geoapify_guide_explore_items(context, category_key, count)
        return jsonify({
            "success": True,
            "category": category_key,
            "label": GUIDE_EXPLORE_CATEGORY_CONFIG[category_key]["label"],
            "context": context,
            "resolved_context": payload["resolved_context"],
            "resolved_address": payload["resolved_address"],
            "items": payload["items"],
            "source": "geoapify"
        })
    except Exception as e:
        print(f"[Guide Explore] Error for {context} ({category_key}): {e}")
        return jsonify({
            "success": False,
            "message": "Could not load nearby places right now.",
            "category": category_key,
            "label": GUIDE_EXPLORE_CATEGORY_CONFIG[category_key]["label"],
            "context": context,
            "items": []
        })


@app.route("/guide/chat", methods=["POST"])
def guide_chat():
    data = request.get_json() or {}
    message = clean_text(data.get("message"))
    destination = clean_text(data.get("destination"))
    place_name = clean_text(data.get("place_name"))

    if not message:
        return jsonify({"success": False, "message": "Ask something"})

    topic = infer_guide_chat_topic(message, destination, place_name)
    topic_info = build_destination_fallback(topic)
    intent = detect_guide_chat_intent(message)
    scope = detect_guide_chat_scope(message, destination, place_name)
    days = extract_trip_days_from_message(message, 3)
    answer_style = "Reply in at most 6 short lines. Avoid long paragraphs."

    if scope == "meta":
        return jsonify({"success": True, "reply": build_guide_chat_meta_reply(message), "source": "guardrail"})
    if scope == "off_topic":
        return jsonify({"success": True, "reply": build_guide_chat_off_topic_reply(destination, place_name), "source": "guardrail"})

    if intent == "itinerary":
        answer_style = (
            f"Give a compact {days}-day plan. "
            "Use this format exactly: "
            f"{topic_info['name']} • {days}-Day Plan, then one short line each for Day 1, Day 2, and so on, then Budget and Best Time. "
            "Keep each day line short and easy to scan."
        )
    elif intent == "best_time":
        answer_style = "Use 3 short lines with labels: Best Time, Why, Tip."
    elif intent == "budget":
        answer_style = "Use 3 short lines with labels: Budget, Ideal Stay, Best For."
    elif intent == "places":
        answer_style = "Use a short heading plus 4 bullet points only."
    elif intent == "food":
        answer_style = "Use a short heading plus 3 or 4 bullet points only."

    try:
        result = call_gemini(
            parts=[{
                "text": (
                    "You are TravelNex Guide, a warm and focused travel assistant inside the TravelNex app. "
                    "Answer only travel-related questions. Never behave like a general chatbot. "
                    "Keep answers practical, friendly, concise, and in plain text only. "
                    "Help with destinations, itineraries, budgets, attractions, hotels, restaurants, local transport, and best time to visit. "
                    "If the app already gives you a place or destination context, answer for that exact place directly when useful. "
                    "If the place is obvious from the user message, use it directly. "
                    "Do not ask the user to repeat the place name for best time, budget, must-visit spots, food, hotels, or trip plans unless the request is genuinely ambiguous. "
                    f"{answer_style} "
                    f"Identified place context: {place_name or 'None'}. "
                    f"Location context: {destination or 'None'}. "
                    f"Current travel context: {topic_info['name']}. "
                    f"Travel best time: {topic_info['best_time']}. "
                    f"Travel budget: {topic_info['avg_budget']}. "
                    f"Travel style: {topic_info['trip_type']}. "
                    f"Travel highlights: {', '.join(topic_info['highlights'])}. "
                    f"User question: {message}"
                )
            }],
            response_mime_type="text/plain",
            temperature=0.6,
            max_output_tokens=500
        )
        answer = extract_gemini_text(result)
        if not answer:
            raise ValueError("Empty chat response")
        return jsonify({"success": True, "reply": answer, "source": "gemini"})
    except Exception as e:
        print(f"[Guide Chat] Fallback: {e}")
        return jsonify({
            "success": True,
            "reply": build_guide_chat_fallback(message, destination, place_name),
            "source": "fallback"
        })


app.view_functions["guide_identify"] = guide_identify_fixed
app.view_functions["guide_destination"] = guide_destination_gemini
app.view_functions["guide_photos"] = guide_photos_fixed


if __name__ == "__main__":
    app.run(debug=True)
