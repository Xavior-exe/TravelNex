import re
import requests
from config import GEOAPIFY_KEY, OPENWEATHER_KEY


# ─────────────────────────────────────────
# Famous Beach Places (only first 2 used)
# ─────────────────────────────────────────
FAMOUS_PLACES = {
    "goa": [
        {"name": "Baga Beach", "desc": "Popular beach in North Goa", "rating": 4.7},
        {"name": "Calangute Beach", "desc": "Largest beach in Goa", "rating": 4.6},
        {"name": "Anjuna Beach", "desc": "Famous sunset beach", "rating": 4.6},
        {"name": "Candolim Beach", "desc": "Relaxing beach area", "rating": 4.5}
    ]
}

GOA_DAY_ONE_PLACES = [
    {"name": "Baga Beach", "desc": "Popular beach in North Goa", "rating": 4.7},
    {"name": "Calangute Beach", "desc": "Largest beach in Goa", "rating": 4.6},
    {"name": "Soneca Cola Beach Resort", "desc": "MDR49, Parven - 503702, Goa, India", "rating": 4.2},
]


# ─────────────────────────────────────────
# Destination Trip Types
# ─────────────────────────────────────────
DESTINATION_TYPES = {

    "goa": "Beach",
    "maldives": "Beach",
    "pondicherry": "Beach",
    "gokarna": "Beach",

    "manali": "Hill Station",
    "shimla": "Hill Station",
    "ooty": "Hill Station",
    "munnar": "Hill Station",

    "ladakh": "Adventure",
    "leh": "Adventure",
    "rishikesh": "Adventure",

    "delhi": "City Tour",
    "mumbai": "City Tour",
    "bangalore": "City Tour",
    "hyderabad": "City Tour"
}


def detect_trip_type(destination):
    return DESTINATION_TYPES.get(destination.lower(), "City Tour")


# ─────────────────────────────────────────
# API Category Mapping
# ─────────────────────────────────────────
GEOAPIFY_CATEGORIES = {

    "Beach": "beach,tourism.attraction,tourism.sights",
    "Hill Station": "natural.mountain,tourism.sights",
    "Adventure": "sport,tourism.attraction",
    "City Tour": "tourism.sights,tourism.attraction"
}


TIME_SLOTS = ["Morning", "Afternoon", "Evening"]


ICONS = {

    "Beach": ["🌅", "🏖️", "🌊"],
    "Hill Station": ["🏔️", "🌿", "🌄"],
    "Adventure": ["🧗", "🚵", "🏕️"],
    "City Tour": ["🏛️", "🛕", "🌆"]
}

UNWANTED_PLACE_TERMS = {
    "cemetery", "graveyard", "crematorium", "funeral", "burial", "memorial park"
}

TRAVEL_HIGHLIGHT_TERMS = {
    "beach", "fort", "palace", "temple", "church", "basilica", "cathedral", "museum",
    "waterfall", "lake", "river", "garden", "park", "market", "street", "viewpoint",
    "valley", "mountain", "island", "cave", "harbour", "harbor", "bridge", "monastery",
    "convent", "heritage", "sunset", "resort"
}

TRIP_TYPE_BOOST_TERMS = {
    "Beach": {"beach", "coast", "shore", "island", "harbour", "harbor", "resort"},
    "Hill Station": {"mountain", "hill", "valley", "lake", "waterfall", "garden", "viewpoint"},
    "Adventure": {"trek", "rafting", "camp", "climb", "adventure", "cave", "waterfall", "mountain"},
    "City Tour": {"fort", "palace", "temple", "church", "museum", "market", "street", "heritage"}
}


def normalize_place_key(name):
    return re.sub(r"[^a-z0-9]+", " ", str(name or "").lower()).strip()


def normalize_interest_text(*parts):
    return " ".join(normalize_place_key(part) for part in parts if part).strip()


def is_uninteresting_place(name, desc, categories):
    text = normalize_interest_text(name, desc, " ".join(categories or []))
    if not text:
        return True

    if any(term in text for term in UNWANTED_PLACE_TERMS):
        return True

    generic_names = {
        "tourist attraction", "point of interest", "landmark", "attraction"
    }
    return text in generic_names


def score_place_interest(name, desc, categories, rating, travel_type):
    text = normalize_interest_text(name, desc, " ".join(categories or []))
    score = float(rating or 0)

    score += sum(2 for term in TRAVEL_HIGHLIGHT_TERMS if term in text)
    score += sum(3 for term in TRIP_TYPE_BOOST_TERMS.get(travel_type, set()) if term in text)

    if "tourism" in text or "sights" in text or "attraction" in text:
        score += 1.5

    if any(term in text for term in {"beach", "fort", "palace", "waterfall", "lake", "museum", "market"}):
        score += 2

    return score


def dedupe_places(places):
    unique_places = []
    seen_names = set()

    for place in places or []:
        if not isinstance(place, dict):
            continue

        key = normalize_place_key(place.get("name"))
        if not key or key in seen_names:
            continue

        seen_names.add(key)
        unique_places.append(place)

    return unique_places


# ─────────────────────────────────────────
# Fetch Places from Geoapify
# ─────────────────────────────────────────
def fetch_geoapify_places(destination, travel_type):

    try:

        geo_url = "https://api.geoapify.com/v1/geocode/search"

        geo_params = {
            "text": destination,
            "limit": 1,
            "apiKey": GEOAPIFY_KEY
        }

        geo_res = requests.get(geo_url, params=geo_params, timeout=20)
        geo_data = geo_res.json()

        if not geo_data.get("features"):
            return None

        lon, lat = geo_data["features"][0]["geometry"]["coordinates"]

        places_url = "https://api.geoapify.com/v2/places"

        params = {

            "categories": GEOAPIFY_CATEGORIES.get(travel_type),
            "filter": f"circle:{lon},{lat},30000",
            "limit": 40,
            "apiKey": GEOAPIFY_KEY
        }

        response = requests.get(places_url, params=params, timeout=20)

        if response.status_code != 200:
            return None

        data = response.json()

        places = []

        for f in data.get("features", []):

            props = f.get("properties", {})
            name = props.get("name")

            if not name:
                continue

            desc = props.get("address_line2", "Tourist attraction")
            rating = props.get("rating", 4.2)
            categories = props.get("categories", []) if isinstance(props.get("categories"), list) else []

            if is_uninteresting_place(name, desc, categories):
                continue

            places.append({
                "name": name,
                "desc": desc,
                "rating": rating,
                "_score": score_place_interest(name, desc, categories, rating, travel_type)
            })

        if not places:
            return None

        places.sort(key=lambda item: (item.get("_score", 0), item.get("rating", 0)), reverse=True)
        cleaned_places = []
        for place in dedupe_places(places):
            cleaned_places.append({
                "name": place["name"],
                "desc": place["desc"],
                "rating": place["rating"]
            })

        return cleaned_places if cleaned_places else None

    except:
        return None


# ─────────────────────────────────────────
# Weather API
# ─────────────────────────────────────────
def fetch_weather(destination):

    try:

        url = "https://api.openweathermap.org/data/2.5/weather"

        params = {
            "q": destination,
            "appid": OPENWEATHER_KEY,
            "units": "metric"
        }

        res = requests.get(url, params=params, timeout=20)
        data = res.json()

        if data.get("cod") != 200:
            return None

        return {
            "temp": round(data["main"]["temp"]),
            "condition": data["weather"][0]["main"],
            "description": data["weather"][0]["description"]
        }

    except:
        return None


# ─────────────────────────────────────────
# Build Itinerary
# ─────────────────────────────────────────
def build_days(places, days, travel_type):

    icons = ICONS.get(travel_type)

    total = len(places)

    day_list = []

    for d in range(days):

        slots = []

        for s, time in enumerate(TIME_SLOTS):

            place = places[(d * 3 + s) % total]

            slots.append({
                "time": time,
                "icon": icons[s],
                "name": place["name"],
                "desc": place["desc"],
                "rating": place["rating"]
            })

        day_list.append({
            "title": f"Day {d+1}",
            "slots": slots
        })

    return day_list


# ─────────────────────────────────────────
# Budget Calculation
# ─────────────────────────────────────────
def calc_budget(days, travel_type, user_budget):

    proportions = {

        "Beach": {"hotel": 0.45, "food": 0.20, "travel": 0.15, "activities": 0.20},
        "Hill Station": {"hotel": 0.50, "food": 0.20, "travel": 0.20, "activities": 0.10},
        "Adventure": {"hotel": 0.35, "food": 0.15, "travel": 0.20, "activities": 0.30},
        "City Tour": {"hotel": 0.40, "food": 0.25, "travel": 0.20, "activities": 0.15}
    }

    p = proportions.get(travel_type)

    return {
        "hotel": int(user_budget * p["hotel"]),
        "food": int(user_budget * p["food"]),
        "travel": int(user_budget * p["travel"]),
        "activities": int(user_budget * p["activities"]),
        "per_day_budget": int(user_budget / days),
        "total": user_budget
    }


# ─────────────────────────────────────────
# MAIN FUNCTION
# ─────────────────────────────────────────
def get_itinerary(destination, days, travel_type, user_budget):

    if not travel_type:
        travel_type = detect_trip_type(destination)

    places = fetch_geoapify_places(destination, travel_type)

    dest = destination.lower()

    if dest == "goa":
        if places:
            places = dedupe_places(GOA_DAY_ONE_PLACES + places)
        else:
            places = dedupe_places(GOA_DAY_ONE_PLACES + FAMOUS_PLACES.get(dest, []))
    elif travel_type == "Beach" and dest in FAMOUS_PLACES:

        famous = FAMOUS_PLACES[dest][:2]

        if places:
            places = dedupe_places(famous + places)
        else:
            places = dedupe_places(famous)

    if not places:

        places = [
            {
                "name": f"{destination} Attraction {i+1}",
                "desc": f"Popular tourist attraction in {destination}",
                "rating": 4.0
            }
            for i in range(12)
        ]

    itinerary = build_days(places, days, travel_type)

    weather = fetch_weather(destination)

    budget = calc_budget(days, travel_type, user_budget)

    return {
        "trip_type": travel_type,
        "days": itinerary,
        "budget": budget,
        "weather": weather
    }
