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
const logoutButton = document.getElementById('logout-button');
const bugButton = document.getElementById('report-bug-button');
const mainContent = document.getElementById('main-content');
const teamDisplayContainer = document.getElementById('team-display');
const dungeonRunCount = document.getElementById('dungeon-run-count');
const collectionContainer = document.getElementById('collection-container');
const summonButton = document.getElementById('perform-summon-button');
const summonResultContainer = document.getElementById('summon-result');
const stageListContainer = document.getElementById('stage-list');
const loreContainer = document.getElementById('lore-text-container');
const onlineListContainer = document.getElementById('online-list-container');
const allUsersContainer = document.getElementById('all-users-container');
const navButtons = document.querySelectorAll('.nav-button');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const chatContainer = document.getElementById('chat-container');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const battleScreen = document.getElementById('battle-screen');
const equipmentContainer = document.getElementById('equipment-container');
const heroImageOverlay = document.getElementById('hero-image-overlay');
const heroImageLarge = document.getElementById('hero-image-large');
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
    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    registerButton.addEventListener('click', async () => {
        const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value }) });
        alert((await response.json()).message);
    });

    logoutButton.addEventListener('click', handleLogout);
    if (bugButton) {
        bugButton.addEventListener('click', () => {
            window.open('https://github.com/your_username/your_repo/issues', '_blank');
        });
    }

    summonButton.addEventListener('click', async () => {
        const response = await fetch('/api/summon', { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            const character = result.character;
            const element = character.element || 'None';
            summonResultContainer.innerHTML = `<div class="team-slot"><div class="card-header"><div class="card-rarity rarity-${character.rarity.toLowerCase()}">[${character.rarity}]</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img src="/static/images/characters/${character.image_file}" alt="${character.name}"><h4>${character.name}</h4><p>ATK: ${character.base_atk} | HP: ${character.base_hp}</p><p>Crit: ${character.crit_chance}% | Crit DMG: ${character.crit_damage}x</p></div>`;
            await fetchPlayerDataAndUpdate();
        } else { alert(`Summon Failed: ${result.message}`); }
    });

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
            if (targetViewId !== 'summon-view') summonResultContainer.innerHTML = '';

            if (targetViewId === 'lore-view') {
                 fetch('/api/lore').then(res => res.json()).then(result => { if(result.success) loreContainer.textContent = result.data; });
            }
            // This ensures the equipment list is fetched when the tab is clicked
            if (targetViewId === 'equipment-view') {
                updateEquipmentDisplay();
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
                alert(`Team Update Failed: ${result.message}`); // Use the saved variable
            }
            await fetchPlayerDataAndUpdate();
        }
        else if (target.classList.contains('merge-button')) {
            const charName = target.dataset.charName;
            const response = await fetch('/api/merge_heroes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: charName }) });
            const result = await response.json();
            alert(result.message);
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
            } else { alert(`Error: ${result.message}`); }
        }
        else if (target.classList.contains('dungeon-fight-button')) {
            const response = await fetch('/api/fight_dungeon', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                gameScreen.classList.remove('active');
                battleScreen.classList.add('active');
                await startBattle(result);
            } else { alert(`Dungeon Failed: ${result.message}`); }
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
            } else { alert(`Fight Failed: ${result.message}`); }
        }
        else if (target.id === 'close-hero-detail-btn') document.getElementById('hero-detail-overlay').classList.remove('active');
        else if (target.id === 'confirm-equip-btn') {
            const heroId = target.dataset.heroId;
            const equipmentId = document.getElementById('equip-select').value;
            if (!equipmentId) { alert("Please select an item to equip."); return; }
            await fetch('/api/equip_item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ character_id: parseInt(heroId), equipment_id: parseInt(equipmentId) }) });
            document.getElementById('hero-detail-overlay').classList.remove('active');
            await fetchPlayerDataAndUpdate();
        }
        else if (target.classList.contains('unequip-btn')) {
            const equipmentId = target.dataset.itemId;
            await fetch('/api/unequip_item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equipment_id: parseInt(equipmentId) }) });
            document.getElementById('hero-detail-overlay').classList.remove('active');
            await fetchPlayerDataAndUpdate();
        }
        else if (target.id === 'close-hero-image-btn') {
            heroImageOverlay.classList.remove('active');
        }
        else if (target.id === 'battle-return-button') {
            battleScreen.classList.remove('active');
            gameScreen.classList.add('active');
            await fetchPlayerDataAndUpdate();
        }
    });
}

// --- ASYNC & STATE FUNCTIONS ---
const delay = ms => new Promise(res => setTimeout(res, ms));

async function initializeGame() {
    const gameDataResponse = await fetch('/api/game_data');
    if (gameDataResponse.ok) masterCharacterList = (await gameDataResponse.json()).characters;
    const loggedIn = await fetchPlayerDataAndUpdate();
    if (loggedIn) {
        loginScreen.classList.remove('active');
        gameScreen.classList.add('active');
        connectSocket();
    } else {
        loginScreen.classList.add('active');
        gameScreen.classList.remove('active');
    }
}

async function fetchPlayerDataAndUpdate() {
    try {
        const response = await fetch('/api/player_data');
        if (response.status === 401) { await handleLogout(); return false; }
        const result = await response.json();
        if (result.success) { gameState = result.data; updateUI(); return true; }
        else { await handleLogout(); return false; }
    } catch (error) { console.error('Failed to fetch player data:', error); return false; }
}

async function handleLogin() {
    const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value }) });
    const result = await response.json();
    if (result.success) await initializeGame();
    else alert(`Login Failed: ${result.message}`);
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    if (socket) socket.disconnect();
    gameState = {};
    loginScreen.classList.add('active');
    gameScreen.classList.remove('active');
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
        onlineListContainer.innerHTML = '<h3>Currently Online:</h3>';
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'online-list-item';
            userElement.textContent = user;
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
    let html = `
        <img class="hero-detail-portrait" src="/static/images/characters/${charDef.image_file || 'placeholder_char.png'}" alt="${fullHeroData.character_name}">
        <h3>${fullHeroData.character_name}</h3>
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
    gemCountDisplay.textContent = gameState.gems;
    if (dungeonRunCount) dungeonRunCount.textContent = gameState.dungeon_runs;
    updateTeamDisplay();
    updateCollectionDisplay();
    updateCampaignDisplay();
    updateTopPlayer();
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
        equipmentContainer.innerHTML = '<p>Your armory is empty. Farm dungeons to find loot!</p>';
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
    if (!allUsersContainer) return;
    allUsersContainer.innerHTML = 'Loading...';
    const response = await fetch('/api/all_users');
    const result = await response.json();
    if (!result.success) { allUsersContainer.innerHTML = 'Failed to load users.'; return; }
    allUsersContainer.innerHTML = '<h3>All Players:</h3>';
    result.users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'online-list-item';
        div.textContent = `${u.username} - Dungeon Runs: ${u.dungeon_runs}`;
        allUsersContainer.appendChild(div);
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

function updateTeamDisplay() {
    teamDisplayContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const member = gameState.team[i];
        const slot = document.createElement('div');
        slot.className = 'team-slot';
        if (member) {
            const element = member.element || 'None';
            slot.innerHTML = `<div class="card-header"><div class="card-rarity rarity-${member.rarity.toLowerCase()}">[${member.rarity}]</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img class="hero-portrait" src="/static/images/characters/${member.image_file}" alt="${member.name}"><h4>${member.name}</h4><p>ATK: ${member.base_atk} | HP: ${member.base_hp}</p><p>Crit: ${member.crit_chance}% | Crit DMG: ${member.crit_damage}x</p>`;
        } else {
            slot.innerHTML = `<img src="/static/images/ui/placeholder_char.png" alt="Empty"><h4>Empty Slot</h4>`;
        }
        teamDisplayContainer.appendChild(slot);
    }
}

function updateCollectionDisplay() {
    collectionContainer.innerHTML = '';
    if (!gameState.collection || masterCharacterList.length === 0) return;
    const groupedHeroes = gameState.collection.reduce((acc, char) => {
        acc[char.character_name] = acc[char.character_name] || [];
        acc[char.character_name].push(char);
        return acc;
    }, {});
    const teamDBIds = gameState.team.filter(m => m).map(m => m.db_id);
    for (const name in groupedHeroes) {
        const heroGroup = groupedHeroes[name];
        const heroInstance = heroGroup[0];
        const charDef = masterCharacterList.find(c => c.name === heroInstance.character_name);
        if (!charDef) continue;
        const card = document.createElement('div');
        card.className = 'collection-card';
        const element = charDef.element || 'None';
        const mergeCost = {'Common': 3, 'Rare': 3, 'SSR': 4, 'UR': 5}[heroInstance.rarity] || 999;
        const canMerge = heroGroup.length >= mergeCost;
        const isInTeam = teamDBIds.includes(heroInstance.id);
        card.innerHTML = `<div class="card-header"><div class="card-rarity rarity-${heroInstance.rarity.toLowerCase()}">[${heroInstance.rarity}] (x${heroGroup.length})</div><div class="card-element element-${element.toLowerCase()}">${element}</div></div><img class="hero-portrait" src="/static/images/characters/${charDef.image_file}" alt="${name}"><h4>${name}</h4><div class="card-stats">ATK: ${charDef.base_atk} | HP: ${charDef.base_hp}</div><div class="card-stats">Crit: ${charDef.crit_chance}% | Crit DMG: ${charDef.crit_damage}x</div><div class="button-row"><button class="team-manage-button" data-char-id="${heroInstance.id}" data-action="${isInTeam ? 'remove' : 'add'}">${isInTeam ? 'Remove' : 'Add'}</button><button class="merge-button" data-char-name="${name}" ${canMerge ? '' : 'disabled'}>Merge</button><button class="equip-button" data-hero-id="${heroInstance.id}">Equip</button></div>`;
        if (isInTeam) {
            const indicator = document.createElement('div');
            indicator.className = 'in-team-indicator';
            indicator.textContent = '★';
            card.appendChild(indicator);
        }
        collectionContainer.appendChild(card);
    }
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
            const gemsForRepeat = 5;
            descriptionHTML = `<p class="stage-reward repeat"><img src="/static/images/ui/gem_icon.png" alt="Gems"> Farm this floor for a small reward.</p>`;
            buttonHTML = `<button class="fight-button" data-stage-num="${stageNum}">Fight Again (+${gemsForRepeat} Gems)</button>`;
        } else if (status === 'current') {
            iconPath = '/static/images/ui/stage_node_current.png';
            const gemsForFirstClear = 25 + (Math.floor((stageNum - 1) / 5) * 5);
            descriptionHTML = `<p class="stage-reward"><img src="/static/images/ui/gem_icon.png" alt="Gems"> First Clear Reward: ${gemsForFirstClear}</p>`;
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
    const playerHpBar = document.getElementById('player-hp-bar');
    const playerHpText = document.getElementById('player-hp-text');
    const enemyHpBar = document.getElementById('enemy-hp-bar');
    const enemyHpText = document.getElementById('enemy-hp-text');

    playerTeamContainer.innerHTML = '';
    enemyDisplayContainer.innerHTML = '';
    logEntriesContainer.innerHTML = '';
    returnButton.style.display = 'none';

    const startEntry = fightResult.log[0];
    // This parsing is fine for getting the name for the enemy card title.
    const enemyName = startEntry.message.split('faces a ')[1]?.split('!')[0].trim().split(' ').slice(1).join(' ') || 'Unknown Enemy';
    const enemyImage = startEntry.enemy_image;

    const maxTeamHP = gameState.team.reduce((total, member) => {
        if (!member) return total;
        const multipliers = {"Common": 1.0, "Rare": 1.3, "SSR": 1.8, "UR": 2.5, "LR": 3.5};
        let memberHP = (member.base_hp * (multipliers[member.rarity] || 1.0));
        member.equipped.forEach(item => {
            // This part is for display only, the real stats are calculated on the server.
        });
        return total + memberHP;
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
    addLogMessage(startEntry.message);
    await delay(1000);

    // Loop through the rest of the log entries
    for (const entry of fightResult.log.slice(1)) {
        switch (entry.type) {
            case 'player_attack':
                // --- THIS IS THE FIX ---
                // We create a new message that combines the server data for clarity.
                // Your backend doesn't send a full message for attacks, so we build it here.
                addLogMessage(`${entry.attacker} ${entry.crit ? 'CRITS' : 'hits'} for ${entry.damage} damage! Enemy HP: ${entry.enemy_hp}`, 'player', entry.element);
                document.getElementById('battle-enemy-side').classList.add('attack-effect');
                showDamageNumber(document.getElementById('battle-enemy-side'), entry.damage, entry.crit, entry.element);
                updateHealthBar(enemyHpBar, enemyHpText, entry.enemy_hp, maxEnemyHP);
                await delay(750);
                document.getElementById('battle-enemy-side').classList.remove('attack-effect');
                break;
            case 'enemy_attack':
                // --- THIS IS THE FIX ---
                // We do the same for the enemy attack.
                addLogMessage(`Enemy ${entry.crit ? 'CRITS' : 'hits'} for ${entry.damage} damage! Your Team HP: ${entry.team_hp}`, 'enemy');
                document.getElementById('battle-player-side').classList.add('attack-effect');
                showDamageNumber(document.getElementById('battle-player-side'), entry.damage, entry.crit);
                updateHealthBar(playerHpBar, playerHpText, entry.team_hp, maxTeamHP);
                await delay(750);
                document.getElementById('battle-player-side').classList.remove('attack-effect');
                break;
            case 'end':
                // The 'end' entry from the server already has a good message.
                addLogMessage(entry.message, fightResult.victory ? 'victory' : 'defeat');
                if (fightResult.victory && fightResult.gems_won > 0) addLogMessage(`You earned ${fightResult.gems_won} gems!`);
                if (fightResult.looted_item) {
                    const item = fightResult.looted_item;
                    const rarityClass = item.rarity.toLowerCase();
                    addLogMessage(`LOOTED: [${item.name}]`, `rarity-${rarityClass}`);
                }
                returnButton.style.display = 'block';
                break;
        }
        await delay(250);
    }
}