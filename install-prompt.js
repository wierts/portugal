// Portugal Roadtrip — "Installeer de app"-knop
//
// Chrome/Edge/Android/desktop: luistert op het 'beforeinstallprompt'-event en
// toont dan een eigen knop die de native installatie-dialoog opent.
// iOS/iPadOS Safari: kent dat event niet (Apple staat geen programmatische
// installatie toe) — daar toont de knop in plaats daarvan een korte uitleg
// voor "Zet op beginscherm" via het deelmenu.

(function () {
  let deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true; // oudere iOS-detectie
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS meldt zich soms als Mac
  }

  function showButton(btn) {
    if (isStandalone()) { btn.style.display = 'none'; return; }
    btn.style.display = 'inline-flex';
  }

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('install-btn');
    if (!btn) return;

    if (isStandalone()) { btn.style.display = 'none'; return; }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      showButton(btn);
    });

    btn.addEventListener('click', async function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === 'accepted') btn.style.display = 'none';
        return;
      }
      if (isIOS()) {
        alert('Zet deze app op je beginscherm:\n\n1. Tik op het deel-icoon (vierkant met pijl omhoog)\n2. Kies "Zet op beginscherm"\n3. Tik op "Voeg toe"');
        return;
      }
      alert('Gebruik het installatie-icoon in de adresbalk van je browser om deze app te installeren.');
    });

    // Op iOS/iPadOS is er geen beforeinstallprompt-event — toon de knop sowieso,
    // die legt dan bij een klik uit hoe het via het deelmenu moet.
    if (isIOS()) showButton(btn);

    window.addEventListener('appinstalled', function () {
      btn.style.display = 'none';
      deferredPrompt = null;
    });
  });
})();
