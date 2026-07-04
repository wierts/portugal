#!/usr/bin/env python3
"""
Portugal Roadtrip -- foto-downloadscript
=========================================
Zoekt en downloadt automatisch 7 unieke, rechtenvrije foto's (een per
reisdag) via de gratis Openverse API (api.openverse.org) en zet ze met de
juiste bestandsnaam in de map "images/", precies zoals index.html verwacht.

Openverse is een zoekmachine van WordPress/Creative Commons die alleen
vrij te gebruiken beelden indexeert (o.a. van Wikimedia Commons, Flickr
Commons, Museum-collecties). Geen API-key nodig voor dit gebruik.
Documentatie: https://api.openverse.org/v1/

Gebruik:
    python3 download_photos.py

Vereisten:
    Python 3.7+  (gebruikt alleen de standaardbibliotheek, geen 'requests' nodig)

Werking:
    - Voor elke dag wordt een zoekopdracht naar de Openverse API gestuurd.
    - Van de resultaten wordt de eerste bruikbare, landscape-georiënteerde
      foto gedownload naar images/<bestandsnaam>.jpg
    - Licentie- en bronvermelding wordt weggeschreven naar images/credits.txt
      (verplicht bij Creative Commons "BY"-licenties).

Als een dag geen goed resultaat oplevert, print het script een duidelijke
melding met een directe zoeklink zodat je zelf een alternatief kunt kiezen
en handmatig kunt downloaden.
"""

import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error

OUTPUT_DIR = "images"
API_BASE = "https://api.openverse.org/v1/images/"
HEADERS = {
    "User-Agent": "PortugalRoadtripPhotoDownloader/1.0 (persoonlijk reisproject)"
}

# Een zoekopdracht en bestandsnaam per reisdag.
# "query" mag je aanpassen als je liever een ander soort foto wilt.
DAYS = [
    {
        "filename": "dag01-porto.jpg",
        "label": "Dag 1-2: Porto",
        "query": "Porto Ribeira Douro river Portugal",
    },
    {
        "filename": "dag02-douro.jpg",
        "label": "Dag 3-4: Douro-vallei",
        "query": "Douro valley vineyard terraces Portugal",
    },
    {
        "filename": "dag03-aveiro.jpg",
        "label": "Dag 5: Aveiro",
        "query": "Aveiro Portugal canal moliceiro boats",
    },
    {
        "filename": "dag04-nazare.jpg",
        "label": "Dag 6: Batalha, Alcobaca & Nazare",
        "query": "Nazare Portugal cliffs ocean",
    },
    {
        "filename": "dag05-obidos.jpg",
        "label": "Dag 6-7: Obidos",
        "query": "Obidos Portugal medieval town walls",
    },
    {
        "filename": "dag06-sintra.jpg",
        "label": "Dag 8: Mafra & Sintra",
        "query": "Pena Palace Sintra Portugal",
    },
    {
        "filename": "dag07-lisboa.jpg",
        "label": "Dag 8-10: Lissabon",
        "query": "Lisbon Portugal tram Alfama",
    },
]

# Alleen deze licenties toestaan (allemaal vrij te gebruiken, ook commercieel,
# met naamsvermelding). Sluit NC-licenties (niet-commercieel) uit voor de
# zekerheid, en CC0/publiek domein worden ook meegenomen.
ALLOWED_LICENSES = {"cc0", "pdm", "by", "by-sa"}


def api_search(query: str, page_size: int = 10) -> list:
    """Zoek foto's via de Openverse API en geef de resultatenlijst terug."""
    params = {
        "q": query,
        "page_size": page_size,
        "license_type": "commercial,modification",  # alleen vrij te gebruiken werk
        "orientation": "landscape",
        "mature": "false",
    }
    url = API_BASE + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data.get("results", [])
    except urllib.error.HTTPError as e:
        print(f"  FOUT bij zoeken (HTTP {e.code}): {url}")
        return []
    except urllib.error.URLError as e:
        print(f"  FOUT bij zoeken (netwerk): {e.reason}")
        return []
    except Exception as e:
        print(f"  FOUT bij zoeken (onbekend): {e}")
        return []


def pick_best_result(results: list) -> dict:
    """Kies het eerste resultaat met een toegestane licentie en een echte URL."""
    for r in results:
        license_type = (r.get("license") or "").lower()
        if license_type in ALLOWED_LICENSES and r.get("url"):
            return r
    # Val terug op het eerste resultaat met een URL, ongeacht licentie-filter
    for r in results:
        if r.get("url"):
            return r
    return {}


def download_file(url: str, dest_path: str) -> bool:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as response, open(dest_path, "wb") as out_file:
            out_file.write(response.read())
        return True
    except urllib.error.HTTPError as e:
        print(f"  FOUT (HTTP {e.code}) bij downloaden: {url}")
        return False
    except urllib.error.URLError as e:
        print(f"  FOUT (netwerk) bij downloaden: {e.reason}")
        return False
    except Exception as e:
        print(f"  FOUT (onbekend) bij downloaden: {e}")
        return False


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Foto's worden gezocht en gedownload naar: {os.path.abspath(OUTPUT_DIR)}\n")

    successes = []
    failures = []

    for day in DAYS:
        print(f"[{day['label']}] zoeken op Openverse: \"{day['query']}\"")
        results = api_search(day["query"])

        if not results:
            zoek_url = "https://openverse.org/search/?q=" + urllib.parse.quote(day["query"])
            print(f"  Geen resultaten gevonden.")
            print(f"  -> Zoek zelf handmatig: {zoek_url}\n")
            failures.append(day)
            continue

        best = pick_best_result(results)
        if not best:
            print(f"  Geen bruikbaar resultaat (geen directe URL).\n")
            failures.append(day)
            continue

        dest_path = os.path.join(OUTPUT_DIR, day["filename"])
        photo_url = best["url"]
        title = best.get("title", "onbekende titel")
        creator = best.get("creator", "onbekende maker")
        license_type = best.get("license", "onbekend")
        license_version = best.get("license_version", "")
        source_page = best.get("foreign_landing_url", "")

        print(f"  gevonden: \"{title}\" door {creator} (licentie: {license_type} {license_version})")
        print(f"  downloaden van: {photo_url}")

        ok = download_file(photo_url, dest_path)
        if ok:
            size_kb = os.path.getsize(dest_path) / 1024
            print(f"  OK ({size_kb:.0f} KB) -> {day['filename']}\n")
            successes.append({**day, **best})
        else:
            print(f"  -> Bekijk het resultaat handmatig: {source_page}\n")
            failures.append(day)

    # Credits-bestand wegschrijven (verplicht bij CC-BY / CC-BY-SA licenties)
    credits_path = os.path.join(OUTPUT_DIR, "credits.txt")
    with open(credits_path, "w", encoding="utf-8") as f:
        f.write("Fotocredits -- Portugal Roadtrip\n")
        f.write("================================\n\n")
        f.write("Foto's gevonden via Openverse (openverse.org), een zoekmachine\n")
        f.write("voor vrij te gebruiken media. Onderstaande bronvermelding is\n")
        f.write("vereist bij de meeste Creative Commons-licenties.\n\n")
        for p in successes:
            f.write(f"- {p['filename']} ({p['label']})\n")
            f.write(f"  Titel: {p.get('title', 'onbekend')}\n")
            f.write(f"  Maker: {p.get('creator', 'onbekend')}\n")
            f.write(f"  Licentie: {p.get('license', 'onbekend')} {p.get('license_version', '')}\n")
            f.write(f"  Bron: {p.get('foreign_landing_url', 'onbekend')}\n\n")

    print("=" * 60)
    print(f"Klaar: {len(successes)} van {len(DAYS)} foto's gedownload.")
    if failures:
        print(f"Mislukt: {len(failures)} -- zie meldingen hierboven voor handmatige alternatieven:")
        for f_day in failures:
            print(f"  - {f_day['label']} ({f_day['filename']})")
    print(f"Credits weggeschreven naar: {credits_path}")
    print("\nZet de map 'images/' naast index.html, hotels.html en")
    print("restaurants.html in dezelfde GitHub-repo en de foto's verschijnen")
    print("automatisch op de site.")


if __name__ == "__main__":
    main()
