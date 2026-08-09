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
  try {
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
    console.info('OneSignal: init geslaagd.');
  } catch (e) {
    console.error('OneSignal: init mislukt —', e);
    window.__onesignalInitError = e;
    return;
  }

  // Werkt de "Zet meldingen aan"-knop bij als de gebruiker al is aangemeld
  const btn = document.getElementById('notif-btn');
  if (btn) {
    try {
      const optedIn = await OneSignal.User.PushSubscription.optedIn;
      const id = await OneSignal.User.PushSubscription.id;
      console.info('OneSignal: huidige status —', { optedIn, subscriptionId: id });
      updateNotifButton(btn, optedIn);
    } catch (e) {
      console.error('OneSignal: status ophalen mislukt —', e);
    }
  }
});

function updateNotifButton(btn, optedIn) {
  btn.textContent = optedIn ? '🔔 Meldingen staan aan' : '🔔 Zet meldingen aan';
  btn.disabled = !!optedIn;
}

// Aangeroepen door de "🔄 Opnieuw aanmelden voor meldingen"-knop op index.html.
// Nodig omdat een oude, kapotte service worker-registratie (van vóór de
// serviceWorkerPath-fix hierboven) kan blijven "hangen" zonder dat er ooit een
// echte OneSignal-subscription is aangemaakt. Deze knop breekt dat schoon af:
// alle service workers en caches worden gewist, waarna de pagina herlaadt met
// een verse registratie van de (nu gecorrigeerde) sw.js.
async function resetMeldingen() {
  const btn = document.getElementById('notif-reset-btn');
  if (btn) { btn.disabled = true; btn.textContent = '🔄 Bezig met resetten…'; }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn('Reset van meldingen niet volledig gelukt:', e);
  }
  alert('Klaar! De pagina wordt opnieuw geladen — tik daarna nogmaals op "🔔 Zet meldingen aan".');
  location.reload();
}

// Aangeroepen door de "Zet meldingen aan"-knop op index.html.
// Toont expliciet wat er gebeurd is (i.p.v. stil te falen), zodat je dit kunt
// doorgeven als het toch niet lukt — zonder dat er devtools/console nodig zijn.
function vraagMeldingenAan() {
  const btn = document.getElementById('notif-btn');
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.indexOf('VUL-HIER') === 0) {
    alert('Pushmeldingen zijn nog niet ingesteld. Zie README-pushmeldingen.md voor de setup-stappen.');
    return;
  }
  if (window.__onesignalInitError) {
    alert('OneSignal kon niet initialiseren: ' + (window.__onesignalInitError.message || window.__onesignalInitError));
    return;
  }
  if (typeof Notification === 'undefined') {
    alert('Deze browser/omgeving ondersteunt geen webmeldingen (Notification API ontbreekt). Op iPhone: zorg dat je de site via het icoon op je beginscherm opent, niet via Safari zelf, en dat je op iOS 16.4 of hoger zit.');
    return;
  }
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.Notifications.requestPermission();
      const browserPermission = Notification.permission;
      const optedIn = await OneSignal.User.PushSubscription.optedIn;
      const id = await OneSignal.User.PushSubscription.id;
      console.info('OneSignal: na aanmelden —', { browserPermission, optedIn, subscriptionId: id });
      if (btn) updateNotifButton(btn, optedIn);
      if (optedIn && id) {
        toonMeldingenSuccesPopup();
      } else {
        alert(
          'Status na aanmelden:\n' +
          '- Browser-toestemming: ' + browserPermission + '\n' +
          '- OneSignal opted-in: ' + optedIn + '\n' +
          '- Subscription ID: ' + (id || '(geen)') + '\n\n' +
          'Er is dus (nog) geen geldige OneSignal-subscription aangemaakt. Geef deze regels door zodat we verder kunnen zoeken.'
        );
      }
    } catch (e) {
      console.error('OneSignal: aanmelden mislukt —', e);
      alert('Aanmelden voor meldingen is mislukt: ' + (e && e.message ? e.message : e));
    }
  });
}

// Toont een gestileerde bevestigingspop-up na een succesvolle OneSignal-
// subscription. Bevat een korte visuele stappenherhaling (met iconen, geen
// echte screenshots) zodat je dit later kunt terugvinden op een ander toestel
// zonder opnieuw te moeten zoeken hoe het werkte.
function toonMeldingenSuccesPopup() {
  if (document.getElementById('meldingen-succes-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'meldingen-succes-overlay';
  overlay.className = 'meldingen-popup-overlay';

  overlay.innerHTML = `
    <div class="meldingen-popup" role="dialog" aria-modal="true" aria-labelledby="meldingen-popup-titel">
      <button type="button" class="meldingen-popup-close" aria-label="Sluiten">&times;</button>
      <div class="meldingen-popup-check">✅</div>
      <h3 id="meldingen-popup-titel">Meldingen staan aan!</h3>
      <p class="meldingen-popup-intro">Je krijgt vanaf nu updates over de Portugal-roadtrip. Zo werkte het (handig om te onthouden voor een ander toestel):</p>
      <div class="meldingen-popup-stappen">
        <div class="meldingen-stap">
          <span class="meldingen-stap-icon">📱</span>
          <span class="meldingen-stap-tekst">Open de site in <strong>Safari</strong> (op iPhone/iPad verplicht)</span>
        </div>
        <div class="meldingen-stap-pijl">→</div>
        <div class="meldingen-stap">
          <span class="meldingen-stap-icon">📤</span>
          <span class="meldingen-stap-tekst">Tik op het <strong>deel-icoon</strong> onderin</span>
        </div>
        <div class="meldingen-stap-pijl">→</div>
        <div class="meldingen-stap">
          <span class="meldingen-stap-icon">➕</span>
          <span class="meldingen-stap-tekst">Kies <strong>"Zet op beginscherm"</strong></span>
        </div>
        <div class="meldingen-stap-pijl">→</div>
        <div class="meldingen-stap">
          <span class="meldingen-stap-icon">🔔</span>
          <span class="meldingen-stap-tekst">Open de site <strong>vanaf dat icoon</strong> en zet meldingen aan</span>
        </div>
      </div>
      <button type="button" class="meldingen-popup-ok">Begrepen</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const sluit = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };
  overlay.querySelector('.meldingen-popup-close').addEventListener('click', sluit);
  overlay.querySelector('.meldingen-popup-ok').addEventListener('click', sluit);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) sluit(); });
}
