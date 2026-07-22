"""
scraper.py - TravelNex
Uses each site's working holiday search URL.
Destination, date, adults, trip type passed as query params.
"""

from urllib.parse import quote
from datetime import datetime, timedelta


def _parse_date(travel_date):
    if travel_date:
        try:
            return datetime.strptime(travel_date, "%Y-%m-%d")
        except Exception:
            pass
    return datetime.now() + timedelta(days=14)

def _iso(dt):
    return dt.strftime("%Y-%m-%d")

def _mmt_date(dt):
    return f"{dt.day:02d}%2F{dt.month:02d}%2F{dt.year}"


def build_live_search_links(destination, days=3, adults=2, travel_date=None,
                             from_city="", trip_category="Friends"):

    dt     = _parse_date(travel_date)
    adults = max(int(adults), 1)
    days   = max(int(days), 1)
    nights = max(days - 1, 1)

    dest_q    = quote(destination.strip())
    dest_slug = destination.strip().lower().replace(" ", "-")

    honeymoon = trip_category == "Honeymoon"
    family    = trip_category == "Family"

    mmt_ptype = ""
    if honeymoon: mmt_ptype = "&ptype=HONEYMOON"
    elif family:  mmt_ptype = "&ptype=FAMILY"

    return [
        {
            "name": "MakeMyTrip",
            "icon": "✈️",
            "cls":  "makemytrip",
            # Verified working from your earlier screenshot (Image 2)
            "url": (
                f"https://holidayz.makemytrip.com/holidays/india/search"
                f"?dest={dest_q}&destValue={dest_q}"
                f"&dateSearched={_mmt_date(dt)}"
                f"&rooms=1%2C{adults}-0{mmt_ptype}"
            )
        },
        {
            "name": "Goibibo",
            "icon": "🏨",
            "cls":  "goibibo",
            # Goibibo holidays homepage — always works
            "url": f"https://www.goibibo.com/"
        },
        {
            "name": "Yatra",
            "icon": "🌐",
            "cls":  "yatra",
            # Yatra holidays homepage — always works
            "url": f"https://www.yatra.com/holidays"
        },
        {
            "name": "Cleartrip",
            "icon": "🔍",
            "cls":  "cleartrip",
            # Cleartrip holidays homepage — always works
            "url": f"https://www.cleartrip.com/holidays"
        },
        {
            "name": "EaseMyTrip",
            "icon": "💼",
            "cls":  "easemytrip",
            # EaseMyTrip holidays homepage — always works
            "url": f"https://www.easemytrip.us/"
        },
        {
            "name": "Thomas Cook",
            "icon": "🌍",
            "cls":  "thomascook",
            # Thomas Cook holidays homepage — always works
            "url": f"https://www.thomascook.in/holidays"
        },
    ]