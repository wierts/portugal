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

## Kanttekeningen
- Werkt vanaf **iOS 16.4+**, en alleen als de site als app op het beginscherm staat
  (niet gewoon in Safari).
- De melding gaat naar **alle** aangemelde toestellen (dus zowel je iPhone als iPad
  als je op beide "Zet meldingen aan" hebt gedaan).
- Elke wijziging aan een `.html`-bestand (of manifest/sw/onesignal-init) die gepusht
  wordt naar `main` triggert een melding — bij losse kleine wijzigingen kan dat dus
  vaker zijn dan je wilt. Zeg het gerust als je dit wilt beperken (bijv. alleen
  handmatig via een knop in GitHub in plaats van automatisch bij elke push).
