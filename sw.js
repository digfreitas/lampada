/* Lâmpada: service worker.
   Guarda os arquivos do app no celular para abrir sem internet.
   As Bíblias não passam por aqui: ficam no banco do próprio app (IndexedDB), importadas dos arquivos do Drive.
   A cada versão nova do app, troque o valor de VERSAO. */
const VERSAO = 'lampada-v4';
const ARQUIVOS = [
  './',
  './index.html',
  './fontes.css',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSAO);
    // Um arquivo que falhe não impede a instalação dos outros.
    await Promise.all(ARQUIVOS.map((url) =>
      fetch(new Request(url, { cache: 'reload' }))
        .then((r) => (r.ok ? cache.put(url, r) : null))
        .catch(() => null)
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Responde com a cópia guardada e atualiza em segundo plano.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSAO);
    const chave = req.mode === 'navigate' ? './' : req;
    const guardada = await cache.match(chave, { ignoreSearch: true });
    const daRede = fetch(req).then((r) => {
      if (r && r.ok && r.type === 'basic') cache.put(chave, r.clone());
      return r;
    }).catch(() => null);
    if (guardada) { e.waitUntil(daRede); return guardada; }
    const r = await daRede;
    return r || new Response('Sem conexão e sem cópia guardada.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
