const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const REQUIRED_ENV = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
	console.error(`Brak wymaganych zmiennych środowiskowych: ${missing.join(', ')}`);
	console.error('Skopiuj .env.example do .env i uzupełnij wartości.');
	process.exit(1);
}

const PORT = process.env.PORT || 3003;
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();

// Behind nginx: trust the first proxy hop so req.ip is the visitor, not the proxy.
// Without this the rate limiter would see one IP for every visitor.
app.set('trust proxy', 1);

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				// GA4 (loaded only after consent, see public/js/analytics.js).
				scriptSrc: ["'self'", 'https://www.googletagmanager.com'],
				styleSrc: ["'self'", 'https://fonts.googleapis.com'],
				fontSrc: ["'self'", 'https://fonts.gstatic.com'],
				imgSrc: ["'self'", 'data:', 'https://*.google-analytics.com', 'https://*.googletagmanager.com'],
				frameSrc: ['https://calendar.google.com', 'https://bandsintown.com', 'https://www.bandsintown.com'],
				connectSrc: [
					"'self'",
					'https://*.google-analytics.com',
					'https://*.analytics.google.com',
					'https://*.googletagmanager.com',
				],
				objectSrc: ["'none'"],
				baseUri: ["'self'"],
				formAction: ["'self'"],
			},
		},
		// nginx terminates TLS and owns HSTS.
		strictTransportSecurity: false,
		crossOriginEmbedderPolicy: false,
	})
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(express.static(PUBLIC_DIR));

const transporter = nodemailer.createTransport({
	name: 'Karol Konop Website Form',
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT),
	secure: true, // implicit TLS (port 465)
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

const contactLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	limit: 5,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message: { error: 'Zbyt wiele wiadomości. Spróbuj ponownie za godzinę.' },
});

const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContact(body) {
	const fields = {};

	for (const [field, max] of Object.entries(LIMITS)) {
		const value = body[field];
		if (typeof value !== 'string') return { error: `Pole "${field}" jest wymagane.` };

		const trimmed = value.trim();
		if (!trimmed) return { error: `Pole "${field}" jest wymagane.` };
		if (trimmed.length > max) return { error: `Pole "${field}" jest za długie.` };

		fields[field] = trimmed;
	}

	if (!EMAIL_RE.test(fields.email)) return { error: 'Podaj poprawny adres e-mail.' };

	return { fields };
}

app.post('/send-email', contactLimiter, async (req, res) => {
	// Honeypot: hidden field no human ever fills in. Respond 200 so the bot
	// believes it succeeded, but send nothing.
	if (typeof req.body.website === 'string' && req.body.website.trim()) {
		return res.json({ message: 'Wiadomość została wysłana!' });
	}

	const { fields, error } = validateContact(req.body);
	if (error) return res.status(400).json({ error });

	try {
		await transporter.sendMail({
			from: process.env.SMTP_USER,
			replyTo: fields.email,
			to: process.env.MAIL_TO,
			subject: `Wiadomość z formularza kontaktowego karol.konop.pl od ${fields.name}`,
			text: `Od: ${fields.name} <${fields.email}>\n\n${fields.message}`,
		});
		res.json({ message: 'Wiadomość została wysłana!' });
	} catch (err) {
		console.error('Błąd wysyłki wiadomości:', err);
		res.status(500).json({ error: 'Wystąpił błąd podczas wysyłania wiadomości.' });
	}
});

app.use((req, res) => {
	res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.listen(PORT, () => {
	console.log(`karolkonop-website-app listening on ${PORT}, serving ${PUBLIC_DIR}`);
});
