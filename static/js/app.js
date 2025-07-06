// static/js/app.js (V5.5 - Final UI & Event Fixes)

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. V5.5 Finalizing...");
    attachEventListeners();
    const savedLang = localStorage.getItem('language') || 'en';
    setLanguage(savedLang, {reload: false});
    loadBackgrounds();
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
const languageSelect = document.getElementById('language-select');
let languageFlagButtons;
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
const bugLinkAnchor = document.getElementById('bug-report-link');
let bugReportLink = 'https://github.com/your_username/your_repo/issues';
const mainContent = document.getElementById('main-content');
const teamDisplayContainer = document.getElementById('team-display');
const dungeonRunCount = document.getElementById('dungeon-run-count');
const collectionContainer = document.getElementById('collection-container');
const summonButton = document.getElementById('perform-summon-button');
const summonTenButton = document.getElementById('summon-ten-button');
const freeSummonButton = document.getElementById('free-summon-button');
const freeSummonTimerDisplay = document.getElementById('free-summon-timer');
const gemGiftButton = document.getElementById('gem-gift-button');
const gemGiftTimerDisplay = document.getElementById('gem-gift-timer');
const platinumGiftButton = document.getElementById('platinum-gift-button');
const platinumGiftTimerDisplay = document.getElementById('platinum-gift-timer');
const homeNavButton = document.querySelector('.nav-button[data-view="home-view"]');
const summonNavButton = document.querySelector('.nav-button[data-view="summon-view"]');
const storeNavButton = document.querySelector('.nav-button[data-view="store-view"]');
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
// Use local icon so it always loads even without an internet connection
const currencyIconHtml = '<i class="fa-solid fa-diamond currency-icon"></i>';
// Base gold values for selling heroes by rarity
const SELL_BASE_VALUES = {
    'Common': 50,
    'Rare': 150,
    'SSR': 400,
    'UR': 800,
    'LR': 1500
};
let profileModal;
let profileEmailInput;
let profileCurrentPasswordInput;
let profileNewPasswordInput;
let profileConfirmPasswordInput;
let profileImageSelect;
let profileLanguageSelect;
let profileSaveBtn;
let profileDeleteBtn;
let gameEnergyCapInput;
let gameDungeonCapInput;
let gameEnergyRegenInput;
let gameDungeonRegenInput;
let gameSettingsSaveBtn;
let profileCancelBtn;
let adminSubmitBtn;
let paypalClientIdInput;
let paypalSecretInput;
let paypalSaveBtn;
let paypalClientDisplay;
let paypalSecretDisplay;
let paypalModeInput;
let paypalModeDisplay;
let priceSmallInput;
let priceMediumInput;
let priceSaveBtn;
let priceSmallDisplay;
let priceMediumDisplay;
let emailHostInput;
let emailPortInput;
let emailUserInput;
let emailPassInput;
let emailHostDisplay;
let emailUserDisplay;
let emailPortDisplay;
let adminMotdInput;
let adminMotdSaveBtn;
let adminEventsText;
let adminEventsSaveBtn;
let adminBugLinkInput;
let adminBugLinkSaveBtn;
let adminExpeditionNameInput;
let adminExpeditionEnemiesInput;
let adminExpeditionDescInput;
let adminExpeditionDropsInput;
let adminExpeditionResInput;
let adminExpeditionCreateBtn;
let adminExpeditionImageInput;
let adminExpeditionList;
let editingExpedition = null;
let newEntityTypeSelect;
let newEntityNameInput;
let newEntityCodeInput;
let newEntityRaritySelect;
let newEntityElementSelect;
let newEntityHpInput;
let newEntityAtkInput;
let newEntityCritChanceInput;
let newEntityCritDamageInput;
let newEntityImageInput;
let newEntityCreateBtn;
let adminCharacterList;
let adminEnemyList;
let loadedCharacters = [];
let loadedEnemies = [];
let loadedExpeditions = [];
let editingEntity = null;
let equipmentMap = {};
let loadedItems = [];
let editingItem = null;
let loadedTowerLevels = [];
let editingTowerLevel = null;
let adminItemNameInput;
let adminItemCodeInput;
let adminItemTypeInput;
let adminItemRaritySelect;
let adminItemStatsInput;
let adminItemImageInput;
let adminItemCreateBtn;
let adminItemList;
let adminTowerStageInput;
let adminTowerEnemyInput;
let adminTowerSaveBtn;
let adminTowerList;
let adminGiveItemInput;
let bgSectionSelect;
let bgImageInput;
let bgUploadBtn;
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

function formatDetails(obj) {
    return Object.entries(obj).map(([k, v]) => {
        const val = typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
        return `${k}: ${val}`;
    }).join(', ');
}

function formatDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

async function loadEquipmentMap() {
    if (Object.keys(equipmentMap).length) return;
    const resp = await fetch('/static/equipment.json');
    if (!resp.ok) return;
    const items = await resp.json();
    equipmentMap = {};
    items.forEach(it => { if (it.code) equipmentMap[it.code] = it.name; });
}

function setRedDot(element, show) {
    if (!element) return;
    const dot = element.querySelector('.red-dot');
    if (dot) dot.style.display = show ? 'block' : 'none';
}

function setLanguage(lang, opts = {reload: true}) {
    lang = (lang || '').toLowerCase();
    if (lang === 'jp' || lang === 'ja-jp') lang = 'ja';
    localStorage.setItem('language', lang);
    if (languageSelect) languageSelect.value = lang;
    languageFlagButtons.forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.lang === lang);
    });
    translatePage(lang).then(() => {
        if (opts.reload) window.location.reload();
    });
}

let resourceTimer;

function updateResourceTimers() {
    if (!gameState || !gameState.energy_last) return;
    const now = Math.floor(Date.now() / 1000);
    if (energyTimerDisplay) {
        if (gameState.energy < gameState.energy_cap) {
            const next = gameState.energy_last + gameState.energy_regen;
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
            const next = gameState.dungeon_last + gameState.dungeon_regen;
            const remain = next - now;
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
            setRedDot(freeSummonButton, true);
            setRedDot(summonNavButton, true);
        } else {
            freeSummonButton.disabled = true;
            freeSummonTimerDisplay.textContent = formatDuration(nextFree - now);
            setRedDot(freeSummonButton, false);
            setRedDot(summonNavButton, false);
        }
    }
    if (gemGiftButton && gemGiftTimerDisplay) {
        const nextGem = (gameState.gem_gift_last || 0) + 1800;
        if (now >= nextGem) {
            gemGiftButton.disabled = false;
            gemGiftTimerDisplay.textContent = '';
            setRedDot(gemGiftButton, true);
            setRedDot(homeNavButton, true);
        } else {
            gemGiftButton.disabled = true;
            gemGiftTimerDisplay.textContent = formatDuration(nextGem - now);
            setRedDot(gemGiftButton, false);
            setRedDot(homeNavButton, false);
        }
    }
    if (platinumGiftButton && platinumGiftTimerDisplay) {
        const nextPlat = (gameState.platinum_last || 0) + 86400;
        if (now >= nextPlat) {
            platinumGiftButton.disabled = false;
            platinumGiftTimerDisplay.textContent = '';
            setRedDot(platinumGiftButton, true);
            setRedDot(storeNavButton, true);
        } else {
            platinumGiftButton.disabled = true;
            platinumGiftTimerDisplay.textContent = formatDuration(nextPlat - now);
            setRedDot(platinumGiftButton, false);
            setRedDot(storeNavButton, false);
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
    },
    {
        floor: 60,
        title: "The Spiral Deepens",
        text: "Here the tower bends upon itself, repeating endlessly yet growing stronger."
    },
    {
        floor: 100,
        title: "The Endless Ascent",
        text: "Legends say no summit exists. Each hundred floors begins anew with greater trials."
    }
];

function calculateTowerRewards(stageNum, firstClear) {
    if (firstClear) {
        let gems = 25 + Math.floor(stageNum / 5) * 5;
        let gold = 100 * stageNum;
        if (stageNum % 10 === 0) {
            gems += 25;
            gold *= 2;
        }
        return { gems, gold };
    } else {
        let gems = 15 + (stageNum % 10 === 0 ? 10 : 0);
        let gold = 50 * stageNum;
        return { gems, gold };
    }
}

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
    profileLanguageSelect = document.getElementById('profile-language-select');
    profileSaveBtn = document.getElementById('profile-save-btn');
    profileDeleteBtn = document.getElementById('profile-delete-btn');
    profileCancelBtn = document.getElementById('profile-cancel-btn');
    adminSubmitBtn = document.getElementById('admin-submit-btn');
    paypalClientIdInput = document.getElementById('admin-paypal-client-id');
    paypalSecretInput = document.getElementById('admin-paypal-secret');
    paypalSaveBtn = document.getElementById('admin-paypal-save-btn');
    paypalClientDisplay = document.getElementById('paypal-client-display');
    paypalSecretDisplay = document.getElementById('paypal-secret-display');
    paypalModeInput = document.getElementById('admin-paypal-mode');
    paypalModeDisplay = document.getElementById('paypal-mode-display');
    priceSmallInput = document.getElementById('admin-price-pack-small');
    priceMediumInput = document.getElementById('admin-price-pack-medium');
    priceSaveBtn = document.getElementById('admin-price-save-btn');
    priceSmallDisplay = document.getElementById('price-small-display');
    priceMediumDisplay = document.getElementById('price-medium-display');
    emailHostInput = document.getElementById('admin-email-host');
    emailPortInput = document.getElementById('admin-email-port');
    emailUserInput = document.getElementById('admin-email-user');
    emailPassInput = document.getElementById('admin-email-pass');
    emailHostDisplay = document.getElementById('email-host-display');
    emailUserDisplay = document.getElementById('email-user-display');
    emailPortDisplay = document.getElementById('email-port-display');
    adminMotdInput = document.getElementById('admin-motd-text');
    adminMotdSaveBtn = document.getElementById('admin-motd-save-btn');
    adminEventsText = document.getElementById('admin-events-text');
    adminEventsSaveBtn = document.getElementById('admin-events-save-btn');
    adminBugLinkInput = document.getElementById('admin-bug-link');
    adminBugLinkSaveBtn = document.getElementById('admin-bug-link-save-btn');
    adminExpeditionNameInput = document.getElementById('admin-expedition-name');
    adminExpeditionEnemiesInput = document.getElementById('admin-expedition-enemies');
    adminExpeditionDescInput = document.getElementById('admin-expedition-desc');
    adminExpeditionDropsInput = document.getElementById('admin-expedition-drops');
    adminExpeditionResInput = document.getElementById('admin-expedition-res');
    adminExpeditionCreateBtn = document.getElementById('admin-expedition-create-btn');
    adminExpeditionImageInput = document.getElementById('admin-expedition-image');
    adminExpeditionList = document.getElementById('admin-expedition-list');
    adminItemCodeInput = document.getElementById('admin-item-code');
    adminItemNameInput = document.getElementById('admin-item-name');
    adminItemTypeInput = document.getElementById('admin-item-type');
    adminItemRaritySelect = document.getElementById('admin-item-rarity');
    adminItemStatsInput = document.getElementById('admin-item-stats');
    adminItemImageInput = document.getElementById('admin-item-image');
    adminItemCreateBtn = document.getElementById('admin-item-create-btn');
    adminItemList = document.getElementById('admin-item-list');
    adminTowerStageInput = document.getElementById('admin-tower-stage');
    adminTowerEnemyInput = document.getElementById('admin-tower-enemy');
    adminTowerSaveBtn = document.getElementById('admin-tower-save-btn');
    adminTowerList = document.getElementById('admin-tower-list');
    adminGiveItemInput = document.getElementById('admin-item-give');
    bgSectionSelect = document.getElementById('bg-section-select');
    bgImageInput = document.getElementById('bg-image-input');
    bgUploadBtn = document.getElementById('bg-upload-btn');
    gameEnergyCapInput = document.getElementById('admin-energy-cap');
    gameDungeonCapInput = document.getElementById('admin-dungeon-cap');
    gameEnergyRegenInput = document.getElementById('admin-energy-regen');
    gameDungeonRegenInput = document.getElementById('admin-dungeon-regen');
    gameSettingsSaveBtn = document.getElementById('admin-game-save-btn');
    newEntityTypeSelect = document.getElementById('admin-entity-type');
    newEntityNameInput = document.getElementById('admin-entity-name');
    newEntityCodeInput = document.getElementById('admin-entity-code');
    newEntityRaritySelect = document.getElementById('admin-entity-rarity');
    newEntityElementSelect = document.getElementById('admin-entity-element');
    newEntityHpInput = document.getElementById('admin-entity-hp');
    newEntityAtkInput = document.getElementById('admin-entity-atk');
    newEntityCritChanceInput = document.getElementById('admin-entity-crit-chance');
    newEntityCritDamageInput = document.getElementById('admin-entity-crit-damage');
    newEntityImageInput = document.getElementById('admin-entity-image');
    newEntityCreateBtn = document.getElementById('admin-entity-create-btn');
    adminCharacterList = document.getElementById('admin-character-list');
    adminEnemyList = document.getElementById('admin-enemy-list');
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

    languageFlagButtons = document.querySelectorAll('.language-flag');

    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            setLanguage(languageSelect.value, {reload: true});
        });
    }

    languageFlagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang, {reload: true});
            if (profileLanguageSelect) profileLanguageSelect.value = btn.dataset.lang;
        });
    });

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
            window.open(bugReportLink, '_blank');
        });
    }

    if (infoCloseBtn) infoCloseBtn.addEventListener('click', () => {
        if (infoModal) infoModal.classList.remove('active');
    });

    if (welcomeCloseBtn) welcomeCloseBtn.addEventListener('click', () => {
        if (welcomeModal) welcomeModal.classList.remove('active');
        localStorage.setItem('welcomeShown', 'true');
    });

    const iconMessages = {
        'gems-icon': 'Gems - Earned from events and dungeons. Spend them at the Summoning Altar or purchase more in the Store.',
        'platinum-icon': 'Platinum - Purchased with real money. Use it for energy refills and special packs.',
        'gold-icon': 'Gold - Earned from battles and selling heroes. Spend it to level up heroes and equipment.',
        'energy-icon': 'Energy - Regenerates every 5 minutes or with Platinum. Required for Tower battles.',
        'dungeon-icon': 'Dungeon Energy - Regenerates every 15 minutes or with Platinum. Required for Armory expeditions.'
    };

    document.querySelectorAll('#currency-info .currency-icon').forEach(icon => {
        icon.classList.add('clickable');
        icon.addEventListener('click', async () => {
            const msg = iconMessages[icon.id] || '';
            if (infoText) infoText.textContent = await translateText(msg);
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
            if (profileLanguageSelect) {
                setLanguage(profileLanguageSelect.value, {reload: true});
            }
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
    if (profileDeleteBtn) profileDeleteBtn.addEventListener('click', async () => {
        const confirmMsg = await translateText('Are you sure you want to delete your account?');
        if (!confirm(confirmMsg)) return;
        const resp = await fetch('/api/delete_account', { method: 'POST' });
        const result = await resp.json();
        if (result.success) {
            await handleLogout();
        } else {
            displayMessage(result.message || 'Deletion failed');
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
            character_id: parseInt(document.getElementById('admin-character-name').value),
            item_code: adminGiveItemInput ? adminGiveItemInput.value : ''
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
    if (priceSaveBtn) priceSaveBtn.addEventListener('click', async () => {
        const response = await fetch('/api/admin/store_prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pack_small: parseFloat(priceSmallInput.value) || 0,
                pack_medium: parseFloat(priceMediumInput.value) || 0
            })
        });
        const result = await response.json();
        displayMessage(result.success ? 'Prices updated' : 'Update failed');
        if (result.success) loadStorePrices();
        updateStoreDisplay();
    });
    const emailSaveBtn = document.getElementById('admin-email-save-btn');
    if (emailSaveBtn) emailSaveBtn.addEventListener('click', async () => {
        const response = await fetch('/api/admin/email_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host: emailHostInput.value,
                port: parseInt(emailPortInput.value) || 587,
                username: emailUserInput.value,
                password: emailPassInput.value
            })
        });
        const result = await response.json();
        displayMessage(result.success ? 'Email settings saved' : 'Update failed');
        if (result.success) loadEmailConfig();
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
    if (adminBugLinkSaveBtn) adminBugLinkSaveBtn.addEventListener('click', async () => {
        const response = await fetch('/api/admin/bug_link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: adminBugLinkInput.value })
        });
        const result = await response.json();
        displayMessage(result.success ? 'Bug link updated' : 'Update failed');
        if (result.success) updateBugLink();
    });
    if (adminExpeditionCreateBtn) adminExpeditionCreateBtn.addEventListener('click', async () => {
        const form = new FormData();
        form.append('name', adminExpeditionNameInput.value.trim());
        form.append('enemies', adminExpeditionEnemiesInput.value);
        form.append('description', adminExpeditionDescInput.value.trim());
        form.append('drops', adminExpeditionDropsInput.value.trim());
        form.append('image_res', adminExpeditionResInput.value.trim());
        if (adminExpeditionImageInput.files[0]) form.append('image', adminExpeditionImageInput.files[0]);
        let method = 'POST';
        if (editingExpedition) {
            form.append('id', editingExpedition.id);
            method = 'PUT';
        }
        const response = await fetch('/api/admin/expedition', { method: method, body: form });
        const result = await response.json();
        displayMessage(result.success ? (editingExpedition ? 'Expedition updated' : 'Expedition created') : result.message || 'Update failed');
        if (result.success) {
            editingExpedition = null;
            adminExpeditionCreateBtn.textContent = 'Create Expedition';
            adminExpeditionNameInput.value = '';
            adminExpeditionEnemiesInput.value = '';
            adminExpeditionDescInput.value = '';
            adminExpeditionDropsInput.value = '';
            adminExpeditionResInput.value = '';
            adminExpeditionImageInput.value = '';
            loadExpeditionAdminList();
            loadItemAdminList();
            updateExpeditionDisplay();
        }
    });

    if (newEntityCreateBtn) newEntityCreateBtn.addEventListener('click', async () => {
        const form = new FormData();
        form.append('type', newEntityTypeSelect.value);
        form.append('code', newEntityCodeInput.value.trim());
        form.append('name', newEntityNameInput.value.trim());
        form.append('rarity', newEntityRaritySelect.value);
        form.append('element', newEntityElementSelect.value);
        form.append('base_hp', parseInt(newEntityHpInput.value) || 0);
        form.append('base_atk', parseInt(newEntityAtkInput.value) || 0);
        form.append('tier', parseInt(document.getElementById('admin-entity-tier').value) || 1);
        form.append('crit_chance', parseInt(newEntityCritChanceInput.value) || 0);
        form.append('crit_damage', parseFloat(newEntityCritDamageInput.value) || 0);
        if (newEntityImageInput.files[0]) {
            form.append('image', newEntityImageInput.files[0]);
        }
        let resp;
        if (editingEntity) {
            form.append('orig_code', editingEntity.origCode);
            resp = await fetch('/api/admin/entity', { method: 'PUT', body: form });
        } else {
            resp = await fetch('/api/admin/entity', { method: 'POST', body: form });
        }
        const result = await resp.json();
        displayMessage(result.success ? (editingEntity ? 'Entity updated' : 'Entity created') : result.message || 'Update failed');
        if (result.success) {
            editingEntity = null;
            newEntityCreateBtn.textContent = 'Create';
            newEntityCodeInput.value = '';
            newEntityNameInput.value = '';
            newEntityHpInput.value = '';
            newEntityAtkInput.value = '';
            document.getElementById('admin-entity-tier').value = '';
            newEntityCritChanceInput.value = '';
            newEntityCritDamageInput.value = '';
            newEntityImageInput.value = '';
            await loadEntityLists();
        }
    });

    if (adminItemCreateBtn) adminItemCreateBtn.addEventListener('click', async () => {
        const form = new FormData();
        form.append('code', adminItemCodeInput.value.trim());
        form.append('name', adminItemNameInput.value.trim());
        form.append('type', adminItemTypeInput.value.trim());
        form.append('rarity', adminItemRaritySelect.value);
        form.append('stats', adminItemStatsInput.value);
        if (adminItemImageInput.files[0]) form.append('image', adminItemImageInput.files[0]);
        let method = 'POST';
        if (editingItem) {
            form.append('orig_code', editingItem.origCode);
            method = 'PUT';
        }
        const resp = await fetch('/api/admin/item', { method: method, body: form });
        const result = await resp.json();
        displayMessage(result.success ? (editingItem ? 'Item updated' : 'Item created') : result.message || 'Update failed');
        if (result.success) {
            editingItem = null;
            adminItemCreateBtn.textContent = 'Create Item';
            adminItemCodeInput.value = '';
            adminItemNameInput.value = '';
            adminItemTypeInput.value = '';
            adminItemStatsInput.value = '';
            adminItemImageInput.value = '';
            loadItemAdminList();
        }
    });

    if (adminTowerSaveBtn) adminTowerSaveBtn.addEventListener('click', async () => {
        const stage = parseInt(adminTowerStageInput.value);
        const code = adminTowerEnemyInput.value.trim();
        if (!stage || !code) { displayMessage('Stage and code required'); return; }
        const method = editingTowerLevel ? 'PUT' : 'POST';
        const resp = await fetch('/api/admin/tower_level', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage: stage, enemy_code: code })
        });
        const result = await resp.json();
        displayMessage(result.success ? 'Level saved' : result.message || 'Update failed');
        if (result.success) {
            editingTowerLevel = null;
            adminTowerSaveBtn.textContent = 'Save Level';
            adminTowerStageInput.value = '';
            adminTowerEnemyInput.value = '';
            loadTowerLevelList();
        }
    });

    if (bgUploadBtn) bgUploadBtn.addEventListener('click', async () => {
        if (!bgImageInput.files[0]) return;
        const form = new FormData();
        form.append('section', bgSectionSelect.value);
        form.append('image', bgImageInput.files[0]);
        const resp = await fetch('/api/admin/background', { method: 'POST', body: form });
        const result = await resp.json();
        displayMessage(result.success ? 'Background updated' : result.message || 'Update failed');
        if (result.success) loadBackgrounds();
    });

    if (gameSettingsSaveBtn) gameSettingsSaveBtn.addEventListener('click', async () => {
        const resp = await fetch('/api/admin/game_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                energy_cap: parseInt(gameEnergyCapInput.value) || 0,
                dungeon_cap: parseInt(gameDungeonCapInput.value) || 0,
                energy_regen: parseInt(gameEnergyRegenInput.value) || 0,
                dungeon_regen: parseInt(gameDungeonRegenInput.value) || 0
            })
        });
        const result = await resp.json();
        displayMessage(result.success ? 'Settings saved' : result.message || 'Update failed');
        if (result.success) loadGameSettings();
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
    if (gemGiftButton) gemGiftButton.addEventListener('click', claimGemGift);
    if (platinumGiftButton) platinumGiftButton.addEventListener('click', claimPlatinumGift);

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
            applyBodyBackground(targetViewId);
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
            if (targetViewId === 'dungeons-view') {
                updateExpeditionDisplay();
            }
            if (targetViewId === 'store-view') {
                updateStoreDisplay();
            }
            if (targetViewId === 'admin-view') {
                loadPaypalConfig();
                loadEmailConfig();
                loadMotd();
                loadEventsText();
                loadEntityLists();
                loadExpeditionAdminList();
                loadItemAdminList();
                loadTowerLevelList();
                loadGameSettings();
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
        else if (target.classList.contains('edit-entity')) {
            const type = target.dataset.type;
            const code = target.dataset.code;
            const list = type === 'character' ? loadedCharacters : loadedEnemies;
            const ent = list.find(e => e.code === code);
            if (ent) {
                newEntityTypeSelect.value = type;
                newEntityCodeInput.value = ent.code;
                newEntityNameInput.value = ent.name;
                newEntityRaritySelect.value = ent.rarity;
                newEntityElementSelect.value = ent.element;
                newEntityHpInput.value = ent.base_hp;
                newEntityAtkInput.value = ent.base_atk;
                document.getElementById('admin-entity-tier').value = ent.tier || 1;
                newEntityCritChanceInput.value = ent.crit_chance;
                newEntityCritDamageInput.value = ent.crit_damage;
                editingEntity = {origCode: code};
                newEntityCreateBtn.textContent = 'Save';
                document.getElementById('admin-view').scrollTop = 0;
            }
        }
        else if (target.classList.contains('delete-entity')) {
            const type = target.dataset.type;
            const code = target.dataset.code;
            const resp = await fetch('/api/admin/entity', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type, code: code })
            });
            const result = await resp.json();
            displayMessage(result.success ? 'Entity removed' : result.message || 'Update failed');
            if (result.success) loadEntityLists();
        }
        else if (target.classList.contains('edit-expedition')) {
            const id = parseInt(target.dataset.id);
            const exp = loadedExpeditions.find(e => e.id === id);
            if (exp) {
                adminExpeditionNameInput.value = exp.name;
                adminExpeditionEnemiesInput.value = exp.levels.map(l => l.enemy).join(',');
                adminExpeditionDescInput.value = exp.description || '';
                adminExpeditionDropsInput.value = exp.drops || '';
                adminExpeditionResInput.value = exp.image_res || '';
                editingExpedition = exp;
                adminExpeditionCreateBtn.textContent = 'Save Expedition';
                document.getElementById('admin-view').scrollTop = 0;
            }
        }
        else if (target.classList.contains('delete-expedition')) {
            const id = parseInt(target.dataset.id);
            const resp = await fetch('/api/admin/expedition', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) });
            const result = await resp.json();
            displayMessage(result.success ? 'Expedition removed' : result.message || 'Update failed');
            if (result.success) loadExpeditionAdminList();
        }
        else if (target.classList.contains('exp-up') || target.classList.contains('exp-down')) {
            const id = parseInt(target.dataset.id);
            const direction = target.classList.contains('exp-up') ? 'up' : 'down';
            const resp = await fetch('/api/admin/expedition/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, direction }) });
            const result = await resp.json();
            if (result.success) loadExpeditionAdminList();
        }
        else if (target.classList.contains('edit-item')) {
            const code = target.dataset.code;
            const item = loadedItems.find(i => i.code === code);
            if (item) {
                adminItemCodeInput.value = item.code;
                adminItemNameInput.value = item.name;
                adminItemTypeInput.value = item.type;
                adminItemRaritySelect.value = item.rarity;
                adminItemStatsInput.value = JSON.stringify(item.stat_bonuses);
                editingItem = {origCode: code};
                adminItemCreateBtn.textContent = 'Save Item';
                document.getElementById('admin-view').scrollTop = 0;
            }
        }
        else if (target.classList.contains('delete-item')) {
            const code = target.dataset.code;
            const resp = await fetch('/api/admin/item', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) });
            const result = await resp.json();
            displayMessage(result.success ? 'Item removed' : result.message || 'Update failed');
            if (result.success) loadItemAdminList();
        }
        else if (target.classList.contains('edit-tower')) {
            const stage = parseInt(target.dataset.stage);
            const lvl = loadedTowerLevels.find(l => l.stage === stage);
            if (lvl) {
                adminTowerStageInput.value = lvl.stage;
                adminTowerEnemyInput.value = lvl.enemy_code;
                editingTowerLevel = lvl;
                adminTowerSaveBtn.textContent = 'Update Level';
                document.getElementById('admin-view').scrollTop = 0;
            }
        }
        else if (target.classList.contains('delete-tower')) {
            const stage = parseInt(target.dataset.stage);
            const resp = await fetch('/api/admin/tower_level', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: stage }) });
            const result = await resp.json();
            displayMessage(result.success ? 'Level removed' : result.message || 'Update failed');
            if (result.success) loadTowerLevelList();
        }
        else if (target.classList.contains('fight-button')) {
            const stageNum = parseInt(target.dataset.stageNum);
            currentStageForFight = stageNum;
            const response = await fetch(`/api/stage_info/${stageNum}`);
            const result = await response.json();
            if (result.success) {
                const enemy = result.enemy;
                const element = enemy.element || 'None';
                const cost = result.energy_cost;
                const gold = result.gold_reward;
                document.getElementById('intel-enemy-info').innerHTML = `<div class="team-slot"><div class="card-header"><div class="card-rarity">Enemy</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img src="/static/images/${enemy.image_file}" alt="${enemy.name}"><h4>${enemy.name}</h4><div class="card-stats">HP: ~${enemy.hp} | ATK: ~${enemy.atk}</div><p>Energy Cost: ${cost} | Gold: ${gold}</p></div>`;
                document.getElementById('intel-modal-overlay').classList.add('active');
            } else { displayMessage(`Error: ${result.message}`); }
        }
        else if (target.classList.contains('dungeon-fight-button')) {
            const expId = target.dataset.expeditionId;
            const payload = expId ? { expedition_id: parseInt(expId) } : {};
            const response = await fetch('/api/fight_dungeon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
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
    updateBugLink();
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
                loadEmailConfig();
                loadStorePrices();
                loadMotd();
                loadEventsText();
                loadBugLink();
            }
            updateUI(); 
            return true; 
        }
        else { await handleLogout(); return false; }
    } catch (error) { console.error('Failed to fetch player data:', error); return false; }
}

async function handleLogin() {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
    });
    const result = await response.json();
    if (result.success) {
        await initializeGame();
        applyBodyBackground('home-view');
        if (result.message) displayMessage(result.message);
    } else {
        displayMessage(`Login Failed: ${result.message}`);
    }
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    if (socket) socket.disconnect();
    gameState = {};
    loginScreen.classList.add('active');
    gameScreen.classList.remove('active');
    applyBodyBackground('login-screen');
    if (chatContainer) chatContainer.classList.add('hidden');
    usernameInput.value = '';
    passwordInput.value = '';
}

function connectSocket() {
    if (socket) socket.disconnect();
    socket = io();
    socket.on('connect', () => console.log('Socket connected successfully.'));
    socket.on('chat_history', (messages) => {
        chatMessages.innerHTML = '';
        messages.forEach(m => {
            const el = document.createElement('div');
            el.innerHTML = `<strong>${m.username}:</strong> ${m.message}`;
            chatMessages.appendChild(el);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
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
    const ph = document.createElement('option');
    ph.value = '';
    ph.disabled = true;
    ph.textContent = 'Select profile character';
    if (!gameState.profile_image) ph.selected = true;
    profileImageSelect.appendChild(ph);
    masterCharacterList.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.image_file;
        opt.textContent = c.name;
        if (gameState.profile_image === c.image_file) opt.selected = true;
        profileImageSelect.appendChild(opt);
    });
    if (profileLanguageSelect) {
        const stored = localStorage.getItem('language');
        if (stored === 'ja' || stored === 'es' || stored === 'en') {
            profileLanguageSelect.value = stored;
        } else {
            profileLanguageSelect.value = 'en';
        }
    }
    profileModal.classList.add('active');
}

function sendMessage() {
    if (chatInput.value.trim() !== '') {
        socket.emit('send_message', { message: chatInput.value });
        chatInput.value = '';
    }
}

async function claimGemGift() {
    const before = gameState.gems || 0;
    const resp = await fetch('/api/claim_gem_gift', { method: 'POST' });
    const result = await resp.json();
    if (result.success) {
        const gained = (result.gems || 0) - before;
        displayMessage(`You received ${gained} Gems! Come back in 30m for more.`);
        await fetchPlayerDataAndUpdate();
    } else {
        displayMessage(result.message || 'Gift not ready');
    }
}

async function claimPlatinumGift() {
    const before = gameState.premium_gems || 0;
    const resp = await fetch('/api/claim_platinum_gift', { method: 'POST' });
    const result = await resp.json();
    if (result.success) {
        const gained = (result.platinum || 0) - before;
        displayMessage(`You received ${gained} Platinum! Come back in 24h for more.`);
        await fetchPlayerDataAndUpdate();
    } else {
        displayMessage(result.message || 'Gift not ready');
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
    updateExpeditionDisplay();
    updateTopPlayer();
    updateMotd();
    updateBugLink();
    startResourceTimers();
    const lang = localStorage.getItem('language') || 'en';
    translatePage(lang);
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
    const imageMap = equipmentDefs.reduce((map, item) => { map[item.name] = item.image_file; return map; }, {});
    if (result.equipment.length === 0) {
        equipmentContainer.style.display = 'flex';
        equipmentContainer.style.justifyContent = 'center';
        equipmentContainer.style.alignItems = 'center';
        equipmentContainer.style.minHeight = '40vh';
        equipmentContainer.innerHTML = '<p class="empty-armory-message">Your armory is empty. Items can be obtained in the dungeon.</p>';
        return;
    }
    equipmentContainer.removeAttribute('style');
    result.equipment.forEach(item => {
        const card = document.createElement('div');
        card.className = 'collection-card';
        const stats = statsMap[item.equipment_name] || {};
        const statsText = Object.entries(stats).map(([key, value]) => `${key.toUpperCase()}: +${value}`).join(' | ');
        const rarityClass = item.rarity.toLowerCase();
        const imgFile = imageMap[item.equipment_name];
        const imgTag = imgFile ? `<img src="/static/images/items/${imgFile}" alt="${item.equipment_name}">` : '';
        card.innerHTML = `<div class="card-header"><div class="card-rarity rarity-${rarityClass}">[${item.rarity}]</div></div>${imgTag}<h4>${item.equipment_name}</h4><p class="card-stats">${statsText}</p><div class="item-status">${item.is_equipped_on ? `Equipped` : 'Unequipped'}</div>`;
        equipmentContainer.appendChild(card);
    });
}

async function updateExpeditionDisplay() {
    const list = document.getElementById('expedition-list');
    if (!list) return;
    list.innerHTML = 'Loading...';
    const resp = await fetch('/api/expeditions');
    const data = await resp.json();
    if (!data.success) { list.innerHTML = 'Failed to load'; return; }
    await loadEquipmentMap();
    list.innerHTML = '';
    data.expeditions.forEach(exp => {
        const wrapper = document.createElement('div');
        wrapper.className = 'dungeon-container';
        const img = exp.image_file ? `/static/images/ui/${exp.image_file}` : '/static/images/ui/dungeon_armory.png';
        let drops = '';
        if (exp.drops) {
            const parts = exp.drops.split(',').map(p => p.trim()).filter(Boolean);
            const nice = parts.map(p => {
                const [code, chance] = p.split(':');
                const name = equipmentMap[code.trim()] || code.trim();
                return `${name}: ${chance}%`;
            });
            drops = `<p>Drops: ${nice.join(', ')}</p>`;
        }
        const desc = exp.description ? `<p>${exp.description}</p>` : '';
        wrapper.innerHTML = `<div class="dungeon-image-container"><img src="${img}" alt="${exp.name}"></div><div class="dungeon-details-container"><h3>${exp.name}</h3>${desc}${drops}<button class="dungeon-fight-button" data-expedition-id="${exp.id}">Enter</button></div>`;
        list.appendChild(wrapper);
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
        const img = `<img class="score-profile" src="/static/images/characters/${u.profile_image || 'placeholder_char.png'}" alt="${u.username}">`;
        div.innerHTML = `${img}${idx + 1}. ${u.username} - Floor ${u.current_stage}`;
        towerScoresContainer.appendChild(div);
    });
    dungeonSorted.forEach((u, idx) => {
        const div = document.createElement('div');
        div.className = 'online-list-item';
        const img = `<img class="score-profile" src="/static/images/characters/${u.profile_image || 'placeholder_char.png'}" alt="${u.username}">`;
        div.innerHTML = `${img}${idx + 1}. ${u.username} - Runs ${u.dungeon_runs}`;
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

async function loadStorePrices() {
    if (!priceSmallInput || !priceMediumInput) return;
    const resp = await fetch('/api/admin/store_prices');
    const result = await resp.json();
    if (result.success && result.prices) {
        const small = result.prices.pack_small;
        const med = result.prices.pack_medium;
        priceSmallInput.value = small !== undefined ? small : '';
        priceMediumInput.value = med !== undefined ? med : '';
        if (priceSmallDisplay) priceSmallDisplay.textContent = small !== undefined ? small : '';
        if (priceMediumDisplay) priceMediumDisplay.textContent = med !== undefined ? med : '';
    }
}

async function loadEmailConfig() {
    if (!emailHostInput) return;
    const resp = await fetch('/api/admin/email_config');
    const result = await resp.json();
    if (result.success && result.config) {
        emailHostInput.value = result.config.host || '';
        emailPortInput.value = result.config.port || 587;
        emailUserInput.value = result.config.username || '';
        if (emailHostDisplay) emailHostDisplay.textContent = result.config.host || '';
        if (emailUserDisplay) emailUserDisplay.textContent = result.config.username || '';
        if (emailPortDisplay) emailPortDisplay.textContent = result.config.port || 587;
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

async function loadBugLink() {
    if (!adminBugLinkInput) return;
    const resp = await fetch('/api/bug_link');
    const result = await resp.json();
    if (result.success) adminBugLinkInput.value = result.url || '';
}

async function loadGameSettings() {
    if (!gameEnergyCapInput) return;
    const resp = await fetch('/api/admin/game_settings');
    const result = await resp.json();
    if (result.success && result.settings) {
        gameEnergyCapInput.value = result.settings.energy_cap;
        gameDungeonCapInput.value = result.settings.dungeon_cap;
        gameEnergyRegenInput.value = result.settings.energy_regen;
        gameDungeonRegenInput.value = result.settings.dungeon_regen;
    }
}

async function updateMotd() {
    const resp = await fetch('/api/motd');
    const result = await resp.json();
    if (result.success) {
        const box = document.querySelector('#motd-container p');
        if (box) box.textContent = result.motd;
    }
}

async function updateBugLink() {
    const resp = await fetch('/api/bug_link');
    const result = await resp.json();
    if (result.success) {
        bugReportLink = result.url || bugReportLink;
        if (bugLinkAnchor) bugLinkAnchor.href = bugReportLink;
    }
}

async function updateStoreDisplay() {
    if (!storePackagesContainer) return;
    storePackagesContainer.textContent = 'Loading...';
    storePackagesContainer.setAttribute('data-i18n', '');
    storePackagesContainer.dataset.orig = 'Loading...';
    const response = await fetch('/api/store_items');
    const result = await response.json();
    if (!result.success) { 
        storePackagesContainer.textContent = 'Failed to load store.'; 
        storePackagesContainer.dataset.orig = 'Failed to load store.';
        return; 
    }
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
        const textSpan = document.createElement('span');
        textSpan.className = 'package-text';
        textSpan.innerHTML = text;
        textSpan.setAttribute('data-i18n', '');
        textSpan.dataset.orig = text;
        div.appendChild(textSpan);
        // Append the container before rendering PayPal buttons so the element
        // exists in the DOM when PayPal queries for it.
        storePackagesContainer.appendChild(div);

        if (pkg.amount) {
            if (clientId && window.paypal) {
                const btnDiv = document.createElement('div');
                btnDiv.id = `paypal-${pkg.id}`;
                div.appendChild(btnDiv);
                window.paypal.Buttons({
                    style: { height: 30 },
                    createOrder: (data, actions) => actions.order.create({
                        purchase_units: [{
                            amount: { value: pkg.price.toFixed(2) },
                            custom_id: `${gameState.user_id}:${pkg.id}`
                        }]
                    }),
                    onApprove: (data, actions) => {
                        return actions.order.capture().then(() => {
                            return fetch('/api/paypal_complete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ package_id: pkg.id, order_id: data.orderID })
                            });
                        }).then(res => res.json()).then(res => {
                            displayMessage(res.success ? 'Purchase successful!' : 'Purchase failed');
                            if (res.success) fetchPlayerDataAndUpdate();
                        });
                    }
                }).render(`#paypal-${pkg.id}`);
            } else {
                const span = document.createElement('span');
                span.className = 'unavailable';
                span.textContent = 'PayPal unavailable';
                span.setAttribute('data-i18n', '');
                span.dataset.orig = 'PayPal unavailable';
                div.appendChild(span);
            }
        } else {
            const btn = document.createElement('button');
            btn.className = 'purchase-btn';
            btn.dataset.packageId = pkg.id;
            btn.textContent = 'Buy';
            btn.setAttribute('data-i18n', '');
            btn.dataset.orig = 'Buy';
            div.appendChild(btn);
        }
    });
    translatePage(localStorage.getItem('language') || 'en');
}

async function loadEntityLists() {
    if (!adminCharacterList || !adminEnemyList) return;
    const charResp = await fetch('/api/admin/entities?type=character');
    const charData = await charResp.json();
    if (charData.success) {
        loadedCharacters = charData.entities;
        adminCharacterList.innerHTML = '';
        charData.entities.forEach(ent => {
            const div = document.createElement('div');
            div.className = 'admin-entity-item';
            const details = formatDetails(ent);
            div.innerHTML = `<span>${details}</span> <button class="edit-entity" data-type="character" data-code="${ent.code}">Edit</button> <button class="delete-entity" data-type="character" data-code="${ent.code}">Delete</button>`;
            adminCharacterList.appendChild(div);
        });
    }
    const enemyResp = await fetch('/api/admin/entities?type=enemy');
    const enemyData = await enemyResp.json();
    if (enemyData.success) {
        loadedEnemies = enemyData.entities;
        adminEnemyList.innerHTML = '';
        enemyData.entities.forEach(ent => {
            const div = document.createElement('div');
            div.className = 'admin-entity-item';
            const details = formatDetails(ent);
            div.innerHTML = `<span>${details}</span> <button class="edit-entity" data-type="enemy" data-code="${ent.code}">Edit</button> <button class="delete-entity" data-type="enemy" data-code="${ent.code}">Delete</button>`;
            adminEnemyList.appendChild(div);
        });
    }
}

async function loadExpeditionAdminList() {
    if (!adminExpeditionList) return;
    const resp = await fetch('/api/admin/expeditions');
    const data = await resp.json();
    if (data.success) {
        loadedExpeditions = data.expeditions;
        adminExpeditionList.innerHTML = '';
        data.expeditions.forEach(exp => {
            const div = document.createElement('div');
            div.className = 'admin-entity-item';
            div.innerHTML = `<span>${exp.name}</span> <button class="exp-up" data-id="${exp.id}">↑</button> <button class="exp-down" data-id="${exp.id}">↓</button> <button class="edit-expedition" data-id="${exp.id}">Edit</button> <button class="delete-expedition" data-id="${exp.id}">Delete</button>`;
            adminExpeditionList.appendChild(div);
        });
    }
}

async function loadItemAdminList() {
    if (!adminItemList) return;
    const resp = await fetch('/api/admin/items');
    const data = await resp.json();
    if (data.success) {
        adminItemList.innerHTML = '';
        data.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-entity-item';
            const details = formatDetails(item);
            div.innerHTML = `<span>${details}</span> <button class="edit-item" data-code="${item.code}">Edit</button> <button class="delete-item" data-code="${item.code}">Delete</button>`;
            adminItemList.appendChild(div);
        });
        loadedItems = data.items;
    }
}

async function loadTowerLevelList() {
    if (!adminTowerList) return;
    const resp = await fetch('/api/admin/tower_levels');
    const data = await resp.json();
    if (data.success) {
        loadedTowerLevels = data.levels;
        adminTowerList.innerHTML = '';
        data.levels.forEach(lvl => {
            const div = document.createElement('div');
            div.className = 'admin-entity-item';
            div.innerHTML = `<span>Stage ${lvl.stage}: ${lvl.enemy_code}</span> <button class="edit-tower" data-stage="${lvl.stage}">Edit</button> <button class="delete-tower" data-stage="${lvl.stage}">Delete</button>`;
            adminTowerList.appendChild(div);
        });
    }
}

let backgroundMap = {};

function applyBodyBackground(section) {
    const file = backgroundMap[section] || backgroundMap['game-screen'] || backgroundMap['login-screen'];
    if (file) {
        document.body.style.backgroundImage = `url('/static/images/backgrounds/${file}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
    }
}

async function loadBackgrounds() {
    const resp = await fetch('/api/backgrounds');
    const data = await resp.json();
    if (data.success) {
        backgroundMap = data.backgrounds;
        for (const [section, file] of Object.entries(data.backgrounds)) {
            const el = document.getElementById(section);
            if (el) {
                el.style.backgroundImage = `url('/static/images/backgrounds/${file}')`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                el.style.backgroundRepeat = 'no-repeat';
            }
        }
        const active = document.querySelector('#main-content .view.active');
        applyBodyBackground(active ? active.id : 'login-screen');
    }
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
        const sellPrice = (SELL_BASE_VALUES[hero.rarity] || 50) * hero.level;
        card.innerHTML = `<div class="card-header"><div class="card-rarity rarity-${hero.rarity.toLowerCase()}">[${hero.rarity}]</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img class="hero-portrait" src="/static/images/characters/${charDef.image_file}" alt="${hero.character_name}"><h4>${hero.character_name}</h4><div class="card-stats">Level: ${hero.level}</div><div class="card-stats">ATK: ${stats.atk} | HP: ${stats.hp}</div><div class="card-stats">Crit: ${stats.crit}% | Crit DMG: ${stats.critDmg}x</div><div class="button-row"><button class="team-manage-button" data-char-id="${hero.id}" data-action="${isInTeam ? 'remove' : 'add'}">${isInTeam ? 'Remove' : 'Add'}</button><button class="merge-button" data-char-name="${hero.character_name}" ${canMerge ? '' : 'disabled'}>Merge</button><button class="equip-button" data-hero-id="${hero.id}">Equip</button><button class="level-up-card-btn" data-hero-id="${hero.id}">Level Up (${100 * hero.level}g)</button><button class="sell-hero-btn" data-hero-id="${hero.id}">Sell (${sellPrice}g)</button></div>`;
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
            const rewards = calculateTowerRewards(stageNum, false);
            descriptionHTML = `<p class="stage-reward repeat"><i class="fa-solid fa-gem currency-icon"></i> Farm this floor for a small reward.</p>`;
            buttonHTML = `<button class="fight-button" data-stage-num="${stageNum}">Fight Again (+${rewards.gems} Gems)</button>`;
        } else if (status === 'current') {
            iconPath = '/static/images/ui/stage_node_current.png';
            const rewards = calculateTowerRewards(stageNum, true);
            descriptionHTML = `<p class="stage-reward"><i class="fa-solid fa-gem currency-icon"></i> First Clear Reward: ${rewards.gems}</p>`;
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