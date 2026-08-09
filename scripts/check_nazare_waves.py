#!/usr/bin/env python3
"""
Golfalert Nazaré
----------------
Haalt de golfvoorspelling voor Praia do Norte (Nazaré) op via de gratis
Open-Meteo Marine API en stuurt een OneSignal-pushmelding zodra de
voorspelde golfhoogte de ingestelde drempel bereikt of overschrijdt.

Bedoeld om via een GitHub Action (cron) periodiek te draaien.

Instellingen (via omgevingsvariabelen, met defaults):
- WAVE_THRESHOLD_M      : drempelwaarde in meter (default 3.0)
- ALERT_START_DATE      : alerts pas vanaf deze datum, YYYY-MM-DD (default 2026-09-01)
- FORECAST_DAYS         : hoeveel dagen vooruit checken (default 7, max 10 bij Open-Meteo)
- NAZARE_LAT / NAZARE_LON : coördinaten Praia do Norte (default 39.6013 / -9.0705)
- STATE_FILE            : pad naar state-bestand dat onthoudt wanneer al gealarmeerd is
"""

import json
import os
import sys
import urllib.request
from datetime import date, datetime

WAVE_THRESHOLD_M = float(os.environ.get("WAVE_THRESHOLD_M", "3.0"))
ALERT_START_DATE = os.environ.get("ALERT_START_DATE", "2026-09-01")
FORECAST_DAYS = int(os.environ.get("FORECAST_DAYS", "7"))
LAT = os.environ.get("NAZARE_LAT", "39.6013")
LON = os.environ.get("NAZARE_LON", "-9.0705")
STATE_FILE = os.environ.get("STATE_FILE", "data/nazare-golfalert-state.json")

ONESIGNAL_APP_ID = os.environ.get("ONESIGNAL_APP_ID")
ONESIGNAL_REST_API_KEY = os.environ.get("ONESIGNAL_REST_API_KEY")

MARINE_API_URL = (
    "https://marine-api.open-meteo.com/v1/marine"
    f"?latitude={LAT}&longitude={LON}"
    "&hourly=wave_height,wave_period,wave_direction"
    "&timezone=Europe%2FLisbon"
    f"&forecast_days={FORECAST_DAYS}"
)


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {"last_alerted_date": None}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)
        f.write("\n")


def fetch_forecast():
    with urllib.request.urlopen(MARINE_API_URL, timeout=30) as resp:
        return json.load(resp)


def max_height_per_day(data):
    """Geeft per datum (YYYY-MM-DD) de hoogste voorspelde golfhoogte in meter."""
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    heights = hourly.get("wave_height", [])
    per_day = {}
    for t, h in zip(times, heights):
        if h is None:
            continue
        day = t.split("T")[0]
        per_day[day] = max(per_day.get(day, 0.0), float(h))
    return per_day


def send_onesignal_notification(day_str, height_m):
    if not ONESIGNAL_APP_ID or not ONESIGNAL_REST_API_KEY:
        print("ONESIGNAL_APP_ID of ONESIGNAL_REST_API_KEY ontbreekt — melding overgeslagen.")
        return False

    dt = datetime.strptime(day_str, "%Y-%m-%d")
    dag_nl = dt.strftime("%A %d %B").lower()

    payload = {
        "app_id": ONESIGNAL_APP_ID,
        "included_segments": ["Subscribed Users"],
        "headings": {"en": "🌊 Golfalert Nazaré"},
        "contents": {
            "en": f"Op {dag_nl} worden golven van ongeveer {height_m:.1f}m verwacht bij Nazaré (Praia do Norte)."
        },
        "url": "https://wierts.github.io/portugal/actueel.html",
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
    today = date.today()
    start = datetime.strptime(ALERT_START_DATE, "%Y-%m-%d").date()

    if today < start:
        print(f"Vandaag ({today}) is nog voor de alert-startdatum ({start}) — niets te doen.")
        return

    state = load_state()
    last_alerted = state.get("last_alerted_date")

    try:
        data = fetch_forecast()
    except Exception as e:
        print("Kon golfvoorspelling niet ophalen:", e)
        sys.exit(0)  # geen harde failure van de workflow bij een tijdelijke API-storing

    per_day = max_height_per_day(data)

    # Alleen dagen vanaf vandaag én vanaf de alert-startdatum meenemen
    relevant_days = sorted(
        d for d in per_day
        if datetime.strptime(d, "%Y-%m-%d").date() >= max(today, start)
    )

    for day in relevant_days:
        height = per_day[day]
        if height < WAVE_THRESHOLD_M:
            continue
        if last_alerted == day:
            # Voor deze dag is al eens een melding gestuurd
            continue

        print(f"Drempel overschreden op {day}: {height:.1f}m (drempel {WAVE_THRESHOLD_M}m)")
        sent = send_onesignal_notification(day, height)
        if sent:
            state["last_alerted_date"] = day
            save_state(state)
        # Stuur er per run maar één, om spam te voorkomen
        return

    print("Geen nieuwe drempeloverschrijding gevonden.")


if __name__ == "__main__":
    main()
