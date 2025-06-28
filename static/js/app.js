// static/js/app.js (V5.5 - Final UI & Event Fixes)

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. V5.5 Finalizing...");
    attachEventListeners();
    initializeGame();
});

// --- GLOBAL STATE & REFERENCES ---
let gameState = {};
let masterCharacterList = [];
let socket;
let currentStageForFight = 0;

// --- DOM ELEMENT REFERENCES ---
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const playerNameDisplay = document.getElementById('player-name');
const gemCountDisplay = document.getElementById('gem-count');
const goldCountDisplay = document.getElementById('gold-count');
const platinumCountDisplay = document.getElementById('platinum-count');
const energyCountDisplay = document.getElementById('energy-count');
const energyMaxDisplay = document.getElementById('energy-max');
const dungeonEnergyCountDisplay = document.getElementById('dungeon-energy-count');
const dungeonMaxDisplay = document.getElementById('dungeon-max');
const energyTimerDisplay = document.getElementById('energy-timer');
const dungeonTimerDisplay = document.getElementById('dungeon-timer');
const logoutButton = document.getElementById('logout-button');
const bugButton = document.getElementById('report-bug-button');
const mainContent = document.getElementById('main-content');
const teamDisplayContainer = document.getElementById('team-display');
const dungeonRunCount = document.getElementById('dungeon-run-count');
const collectionContainer = document.getElementById('collection-container');
const summonButton = document.getElementById('perform-summon-button');
const summonTenButton = document.getElementById('summon-ten-button');
const freeSummonButton = document.getElementById('free-summon-button');
const freeSummonTimerDisplay = document.getElementById('free-summon-timer');
const summonResultContainer = document.getElementById('summon-result');
const stageListContainer = document.getElementById('stage-list');
const loreContainer = document.getElementById('lore-text-container');
const onlineListContainer = document.getElementById('online-list-container');
const towerScoresContainer = document.getElementById('tower-highscores');
const dungeonScoresContainer = document.getElementById('dungeon-highscores');
const navButtons = document.querySelectorAll('.nav-button');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const chatContainer = document.getElementById('chat-container');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const battleScreen = document.getElementById('battle-screen');
const equipmentContainer = document.getElementById('equipment-container');
const storePackagesContainer = document.getElementById('store-packages');
const userIcon = document.getElementById('user-icon');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const currencyIconHtml = '<img src="/static/images/ui/Platinum_Bars_Icon.png" class="currency-icon" alt="Platinum" title="Platinum - Purchased with real money. Use it for energy refills and special packs.">';
let profileModal;
let profileEmailInput;
let profileCurrentPasswordInput;
let profileNewPasswordInput;
let profileConfirmPasswordInput;
let profileImageSelect;
let profileSaveBtn;
let profileCancelBtn;
let adminSubmitBtn;
let paypalClientIdInput;
let paypalSecretInput;
let paypalSaveBtn;
let paypalClientDisplay;
let paypalSecretDisplay;
let paypalModeInput;
let paypalModeDisplay;
let adminMotdInput;
let adminMotdSaveBtn;
let adminEventsText;
let adminEventsSaveBtn;
let heroImageOverlay;
let heroImageLarge;
let messageBox;
let registerModal;
let regUsernameInput;
let regEmailInput;
let regPasswordInput;
let regConfirmInput;
let regTosCheckbox;
let regSubmitBtn;
let regCancelBtn;
let regError;
let forgotModal;
let forgotEmailInput;
let forgotSubmitBtn;
let forgotCancelBtn;
let forgotError;
let infoModal;
let infoText;
let infoCloseBtn;
let welcomeModal;
let welcomeCloseBtn;

function displayMessage(text) {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.style.display = 'block';
    setTimeout(() => { messageBox.style.display = 'none'; }, 3000);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(pwd) {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10,}$/.test(pwd);
}

function formatDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

let resourceTimer;

function updateResourceTimers() {
    if (!gameState || !gameState.energy_last) return;
    const now = Math.floor(Date.now() / 1000);
    if (energyTimerDisplay) {
        if (gameState.energy < gameState.energy_cap) {
            const next = gameState.energy_last + 3600;
            const remain = next - now;
            if (remain <= 0) {
                fetchPlayerDataAndUpdate();
            } else {
                energyTimerDisplay.textContent = formatDuration(remain);
            }
        } else {
            energyTimerDisplay.textContent = '';
        }
    }
    if (dungeonTimerDisplay) {
        if (gameState.dungeon_energy < gameState.dungeon_cap) {
            const last = new Date(gameState.dungeon_last * 1000);
            const nextReset = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate() + 1) / 1000;
            const remain = nextReset - now;
            if (remain <= 0) {
                fetchPlayerDataAndUpdate();
            } else {
                dungeonTimerDisplay.textContent = formatDuration(remain);
            }
        } else {
            dungeonTimerDisplay.textContent = '';
        }
    }
    if (freeSummonButton && freeSummonTimerDisplay) {
        const nextFree = (gameState.free_last || 0) + 86400;
        if (now >= nextFree) {
            freeSummonButton.disabled = false;
            freeSummonTimerDisplay.textContent = '';
        } else {
            freeSummonButton.disabled = true;
            freeSummonTimerDisplay.textContent = formatDuration(nextFree - now);
        }
    }
}

function startResourceTimers() {
    if (resourceTimer) clearInterval(resourceTimer);
    resourceTimer = setInterval(updateResourceTimers, 1000);
    updateResourceTimers();
}
const TOWER_LORE = [
    {
        floor: 1,
        title: "The Spire of Chaos",
        text: "A festering wound in reality itself, its floors stretching into a maddening, infinite eternity."
    },
    {
        floor: 10,
        title: "The Void-Touched Halls",
        text: "From its endless corridors, the Void-touched pour forth, each floor commanded by a more twisted guardian."
    },
    {
        floor: 25,
        title: "The Star-Forged Hope",
        text: "Only the legendary Star-forged Maidens, summoned by your hand, can withstand the Spire's corrupting energy."
    },
    {
        floor: 40,
        title: "The Impossible Pinnacle",
        text: "Your destiny is a vertical one. You must climb higher than any have before to seal the rift for good."
    }
];

// =========================================================================
// ==== ATTACH EVENT LISTENERS (RUNS ONLY ONCE) ====
// =========================================================================
function attachEventListeners() {
    // Late-loaded DOM elements
    heroImageOverlay = document.getElementById('hero-image-overlay');
    heroImageLarge = document.getElementById('hero-image-large');
    messageBox = document.getElementById('message-box');
    registerModal = document.getElementById('register-modal-overlay');
    profileModal = document.getElementById('profile-modal');
    profileEmailInput = document.getElementById('profile-email');
    profileCurrentPasswordInput = document.getElementById('profile-current-password');
    profileNewPasswordInput = document.getElementById('profile-new-password');
    profileConfirmPasswordInput = document.getElementById('profile-confirm-password');
    profileImageSelect = document.getElementById('profile-image-select');
    profileSaveBtn = document.getElementById('profile-save-btn');
    profileCancelBtn = document.getElementById('profile-cancel-btn');
    adminSubmitBtn = document.getElementById('admin-submit-btn');
    paypalClientIdInput = document.getElementById('admin-paypal-client-id');
    paypalSecretInput = document.getElementById('admin-paypal-secret');
    paypalSaveBtn = document.getElementById('admin-paypal-save-btn');
    paypalClientDisplay = document.getElementById('paypal-client-display');
    paypalSecretDisplay = document.getElementById('paypal-secret-display');
    paypalModeInput = document.getElementById('admin-paypal-mode');
    paypalModeDisplay = document.getElementById('paypal-mode-display');
    adminMotdInput = document.getElementById('admin-motd-text');
    adminMotdSaveBtn = document.getElementById('admin-motd-save-btn');
    adminEventsText = document.getElementById('admin-events-text');
    adminEventsSaveBtn = document.getElementById('admin-events-save-btn');
    regUsernameInput = document.getElementById('reg-username');
    regEmailInput = document.getElementById('reg-email');
    regPasswordInput = document.getElementById('reg-password');
    regConfirmInput = document.getElementById('reg-confirm-password');
    regTosCheckbox = document.getElementById('reg-tos-checkbox');
    regSubmitBtn = document.getElementById('register-submit-btn');
    regCancelBtn = document.getElementById('register-cancel-btn');
    regError = document.getElementById('register-error');
    forgotModal = document.getElementById('forgot-password-modal');
    forgotEmailInput = document.getElementById('forgot-email');
    forgotSubmitBtn = document.getElementById('forgot-submit-btn');
    forgotCancelBtn = document.getElementById('forgot-cancel-btn');
    forgotError = document.getElementById('forgot-error');
    infoModal = document.getElementById('info-modal');
    infoText = document.getElementById('info-text');
    infoCloseBtn = document.getElementById('info-close-btn');
    welcomeModal = document.getElementById('welcome-modal');
    welcomeCloseBtn = document.getElementById('welcome-close-btn');

    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    registerButton.addEventListener('click', () => {
        if (registerModal) registerModal.classList.add('active');
    });

    if (regCancelBtn) {
        regCancelBtn.addEventListener('click', () => {
            if (registerModal) registerModal.classList.remove('active');
        });
    }

    if (regSubmitBtn) regSubmitBtn.addEventListener('click', async () => {
        if (regError) regError.textContent = '';
        if (!isValidEmail(regEmailInput.value)) {
            if (regError) regError.textContent = 'Invalid email format';
            return;
        }
        if (!isValidPassword(regPasswordInput.value)) {
            if (regError) regError.textContent = 'Password must be at least 10 characters with letters and numbers';
            return;
        }
        if (regPasswordInput.value !== regConfirmInput.value) {
            if (regError) regError.textContent = 'Passwords do not match';
            return;
        }
        if (regTosCheckbox && !regTosCheckbox.checked) {
            if (regError) regError.textContent = 'You must accept the terms and conditions';
            return;
        }
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: regUsernameInput.value,
                email: regEmailInput.value,
                password: regPasswordInput.value,
                accepted_tos: regTosCheckbox ? regTosCheckbox.checked : false
            })
        });
        const result = await response.json();
        if (result.success) {
            displayMessage(result.message);
            if (registerModal) registerModal.classList.remove('active');
        } else if (regError) {
            regError.textContent = result.message;
        }
    });

    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (forgotModal) forgotModal.classList.add('active');
    });

    if (forgotCancelBtn) forgotCancelBtn.addEventListener('click', () => {
        if (forgotModal) forgotModal.classList.remove('active');
    });

    if (forgotSubmitBtn) forgotSubmitBtn.addEventListener('click', async () => {
        if (forgotError) forgotError.textContent = '';
        if (!isValidEmail(forgotEmailInput.value)) {
            if (forgotError) forgotError.textContent = 'Invalid email format';
            return;
        }
        const response = await fetch('/api/forgot_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: forgotEmailInput.value })
        });
        const result = await response.json();
        if (result.success) {
            displayMessage(result.message);
            if (forgotModal) forgotModal.classList.remove('active');
        } else if (forgotError) {
            forgotError.textContent = result.message;
        }
    });

    logoutButton.addEventListener('click', handleLogout);
    if (bugButton) {
        bugButton.addEventListener('click', () => {
            window.open('https://github.com/your_username/your_repo/issues', '_blank');
        });
    }

    if (infoCloseBtn) infoCloseBtn.addEventListener('click', () => {
        if (infoModal) infoModal.classList.remove('active');
    });

    if (welcomeCloseBtn) welcomeCloseBtn.addEventListener('click', () => {
        if (welcomeModal) welcomeModal.classList.remove('active');
        localStorage.setItem('welcomeShown', 'true');
    });

    document.querySelectorAll('#currency-info img').forEach(icon => {
        icon.classList.add('clickable');
        icon.addEventListener('click', () => {
            if (infoText) infoText.textContent = icon.getAttribute('title') || '';
            if (infoModal) infoModal.classList.add('active');
        });
    });

    if (playerNameDisplay) playerNameDisplay.addEventListener('click', openProfileModal);
    if (userIcon) userIcon.addEventListener('click', openProfileModal);
    if (profileCancelBtn) profileCancelBtn.addEventListener('click', () => profileModal.classList.remove('active'));
    if (profileSaveBtn) profileSaveBtn.addEventListener('click', async () => {
        const response = await fetch('/api/update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: profileEmailInput.value,
                profile_image: profileImageSelect.value
            })
        });
        const result = await response.json();
        if (result.success) {
            let passChanged = false;
            if (profileCurrentPasswordInput.value || profileNewPasswordInput.value || profileConfirmPasswordInput.value) {
                const passResp = await fetch('/api/change_password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_password: profileCurrentPasswordInput.value,
                        new_password: profileNewPasswordInput.value,
                        confirm_password: profileConfirmPasswordInput.value
                    })
                });
                const passResult = await passResp.json();
                passChanged = passResult.success;
                if (!passResult.success) {
                    displayMessage(passResult.message || 'Password change failed');
                }
            }
            if (!profileCurrentPasswordInput.value && !profileNewPasswordInput.value && !profileConfirmPasswordInput.value || passChanged) {
                profileModal.classList.remove('active');
                await fetchPlayerDataAndUpdate();
            }
            profileCurrentPasswordInput.value = '';
            profileNewPasswordInput.value = '';
            profileConfirmPasswordInput.value = '';
        }
    });
    if (adminSubmitBtn) adminSubmitBtn.addEventListener('click', async () => {
        const data = {
            username: document.getElementById('admin-username').value,
            action: document.getElementById('admin-action').value,
            gems: parseInt(document.getElementById('admin-gems').value) || null,
            energy: parseInt(document.getElementById('admin-energy').value) || null,
            platinum: parseInt(document.getElementById('admin-platinum').value) || null,
            gold: parseInt(document.getElementById('admin-gold').value) || null,
            character_name: document.getElementById('admin-character-name').value,
            character_id: parseInt(document.getElementById('admin-character-name').value)
        };
        const response = await fetch('/api/admin/user_action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        displayMessage(result.success ? 'Action completed' : result.message);
    });
    if (paypalSaveBtn) paypalSaveBtn.addEventListener('click', async () => {
        const response = await fetch('/api/admin/paypal_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: paypalClientIdInput.value, client_secret: paypalSecretInput.value, mode: paypalModeInput.value })
        });
        const result = await response.json();
        displayMessage(result.success ? 'PayPal settings saved' : 'Update failed');
        if (result.success) loadPaypalConfig();
        // Refresh the store so PayPal buttons appear without a full page reload
        updateStoreDisplay();
    });
    const paypalRemoveBtn = document.getElementById('admin-paypal-remove-btn');
    if (paypalRemoveBtn) paypalRemoveBtn.addEventListener('click', async () => {
        const response = await fetch('/api/admin/paypal_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: '', client_secret: '', mode: 'sandbox' })
        });
        const result = await response.json();
        displayMessage(result.success ? 'PayPal settings removed' : 'Update failed');
        if (result.success) loadPaypalConfig();
        updateStoreDisplay();
    });
    if (adminMotdSaveBtn) adminMotdSaveBtn.addEventListener('click', async () => {
        const response = await fetch('/api/admin/motd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motd: adminMotdInput.value })
        });
        const result = await response.json();
        displayMessage(result.success ? 'MOTD updated' : 'Update failed');
        if (result.success) updateMotd();
    });
    if (adminEventsSaveBtn) adminEventsSaveBtn.addEventListener('click', async () => {
        const response = await fetch('/api/admin/lore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: adminEventsText.value })
        });
        const result = await response.json();
        displayMessage(result.success ? 'Events updated' : 'Update failed');
    });

    const performSummon = async (btn, count = 1, free = false) => {
        if (!btn) return;
        btn.disabled = true;
        btn.classList.add('summon-flash');
        setTimeout(() => btn.classList.remove('summon-flash'), 500);
        if (summonButton) summonButton.disabled = true;
        if (summonTenButton) summonTenButton.disabled = true;
        if (freeSummonButton) freeSummonButton.disabled = true;
        const response = await fetch('/api/summon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: count, free: free })
        });
        const result = await response.json();
        setTimeout(() => {
            if (summonButton) summonButton.disabled = false;
            if (summonTenButton) summonTenButton.disabled = false;
            updateResourceTimers();
        }, 1500);
        if (result.success) {
            const characters = result.characters || [];
            summonResultContainer.innerHTML = '';
            characters.forEach(character => {
                const element = character.element || 'None';
                summonResultContainer.innerHTML += `<div class="team-slot"><div class="card-header"><div class="card-rarity rarity-${character.rarity.toLowerCase()}">[${character.rarity}]</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img src="/static/images/characters/${character.image_file}" alt="${character.name}"><h4>${character.name}</h4><p>ATK: ${character.base_atk} | HP: ${character.base_hp}</p><p>Crit: ${character.crit_chance}% | Crit DMG: ${character.crit_damage}x</p></div>`;
            });
            summonResultContainer.classList.add('show');
            await fetchPlayerDataAndUpdate();
        } else {
            displayMessage(`Summon Failed: ${result.message}`);
        }
    };

    if (summonButton) summonButton.addEventListener('click', () => performSummon(summonButton, 1, false));
    if (summonTenButton) summonTenButton.addEventListener('click', () => performSummon(summonTenButton, 10, false));
    if (freeSummonButton) freeSummonButton.addEventListener('click', () => performSummon(freeSummonButton, 1, true));

    chatSendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', () => {
            chatContainer.classList.toggle('collapsed');
            chatToggleBtn.textContent = chatContainer.classList.contains('collapsed') ? '▴' : '▾';
        });
    }

    // --- FIX #1: Logic for Nav Buttons Restored ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetViewId = button.dataset.view;
            mainContent.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.getElementById(targetViewId)?.classList.add('active');
            if (targetViewId !== 'summon-view') {
                summonResultContainer.innerHTML = '';
                summonResultContainer.classList.remove('show');
            }

            if (targetViewId === 'lore-view') {
                 fetch('/api/lore').then(res => res.json()).then(result => { if(result.success) loreContainer.textContent = result.data; });
            }
            // This ensures the equipment list is fetched when the tab is clicked
            if (targetViewId === 'equipment-view') {
                updateEquipmentDisplay();
            }
            if (targetViewId === 'store-view') {
                updateStoreDisplay();
            }
            if (targetViewId === 'admin-view') {
                loadPaypalConfig();
                loadMotd();
                loadEventsText();
            }
            if (targetViewId === 'online-view') {
                updateAllUsers();
            }
        });
    });

    // --- MAIN EVENT DELEGATOR FOR ALL DYNAMIC CONTENT ---
    document.body.addEventListener('click', async (e) => {
        const target = e.target;

        // --- FIX #2: Correctly handle the result for team management ---
        if (target.classList.contains('team-manage-button')) {
            const charId = parseInt(target.dataset.charId);
            const action = target.dataset.action;
            const response = await fetch('/api/manage_team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ char_id: charId, action: action }) });
            const result = await response.json(); // Save the result to a variable
            if(!result.success) {
                displayMessage(`Team Update Failed: ${result.message}`);
            }
            await fetchPlayerDataAndUpdate();
        }
        else if (target.classList.contains('merge-button')) {
            const charName = target.dataset.charName;
            const response = await fetch('/api/merge_heroes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: charName }) });
            const result = await response.json();
            displayMessage(result.message);
            if(result.success) await fetchPlayerDataAndUpdate();
        }
        else if (target.classList.contains('equip-button')) {
            const heroId = parseInt(target.dataset.heroId);
            const heroInstance = gameState.collection.find(h => h.id === heroId);
            if (heroInstance) openHeroDetailModal(heroInstance);
        }
        else if (target.classList.contains('hero-portrait')) {
            heroImageLarge.src = target.src;
            heroImageOverlay.classList.add('active');
        }
        else if (target.classList.contains('fight-button')) {
            const stageNum = parseInt(target.dataset.stageNum);
            currentStageForFight = stageNum;
            const response = await fetch(`/api/stage_info/${stageNum}`);
            const result = await response.json();
            if (result.success) {
                const enemy = result.enemy;
                const element = enemy.element || 'None';
                document.getElementById('intel-enemy-info').innerHTML = `<div class="team-slot"><div class="card-header"><div class="card-rarity">Enemy</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img src="/static/images/${enemy.image_file}" alt="${enemy.name}"><h4>${enemy.name}</h4><div class="card-stats">HP: ~${enemy.hp} | ATK: ~${enemy.atk}</div></div>`;
                document.getElementById('intel-modal-overlay').classList.add('active');
            } else { displayMessage(`Error: ${result.message}`); }
        }
        else if (target.classList.contains('dungeon-fight-button')) {
            const response = await fetch('/api/fight_dungeon', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                gameScreen.classList.remove('active');
                battleScreen.classList.add('active');
                await startBattle(result);
            } else { displayMessage(`Dungeon Failed: ${result.message}`); }
        }
        else if (target.id === 'intel-close-btn') document.getElementById('intel-modal-overlay').classList.remove('active');
        else if (target.id === 'intel-change-team-btn') {
            document.getElementById('intel-modal-overlay').classList.remove('active');
            document.querySelector('.nav-button[data-view="collection-view"]').click();
        }
        else if (target.id === 'intel-start-fight-btn') {
            document.getElementById('intel-modal-overlay').classList.remove('active');
            const response = await fetch('/api/fight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: currentStageForFight }) });
            const result = await response.json();
            if (result.success) {
                gameScreen.classList.remove('active');
                battleScreen.classList.add('active');
                await startBattle(result);
            } else { displayMessage(`Fight Failed: ${result.message}`); }
        }
        else if (target.id === 'close-hero-detail-btn') document.getElementById('hero-detail-overlay').classList.remove('active');
        else if (target.id === 'confirm-equip-btn') {
            const heroId = target.dataset.heroId;
            const equipmentId = document.getElementById('equip-select').value;
            if (!equipmentId) { displayMessage("Please select an item to equip."); return; }
            await fetch('/api/equip_item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ character_id: parseInt(heroId), equipment_id: parseInt(equipmentId) }) });
            document.getElementById('hero-detail-overlay').classList.remove('active');
            await fetchPlayerDataAndUpdate();
        }
        else if (target.classList.contains('level-up-card-btn')) {
            const heroId = target.dataset.heroId;
            const response = await fetch('/api/level_up', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ char_id: parseInt(heroId) }) });
            const result = await response.json();
            if (!result.success) displayMessage(result.message);
            await fetchPlayerDataAndUpdate();
        }
        else if (target.classList.contains('sell-hero-btn')) {
            const heroId = target.dataset.heroId;
            const response = await fetch('/api/sell_hero', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ char_id: parseInt(heroId) }) });
            const result = await response.json();
            if (result.success) displayMessage(`Sold for ${result.gold_received} gold`);
            else displayMessage(result.message);
            await fetchPlayerDataAndUpdate();
        }
        else if (target.classList.contains('unequip-btn')) {
            const equipmentId = target.dataset.itemId;
            await fetch('/api/unequip_item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equipment_id: parseInt(equipmentId) }) });
            document.getElementById('hero-detail-overlay').classList.remove('active');
            await fetchPlayerDataAndUpdate();
        }
        else if (target.classList.contains('purchase-btn')) {
            const button = target;
            button.disabled = true;
            const packId = button.dataset.packageId;
            const response = await fetch('/api/purchase_item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ package_id: packId }) });
            const result = await response.json();
            displayMessage(result.message || (result.success ? 'Purchase successful!' : 'Purchase failed'));
            if(result.success) await fetchPlayerDataAndUpdate();
            button.disabled = false;
            updateStoreDisplay();
        }
        else if (target.id === 'close-hero-image-btn') {
            heroImageOverlay.classList.remove('active');
        }
        else if (target.id === 'battle-return-button') {
            battleScreen.classList.remove('active');
            gameScreen.classList.add('active');
            await fetchPlayerDataAndUpdate();
        }
        else if (target.id === 'battle-next-button') {
            const nextStage = currentStageForFight + 1;
            const response = await fetch('/api/fight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: nextStage })
            });
            const result = await response.json();
            if (result.success) {
                currentStageForFight = nextStage;
                await startBattle(result);
                await fetchPlayerDataAndUpdate();
            } else {
                displayMessage(`Fight Failed: ${result.message}`);
            }
        }
        else if (target.id === 'battle-retry-button') {
            const response = await fetch('/api/fight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: currentStageForFight })
            });
            const result = await response.json();
            if (result.success) {
                await startBattle(result);
                await fetchPlayerDataAndUpdate();
            } else {
                displayMessage(`Fight Failed: ${result.message}`);
            }
        }
        else if (target.classList.contains('tutorial-btn')) {
            const text = target.dataset.tutorial || '';
            document.getElementById('tutorial-text').textContent = text;
            document.getElementById('tutorial-modal').classList.add('active');
        }
        else if (target.id === 'tutorial-close-btn') {
            document.getElementById('tutorial-modal').classList.remove('active');
        }
    });
}

// --- ASYNC & STATE FUNCTIONS ---
const delay = ms => new Promise(res => setTimeout(res, ms));

function getScaledStats(hero) {
    const charDef = masterCharacterList.find(c => c.name === hero.character_name) || {};
    const rarityMult = {"Common":1.0,"Rare":1.3,"SSR":1.8,"UR":2.5,"LR":3.5}[hero.rarity] || 1.0;
    const levelMult = 1 + 0.10 * (hero.level - 1);
    const atk = Math.round((charDef.base_atk || 0) * rarityMult * levelMult);
    const hp = Math.round((charDef.base_hp || 0) * rarityMult * levelMult);
    return { atk, hp, crit: charDef.crit_chance, critDmg: charDef.crit_damage };
}

async function initializeGame() {
    const gameDataResponse = await fetch('/api/game_data');
    if (gameDataResponse.ok) masterCharacterList = (await gameDataResponse.json()).characters;
    updateMotd();
    const loggedIn = await fetchPlayerDataAndUpdate();
    if (loggedIn) {
        loginScreen.classList.remove('active');
        gameScreen.classList.add('active');
        if (chatContainer) chatContainer.classList.remove('hidden');
        connectSocket();
        if (!localStorage.getItem('welcomeShown') && welcomeModal) {
            welcomeModal.classList.add('active');
        }
    } else {
        loginScreen.classList.add('active');
        gameScreen.classList.remove('active');
        if (chatContainer) chatContainer.classList.add('hidden');
    }
}

async function fetchPlayerDataAndUpdate() {
    try {
        const response = await fetch('/api/player_data');
        if (response.status === 401) { await handleLogout(); return false; }
        const result = await response.json();
        if (result.success) { 
            gameState = result.data; 
            if (gameState.is_admin) {
                loadPaypalConfig();
                loadMotd();
                loadEventsText();
            }
            updateUI(); 
            return true; 
        }
        else { await handleLogout(); return false; }
    } catch (error) { console.error('Failed to fetch player data:', error); return false; }
}

async function handleLogin() {
    const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value }) });
    const result = await response.json();
    if (result.success) await initializeGame();
    else displayMessage(`Login Failed: ${result.message}`);
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    if (socket) socket.disconnect();
    gameState = {};
    loginScreen.classList.add('active');
    gameScreen.classList.remove('active');
    if (chatContainer) chatContainer.classList.add('hidden');
    usernameInput.value = '';
    passwordInput.value = '';
}

function connectSocket() {
    if (socket) socket.disconnect();
    socket = io();
    socket.on('connect', () => console.log('Socket connected successfully.'));
    socket.on('receive_message', (data) => {
        const messageElement = document.createElement('div');
        messageElement.innerHTML = `<strong>${data.username}:</strong> ${data.message}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    socket.on('update_online_list', (users) => {
        if (!gameState.is_admin) return;
        onlineListContainer.innerHTML = '<h3>Currently Online:</h3>';
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'online-list-item';
            userElement.textContent = `${user.username} - Floor ${user.current_stage} | Runs ${user.dungeon_runs}`;
            onlineListContainer.appendChild(userElement);
        });
    });
}

async function openHeroDetailModal(hero) {
    const modalOverlay = document.getElementById('hero-detail-overlay');
    const modalContent = document.getElementById('hero-detail-content');
    modalContent.innerHTML = 'Loading hero details...';
    modalOverlay.classList.add('active');
    const equipResponse = await fetch('/api/player_equipment');
    const equipResult = await equipResponse.json();
    const allPlayerItems = equipResult.equipment || [];
    const unequippedItems = allPlayerItems.filter(item => item.is_equipped_on === null);
    const fullHeroData = gameState.collection.find(h => h.id === hero.id);
    const charDef = masterCharacterList.find(c => c.name === fullHeroData.character_name) || {};
    const equippedItems = allPlayerItems.filter(item => item.is_equipped_on === fullHeroData.id);
    const stats = getScaledStats(fullHeroData);
    let html = `
        <img class="hero-detail-portrait" src="/static/images/characters/${charDef.image_file || 'placeholder_char.png'}" alt="${fullHeroData.character_name}">
        <h3>${fullHeroData.character_name}</h3>
        <p>Level: ${fullHeroData.level}</p>
        <p>ATK: ${stats.atk} | HP: ${stats.hp}</p>
        <h4>Equipped Items</h4>
        <div class="equipped-slots">
            <p>Weapon: ${equippedItems[0]?.equipment_name || 'Empty'}</p>
            ${equippedItems.length > 0 ? `<button class="unequip-btn" data-item-id="${equippedItems[0]?.id}">Unequip</button>` : ''}
        </div>
        <h4>Available to Equip</h4>
        <select id="equip-select">
            <option value="">-- Select an item --</option>
            ${unequippedItems.map(item => `<option value="${item.id}">${item.equipment_name} (${item.rarity})</option>`).join('')}
        </select>
        <div class="modal-buttons">
            <button id="confirm-equip-btn" data-hero-id="${fullHeroData.id}">Equip Selected</button>
            <button id="close-hero-detail-btn">Close</button>
        </div>
    `;
    modalContent.innerHTML = html;
}

function openProfileModal() {
    if (!profileModal) return;
    profileEmailInput.value = gameState.email || '';
    profileCurrentPasswordInput.value = '';
    profileNewPasswordInput.value = '';
    profileConfirmPasswordInput.value = '';
    profileImageSelect.innerHTML = '';
    masterCharacterList.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.image_file;
        opt.textContent = c.name;
        if (gameState.profile_image === c.image_file) opt.selected = true;
        profileImageSelect.appendChild(opt);
    });
    profileModal.classList.add('active');
}

function sendMessage() {
    if (chatInput.value.trim() !== '') {
        socket.emit('send_message', { message: chatInput.value });
        chatInput.value = '';
    }
}

// --- UI UPDATE FUNCTIONS ---
function updateUI() {
    if (!gameState || !gameState.username) return;
    playerNameDisplay.textContent = gameState.username;
    if (userIcon && gameState.profile_image) {
        userIcon.src = `/static/images/characters/${gameState.profile_image}`;
    }
    gemCountDisplay.textContent = gameState.gems;
    if (platinumCountDisplay) platinumCountDisplay.textContent = gameState.premium_gems;
    if (energyCountDisplay) energyCountDisplay.textContent = gameState.energy;
    if (energyMaxDisplay) energyMaxDisplay.textContent = gameState.energy_cap;
    if (dungeonEnergyCountDisplay) dungeonEnergyCountDisplay.textContent = gameState.dungeon_energy;
    if (dungeonMaxDisplay) dungeonMaxDisplay.textContent = gameState.dungeon_cap;
    if (goldCountDisplay) goldCountDisplay.textContent = gameState.gold;
    if (dungeonRunCount) dungeonRunCount.textContent = gameState.dungeon_runs;
    const towerCount = document.getElementById('tower-floor-count');
    if (towerCount) towerCount.textContent = gameState.current_stage;
    document.querySelectorAll('.admin-only').forEach(el => {
        const disp = el.tagName === 'DIV' ? 'block' : 'inline-block';
        el.style.display = gameState.is_admin ? disp : 'none';
    });
    updateTeamDisplay();
    updateCollectionDisplay();
    updateCampaignDisplay();
    updateTopPlayer();
    updateMotd();
    startResourceTimers();
}

async function updateEquipmentDisplay() {
    if (!equipmentContainer) return;
    equipmentContainer.innerHTML = 'Loading...';
    const response = await fetch('/api/player_equipment');
    const result = await response.json();
    if (!result.success) { equipmentContainer.innerHTML = 'Failed to load equipment.'; return; }
    equipmentContainer.innerHTML = '';
    const equipmentDefsResponse = await fetch('/static/equipment.json');
    if (!equipmentDefsResponse.ok) return;
    const equipmentDefs = await equipmentDefsResponse.json();
    const statsMap = equipmentDefs.reduce((map, item) => { map[item.name] = item.stat_bonuses; return map; }, {});
    if (result.equipment.length === 0) {
        equipmentContainer.innerHTML = '<p>Your armory is empty. Farm the Armory to find loot, it is an end game mechanic.</p>';
        return;
    }
    result.equipment.forEach(item => {
        const card = document.createElement('div');
        card.className = 'collection-card';
        const stats = statsMap[item.equipment_name] || {};
        const statsText = Object.entries(stats).map(([key, value]) => `${key.toUpperCase()}: +${value}`).join(' | ');
        const rarityClass = item.rarity.toLowerCase();
        card.innerHTML = `<div class="card-header"><div class="card-rarity rarity-${rarityClass}">[${item.rarity}]</div></div><h4>${item.equipment_name}</h4><p class="card-stats">${statsText}</p><div class="item-status">${item.is_equipped_on ? `Equipped` : 'Unequipped'}</div>`;
        equipmentContainer.appendChild(card);
    });
}

async function updateAllUsers() {
    if (!towerScoresContainer || !dungeonScoresContainer) return;
    towerScoresContainer.innerHTML = 'Loading...';
    dungeonScoresContainer.innerHTML = 'Loading...';
    const response = await fetch('/api/all_users');
    const result = await response.json();
    if (!result.success) {
        towerScoresContainer.innerHTML = 'Failed to load users.';
        dungeonScoresContainer.innerHTML = '';
        return;
    }
    const users = result.users || [];
    const towerSorted = [...users].sort((a, b) => b.current_stage - a.current_stage);
    const dungeonSorted = [...users].sort((a, b) => b.dungeon_runs - a.dungeon_runs);
    towerScoresContainer.innerHTML = '';
    dungeonScoresContainer.innerHTML = '';
    towerSorted.forEach((u, idx) => {
        const div = document.createElement('div');
        div.className = 'online-list-item';
        div.textContent = `${idx + 1}. ${u.username} - Floor ${u.current_stage}`;
        towerScoresContainer.appendChild(div);
    });
    dungeonSorted.forEach((u, idx) => {
        const div = document.createElement('div');
        div.className = 'online-list-item';
        div.textContent = `${idx + 1}. ${u.username} - Runs ${u.dungeon_runs}`;
        dungeonScoresContainer.appendChild(div);
    });
}

async function updateTopPlayer() {
    const nameEl = document.getElementById('top-player-name');
    const stageEl = document.getElementById('top-player-stage');
    if (!nameEl || !stageEl) return;
    const response = await fetch('/api/top_player');
    const result = await response.json();
    if (result.success && result.player) {
        nameEl.textContent = result.player.username;
        stageEl.textContent = result.player.current_stage;
    }
}

async function loadPaypalConfig() {
    if (!paypalClientIdInput || !paypalSecretInput) return;
    const resp = await fetch('/api/admin/paypal_config');
    const result = await resp.json();
    if (result.success && result.config) {
        paypalClientIdInput.value = result.config.client_id || '';
        paypalSecretInput.value = result.config.client_secret || '';
        if (paypalClientDisplay) paypalClientDisplay.textContent = result.config.client_id || '';
        if (paypalSecretDisplay) paypalSecretDisplay.textContent = result.config.client_secret || '';
        if (paypalModeInput) paypalModeInput.value = result.config.mode || 'sandbox';
        if (paypalModeDisplay) paypalModeDisplay.textContent = result.config.mode || 'sandbox';
    }
}

async function loadMotd() {
    if (!adminMotdInput) return;
    const resp = await fetch('/api/motd');
    const result = await resp.json();
    if (result.success) adminMotdInput.value = result.motd || '';
}

async function loadEventsText() {
    if (!adminEventsText) return;
    const resp = await fetch('/api/lore');
    const result = await resp.json();
    if (result.success) adminEventsText.value = result.data || '';
}

async function updateMotd() {
    const resp = await fetch('/api/motd');
    const result = await resp.json();
    if (result.success) {
        const box = document.querySelector('#motd-container p');
        if (box) box.textContent = result.motd;
    }
}

async function updateStoreDisplay() {
    if (!storePackagesContainer) return;
    storePackagesContainer.innerHTML = 'Loading...';
    const response = await fetch('/api/store_items');
    const result = await response.json();
    if (!result.success) { storePackagesContainer.innerHTML = 'Failed to load store.'; return; }
    const paypalResp = await fetch('/api/paypal_client_id');
    const paypalData = await paypalResp.json();
    const clientId = paypalData.client_id;
    const paypalScript = document.getElementById('paypal-sdk');
    if (clientId && paypalScript) {
        const desiredSrc = `https://www.paypal.com/sdk/js?client-id=${clientId}`;
        if (!paypalScript.src || paypalScript.src !== desiredSrc) {
            paypalScript.onload = () => updateStoreDisplay();
            paypalScript.src = desiredSrc;
            return; // wait for PayPal SDK to load then rerun
        }
    }
    storePackagesContainer.innerHTML = '';
    result.items.forEach(pkg => {
        const div = document.createElement('div');
        div.className = 'store-package';
        const label = pkg.label ? `<span class="best-value">${pkg.label}</span>` : '';
        let text = '';
        if (pkg.amount) {
            text = `${currencyIconHtml} ${pkg.amount} Platinum - $${pkg.price.toFixed(2)} ${label}`;
        } else if (pkg.energy) {
            text = `${currencyIconHtml} +${pkg.energy} Energy - ${pkg.platinum_cost} Platinum`;
        } else if (pkg.dungeon_energy) {
            text = `${currencyIconHtml} +${pkg.dungeon_energy} Dungeon Runs - ${pkg.platinum_cost} Platinum`;
        }
        div.innerHTML = `<h4>${text}</h4>`;
        if (pkg.amount) {
            if (clientId && window.paypal) {
                const btnDiv = document.createElement('div');
                btnDiv.id = `paypal-${pkg.id}`;
                div.appendChild(btnDiv);
                window.paypal.Buttons({
                    createOrder: (data, actions) => actions.order.create({ purchase_units: [{ amount: { value: pkg.price.toFixed(2) } }] }),
                    onApprove: (data, actions) => {
                        return fetch('/api/paypal_complete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ package_id: pkg.id, order_id: data.orderID })
                        }).then(res => res.json()).then(res => {
                            displayMessage(res.success ? 'Purchase successful!' : 'Purchase failed');
                            if(res.success) fetchPlayerDataAndUpdate();
                        });
                    }
                }).render(`#paypal-${pkg.id}`);
            } else {
                div.innerHTML += '<span class="unavailable">PayPal unavailable</span>';
            }
        } else {
            div.innerHTML += `<button class="purchase-btn" data-package-id="${pkg.id}">Buy</button>`;
        }
        storePackagesContainer.appendChild(div);
    });
}

function updateTeamDisplay() {
    teamDisplayContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const member = gameState.team[i];
        const slot = document.createElement('div');
        slot.className = 'team-slot';
        if (member) {
            const element = member.element || 'None';
            const stats = getScaledStats(member);
            slot.innerHTML = `<div class="card-header"><div class="card-rarity rarity-${member.rarity.toLowerCase()}">[${member.rarity}]</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img class="hero-portrait" src="/static/images/characters/${member.image_file}" alt="${member.name}"><h4>${member.name}</h4><p>ATK: ${stats.atk} | HP: ${stats.hp}</p><p>Crit: ${stats.crit}% | Crit DMG: ${stats.critDmg}x</p>`;
        } else {
            slot.innerHTML = `<img src="/static/images/ui/placeholder_char.png" alt="Empty"><h4>Empty Slot</h4>`;
        }
        teamDisplayContainer.appendChild(slot);
    }
}

function updateCollectionDisplay() {
    collectionContainer.innerHTML = '';
    if (!gameState.collection || masterCharacterList.length === 0) return;
    if (gameState.collection.length === 0) {
        collectionContainer.innerHTML = '<p class="no-heroes">No heroes found. Summon new allies in the Summon section.</p>';
        return;
    }
    const heroCounts = gameState.collection.reduce((acc, char) => {
        acc[char.character_name] = (acc[char.character_name] || 0) + 1;
        return acc;
    }, {});
    const teamDBIds = gameState.team.filter(m => m).map(m => m.db_id);
    gameState.collection.forEach(hero => {
        const charDef = masterCharacterList.find(c => c.name === hero.character_name);
        if (!charDef) return;
        const card = document.createElement('div');
        card.className = 'collection-card';
        const element = charDef.element || 'None';
        const mergeCost = {'Common': 3, 'Rare': 3, 'SSR': 4, 'UR': 5}[hero.rarity] || 999;
        const canMerge = heroCounts[hero.character_name] >= mergeCost;
        const isInTeam = teamDBIds.includes(hero.id);
        const stats = getScaledStats(hero);
        card.innerHTML = `<div class="card-header"><div class="card-rarity rarity-${hero.rarity.toLowerCase()}">[${hero.rarity}]</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img class="hero-portrait" src="/static/images/characters/${charDef.image_file}" alt="${hero.character_name}"><h4>${hero.character_name}</h4><div class="card-stats">Level: ${hero.level}</div><div class="card-stats">ATK: ${stats.atk} | HP: ${stats.hp}</div><div class="card-stats">Crit: ${stats.crit}% | Crit DMG: ${stats.critDmg}x</div><div class="button-row"><button class="team-manage-button" data-char-id="${hero.id}" data-action="${isInTeam ? 'remove' : 'add'}">${isInTeam ? 'Remove' : 'Add'}</button><button class="merge-button" data-char-name="${hero.character_name}" ${canMerge ? '' : 'disabled'}>Merge</button><button class="equip-button" data-hero-id="${hero.id}">Equip</button><button class="level-up-card-btn" data-hero-id="${hero.id}">Level Up (${100 * hero.level})</button><button class="sell-hero-btn" data-hero-id="${hero.id}">Sell</button></div>`;
        if (isInTeam) {
            const indicator = document.createElement('div');
            indicator.className = 'in-team-indicator';
            indicator.textContent = '★';
            card.appendChild(indicator);
        }
        collectionContainer.appendChild(card);
    });
}

function updateCampaignDisplay() {
    // --- LORE HEADER LOGIC ---
    const currentStage = gameState.current_stage || 1;
    const header = document.querySelector('#campaign-view .view-header');
    if (header) {
        // Find the highest-level lore the player has unlocked
        let currentLore = TOWER_LORE[0]; // Default to the first entry
        for (const lore of TOWER_LORE) {
            if (currentStage >= lore.floor) {
                currentLore = lore;
            }
        }
        // Update the header with the unlocked lore
        header.querySelector('h2').textContent = currentLore.title;
        header.querySelector('p').textContent = currentLore.text;
    }
    // --- END OF LORE LOGIC ---

    const stageListContainer = document.getElementById('stage-list');
    stageListContainer.innerHTML = ''; // Clear previous stages

    // Helper function to create a single stage item
    const createStageItem = (stageNum, status) => {
        const stageItem = document.createElement('div');
        stageItem.className = 'stage-item';

        let iconPath = '/static/images/ui/stage_node_locked.png';
        let titleHTML = `<h3>Tower Floor ${stageNum}</h3>`;
        let descriptionHTML = '';
        let buttonHTML = '';

        if (status === 'farmable') {
            iconPath = '/static/images/ui/stage_node_cleared.png';
            const gemsForRepeat = 15;
            descriptionHTML = `<p class="stage-reward repeat"><img src="/static/images/ui/Gems_Icon.png" alt="Gems"> Farm this floor for a small reward.</p>`;
            buttonHTML = `<button class="fight-button" data-stage-num="${stageNum}">Fight Again (+${gemsForRepeat} Gems)</button>`;
        } else if (status === 'current') {
            iconPath = '/static/images/ui/stage_node_current.png';
            const gemsForFirstClear = 25 + (Math.floor((stageNum - 1) / 5) * 5);
            descriptionHTML = `<p class="stage-reward"><img src="/static/images/ui/Gems_Icon.png" alt="Gems"> First Clear Reward: ${gemsForFirstClear}</p>`;
            buttonHTML = `<button class="fight-button" data-stage-num="${stageNum}">Challenge Floor</button>`;
        }

        // This new HTML structure matches the Armory layout
        stageItem.innerHTML = `
            <div class="stage-icon">
                <img src="${iconPath}" alt="Status">
            </div>
            <div class="stage-content">
                ${titleHTML}
                ${descriptionHTML}
                <div class="stage-button-container">
                    ${buttonHTML}
                </div>
            </div>
        `;
        stageListContainer.appendChild(stageItem);
    };

    // Only create the stages that matter.

    // Create the "Fight Again" stage if the player is past stage 1
    if (currentStage > 1) {
        createStageItem(currentStage - 1, 'farmable');
    }

    // Always create the current stage
    createStageItem(currentStage, 'current');
}

async function startBattle(fightResult) {
    const playerTeamContainer = document.getElementById('battle-player-team');
    const enemyDisplayContainer = document.getElementById('battle-enemy-display');
    const logEntriesContainer = document.getElementById('battle-log-entries');
    const returnButton = document.getElementById('battle-return-button');
    const nextButton = document.getElementById('battle-next-button');
    const retryButton = document.getElementById('battle-retry-button');
    const playerHpBar = document.getElementById('player-hp-bar');
    const playerHpText = document.getElementById('player-hp-text');
    const enemyHpBar = document.getElementById('enemy-hp-bar');
    const enemyHpText = document.getElementById('enemy-hp-text');

    playerTeamContainer.innerHTML = '';
    enemyDisplayContainer.innerHTML = '';
    logEntriesContainer.innerHTML = '';
    returnButton.style.display = 'none';
    nextButton.style.display = 'none';
    retryButton.style.display = 'none';

    const startEntry = fightResult.log[0];
    // This parsing is fine for getting the name for the enemy card title.
    const enemyName = startEntry.message.split('faces a ')[1]?.split('!')[0].trim().split(' ').slice(1).join(' ') || 'Unknown Enemy';
    const enemyImage = startEntry.enemy_image;

    const maxTeamHP = gameState.team.reduce((total, member) => {
        if (!member) return total;
        // Use the same scaling logic as the server so the HP bar matches
        const stats = getScaledStats(member);
        return total + stats.hp;
    }, 0);
    const firstPlayerAttack = fightResult.log.find(e => e.type === 'player_attack');
    const maxEnemyHP = firstPlayerAttack ? firstPlayerAttack.enemy_hp + firstPlayerAttack.damage : 100;

    gameState.team.forEach(member => {
        if (!member) return;
        const slot = document.createElement('div');
        slot.className = 'team-slot';
        const element = member.element || 'None';
        slot.innerHTML = `<div class="card-header"><div class="card-rarity rarity-${member.rarity.toLowerCase()}">[${member.rarity}]</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img class="hero-portrait" src="/static/images/characters/${member.image_file}" alt="${member.name}"><h4>${member.name.split(',')[0]}</h4>`;
        playerTeamContainer.appendChild(slot);
    });

    enemyDisplayContainer.innerHTML = `<div class="team-slot"><img src="/static/images/${enemyImage}" alt="${enemyName}"><h4>${enemyName}</h4></div>`;

    const updateHealthBar = (bar, text, current, max) => {
        const percentage = Math.max(0, (current / max) * 100);
        bar.style.width = `${percentage}%`;
        text.textContent = `${Math.ceil(current)} / ${Math.ceil(max)}`;
    };
    const addLogMessage = (message, type = 'info', element) => {
        const p = document.createElement('p');
        p.textContent = message;
        p.className = `log-message ${type}`;
        if (element) p.classList.add(`element-${element.toLowerCase()}`);
        logEntriesContainer.prepend(p);
    };
    const showDamageNumber = (targetSide, damage, isCrit, element) => {
        const damageEl = document.createElement('div');
        damageEl.className = 'damage-number';
        if (element) damageEl.classList.add(`element-${element.toLowerCase()}`);
        if (isCrit) damageEl.classList.add('crit');
        damageEl.textContent = damage;
        targetSide.appendChild(damageEl);
        setTimeout(() => damageEl.remove(), 1000);
    };

    updateHealthBar(playerHpBar, playerHpText, maxTeamHP, maxTeamHP);
    updateHealthBar(enemyHpBar, enemyHpText, maxEnemyHP, maxEnemyHP);

    // Use the message directly from the first log entry
    addLogMessage(startEntry.message, 'info', startEntry.element);
    await delay(1000);

    // Loop through the rest of the log entries
    for (const entry of fightResult.log.slice(1)) {
        switch (entry.type) {
            case 'player_attack':
                // --- THIS IS THE FIX ---
                // We create a new message that combines the server data for clarity.
                // Your backend doesn't send a full message for attacks, so we build it here.
                addLogMessage(`${entry.attacker} uses ${entry.element} and ${entry.crit ? 'CRITS' : 'hits'} for ${entry.damage} damage! Enemy HP: ${entry.enemy_hp}`, 'player', entry.element);
                document.getElementById('battle-enemy-side').classList.add('attack-effect');
                showDamageNumber(document.getElementById('battle-enemy-side'), entry.damage, entry.crit, entry.element);
                updateHealthBar(enemyHpBar, enemyHpText, entry.enemy_hp, maxEnemyHP);
                await delay(750);
                document.getElementById('battle-enemy-side').classList.remove('attack-effect');
                break;
            case 'enemy_attack':
                addLogMessage(`Enemy uses ${entry.element} and ${entry.crit ? 'CRITS' : 'hits'} for ${entry.damage} damage! Your Team HP: ${entry.team_hp}`, 'enemy', entry.element);
                document.getElementById('battle-player-side').classList.add('attack-effect');
                showDamageNumber(document.getElementById('battle-player-side'), entry.damage, entry.crit, entry.element);
                updateHealthBar(playerHpBar, playerHpText, entry.team_hp, maxTeamHP);
                await delay(750);
                document.getElementById('battle-player-side').classList.remove('attack-effect');
                break;
            case 'end':
                // The 'end' entry from the server already has a good message.
                addLogMessage(entry.message, fightResult.victory ? 'victory' : 'defeat');
                if (fightResult.victory && fightResult.gems_won > 0) addLogMessage(`You earned ${fightResult.gems_won} gems!`);
                if (fightResult.victory && fightResult.gold_won > 0) addLogMessage(`You earned ${fightResult.gold_won} gold!`);
                if (fightResult.looted_item) {
                    const item = fightResult.looted_item;
                    const rarityClass = item.rarity.toLowerCase();
                    addLogMessage(`LOOTED: [${item.name}]`, `rarity-${rarityClass}`);
                }
                returnButton.style.display = 'block';
                if (fightResult.victory) {
                    nextButton.style.display = 'block';
                } else {
                    retryButton.style.display = 'block';
                }
                break;
        }
        await delay(250);
    }
}