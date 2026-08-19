// Bip sonore via Web Audio API
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
    console.error("Erreur AudioContext :", e);
  }
}

// État de l'application
let workout = [];
let currentBlockIndex = 0;
let currentRound = 1;
let elapsedSeconds = 0;
let timer = null;
let isRunning = false;
let isPrepPhase = false;
let prepCountdown = 10;

// Éléments du DOM
const display = document.getElementById('timer-display');
const status = document.getElementById('timer-status');
const progressRingSvg = document.getElementById('progress-ring-svg');
const circle = document.querySelector('.progress-ring__circle');
const wodBuilder = document.getElementById('wod-builder');
const blockList = document.getElementById('block-list');

const CIRCUMFERENCE = 2 * Math.PI * 95; // ~596.9

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

// Gestion du cercle de progression
function setProgress(percent) {
  const offset = CIRCUMFERENCE - (percent * CIRCUMFERENCE);
  circle.style.strokeDashoffset = Math.max(0, offset);
}

// Formatage du temps en mm:ss
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Ajout des blocs via les 4 cartes (+)
document.getElementById('add-emom-btn').addEventListener('click', () => {
  const rounds = parseInt(document.getElementById('emom-rounds').value) || 10;
  const duration = parseInt(document.getElementById('emom-duration').value) || 60;
  workout.push({ type: 'EMOM', rounds, duration });
  renderBlockList();
});

document.getElementById('add-amrap-btn').addEventListener('click', () => {
  const durationMin = parseInt(document.getElementById('amrap-duration').value) || 10;
  workout.push({ type: 'AMRAP', duration: durationMin * 60 });
  renderBlockList();
});

document.getElementById('add-fortime-btn').addEventListener('click', () => {
  const capInput = parseInt(document.getElementById('fortime-cap').value);
  workout.push({ type: 'FORTIME', timeCap: capInput ? capInput * 60 : null });
  renderBlockList();
});

document.getElementById('add-rest-btn').addEventListener('click', () => {
  const duration = parseInt(document.getElementById('rest-duration').value) || 60;
  workout.push({ type: 'REST', duration });
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
    else if (b.type === 'FORTIME') detail = b.timeCap ? `Cap : ${b.timeCap / 60} min` : 'Sans Cap';
    else if (b.type === 'REST') detail = `${b.duration}s`;

    item.innerHTML = `
      <span><strong style="color:var(--accent);">${b.type}</strong> — ${detail}</span>
      <button onclick="removeBlock(${index})">X</button>
    `;
    blockList.appendChild(item);
  });
}

window.removeBlock = function(index) {
  workout.splice(index, 1);
  renderBlockList();
};

// Cycle de fonctionnement du chrono
function tick() {
  // Phase de décompte initial de 10s
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

  // Séance terminée
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

// Contrôles
startBtn.addEventListener('click', () => {
  if (isRunning || workout.length === 0) return;
  
  isRunning = true;
  
  // Masque le configurateur et affiche le cercle visuel
  wodBuilder.classList.add('hidden');
  progressRingSvg.classList.remove('hidden');

  if (currentBlockIndex === 0 && elapsedSeconds === 0 && !isPrepPhase) {
    isPrepPhase = true;
    prepCountdown = 10;
    status.textContent = "Départ dans...";
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

  // Réaffiche le configurateur et masque le cercle
  wodBuilder.classList.remove('hidden');
  progressRingSvg.classList.add('hidden');

  status.textContent = "Prêt";
  display.textContent = "00:00";
  setProgress(0);
});
