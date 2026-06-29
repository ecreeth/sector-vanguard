import { GameMap } from './Map';
import { sound } from './Sound';

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
  bouncesLeft?: number;
  pierceLeft?: number;
  plasmaBurnLvl?: number;
  hitTargets?: any[];
  splashRadius?: number;
  isBeam?: boolean;
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

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export class ProjectilesManager {
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  shockwaves: Shockwave[] = [];
  floatingTexts: FloatingText[] = [];

  spawnBullet(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    isPlayer: boolean,
    color: string = '#00f2fe',
    radius: number = 4,
    bouncesLeft: number = 0,
    pierceLeft: number = 0,
    plasmaBurnLvl: number = 0
  ) {
    this.projectiles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      isPlayer,
      radius,
      color,
      life: 2000, // 2 seconds lifespan
      bouncesLeft,
      pierceLeft,
      plasmaBurnLvl,
      hitTargets: []
    });
  }

  // Spawn scatter shotgun pellets (5 pellets in a spread angle)
  spawnShotgun(
    x: number,
    y: number,
    angle: number,
    damage: number,
    isPlayer: boolean,
    bouncesLeft: number = 0,
    pierceLeft: number = 0,
    plasmaBurnLvl: number = 0
  ) {
    const pelletsCount = 5;
    const spreadAngle = 0.25;
    
    for (let i = 0; i < pelletsCount; i++) {
      const offset = (i - (pelletsCount - 1) / 2) * (spreadAngle / (pelletsCount - 1));
      const speed = 12 + Math.random() * 4;
      this.spawnBullet(x, y, angle + offset, speed, damage, isPlayer, '#ffe600', 3.5, bouncesLeft, pierceLeft, plasmaBurnLvl);
    }
  }

  spawnRocket(
    x: number,
    y: number,
    angle: number,
    damage: number,
    isPlayer: boolean,
    splashRadius: number = 70
  ) {
    this.projectiles.push({
      x,
      y,
      vx: Math.cos(angle) * 8,
      vy: Math.sin(angle) * 8,
      damage,
      isPlayer,
      radius: 6,
      color: '#ff5500',
      life: 2500,
      splashRadius,
      hitTargets: []
    });
  }

  spawnBeam(
    x: number,
    y: number,
    angle: number,
    damage: number,
    isPlayer: boolean,
    range: number = 600
  ) {
    const endX = x + Math.cos(angle) * range;
    const endY = y + Math.sin(angle) * range;
    const steps = 20;
    const stepX = (endX - x) / steps;
    const stepY = (endY - y) / steps;

    for (let s = 0; s < steps; s++) {
      this.projectiles.push({
        x: x + stepX * s,
        y: y + stepY * s,
        vx: Math.cos(angle) * 30,
        vy: Math.sin(angle) * 30,
        damage: Math.round(damage * (1 - s * 0.03)),
        isPlayer,
        radius: 3,
        color: '#c084fc',
        life: 150 + s * 5,
        pierceLeft: 10,
        hitTargets: []
      });
    }
  }

  spawnShockwave(x: number, y: number, maxRadius: number, color: string = '#00f2fe', duration: number = 400) {
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius,
      life: duration,
      maxLife: duration,
      color
    });
  }

  spawnText(x: number, y: number, text: string, color: string = '#ffd700') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 800,
      maxLife: 800,
      vy: -1.2
    });
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

  update(
    dt: number,
    map: GameMap,
    collisionTargets: { x: number; y: number; radius: number; takeDamage: (dmg: number) => void; isPlayer: boolean }[],
    bases?: any[]
  ) {
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

      // Check active power gates collision
      let hitGate = false;
      for (const g of map.powerGates) {
        if (g.active) {
          const dx = nextX - g.x;
          const dy = nextY - g.y;
          const distSq = dx*dx + dy*dy;
          const minDist = proj.radius + 24; // gate collision radius
          if (distSq < minDist * minDist) {
            g.hp -= proj.damage;
            this.spawnSparks(proj.x, proj.y, '#00f2fe', 6);
            hitGate = true;
            if (g.hp <= 0) {
              g.active = false;
              sound.playExplosion();
              this.spawnExplosionParticles(g.x, g.y, 35);
            }
            break;
          }
        }
      }

      if (hitGate) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check wall collision
      if (map.collides(nextX, nextY, proj.radius)) {
        if (proj.bouncesLeft && proj.bouncesLeft > 0) {
          proj.bouncesLeft--;
          
          const collidesX = map.collides(nextX, proj.y, proj.radius);
          const collidesY = map.collides(proj.x, nextY, proj.radius);
          if (collidesX) {
            proj.vx = -proj.vx;
          }
          if (collidesY) {
            proj.vy = -proj.vy;
          }
          if (!collidesX && !collidesY) {
            proj.vx = -proj.vx;
            proj.vy = -proj.vy;
          }
          this.spawnSparks(proj.x, proj.y, proj.color, 4);
          proj.x += proj.vx * 0.5;
          proj.y += proj.vy * 0.5;
          continue;
        } else {
          this.spawnSparks(proj.x, proj.y, proj.color, 6);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Check shield absorption for enemy bullets
      if (!proj.isPlayer && bases) {
        let hitShield = false;
        for (const base of bases) {
          if (base.faction === 'PLAYER' && base.defenseType === 'SHIELD' && (!base.shieldOfflineTimer || base.shieldOfflineTimer <= 0)) {
            const dx = nextX - base.x;
            const dy = nextY - base.y;
            const distSq = dx*dx + dy*dy;
            const shieldRadius = 80;
            if (distSq < shieldRadius * shieldRadius) {
              base.shieldHp = Math.max(0, (base.shieldHp ?? 200) - proj.damage);
              base.shieldRechargeTimer = 4000; // 4 seconds delay
              this.spawnSparks(proj.x, proj.y, '#00f2fe', 8);
              this.spawnText(proj.x, proj.y - 12, 'ABSORBED', '#00f2fe');
              hitShield = true;
              sound.playHit();
              break;
            }
          }
        }
        if (hitShield) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      proj.x = nextX;
      proj.y = nextY;

      // Check target collision (Player vs Enemies)
      let hit = false;
      for (const target of collisionTargets) {
        // If projectile is player-owned, only hit enemies. If enemy-owned, only hit player.
        if (proj.isPlayer !== target.isPlayer) {
          // If player projectile hitting enemy, check if enemy is visible to the player in fog of war
          if (proj.isPlayer && !target.isPlayer) {
            const tx = Math.floor(target.x / map.tileSize);
            const ty = Math.floor(target.y / map.tileSize);
            const isVisible = map.inBounds(tx, ty) && map.visibility[ty][tx] === 2;
            if (!isVisible) {
              continue; // Pass through hidden enemies
            }
          }

          const dx = proj.x - target.x;
          const dy = proj.y - target.y;
          const distSq = dx*dx + dy*dy;
          const minDist = proj.radius + target.radius;

          if (distSq < minDist * minDist) {
            // Pierce check: ignore if already hit
            if (proj.hitTargets && proj.hitTargets.includes(target)) {
              continue;
            }
            proj.hitTargets?.push(target);

            target.takeDamage(proj.damage);
            this.spawnSparks(proj.x, proj.y, proj.isPlayer ? '#ffe600' : '#ff0055', 8);

            // Splash damage for rockets
            if (proj.splashRadius && proj.splashRadius > 0) {
              this.spawnShockwave(proj.x, proj.y, proj.splashRadius, '#ff5500', 400);
              this.spawnExplosionParticles(proj.x, proj.y, proj.splashRadius * 0.5);
              sound.playExplosion();
              for (const splashTarget of collisionTargets) {
                if (splashTarget === target) continue;
                if (proj.isPlayer === splashTarget.isPlayer) continue;
                const sdx = proj.x - splashTarget.x;
                const sdy = proj.y - splashTarget.y;
                const sDistSq = sdx * sdx + sdy * sdy;
                if (sDistSq < proj.splashRadius * proj.splashRadius) {
                  const falloff = 1 - Math.sqrt(sDistSq) / proj.splashRadius;
                  const splashDmg = Math.round(proj.damage * falloff * 0.6);
                  if (splashDmg > 0) {
                    splashTarget.takeDamage(splashDmg);
                    this.spawnText(splashTarget.x, splashTarget.y - 12, `-${splashDmg}`, '#ff5500');
                  }
                }
              }
            }

            // Floating text display
            this.spawnText(target.x, target.y - 12, `-${proj.damage}`, proj.isPlayer ? '#ffe600' : '#ff3355');

            // Apply plasma burn DoT status on enemies
            if (proj.isPlayer && proj.plasmaBurnLvl && proj.plasmaBurnLvl > 0) {
              if ('applyPlasmaBurn' in target) {
                (target as any).applyPlasmaBurn(proj.plasmaBurnLvl);
              }
            }

            if (proj.pierceLeft && proj.pierceLeft > 0) {
              proj.pierceLeft--;
            } else {
              hit = true;
              break;
            }
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

    // 3. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      const progress = 1 - (sw.life / sw.maxLife);
      sw.radius = sw.maxRadius * progress;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 4. Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * (dt / 16.66);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    // Draw shockwaves
    this.shockwaves.forEach(sw => {
      const alpha = sw.life / sw.maxLife;
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = alpha * 0.45;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sw.x - cameraX, sw.y - cameraY, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner faint ring
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = alpha * 0.15;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sw.x - cameraX, sw.y - cameraY, sw.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

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

    // Draw floating texts
    this.floatingTexts.forEach(ft => {
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x - cameraX, ft.y - cameraY);
      ctx.restore();
    });
  }
}
export const projectilesManager = new ProjectilesManager();
