import { sound } from './Sound';


export type FactionType = 'NEUTRAL' | 'PLAYER' | 'ENEMY';

export interface BaseConfig {
  id: string;
  name: string;
  x: number; // world x
  y: number; // world y
  radius: number; // capture zone radius (default 120px)
  faction: FactionType;
  progress: number; // 0 to 100
  capturingFaction: FactionType | null;
}

export class BasesManager {
  bases: BaseConfig[] = [];
  incomeTimer: number = 0;
  spawnDefenderTimer: number = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.bases = [
      {
        id: 'alpha',
        name: 'Outpost Alpha (Communications)',
        x: 2048,
        y: 512,
        radius: 120,
        faction: 'ENEMY', // Captured by enemies initially
        progress: 100,
        capturingFaction: null
      },
      {
        id: 'beta',
        name: 'Outpost Beta (Supply Depot)',
        x: 512,
        y: 2048,
        radius: 120,
        faction: 'NEUTRAL',
        progress: 0,
        capturingFaction: null
      },
      {
        id: 'gamma',
        name: 'Command Center Gamma',
        x: 1280,
        y: 1280,
        radius: 140,
        faction: 'NEUTRAL',
        progress: 0,
        capturingFaction: null
      },
      {
        id: 'delta',
        name: 'Outpost Delta (Launchpad)',
        x: 2048,
        y: 2048,
        radius: 120,
        faction: 'ENEMY',
        progress: 100,
        capturingFaction: null
      }
    ];
    this.incomeTimer = 0;
    this.spawnDefenderTimer = 0;
  }

  // Returns list of positions for fog-of-war calculations
  getPositionsForFog() {
    return this.bases.map(b => ({
      x: b.x,
      y: b.y,
      isPlayerFaction: b.faction === 'PLAYER'
    }));
  }

  // Main capture checking logic
  update(
    dt: number,
    playerX: number,
    playerY: number,
    enemies: { x: number, y: number, isFriendly: boolean }[],
    onCreditsEarned: (amount: number) => void,
    onSpawnDefender: (x: number, y: number) => void
  ): { activeBase: BaseConfig | null } {
    let activeBase: BaseConfig | null = null;

    // 1. Manage Capture Progress for each Base
    this.bases.forEach(base => {
      // Check presence inside capture zone
      const dxPlayer = playerX - base.x;
      const dyPlayer = playerY - base.y;
      const distSqPlayer = dxPlayer*dxPlayer + dyPlayer*dyPlayer;
      const isPlayerInside = distSqPlayer < base.radius * base.radius;

      // Count enemies in capture zone (distinguished by friendly vs hostile)
      let hostilesCount = 0;
      let friendliesCount = 0; // friendly AI soldiers

      enemies.forEach(e => {
        const dx = e.x - base.x;
        const dy = e.y - base.y;
        const distSq = dx*dx + dy*dy;
        if (distSq < base.radius * base.radius) {
          if (e.isFriendly) {
            friendliesCount++;
          } else {
            hostilesCount++;
          }
        }
      });

      const totalPlayerPresence = isPlayerInside || friendliesCount > 0;
      const totalEnemyPresence = hostilesCount > 0;

      // Determine active capturing dynamics
      if (totalPlayerPresence && !totalEnemyPresence) {
        // Player is capturing
        activeBase = base;
        if (base.faction !== 'PLAYER') {
          base.capturingFaction = 'PLAYER';
          const oldProgress = base.progress;
          
          if (base.faction === 'ENEMY') {
            // Decap hostile progress first
            base.progress = Math.max(0, base.progress - (15 * dt) / 1000);
            if (base.progress === 0) {
              base.faction = 'NEUTRAL';
            }
          } else {
            // Faction is neutral, build up player progress
            base.progress = Math.min(100, base.progress + (15 * dt) / 1000);
            if (base.progress === 100) {
              base.faction = 'PLAYER';
              base.capturingFaction = null;
              sound.playCaptureComplete();
            }
          }

          // Trigger capture ticking sound periodically
          if (Math.floor(base.progress / 10) !== Math.floor(oldProgress / 10)) {
            sound.playCaptureProgress();
          }
        } else if (base.progress < 100) {
          // Re-securing base if decayed
          base.progress = Math.min(100, base.progress + (15 * dt) / 1000);
        }
      } else if (totalEnemyPresence && !totalPlayerPresence) {
        // Enemy is capturing
        if (base.faction !== 'ENEMY') {
          base.capturingFaction = 'ENEMY';
          if (base.faction === 'PLAYER') {
            // Decap player progress
            base.progress = Math.max(0, base.progress - (12 * dt) / 1000);
            if (base.progress === 0) {
              base.faction = 'NEUTRAL';
            }
          } else {
            // Capture neutral base
            base.progress = Math.min(100, base.progress + (12 * dt) / 1000);
            if (base.progress === 100) {
              base.faction = 'ENEMY';
              base.capturingFaction = null;
            }
          }
        } else if (base.progress < 100) {
          base.progress = Math.min(100, base.progress + (12 * dt) / 1000);
        }
      } else if (totalPlayerPresence && totalEnemyPresence) {
        // Contested - no progress change
        base.capturingFaction = null; // Stalled
        activeBase = base; // Mark as active so HUD highlights it as contested
      } else {
        // Nobody is inside, slowly decay progress if neutral/in-between
        base.capturingFaction = null;
        if (base.faction === 'NEUTRAL' && base.progress > 0) {
          base.progress = Math.max(0, base.progress - (4 * dt) / 1000);
        }
      }
    });

    // 2. Credits Income Generation (every 5 seconds)
    this.incomeTimer += dt;
    if (this.incomeTimer >= 5000) {
      this.incomeTimer = 0;
      // Count player-controlled bases
      const capturedCount = this.bases.filter(b => b.faction === 'PLAYER').length;
      if (capturedCount > 0) {
        // Each captured base yields 20 credits
        onCreditsEarned(capturedCount * 25);
      }
    }

    // 3. Spawning Friendly AI Defenders (every 15 seconds from player bases, cap defender counts)
    this.spawnDefenderTimer += dt;
    if (this.spawnDefenderTimer >= 15000) {
      this.spawnDefenderTimer = 0;
      this.bases.forEach(base => {
        if (base.faction === 'PLAYER') {
          // Spawn near base center with slight randomized offset
          const offsetX = (Math.random() - 0.5) * 60;
          const offsetY = (Math.random() - 0.5) * 60;
          onSpawnDefender(base.x + offsetX, base.y + offsetY);
        }
      });
    }

    return { activeBase };
  }

  // Draw Bases on the Canvas
  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    this.bases.forEach(base => {
      const screenX = base.x - cameraX;
      const screenY = base.y - cameraY;

      // Color scheme according to faction
      let ringColor = 'rgba(100, 116, 139, 0.2)'; // Neutral grey
      let centerColor = '#475569';
      let neonColor = '#64748b';

      if (base.faction === 'PLAYER') {
        ringColor = 'rgba(0, 242, 254, 0.12)';
        centerColor = '#0284c7';
        neonColor = '#00f2fe';
      } else if (base.faction === 'ENEMY') {
        ringColor = 'rgba(255, 0, 85, 0.12)';
        centerColor = '#be123c';
        neonColor = '#ff0055';
      }

      // Draw the large outer capture perimeter ring
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]); // Dashed outer boundary
      ctx.beginPath();
      ctx.arc(screenX, screenY, base.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dashed lines

      // Filled zone highlight
      ctx.fillStyle = ringColor;
      ctx.beginPath();
      ctx.arc(screenX, screenY, base.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw central base structure (square building representation)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(screenX - 25, screenY - 25, 50, 50);
      ctx.fillRect(screenX - 25, screenY - 25, 50, 50);

      // Inner flag core
      ctx.fillStyle = centerColor;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Progress bar around center core if capturing/decaying
      if (base.progress > 0 && base.progress < 100) {
        ctx.strokeStyle = base.capturingFaction === 'PLAYER' ? '#00f2fe' : '#ff0055';
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Circular progress arc
        const endAngle = -Math.PI / 2 + (Math.PI * 2 * base.progress) / 100;
        ctx.arc(screenX, screenY, 18, -Math.PI / 2, endAngle);
        ctx.stroke();
      }

      // Draw floating label (Name of outpost)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(base.name, screenX, screenY - 38);

      // Draw faction text indicators
      ctx.fillStyle = neonColor;
      ctx.font = '10px "Share Tech Mono", monospace';
      let statusText = 'SECURE';
      if (base.progress > 0 && base.progress < 100) {
        statusText = `CAPTURING ${Math.floor(base.progress)}%`;
      } else if (base.faction === 'NEUTRAL') {
        statusText = 'NEUTRAL';
      }
      ctx.fillText(statusText, screenX, screenY + 42);
    });
  }
}
export const basesManager = new BasesManager();
