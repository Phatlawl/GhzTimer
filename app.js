let workoutBlocks = [];
let currentBlockIndex = 0;
let timerInterval = null;
let isPaused = false;
let timeRemaining = 0;
let timeElapsed = 0;
let currentRound = 1;
let editingBlockId = null;

const SVG_EDIT = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const SVG_DELETE = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

function addBlock(type) {
  const block = { id: Date.now(), type };
  if (type === 'fortime') block.capMin = 10;
  if (type === 'amrap') block.durationMin = 15;
  if (type === 'emom') { block.intervalSec = 60; block.rounds = 10; }
  if (type === 'rest') block.durationSec = 60;

  workoutBlocks.push(block);
  renderWorkoutList();
}

function removeBlock(id) {
  workoutBlocks = workoutBlocks.filter(b => b.id !== id);
  renderWorkoutList();
}

function openEditModal(id) {
  editingBlockId = id;
  const block = workoutBlocks.find(b => b.id === id);
  if (!block) return;

  const modal = document.getElementById('edit-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  modalTitle.textContent = `Modifier - ${block.type.toUpperCase()}`;
  modalBody.innerHTML = '';

  if (block.type === 'fortime') {
    modalBody.innerHTML = `
      <div class="modal-field">
        <label>Time Cap (minutes) :</label>
        <input type="number" id="input-capMin" value="${block.capMin}" min="0">
      </div>
    `;
  } else if (block.type === 'amrap') {
    modalBody.innerHTML = `
      <div class="modal-field">
        <label>Durée totale (minutes) :</label>
        <input type="number" id="input-durationMin" value="${block.durationMin}" min="1">
      </div>
    `;
  } else if (block.type === 'emom') {
    modalBody.innerHTML = `
      <div class="modal-field">
        <label>Nombre de tours :</label>
        <input type="number" id="input-rounds" value="${block.rounds}" min="1">
      </div>
      <div class="modal-field">
        <label>Intervalle par tour (secondes) :</label>
        <input type="number" id="input-intervalSec" value="${block.intervalSec}" min="5">
      </div>
    `;
  } else if (block.type === 'rest') {
    modalBody.innerHTML = `
      <div class="modal-field">
        <label>Temps de repos (secondes) :</label>
        <input type="number" id="input-durationSec" value="${block.durationSec}" min="5">
      </div>
    `;
  }

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingBlockId = null;
}

function saveModalEdit() {
  const block = workoutBlocks.find(b => b.id === editingBlockId);
  if (!block) return;

  if (block.type === 'fortime') {
    block.capMin = parseInt(document.getElementById('input-capMin').value) || 0;
  } else if (block.type === 'amrap') {
    block.durationMin = parseInt(document.getElementById('input-durationMin').value) || 1;
  } else if (block.type === 'emom') {
    block.rounds = parseInt(document.getElementById('input-rounds').value) || 1;
    block.intervalSec = parseInt(document.getElementById('input-intervalSec').value) || 60;
  } else if (block.type === 'rest') {
    block.durationSec = parseInt(document.getElementById('input-durationSec').value) || 30;
  }

  closeModal();
  renderWorkoutList();
}

function renderWorkoutList() {
  const listEl = document.getElementById('workout-list');
  listEl.innerHTML = '';

  workoutBlocks.forEach((block, idx) => {
    const card = document.createElement('div');
    card.className = `block-card ${block.type}`;
    let summaryText = '';

    if (block.type === 'fortime') {
      summaryText = `Time Cap: ${block.capMin} min`;
    } else if (block.type === 'amrap') {
      summaryText = `Durée: ${block.durationMin} min`;
    } else if (block.type === 'emom') {
      summaryText = `${block.rounds} tours x ${block.intervalSec}s`;
    } else if (block.type === 'rest') {
      summaryText = `Durée: ${block.durationSec} sec`;
    }

    card.innerHTML = `
      <div class="block-details">
        <span class="block-title">${idx + 1}. ${block.type.toUpperCase()}</span>
        <span class="block-summary">${summaryText}</span>
      </div>
      <div class="block-actions">
        <button class="icon-btn" onclick="openEditModal(${block.id})" title="Modifier">${SVG_EDIT}</button>
        <button class="icon-btn delete" onclick="removeBlock(${block.id})" title="Supprimer">${SVG_DELETE}</button>
      </div>
    `;
    listEl.appendChild(card);
  });

  document.getElementById('start-workout-btn').style.display = workoutBlocks.length > 0 ? 'block' : 'none';
}

function startWorkout() {
  if (workoutBlocks.length === 0) return;
  currentBlockIndex = 0;
  document.getElementById('setup-view').style.display = 'none';
  document.getElementById('active-view').style.display = 'block';
  loadBlock(currentBlockIndex);
}

function loadBlock(index) {
  clearInterval(timerInterval);
  isPaused = false;
  document.getElementById('pause-btn').textContent = 'Pause';

  if (index >= workoutBlocks.length) {
    alert('Séance terminée ! Bravo !');
    resetWorkout();
    return;
  }

  const block = workoutBlocks[index];
  document.getElementById('block-info').textContent = `${index + 1}/${workoutBlocks.length} - ${block.type.toUpperCase()}`;

  if (block.type === 'fortime') {
    timeElapsed = 0;
    document.getElementById('sub-info').textContent = block.capMin > 0 ? `Time Cap: ${block.capMin} min` : 'Pas de Time Cap';
    runForTime(block);
  } else if (block.type === 'amrap') {
    timeRemaining = block.durationMin * 60;
    document.getElementById('sub-info').textContent = 'Autant de tours que possible';
    runTimerCountDown();
  } else if (block.type === 'emom') {
    currentRound = 1;
    timeRemaining = block.intervalSec;
    document.getElementById('sub-info').textContent = `Tour ${currentRound} / ${block.rounds}`;
    runEMOM(block);
  } else if (block.type === 'rest') {
    timeRemaining = block.durationSec;
    document.getElementById('sub-info').textContent = 'Récupération';
    runTimerCountDown();
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function runForTime(block) {
  const maxSec = block.capMin * 60;
  timerInterval = setInterval(() => {
    if (!isPaused) {
      timeElapsed++;
      document.getElementById('timer-display').textContent = formatTime(timeElapsed);
      if (maxSec > 0 && timeElapsed >= maxSec) {
        nextBlock();
      }
    }
  }, 1000);
}

function runTimerCountDown() {
  document.getElementById('timer-display').textContent = formatTime(timeRemaining);
  timerInterval = setInterval(() => {
    if (!isPaused) {
      timeRemaining--;
      document.getElementById('timer-display').textContent = formatTime(timeRemaining);
      if (timeRemaining <= 0) {
        nextBlock();
      }
    }
  }, 1000);
}

function runEMOM(block) {
  document.getElementById('timer-display').textContent = formatTime(timeRemaining);
  timerInterval = setInterval(() => {
    if (!isPaused) {
      timeRemaining--;
      document.getElementById('timer-display').textContent = formatTime(timeRemaining);

      if (timeRemaining <= 0) {
        if (currentRound < block.rounds) {
          currentRound++;
          timeRemaining = block.intervalSec;
          document.getElementById('sub-info').textContent = `Tour ${currentRound} / ${block.rounds}`;
        } else {
          nextBlock();
        }
      }
    }
  }, 1000);
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById('pause-btn').textContent = isPaused ? 'Reprendre' : 'Pause';
}

function nextBlock() {
  clearInterval(timerInterval);
  currentBlockIndex++;
  loadBlock(currentBlockIndex);
}

function resetWorkout() {
  clearInterval(timerInterval);
  document.getElementById('setup-view').style.display = 'block';
  document.getElementById('active-view').style.display = 'none';
}