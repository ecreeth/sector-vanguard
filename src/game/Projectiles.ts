import { GameMap } from './Map';

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isPlayer: boolean; // true = fired by player, false = fired by enemies
  radius: number;
  color: string;
  life: number; // time to live in ms
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // current life in ms
  maxLife: number; // max life in ms
}

export class ProjectilesManager {
  projectiles: Projectile[] = [];
  particles: Particle[] = [];

  spawnBullet(x: number, y: number, angle: number, speed: number, damage: number, isPlayer: boolean, color: string = '#00f2fe', radius: number = 4) {
    this.projectiles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      isPlayer,
      radius,
      color,
      life: 2000 // 2 seconds lifespan
    });
  }

  // Spawn scatter shotgun pellets (5 pellets in a spread angle)
  spawnShotgun(x: number, y: number, angle: number, damage: number, isPlayer: boolean) {
    const pelletsCount = 5;
    const spreadAngle = 0.25; // spread range in radians (~15 degrees)
    
    for (let i = 0; i < pelletsCount; i++) {
      // Linear interpolation of spread angles
      const offset = (i - (pelletsCount - 1) / 2) * (spreadAngle / (pelletsCount - 1));
      const speed = 12 + Math.random() * 4; // slight speed variation
      this.spawnBullet(x, y, angle + offset, speed, damage, isPlayer, '#ffe600', 3.5);
    }
  }

  // Spawn particle explosions
  spawnSparks(x: number, y: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const maxLife = 200 + Math.random() * 300; // 0.2 - 0.5 seconds
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        life: maxLife,
        maxLife
      });
    }
  }

  // Area-of-effect explosion particles
  spawnExplosionParticles(x: number, y: number, radius: number = 40) {
    // Large blast circles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.7;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const vx = Math.cos(angle) * (0.5 + Math.random() * 1.5);
      const vy = Math.sin(angle) * (0.5 + Math.random() * 1.5);
      const maxLife = 300 + Math.random() * 400;

      const colors = ['#ff0055', '#ff5500', '#ffe600', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: px,
        y: py,
        vx,
        vy,
        color,
        size: 4 + Math.random() * 8,
        life: maxLife,
        maxLife
      });
    }
  }

  update(dt: number, map: GameMap, collisionTargets: { x: number, y: number, radius: number, takeDamage: (dmg: number) => void, isPlayer: boolean }[]) {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.life -= dt;

      // Move projectile
      const nextX = proj.x + proj.vx * (dt / 16.66);
      const nextY = proj.y + proj.vy * (dt / 16.66);

      // Check explosive barrel collision
      let hitBarrel = false;
      for (const b of map.barrels) {
        if (!b.isDead) {
          const dx = nextX - b.x;
          const dy = nextY - b.y;
          const distSq = dx*dx + dy*dy;
          const minDist = proj.radius + 14;
          if (distSq < minDist * minDist) {
            b.hp -= proj.damage;
            this.spawnSparks(proj.x, proj.y, '#ef4444', 6);
            hitBarrel = true;
            if (b.hp <= 0) {
              b.isDead = true;
              const pt = collisionTargets.find(t => t.isPlayer);
              const playerRef = pt ? { x: pt.x, y: pt.y, takeDamage: pt.takeDamage, isDead: false } : undefined;
              map.detonateBarrel(b.x, b.y, playerRef);
            }
            break;
          }
        }
      }

      if (hitBarrel) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check wall collision
      if (map.collides(nextX, nextY, proj.radius)) {
        this.spawnSparks(proj.x, proj.y, proj.color, 6);
        this.projectiles.splice(i, 1);
        continue;
      }

      proj.x = nextX;
      proj.y = nextY;

      // Check target collision (Player vs Enemies)
      let hit = false;
      for (const target of collisionTargets) {
        // If projectile is player-owned, only hit enemies. If enemy-owned, only hit player.
        if (proj.isPlayer !== target.isPlayer) {
          const dx = proj.x - target.x;
          const dy = proj.y - target.y;
          const distSq = dx*dx + dy*dy;
          const minDist = proj.radius + target.radius;

          if (distSq < minDist * minDist) {
            target.takeDamage(proj.damage);
            this.spawnSparks(proj.x, proj.y, proj.isPlayer ? '#ffe600' : '#ff0055', 8);
            hit = true;
            break;
          }
        }
      }

      if (hit || proj.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life -= dt;
      
      part.x += part.vx * (dt / 16.66);
      part.y += part.vy * (dt / 16.66);

      if (part.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    // Draw particles
    this.particles.forEach(part => {
      const alpha = part.life / part.maxLife;
      ctx.fillStyle = part.color;
      
      // Save current opacity
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(part.x - cameraX, part.y - cameraY, part.size, 0, Math.PI * 2);
      ctx.fill();
    });
    // Reset globalAlpha
    ctx.globalAlpha = 1.0;

    // Draw projectiles
    this.projectiles.forEach(proj => {
      const screenX = proj.x - cameraX;
      const screenY = proj.y - cameraY;

      // Draw light glow
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 8;
      
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow blur
      ctx.shadowBlur = 0;
    });
  }
}
export const projectilesManager = new ProjectilesManager();
