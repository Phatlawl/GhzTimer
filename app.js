// Audio : Émission d'un bip sonore
function playBeep(freq = 880, duration = 0.2) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error("Erreur Audio :", e);
  }
}

// État de l'application
let workout = [];
let editingIndex = null;
let currentBlockIndex = 0;
let currentRound = 1;
let elapsedSeconds = 0;
let timer = null;
let isRunning = false;
let isPrepPhase = false;
let prepCountdown = 10;
let currentModalType = null;

// Éléments du DOM
const builderScreen = document.getElementById('builder-screen');
const timerScreen = document.getElementById('timer-screen');
const blockList = document.getElementById('block-list');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInputs = document.getElementById('modal-inputs');

const display = document.getElementById('timer-display');
const status = document.getElementById('timer-status');
const circle = document.querySelector('.progress-ring__circle');
const CIRCUMFERENCE = 2 * Math.PI * 95; // ~596.9

// Icônes SVG pour Crayon et Poubelle
const iconPencil = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const iconTrash = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

// Affichage/Mise à jour du cercle
function setProgress(percent) {
  const offset = CIRCUMFERENCE - (percent * CIRCUMFERENCE);
  circle.style.strokeDashoffset = Math.max(0, offset);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Rendu de la liste des blocs
function renderBlockList() {
  blockList.innerHTML = '';
  workout.forEach((b, index) => {
    const card = document.createElement('div');
    card.className = `block-card ${b.type}`;
    
    let detailText = '';
    if (b.type === 'FORTIME') detailText = b.timeCap ? `Time Cap: ${b.timeCap / 60} min` : 'Pas de Time Cap';
    else if (b.type === 'EMOM') detailText = `${b.rounds} tours x ${b.duration}s`;
    else if (b.type === 'AMRAP') detailText = `Durée: ${b.duration / 60} min`;
    else if (b.type === 'REST') detailText = `Durée: ${b.duration} sec`;

    card.innerHTML = `
      <div class="block-info">
        <div class="block-header">${index + 1}. ${b.type}</div>
        <div class="block-details">${detailText}</div>
      </div>
      <div class="block-actions">
        <button class="action-btn" onclick="editBlock(${index})" title="Modifier">${iconPencil}</button>
        <button class="action-btn" onclick="removeBlock(${index})" title="Supprimer">${iconTrash}</button>
      </div>
    `;
    blockList.appendChild(card);
  });
}

window.removeBlock = function(index) {
  workout.splice(index, 1);
  renderBlockList();
};

window.editBlock = function(index) {
  editingIndex = index;
  openModal(workout[index].type, workout[index]);
};

// Gestion de la Modal
document.querySelectorAll('.grid-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    editingIndex = null;
    openModal(btn.dataset.type);
  });
});

function openModal(type, data = null) {
  currentModalType = type;
  modalTitle.textContent = editingIndex !== null ? `Modifier ${type}` : `Ajouter ${type}`;
  modalInputs.innerHTML = '';

  if (type === 'FORTIME') {
    const capVal = data && data.timeCap ? data.timeCap / 60 : '';
    modalInputs.innerHTML = `
      <div class="modal-input-group">
        <label>Time Cap en minutes (optionnel)</label>
        <input type="number" id="input-cap" placeholder="Ex: 10" value="${capVal}" min="1">
      </div>`;
  } else if (type === 'EMOM') {
    const roundsVal = data ? data.rounds : 10;
    const durVal = data ? data.duration : 60;
    modalInputs.innerHTML = `
      <div class="modal-input-group">
        <label>Nombre de tours</label>
        <input type="number" id="input-rounds" value="${roundsVal}" min="1">
      </div>
      <div class="modal-input-group">
        <label>Durée d'un tour (sec)</label>
        <input type="number" id="input-duration" value="${durVal}" min="1">
      </div>`;
  } else if (type === 'AMRAP') {
    const durVal = data ? data.duration / 60 : 10;
    modalInputs.innerHTML = `
      <div class="modal-input-group">
        <label>Durée totale (minutes)</label>
        <input type="number" id="input-duration" value="${durVal}" min="1">
      </div>`;
  } else if (type === 'REST') {
    const durVal = data ? data.duration : 60;
    modalInputs.innerHTML = `
      <div class="modal-input-group">
        <label>Durée du repos (secondes)</label>
        <input type="number" id="input-duration" value="${durVal}" min="1">
      </div>`;
  }

  modalOverlay.classList.remove('hidden');
}

document.getElementById('modal-cancel').addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
});

document.getElementById('modal-save').addEventListener('click', () => {
  let block = { type: currentModalType };

  if (currentModalType === 'FORTIME') {
    const cap = parseInt(document.getElementById('input-cap').value);
    block.timeCap = cap ? cap * 60 : null;
  } else if (currentModalType === 'EMOM') {
    block.rounds = parseInt(document.getElementById('input-rounds').value) || 10;
    block.duration = parseInt(document.getElementById('input-duration').value) || 60;
  } else if (currentModalType === 'AMRAP') {
    block.duration = (parseInt(document.getElementById('input-duration').value) || 10) * 60;
  } else if (currentModalType === 'REST') {
    block.duration = parseInt(document.getElementById('input-duration').value) || 60;
  }

  if (editingIndex !== null) {
    workout[editingIndex] = block;
  } else {
    workout.push(block);
  }

  modalOverlay.classList.add('hidden');
  renderBlockList();
});

// Exécution de la Séance
document.getElementById('launch-btn').addEventListener('click', () => {
  if (workout.length === 0) return;

  builderScreen.classList.add('hidden');
  timerScreen.classList.remove('hidden');

  isRunning = true;
  currentBlockIndex = 0;
  currentRound = 1;
  elapsedSeconds = 0;
  isPrepPhase = true;
  prepCountdown = 10;

  status.textContent = "Départ dans...";
  display.textContent = formatTime(10);
  setProgress(0);

  timer = setInterval(tick, 1000);
});

function tick() {
  // Décompte initial de 10 secondes
  if (isPrepPhase) {
    prepCountdown--;
    display.textContent = formatTime(prepCountdown);
    status.textContent = "Départ dans...";
    setProgress((10 - prepCountdown) / 10);

    if (prepCountdown === 0) {
      playBeep(1000, 0.4);
      isPrepPhase = false;
      elapsedSeconds = 0;
    }
    return;
  }

  // Fin du programme
  if (currentBlockIndex >= workout.length) {
    clearInterval(timer);
    isRunning = false;
    status.textContent = "Terminé !";
    display.textContent = "00:00";
    setProgress(1);
    playBeep(1200, 0.6);
    return;
  }

  const block = workout[currentBlockIndex];
  elapsedSeconds++;

  if (block.type === 'EMOM') {
    status.textContent = `EMOM - Tour ${currentRound}/${block.rounds}`;
    const roundElapsed = elapsedSeconds % block.duration === 0 ? block.duration : elapsedSeconds % block.duration;
    display.textContent = formatTime(block.duration - roundElapsed);
    
    // Le cercle se remplit à chaque tour
    setProgress(roundElapsed / block.duration);

    if (elapsedSeconds % block.duration === 0) {
      playBeep();
      if (currentRound < block.rounds) {
        currentRound++;
      } else {
        nextBlock();
      }
    }
  } 
  else if (block.type === 'AMRAP') {
    status.textContent = "AMRAP";
    const remaining = block.duration - elapsedSeconds;
    display.textContent = formatTime(remaining);
    setProgress(elapsedSeconds / block.duration);

    if (remaining <= 0) {
      playBeep();
      nextBlock();
    }
  } 
  else if (block.type === 'FORTIME') {
    status.textContent = block.timeCap ? `For Time (Cap : ${formatTime(block.timeCap)})` : "For Time";
    display.textContent = formatTime(elapsedSeconds);

    if (block.timeCap) {
      setProgress(elapsedSeconds / block.timeCap);
      if (elapsedSeconds >= block.timeCap) {
        playBeep();
        nextBlock();
      }
    } else {
      setProgress((elapsedSeconds % 60) / 60);
    }
  } 
  else if (block.type === 'REST') {
    status.textContent = "Repos";
    const remaining = block.duration - elapsedSeconds;
    display.textContent = formatTime(remaining);
    setProgress(elapsedSeconds / block.duration);

    if (remaining <= 0) {
      playBeep();
      nextBlock();
    }
  }
}

function nextBlock() {
  currentBlockIndex++;
  currentRound = 1;
  elapsedSeconds = 0;
}

// Boutons Pause / Réinitialiser
document.getElementById('pause-btn').addEventListener('click', (e) => {
  if (isRunning) {
    clearInterval(timer);
    isRunning = false;
    status.textContent = "Pause";
    e.target.textContent = "Reprendre";
  } else {
    timer = setInterval(tick, 1000);
    isRunning = true;
    e.target.textContent = "Pause";
  }
});

document.getElementById('reset-btn').addEventListener('click', () => {
  clearInterval(timer);
  isRunning = false;
  
  timerScreen.classList.add('hidden');
  builderScreen.classList.remove('hidden');
  
  document.getElementById('pause-btn').textContent = "Pause";
  setProgress(0);
});
