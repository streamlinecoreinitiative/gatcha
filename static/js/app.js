// static/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing app.js...");

    // --- GLOBAL STATE ---
    let gameState = {};
    let masterCharacterList = []; // Will hold all character definitions
    let socket; // Will hold the socket instance

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
    const mainContent = document.getElementById('main-content');
    const teamDisplayContainer = document.getElementById('team-display');
    const collectionContainer = document.getElementById('collection-container');
    const summonButton = document.getElementById('perform-summon-button');
    const summonResultContainer = document.getElementById('summon-result');
    const stageListContainer = document.getElementById('stage-list');
    const loreContainer = document.getElementById('lore-text-container');
    const navButtons = document.querySelectorAll('.nav-button');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');

    // --- SOCKET.IO & CHAT FIX ---
    function connectSocket() {
        // If a socket already exists, disconnect it first
        if (socket) {
            socket.disconnect();
        }
        socket = io(); // Create a new connection

        socket.on('connect', () => {
            console.log('Connected to WebSocket server with new session!');
        });

        socket.on('receive_message', (data) => {
            const messageElement = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = `${data.username}: `;
            messageElement.appendChild(strong);
            messageElement.appendChild(document.createTextNode(data.message));
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    // --- UI Update Functions ---
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
                slot.innerHTML = `<img src="/static/images/${member.image_file}" alt="${member.name}"><h4>${member.name}</h4><p>ATK: ${member.base_atk} | HP: ${member.base_hp}</p>`;
            } else {
                slot.innerHTML = `<img src="/static/images/ui/placeholder_char.png" alt="Empty"><h4>Empty Slot</h4>`;
            }
            teamDisplayContainer.appendChild(slot);
        }
    }

    // --- FIX & NEW FEATURE: COLLECTION & TEAM SELECTION ---
    function updateCollectionDisplay() {
        collectionContainer.innerHTML = '';
        if (!gameState.collection || masterCharacterList.length === 0) return;
        const teamDBIds = gameState.team.filter(m => m).map(m => m.db_id);

        gameState.collection.forEach(char => {
            const charDef = masterCharacterList.find(c => c.name === char.character_name);
            if (!charDef) return;

            const card = document.createElement('div');
            card.className = 'collection-card';
            const imageName = charDef.image_file;

            // Check if the character is currently in the team
            const isInTeam = teamDBIds.includes(char.id);

            card.innerHTML = `
                ${isInTeam ? '<div class="in-team-indicator">T</div>' : ''}
                <img src="/static/images/characters/${imageName}" alt="${char.character_name}">
                <h4>${char.character_name}</h4>
                <div class="card-stats">ATK: ${charDef.base_atk} | HP: ${charDef.base_hp}</div>
                <button class="set-team-button" data-char-id="${char.id}" ${isInTeam ? 'disabled' : ''}>
                    ${isInTeam ? 'In Team' : 'Set Team'}
                </button>
            `;
            collectionContainer.appendChild(card);
        });
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

    // --- API Communication ---
    async function fetchPlayerDataAndUpdate() {
        try {
            const response = await fetch('/api/player_data');
            if (!response.ok) { await handleLogout(); return false; }
            const result = await response.json();
            if (result.success) {
                gameState = result.data;
                updateUI();
                return true;
            } else {
                await handleLogout();
                return false;
            }
        } catch (error) { console.error('Failed to fetch player data:', error); return false; }
    }

    async function initializeGame() {
        const gameDataResponse = await fetch('/api/game_data');
        if (gameDataResponse.ok) {
            const gameData = await gameDataResponse.json();
            masterCharacterList = gameData.characters;
        }

        const loggedIn = await fetchPlayerDataAndUpdate();
        if (loggedIn) {
            loginScreen.classList.remove('active');
            gameScreen.classList.add('active');
            connectSocket(); // Connect chat socket AFTER successful login
        } else {
            loginScreen.classList.add('active');
            gameScreen.classList.remove('active');
        }
    }

    // --- EVENT HANDLERS ---
    async function handleLogin() {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
        });
        const result = await response.json();
        if (result.success) {
            await initializeGame();
        } else {
            alert(`Login Failed: ${result.message}`);
        }
    }
    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    registerButton.addEventListener('click', async () => {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
        });
        const result = await response.json();
        alert(result.message);
    });

    async function handleLogout() {
        await fetch('/api/logout', { method: 'POST' });
        if (socket) socket.disconnect();
        gameState = {};
        masterCharacterList = [];
        loginScreen.classList.add('active');
        gameScreen.classList.remove('active');
        usernameInput.value = '';
        passwordInput.value = '';
    }
    logoutButton.addEventListener('click', handleLogout);

    summonButton.addEventListener('click', async () => {
        const response = await fetch('/api/summon', { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            const character = result.character;
            summonResultContainer.innerHTML = `
                <h3>You Summoned:</h3>
                <div class="team-slot">
                    <img src="/static/images/characters/${character.image_file}" alt="${character.name}">
                    <h4>[${character.rarity}] ${character.name}</h4>
                    <p>ATK: ${character.base_atk} | HP: ${character.base_hp}</p>
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
        if (e.target && e.target.classList.contains('fight-button')) {
            const stageNum = parseInt(e.target.dataset.stageNum, 10);
            const response = await fetch('/api/fight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: stageNum }) });
            const result = await response.json();
            if (result.success) {
                let fightResultText = `VICTORY!\n\nYour Power: ${result.team_power} vs Enemy Power: ${result.enemy_power}\nYou earned ${result.gems_won} gems!`;
                if (!result.victory) {
                    fightResultText = `DEFEAT!\n\nYour Power: ${result.team_power} vs Enemy Power: ${result.enemy_power}`;
                }
                alert(fightResultText);
                await fetchPlayerDataAndUpdate();
            } else {
                alert(`Fight Failed: ${result.message}`);
            }
        }

        if (e.target && e.target.classList.contains('set-team-button')) {
            const charId = parseInt(e.target.dataset.charId, 10);
            const response = await fetch('/api/set_team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ char_id: charId }) });
            const result = await response.json();
            if(result.success) {
                await fetchPlayerDataAndUpdate();
            } else {
                alert(`Failed to set team: ${result.message}`);
            }
        }
    });

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetViewId = button.dataset.view;
            mainContent.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            const targetView = document.getElementById(targetViewId);
            if (targetView) targetView.classList.add('active');

            // --- FIX: Clear summon result when navigating away ---
            if (targetViewId !== 'summon-view') {
                summonResultContainer.innerHTML = '';
            }

            if (targetViewId === 'lore-view') {
                 fetch('/api/lore').then(res => res.json()).then(result => {
                    if(result.success) loreContainer.textContent = result.data;
                 });
            }
        });
    });

    // --- INITIALIZE THE APP ---
    initializeGame();
});