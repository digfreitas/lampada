/* Lâmpada: guarda os arquivos do app no celular para ele abrir sem internet.
   Ao publicar uma versão nova do app, troque o número em VERSAO (v1, v2, v3...). */
const VERSAO = 'lampada-v1';
const ARQUIVOS = [
  './',
  'index.html',
  'fontes.css',
  'manifest.webmanifest',
  'icone-192.png',
  'icone-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO)
      .then((cache) => cache.addAll(ARQUIVOS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Abre na hora com o que está guardado e, se houver internet, atualiza em segundo plano. */
self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  evento.respondWith((async () => {
    const cache = await caches.open(VERSAO);
    const navegacao = pedido.mode === 'navigate';
    let guardado = await cache.match(pedido, { ignoreSearch: true });
    if (!guardado && navegacao) guardado = await cache.match('./');

    const daRede = fetch(navegacao ? new Request(url.href, { cache: 'no-cache' }) : new Request(pedido, { cache: 'no-cache' }))
      .then((resposta) => {
        if (resposta && resposta.ok) cache.put(pedido, resposta.clone());
        return resposta;
      })
      .catch(() => null);

    if (guardado) {
      evento.waitUntil(daRede);
      return guardado;
    }
    const resposta = await daRede;
    return resposta || new Response('Sem internet e sem cópia guardada.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  })());
});
