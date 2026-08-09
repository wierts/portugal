// Portugal Roadtrip — pushmeldingen via OneSignal (gratis)
//
// EENMALIGE SETUP (zie README-pushmeldingen.md voor de volledige uitleg):
// 1. Maak een gratis account op https://onesignal.com
// 2. Maak een nieuwe "Web Push"-app aan met site-URL https://wierts.github.io/portugal/
// 3. Kopieer de "OneSignal App ID" hieronder in plaats van de placeholder.
// 4. Zet de REST API Key als GitHub-secret ONESIGNAL_REST_API_KEY (en de App ID als
//    ONESIGNAL_APP_ID) zodat .github/workflows/notify-on-update.yml meldingen kan versturen.

const ONESIGNAL_APP_ID = "262739ee-5c84-49ed-af8a-c60bc2c86958";

window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function (OneSignal) {
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.indexOf('VUL-HIER') === 0) {
    console.info('OneSignal: nog geen App ID ingevuld in onesignal-init.js — pushmeldingen staan uit.');
    return;
  }
  await OneSignal.init({
    appId: ONESIGNAL_APP_ID,
    notifyButton: { enable: false },
    allowLocalhostAsSecureOrigin: true,
    // Deze site heeft al een eigen service worker (sw.js, voor offline-gebruik als
    // PWA) met "importScripts('.../OneSignalSDK.sw.js')" erin verwerkt. Zonder deze
    // twee regels zoekt OneSignal standaard naar een apart bestand
    // "OneSignalSDKWorker.js" dat hier niet bestaat — de browser-toestemming wordt
    // dan wel verleend, maar er komt nooit een subscription in het OneSignal-
    // dashboard terecht. Door hier expliciet naar sw.js te wijzen, gebruikt
    // OneSignal de bestaande worker in plaats van een eigen bestand te zoeken.
    serviceWorkerPath: 'sw.js',
    serviceWorkerParam: { scope: '/portugal/' },
  });

  // Werkt de "Zet meldingen aan"-knop bij als de gebruiker al is aangemeld
  const btn = document.getElementById('notif-btn');
  if (btn) {
    const optedIn = await OneSignal.User.PushSubscription.optedIn;
    updateNotifButton(btn, optedIn);
  }
});

function updateNotifButton(btn, optedIn) {
  btn.textContent = optedIn ? '🔔 Meldingen staan aan' : '🔔 Zet meldingen aan';
  btn.disabled = !!optedIn;
}

// Aangeroepen door de "Zet meldingen aan"-knop op index.html
function vraagMeldingenAan() {
  const btn = document.getElementById('notif-btn');
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.indexOf('VUL-HIER') === 0) {
    alert('Pushmeldingen zijn nog niet ingesteld. Zie README-pushmeldingen.md voor de setup-stappen.');
    return;
  }
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.Notifications.requestPermission();
    const optedIn = await OneSignal.User.PushSubscription.optedIn;
    if (btn) updateNotifButton(btn, optedIn);
  });
}
