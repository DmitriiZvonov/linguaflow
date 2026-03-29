// === 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let playlists = JSON.parse(localStorage.getItem('linguaPlaylists')) || { "Транспорт": [] };
let currentPlaylistName = localStorage.getItem('linguaCurrent') || "Транспорт";
let ghToken = localStorage.getItem('ghToken') || ""; 
let ghRepo = localStorage.getItem('ghRepo') || ""; 
let isRandom = localStorage.getItem('linguaRandom') === 'false' ? false : true; // По умолчанию true
let currentIndex = 0;
let isPlaying = false;
let rate = 1.0;

const wordEl = document.getElementById('word-display');
const transEl = document.getElementById('transcription-display');
const translEl = document.getElementById('translation-display');
const startBtn = document.getElementById('start-btn');
const statsEl = document.getElementById('stats');
const hardBtn = document.getElementById('mark-hard-btn');
const header = document.getElementById('playlist-header');
const mainSelector = document.getElementById('main-selector-container');
const editSelector = document.getElementById('edit-playlist-selector');
const wordsInput = document.getElementById('words-input');
const nameInput = document.getElementById('new-playlist-name');

// === 2. ФУНКЦИИ ХРАНЕНИЯ ===
function saveDataLocally() {
    localStorage.setItem('linguaPlaylists', JSON.stringify(playlists));
    localStorage.setItem('linguaCurrent', currentPlaylistName);
    localStorage.setItem('ghToken', ghToken);
    localStorage.setItem('ghRepo', ghRepo);
    localStorage.setItem('linguaRandom', isRandom);
}

async function syncToGitHub() {
    if (!ghToken || !ghRepo) return;
    const path = "data.json";
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(playlists, null, 2))));
    try {
        const getFile = await fetch(`https://api.github.com/repos/${ghRepo}/contents/${path}`, {
            headers: { "Authorization": `token ${ghToken}` }
        });
        let sha = "";
        if (getFile.ok) {
            const fileData = await getFile.json();
            sha = fileData.sha;
        }
        await fetch(`https://api.github.com/repos/${ghRepo}/contents/${path}`, {
            method: "PUT",
            headers: { "Authorization": `token ${ghToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Update words", content, sha })
        });
    } catch (e) { console.error(e); }
}

async function loadFromGitHub() {
    if (!ghToken || !ghRepo) return;
    try {
        const res = await fetch(`https://api.github.com/repos/${ghRepo}/contents/data.json`, {
            headers: { "Authorization": `token ${ghToken}` }
        });
        if (res.ok) {
            const data = await res.json();
            playlists = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            saveDataLocally();
            updateUI();
        }
    } catch (e) { console.error(e); }
}

// === 3. ИНТЕРФЕЙС ===
function getCurrentList() {
    if (currentPlaylistName === "⭐ Трудные слова") {
        let allHard = [];
        Object.values(playlists).forEach(list => {
            allHard = allHard.concat(list.filter(w => w.hard));
        });
        return allHard;
    }
    return playlists[currentPlaylistName] || [];
}

function updateUI() {
    const list = getCurrentList();
    const title = document.getElementById('playlist-title');
    if (title) title.innerText = currentPlaylistName + " ▾";
    
    if (list.length === 0) {
        wordEl.innerText = "Пусто"; transEl.innerText = "";
        translEl.innerText = "Добавьте слова"; statsEl.innerText = "0 слов";
        return;
    }
    
    const item = list[currentIndex];
    wordEl.innerText = item.word;
    transEl.innerText = item.trans || "";
    translEl.innerText = item.transl;
    translEl.classList.add('blurred');
    
    hardBtn.innerText = item.hard ? "★ В СЛОЖНЫХ" : "☆ СЛОЖНО";
    hardBtn.style.color = item.hard ? "#fbbf24" : "#fff";
    
    // Обновляем кнопку рандома
    const rBtn = document.getElementById('random-btn');
    if (rBtn) {
        rBtn.style.color = isRandom ? "#fbbf24" : "#fff";
        rBtn.innerText = isRandom ? "RANDOM: ON" : "RANDOM: OFF";
    }

    statsEl.innerText = `Слово ${currentIndex + 1} из ${list.length} ${isRandom ? "(Перемешано)" : ""}`;
}

// === 4. ЛОГИКА ОЗВУЧКИ ===
function speak() {
    if (!isPlaying) return;
    const list = getCurrentList();
    if (list.length === 0) return stopSpeech();
    
    updateUI();
    window.speechSynthesis.cancel();
    
    const msg = new SpeechSynthesisUtterance(list[currentIndex].word);
    msg.lang = 'en-US';
    msg.rate = rate;
    
    msg.onend = () => {
        if (isPlaying) {
            const pause = parseInt(document.getElementById('pause-slider').value) * 1000;
            setTimeout(() => { if (isPlaying) { setNextIndex(); speak(); } }, pause);
        }
    };
    window.speechSynthesis.speak(msg);
}

function stopSpeech() {
    isPlaying = false;
    startBtn.innerText = "START";
    startBtn.classList.remove('active');
    window.speechSynthesis.cancel();
}

// === 5. ОБРАБОТЧИКИ СОБЫТИЙ ===
function setNextIndex() {
    const list = getCurrentList();
    if (list.length <= 1) return;
    if (isRandom) {
        let next; 
        do { next = Math.floor(Math.random() * list.length); } while (next === currentIndex);
        currentIndex = next;
    } else { 
        currentIndex = (currentIndex + 1) % list.length; 
    }
}

function bindClick(id, fn) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            fn(e);
        }, false);
        el.style.cursor = 'pointer';
    }
}

// Кнопка рандома (логика переключения)
bindClick('random-btn', () => {
    isRandom = !isRandom;
    saveDataLocally();
    updateUI();
});

bindClick('next-btn', () => { setNextIndex(); updateUI(); if (isPlaying) speak(); });
bindClick('back-btn', () => { 
    const list = getCurrentList();
    currentIndex = (currentIndex - 1 + list.length) % list.length;
    updateUI(); if (isPlaying) speak();
});
bindClick('slow-mode-btn', (e) => {
    rate = (rate === 1.0) ? 0.5 : 1.0;
    const target = e.currentTarget;
    target.style.background = (rate === 0.5) ? "#fbbf24" : "#1c1f23";
    target.style.color = (rate === 0.5) ? "black" : "white";
});
bindClick('mark-hard-btn', () => {
    const list = getCurrentList();
    if (list.length === 0) return;
    const cur = list[currentIndex];
    Object.keys(playlists).forEach(k => {
        playlists[k].forEach(w => { if (w.word === cur.word) w.hard = !w.hard; });
    });
    saveDataLocally(); updateUI(); syncToGitHub();
});

bindClick('start-btn', () => {
    if (!isPlaying) {
        if (getCurrentList().length === 0) return;
        isPlaying = true;
        startBtn.innerText = "STOP";
        startBtn.classList.add('active');
        speak();
    } else stopSpeech();
});

// Меню
bindClick('playlist-header', (e) => {
    e.stopPropagation();
    mainSelector.classList.toggle('hidden');
    if (!mainSelector.classList.contains('hidden')) renderMainSelector();
});

function renderMainSelector() {
    const listDiv = document.getElementById('playlist-items-list');
    listDiv.innerHTML = "";
    const names = ["⭐ Трудные слова", ...Object.keys(playlists)];
    names.forEach(name => {
        const item = document.createElement('div');
        item.className = name.startsWith("⭐") ? "playlist-item special" : "playlist-item";
        item.innerText = name;
        item.addEventListener('click', (e) => {
            e.stopPropagation(); currentPlaylistName = name; currentIndex = 0;
            stopSpeech(); mainSelector.classList.add('hidden');
            saveDataLocally(); updateUI();
        });
        listDiv.appendChild(item);
    });
}

// Настройки
bindClick('settings-btn', () => {
    updateEditSelector();
    const modalBody = document.querySelector('.modal-content') || document.querySelector('.modal');
    if (modalBody && !document.getElementById('gh-config')) {
        const div = document.createElement('div');
        div.id = 'gh-config';
        div.innerHTML = `<hr style="margin:15px 0; border:0; border-top:1px solid #444;">
            <h3 style="color:#fbbf24">GitHub Cloud</h3>
            <input type="password" id="gh-token-input" placeholder="Token" style="width:100%;margin-bottom:5px;padding:10px;border-radius:8px;background:#111;color:#fff;border:1px solid #444;">
            <input type="text" id="gh-repo-input" placeholder="user/repo" style="width:100%;margin-bottom:10px;padding:10px;border-radius:8px;background:#111;color:#fff;border:1px solid #444;">
            <button id="gh-save-btn" style="background:#22c55e;color:white;width:100%;padding:12px;border-radius:10px;border:none;font-weight:bold;">CONNECT</button>`;
        modalBody.insertBefore(div, document.getElementById('close-settings'));
        document.getElementById('gh-token-input').value = ghToken;
        document.getElementById('gh-repo-input').value = ghRepo;
        document.getElementById('gh-save-btn').onclick = () => {
            ghToken = document.getElementById('gh-token-input').value.trim();
            ghRepo = document.getElementById('gh-repo-input').value.trim();
            saveDataLocally(); loadFromGitHub(); alert("Done!");
        };
    }
    document.getElementById('settings-modal').classList.remove('hidden');
});

bindClick('save-words-btn', async () => {
    const name = nameInput.value.trim();
    const text = wordsInput.value.trim();
    if (!name || !text) return;
    const words = text.split('\n').map(l => {
        const p = l.split('|');
        return p.length >= 2 ? {word:p[0].trim(), trans:p[1].trim(), transl:p[2]?p[2].trim():p[1].trim(), hard:false} : null;
    }).filter(x => x);
    if (words.length > 0) {
        playlists[name] = words; currentPlaylistName = name; currentIndex = 0;
        saveDataLocally(); updateUI(); syncToGitHub();
        document.getElementById('settings-modal').classList.add('hidden');
    }
});

function updateEditSelector() {
    if (!editSelector) return;
    editSelector.innerHTML = `<option value="">-- Новый --</option>`;
    Object.keys(playlists).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name; opt.innerText = name;
        editSelector.appendChild(opt);
    });
}

if (editSelector) {
    editSelector.addEventListener('change', function() {
        const val = this.value;
        if (val && playlists[val]) {
            nameInput.value = val;
            wordsInput.value = playlists[val].map(i => `${i.word} | ${i.trans} | ${i.transl}`).join('\n');
        }
    });
}

bindClick('close-settings', () => document.getElementById('settings-modal').classList.add('hidden'));
document.getElementById('pause-slider').oninput = function() { document.getElementById('pause-val').innerText = this.value; };
bindClick('translation-display', () => translEl.classList.toggle('blurred'));
document.addEventListener('click', () => mainSelector.classList.add('hidden'));

// Инициализация
loadFromGitHub();
updateUI();