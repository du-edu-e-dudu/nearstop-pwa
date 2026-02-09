/*
 NearStop – PWA GPS com alerta por VIBRAÇÃO
 Design inspirado no Waze (clean, cards, cores vivas)
 Arquitetura SINGLE FILE (JS only)
*/

/********************************
 * CONFIGURAÇÕES
 ********************************/
const CONFIG = {
  ALERT_DISTANCE_KM: 1,
  MAP_DEFAULT_ZOOM: 16,
  CACHE_NAME: 'nearstop-waze-v3'
};

/********************************
 * UI – HTML + CSS (WAZE STYLE)
 ********************************/
document.body.innerHTML = `
<style>
  * { box-sizing: border-box; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; }
  body {
    margin: 0;
    background: #eef2f7;
    color: #0f172a;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    background: #ffffff;
    padding: .8rem 1rem;
    font-size: 1.1rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
    z-index: 10;
  }
  header span { color:#2563eb; }
  #map { flex: 1; }
  .card {
    background: #ffffff;
    border-radius: 18px;
    padding: 1rem;
    margin: .8rem;
    box-shadow: 0 8px 20px rgba(0,0,0,.12);
  }
  .distance {
    font-size: 2rem;
    font-weight: 800;
    text-align: center;
  }
  .status {
    text-align: center;
    font-size: .9rem;
    opacity: .7;
  }
  .alert {
    background: #fee2e2 !important;
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(239,68,68,.6); }
    70% { box-shadow: 0 0 0 15px rgba(239,68,68,0); }
    100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  }
</style>

<header>
  <div>🧭 <span>NearStop</span></div>
  <small>GPS inteligente</small>
</header>

<div id="map"></div>

<div class="card" id="panel">
  <div class="distance" id="distance">Inicializando GPS…</div>
  <div class="status" id="status">Aguardando localização</div>
</div>
`;

/********************************
 * UTIL – HAVERSINE
 ********************************/
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/********************************
 * LEAFLET
 ********************************/
const leafletCSS = document.createElement('link');
leafletCSS.rel = 'stylesheet';
leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
document.head.appendChild(leafletCSS);

const leafletJS = document.createElement('script');
leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
leafletJS.onload = initMap;
document.head.appendChild(leafletJS);

let map, userMarker, destMarker;
let alerted = false;
const distanceEl = document.getElementById('distance');
const statusEl = document.getElementById('status');
const panel = document.getElementById('panel');

function initMap() {
  map = L.map('map', { zoomControl: false }).setView([-23.55, -46.63], CONFIG.MAP_DEFAULT_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

  map.on('click', e => {
    alerted = false;
    panel.classList.remove('alert');
    statusEl.textContent = 'Destino definido';
    if (destMarker) map.removeLayer(destMarker);
    destMarker = L.marker(e.latlng).addTo(map).bindPopup('Destino');
  });

  startGPS();
}

/********************************
 * GPS (ROBUSTO)
 ********************************/
function startGPS() {
  if (!('geolocation' in navigator)) {
    statusEl.textContent = 'GPS não suportado';
    return;
  }

  statusEl.textContent = 'Ativando GPS…';

  navigator.geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0
  });
}

function onPosition(pos) {
  const { latitude, longitude, accuracy } = pos.coords;

  statusEl.textContent = `Precisão ±${Math.round(accuracy)} m`;

  if (!userMarker) {
    userMarker = L.circleMarker([latitude, longitude], {
      radius: 8,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 1
    }).addTo(map);

    map.setView([latitude, longitude], CONFIG.MAP_DEFAULT_ZOOM);
  } else {
    userMarker.setLatLng([latitude, longitude]);
  }

  if (!destMarker) {
    distanceEl.textContent = 'Toque no mapa';
    return;
  }

  const d = haversine(latitude, longitude, destMarker.getLatLng().lat, destMarker.getLatLng().lng);
  distanceEl.textContent = d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(2)} km`;

  if (d <= CONFIG.ALERT_DISTANCE_KM && !alerted) triggerVibration();
}

function onError(err) {
  const messages = {
    1: 'Permissão de localização negada',
    2: 'GPS indisponível',
    3: 'Tempo limite ao obter localização'
  };
  statusEl.textContent = messages[err.code] || 'Erro desconhecido no GPS';
}

/********************************
 * ALERTA
 ********************************/
function triggerVibration() {
  alerted = true;
  panel.classList.add('alert');
  statusEl.textContent = 'Destino próximo!';
  if (navigator.vibrate) navigator.vibrate([700,300,700,300,700]);
}

/********************************
 * PWA INLINE
 ********************************/
const manifest = {
  name: 'NearStop',
  short_name: 'NearStop',
  start_url: '.',
  display: 'standalone',
  theme_color: '#ffffff',
  background_color: '#eef2f7'
};

const manifestBlob = new Blob([JSON.stringify(manifest)], { type:'application/json' });
const manifestLink = document.createElement('link');
manifestLink.rel = 'manifest';
manifestLink.href = URL.createObjectURL(manifestBlob);
document.head.appendChild(manifestLink);

if ('serviceWorker' in navigator) {
  const swCode = `
    const CACHE='${CONFIG.CACHE_NAME}';
    self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./']))));
    self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
  `;
  navigator.serviceWorker.register(URL.createObjectURL(new Blob([swCode], { type:'text/javascript' })));
}
