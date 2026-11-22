// Tras `expo export --platform web`: añade al enlace del favicon una versión sacada de su
// contenido (/favicon.ico?v=1a2b3c4d). Los navegadores guardan el icono de la pestaña aparte y no
// lo renuevan ni recargando sin caché; con la dirección nueva lo piden otra vez cuando cambia el logo.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const html = path.join(dist, 'index.html');
const icon = path.join(dist, 'favicon.ico');
if (!fs.existsSync(html) || !fs.existsSync(icon)) {
  console.warn('favicon-version: no hay dist/index.html o dist/favicon.ico; no se cambia nada.');
  process.exit(0);
}
const version = crypto.createHash('sha256').update(fs.readFileSync(icon)).digest('hex').slice(0, 8);
const before = fs.readFileSync(html, 'utf8');
const after = before.replace(/href="\/favicon\.ico(\?v=[^"]*)?"/g, `href="/favicon.ico?v=${version}"`);
fs.writeFileSync(html, after);
console.log(`favicon-version: /favicon.ico?v=${version}`);
