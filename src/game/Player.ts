import type { Weapon, WeaponType, PlayerStats } from './Types';
import type { GameMap } from './Map';
import { sound } from './Sound';

export class Player {
  x: number;
  y: number;
  radius: number = 18;
  angle: number = 0; // aiming direction in radians

  // Health and Shield stats
  health: number = 100;
  maxHealth: number = 100;
  shield: number = 50;
  maxShield: number = 50;
  shieldRegenTimer: number = 0;

  // Economy & Weapons
  credits: number = 100;
  currentWeaponType: WeaponType = 'PISTOL';
  weapons: Record<WeaponType, Weapon> = {
    PISTOL: {
      type: 'PISTOL',
      name: 'Laser Pistol',
      damage: 12,
      fireRate: 250,
      ammo: Infinity,
      maxAmmo: Infinity,
      unlocked: true,
      cost: 0
    },
    SHOTGUN: {
      type: 'SHOTGUN',
      name: 'Scatter Shotgun',
      damage: 10, // per pellet (fires 5 pellets)
      fireRate: 650,
      ammo: 16,
      maxAmmo: 32,
      unlocked: false,
      cost: 150
    },
    PLASMA_RIFLE: {
      type: 'PLASMA_RIFLE',
      name: 'Plasma Repeater',
      damage: 18,
      fireRate: 110,
      ammo: 60,
      maxAmmo: 120,
      unlocked: false,
      cost: 300
    }
  };

  // Cooldowns / timers (in milliseconds)
  lastShotTime: number = 0;
  
  // Dash mechanics
  dashCooldown: number = 0; // ms remaining
  dashDuration: number = 0; // ms remaining active
  dashMaxCooldown: number = 1500; // 1.5 seconds
  dashMaxDuration: number = 150; // 150ms dash burst
  dashSpeed: number = 16;
  dashDirX: number = 0;
  dashDirY: number = 0;

  isDead: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  // Set aim angle based on cursor position relative to screen camera
  updateAimAngle(mx: number, my: number, cameraX: number, cameraY: number) {
    if (this.isDead) return;
    const playerScreenX = this.x - cameraX;
    const playerScreenY = this.y - cameraY;
    this.angle = Math.atan2(my - playerScreenY, mx - playerScreenX);
  }

  // Damage handling
  takeDamage(amount: number) {
    if (this.isDead) return;
    
    // Reset shield regeneration delay
    this.shieldRegenTimer = 4000; // 4 seconds delay before regen starts

    // Apply damage to shields first
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        amount = 0;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
    }

    if (amount > 0) {
      this.health = Math.max(0, this.health - amount);
      sound.playHit();
      if (this.health <= 0) {
        this.isDead = true;
        sound.playExplosion();
      }
    }
  }

  // Handle active dash request
  triggerDash(moveX: number, moveY: number) {
    if (this.isDead || this.dashCooldown > 0 || this.dashDuration > 0) return;
    
    // Determine dash direction (use keyboard inputs, default to current aiming direction if not moving)
    if (moveX === 0 && moveY === 0) {
      this.dashDirX = Math.cos(this.angle);
      this.dashDirY = Math.sin(this.angle);
    } else {
      const length = Math.sqrt(moveX * moveX + moveY * moveY);
      this.dashDirX = moveX / length;
      this.dashDirY = moveY / length;
    }

    this.dashDuration = this.dashMaxDuration;
    this.dashCooldown = this.dashMaxCooldown;
    sound.playDash();
  }

  // Cycle through unlocked weapons
  cycleWeapon() {
    if (this.isDead) return;
    const types: WeaponType[] = ['PISTOL', 'SHOTGUN', 'PLASMA_RIFLE'];
    let idx = types.indexOf(this.currentWeaponType);
    
    // Find next unlocked weapon
    for (let i = 1; i <= 3; i++) {
      const nextIdx = (idx + i) % 3;
      if (this.weapons[types[nextIdx]].unlocked) {
        this.currentWeaponType = types[nextIdx];
        sound.playPurchase(); // play weapon equip sound
        break;
      }
    }
  }

  buyWeapon(type: WeaponType): boolean {
    const weapon = this.weapons[type];
    if (weapon.unlocked) {
      // If already unlocked, buy ammo
      const ammoCost = Math.floor(weapon.cost * 0.15);
      if (this.credits >= ammoCost && weapon.ammo < weapon.maxAmmo) {
        this.credits -= ammoCost;
        weapon.ammo = Math.min(weapon.maxAmmo, weapon.ammo + Math.floor(weapon.maxAmmo * 0.5));
        sound.playPurchase();
        return true;
      }
      return false;
    }

    if (this.credits >= weapon.cost) {
      this.credits -= weapon.cost;
      weapon.unlocked = true;
      this.currentWeaponType = type;
      sound.playPurchase();
      return true;
    }
    return false;
  }

  update(dt: number, moveX: number, moveY: number, map: GameMap) {
    if (this.isDead) return;

    // 1. Cooldown timers
    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    }

    // 2. Shield Regeneration
    if (this.shieldRegenTimer > 0) {
      this.shieldRegenTimer = Math.max(0, this.shieldRegenTimer - dt);
    } else if (this.shield < this.maxShield) {
      // Regenerate 10 shield per second
      this.shield = Math.min(this.maxShield, this.shield + (10 * dt) / 1000);
    }

    // 3. Movement execution
    if (this.dashDuration > 0) {
      // Dashing - move at high speed, ignore slow terrains, but still collide with walls
      this.dashDuration = Math.max(0, this.dashDuration - dt);
      
      const stepX = this.dashDirX * this.dashSpeed;
      const stepY = this.dashDirY * this.dashSpeed;

      // Move with slide collision checking
      if (!map.collides(this.x + stepX, this.y, this.radius)) {
        this.x += stepX;
      }
      if (!map.collides(this.x, this.y + stepY, this.radius)) {
        this.y += stepY;
      }
    } else {
      // Standard WASD movement
      if (moveX !== 0 || moveY !== 0) {
        // Normalize movement vector
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        const normX = moveX / length;
        const normY = moveY / length;

        // Apply terrain movement speed factors
        const terrainFactor = map.getMovementSpeedFactor(this.x, this.y);
        const baseSpeed = 4.2;
        const speed = baseSpeed * terrainFactor;

        const stepX = normX * speed;
        const stepY = normY * speed;

        // Slide collision checking (allows sliding against walls easily)
        if (!map.collides(this.x + stepX, this.y, this.radius)) {
          this.x += stepX;
        }
        if (!map.collides(this.x, this.y + stepY, this.radius)) {
          this.y += stepY;
        }
      }
    }
  }

  // Get formatted stats to pass to React HUD
  getStats(capturedCount: number, totalBases: number): PlayerStats {
    const currentWep = this.weapons[this.currentWeaponType];
    const dashCooldPercent = this.dashCooldown > 0 ? this.dashCooldown / this.dashMaxCooldown : 0;
    
    return {
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      shield: Math.ceil(this.shield),
      maxShield: this.maxShield,
      dashCooldown: dashCooldPercent,
      credits: this.credits,
      currentWeapon: this.currentWeaponType,
      ammo: currentWep.ammo,
      maxAmmo: currentWep.maxAmmo,
      weapons: this.weapons,
      capturedBasesCount: capturedCount,
      totalBasesCount: totalBases,
      isDead: this.isDead
    };
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.isDead) return;

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    // Draw dash trail if dashing
    if (this.dashDuration > 0) {
      ctx.fillStyle = 'rgba(0, 242, 254, 0.25)';
      ctx.beginPath();
      ctx.arc(screenX - this.dashDirX * 15, screenY - this.dashDirY * 15, this.radius - 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer Glow / Shield Ring
    if (this.shield > 0) {
      ctx.strokeStyle = `rgba(0, 242, 254, ${0.2 + (this.shield / this.maxShield) * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw character body
    ctx.fillStyle = '#0f172a'; // dark armor
    ctx.strokeStyle = '#00f2fe'; // glowing cyan highlights
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw visor facing the aiming direction
    const visorX = screenX + Math.cos(this.angle) * (this.radius - 6);
    const visorY = screenY + Math.sin(this.angle) * (this.radius - 6);
    
    ctx.fillStyle = '#ff0055'; // bright glowing visor
    ctx.beginPath();
    ctx.arc(visorX, visorY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Subtle gun barrel representation
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(screenX + Math.cos(this.angle) * 10, screenY + Math.sin(this.angle) * 10);
    ctx.lineTo(screenX + Math.cos(this.angle) * (this.radius + 6), screenY + Math.sin(this.angle) * (this.radius + 6));
    ctx.stroke();
  }
}
