"""
recommendation.py
AI recommendation engine for TravelNex

Important:
- Scores only database packages
- Does NOT generate fake live package prices
"""


def to_float(val, default=0.0):
    try:
        return float(val)
    except Exception:
        return default


def to_int(val, default=0):
    try:
        return int(val)
    except Exception:
        return default


def normalize_db_package(pkg):
    return {
        "id": pkg.get("id"),
        "package_name": f"{pkg.get('destination', 'Travel')} Package",
        "provider": pkg.get("provider", "Unknown"),
        "destination": pkg.get("destination", ""),
        "price": to_float(pkg.get("price_per_person", 0)),
        "days": to_int(pkg.get("days", 0)),
        "nights": max(to_int(pkg.get("days", 1)) - 1, 0),
        "travel_type": pkg.get("travel_type", ""),
        "rating": to_float(pkg.get("rating", 4.0)),
        "booking_url": pkg.get("booking_url", ""),
        "source": "database"
    }


def get_destination_match_level(pkg_destination, user_destination):
    pkg_dest = str(pkg_destination or "").lower().strip()
    user_dest = str(user_destination or "").lower().strip()

    if not pkg_dest or not user_dest:
        return 0
    if pkg_dest == user_dest:
        return 2
    if user_dest in pkg_dest or pkg_dest in user_dest:
        return 1
    return 0


def score_package(pkg, destination, budget, days, travel_type, trip_category="Friends"):
    score = 0.0
    match_level = get_destination_match_level(pkg.get("destination", ""), destination)

    # Destination match -> 30
    if match_level == 2:
        score += 30
    elif match_level == 1:
        score += 22

    # Budget match -> 25
    price = to_float(pkg.get("price", 0))
    if price > 0:
        if price <= budget:
            score += 25
        elif price <= budget * 1.10:
            score += 18
        elif price <= budget * 1.20:
            score += 10
        else:
            score += 2

    # Duration match -> 20
    pkg_days = to_int(pkg.get("days", 0))
    if pkg_days == days:
        score += 20
    elif abs(pkg_days - days) == 1:
        score += 14
    elif abs(pkg_days - days) == 2:
        score += 8

    # Travel type match -> 15
    pkg_type = str(pkg.get("travel_type", "")).lower().strip()
    if pkg_type == travel_type.lower().strip():
        score += 15

    # Star rating bonus -> 10
    rating = to_float(pkg.get("rating", 4.0))
    score += min((rating / 5.0) * 10, 10)

    return round(score, 2)


def score_and_rank_packages(raw_packages, destination, budget, days, travel_type, trip_category="Friends"):
    if not raw_packages:
        return []

    normalized = [normalize_db_package(pkg) for pkg in raw_packages]
    scored_packages = []

    for pkg in normalized:
        ai_score = score_package(pkg, destination, budget, days, travel_type, trip_category)
        match_level = get_destination_match_level(pkg.get("destination", ""), destination)

        result = {
            **pkg,
            "trip_category": trip_category,
            "ai_score": ai_score,
            "match_pct": min(int(round(ai_score)), 100),
            "match_level": match_level,
            "is_exact_destination": match_level == 2
        }
        scored_packages.append(result)

    scored_packages.sort(
        key=lambda x: (x["match_level"], x["ai_score"], x["rating"], -x["price"] if x["price"] == 0 else -1 / x["price"]),
        reverse=True
    )

    return scored_packages[:5]
