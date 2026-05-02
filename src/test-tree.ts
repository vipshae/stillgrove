import {
  initCanvas,
  setTreeSeed,
  setSQS,
  triggerEndSession,
} from './core/sketch';

let currentHours = 1;

// ── Mount the canvas ───────────────────────────────────────────────────────
const container = document.getElementById('sketch-container')!;
container.innerHTML = '';
initCanvas(container);

// ── Set initial seed ──────────────────────────────────────────────────────
setTreeSeed('default');

// ── Sliders & display ─────────────────────────────────────────────────────
const hoursSlider = document.getElementById('hours') as HTMLInputElement;
const sqsSlider   = document.getElementById('sqs')   as HTMLInputElement;
const hoursVal    = document.getElementById('hours-val')!;
const sqsVal      = document.getElementById('sqs-val')!;
const seedInput   = document.getElementById('seed')  as HTMLInputElement;

hoursSlider.addEventListener('input', () => {
  const next = parseFloat(hoursSlider.value);
  hoursVal.textContent = next.toFixed(1);

  // Animate growth from currentHours → next
  triggerEndSession(next, next - currentHours);
  currentHours = next;
});

sqsSlider.addEventListener('input', () => {
  const v = parseFloat(sqsSlider.value);
  sqsVal.textContent = v.toFixed(2);
  setSQS(v);
});

document.getElementById('apply-seed')!.addEventListener('click', () => {
  const seed = seedInput.value.trim() || 'default';
  setTreeSeed(seed);               // regenerates the tree immediately
});

// ── Optional: manual "End Session" button (see HTML) ───────────────────────
document.getElementById('end-session-btn')?.addEventListener('click', () => {
  // Simulate adding 1 hour (or whatever you like)
  const added = 1;
  const next = currentHours + added;
  hoursSlider.value = String(next);
  hoursVal.textContent = next.toFixed(1);
  triggerEndSession(next, added);
  currentHours = next;
});