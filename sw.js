// ============================================================================
// Service worker do app (celular/PC instalado): funciona sem internet e se
// atualiza sozinho. Estratégia "rede primeiro": com internet, sempre pega a
// versão mais nova do GitHub Pages (e guarda uma cópia); sem internet, usa a
// cópia guardada. O save fica no localStorage e nunca é tocado aqui.
// ============================================================================
const CACHE = 'blue-lock-v1';

self.addEventListener('install', (e) => {
  // Já guarda a página inicial; o resto é guardado na 1ª vez que o jogo carrega
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
