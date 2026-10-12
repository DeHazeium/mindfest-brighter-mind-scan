const firebaseConfig = {
  apiKey: 'AIzaSyBZEmea8-iZFKIKJb7ldTVc-n42eq_rsfQ',
  authDomain: 'mindfest-d9023.firebaseapp.com',
  databaseURL: 'https://mindfest-d9023-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'mindfest-d9023',
  storageBucket: 'mindfest-d9023.firebasestorage.app',
  messagingSenderId: '318637906139',
  appId: '1:318637906139:web:bb58a662eaac866f2254fe',
};

const SCAN_DURATION = 3000;
const SERVO_ACTIVE = { d4: 135, d5: 45 };
const SERVO_NEUTRAL = { d4: 90, d5: 90 };

const messages = [
  {
    title: 'Your spark is<br>beautifully present.',
    message: 'Your scan found a bright signal: the courage to pause, check in, and choose kindness for yourself.',
    tags: ['Present', 'Resilient', 'Connected'],
    quote: '“Small moments of care can change the shape of a whole day.”',
  },
  {
    title: 'You carry a<br>quiet kind of courage.',
    message: 'There is strength in noticing what you need. Today, your brightest signal is gentle self-awareness.',
    tags: ['Courageous', 'Aware', 'Growing'],
    quote: '“You do not have to rush the version of you that is still becoming.”',
  },
  {
    title: 'Your calm can<br>begin right here.',
    message: 'One pause can make room for a new perspective. Your scan is glowing with openness and possibility.',
    tags: ['Open', 'Grounded', 'Hopeful'],
    quote: '“A softer moment is still a powerful step forward.”',
  },
  {
    title: 'Connection looks<br>good on you.',
    message: 'Checking in is a sign of strength. Your signal reminds us that no one has to carry everything alone.',
    tags: ['Supported', 'Warm', 'Together'],
    quote: '“Reaching out can be the beginning of feeling lighter.”',
  },
];

const fingerButton = document.querySelector('#fingerButton');
const experience = document.querySelector('.experience');
const scannerPanel = document.querySelector('.scanner-panel');
const scanLayout = document.querySelector('#scanLayout');
const resultPanel = document.querySelector('#resultPanel');
const resetButton = document.querySelector('#resetButton');
const statusText = document.querySelector('#statusText');
const progressText = document.querySelector('#progressText');
const bpmValue = document.querySelector('#bpmValue');
const deviceStatus = document.querySelector('#deviceStatus');
const stages = [...document.querySelectorAll('.stage')];

let startTime = 0;
let frameId = 0;
let scanning = false;
let completed = false;
let databaseApi = null;

async function initializeFirebase() {
  try {
    const [{ initializeApp }, { getDatabase, ref, set, push, serverTimestamp }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js'),
    ]);
    const app = initializeApp(firebaseConfig);
    databaseApi = { db: getDatabase(app), ref, set, push, serverTimestamp };
  } catch (error) {
    console.warn('Firebase will retry when the scan completes.', error);
  }
}

initializeFirebase();

function startScan(event) {
  if (completed || scanning) return;
  event.preventDefault();
  if (typeof event.pointerId === 'number') fingerButton.setPointerCapture?.(event.pointerId);
  scanning = true;
  startTime = performance.now();
  fingerButton.classList.add('is-scanning');
  scannerPanel.classList.add('is-scanning');
  statusText.textContent = 'STEP 2 — KEEP HOLDING · SCANNING NOW';
  if (navigator.vibrate) navigator.vibrate(25);
  frameId = requestAnimationFrame(updateScan);
}

function updateScan(now) {
  if (!scanning) return;
  const elapsed = now - startTime;
  const progress = Math.min(elapsed / SCAN_DURATION, 1);
  const percent = Math.floor(progress * 100);
  progressText.textContent = `${String(percent).padStart(2, '0')}%`;

  const stage = Math.min(2, Math.floor(progress * 3));
  stages.forEach((item, index) => item.classList.toggle('active', index <= stage));

  const bpm = Math.round(72 + Math.sin(elapsed / 160) * 4 + progress * 8);
  bpmValue.innerHTML = `${bpm} <small>BPM</small>`;

  if (progress >= 1) {
    completeScan();
    return;
  }
  frameId = requestAnimationFrame(updateScan);
}

function cancelScan(event) {
  if (!scanning || completed) return;
  if (event) event.preventDefault();
  scanning = false;
  cancelAnimationFrame(frameId);
  fingerButton.classList.remove('is-scanning');
  scannerPanel.classList.remove('is-scanning');
  statusText.textContent = 'FINGER LIFTED — HOLD FOR THE FULL 3 SECONDS';
  progressText.textContent = '00%';
  stages.forEach((item, index) => item.classList.toggle('active', index === 0));
  setTimeout(() => {
    if (!scanning && !completed) statusText.textContent = 'STEP 1 — PLACE & HOLD YOUR FINGER';
  }, 1200);
}

function completeScan() {
  scanning = false;
  completed = true;
  cancelAnimationFrame(frameId);
  progressText.textContent = '100%';
  experience.classList.add('is-revealing');
  if (navigator.vibrate) navigator.vibrate([45, 45, 80]);

  const choice = messages[Math.floor(Math.random() * messages.length)];
  document.querySelector('#resultTitle').innerHTML = choice.title;
  document.querySelector('#resultMessage').textContent = choice.message;
  document.querySelector('#resultQuote').textContent = choice.quote;
  document.querySelector('#resultTags').innerHTML = choice.tags.map((tag) => `<span>${tag}</span>`).join('');

  setTimeout(() => {
    scanLayout.classList.add('is-hidden');
    resultPanel.classList.add('is-visible');
    resultPanel.setAttribute('aria-hidden', 'false');
    celebrateWithHardware(choice);
  }, 1000);
}

async function ensureFirebase() {
  if (databaseApi) return databaseApi;
  await initializeFirebase();
  return databaseApi;
}

async function celebrateWithHardware(result) {
  deviceStatus.textContent = 'Sending the celebration signal…';
  const api = await ensureFirebase();
  if (!api) {
    deviceStatus.textContent = 'Celebration mode · display only';
    return;
  }

  const scanId = `scan-${Date.now()}`;
  try {
    const payload = {
      scanId,
      state: 'celebrate',
      d4: SERVO_ACTIVE.d4,
      d5: SERVO_ACTIVE.d5,
      result: result.tags.join(', '),
      updatedAt: api.serverTimestamp(),
    };
    await Promise.all([
      api.set(api.ref(api.db, 'mindfest/command'), payload),
      api.set(api.ref(api.db, `mindfest/scans/${scanId}`), payload),
      api.set(api.ref(api.db, 'mindfest/servos/d4'), { angle: SERVO_ACTIVE.d4, updatedAt: api.serverTimestamp() }),
      api.set(api.ref(api.db, 'mindfest/servos/d5'), { angle: SERVO_ACTIVE.d5, updatedAt: api.serverTimestamp() }),
    ]);
    deviceStatus.textContent = 'Celebration signal sent ✓';

    window.setTimeout(async () => {
      try {
        await Promise.all([
          api.set(api.ref(api.db, 'mindfest/servos/d4'), { angle: SERVO_NEUTRAL.d4, updatedAt: api.serverTimestamp() }),
          api.set(api.ref(api.db, 'mindfest/servos/d5'), { angle: SERVO_NEUTRAL.d5, updatedAt: api.serverTimestamp() }),
          api.set(api.ref(api.db, 'mindfest/command/state'), 'ready'),
        ]);
      } catch (error) {
        console.warn('Could not reset servo state.', error);
      }
    }, 2500);
  } catch (error) {
    console.error('Firebase write failed.', error);
    deviceStatus.textContent = 'Display complete · device offline';
  }
}

function resetExperience() {
  completed = false;
  experience.classList.remove('is-revealing');
  resultPanel.classList.remove('is-visible');
  resultPanel.setAttribute('aria-hidden', 'true');
  scanLayout.classList.remove('is-hidden');
  fingerButton.classList.remove('is-scanning');
  scannerPanel.classList.remove('is-scanning');
  statusText.textContent = 'STEP 1 — PLACE & HOLD YOUR FINGER';
  progressText.textContent = '00%';
  bpmValue.innerHTML = '72 <small>BPM</small>';
  stages.forEach((item, index) => item.classList.toggle('active', index === 0));
}

fingerButton.addEventListener('pointerdown', startScan);
fingerButton.addEventListener('pointerup', cancelScan);
fingerButton.addEventListener('pointercancel', cancelScan);
fingerButton.addEventListener('lostpointercapture', cancelScan);
fingerButton.addEventListener('contextmenu', (event) => event.preventDefault());
resetButton.addEventListener('click', resetExperience);

document.addEventListener('keydown', (event) => {
  if ((event.code === 'Space' || event.code === 'Enter') && document.activeElement === fingerButton) {
    event.preventDefault();
    if (event.type === 'keydown' && !event.repeat) startScan(event);
  }
});

document.addEventListener('keyup', (event) => {
  if ((event.code === 'Space' || event.code === 'Enter') && scanning) cancelScan(event);
});
