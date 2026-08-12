// Portugal Roadtrip — live 5-daagse temperatuurverwachting op actueel.html
//
// Haalt bij elk bezoek de actuele voorspelling op via Open-Meteo (gratis,
// geen API-key nodig) voor de plaatsen op de route. De eerste kolom is
// altijd "vandaag" — geen vaste datums meer die na een paar dagen verouderd
// raken.

(function () {
  const LOCATIONS = [
    { naam: 'Porto / Vila Nova de Gaia', lat: 41.14, lon: -8.61 },
    { naam: 'Amarante', lat: 41.27, lon: -8.08 },
    { naam: 'Aveiro', lat: 40.64, lon: -8.65 },
    { naam: 'Óbidos / Nazaré', lat: 39.60, lon: -9.07 },
    { naam: 'Lissabon', lat: 38.72, lon: -9.14 },
  ];

  const DAGEN = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  function formatDagLabel(isoDatum) {
    // isoDatum: "2026-08-12" — als lokale datum parsen, niet als UTC-tijdstip.
    const [jaar, maand, dag] = isoDatum.split('-').map(Number);
    const d = new Date(jaar, maand - 1, dag);
    return `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
  }

  async function laadVoorspelling() {
    const theadRow = document.getElementById('forecast-thead-row');
    const tbody = document.getElementById('forecast-tbody');
    const disclaimer = document.getElementById('forecast-disclaimer');
    if (!theadRow || !tbody) return;

    const lats = LOCATIONS.map((l) => l.lat).join(',');
    const lons = LOCATIONS.map((l) => l.lon).join(',');
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
      `&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FLisbon&forecast_days=5`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      // Bij meerdere lat/lon-paren geeft Open-Meteo een array terug (één
      // object per locatie, in dezelfde volgorde als de input).
      const perLocatie = Array.isArray(data) ? data : [data];
      if (perLocatie.length !== LOCATIONS.length) throw new Error('Onverwacht responseformaat');

      const dagenIso = perLocatie[0].daily.time; // bijv. ["2026-08-12", ...]

      // Kop-rij opbouwen
      theadRow.innerHTML = '<th>Plaats</th>' + dagenIso.map((iso) => `<th>${formatDagLabel(iso)}</th>`).join('');

      // Body opbouwen
      tbody.innerHTML = LOCATIONS.map((loc, i) => {
        const daily = perLocatie[i].daily;
        const cellen = daily.temperature_2m_max
          .map((max, j) => {
            const min = daily.temperature_2m_min[j];
            return `<td>${Math.round(max)}° / ${Math.round(min)}°</td>`;
          })
          .join('');
        return `<tr><td>${loc.naam}</td>${cellen}</tr>`;
      }).join('');

      if (disclaimer) {
        const nu = new Date();
        const tijdstip = nu.toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });
        disclaimer.innerHTML =
          `🌡️ Bron: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> — ` +
          `automatisch opgehaald op ${tijdstip}. Amarante ligt landinwaarts in het Douro-binnenland en kan flink ` +
          `warmer uitpakken dan de kust — houd daar rekening mee bij het inpakken en plannen van buitenactiviteiten.`;
      }
    } catch (e) {
      console.error('Weersvoorspelling ophalen mislukt —', e);
      theadRow.innerHTML = '<th>Plaats</th><th colspan="5">Voorspelling kon niet geladen worden</th>';
      tbody.innerHTML =
        `<tr><td colspan="6">Kon de actuele voorspelling niet ophalen (geen internet, of Open-Meteo is` +
        ` tijdelijk niet bereikbaar). Check de forecast-links hieronder voor de laatste stand van zaken.</td></tr>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', laadVoorspelling);
  } else {
    laadVoorspelling();
  }
})();
