// static/js/app.js (V3.7 - Elemental Affinity Fixes)

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. V3.7 Initializing with Elemental Fixes...");

    // --- GLOBAL STATE & REFERENCES ---
    let gameState = {};
    let masterCharacterList = [];
    let socket;
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const playerNameDisplay = document.getElementById('player-name');
    const gemCountDisplay = document.getElementById('gem-count');
    const logoutButton = document.getElementById('logout-button');
    const mainContent = document.getElementById('main-content');
    const teamDisplayContainer = document.getElementById('team-display');
    const collectionContainer = document.getElementById('collection-container');
    const summonButton = document.getElementById('perform-summon-button');
    const summonResultContainer = document.getElementById('summon-result');
    const stageListContainer = document.getElementById('stage-list');
    const loreContainer = document.getElementById('lore-text-container');
    const onlineListContainer = document.getElementById('online-list-container');
    const navButtons = document.querySelectorAll('.nav-button');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');
    const combatLogContainer = document.getElementById('combat-log-container');

    function connectSocket() {
        if (socket) socket.disconnect();
        socket = io();
        socket.on('connect', () => console.log('Socket connected successfully.'));
        socket.on('receive_message', (data) => {
            const messageElement = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = `${data.username}: `;
            messageElement.appendChild(strong);
            messageElement.appendChild(document.createTextNode(data.message));
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

    function updateUI() {
        if (!gameState || !gameState.username) return;
        playerNameDisplay.textContent = gameState.username;
        gemCountDisplay.textContent = gameState.gems;
        updateTeamDisplay();
        updateCollectionDisplay();
        updateCampaignDisplay();
    }

    function updateTeamDisplay() {
        teamDisplayContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const member = gameState.team[i];
            const slot = document.createElement('div');
            slot.className = 'team-slot';
            if (member) {
                const rarityClass = member.rarity.toLowerCase().replace(' ', '-');
                // --- FIX #1: Added the element display to the team card ---
                const element = member.element || 'None';
                slot.innerHTML = `
                    <div class="card-header">
        <div class="card-rarity rarity-${rarityClass}">[${member.rarity}]</div>
        <div class="card-element element-${element.toLowerCase()}">${element}</div>
    </div>
    <img src="/static/images/characters/${member.image_file}" alt="${member.name}">
                    <h4>${member.name}</h4>
                    <p>ATK: ${member.base_atk} | HP: ${member.base_hp}</p>
                    <p>Crit: ${member.crit_chance}% | Crit DMG: ${member.crit_damage}x</p>`;
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
            const imageName = charDef.image_file;
            const isInTeam = teamDBIds.includes(heroInstance.id);
            const mergeCost = {'Common': 3, 'Rare': 3, 'SSR': 4, 'UR': 5}[heroInstance.rarity] || 999;
            const canMerge = heroGroup.length >= mergeCost;
            const rarityClass = heroInstance.rarity.toLowerCase().replace(' ', '-');

            // --- FIX #2: Correctly defined the 'element' variable before using it ---
            const element = charDef.element || 'None';

        card.innerHTML = `
            <div class="card-header">
                <div class="card-rarity rarity-${rarityClass}">[${heroInstance.rarity}] (x${heroGroup.length})</div>
                <div class="card-element element-${element.toLowerCase()}">${element}</div>
                </div>
                <img src="/static/images/characters/${imageName}" alt="${heroInstance.character_name}">
                <h4>${heroInstance.character_name}</h4>
                <div class="card-stats">ATK: ${charDef.base_atk} | HP: ${charDef.base_hp}</div>
                <div class="card-stats">Crit: ${charDef.crit_chance}% | Crit DMG: ${charDef.crit_damage}x</div>
                <div class="button-row">
                    <button class="team-manage-button" data-char-id="${heroInstance.id}" data-action="${isInTeam ? 'remove' : 'add'}">${isInTeam ? 'Remove' : 'Add'}</button>
                    <button class="merge-button" data-char-name="${name}" ${canMerge ? '' : 'disabled'}>Merge</button>
                </div>`;
            collectionContainer.appendChild(card);
        }
    }

    function updateCampaignDisplay() {
        stageListContainer.innerHTML = '';
        for (let i = 1; i <= 50; i++) {
            const stageItem = document.createElement('div');
            stageItem.className = 'stage-item';
            let iconPath = '/static/images/ui/stage_node_locked.png';
            let fightButtonHTML = '';
            if (i < gameState.current_stage) iconPath = '/static/images/ui/stage_node_cleared.png';
            else if (i === gameState.current_stage) iconPath = '/static/images/ui/stage_node_current.png';
            if (i <= gameState.current_stage) {
                fightButtonHTML = `<button class="fight-button" data-stage-num="${i}">Fight</button>`;
            }
            stageItem.innerHTML = `<img src="${iconPath}" alt="Status"><h4>Tower Floor ${i}</h4>${fightButtonHTML}`;
            stageListContainer.appendChild(stageItem);
        }
    }

    async function fetchPlayerDataAndUpdate() {
        try {
            const response = await fetch('/api/player_data');
            if (!response.ok) { await handleLogout(); return false; }
            const result = await response.json();
            if (result.success) { gameState = result.data; updateUI(); return true; }
            else { await handleLogout(); return false; }
        } catch (error) { console.error('Failed to fetch player data:', error); return false; }
    }

    async function initializeGame() {
        const gameDataResponse = await fetch('/api/game_data');
        if (gameDataResponse.ok) masterCharacterList = (await gameDataResponse.json()).characters;
        const loggedIn = await fetchPlayerDataAndUpdate();
        if (loggedIn) {
            loginScreen.classList.remove('active'); gameScreen.classList.add('active');
            connectSocket();
        } else {
            loginScreen.classList.add('active'); gameScreen.classList.remove('active');
        }
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
        gameState = {}; masterCharacterList = [];
        loginScreen.classList.add('active'); gameScreen.classList.remove('active');
        usernameInput.value = ''; passwordInput.value = '';
    }

    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    registerButton.addEventListener('click', async () => {
        const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value }) });
        alert((await response.json()).message);
    });
    logoutButton.addEventListener('click', handleLogout);

    summonButton.addEventListener('click', async () => {
        const response = await fetch('/api/summon', { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            const character = result.character;
            // --- FIX #3: Added the element display to the summon result card ---
            const element = character.element || 'None';
            summonResultContainer.innerHTML = `
    <div class="team-slot">
        <div class="card-header">
            <div class="card-rarity rarity-${character.rarity.toLowerCase()}">[${character.rarity}]</div>
            <div class="card-element element-${element.toLowerCase()}">${element}</div>
        </div>
        <img src="/static/images/characters/${character.image_file}" alt="${character.name}">
                    <h4>${character.name}</h4>
                    <p>ATK: ${character.base_atk} | HP: ${character.base_hp}</p>
                    <p>Crit: ${character.crit_chance}% | Crit DMG: ${character.crit_damage}x</p>
                </div>`;
            await fetchPlayerDataAndUpdate();
        } else {
            alert(`Summon Failed: ${result.message}`);
        }
    });

    function sendMessage() {
        if (chatInput.value.trim() !== '') {
            socket.emit('send_message', { message: chatInput.value });
            chatInput.value = '';
        }
    }
    chatSendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    document.body.addEventListener('click', async (e) => {
        const target = e.target;
        if (target && target.classList.contains('fight-button')) {
            const stageNum = parseInt(target.dataset.stageNum, 10);
            const response = await fetch('/api/fight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: stageNum }) });
            const result = await response.json();
            if (result.success) {
                let logHTML = `<div class="combat-log-box"><h3>Battle Report: Floor ${stageNum}</h3><div class="log-entries">`;
                result.log.forEach(entry => {
                    const escapeHTML = (str) => { const d = document.createElement('div'); d.appendChild(document.createTextNode(str)); return d.innerHTML; }
                    let imageHTML = '';
                    if (entry.type === 'start') { imageHTML = `<img src="/static/images/${entry.enemy_image}" class="log-entry-image">`; }
                    else if (entry.type === 'player_attack') { imageHTML = `<img src="/static/images/ui/gem_icon.png" class="log-entry-image">`; }
                    else if (entry.type === 'enemy_attack') {
                        imageHTML = `<img src="/static/images/${result.log[0].enemy_image}" class="log-entry-image">`;
                    }

                    let textClass = entry.crit ? 'log-entry-text crit' : 'log-entry-text';
                    let messageText = '';
                    if(entry.type === 'start') messageText = entry.message;
                    else if(entry.type === 'player_attack') messageText = `Your team attacks for ${entry.damage} damage! -> Enemy HP: ${entry.enemy_hp}`;
                    else if(entry.type === 'enemy_attack') messageText = `The enemy attacks for ${entry.damage} damage! -> Team HP: ${entry.team_hp}`;
                    else messageText = entry.message;

                    logHTML += `<div class="log-entry">${imageHTML}<span class="${textClass}">${escapeHTML(messageText)}</span></div>`;
                });
                logHTML += `</div><button id="close-log-button">Close</button></div>`;
                combatLogContainer.innerHTML = logHTML; combatLogContainer.classList.add('active');
                await fetchPlayerDataAndUpdate();
            } else { alert(`Fight Failed: ${result.message}`); }
        }
        if (target && target.id === 'close-log-button') {
            combatLogContainer.classList.remove('active');
        }
        if (target && target.classList.contains('team-manage-button')) {
            const charId = parseInt(target.dataset.charId, 10);
            const action = target.dataset.action;
            const response = await fetch('/api/manage_team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ char_id: charId, action: action }) });
            const result = await response.json();
            if(!result.success) alert(`Team Update Failed: ${result.message}`);
            await fetchPlayerDataAndUpdate();
        }
        if (target && target.classList.contains('merge-button')) {
            const charName = target.dataset.charName;
            const response = await fetch('/api/merge_heroes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: charName }) });
            const result = await response.json();
            alert(result.message);
            if (result.success) await fetchPlayerDataAndUpdate();
        }
    });

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetViewId = button.dataset.view;
            mainContent.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            const targetView = document.getElementById(targetViewId);
            if (targetView) targetView.classList.add('active');
            if (targetViewId !== 'summon-view') summonResultContainer.innerHTML = '';
            if (targetViewId === 'lore-view') {
                 fetch('/api/lore').then(res => res.json()).then(result => {
                    if(result.success) loreContainer.textContent = result.data;
                 });
            }
        });
    });

    initializeGame();
});