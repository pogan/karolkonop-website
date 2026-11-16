const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Wymagane zmienne (aplikacja kończy się bez nich); poczta nie jest tu wysyłana.
Object.assign(process.env, {
	SMTP_HOST: '127.0.0.1',
	SMTP_PORT: '1025',
	SMTP_USER: 'test@example.com',
	SMTP_PASS: 'test',
	MAIL_TO: 'test@example.com',
	STATS_DB: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'karolkonop-')), 'stats.sqlite'),
});
delete process.env.STATS_PASSWORD;
const app = require('../karolkonop-website-express-app');

let base, server;
test.before(async () => {
	server = await new Promise((resolve) => {
		const s = app.listen(0, '127.0.0.1', () => resolve(s));
	});
	base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('strona główna z wersją i bieżącym rokiem w stopce', async () => {
	const res = await fetch(`${base}/`);
	assert.equal(res.status, 200);
	const html = await res.text();
	assert.ok(html.includes(app.locals.appVersion.label), 'wersja w stopce');
	assert.ok(html.includes(`© ${new Date().getFullYear()} Karol Konop`));
	assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
});

test('/healthz w formacie vamude-kit', async () => {
	const res = await fetch(`${base}/healthz`);
	assert.equal(res.status, 200);
	const body = await res.json();
	assert.equal(body.status, 'ok');
	assert.equal(body.app, 'karolkonop-website');
});

test('pliki statyczne, stary adres /index.html i strona 404', async () => {
	assert.equal((await fetch(`${base}/css/main.css`)).status, 200);
	assert.equal((await fetch(`${base}/robots.txt`)).status, 200);
	const old = await fetch(`${base}/index.html`, { redirect: 'manual' });
	assert.equal(old.status, 301);
	assert.equal(old.headers.get('location'), '/');
	const missing = await fetch(`${base}/nie-ma-takiej-strony`);
	assert.equal(missing.status, 404);
	assert.match(await missing.text(), /<html/);
	// Szablony nie są serwowane jako pliki.
	assert.equal((await fetch(`${base}/views/index.ejs`)).status, 404);
});

test('panel statystyk wyłączony bez STATS_PASSWORD', async () => {
	assert.equal((await fetch(`${base}/stats`)).status, 404);
});
