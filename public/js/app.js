// Navbar collapse and contact form.
//
// This replaces bootstrap.bundle.min.js (80KB, render-blocking, and bundling
// Popper for dropdowns/tooltips the page doesn't have). The only Bootstrap JS
// behaviour the page needs is toggling .show on the collapsed menu.

(function () {
	'use strict';

	// --- Navbar ------------------------------------------------------------

	const toggler = document.querySelector('.navbar-toggler');
	const menu = document.getElementById('navbarSupportedContent');

	if (toggler && menu) {
		const setOpen = (open) => {
			menu.classList.toggle('show', open);
			toggler.setAttribute('aria-expanded', String(open));
		};

		toggler.addEventListener('click', () => {
			setOpen(!menu.classList.contains('show'));
		});

		// Collapse after navigating, otherwise the open menu covers the section
		// the visitor just jumped to.
		menu.querySelectorAll('.nav-link').forEach((link) => {
			link.addEventListener('click', () => setOpen(false));
		});
	}

	// --- Contact form ------------------------------------------------------

	const form = document.getElementById('contact-form');
	if (!form) return;

	const status = document.getElementById('form-status');
	const submit = document.getElementById('form-submit');

	const setStatus = (message, state) => {
		status.textContent = message;
		status.dataset.state = state;
	};

	form.addEventListener('submit', async (event) => {
		event.preventDefault();

		if (!form.checkValidity()) {
			form.classList.add('was-validated');
			setStatus('Uzupełnij wszystkie pola poprawnymi danymi.', 'error');
			return;
		}

		const payload = Object.fromEntries(new FormData(form).entries());

		submit.disabled = true;
		setStatus('Wysyłanie…', 'pending');

		try {
			const response = await fetch('/send-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await response.json().catch(() => ({}));

			if (response.ok) {
				form.reset();
				form.classList.remove('was-validated');
				setStatus(data.message || 'Wiadomość została wysłana!', 'ok');
			} else {
				setStatus(data.error || 'Wystąpił błąd podczas wysyłania wiadomości.', 'error');
			}
		} catch (error) {
			console.error('Błąd:', error);
			setStatus('Wystąpił błąd podczas wysyłania wiadomości.', 'error');
		} finally {
			submit.disabled = false;
		}
	});
})();
