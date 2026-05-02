import { getStage } from './stages';

// ─── Seeded PRNG (mulberry32) ──────────────────────────────────────────────
class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // returns a number between min and max (if max given, otherwise 0–min)
  random(min?: number, max?: number): number {
    if (max === undefined) {
      max = min ?? 1;
      min = 0;
    }
    if (min === undefined) min = 0;
    return min + this.next() * (max - min);
  }
}

// ─── Utility functions (p5 replacements) ────────────────────────────────────
type RGBA = [number, number, number, number];

function mapValue(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
function constrain(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpColor(c1: RGBA, c2: RGBA, t: number): RGBA {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t),
    lerp(c1[3], c2[3], t),
  ];
}

function nf(num: number, left: number, right: number): string {
  const [int, frac = ''] = num.toFixed(right).split('.');
  return int.padStart(left, '0') + (frac ? '.' + frac : '');
}


// ─── Interfaces (unchanged except Color is now RGBA) ────────────────────────
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
  col: RGBA;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_MAX_DEPTH = 8;
const BASE_LEN = 120;
const DURATION = 3500;
const GUARANTEED_DELTA = 0.018;
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 720;

// ─── Global State Container ─────────────────────────────────────────────────
export class CanvasTreeSketch {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  rng!: SeededRandom;

  TotalHours = 8;
  SQS = 0.7;
  growthProgress = 0.2;
  startGrowth = 0.2;
  targetGrowth = 0.2;
  longestSession = 0;
  trunkGirth = 1.0;
  burstParticles: BurstParticle[] = [];
  isAnimating = false;
  animationStart = 0;
  root: Branch | null = null;

  treeSeedNum = 123;
  // Per-stage tree structure params — set by applyStageTreeParams before each regeneration
  treeMaxDepth    = DEFAULT_MAX_DEPTH;
  currentStageIndex = -1; // -1 forces regeneration on first setTotalHours call
  stageEarlyP0  = 0.30;  // P(0 side branches) for immature levels
  stageEarlyP01 = 0.85;  // cumulative P(0 or 1) — remainder is P(2)
  stageMatureP0  = 0.15;  // same for mature levels (maturity >= 0.4)
  stageMatureP01 = 0.60;
  stageLenLow  = 0.72;   // random range for branch length multiplier
  stageLenHigh = 0.88;
  frameCount = 0;
  animationFrameId: number | null = null;
  lastTimestamp = 0;

  // ─── Public methods matching exported API ───────────────────────────────
  setTreeSeed(id: string) {
    let seed = 0;
    for (let i = 0; i < id.length; i++) {
      seed += id.charCodeAt(i);
    }
    this.treeSeedNum = seed;
    this.regenerateTree();
  }

  setTotalHours(hours: number) {
    const newStageIndex = getStage(hours).index;
    const stageChanged  = newStageIndex !== this.currentStageIndex;
    this.TotalHours = hours;
    if (stageChanged) this.regenerateTree();
    if (!this.isAnimating) {
      this.updateGrowthTarget();
      this.growthProgress = this.targetGrowth;
      this.startGrowth    = this.targetGrowth;
    }
  }

  setSQS(sqs: number) {
    this.SQS = sqs;
  }

  replayGrowthAnimation(fromHours: number) {
    this.startGrowth    = this.hoursToProgress(fromHours);
    this.growthProgress = this.startGrowth;
    this.updateGrowthTarget();
    this.animationStart = performance.now();
    this.isAnimating    = true;
  }

  triggerEndSession(newHours: number, sessionLengthHours?: number) {
    const sessionLen = sessionLengthHours !== undefined
      ? sessionLengthHours
      : newHours - this.TotalHours;

    const prevLongest = this.longestSession;
    if (sessionLen > this.longestSession) {
      this.longestSession = sessionLen;
    }

    if (prevLongest < 0.5 && this.longestSession >= 0.5) {
      this.regenerateTree(); // unlock primary branches
    }

    const prevProgress = this.hoursToProgress(this.TotalHours);
    this.TotalHours = newHours;
    this.updateGrowthTarget();

    this.trunkGirth = Math.max(1.0, Math.min(2.0, 1.0 + this.TotalHours * 0.018));

    const rawDelta = this.targetGrowth - prevProgress;
    const visualTarget = prevProgress + Math.max(rawDelta, GUARANTEED_DELTA);

    this.startGrowth    = this.growthProgress;
    this.targetGrowth   = visualTarget;
    this.animationStart = performance.now();
    this.isAnimating = true;

    this.spawnBurst(rawDelta);
  }

  // ─── Initialisation ──────────────────────────────────────────────────────
  init(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.regenerateTree();
    this.updateGrowthTarget();
    this.growthProgress = this.targetGrowth;
    this.startGrowth = this.targetGrowth;
    this.startLoop();
  }

  // ─── Animation loop ──────────────────────────────────────────────────────
  private startLoop() {
    const loop = () => {
      this.frameCount++;
      this.draw();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  // ─── Drawing entry point ─────────────────────────────────────────────────
  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#F7F2E8';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawAtmosphere(ctx);
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);

    const stiffness = mapValue(constrain(this.TotalHours, 0, 60), 0, 60, 0.03, 0.005);
    const globalSway = Math.sin(this.frameCount * stiffness) * stiffness;

    if (this.isAnimating) {
      let t = (performance.now() - this.animationStart) / DURATION;
      t = constrain(t, 0, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      this.growthProgress = lerp(this.startGrowth, this.targetGrowth, ease);
      if (t >= 1) {
        this.isAnimating    = false;
        this.growthProgress = this.targetGrowth;
      }
    }

    this.renderStableTree(ctx, this.root, globalSway);
    if (this.TotalHours >= 50) this.drawSeedUI(ctx);

    this.updateBurst(ctx);

    this.drawHUD(ctx);
    ctx.restore();
  }

  // ─── Tree generation (seeded recursive branching) ────────────────────────
  private applyStageTreeParams(stageIndex: number) {
    switch (stageIndex) {
      case 0: // Seedling — sparse, short
        this.treeMaxDepth = 5; this.stageLenLow = 0.68; this.stageLenHigh = 0.82;
        this.stageEarlyP0 = 0.40; this.stageEarlyP01 = 0.85;
        this.stageMatureP0 = 0.20; this.stageMatureP01 = 0.62; break;
      case 1: // Sapling
        this.treeMaxDepth = 6; this.stageLenLow = 0.70; this.stageLenHigh = 0.84;
        this.stageEarlyP0 = 0.35; this.stageEarlyP01 = 0.83;
        this.stageMatureP0 = 0.18; this.stageMatureP01 = 0.60; break;
      case 2: // Young Tree — noticeably denser
        this.treeMaxDepth = 8; this.stageLenLow = 0.74; this.stageLenHigh = 0.88;
        this.stageEarlyP0 = 0.20; this.stageEarlyP01 = 0.70;
        this.stageMatureP0 = 0.10; this.stageMatureP01 = 0.50; break;
      case 3: // Elder Tree — rich canopy
        this.treeMaxDepth = 9; this.stageLenLow = 0.76; this.stageLenHigh = 0.90;
        this.stageEarlyP0 = 0.15; this.stageEarlyP01 = 0.62;
        this.stageMatureP0 = 0.08; this.stageMatureP01 = 0.42; break;
      default: // Elder — maximum density
        this.treeMaxDepth = 10; this.stageLenLow = 0.78; this.stageLenHigh = 0.92;
        this.stageEarlyP0 = 0.12; this.stageEarlyP01 = 0.55;
        this.stageMatureP0 = 0.05; this.stageMatureP01 = 0.35; break;
    }
  }

  private regenerateTree() {
    this.applyStageTreeParams(getStage(this.TotalHours).index);
    this.currentStageIndex = getStage(this.TotalHours).index;
    this.rng = new SeededRandom(this.treeSeedNum);
    this.root = this.generateStableBranch(BASE_LEN, this.treeMaxDepth);
  }

  private generateStableBranch(len: number, depth: number): Branch | null {
    if (depth <= 0) return null;
    const level = (this.treeMaxDepth - depth) + 1;

    const branch: Branch = {
      len: len * (level === 1 ? 1.0 : this.rng.random(this.stageLenLow, this.stageLenHigh)),
      level,
      angle: level === 1 ? this.rng.random(-0.03, 0.03) : this.rng.random(-0.06, 0.06),
      children: [],
      leafPositions: Array.from({ length: 5 }, () => ({
        y: this.rng.random(0.2, 0.9),
        side: this.rng.next() > 0.5 ? 1 : -1,
        angle: this.rng.random(0.5, 1.3),
        stemLen: this.rng.random(5, 14),
        sizeMult: this.rng.random(1.0, 1.6),
      })),
    };

    const maturity = mapValue(level, 1, this.treeMaxDepth, 0, 1);
    const r = this.rng.next();
    let sideCount: number;
    if (level === this.treeMaxDepth) {
      sideCount = 0;
    } else if (maturity < 0.4) {
      sideCount = r < this.stageEarlyP0 ? 0 : (r < this.stageEarlyP01 ? 1 : 2);
    } else {
      sideCount = r < this.stageMatureP0 ? 0 : (r < this.stageMatureP01 ? 1 : 2);
    }

    const leader = this.generateStableBranch(branch.len, depth - 1);
    if (leader) {
      leader.angle = this.rng.random(-0.14, 0.14);
      leader.isPrimary = false;
      branch.children.push(leader);
    }

    const isPrimaryLevel = level === 2;
    const primaryUnlocked = this.longestSession >= 0.5;

    if (sideCount === 1) {
      const lenMult = (isPrimaryLevel && primaryUnlocked)
        ? this.rng.random(1.1, 1.35)
        : this.rng.random(0.7, 0.9);
      const side = this.generateStableBranch(branch.len * lenMult, depth - 1);
      if (side) {
        const dir = this.rng.next() > 0.5 ? 1 : -1;
        const spreadMax = (isPrimaryLevel && primaryUnlocked) ? 1.3 : 1.0;
        side.angle = dir * this.rng.random(0.4, spreadMax) + this.rng.random(-0.07, 0.07);
        side.isPrimary = isPrimaryLevel && primaryUnlocked;
        branch.children.push(side);
      }
    } else if (sideCount === 2) {
      const dir = this.rng.next() > 0.5 ? 1 : -1;
      for (let s = 0; s < 2; s++) {
        const lenMult = (isPrimaryLevel && primaryUnlocked)
          ? this.rng.random(1.1, 1.4)
          : this.rng.random(0.65, 0.85);
        const side = this.generateStableBranch(branch.len * lenMult, depth - 1);
        if (side) {
          const spreadMax = (isPrimaryLevel && primaryUnlocked) ? 1.35 : 1.0;
          side.angle = (s === 0 ? dir : -dir) * this.rng.random(0.4, spreadMax) + this.rng.random(-0.07, 0.07);
          side.isPrimary = isPrimaryLevel && primaryUnlocked;
          branch.children.push(side);
        }
      }
    }

    return branch;
  }

  // ─── Rendering (adapted from p5 to raw Canvas 2D) ──────────────────────────
  private drawAtmosphere(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.38);
    for (let i = 0; i < 70; i++) {
      const alpha = mapValue(i, 0, 70, 15, 0.1);
      ctx.fillStyle = `rgba(255, 235, 195, ${alpha / 255})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, i * 7, i * 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderStableTree(ctx: CanvasRenderingContext2D, branch: Branch | null, sway: number) {
    if (!branch) return;

    const md = this.treeMaxDepth;
    const levelThreshold = (branch.level - 1) / md;
    const localProgress = constrain(
      mapValue(this.growthProgress, levelThreshold, branch.level / md, 0, 1),
      0, 1
    );
    if (localProgress <= 0) return;

    ctx.save();
    ctx.rotate(branch.angle + sway * mapValue(branch.level, 1, md, 0.1, 3.5));

    const dLen = branch.len * localProgress;
    const isFresh = this.isAnimating && localProgress > 0.05 && localProgress < 0.99;

    const woody: RGBA = [70, 50, 40, 255];
    const sprout: RGBA = [110, 160, 90, 255];
    const fresh: RGBA = [180, 255, 100, 255];
    const baseColor = lerpColor(woody, sprout, mapValue(branch.level, 1, md, 0, 0.9));
    const finalColor = isFresh ? lerpColor(baseColor, fresh, 0.45) : baseColor;

    const baseWeight = mapValue(
      branch.level, 1, md,
      mapValue(this.growthProgress, 0.1, 1.0, 6, 28) * this.trunkGirth,
      1.5
    );

    if (isFresh) {
      ctx.lineWidth = baseWeight + 2.5;
      ctx.strokeStyle = `rgba(180,255,100,0.35)`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -dLen);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(${finalColor[0]},${finalColor[1]},${finalColor[2]},${finalColor[3] / 255})`;
    ctx.lineWidth = baseWeight;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -dLen);
    ctx.stroke();

    if (branch.level >= 2 && localProgress > 0.2) {
      this.drawStageLeaves(ctx, branch, dLen, localProgress, finalColor, isFresh);
    }

    ctx.translate(0, -dLen);

    if (branch.level === 1) {
      this.drawSeedlingCluster(ctx, this.growthProgress);
    }

    if (this.TotalHours >= 50 && branch.level === this.treeMaxDepth && localProgress > 0.9) {
      this.drawFlower(ctx);
    }

    if (localProgress > 0.6) {
      for (const child of branch.children) {
        this.renderStableTree(ctx, child, sway);
      }
    }
    ctx.restore();
  }

  private drawStageLeaves(
    ctx: CanvasRenderingContext2D,
    branch: Branch,
    currentLen: number,
    localProgress: number,
    branchColor: RGBA,
    isFresh: boolean
  ) {
    const visibleCount = Math.floor(mapValue(this.SQS, 0, 1, 1, branch.leafPositions.length));
    const leafGrowth = constrain(mapValue(localProgress, 0.3, 1.0, 0, 1), 0, 1);

    for (let i = 0; i < Math.min(visibleCount, branch.leafPositions.length); i++) {
      const lp = branch.leafPositions[i];
      const yPos = -currentLen * lp.y;

      ctx.save();
      ctx.translate(0, yPos);
      ctx.rotate(lp.side * lp.angle);

      // stem
      ctx.strokeStyle = `rgba(${branchColor[0]},${branchColor[1]},${branchColor[2]},${branchColor[3] / 255})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -lp.stemLen * leafGrowth);
      ctx.stroke();

      if (leafGrowth > 0.1) {
        ctx.translate(0, -lp.stemLen * leafGrowth);

        const deepForest: RGBA = [35, 80, 50, 215];
        const summerGreen: RGBA = [60, 115, 70, 215];
        const vibrantGreen: RGBA = [90, 160, 65, 215];
        const bloomGold: RGBA = [190, 175, 60, 215];
        const bloomPink: RGBA = [230, 160, 170, 215];
        const freshLime: RGBA = [160, 230, 90, 215];
        const autumnGold: RGBA = [200, 165, 55, 215];

        let col: RGBA;
        if (this.SQS < 0.35) {
          col = lerpColor(deepForest, summerGreen, mapValue(this.SQS, 0, 0.35, 0, 0.4));
        } else if (this.SQS < 0.65) {
          col = lerpColor(summerGreen, vibrantGreen, mapValue(this.SQS, 0.35, 0.65, 0, 1));
        } else if (this.SQS < 0.85) {
          col = lerpColor(vibrantGreen, bloomGold, mapValue(this.SQS, 0.65, 0.85, 0, 0.6));
        } else {
          col = lerpColor(bloomGold, bloomPink, mapValue(this.SQS, 0.85, 1.0, 0, 0.45));
        }
        if (isFresh) col = lerpColor(col, freshLime, 0.55);

        const seasonLerp = mapValue(constrain(this.TotalHours, 45, 65), 45, 65, 0, 0.5);
        if (seasonLerp > 0) col = lerpColor(col, autumnGold, seasonLerp);

        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(col[3] / 255)})`;
        const sz = 18 * lp.sizeMult * leafGrowth;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(sz * 0.5, -sz * 0.3, sz * 0.4, -sz * 0.9, 0, -sz * 1.1);
        ctx.bezierCurveTo(-sz * 0.4, -sz * 0.9, -sz * 0.5, -sz * 0.3, 0, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawSeedlingCluster(ctx: CanvasRenderingContext2D, progress: number) {
    if (progress > 0.35) return;
    const t = mapValue(progress, 0.10, 0.35, 0, 1);
    const count = Math.floor(mapValue(t, 0, 1, 2, 5));
    const leafSize = mapValue(t, 0, 1, 6, 14);

    ctx.fillStyle = 'rgba(80,130,85,0.78)';
    for (let i = 0; i < count; i++) {
      const spread = mapValue(i, 0, count - 1, -0.9, 0.9);
      const reach = leafSize * 1.4;
      ctx.save();
      ctx.rotate(spread);
      ctx.translate(0, -reach * 0.4);
      const s = leafSize * (0.7 + 0.3 * (1 - Math.abs(spread)));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.4, -s * 0.9, 0, -s * 1.1);
      ctx.bezierCurveTo(-s * 0.4, -s * 0.9, -s * 0.5, -s * 0.3, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFlower(ctx: CanvasRenderingContext2D) {
    const pulse = Math.sin(this.frameCount * 0.08) * 4;
    ctx.save();
    ctx.fillStyle = 'rgba(255,180,210,0.9)';
    for (let a = 0; a < Math.PI * 2; a += Math.PI * 2 / 5) {
      ctx.save();
      ctx.rotate(a + this.frameCount * 0.01);
      ctx.beginPath();
      ctx.ellipse(0, -6, 10 + pulse, 14 + pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,230,120,1)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawSeedUI(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.resetTransform();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(80,60,45,1)';
    ctx.font = '15px sans-serif';
    ctx.fillText('A grove sprout has appeared', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 80);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(100,80,60,1)';
    ctx.fillText('Gift this sprout to invite a friend to Stillgrove.', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
    ctx.restore();
  }

  private drawHUD(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.resetTransform();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(90,70,50,0.7)';
    ctx.font = '11px sans-serif';

    const longest = this.longestSession >= 1
      ? this.longestSession.toFixed(1) + ' hr'
      : Math.floor(this.longestSession * 60) + ' min';
    const label = getStageLabel(this.TotalHours);
    ctx.fillText(
      `${label}  ·  ${this.TotalHours.toFixed(2)} hrs  ·  SQS ${nf(this.SQS, 1, 2)}  ·  longest ${longest}`,
      14, 18
    );

    const barW = CANVAS_WIDTH - 28;
    const prog = constrain(this.hoursToProgress(this.TotalHours), 0.05, 1.0);
    ctx.fillStyle = 'rgba(210,200,185,0.51)';
    ctx.fillRect(14, 26, barW, 3);
    ctx.fillStyle = 'rgba(100,160,90,0.86)';
    ctx.fillRect(14, 26, barW * prog, 3);
    ctx.restore();
  }

  // ─── Burst particles ─────────────────────────────────────────────────────
  private spawnBurst(delta: number) {
    this.burstParticles = [];
    const count = Math.floor(mapValue(constrain(delta, 0, 0.12), 0, 0.12, 8, 48));
    for (let i = 0; i < count; i++) {
      this.burstParticles.push({
        x: CANVAS_WIDTH / 2 + this.rng.random(-40, 40),
        y: CANVAS_HEIGHT * 0.33 + this.rng.random(-50, 20),
        vx: this.rng.random(-2.0, 2.0),
        vy: this.rng.random(-4.0, -0.8),
        rot: this.rng.random(Math.PI * 2),
        rotV: this.rng.random(-0.09, 0.09),
        size: this.rng.random(8, 20),
        life: 1.0,
        col: this.rng.next() > 0.4
          ? [80 + Math.floor(this.rng.random(70)), 160 + Math.floor(this.rng.random(60)), 70 + Math.floor(this.rng.random(50)), 220]
          : [180, 220, 100, 200],
      });
    }
  }

  private updateBurst(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.resetTransform();
    this.burstParticles = this.burstParticles.filter(p => p.life > 0.02);
    for (const p of this.burstParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.07;
      p.rot += p.rotV;
      p.life -= 0.016;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.size * p.life;
      ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${(p.col[3] / 255) * p.life})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.4, -s * 0.9, 0, -s * 1.1);
      ctx.bezierCurveTo(-s * 0.4, -s * 0.9, -s * 0.5, -s * 0.3, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ─── Progress mapping ────────────────────────────────────────────────────
  private hoursToProgress(h: number): number {
    if (h <= 0) return 0.18;
    if (h <= 50) return 0.18 + 0.82 * Math.sqrt(h / 50);
    return 1.0 + Math.log(h - 49) * 0.04;
  }

  private updateGrowthTarget() {
    this.targetGrowth = this.hoursToProgress(this.TotalHours);
  }
}

// ─── Helper outside the class ──────────────────────────────────────────────
function getStageLabel(h: number): string {
  if (h < 3) return 'Seedling';
  if (h < 10) return 'Sapling';
  if (h < 30) return 'Young tree';
  if (h < 50) return 'Elder tree';
  return 'Elder · sprout ready';
}

// ─── Singleton instance and exported API ────────────────────────────────────
let instance: CanvasTreeSketch | null = null;

export function initCanvas(parent: HTMLElement) {
  instance = new CanvasTreeSketch();
  instance.init(parent);
  return instance;
}

export function setTreeSeed(id: string) {
  instance?.setTreeSeed(id);
}

export function setTotalHours(hours: number) {
  instance?.setTotalHours(hours);
}

export function setSQS(sqs: number) {
  instance?.setSQS(sqs);
}

export function replayGrowthAnimation(prevTotalHours: number) {
  instance?.replayGrowthAnimation(prevTotalHours);
}

export function triggerEndSession(newHours: number, sessionLengthHours?: number) {
  instance?.triggerEndSession(newHours, sessionLengthHours);
}