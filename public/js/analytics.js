// Google Analytics 4 behind a consent banner. gtag.js is fetched only after the
// visitor clicks "akceptuję" — before that nothing is sent to Google. The choice
// lives in localStorage; any [data-cookie-settings] link reopens the banner so
// consent can be withdrawn. External file because CSP forbids inline scripts.
(() => {
	const GA_ID = 'G-F0NR3YD72L';
	const KEY = 'kk-analytics-consent';

	const read = () => {
		try {
			return localStorage.getItem(KEY);
		} catch (_) {
			return null; // storage blocked (private mode) — ask every visit
		}
	};
	const write = (value) => {
		try {
			localStorage.setItem(KEY, value);
		} catch (_) {
			/* can't remember the choice — the banner will show again */
		}
	};

	let loaded = false;
	const loadAnalytics = () => {
		if (loaded) return;
		loaded = true;
		window.dataLayer = window.dataLayer || [];
		window.gtag = function gtag() {
			window.dataLayer.push(arguments);
		};
		window.gtag('js', new Date());
		window.gtag('config', GA_ID);
		const s = document.createElement('script');
		s.async = true;
		s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
		document.head.appendChild(s);
	};

	// GA sets _ga* on the registrable domain, so try every plausible scope.
	const clearAnalyticsCookies = () => {
		const host = location.hostname;
		const parent = host.split('.').slice(-2).join('.');
		document.cookie.split(';').forEach((c) => {
			const name = c.split('=')[0].trim();
			if (!name.startsWith('_ga')) return;
			['', host, `.${host}`, `.${parent}`].forEach((domain) => {
				document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
			});
		});
	};

	let banner;
	const buildBanner = () => {
		banner = document.createElement('div');
		banner.className = 'consent-banner';
		banner.setAttribute('role', 'region');
		banner.setAttribute('aria-label', 'Zgoda na pliki cookies');
		banner.hidden = true;
		banner.innerHTML = `
			<div class="container d-flex flex-column flex-md-row align-items-md-center gap-3">
				<p class="m-0 flex-grow-1">
					Za Twoją zgodą używam Google Analytics (Google Ireland Ltd.), żeby wiedzieć,
					jak korzystasz ze strony. Narzędzie zapisuje pliki cookies <code>_ga</code>
					i przekazuje Google m.in. adres odwiedzanej strony oraz dane o przeglądarce.
					Zgodę możesz wycofać w stopce („ustawienia cookies”).
				</p>
				<div class="d-flex gap-2">
					<button type="button" class="btn btn-outline-primary" data-consent="denied">odrzucam</button>
					<button type="button" class="btn btn-primary" data-consent="granted">akceptuję</button>
				</div>
			</div>`;
		banner.querySelectorAll('[data-consent]').forEach((btn) => {
			btn.addEventListener('click', () => {
				const choice = btn.dataset.consent;
				const wasGranted = read() === 'granted';
				write(choice);
				banner.hidden = true;
				if (choice === 'granted') {
					loadAnalytics();
				} else {
					clearAnalyticsCookies();
					// A loaded gtag.js can't be unloaded — reload to stop it.
					if (wasGranted && loaded) location.reload();
				}
			});
		});
		document.body.appendChild(banner);
	};

	document.addEventListener('DOMContentLoaded', () => {
		buildBanner();
		const consent = read();
		if (consent === 'granted') loadAnalytics();
		else if (consent !== 'denied') banner.hidden = false;

		document.querySelectorAll('[data-cookie-settings]').forEach((el) => {
			el.addEventListener('click', (e) => {
				e.preventDefault();
				banner.hidden = false;
			});
		});
	});
})();
