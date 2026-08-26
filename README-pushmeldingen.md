# Pushmeldingen instellen (eenmalig, ±10 minuten)

De site kan nu echte pushmeldingen sturen — ook als de app dicht is — via **OneSignal**
(gratis). Dit vereist een account dat ik niet voor je kan aanmaken (account + e-mail
nodig), maar de rest (code, automatisering) staat al klaar. Zo rond je het af:

## 1. Maak een gratis OneSignal-account
1. Ga naar https://onesignal.com en maak een gratis account.
2. Maak een nieuwe app aan, kies **Web Push** als platform.
3. Site-URL: `https://wierts.github.io/portugal/`
4. Kies bij "Existing Service Worker" / "Typical Site" de optie dat je al een eigen
   service worker hebt (`sw.js` in de root) — OneSignal geeft dan geen extra
   worker-bestanden, want die is al verwerkt in `sw.js` van deze site.

## 2. Vind je App ID en REST API Key
In het OneSignal dashboard: **Settings → Keys & IDs**.
- App ID: ✅ al ingevuld — `262739ee-5c84-49ed-af8a-c60bc2c86958`
- Kopieer nog de **REST API Key** (staat op diezelfde pagina)

Let op: de "Apple iOS (APNs)"-configuratiepagina (met Key ID/Team ID/.p8-bestand) kun je
negeren — die is voor een native App Store-app en niet nodig voor onze Web Push-opzet.

## 3. App ID staat al in de code
`onesignal-init.js` bevat al de juiste App ID:
```js
const ONESIGNAL_APP_ID = "262739ee-5c84-49ed-af8a-c60bc2c86958";
```
Niets meer te doen hier.

## 4. Zet de sleutels als GitHub-secrets
In de GitHub-repo (`wierts/portugal`): **Settings → Secrets and variables → Actions →
New repository secret**. Voeg twee secrets toe. Exact formaat — geen quotes, geen
prefix, geen spaties ervoor of erna, gewoon de kale waarde plakken:

| Secret name | Value |
|---|---|
| `ONESIGNAL_APP_ID` | `262739ee-5c84-49ed-af8a-c60bc2c86958` |
| `ONESIGNAL_REST_API_KEY` | `os_v2_app_...` (de volledige sleutel die je van OneSignal kreeg, precies zoals gekopieerd) |

Let op: **niet** zelf "Key " of "Basic " ervoor zetten — dat voegt de GitHub Action
(`notify-on-update.yml`) automatisch toe in de Authorization-header
(`Authorization: Key os_v2_app_...`, het huidige verplichte formaat voor OneSignal's
nieuwe v2 API-sleutels).

Dit zijn de sleutels die de GitHub Action (`.github/workflows/notify-on-update.yml`)
gebruikt om automatisch een melding te versturen bij elke update van de site.

## 5. Commit & push alles
Alle bestanden staan al klaar in de projectmap, maar zijn nog niet naar GitHub
gepusht (dat kan ik zelf niet vanuit hier). Commit en push zoals je gewend bent.

## 6. Zet meldingen aan op je iPhone/iPad
1. Zorg dat de site als app op je beginscherm staat (zie eerdere instructies).
2. Open de app, tik op **"🔔 Zet meldingen aan"** op de homepage.
3. Sta de systeemmelding van iOS toe.

Vanaf dat moment krijg je automatisch een melding — ook als de app dicht is — zodra
er iets aan de reisgids verandert en dat gepusht wordt naar GitHub.

## 7. Bosbrand-alert bij de route (optioneel, ±5 minuten)
Naast meldingen bij site-updates kan de site ook automatisch waarschuwen zodra er
een bosbrand wordt gedetecteerd binnen 30 km van een van de routeplaatsen — via de
gratis **NASA FIRMS**-satellietdata, elke 12 uur gecheckt.

1. Vraag een gratis MAP_KEY aan op https://firms.modaps.eosdis.nasa.gov/api/map_key/
   (alleen een e-mailadres nodig, geen creditcard).
2. Zet 'm als GitHub-secret (zelfde plek als de OneSignal-secrets hierboven):

   | Secret name | Value |
   |---|---|
   | `FIRMS_MAP_KEY` | de sleutel die je van FIRMS kreeg |

3. Klaar — de workflow (`.github/workflows/fire-alert.yml`) gebruikt verder dezelfde
   `ONESIGNAL_APP_ID` en `ONESIGNAL_REST_API_KEY` als hierboven, dus daar hoef je niets
   voor aan te passen. Zonder `FIRMS_MAP_KEY` slaat de check zichzelf gewoon over
   (geen foutmelding).

Kanttekening: dit zijn ruwe satelliet-hitte-detecties (VIIRS), geen bevestigde
brandmeldingen — een enkele detectie kan soms ook een andere hittebron zijn
(bijv. industrie). Check bij een melding altijd even fogos.pt voor bevestiging.

## Wat komt er in de melding te staan?

De **eerste regel van je laatste commit** wordt de tekst van de pushmelding
(de titel blijft altijd "Portugal Roadtrip bijgewerkt"). Schrijf dat commit-subject
dus in gewoon Nederlands, gericht aan de reizigers — bijvoorbeeld:

```
Lunch op dag 9 is nu Cantinho do Aziz
```

wordt de melding: **Portugal Roadtrip bijgewerkt** — _Lunch op dag 9 is nu Cantinho do Aziz_

Technische details kun je in de rest van het commit-bericht (onder een lege regel)
kwijt; die komen niet in de melding.

- Geen zinnige eerste regel? Dan valt de melding terug op de algemene tekst
  "Er is iets veranderd in de reisgids — tik om te bekijken."
- **Géén melding voor deze push?** Zet `[geen-melding]` ergens in het commit-bericht
  (handig bij een typfout-fix o.i.d.).
- Alleen scripts/workflows/CSS gewijzigd en geen `.html`/`manifest.json`/`sw.js`/
  `onesignal-init.js`? Dan wordt er sowieso geen melding gestuurd.

## Kanttekeningen
- Werkt vanaf **iOS 16.4+**, en alleen als de site als app op het beginscherm staat
  (niet gewoon in Safari).
- De melding gaat naar **alle** aangemelde toestellen (dus zowel je iPhone als iPad
  als je op beide "Zet meldingen aan" hebt gedaan).
- Bij een push met meerdere commits tegelijk telt alleen de **laatste** commit —
  zowel voor de check "is er iets inhoudelijks gewijzigd" als voor de meldingstekst.
- Je kunt de melding ook handmatig sturen via **Actions → "Stuur pushmelding bij
  site-update" → Run workflow** (stuurt dan de algemene tekst).
