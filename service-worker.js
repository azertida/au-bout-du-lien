/* Au bout du lien — service worker
   Incrémenter CACHE à chaque mise en ligne. */

const CACHE = "au-bout-du-lien-v4";
const POLICES = "au-bout-du-lien-polices-v4";

const COQUILLE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(COQUILLE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(
        noms.filter(n => n !== CACHE && n !== POLICES).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const police = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  // Polices : le cache d'abord, le réseau seulement au premier passage.
  if (police) {
    e.respondWith(
      caches.open(POLICES).then(c =>
        c.match(req).then(rep => rep || fetch(req).then(net => {
          if (net.ok) c.put(req, net.clone());
          return net;
        }).catch(() => rep))
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigation : le réseau d'abord pour attraper les mises à jour,
  // la page en cache si la connexion manque.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(net => {
          const copie = net.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copie));
          return net;
        })
        .catch(() => caches.match("./index.html", { ignoreSearch: true }))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(rep => rep || fetch(req).then(net => {
      if (net.ok) {
        const copie = net.clone();
        caches.open(CACHE).then(c => c.put(req, copie));
      }
      return net;
    }))
  );
});
