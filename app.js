let playlists = JSON.parse(localStorage.getItem('linguaPlaylists')) || {
    "Транспорт": [
        { word: "Vehicle", trans: "[ˈviːɪkl]", transl: "Транспорт", hard: false },
        { word: "Subway", trans: "[ˈsʌbweɪ]", transl: "Метро", hard: false }
    ]
};

let currentPlaylistName = localStorage.getItem('linguaCurrent') || "Транспорт";
let currentIndex = 0;
let isPlaying = false;
let rate = 1.0;
let isRandom = true; 

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

function saveData() {
    localStorage.setItem('linguaPlaylists', JSON.stringify(playlists));
    localStorage.setItem('linguaCurrent', currentPlaylistName);
}

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
    const titleSpan = document.getElementById('playlist-title');
    if (titleSpan) titleSpan.innerText = currentPlaylistName + " ▾";
    
    if (list.length === 0) {
        wordEl.innerText = "Пусто";
        transEl.innerText = "";
        translEl.innerText = "Добавьте слова";
        statsEl.innerText = "0 слов";
        hardBtn.style.display = "none";
        return;
    }

    hardBtn.style.display = "block";
    const item = list[currentIndex];
    wordEl.innerText = item.word;
    transEl.innerText = item.trans || "";
    translEl.innerText = item.transl;
    translEl.classList.add('blurred');
    
    if (item.hard) {
        hardBtn.innerText = "★ В СЛОЖНЫХ";
        hardBtn.style.color = "#fbbf24"; 
    } else {
        hardBtn.innerText = "☆ СЛОЖНО";
        hardBtn.style.color = "#ffffff";
    }
    
    statsEl.innerText = `Слово ${currentIndex + 1} из ${list.length} ${isRandom ? "(Рандом)" : ""}`;
}

// --- ГЛАВНОЕ МЕНЮ ---
header.onclick = (e) => {
    e.stopPropagation();
    mainSelector.classList.toggle('hidden');
    if (!mainSelector.classList.contains('hidden')) renderMainSelector();
};

function renderMainSelector() {
    const listDiv = document.getElementById('playlist-items-list');
    listDiv.innerHTML = "";
    const names = ["⭐ Трудные слова", ...Object.keys(playlists)];
    
    names.forEach(name => {
        const item = document.createElement('div');
        item.className = name.startsWith("⭐") ? "playlist-item special" : "playlist-item";
        item.innerText = name;
        item.onclick = (e) => {
            e.stopPropagation();
            currentPlaylistName = name;
            currentIndex = 0;
            stopSpeech();
            mainSelector.classList.add('hidden');
            saveData();
            updateUI();
        };
        listDiv.appendChild(item);
    });
}

document.addEventListener('click', () => mainSelector.classList.add('hidden'));

// --- РЕДАКТИРОВАНИЕ СПИСКОВ (ИСПРАВЛЕНО) ---
function updateEditSelector() {
    editSelector.innerHTML = `<option value="">-- Создать новый --</option>`;
    Object.keys(playlists).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.innerText = name;
        editSelector.appendChild(opt);
    });
}

// ВОТ ЭТОТ КУСОК НЕ РАБОТАЛ:
editSelector.onchange = function() {
    const selectedName = this.value;
    if (selectedName && playlists[selectedName]) {
        nameInput.value = selectedName;
        // Превращаем массив объектов обратно в текст для удобной правки
        wordsInput.value = playlists[selectedName]
            .map(item => `${item.word} | ${item.trans} | ${item.transl}`)
            .join('\n');
    } else {
        nameInput.value = "";
        wordsInput.value = "";
    }
};

// --- ОЗВУЧКА ---
function setNextIndex() {
    const list = getCurrentList();
    if (list.length <= 1) return;
    if (isRandom) {
        let newIndex;
        do { newIndex = Math.floor(Math.random() * list.length); } while (newIndex === currentIndex);
        currentIndex = newIndex;
    } else {
        currentIndex = (currentIndex + 1) % list.length;
    }
}

function speak() {
    if (!isPlaying) return;
    const list = getCurrentList();
    if (list.length === 0) return stopSpeech();

    const item = list[currentIndex];
    updateUI();

    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(item.word);
    msg.lang = 'en-US';
    msg.rate = rate;

    msg.onend = () => {
        if (isPlaying) {
            const pauseVal = document.getElementById('pause-slider').value;
            setTimeout(() => {
                if (isPlaying) {
                    setNextIndex();
                    speak(); 
                }
            }, parseInt(pauseVal) * 1000);
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

startBtn.onclick = () => {
    if (!isPlaying) {
        if (getCurrentList().length === 0) return;
        isPlaying = true;
        startBtn.innerText = "STOP";
        startBtn.classList.add('active');
        speak();
    } else {
        stopSpeech();
    }
};

// --- КНОПКИ ---
hardBtn.onclick = () => {
    const list = getCurrentList();
    if (list.length === 0) return;
    const currentWord = list[currentIndex];
    
    Object.keys(playlists).forEach(key => {
        playlists[key].forEach(w => {
            if (w.word === currentWord.word) w.hard = !w.hard;
        });
    });
    saveData();
    updateUI();
};

document.getElementById('next-btn').onclick = () => {
    setNextIndex();
    updateUI();
    if (isPlaying) speak();
};

document.getElementById('back-btn').onclick = () => {
    const list = getCurrentList();
    currentIndex = (currentIndex - 1 + list.length) % list.length;
    updateUI();
    if (isPlaying) speak();
};

document.getElementById('pause-slider').oninput = function() {
    document.getElementById('pause-val').innerText = this.value;
};

document.getElementById('settings-btn').onclick = () => {
    updateEditSelector();
    document.getElementById('settings-modal').classList.remove('hidden');
};

document.getElementById('close-settings').onclick = () => {
    document.getElementById('settings-modal').classList.add('hidden');
};

document.getElementById('save-words-btn').onclick = () => {
    const name = nameInput.value.trim();
    const text = wordsInput.value.trim();
    if (!name || !text) return alert("Заполните название и слова!");

    const lines = text.split('\n');
    const newWords = lines.map(l => {
        const p = l.split('|');
        if (p.length < 2) return null;
        return {
            word: p[0].trim(),
            trans: p[1].trim(),
            transl: p[2] ? p[2].trim() : p[1].trim(),
            hard: false
        };
    }).filter(x => x);

    if (newWords.length > 0) {
        playlists[name] = newWords;
        currentPlaylistName = name;
        currentIndex = 0;
        saveData();
        updateUI();
        document.getElementById('settings-modal').classList.add('hidden');
    }
};

document.getElementById('slow-mode-btn').onclick = function() {
    rate = (rate === 1.0) ? 0.5 : 1.0;
    this.style.background = (rate === 0.5) ? "#fbbf24" : "#1c1f23";
    this.style.color = (rate === 0.5) ? "black" : "white";
};

translEl.onclick = () => translEl.classList.toggle('blurred');

updateUI();