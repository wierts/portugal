#!/usr/bin/env python3
"""
Bosbrand-alert langs de route
------------------------------
Haalt actuele hitte-detecties op via de gratis NASA FIRMS API (VIIRS-satellieten)
voor heel Portugal, en stuurt een OneSignal-pushmelding zodra er een nieuwe
detectie binnen de ingestelde afstand van een routeplaats wordt gevonden.

Bedoeld om via een GitHub Action (cron, 2x per dag) periodiek te draaien.

Instellingen (via omgevingsvariabelen, met defaults):
- FIRMS_MAP_KEY      : gratis API-key, aan te vragen op
                       https://firms.modaps.eosdis.nasa.gov/api/map_key/
- ALERT_RADIUS_KM    : afstand tot een routeplaats om als "dichtbij" te gelden (default 30)
- DAY_RANGE          : hoeveel dagen terugkijken bij FIRMS (default 1)
- STATE_FILE         : pad naar state-bestand dat onthoudt welke detecties al gemeld zijn
"""

import csv
import io
import json
import math
import os
import sys
import urllib.request
from datetime import date, datetime, timedelta

FIRMS_MAP_KEY = os.environ.get("FIRMS_MAP_KEY")
ALERT_RADIUS_KM = float(os.environ.get("ALERT_RADIUS_KM", "30"))
DAY_RANGE = int(os.environ.get("DAY_RANGE", "1"))
STATE_FILE = os.environ.get("STATE_FILE", "data/fire-alert-state.json")
STATE_MAX_AGE_DAYS = 7

ONESIGNAL_APP_ID = os.environ.get("ONESIGNAL_APP_ID")
ONESIGNAL_REST_API_KEY = os.environ.get("ONESIGNAL_REST_API_KEY")

# Zelfde bronnen als de kaart op actueel.html
FIRMS_SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT"]
FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/country/csv/{key}/{source}/PRT/{days}"

# Zelfde routeplaatsen als route.html
ROUTE_POINTS = [
    ("Porto", 41.1579, -8.6291),
    ("Vila Nova de Gaia", 41.1289, -8.6106),
    ("Amarante", 41.2694, -8.0785),
    ("Aveiro", 40.6405, -8.6538),
    ("Costa Nova", 40.6083, -8.7469),
    ("Batalha", 39.6597, -8.8254),
    ("Alcobaça", 39.5470, -8.9800),
    ("Nazaré", 39.6010, -9.0700),
    ("Óbidos", 39.3606, -9.1570),
    ("Mafra", 38.9376, -9.3327),
    ("Sintra", 38.7979, -9.3906),
    ("Lissabon", 38.7223, -9.1393),
]


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {"alerted": {}}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2, sort_keys=True)
        f.write("\n")


def prune_state(state):
    cutoff = date.today() - timedelta(days=STATE_MAX_AGE_DAYS)
    alerted = state.get("alerted", {})
    state["alerted"] = {
        key: seen_date
        for key, seen_date in alerted.items()
        if datetime.strptime(seen_date, "%Y-%m-%d").date() >= cutoff
    }
    return state


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_route_point(lat, lon):
    best = None
    for naam, plat, plon in ROUTE_POINTS:
        d = haversine_km(lat, lon, plat, plon)
        if best is None or d < best[1]:
            best = (naam, d)
    return best


def fetch_hotspots():
    """Haalt hitte-detecties op voor Portugal, van alle geconfigureerde bronnen."""
    rows = []
    for source in FIRMS_SOURCES:
        url = FIRMS_URL.format(key=FIRMS_MAP_KEY, source=source, days=DAY_RANGE)
        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                text = resp.read().decode("utf-8")
        except Exception as e:
            print(f"Kon FIRMS-data voor bron {source} niet ophalen: {e}")
            continue

        # Bij een ongeldige/verlopen key of foutmelding stuurt FIRMS platte tekst
        # terug in plaats van CSV — dat herkennen we aan het ontbreken van de
        # verwachte kolomkop.
        if "latitude" not in text.splitlines()[0].lower() if text.splitlines() else True:
            print(f"Onverwachte FIRMS-response voor bron {source}: {text[:200]!r}")
            continue

        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            try:
                lat = float(row["latitude"])
                lon = float(row["longitude"])
            except (KeyError, ValueError):
                continue
            rows.append(
                {
                    "lat": lat,
                    "lon": lon,
                    "acq_date": row.get("acq_date", ""),
                    "confidence": row.get("confidence", ""),
                    "frp": row.get("frp", ""),
                    "source": source,
                }
            )
    return rows


def send_onesignal_notification(nieuwe):
    if not ONESIGNAL_APP_ID or not ONESIGNAL_REST_API_KEY:
        print("ONESIGNAL_APP_ID of ONESIGNAL_REST_API_KEY ontbreekt — melding overgeslagen.")
        return False

    # Groepeer per dichtstbijzijnde routeplaats voor een leesbaar berichtje
    per_plaats = {}
    for item in nieuwe:
        naam, afstand = item["nearest"]
        prev = per_plaats.get(naam)
        if prev is None or afstand < prev:
            per_plaats[naam] = afstand

    plekken = sorted(per_plaats.items(), key=lambda kv: kv[1])
    beschrijving = ", ".join(f"{naam} (~{afstand:.0f} km)" for naam, afstand in plekken[:4])
    if len(plekken) > 4:
        beschrijving += f" en {len(plekken) - 4} andere plek(ken)"

    payload = {
        "app_id": ONESIGNAL_APP_ID,
        "included_segments": ["Total Subscriptions"],
        "headings": {"en": "🔥 Bosbrand-alert bij de route"},
        "contents": {
            "en": f"Nieuwe hitte-detectie binnen {ALERT_RADIUS_KM:.0f} km van: {beschrijving}. Check de kaart voor details."
        },
        "url": "https://wierts.github.io/portugal/actueel.html#bosbranden",
    }

    req = urllib.request.Request(
        "https://onesignal.com/api/v1/notifications",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Key {ONESIGNAL_REST_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print("OneSignal response:", resp.read().decode("utf-8"))
        return True
    except Exception as e:
        print("Fout bij versturen OneSignal-melding:", e)
        return False


def main():
    if not FIRMS_MAP_KEY:
        print("FIRMS_MAP_KEY ontbreekt — sla check over. Zie README-pushmeldingen.md.")
        sys.exit(0)  # geen harde failure: secret kan later alsnog toegevoegd worden

    state = prune_state(load_state())
    alerted = state.get("alerted", {})

    hotspots = fetch_hotspots()
    print(f"{len(hotspots)} hitte-detecties opgehaald voor Portugal.")

    nabij = []
    for h in hotspots:
        naam, afstand = nearest_route_point(h["lat"], h["lon"])
        if afstand > ALERT_RADIUS_KM:
            continue
        key = f"{h['acq_date']}_{round(h['lat'], 2)}_{round(h['lon'], 2)}"
        h["key"] = key
        h["nearest"] = (naam, afstand)
        nabij.append(h)

    nieuwe = [h for h in nabij if h["key"] not in alerted]

    print(f"{len(nabij)} detecties binnen {ALERT_RADIUS_KM:.0f} km van de route, waarvan {len(nieuwe)} nieuw.")

    if not nieuwe:
        save_state(state)  # ook opslaan als er alleen geprunede entries wegvielen
        print("Geen nieuwe brand-detecties bij de route — geen melding verstuurd.")
        return

    sent = send_onesignal_notification(nieuwe)
    if sent:
        for h in nieuwe:
            alerted[h["key"]] = h["acq_date"] or date.today().isoformat()
        state["alerted"] = alerted

    save_state(state)


if __name__ == "__main__":
    main()
