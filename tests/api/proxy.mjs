// Proxy kecil: meniru alamat Supabase (/rest/v1/...) dan meneruskannya ke PostgREST lokal.
import http from 'node:http';

http.createServer((req, res) => {
  if (!req.url.startsWith('/rest/v1')) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hanya /rest/v1 yang tersedia di API uji lokal.' }));
    return;
  }
  const upstream = http.request(
    { host: '127.0.0.1', port: 3001, path: req.url.slice('/rest/v1'.length) || '/', method: req.method, headers: req.headers },
    (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); }
  );
  upstream.on('error', (error) => { res.writeHead(502); res.end(error.message); });
  req.pipe(upstream);
}).listen(54321, '127.0.0.1');
