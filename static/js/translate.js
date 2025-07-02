async function translatePage(lang) {
    const nodes = document.querySelectorAll('[data-i18n]');
    for (const el of nodes) {
        if (!el.dataset.orig) {
            el.dataset.orig = el.textContent;
        }
        const resp = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: el.dataset.orig, target: lang })
        });
        const data = await resp.json();
        if (data.success) {
            el.textContent = data.translation;
        }
    }
}

window.translatePage = translatePage;
