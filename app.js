// Navigation entre onglets
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tabs button').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`section-${tab}`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

// --- Chronomètre ---
let swInterval = null;
let swStartTime = 0;
let swElapsedTime = 0;

function updateStopwatchDisplay() {
  const time = Date.now() - swStartTime + swElapsedTime;
  const ms = Math.floor((time % 1000) / 100);
  const seconds = Math.floor((time / 1000) % 60);
  const minutes = Math.floor((time / (1000 * 60)) % 60);
  const hours = Math.floor(time / (1000 * 60 * 60));

  const pad = num => String(num).padStart(2, '0');
  document.getElementById('stopwatch-display').textContent = 
    `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${ms}`;
}

function startStopwatch() {
  if (!swInterval) {
    swStartTime = Date.now();
    swInterval = setInterval(updateStopwatchDisplay, 100);
  }
}

function pauseStopwatch() {
  if (swInterval) {
    swElapsedTime += Date.now() - swStartTime;
    clearInterval(swInterval);
    swInterval = null;
  }
}

function resetStopwatch() {
  pauseStopwatch();
  swElapsedTime = 0;
  document.getElementById('stopwatch-display').textContent = '00:00:00.0';
}

// --- Minuteur ---
let tmInterval = null;
let tmRemainingSeconds = 300;

function updateTimerDisplay() {
  const minutes = Math.floor(tmRemainingSeconds / 60);
  const seconds = tmRemainingSeconds % 60;
  const pad = num => String(num).padStart(2, '0');
  document.getElementById('timer-display').textContent = `${pad(minutes)}:${pad(seconds)}`;
}

function startTimer() {
  if (!tmInterval) {
    if (tmRemainingSeconds <= 0) {
      const min = parseInt(document.getElementById('timer-min').value) || 0;
      const sec = parseInt(document.getElementById('timer-sec').value) || 0;
      tmRemainingSeconds = min * 60 + sec;
    }
    
    if (tmRemainingSeconds > 0) {
      tmInterval = setInterval(() => {
        tmRemainingSeconds--;
        updateTimerDisplay();
        if (tmRemainingSeconds <= 0) {
          clearInterval(tmInterval);
          tmInterval = null;
          alert('Minuteur terminé !');
        }
      }, 1000);
    }
  }
}

function pauseTimer() {
  clearInterval(tmInterval);
  tmInterval = null;
}

function resetTimer() {
  pauseTimer();
  const min = parseInt(document.getElementById('timer-min').value) || 0;
  const sec = parseInt(document.getElementById('timer-sec').value) || 0;
  tmRemainingSeconds = min * 60 + sec;
  updateTimerDisplay();
}