import type { Weapon, WeaponType, PlayerStats } from './Types';
import type { GameMap } from './Map';
import { BOSS_NAMES } from './Types';
import { sound } from './Sound';
import { enemiesManager, Enemy } from './Enemies';
import { projectilesManager } from './Projectiles';

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

  // Expansion Upgrades & Skills variables
  healthLvl: number = 0;
  shieldLvl: number = 0;
  dashLvl: number = 0;

  ricochetLvl: number = 0;
  pierceLvl: number = 0;
  plasmaBurnLvl: number = 0;
  damageFlash: number = 0;
  dashTrails: Array<{ x: number; y: number; life: number }> = [];

  empCooldown: number = 0;
  airstrikeCooldown: number = 0;
  droneCooldown: number = 0;
  decoyCooldown: number = 0;

  empMaxCooldown: number = 12000;
  airstrikeMaxCooldown: number = 20000;
  droneMaxCooldown: number = 15000;
  decoyMaxCooldown: number = 18000;

  empCost: number = 120;
  airstrikeCost: number = 240;
  droneCost: number = 180;
  decoyCost: number = 150;

  repairDroneDuration: number = 0;
  screenShake: number = 0;

  queuedExplosions: Array<{
    x: number;
    y: number;
    delay: number;
    exploded: boolean;
    radius: number;
    damage: number;
  }> = [];

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

  godMode: boolean = false;

  triggerScreenShake(amount: number) {
    this.screenShake = Math.min(25, this.screenShake + amount);
  }

  // Damage handling
  takeDamage(amount: number) {
    if (this.isDead) return;
    if (this.godMode) return;
    
    // Trigger screen shake on damage hit
    this.triggerScreenShake(amount * 0.35);
    this.damageFlash = 250;

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

    // Active skills cooldowns tick
    if (this.empCooldown > 0) this.empCooldown = Math.max(0, this.empCooldown - dt);
    if (this.airstrikeCooldown > 0) this.airstrikeCooldown = Math.max(0, this.airstrikeCooldown - dt);
    if (this.droneCooldown > 0) this.droneCooldown = Math.max(0, this.droneCooldown - dt);
    if (this.decoyCooldown > 0) this.decoyCooldown = Math.max(0, this.decoyCooldown - dt);

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - (dt * 0.03));
    }

    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - dt);
    }

    // Repair drone healing ticks
    if (this.repairDroneDuration > 0) {
      this.repairDroneDuration = Math.max(0, this.repairDroneDuration - dt);
      this.health = Math.min(this.maxHealth, this.health + (12 * dt) / 1000); // 12 hp/sec
      if (Math.random() < 0.12) {
        projectilesManager.spawnSparks(this.x + (Math.random()-0.5)*32, this.y + (Math.random()-0.5)*32, '#39ff14', 2);
      }
    }

    // Process queued Airstrike explosions
    this.queuedExplosions.forEach(exp => {
      if (exp.exploded) return;
      exp.delay -= dt;
      if (exp.delay <= 0) {
        exp.exploded = true;
        sound.playExplosion();
        this.triggerScreenShake(8);
        projectilesManager.spawnShockwave(exp.x, exp.y, exp.radius, '#ff5500', 400);

        // Damage enemies in target radius
        enemiesManager.enemies.forEach(e => {
          if (!e.isFriendly && !e.isDead) {
            const dx = e.x - exp.x;
            const dy = e.y - exp.y;
            if (dx*dx + dy*dy < exp.radius * exp.radius) {
              e.takeDamage(exp.damage);
            }
          }
        });

        // Trigger visual spark bursts
        projectilesManager.spawnSparks(exp.x, exp.y, '#ffe600', 16);
        projectilesManager.spawnSparks(exp.x, exp.y, '#ff3300', 12);
      }
    });

    // Clean up fully exploded nodes
    this.queuedExplosions = this.queuedExplosions.filter(exp => !exp.exploded || exp.delay > -400);

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
      this.dashTrails.push({ x: this.x, y: this.y, life: 200 });
      
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

    this.dashTrails.forEach(t => t.life -= dt);
    this.dashTrails = this.dashTrails.filter(t => t.life > 0);
  }

  // Get formatted stats to pass to React HUD
  getStats(capturedCount: number, totalBases: number, campaignStage: number = 1, difficultyScale: number = 1.0): PlayerStats {
    const currentWep = this.weapons[this.currentWeaponType];
    const dashCooldPercent = this.dashCooldown > 0 ? this.dashCooldown / this.dashMaxCooldown : 0;
    
    const boss = enemiesManager.enemies.find(e => e.type === 'BOSS' && !e.isDead);

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
      isDead: this.isDead,

      skills: {
        empCooldown: this.empCooldown > 0 ? this.empCooldown / this.empMaxCooldown : 0,
        airstrikeCooldown: this.airstrikeCooldown > 0 ? this.airstrikeCooldown / this.airstrikeMaxCooldown : 0,
        droneCooldown: this.droneCooldown > 0 ? this.droneCooldown / this.droneMaxCooldown : 0,
        decoyCooldown: this.decoyCooldown > 0 ? this.decoyCooldown / this.decoyMaxCooldown : 0,
        empCost: this.empCost,
        airstrikeCost: this.airstrikeCost,
        droneCost: this.droneCost,
        decoyCost: this.decoyCost
      },
      upgrades: {
        healthLvl: this.healthLvl,
        shieldLvl: this.shieldLvl,
        dashLvl: this.dashLvl,
        healthCost: this.healthLvl < 4 ? 120 + this.healthLvl * 60 : 0,
        shieldCost: this.shieldLvl < 4 ? 100 + this.shieldLvl * 50 : 0,
        dashCost: this.dashLvl < 4 ? 150 + this.dashLvl * 75 : 0,
        ricochetLvl: this.ricochetLvl,
        pierceLvl: this.pierceLvl,
        plasmaBurnLvl: this.plasmaBurnLvl,
        ricochetCost: this.ricochetLvl < 2 ? 150 + this.ricochetLvl * 100 : 0,
        pierceCost: this.pierceLvl < 2 ? 180 + this.pierceLvl * 120 : 0,
        plasmaBurnCost: this.plasmaBurnLvl < 2 ? 200 + this.plasmaBurnLvl * 100 : 0
      },
      bossActive: !!boss,
      bossHp: boss ? Math.ceil(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      bossName: boss ? BOSS_NAMES[boss.bossVariant] : 'SECTOR OVERSEER',
      bossVariant: boss ? boss.bossVariant : 'FOREST',
      godMode: this.godMode,
      squadOrder: enemiesManager.squadOrder,
      activeDefendersCount: enemiesManager.enemies.filter(e => e.isFriendly && e.type === 'DEFENDER' && !e.isDead).length,
      campaignStage,
      difficultyScale
    };
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.isDead) return;

    // Draw Airstrike explosion rings on map
    this.queuedExplosions.forEach(exp => {
      if (exp.exploded && exp.delay > -350) {
        const screenExpX = exp.x - cameraX;
        const screenExpY = exp.y - cameraY;
        const age = -exp.delay; // 0 to 350ms
        const percent = Math.min(1, age / 350);

        ctx.strokeStyle = `rgba(255, 68, 0, ${1 - percent})`;
        ctx.lineWidth = 3 * (1 - percent);
        ctx.beginPath();
        ctx.arc(screenExpX, screenExpY, exp.radius * percent, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 150, 0, ${0.3 * (1 - percent)})`;
        ctx.beginPath();
        ctx.arc(screenExpX, screenExpY, exp.radius * percent * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Repair Drone hover bot
    if (this.repairDroneDuration > 0) {
      const time = Date.now() / 220;
      const droneX = this.x + Math.cos(time) * 34;
      const droneY = this.y + Math.sin(time) * 34;

      const screenDX = droneX - cameraX;
      const screenDY = droneY - cameraY;
      const screenPX = this.x - cameraX;
      const screenPY = this.y - cameraY;

      // Pulse green beam link
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.45)';
      ctx.lineWidth = 2 + Math.sin(Date.now() / 60) * 0.8;
      ctx.beginPath();
      ctx.moveTo(screenDX, screenDY);
      ctx.lineTo(screenPX, screenPY);
      ctx.stroke();

      // Drone frame
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenDX, screenDY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Drone engine core
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.arc(screenDX, screenDY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    // Draw fading thruster trails
    this.dashTrails.forEach(t => {
      ctx.fillStyle = `rgba(0, 242, 254, ${(t.life / 200) * 0.22})`;
      ctx.beginPath();
      ctx.arc(t.x - cameraX, t.y - cameraY, this.radius - 2, 0, Math.PI * 2);
      ctx.fill();
    });

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

  // Active Skill Activations
  triggerEMP(): boolean {
    if (this.isDead || this.empCooldown > 0 || this.credits < this.empCost) return false;
    this.credits -= this.empCost;
    this.empCooldown = this.empMaxCooldown;
    sound.playShieldRegen(); // synth a nice rising sweep charger

    projectilesManager.spawnShockwave(this.x, this.y, 240, '#00f2fe', 600);

    // Stun enemies in a 240px circle
    enemiesManager.enemies.forEach(e => {
      if (!e.isFriendly && !e.isDead) {
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        if (dx*dx + dy*dy < 240*240) {
          e.stunTimer = 4000; // 4 seconds stun lockout
          projectilesManager.spawnSparks(e.x, e.y, '#00f2fe', 12);
        }
      }
    });

    // Spawn EMP radial wave particles
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const vx = Math.cos(angle) * 5.5;
      const vy = Math.sin(angle) * 5.5;
      projectilesManager.spawnSparks(
        this.x + vx * 2,
        this.y + vy * 2,
        '#00f2fe',
        3
      );
    }

    return true;
  }

  triggerAirstrike(tx: number, ty: number): boolean {
    if (this.isDead || this.airstrikeCooldown > 0 || this.credits < this.airstrikeCost) return false;
    this.credits -= this.airstrikeCost;
    this.airstrikeCooldown = this.airstrikeMaxCooldown;

    // Queue 6 airstrike blasts near the target coords
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 110;
      this.queuedExplosions.push({
        x: tx + Math.cos(angle) * r,
        y: ty + Math.sin(angle) * r,
        delay: i * 220,
        exploded: false,
        radius: 80,
        damage: 90
      });
    }

    return true;
  }

  triggerRepairDrone(): boolean {
    if (this.isDead || this.droneCooldown > 0 || this.credits < this.droneCost) return false;
    this.credits -= this.droneCost;
    this.droneCooldown = this.droneMaxCooldown;
    this.repairDroneDuration = 10000; // active for 10 seconds
    sound.playPurchase();
    return true;
  }

  triggerDecoy(tx: number, ty: number): boolean {
    if (this.isDead || this.decoyCooldown > 0 || this.credits < this.decoyCost) return false;
    this.credits -= this.decoyCost;
    this.decoyCooldown = this.decoyMaxCooldown;
    sound.playDecoyDeploy();
    // Spawn friendly decoy at target coordinate
    enemiesManager.enemies.push(new Enemy(tx, ty, 'DECOY', true));
    return true;
  }

  buyUpgrade(type: 'HEALTH' | 'SHIELD' | 'DASH' | 'RICOCHET' | 'PIERCE' | 'PLASMA_BURN'): boolean {
    if (this.isDead) return false;

    if (type === 'HEALTH' && this.healthLvl < 4) {
      const cost = 120 + this.healthLvl * 60;
      if (this.credits >= cost) {
        this.credits -= cost;
        this.healthLvl++;
        this.maxHealth = 100 + this.healthLvl * 25;
        this.health = Math.min(this.maxHealth, this.health + 25);
        sound.playPurchase();
        return true;
      }
    } else if (type === 'SHIELD' && this.shieldLvl < 4) {
      const cost = 100 + this.shieldLvl * 50;
      if (this.credits >= cost) {
        this.credits -= cost;
        this.shieldLvl++;
        this.maxShield = 50 + this.shieldLvl * 25;
        this.shield = this.maxShield;
        sound.playPurchase();
        return true;
      }
    } else if (type === 'DASH' && this.dashLvl < 4) {
      const cost = 150 + this.dashLvl * 75;
      if (this.credits >= cost) {
        this.credits -= cost;
        this.dashLvl++;
        this.dashMaxCooldown = Math.max(650, 1500 - this.dashLvl * 220); // 1500 -> 1280 -> 1060 -> 840 -> 650
        sound.playPurchase();
        return true;
      }
    } else if (type === 'RICOCHET' && this.ricochetLvl < 2) {
      const cost = 150 + this.ricochetLvl * 100;
      if (this.credits >= cost) {
        this.credits -= cost;
        this.ricochetLvl++;
        sound.playPurchase();
        return true;
      }
    } else if (type === 'PIERCE' && this.pierceLvl < 2) {
      const cost = 180 + this.pierceLvl * 120;
      if (this.credits >= cost) {
        this.credits -= cost;
        this.pierceLvl++;
        sound.playPurchase();
        return true;
      }
    } else if (type === 'PLASMA_BURN' && this.plasmaBurnLvl < 2) {
      const cost = 200 + this.plasmaBurnLvl * 100;
      if (this.credits >= cost) {
        this.credits -= cost;
        this.plasmaBurnLvl++;
        sound.playPurchase();
        return true;
      }
    }

    return false;
  }
}
