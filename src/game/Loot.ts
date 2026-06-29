import { sound } from './Sound';
import { projectilesManager } from './Projectiles';

export type LootType = 'CREDITS' | 'AMMO' | 'WEAPON_TOKEN' | 'UPGRADE_TOKEN' | 'MEGA_CREDITS';

export interface LootDrop {
  x: number;
  y: number;
  type: LootType;
  amount: number;
  radius: number;
  life: number;
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
      ? Math.floor(15 + Math.random() * 16)
      : 1;

    this.drops.push({
      x,
      y,
      type,
      amount,
      radius: 12,
      life: 10000,
      maxLife: 10000
    });
  }

  spawnBossDrop(x: number, y: number, type: LootType) {
    const amounts: Record<string, number> = {
      MEGA_CREDITS: 500,
      WEAPON_TOKEN: 1,
      UPGRADE_TOKEN: 1
    };

    this.drops.push({
      x,
      y,
      type,
      amount: amounts[type] || 1,
      radius: type === 'MEGA_CREDITS' ? 16 : 14,
      life: 30000,
      maxLife: 30000
    });
  }

  spawnBossLoot(x: number, y: number) {
    // Always drop mega credits
    this.spawnBossDrop(x, y, 'MEGA_CREDITS');

    // Drop a weapon token (unlocks a random locked weapon)
    const offsetAngle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 20;
    this.spawnBossDrop(
      x + Math.cos(offsetAngle) * dist,
      y + Math.sin(offsetAngle) * dist,
      'WEAPON_TOKEN'
    );

    // Drop an upgrade token
    const offsetAngle2 = offsetAngle + Math.PI * 0.7 + Math.random() * 0.6;
    this.spawnBossDrop(
      x + Math.cos(offsetAngle2) * dist,
      y + Math.sin(offsetAngle2) * dist,
      'UPGRADE_TOKEN'
    );
  }

  update(dt: number, player: { x: number; y: number; radius: number; credits: number; currentWeaponType: string; weapons: any; triggerScreenShake?: (amt: number) => void }) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.life -= dt;

      if (drop.life <= 0) {
        this.drops.splice(i, 1);
        continue;
      }

      const dx = player.x - drop.x;
      const dy = player.y - drop.y;
      const distSq = dx*dx + dy*dy;
      const dist = Math.sqrt(distSq);

      // Magnet attraction
      if (dist < 70) {
        const angle = Math.atan2(dy, dx);
        const pullSpeed = 4.0;
        drop.x += Math.cos(angle) * pullSpeed * (dt / 16.66);
        drop.y += Math.sin(angle) * pullSpeed * (dt / 16.66);
      }

      const minDist = player.radius + drop.radius;

      if (distSq < minDist * minDist) {
        sound.playPickup();

        if (drop.type === 'CREDITS') {
          player.credits += drop.amount;
          projectilesManager.spawnSparks(drop.x, drop.y, '#ffd700', 8);
        } else if (drop.type === 'AMMO') {
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
          if (player.weapons['ROCKET_LAUNCHER']?.unlocked) {
            const wep = player.weapons['ROCKET_LAUNCHER'];
            wep.ammo = Math.min(wep.maxAmmo, wep.ammo + 3);
            added = true;
          }
          if (player.weapons['ARC_SNIPER']?.unlocked) {
            const wep = player.weapons['ARC_SNIPER'];
            wep.ammo = Math.min(wep.maxAmmo, wep.ammo + 5);
            added = true;
          }
          if (!added) {
            player.credits += 15;
            projectilesManager.spawnSparks(drop.x, drop.y, '#ffd700', 8);
          } else {
            projectilesManager.spawnSparks(drop.x, drop.y, '#00f2fe', 8);
          }
        } else if (drop.type === 'MEGA_CREDITS') {
          player.credits += drop.amount;
          projectilesManager.spawnSparks(drop.x, drop.y, '#ffd700', 16);
          projectilesManager.spawnShockwave(drop.x, drop.y, 50, '#ffd700', 500);
          projectilesManager.spawnText(drop.x, drop.y - 20, `+${drop.amount} CR`, '#ffd700');
        } else if (drop.type === 'WEAPON_TOKEN') {
          // Unlock first locked weapon, or give credits if all unlocked
          const weaponTypes = ['SHOTGUN', 'PLASMA_RIFLE', 'ROCKET_LAUNCHER', 'ARC_SNIPER'] as const;
          const locked = weaponTypes.find(w => !player.weapons[w]?.unlocked);
          if (locked) {
            player.weapons[locked].unlocked = true;
            projectilesManager.spawnText(drop.x, drop.y - 20, `${player.weapons[locked].name} UNLOCKED`, '#f59e0b');
            projectilesManager.spawnSparks(drop.x, drop.y, '#f59e0b', 16);
            projectilesManager.spawnShockwave(drop.x, drop.y, 60, '#f59e0b', 600);
          } else {
            player.credits += 200;
            projectilesManager.spawnText(drop.x, drop.y - 20, '+200 CR', '#ffd700');
            projectilesManager.spawnSparks(drop.x, drop.y, '#ffd700', 12);
          }
        } else if (drop.type === 'UPGRADE_TOKEN') {
          // Give a free upgrade to a random upgradeable stat
          const upgrades = ['HEALTH', 'SHIELD', 'DASH', 'RICOCHET', 'PIERCE', 'PLASMA_BURN'] as const;
          const upgrade = upgrades[Math.floor(Math.random() * upgrades.length)];
          projectilesManager.spawnText(drop.x, drop.y - 20, `+1 ${upgrade}`, '#a78bfa');
          projectilesManager.spawnSparks(drop.x, drop.y, '#a78bfa', 16);
          projectilesManager.spawnShockwave(drop.x, drop.y, 60, '#a78bfa', 600);
          // Signal to Player via a pending upgrade flag
          (player as any).pendingUpgradeToken = upgrade;
        }

        this.drops.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    this.drops.forEach(drop => {
      const screenX = drop.x - cameraX;
      const screenY = drop.y - cameraY;

      const time = Date.now() / 200;
      const scale = 1.0 + Math.sin(time) * 0.15;
      const r = drop.radius * scale;

      ctx.save();
      ctx.globalAlpha = Math.min(1.0, drop.life / 2000);

      // Color and glow per type
      let color: string;
      let glowColor: string;
      switch (drop.type) {
        case 'CREDITS':
          color = '#ffd700';
          glowColor = '#ffd700';
          break;
        case 'AMMO':
          color = '#00f2fe';
          glowColor = '#00f2fe';
          break;
        case 'MEGA_CREDITS':
          color = '#fbbf24';
          glowColor = '#fbbf24';
          break;
        case 'WEAPON_TOKEN':
          color = '#f59e0b';
          glowColor = '#f59e0b';
          break;
        case 'UPGRADE_TOKEN':
          color = '#a78bfa';
          glowColor = '#a78bfa';
          break;
        default:
          color = '#ffffff';
          glowColor = '#ffffff';
      }

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = drop.type === 'MEGA_CREDITS' ? 12 : (drop.type === 'WEAPON_TOKEN' || drop.type === 'UPGRADE_TOKEN') ? 10 : 6;
      ctx.fillStyle = color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      if (drop.type === 'CREDITS' || drop.type === 'MEGA_CREDITS') {
        // Diamond shape
        ctx.moveTo(screenX, screenY - r);
        ctx.lineTo(screenX + r, screenY);
        ctx.lineTo(screenX, screenY + r);
        ctx.lineTo(screenX - r, screenY);
        ctx.closePath();
      } else if (drop.type === 'WEAPON_TOKEN') {
        // Star / cross shape
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const outerX = screenX + Math.cos(angle) * r;
          const outerY = screenY + Math.sin(angle) * r;
          const innerAngle = angle + Math.PI / 5;
          const innerX = screenX + Math.cos(innerAngle) * (r * 0.5);
          const innerY = screenY + Math.sin(innerAngle) * (r * 0.5);
          if (i === 0) ctx.moveTo(outerX, outerY);
          else ctx.lineTo(outerX, outerY);
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
      } else if (drop.type === 'UPGRADE_TOKEN') {
        // Hexagon shape
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = screenX + Math.cos(angle) * r;
          const py = screenY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        // Ammo: round rectangle
        ctx.rect(screenX - r, screenY - r/2, r*2, r);
      }
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  }
}

export const lootManager = new LootManager();
