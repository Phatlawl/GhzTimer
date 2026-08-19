// Synthétiseur audio pour le bip sonore
function playBeep(freq = 880, duration = 0.2) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error("Erreur AudioContext", e);
  }
}

// Variables d'état
let workout = [];
let currentBlockIndex = 0;
let currentRound = 1;
let elapsedSeconds = 0;
let timer = null;
let isRunning = false;
let isPrepPhase = false;
let prepCountdown = 10;

// Éléments DOM
const display = document.getElementById('timer-display');
const status = document.getElementById('timer-status');
const substatus = document.getElementById('timer-substatus');
const circle = document.querySelector('.progress-ring__circle');
const CIRCUMFERENCE = 2 * Math.PI * 120; // 753.98

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

const blockTypeSelect = document.getElementById('block-type');
const blockForm = document.getElementById('block-form');
const blockList = document.getElementById('block-list');

// Gestion du cercle visuel
function setProgress(percent) {
  const offset = CIRCUMFERENCE - (percent * CIRCUMFERENCE);
  circle.style.strokeDashoffset = offset;
}

// Formatage du temps
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Changement de type de bloc dans le formulaire
blockTypeSelect.addEventListener('change', (e) => {
  const type = e.target.value;
  document.querySelectorAll('.type-inputs').forEach(el => el.classList.add('hidden'));
  document.getElementById(`inputs-${type.toLowerCase()}`).classList.remove('hidden');
});

// Ajout d'un bloc
blockForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const type = blockTypeSelect.value;
  let block = { type };

  if (type === 'EMOM') {
    block.rounds = parseInt(document.getElementById('emom-rounds').value) || 10;
    block.duration = parseInt(document.getElementById('emom-duration').value) || 60;
  } else if (type === 'AMRAP') {
    block.duration = (parseInt(document.getElementById('amrap-duration').value) || 10) * 60;
  } else if (type === 'FORTIME') {
    const cap = parseInt(document.getElementById('fortime-cap').value);
    block.timeCap = cap ? cap * 60 : null;
  } else if (type === 'REST') {
    block.duration = parseInt(document.getElementById('rest-duration').value) || 60;
  }

  workout.push(block);
  renderBlockList();
});

function renderBlockList() {
  blockList.innerHTML = '';
  workout.forEach((b, index) => {
    const item = document.createElement('div');
    item.className = 'block-item';
    let detail = '';
    if (b.type === 'EMOM') detail = `${b.rounds} tours x ${b.duration}s`;
    else if (b.type === 'AMRAP') detail = `${b.duration / 60} min`;
    else if (b.type === 'FORTIME') detail = b.timeCap ? `Time Cap: ${b.timeCap / 60} min` : 'Pas de Time Cap';
    else if (b.type === 'REST') detail = `${b.duration}s`;

    item.innerHTML = `
      <span><strong>${b.type}</strong> - ${detail}</span>
      <button onclick="removeBlock(${index})">X</button>
    `;
    blockList.appendChild(item);
  });
}

window.removeBlock = function(index) {
  workout.splice(index, 1);
  renderBlockList();
};

// Logique du Timer principal
function tick() {
  // Phase de préparation (10s)
  if (isPrepPhase) {
    prepCountdown--;
    display.textContent = formatTime(prepCountdown);
    setProgress((10 - prepCountdown) / 10);

    if (prepCountdown === 0) {
      playBeep(1000, 0.4); // Bip de départ
      isPrepPhase = false;
      elapsedSeconds = 0;
    }
    return;
  }

  // Fin du workout
  if (currentBlockIndex >= workout.length) {
    clearInterval(timer);
    isRunning = false;
    status.textContent = "Terminé !";
    substatus.textContent = "";
    display.textContent = "00:00";
    setProgress(1);
    playBeep(1200, 0.6);
    return;
  }

  const block = workout[currentBlockIndex];
  elapsedSeconds++;

  if (block.type === 'EMOM') {
    status.textContent = `EMOM - Tour ${currentRound}/${block.rounds}`;
    substatus.textContent = `Total restants : ${formatTime((block.rounds * block.duration) - elapsedSeconds)}`;
    
    const roundElapsed = elapsedSeconds % block.duration === 0 ? block.duration : elapsedSeconds % block.duration;
    display.textContent = formatTime(block.duration - roundElapsed);
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
    substatus.textContent = "";
    const remaining = block.duration - elapsedSeconds;
    display.textContent = formatTime(remaining);
    setProgress(elapsedSeconds / block.duration);

    if (remaining <= 0) {
      playBeep();
      nextBlock();
    }
  } 
  else if (block.type === 'FORTIME') {
    status.textContent = "For Time";
    substatus.textContent = block.timeCap ? `Time Cap : ${formatTime(block.timeCap)}` : "Pas de Time Cap";
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
    substatus.textContent = "";
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

// Événements boutons
startBtn.addEventListener('click', () => {
  if (isRunning || workout.length === 0) return;
  
  isRunning = true;
  if (currentBlockIndex === 0 && elapsedSeconds === 0 && !isPrepPhase) {
    isPrepPhase = true;
    prepCountdown = 10;
    status.textContent = "Préparation";
    substatus.textContent = "Départ imminent";
    display.textContent = formatTime(10);
    setProgress(0);
  }
  
  timer = setInterval(tick, 1000);
});

pauseBtn.addEventListener('click', () => {
  isRunning = false;
  clearInterval(timer);
  status.textContent = "Pause";
});

resetBtn.addEventListener('click', () => {
  isRunning = false;
  clearInterval(timer);
  currentBlockIndex = 0;
  currentRound = 1;
  elapsedSeconds = 0;
  isPrepPhase = false;
  prepCountdown = 10;
  status.textContent = "Prêt";
  substatus.textContent = "";
  display.textContent = "00:00";
  setProgress(0);
});
