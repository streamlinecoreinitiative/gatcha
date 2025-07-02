function markTranslatable() {
    const loginNodes = document.querySelectorAll('#login-screen *');
    const adminView = document.getElementById('admin-view');
    const gameNodes = document.querySelectorAll('#game-screen *');
    [...loginNodes, ...gameNodes].forEach(el => {
        if (adminView && adminView.contains(el)) return;
        if (!el.children.length && el.textContent.trim()) {
            el.setAttribute('data-i18n', '');
            if (!el.dataset.orig) el.dataset.orig = el.textContent;
        }
    });
}

async function translatePage(lang) {
    markTranslatable();
    const adminView = document.getElementById('admin-view');
    const nodes = document.querySelectorAll('[data-i18n]');
    for (const el of nodes) {
        if (adminView && adminView.contains(el)) continue;
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
