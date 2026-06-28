import { sound } from './Sound';
import { projectilesManager } from './Projectiles';

export type LootType = 'CREDITS' | 'AMMO';

export interface LootDrop {
  x: number;
  y: number;
  type: LootType;
  amount: number;
  radius: number;
  life: number; // time to live in milliseconds
  maxLife: number;
}

export class LootManager {
  drops: LootDrop[] = [];

  reset() {
    this.drops = [];
  }

  spawnDrop(x: number, y: number, forceType?: LootType) {
    const r = Math.random();
    const type: LootType = forceType || (r < 0.65 ? 'CREDITS' : 'AMMO');
    const amount = type === 'CREDITS' 
      ? Math.floor(15 + Math.random() * 16) // 15 to 30 credits
      : 1; // Ammo multiplier / trigger flag

    this.drops.push({
      x,
      y,
      type,
      amount,
      radius: 12,
      life: 10000, // 10 seconds lifespan
      maxLife: 10000
    });
  }

  update(dt: number, player: { x: number; y: number; radius: number; credits: number; currentWeaponType: string; weapons: any; triggerScreenShake?: (amt: number) => void }) {
    // Update lifespans and collect drops
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.life -= dt;

      if (drop.life <= 0) {
        this.drops.splice(i, 1);
        continue;
      }

      // Check player collision
      const dx = player.x - drop.x;
      const dy = player.y - drop.y;
      const distSq = dx*dx + dy*dy;
      const dist = Math.sqrt(distSq);

      // Magnet attraction pulls drop towards player when inside 70px vacuum radius
      if (dist < 70) {
        const angle = Math.atan2(dy, dx);
        const pullSpeed = 4.0;
        drop.x += Math.cos(angle) * pullSpeed * (dt / 16.66);
        drop.y += Math.sin(angle) * pullSpeed * (dt / 16.66);
      }

      const minDist = player.radius + drop.radius;

      if (distSq < minDist * minDist) {
        // Collect!
        sound.playPickup();
        if (drop.type === 'CREDITS') {
          player.credits += drop.amount;
          // Spawn golden sparks
          projectilesManager.spawnSparks(drop.x, drop.y, '#ffd700', 8);
        } else if (drop.type === 'AMMO') {
          // Add ammo to shotgun and plasma rifle if unlocked
          let added = false;
          if (player.weapons['SHOTGUN']?.unlocked) {
            const wep = player.weapons['SHOTGUN'];
            wep.ammo = Math.min(wep.maxAmmo, wep.ammo + 5);
            added = true;
          }
          if (player.weapons['PLASMA_RIFLE']?.unlocked) {
            const wep = player.weapons['PLASMA_RIFLE'];
            wep.ammo = Math.min(wep.maxAmmo, wep.ammo + 15);
            added = true;
          }
          // If no weapons unlocked, just give some credits instead
          if (!added) {
            player.credits += 15;
            projectilesManager.spawnSparks(drop.x, drop.y, '#ffd700', 8);
          } else {
            // Spawn neon-blue sparks for ammo
            projectilesManager.spawnSparks(drop.x, drop.y, '#00f2fe', 8);
          }
        }

        this.drops.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    this.drops.forEach(drop => {
      const screenX = drop.x - cameraX;
      const screenY = drop.y - cameraY;

      // Draw bouncing/pulsating scale
      const time = Date.now() / 200;
      const scale = 1.0 + Math.sin(time) * 0.15;
      const r = drop.radius * scale;

      ctx.save();
      ctx.globalAlpha = Math.min(1.0, drop.life / 2000); // fade out at end

      // Glow shadow
      ctx.shadowColor = drop.type === 'CREDITS' ? '#ffd700' : '#00f2fe';
      ctx.shadowBlur = 6;

      // Draw drop body
      ctx.fillStyle = drop.type === 'CREDITS' ? '#ffd700' : '#00f2fe';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      if (drop.type === 'CREDITS') {
        // Draw diamond shape for credit chip
        ctx.moveTo(screenX, screenY - r);
        ctx.lineTo(screenX + r, screenY);
        ctx.lineTo(screenX, screenY + r);
        ctx.lineTo(screenX - r, screenY);
        ctx.closePath();
      } else {
        // Draw round rectangle shape for ammo clip
        ctx.rect(screenX - r, screenY - r/2, r*2, r);
      }
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  }
}

export const lootManager = new LootManager();
