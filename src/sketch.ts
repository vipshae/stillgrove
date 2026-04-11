import p5 from 'p5';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface LeafPosition {
  y: number;
  side: number;
  angle: number;
  stemLen: number;
  sizeMult: number;
}

interface Branch {
  len: number;
  level: number;
  angle: number;
  children: Branch[];
  leafPositions: LeafPosition[];
  isPrimary?: boolean;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotV: number;
  size: number;
  life: number;
  col: p5.Color;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_DEPTH = 8;
const BASE_LEN = 110;
const DURATION = 3500;
const GUARANTEED_DELTA = 0.018;

// Draw a cubic bezier segment in p5 v2: cp1 → cp2 → end, each as a separate bezierVertex call.
function cubicBezierTo(p: p5, cp1x: number, cp1y: number, cp2x: number, cp2y: number, ex: number, ey: number) {
  p.bezierVertex(cp1x, cp1y);
  p.bezierVertex(cp2x, cp2y);
  p.bezierVertex(ex, ey);
}

// ─── Global State ────────────────────────────────────────────────────────────
let TotalHours = 8;
let SQS = 0.7;
let growthProgress = 0.2;
let startGrowth = 0.2;
let targetGrowth = 0.2;
let longestSession = 0;
let trunkGirth = 1.0;
let burstParticles: BurstParticle[] = [];
let isAnimating = false;
let animationStart = 0;
let root: Branch | null = null;
let currentP: p5 | null = null;

// ─── Sketch Function ─────────────────────────────────────────────────────────
export const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(500, 720);
    p.angleMode(p.RADIANS);
    currentP = p;
    root = generateStableBranch(BASE_LEN, MAX_DEPTH, p);
    updateGrowthTarget();
    growthProgress = targetGrowth;
    startGrowth = targetGrowth;
  };

  p.draw = () => {
    p.background(247, 242, 232);
    drawAtmosphere(p);
    p.translate(p.width / 2, p.height - 40);

    const stiffness = p.map(p.constrain(TotalHours, 0, 60), 0, 60, 0.03, 0.005);
    const globalSway = p.sin(p.frameCount * stiffness) * stiffness;

    if (isAnimating) {
      let t = (p.millis() - animationStart) / DURATION;
      t = p.constrain(t, 0, 1);
      growthProgress = p.lerp(startGrowth, targetGrowth, 1 - p.pow(1 - t, 4));
      if (t >= 1) {
        isAnimating = false;
        growthProgress = targetGrowth;
      }
    }

    renderStableTree(p, root, globalSway);
    if (TotalHours >= 50) drawSeedUI(p);

    updateBurst(p);

    drawHUD(p);
  };
};

// ─── Exported Functions ──────────────────────────────────────────────────────
export function setTotalHours(hours: number) {
  TotalHours = hours;
}

export function setSQS(sqs: number) {
  SQS = sqs;
}

export function triggerEndSession(newHours: number, sessionLengthHours?: number) {
  const sessionLen = sessionLengthHours !== undefined
    ? sessionLengthHours
    : (newHours - TotalHours);

  const prevLongest = longestSession;
  if (sessionLen > longestSession) {
    longestSession = sessionLen;
  }

  if (prevLongest < 0.5 && longestSession >= 0.5 && currentP) {
    root = generateStableBranch(BASE_LEN, MAX_DEPTH, currentP);
  }

  const prevProgress = hoursToProgress(TotalHours);
  TotalHours = newHours;
  updateGrowthTarget();

  trunkGirth = Math.max(1.0, Math.min(2.0, 1.0 + TotalHours * 0.018));

  const rawDelta = targetGrowth - prevProgress;
  const visualTarget = prevProgress + Math.max(rawDelta, GUARANTEED_DELTA);

  startGrowth = growthProgress;
  targetGrowth = visualTarget;
  animationStart = currentP ? currentP.millis() : 0;
  isAnimating = true;

  if (currentP) {
    spawnBurst(rawDelta, currentP);
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────
function hoursToProgress(h: number): number {
  if (h <= 0) return 0.18;
  if (h <= 50) return 0.18 + 0.82 * Math.sqrt(h / 50);
  return 1.0 + Math.log(h - 49) * 0.04;
}

function updateGrowthTarget() {
  targetGrowth = hoursToProgress(TotalHours);
}

function generateStableBranch(len: number, depth: number, p: p5): Branch | null {
  if (depth <= 0) return null;
  const level = (MAX_DEPTH - depth) + 1;

  const branch: Branch = {
    len: len * (level === 1 ? 1.0 : p.random(0.72, 0.88)),
    level,
    angle: level === 1 ? p.random(-0.03, 0.03) : p.random(-0.06, 0.06),
    children: [],
    leafPositions: Array.from({ length: 5 }, () => ({
      y: p.random(0.2, 0.9),
      side: p.random() > 0.5 ? 1 : -1,
      angle: p.random(0.5, 1.3),
      stemLen: p.random(5, 14),
      sizeMult: p.random(1.0, 1.6)
    }))
  };

  const maturity = p.map(level, 1, MAX_DEPTH, 0, 1);
  let sideCount;
  const r = p.random();
  if (level === MAX_DEPTH) {
    sideCount = 0;
  } else if (maturity < 0.4) {
    sideCount = r < 0.3 ? 0 : (r < 0.85 ? 1 : 2);
  } else {
    sideCount = r < 0.15 ? 0 : (r < 0.6 ? 1 : 2);
  }

  const leader = generateStableBranch(branch.len, depth - 1, p);
  if (leader) {
    leader.angle = p.random(-0.14, 0.14);
    leader.isPrimary = false;
    branch.children.push(leader);
  }

  const isPrimaryLevel = (level === 2);
  const primaryUnlocked = longestSession >= 0.5;

  if (sideCount === 1) {
    const lenMult = (isPrimaryLevel && primaryUnlocked) ? p.random(1.1, 1.35) : p.random(0.7, 0.9);
    const side = generateStableBranch(branch.len * lenMult, depth - 1, p);
    if (side) {
      const dir = p.random() > 0.5 ? 1 : -1;
      const spreadMax = (isPrimaryLevel && primaryUnlocked) ? 1.3 : 1.0;
      side.angle = dir * p.random(0.4, spreadMax) + p.random(-0.07, 0.07);
      side.isPrimary = isPrimaryLevel && primaryUnlocked;
      branch.children.push(side);
    }
  } else if (sideCount === 2) {
    const dir = p.random() > 0.5 ? 1 : -1;
    for (let s = 0; s < 2; s++) {
      const lenMult = (isPrimaryLevel && primaryUnlocked) ? p.random(1.1, 1.4) : p.random(0.65, 0.85);
      const side = generateStableBranch(branch.len * lenMult, depth - 1, p);
      if (side) {
        const spreadMax = (isPrimaryLevel && primaryUnlocked) ? 1.35 : 1.0;
        side.angle = (s === 0 ? dir : -dir) * p.random(0.4, spreadMax) + p.random(-0.07, 0.07);
        side.isPrimary = isPrimaryLevel && primaryUnlocked;
        branch.children.push(side);
      }
    }
  }

  return branch;
}

function drawSeedlingCluster(p: p5, progress: number) {
  if (progress > 0.35) return;
  const t = p.map(progress, 0.10, 0.35, 0, 1);
  const count = p.floor(p.map(t, 0, 1, 2, 5));
  const leafSize = p.map(t, 0, 1, 6, 14);

  p.noStroke();
  const col = p.color(80, 130, 85, 200);

  for (let i = 0; i < count; i++) {
    const spread = p.map(i, 0, count - 1, -0.9, 0.9);
    const reach = leafSize * 1.4;
    p.push();
    p.rotate(spread);
    p.translate(0, -reach * 0.4);
    p.fill(col);
    const s = leafSize * (0.7 + 0.3 * (1 - Math.abs(spread)));
    p.beginShape();
    p.vertex(0, 0);
    cubicBezierTo(p, s * 0.5, -s * 0.3, s * 0.4, -s * 0.9, 0, -s * 1.1);
    cubicBezierTo(p, -s * 0.4, -s * 0.9, -s * 0.5, -s * 0.3, 0, 0);
    p.endShape(p.CLOSE);
    p.pop();
  }
}

function renderStableTree(p: p5, branch: Branch | null, sway: number) {
  if (!branch) return;

  const levelThreshold = (branch.level - 1) / MAX_DEPTH;
  const localProgress = p.constrain(
    p.map(growthProgress, levelThreshold, branch.level / MAX_DEPTH, 0, 1), 0, 1
  );
  if (localProgress <= 0) return;

  p.push();
  p.rotate(branch.angle + sway * p.map(branch.level, 1, MAX_DEPTH, 0.1, 3.5));

  const dLen = branch.len * localProgress;

  const woody = p.color(70, 50, 40);
  const sprout = p.color(110, 160, 90);
  const fresh = p.color(180, 255, 100);

  const isFresh = isAnimating && localProgress > 0.05 && localProgress < 0.99;
  const baseColor = p.lerpColor(woody, sprout, p.map(branch.level, 1, MAX_DEPTH, 0, 0.9));
  const finalColor = isFresh ? p.lerpColor(baseColor, fresh, 0.45) : baseColor;

  const baseWeight = p.map(branch.level, 1, MAX_DEPTH,
    p.map(growthProgress, 0.10, 1.0, 6, 28) * trunkGirth, 1.5);

  if (isFresh) {
    p.strokeWeight(baseWeight + 2.5);
    p.stroke(180, 255, 100, 90);
    p.line(0, 0, 0, -dLen);
  }

  p.stroke(finalColor);
  p.strokeWeight(baseWeight);
  p.line(0, 0, 0, -dLen);

  if (branch.level >= 2 && localProgress > 0.2) {
    drawStageLeaves(p, branch, dLen, localProgress, finalColor, isFresh);
  }

  p.translate(0, -dLen);

  if (branch.level === 1) {
    drawSeedlingCluster(p, growthProgress);
  }

  if (TotalHours >= 50 && branch.level === MAX_DEPTH && localProgress > 0.9) {
    drawFlower(p);
  }

  if (localProgress > 0.6) {
    for (const child of branch.children) {
      renderStableTree(p, child, sway);
    }
  }
  p.pop();
}

function drawStageLeaves(p: p5, branch: Branch, currentLen: number, localProgress: number, branchColor: p5.Color, isFresh: boolean) {
  const visibleCount = p.floor(p.map(SQS, 0, 1, 1, branch.leafPositions.length));
  const leafGrowth = p.constrain(p.map(localProgress, 0.3, 1.0, 0, 1), 0, 1);

  for (let i = 0; i < Math.min(visibleCount, branch.leafPositions.length); i++) {
    const lp = branch.leafPositions[i];
    const yPos = -currentLen * lp.y;

    p.push();
    p.translate(0, yPos);
    p.rotate(lp.side * lp.angle);

    p.stroke(branchColor);
    p.strokeWeight(1.2);
    p.line(0, 0, 0, -lp.stemLen * leafGrowth);

    if (leafGrowth > 0.1) {
      p.translate(0, -lp.stemLen * leafGrowth);

      const deepForest = p.color(35, 80, 50);
      const summerGreen = p.color(60, 115, 70);
      const vibrantGreen = p.color(90, 160, 65);
      const bloomGold = p.color(190, 175, 60);
      const bloomPink = p.color(230, 160, 170);
      const freshLime = p.color(160, 230, 90);

      let col: p5.Color;
      if (SQS < 0.35) {
        col = p.lerpColor(deepForest, summerGreen, p.map(SQS, 0, 0.35, 0, 0.4));
      } else if (SQS < 0.65) {
        col = p.lerpColor(summerGreen, vibrantGreen, p.map(SQS, 0.35, 0.65, 0, 1));
      } else if (SQS < 0.85) {
        col = p.lerpColor(vibrantGreen, bloomGold, p.map(SQS, 0.65, 0.85, 0, 0.6));
      } else {
        const goldBloom = p.lerpColor(bloomGold, bloomPink, p.map(SQS, 0.85, 1.0, 0, 0.45));
        col = goldBloom;
      }

      if (isFresh) col = p.lerpColor(col, freshLime, 0.55);

      const seasonLerp = p.map(p.constrain(TotalHours, 45, 65), 45, 65, 0, 0.5);
      if (seasonLerp > 0) col = p.lerpColor(col, p.color(200, 165, 55), seasonLerp);

      p.fill(p.red(col), p.green(col), p.blue(col), 215);
      p.noStroke();
      const sz = 18 * lp.sizeMult * leafGrowth;
      p.beginShape();
      p.vertex(0, 0);
      cubicBezierTo(p, sz * 0.5, -sz * 0.3, sz * 0.4, -sz * 0.9, 0, -sz * 1.1);
      cubicBezierTo(p, -sz * 0.4, -sz * 0.9, -sz * 0.5, -sz * 0.3, 0, 0);
      p.endShape(p.CLOSE);
    }
    p.pop();
  }
}

function drawFlower(p: p5) {
  p.push();
  const pulse = p.sin(p.frameCount * 0.08) * 4;
  p.noStroke();
  p.fill(255, 180, 210, 230);
  for (let a = 0; a < p.TWO_PI; a += p.TWO_PI / 5) {
    p.push();
    p.rotate(a + p.frameCount * 0.01);
    p.ellipse(0, -6, 10 + pulse, 14 + pulse);
    p.pop();
  }
  p.fill(255, 230, 120);
  p.ellipse(0, 0, 7, 7);
  p.pop();
}

function drawSeedUI(p: p5) {
  p.push();
  p.resetMatrix();
  p.textAlign(p.CENTER);
  p.fill(80, 60, 45);
  p.textSize(15);
  p.text("A grove sprout has appeared", p.width / 2, p.height - 80);
  p.textSize(12);
  p.fill(100, 80, 60);
  p.text("Gift this sprout to invite a friend to Stillgrove.", p.width / 2, p.height - 60);
  p.pop();
}

function spawnBurst(delta: number, p: p5) {
  burstParticles = [];
  const count = p.constrain(p.floor(p.map(delta, 0, 0.12, 8, 48)), 8, 48);
  for (let i = 0; i < count; i++) {
    burstParticles.push({
      x: p.width / 2 + p.random(-40, 40),
      y: p.height * 0.33 + p.random(-50, 20),
      vx: p.random(-2.0, 2.0),
      vy: p.random(-4.0, -0.8),
      rot: p.random(p.TWO_PI),
      rotV: p.random(-0.09, 0.09),
      size: p.random(8, 20),
      life: 1.0,
      col: p.random() > 0.4
        ? p.color(80 + p.random(70), 160 + p.random(60), 70 + p.random(50), 220)
        : p.color(180, 220, 100, 200)
    });
  }
}

function updateBurst(p: p5) {
  p.push();
  p.resetMatrix();
  p.noStroke();
  burstParticles = burstParticles.filter(particle => particle.life > 0.02);
  for (const particle of burstParticles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.07;
    particle.rot += particle.rotV;
    particle.life -= 0.016;

    p.fill(p.red(particle.col), p.green(particle.col), p.blue(particle.col), p.alpha(particle.col) * particle.life);
    p.push();
    p.translate(particle.x, particle.y);
    p.rotate(particle.rot);
    const s = particle.size * particle.life;
    p.beginShape();
    p.vertex(0, 0);
    cubicBezierTo(p, s * 0.5, -s * 0.3, s * 0.4, -s * 0.9, 0, -s * 1.1);
    cubicBezierTo(p, -s * 0.4, -s * 0.9, -s * 0.5, -s * 0.3, 0, 0);
    p.endShape(p.CLOSE);
    p.pop();
  }
  p.pop();
}

function drawHUD(p: p5) {
  p.push();
  p.resetMatrix();
  p.noStroke();
  p.fill(90, 70, 50, 180);
  p.textSize(11);
  p.textAlign(p.LEFT);
  const longest = longestSession >= 1
    ? longestSession.toFixed(1) + ' hr'
    : Math.floor(longestSession * 60) + ' min';
  p.text(
    getStageLabel(TotalHours) + '  ·  ' + TotalHours.toFixed(2) + ' hrs  ·  SQS ' +
    p.nf(SQS, 1, 2) + '  ·  longest ' + longest,
    14, 18
  );

  const barW = p.width - 28;
  const prog = p.constrain(hoursToProgress(TotalHours), 0.05, 1.0);
  p.fill(210, 200, 185, 130);
  p.rect(14, 26, barW, 3, 2);
  p.fill(100, 160, 90, 220);
  p.rect(14, 26, barW * prog, 3, 2);
  p.pop();
}

function getStageLabel(h: number): string {
  if (h < 3) return "Seedling";
  if (h < 10) return "Sapling";
  if (h < 30) return "Young tree";
  if (h < 50) return "Elder tree";
  return "Elder · sprout ready";
}

function drawAtmosphere(p: p5) {
  p.noStroke();
  for (let i = 0; i < 70; i++) {
    p.fill(255, 235, 195, p.map(i, 0, 70, 15, 0));
    p.ellipse(p.width / 2, p.height * 0.38, i * 14);
  }
}