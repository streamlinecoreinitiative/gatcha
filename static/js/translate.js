function markTranslatable() {
    const adminView = document.getElementById('admin-view');
    let nodes = [];
    const login = document.getElementById('login-screen');
    const game = document.getElementById('game-screen');
    if (login) nodes.push(...login.querySelectorAll('*'));
    if (game) nodes.push(...game.querySelectorAll('*'));
    if (!nodes.length) {
        nodes = Array.from(document.body.querySelectorAll('*'));
    }
    nodes.forEach(el => {
        if (adminView && adminView.contains(el)) return;
        if (el.classList.contains('language-flag')) return;
        if (!el.children.length && el.textContent.trim()) {
            el.setAttribute('data-i18n', '');
            if (!el.dataset.orig) el.dataset.orig = el.textContent;
        }
    });
}

const translationsCache = {};

async function loadTranslations(lang) {
    if (translationsCache[lang]) return translationsCache[lang];
    try {
        const resp = await fetch(`/static/i18n/${lang}.json`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const normalized = {};
        for (const [k, v] of Object.entries(data)) {
            normalized[k] = v;
            const collapsed = k.trim().replace(/\s+/g, ' ');
            if (!(collapsed in normalized)) normalized[collapsed] = v;
        }
        translationsCache[lang] = normalized;
        return normalized;
    } catch (err) {
        console.error('Failed to load translations', err);
        return null;
    }
}

async function translatePage(lang) {
    markTranslatable();
    const adminView = document.getElementById('admin-view');
    const nodes = document.querySelectorAll('[data-i18n]');
    const dict = await loadTranslations(lang);
    for (const el of nodes) {
        if (adminView && adminView.contains(el)) continue;
        if (!el.dataset.orig) {
            el.dataset.orig = el.textContent;
        }
        const key = el.dataset.orig.trim().replace(/\s+/g, ' ');
        if (dict && dict[key]) {
            el.textContent = dict[key];
        }
    }
}

window.translatePage = translatePage;
