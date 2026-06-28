import type { GameMap } from './Map';
import { projectilesManager } from './Projectiles';
import { sound } from './Sound';
import { basesManager } from './Bases';
import { lootManager } from './Loot';

export type EnemyType = 'DRONE' | 'TURRET' | 'MECH' | 'DEFENDER' | 'BOSS' | 'SUICIDE' | 'SNIPER' | 'DECOY' | 'SHIELD_MECH' | 'PORTAL';

export class Enemy {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  radius: number;
  hp: number;
  maxHp: number;
  type: EnemyType;
  isFriendly: boolean; // True = fights for the player, False = fights against player
  isGuard: boolean = false;
  
  speed: number;
  shootCooldown: number = 0;
  shootDelay: number;
  damage: number;
  visionRange: number;

  // Patrol and AI States
  patrolX: number;
  patrolY: number;
  patrolAngle: number = 0;
  patrolRadius: number = 100;
  targetUnit: { x: number; y: number; takeDamage: (dmg: number) => void; radius: number; isDead: boolean } | null = null;

  isDead: boolean = false;

  // Stun states and Boss triggers
  stunTimer: number = 0;
  bossSpawnsDone: Record<number, boolean> = { 600: false, 400: false, 200: false };

  // New expansion states
  life: number = 0; // lifespan for temporary entities (Decoy)
  warningLaserActive: boolean = false; // for sniper telegraphing
  detonated: boolean = false; // for suicide drone explosion safety check

  portalSpawnTimer: number = 0;
  plasmaBurnLvl: number = 0;
  plasmaBurnTicks: number = 0;
  plasmaBurnTimer: number = 0;

  applyPlasmaBurn(level: number) {
    if (this.isDead) return;
    this.plasmaBurnLvl = Math.max(this.plasmaBurnLvl, level);
    this.plasmaBurnTicks = 6; // ticks 6 times
    this.plasmaBurnTimer = 500; // every 500ms
  }

  constructor(x: number, y: number, type: EnemyType, isFriendly: boolean, isGuard: boolean = false) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.isFriendly = isFriendly;
    this.isGuard = isGuard;
    
    // Set properties based on unit type
    this.patrolX = x;
    this.patrolY = y;

    switch (type) {
      case 'BOSS':
        this.radius = 35;
        this.hp = 800;
        this.maxHp = 800;
        this.speed = 1.2;
        this.shootDelay = 1800; // rings of fire
        this.damage = 10;
        this.visionRange = 550;
        break;
      case 'DRONE':
        this.radius = 15;
        this.hp = 35;
        this.maxHp = 35;
        this.speed = 2.2;
        this.shootDelay = 1400;
        this.damage = 8;
        this.visionRange = 300;
        break;
      case 'TURRET':
        this.radius = 20;
        this.hp = 80;
        this.maxHp = 80;
        this.speed = 0; // stationary
        this.shootDelay = 900; // balanced from 350ms rapid fire
        this.damage = 7;
        this.visionRange = 400;
        break;
      case 'MECH':
        this.radius = 24;
        this.hp = 150;
        this.maxHp = 150;
        this.speed = 1.0; // very slow
        this.shootDelay = 1800; // slow rockets
        this.damage = 25;
        this.visionRange = 450;
        break;
      case 'DEFENDER':
        this.radius = 16;
        this.hp = 50;
        this.maxHp = 50;
        this.speed = 1.6;
        this.shootDelay = 600;
        this.damage = 10;
        this.visionRange = 300;
        break;
      case 'SUICIDE':
        this.radius = 12;
        this.hp = 25;
        this.maxHp = 25;
        this.speed = 3.0; // very fast!
        this.shootDelay = 0; // doesn't shoot
        this.damage = 30; // explosion damage
        this.visionRange = 400;
        break;
      case 'SNIPER':
        this.radius = 20;
        this.hp = 60;
        this.maxHp = 60;
        this.speed = 0.8;
        this.shootDelay = 3500; // fires slowly
        this.damage = 40; // high damage
        this.visionRange = 600;
        break;
      case 'DECOY':
        this.radius = 18;
        this.hp = 100;
        this.maxHp = 100;
        this.speed = 0; // stationary
        this.shootDelay = Infinity;
        this.damage = 40; // detonation damage
        this.visionRange = 0;
        this.life = 6000; // lasts 6 seconds
        break;
      case 'SHIELD_MECH':
        this.radius = 16;
        this.hp = 100;
        this.maxHp = 100;
        this.speed = 1.2;
        this.shootDelay = 1200;
        this.damage = 10;
        this.visionRange = 220;
        break;
      case 'PORTAL':
        this.radius = 24;
        this.hp = 160;
        this.maxHp = 160;
        this.speed = 0;
        this.shootDelay = Infinity;
        this.damage = 0;
        this.visionRange = 0;
        break;
    }
  }

  takeDamage(amount: number) {
    if (this.isDead) return;

    if (this.type === 'SHIELD_MECH') {
      const player = enemiesManager.playerRef;
      if (player) {
        const facingAngle = this.targetUnit ? Math.atan2(this.targetUnit.y - this.y, this.targetUnit.x - this.x) : Math.atan2(this.vy, this.vx);
        const toPlayerAngle = Math.atan2(player.y - this.y, player.x - this.x);
        
        let diff = toPlayerAngle - facingAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        
        if (Math.abs(diff) < Math.PI / 2) {
          // Hit from front! Block damage completely!
          projectilesManager.spawnSparks(this.x + Math.cos(facingAngle) * 18, this.y + Math.sin(facingAngle) * 18, '#00f2fe', 4);
          projectilesManager.spawnText(this.x, this.y - 15, 'BLOCKED', '#00f2fe');
          return;
        }
      }
    }

    // Boss shield mechanic: absorbs 60% of damage when below 50% HP (400 HP)
    if (this.type === 'BOSS' && this.hp < 400) {
      amount = amount * 0.4;
      projectilesManager.spawnSparks(this.x, this.y, '#00f2fe', 6);
    }

    this.hp = Math.max(0, this.hp - amount);
    sound.playHit();

    // Trigger Boss Drone waves
    if (this.type === 'BOSS' && !this.isDead) {
      if (this.hp <= 600 && !this.bossSpawnsDone[600]) {
        this.bossSpawnsDone[600] = true;
        enemiesManager.spawnEnemy(this.x - 50, this.y - 30, 'DRONE');
        enemiesManager.spawnEnemy(this.x + 50, this.y + 30, 'DRONE');
        sound.playShieldRegen();
      }
      if (this.hp <= 400 && !this.bossSpawnsDone[400]) {
        this.bossSpawnsDone[400] = true;
        enemiesManager.spawnEnemy(this.x - 60, this.y, 'DRONE');
        enemiesManager.spawnEnemy(this.x + 60, this.y, 'DRONE');
        sound.playShieldRegen();
      }
      if (this.hp <= 200 && !this.bossSpawnsDone[200]) {
        this.bossSpawnsDone[200] = true;
        enemiesManager.spawnEnemy(this.x - 60, this.y - 30, 'DRONE');
        enemiesManager.spawnEnemy(this.x + 60, this.y + 30, 'DRONE');
        enemiesManager.spawnEnemy(this.x, this.y - 60, 'DRONE');
        sound.playShieldRegen();
      }
    }

    if (this.hp <= 0) {
      this.isDead = true;
      projectilesManager.spawnExplosionParticles(this.x, this.y, this.radius * 1.5);
      sound.playExplosion();

      // Spawn loot drops for hostile deaths
      if (!this.isFriendly && this.type !== 'DECOY') {
        if (Math.random() < 0.5) {
          lootManager.spawnDrop(this.x, this.y);
        }
      }

      // Decoy self-detonation on death
      if (this.type === 'DECOY' && !this.detonated) {
        this.detonated = true;
        enemiesManager.enemies.forEach(e => {
          if (!e.isFriendly && !e.isDead) {
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            if (dx*dx + dy*dy < 80 * 80) {
              e.takeDamage(this.damage); // 40 damage
            }
          }
        });
      }
    }
  }

  detonateSuicide(player: any) {
    if (this.detonated) return;
    this.detonated = true;
    this.isDead = true;

    // Damage primary target
    this.targetUnit?.takeDamage(this.damage);

    // Area damage to friendly units in range
    enemiesManager.enemies.forEach(e => {
      if (e.isFriendly && !e.isDead && e !== this.targetUnit) {
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        if (dx*dx + dy*dy < 80 * 80) {
          e.takeDamage(this.damage);
        }
      }
    });

    // Damage player if nearby and not targetUnit
    if (player && !player.isDead && player !== this.targetUnit) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      if (dx*dx + dy*dy < 80 * 80) {
        player.takeDamage(this.damage);
      }
    }

    projectilesManager.spawnExplosionParticles(this.x, this.y, 40);
    sound.playExplosion();
  }

  update(
    dt: number,
    map: GameMap,
    player: { x: number; y: number; takeDamage: (dmg: number) => void; radius: number; isDead: boolean },
    otherEnemies: Enemy[]
  ) {
    if (this.isDead) return;

    // Handle Plasma Burn ticks
    if (this.plasmaBurnTicks > 0) {
      this.plasmaBurnTimer -= dt;
      if (this.plasmaBurnTimer <= 0) {
        this.plasmaBurnTimer = 500;
        this.plasmaBurnTicks--;
        const burnDamage = this.plasmaBurnLvl * 4;
        this.hp = Math.max(0, this.hp - burnDamage);
        projectilesManager.spawnSparks(this.x, this.y, '#f97316', 3);
        projectilesManager.spawnText(this.x, this.y - 12, `-${burnDamage}`, '#f97316');
        
        if (this.hp <= 0 && !this.isDead) {
          this.isDead = true;
          sound.playExplosion();
          projectilesManager.spawnExplosionParticles(this.x, this.y, this.radius + 15);
          return;
        }
      }
    }

    if (this.type === 'PORTAL') {
      this.portalSpawnTimer += dt;
      if (this.portalSpawnTimer >= 5000) {
        this.portalSpawnTimer = 0;
        const spawnType = Math.random() > 0.5 ? 'SUICIDE' : 'DRONE';
        const offsetAngle = Math.random() * Math.PI * 2;
        const sx = this.x + Math.cos(offsetAngle) * 32;
        const sy = this.y + Math.sin(offsetAngle) * 32;
        enemiesManager.spawnEnemy(sx, sy, spawnType);
        projectilesManager.spawnSparks(this.x, this.y, '#c084fc', 8);
        projectilesManager.spawnShockwave(this.x, this.y, 45, '#c084fc', 300);
      }
      return; // Portals don't move or execute further standard AI updates
    }

    if (this.type === 'DECOY') {
      this.life -= dt;
      if (this.life <= 0) {
        this.takeDamage(this.hp);
      }
      return;
    }

    this.warningLaserActive = false;

    // Process EMP stun
    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // 1. Manage Cooldowns
    if (this.shootCooldown > 0) {
      this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    }

    // 2. Select AI Target
    this.targetUnit = null;

    if (this.isFriendly) {
      // Friendly defender targets the closest hostile enemy unit in range
      let closestHostile: Enemy | null = null;
      let minDist = this.visionRange;

      otherEnemies.forEach(e => {
        if (!e.isFriendly && !e.isDead) {
          const dx = e.x - this.x;
          const dy = e.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < minDist) {
            minDist = dist;
            closestHostile = e;
          }
        }
      });

      if (closestHostile) {
        this.targetUnit = closestHostile;
      }
    } else {
      // Hostile units target the player, or a friendly defender if one is closer
      const dxPlayer = player.x - this.x;
      const dyPlayer = player.y - this.y;
      const distToPlayer = Math.sqrt(dxPlayer*dxPlayer + dyPlayer*dyPlayer);

      if (this.isGuard) {
        // Guard leash: guards can see and target within normal visionRange,
        // but won't chase if they've been pulled too far from home (240px).
        const myDxHome = this.x - this.patrolX;
        const myDyHome = this.y - this.patrolY;
        const myDistHome = Math.sqrt(myDxHome*myDxHome + myDyHome*myDyHome);

        if (myDistHome > 240) {
          // Exceeded leash range: drop all targets and return home
          this.targetUnit = null;
        } else {
          // Normal target selection within vision range
          let closestDefender: Enemy | null = null;
          let minDefDist = this.visionRange;

          otherEnemies.forEach(e => {
            if (e.isFriendly && !e.isDead) {
              const dxMeDef = e.x - this.x;
              const dyMeDef = e.y - this.y;
              const distMeDef = Math.sqrt(dxMeDef*dxMeDef + dyMeDef*dyMeDef);
              if (distMeDef < minDefDist) {
                minDefDist = distMeDef;
                closestDefender = e;
              }
            }
          });

          if (closestDefender) {
            this.targetUnit = closestDefender;
          } else if (distToPlayer < this.visionRange && !player.isDead) {
            this.targetUnit = player;
          }
        }
      } else {
        // Roaming hostile units: standard target selection
        let closestDefender: Enemy | null = null;
        let minDist = distToPlayer < this.visionRange ? distToPlayer : this.visionRange;

        otherEnemies.forEach(e => {
          if (e.isFriendly && !e.isDead) {
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) {
              minDist = dist;
              closestDefender = e;
            }
          }
        });

        if (closestDefender) {
          this.targetUnit = closestDefender;
        } else if (distToPlayer < this.visionRange && !player.isDead) {
          this.targetUnit = player;
        }
      }
    }

    // 3. Movement Behavior (Steering + Obstacle Avoidance + Bullet Dodging)
    if (this.speed > 0) {
      let steerX = 0;
      let steerY = 0;

      if (this.targetUnit) {
        // Seek target
        const dx = this.targetUnit.x - this.x;
        const dy = this.targetUnit.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 50) {
          steerX = dx / dist;
          steerY = dy / dist;
        }
      } else if (this.isFriendly && this.type === 'DEFENDER') {
        // Escort player if close and player is alive
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 250 && dist > 60 && !player.isDead) {
          steerX = dx / dist;
          steerY = dy / dist;
        } else {
          // Default to patrol around base
          let assaultBase: { x: number, y: number, radius: number } | null = null;
          let minBaseDist = Infinity;
          basesManager.bases.forEach(b => {
            if (b.faction === 'PLAYER') {
              const bdx = b.x - this.x;
              const bdy = b.y - this.y;
              const bdist = Math.sqrt(bdx*bdx + bdy*bdy);
              if (bdist < minBaseDist) {
                minBaseDist = bdist;
                assaultBase = b;
              }
            }
          });

          if (assaultBase) {
            const base: { x: number, y: number, radius: number } = assaultBase;
            const bdx = base.x - this.x;
            const bdy = base.y - this.y;
            const bdist = Math.sqrt(bdx*bdx + bdy*bdy);
            if (bdist > base.radius - 30) {
              steerX = bdx / bdist;
              steerY = bdy / bdist;
            } else {
              this.patrolAngle += 0.01 * (dt / 16.66);
              const targetX = base.x + Math.cos(this.patrolAngle) * (base.radius * 0.45);
              const targetY = base.y + Math.sin(this.patrolAngle) * (base.radius * 0.45);
              const tdx = targetX - this.x;
              const tdy = targetY - this.y;
              const tDist = Math.sqrt(tdx*tdx + tdy*tdy);
              if (tDist > 8) {
                steerX = tdx / tDist;
                steerY = tdy / tDist;
              }
            }
          } else {
            // Standard patrol wandering
            this.patrolAngle += 0.015 * (dt / 16.66);
            const targetPatrolX = this.patrolX + Math.cos(this.patrolAngle) * this.patrolRadius;
            const targetPatrolY = this.patrolY + Math.sin(this.patrolAngle) * this.patrolRadius;
            const pdx = targetPatrolX - this.x;
            const pdy = targetPatrolY - this.y;
            const pdist = Math.sqrt(pdx*pdx + pdy*pdy);
            if (pdist > 10) {
              steerX = pdx / pdist;
              steerY = pdy / pdist;
            }
          }
        }
      } else {
        // Hostile mech has no target unit
        if (this.isGuard) {
          // Guard return home/patrol behavior: do NOT assault other bases, stay at patrolX, patrolY!
          const homeDx = this.patrolX - this.x;
          const homeDy = this.patrolY - this.y;
          const homeDist = Math.sqrt(homeDx*homeDx + homeDy*homeDy);

          if (homeDist > 40) {
            // Return home
            steerX = homeDx / homeDist;
            steerY = homeDy / homeDist;
          } else {
            // Patrol around patrol point
            this.patrolAngle += 0.015 * (dt / 16.66);
            const targetPatrolX = this.patrolX + Math.cos(this.patrolAngle) * this.patrolRadius;
            const targetPatrolY = this.patrolY + Math.sin(this.patrolAngle) * this.patrolRadius;
            const pdx = targetPatrolX - this.x;
            const pdy = targetPatrolY - this.y;
            const pdist = Math.sqrt(pdx*pdx + pdy*pdy);
            if (pdist > 10) {
              steerX = pdx / pdist;
              steerY = pdy / pdist;
            }
          }
        } else {
          // Check if hostile unit should assault a player-secured or neutral outpost base
          let assaultBase: { x: number, y: number, radius: number } | null = null;

          if (!this.isFriendly && this.type !== 'TURRET') {
            let minBaseDist = Infinity;
            basesManager.bases.forEach(b => {
              if (b.faction !== 'ENEMY') { // target PLAYER and NEUTRAL bases
                const dx = b.x - this.x;
                const dy = b.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < minBaseDist) {
                  minBaseDist = dist;
                  assaultBase = b;
                }
              }
            });
          }

          if (assaultBase) {
            // Assault Base pathing
            const base: { x: number, y: number, radius: number } = assaultBase;
            const dx = base.x - this.x;
            const dy = base.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > base.radius - 30) {
              // Outside base capture ring: steer directly to the flag
              steerX = dx / dist;
              steerY = dy / dist;
            } else {
              // Inside base: patrol/stand inside the flag area to capture
              this.patrolAngle += 0.01 * (dt / 16.66);
              const targetX = base.x + Math.cos(this.patrolAngle) * (base.radius * 0.45);
              const targetY = base.y + Math.sin(this.patrolAngle) * (base.radius * 0.45);

              const tdx = targetX - this.x;
              const tdy = targetY - this.y;
              const tDist = Math.sqrt(tdx*tdx + tdy*tdy);
              if (tDist > 8) {
                steerX = tdx / tDist;
                steerY = tdy / tDist;
              }
            }
          } else {
            // Standard patrol behavior: wander around original coordinate in circles
            this.patrolAngle += 0.015 * (dt / 16.66);
            const targetPatrolX = this.patrolX + Math.cos(this.patrolAngle) * this.patrolRadius;
            const targetPatrolY = this.patrolY + Math.sin(this.patrolAngle) * this.patrolRadius;

            const dx = targetPatrolX - this.x;
            const dy = targetPatrolY - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 10) {
              steerX = dx / dist;
              steerY = dy / dist;
            }
          }
        }
      }

      // Dynamic Bullet/Projectile Dodging steering force
      let dodgeSteerX = 0;
      let dodgeSteerY = 0;
      let threatsCount = 0;

      projectilesManager.projectiles.forEach(p => {
        // Only dodge opponent's bullets (hostiles dodge player, friendlies dodge enemy)
        if (p.isPlayer !== this.isFriendly) {
          const dx = this.x - p.x;
          const dy = this.y - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          // Only scan close-range bullets (within 150px)
          if (dist < 150) {
            const bulletSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (bulletSpeed > 0) {
              const pvx = p.vx / bulletSpeed;
              const pvy = p.vy / bulletSpeed;

              // Dot product determines if bullet is moving towards this unit
              const dot = dx * pvx + dy * pvy;
              if (dot > 0 && dot < dist + 15) {
                // Projected point along bullet path nearest to unit center
                const projX = p.x + pvx * dot;
                const projY = p.y + pvy * dot;

                // Perpendicular distance from unit center to bullet trajectory
                const perpDist = Math.sqrt((this.x - projX) ** 2 + (this.y - projY) ** 2);
                const safetyMargin = this.radius + 28; // bullet size + radius + buffer padding

                if (perpDist < safetyMargin) {
                  // Dodge perpendicular to bullet speed direction
                  const rx = this.x - projX;
                  const ry = this.y - projY;
                  const rDist = Math.sqrt(rx*rx + ry*ry);

                  let pushX = 0;
                  let pushY = 0;

                  if (rDist > 0.1) {
                    pushX = rx / rDist;
                    pushY = ry / rDist;
                  } else {
                    // Bullet is directly on a collision path, push perpendicular
                    pushX = -pvy;
                    pushY = pvx;
                  }

                  // Force gets stronger as bullet path gets closer to unit center
                  const forceWeight = (safetyMargin - perpDist) / safetyMargin;
                  dodgeSteerX += pushX * forceWeight * 1.5;
                  dodgeSteerY += pushY * forceWeight * 1.5;
                  threatsCount++;
                }
              }
            }
          }
        }
      });

      // Integrate dodging forces into pathing vectors
      if (threatsCount > 0) {
        steerX += dodgeSteerX;
        steerY += dodgeSteerY;

        // Re-normalize steer vector
        const steerLen = Math.sqrt(steerX*steerX + steerY*steerY);
        if (steerLen > 0) {
          steerX /= steerLen;
          steerY /= steerLen;
        }
      }

      // Unit separation steering — prevent units from stacking on top of each other
      let sepX = 0;
      let sepY = 0;
      const separationRadius = this.radius * 3;

      otherEnemies.forEach(e => {
        if (e === this || e.isDead) return;
        const dx = this.x - e.x;
        const dy = this.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.radius + e.radius + 4;

        if (dist < separationRadius && dist > 0.1) {
          // Stronger push the closer they are, especially when overlapping
          const overlap = dist < minDist;
          const force = overlap ? 2.0 : (separationRadius - dist) / separationRadius * 0.6;
          sepX += (dx / dist) * force;
          sepY += (dy / dist) * force;
        }
      });

      // Also separate from player
      {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.radius + player.radius + 4;
        if (dist < minDist && dist > 0.1) {
          sepX += (dx / dist) * 2.0;
          sepY += (dy / dist) * 2.0;
        }
      }

      if (sepX !== 0 || sepY !== 0) {
        steerX += sepX;
        steerY += sepY;
        const steerLen = Math.sqrt(steerX * steerX + steerY * steerY);
        if (steerLen > 0) {
          steerX /= steerLen;
          steerY /= steerLen;
        }
      }

      // Obstacle avoidance steering
      // Cast a "ray" forward to detect walls
      const checkDist = 32;
      const nextX = this.x + steerX * checkDist;
      const nextY = this.y + steerY * checkDist;

      if (map.collides(nextX, nextY, this.radius)) {
        // Wall detected ahead! Steer away by checking angles left and right
        let foundPath = false;
        const anglesToCheck = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI];
        
        for (const angleOffset of anglesToCheck) {
          // Rotate original steer vector
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          const testSteerX = steerX * cos - steerY * sin;
          const testSteerY = steerX * sin + steerY * cos;

          const testX = this.x + testSteerX * checkDist;
          const testY = this.y + testSteerY * checkDist;

          if (!map.collides(testX, testY, this.radius)) {
            steerX = testSteerX;
            steerY = testSteerY;
            foundPath = true;
            break;
          }
        }

        if (!foundPath) {
          // Back up/stop if fully blocked
          steerX = -steerX;
          steerY = -steerY;
        }
      }

      // Execute movement
      const speedFactor = map.getMovementSpeedFactor(this.x, this.y);
      this.vx = steerX * this.speed * speedFactor;
      this.vy = steerY * this.speed * speedFactor;

      // Apply collision slide against walls
      const stepX = this.vx;
      const stepY = this.vy;

      if (!map.collides(this.x + stepX, this.y, this.radius)) {
        this.x += stepX;
      }
      if (!map.collides(this.x, this.y + stepY, this.radius)) {
        this.y += stepY;
      }
    }

    // 4. Attack execution
    if (this.targetUnit) {
      const dx = this.targetUnit.x - this.x;
      const dy = this.targetUnit.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // Suicide drone detonation check
      if (this.type === 'SUICIDE') {
        if (dist < this.radius + this.targetUnit.radius + 8) {
          this.detonateSuicide(player);
          return;
        }
      }

      // Sniper warning telegraph logic
      if (this.type === 'SNIPER' && !this.targetUnit.isDead) {
        if (dist < this.visionRange) {
          if (this.shootCooldown > 0 && this.shootCooldown <= 1500) {
            this.warningLaserActive = true;
            if (this.shootCooldown >= 1500 - dt * 1.5) {
              sound.playSniperWarning();
            }
          }
        }
      }

      if (this.shootCooldown === 0) {
        // Perform a raycast line-of-sight check to ensure it doesn't shoot through walls
        const tileXStart = Math.floor(this.x / map.tileSize);
        const tileYStart = Math.floor(this.y / map.tileSize);
        const tileXEnd = Math.floor(this.targetUnit.x / map.tileSize);
        const tileYEnd = Math.floor(this.targetUnit.y / map.tileSize);

        let hasLOS = true;
        // Simple LOS ray check (approximate grid marching)
        const steps = Math.max(Math.abs(tileXEnd - tileXStart), Math.abs(tileYEnd - tileYStart));
        for (let s = 1; s < steps; s++) {
          const tx = Math.floor(tileXStart + (tileXEnd - tileXStart) * (s / steps));
          const ty = Math.floor(tileYStart + (tileYEnd - tileYStart) * (s / steps));
          if (map.inBounds(tx, ty) && map.tiles[ty][tx] === 'WALL') {
            hasLOS = false;
            break;
          }
        }

        if (hasLOS && dist < this.visionRange) {
          const angle = Math.atan2(dy, dx);
          this.shoot(angle);
          this.shootCooldown = this.shootDelay;
        }
      }
    }
  }

  shoot(angle: number) {
    if (this.type === 'BOSS') {
      // Ring of 10 red bullets
      const bulletCount = 10;
      for (let i = 0; i < bulletCount; i++) {
        const theta = angle + (i / bulletCount) * Math.PI * 2;
        projectilesManager.spawnBullet(
          this.x + Math.cos(theta) * (this.radius + 8),
          this.y + Math.sin(theta) * (this.radius + 8),
          theta,
          8,
          this.damage,
          this.isFriendly,
          '#ff0055',
          4.5
        );
      }
    } else if (this.type === 'MECH') {
      // Slow large explosive rocket
      projectilesManager.spawnBullet(
        this.x + Math.cos(angle) * (this.radius + 8),
        this.y + Math.sin(angle) * (this.radius + 8),
        angle,
        6, // slow speed
        this.damage,
        this.isFriendly,
        '#ff5500', // Red-orange rocket glow
        7 // large bullet size
      );
    } else if (this.type === 'SNIPER') {
      // Fast sniper bolt
      projectilesManager.spawnBullet(
        this.x + Math.cos(angle) * (this.radius + 8),
        this.y + Math.sin(angle) * (this.radius + 8),
        angle,
        18, // high speed
        this.damage,
        this.isFriendly,
        '#00ffff', // Cyan sniper bolt
        3.0
      );
      sound.playSniperShoot();
    } else {
      // Standard laser bullet
      projectilesManager.spawnBullet(
        this.x + Math.cos(angle) * (this.radius + 6),
        this.y + Math.sin(angle) * (this.radius + 6),
        angle,
        10, // high speed
        this.damage,
        this.isFriendly,
        this.isFriendly ? '#39ff14' : '#ff0055', // Green for friendly, red for hostile
        3.5
      );
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.isDead) return;

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    // Draw sniper telegraph laser
    if (this.warningLaserActive && this.targetUnit) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(this.targetUnit.x - cameraX, this.targetUnit.y - cameraY);
      ctx.stroke();
      ctx.restore();
    }

    // Draw unit bodies
    switch (this.type) {
      case 'DRONE':
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = this.isFriendly ? '#39ff14' : '#ff0055';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Drone hexagon shape
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = screenX + Math.cos(angle) * this.radius;
          const py = screenY + Math.sin(angle) * this.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'TURRET':
        // Core stand
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX - 16, screenY - 16, 32, 32);
        ctx.fillRect(screenX - 16, screenY - 16, 32, 32);

        // Rotating barrel head
        let turretAngle = 0;
        if (this.targetUnit) {
          turretAngle = Math.atan2(this.targetUnit.y - this.y, this.targetUnit.x - this.x);
        } else {
          // slow sweep rotation
          turretAngle = Date.now() / 600;
        }

        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + Math.cos(turretAngle) * 22, screenY + Math.sin(turretAngle) * 22);
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius - 8, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'MECH':
        // Heavy Mech blocky chassis
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 3;
        
        ctx.fillRect(screenX - 20, screenY - 20, 40, 40);
        ctx.strokeRect(screenX - 20, screenY - 20, 40, 40);

        // Armor shield plates
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(screenX - 24, screenY - 15, 6, 30);
        ctx.fillRect(screenX + 18, screenY - 15, 6, 30);

        // Eye glow
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'DEFENDER':
        // Friendly AI soldier
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Visor facing direction
        let walkAngle = Math.atan2(this.vy, this.vx);
        if (this.targetUnit) {
          walkAngle = Math.atan2(this.targetUnit.y - this.y, this.targetUnit.x - this.x);
        }
        ctx.fillStyle = '#39ff14';
        ctx.beginPath();
        ctx.arc(screenX + Math.cos(walkAngle) * (this.radius - 4), screenY + Math.sin(walkAngle) * (this.radius - 4), 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'SUICIDE':
        // Small orange triangular drone
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#f97316'; // orange glow border
        ctx.lineWidth = 2;
        ctx.beginPath();
        const moveAngle = Math.atan2(this.vy, this.vx) || (Date.now() / 300);
        ctx.moveTo(screenX + Math.cos(moveAngle) * this.radius, screenY + Math.sin(moveAngle) * this.radius);
        ctx.lineTo(screenX + Math.cos(moveAngle + 2.3) * this.radius, screenY + Math.sin(moveAngle + 2.3) * this.radius);
        ctx.lineTo(screenX + Math.cos(moveAngle - 2.3) * this.radius, screenY + Math.sin(moveAngle - 2.3) * this.radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing core
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'SNIPER':
        // Hexagonal purple/cyan sniper chassis
        ctx.fillStyle = '#1e1b4b'; // deep indigo
        ctx.strokeStyle = '#c084fc'; // purple border
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const radiusX = this.radius * (i % 3 === 0 ? 1.3 : 0.8);
          const radiusY = this.radius * (i % 3 === 0 ? 0.7 : 0.8);
          const px = screenX + Math.cos(angle) * radiusX;
          const py = screenY + Math.sin(angle) * radiusY;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Long barrel
        let sniperAimAngle = 0;
        if (this.targetUnit) {
          sniperAimAngle = Math.atan2(this.targetUnit.y - this.y, this.targetUnit.x - this.x);
        } else {
          sniperAimAngle = Date.now() / 1000;
        }
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + Math.cos(sniperAimAngle) * 32, screenY + Math.sin(sniperAimAngle) * 32);
        ctx.stroke();

        // Cyan visor finder
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(screenX + Math.cos(sniperAimAngle) * 8, screenY + Math.sin(sniperAimAngle) * 8, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'DECOY':
        // Glowing cyan decoy frame
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.7)';
        ctx.fillStyle = 'rgba(0, 242, 254, 0.08)';
        ctx.lineWidth = 2.5;
        
        const pulseRadius = this.radius + Math.sin(Date.now() / 150) * 1.5;
        ctx.beginPath();
        ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Scan scanner line
        const scanY = screenY + Math.sin(Date.now() / 200) * pulseRadius;
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX - Math.sqrt(Math.max(0, pulseRadius*pulseRadius - (scanY-screenY)*(scanY-screenY))), scanY);
        ctx.lineTo(screenX + Math.sqrt(Math.max(0, pulseRadius*pulseRadius - (scanY-screenY)*(scanY-screenY))), scanY);
        ctx.stroke();
        break;

      case 'SHIELD_MECH':
        // Heavy blocky chassis
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.fillRect(screenX - 16, screenY - 16, 32, 32);
        ctx.strokeRect(screenX - 16, screenY - 16, 32, 32);

        // Facing angle
        let shieldMechAngle = Math.atan2(this.vy, this.vx) || 0;
        if (this.targetUnit) {
          shieldMechAngle = Math.atan2(this.targetUnit.y - this.y, this.targetUnit.x - this.x);
        }

        // Draw thick front glowing shield plate
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius + 8, shieldMechAngle - Math.PI / 3, shieldMechAngle + Math.PI / 3);
        ctx.stroke();

        // Glowing red eye visor
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(screenX + Math.cos(shieldMechAngle) * 8, screenY + Math.sin(shieldMechAngle) * 8, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'PORTAL':
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        // outer ring
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius + Math.sin(Date.now() / 100) * 3, 0, Math.PI * 2);
        ctx.stroke();

        // inner swirling core
        ctx.fillStyle = 'rgba(192, 132, 252, 0.2)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius - 4, 0, Math.PI * 2);
        ctx.fill();

        // rotating central vortex line
        const vortexAngle = Date.now() / 200;
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX + Math.cos(vortexAngle) * (this.radius - 6), screenY + Math.sin(vortexAngle) * (this.radius - 6));
        ctx.lineTo(screenX - Math.cos(vortexAngle) * (this.radius - 6), screenY - Math.sin(vortexAngle) * (this.radius - 6));
        ctx.stroke();
        break;

      case 'BOSS':
        // Big heavy command mech chassis
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        // Octagon shape
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const px = screenX + Math.cos(angle) * this.radius;
          const py = screenY + Math.sin(angle) * this.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner glowing core
        const coreBlink = 0.5 + Math.abs(Math.sin(Date.now() / 150)) * 0.5;
        ctx.fillStyle = `rgba(255, 0, 85, ${coreBlink})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
        ctx.fill();

        // Dual heavy plasma weapons
        let bossAngle = Date.now() / 800; // slow sweep default
        if (this.targetUnit) {
          bossAngle = Math.atan2(this.targetUnit.y - this.y, this.targetUnit.x - this.x);
        }

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 6;
        ctx.beginPath();
        // Left gun
        ctx.moveTo(screenX + Math.cos(bossAngle - 0.4) * 15, screenY + Math.sin(bossAngle - 0.4) * 15);
        ctx.lineTo(screenX + Math.cos(bossAngle - 0.4) * (this.radius + 15), screenY + Math.sin(bossAngle - 0.4) * (this.radius + 15));
        // Right gun
        ctx.moveTo(screenX + Math.cos(bossAngle + 0.4) * 15, screenY + Math.sin(bossAngle + 0.4) * 15);
        ctx.lineTo(screenX + Math.cos(bossAngle + 0.4) * (this.radius + 15), screenY + Math.sin(bossAngle + 0.4) * (this.radius + 15));
        ctx.stroke();

        // If shield phase is active (< 50% health), draw a glowing blue barrier in front!
        if (this.hp < 400) {
          ctx.strokeStyle = 'rgba(0, 242, 254, 0.7)';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          // Draw a semi-circle shield facing the angle of aiming
          ctx.arc(screenX, screenY, this.radius + 10, bossAngle - Math.PI/3, bossAngle + Math.PI/3);
          ctx.stroke();
        }
        break;
    }

    // EMP stun electrical visual overlay
    if (this.stunTimer > 0) {
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const sx = screenX + (Math.random() - 0.5) * this.radius * 1.5;
        const sy = screenY + (Math.random() - 0.5) * this.radius * 1.5;
        const ex = screenX + (Math.random() - 0.5) * this.radius * 1.5;
        const ey = screenY + (Math.random() - 0.5) * this.radius * 1.5;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (ex-sx)/2 + (Math.random()-0.5)*8, sy + (ey-sy)/2 + (Math.random()-0.5)*8);
        ctx.lineTo(ex, ey);
      }
      ctx.stroke();
    }

    // Health bar above unit if damaged
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2;
      const barH = 4;
      const barX = screenX - this.radius;
      const barY = screenY - this.radius - 12;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX, barY, barW, barH);

      const healthRatio = this.hp / this.maxHp;
      ctx.fillStyle = this.isFriendly ? '#39ff14' : '#ff0055';
      ctx.fillRect(barX, barY, barW * healthRatio, barH);
    }
  }
}
export class EnemiesManager {
  enemies: Enemy[] = [];
  spawnTimer: number = 0;
  playerRef: any = null;

  constructor() {
    this.reset();
  }

  reset() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.playerRef = null;
    
    // Spawn initial guards around bases
    // Base Alpha (ENEMY, 2048, 512): Spawn turrets and drones
    this.spawnEnemy(2048 - 60, 512, 'TURRET', true);
    this.spawnEnemy(2048 + 60, 512, 'TURRET', true);
    this.spawnEnemy(1950, 420, 'DRONE', true);
    this.spawnEnemy(2120, 580, 'MECH', true);

    // Base Beta (NEUTRAL, 512, 2048): Spawn a couple neutral drones
    this.spawnEnemy(512 - 70, 2048 + 50, 'DRONE', true);
    this.spawnEnemy(512 + 70, 2048 - 50, 'DRONE', true);

    // Base Gamma (NEUTRAL, 1280, 1280): Spawns heavy defense
    this.spawnEnemy(1280, 1280 - 60, 'TURRET', true);
    this.spawnEnemy(1280 - 100, 1280 + 50, 'DRONE', true);
    this.spawnEnemy(1280 + 100, 1280 + 50, 'DRONE', true);
    this.spawnEnemy(1280, 1340, 'MECH', true);

    // Base Delta (ENEMY, 2048, 2048)
    this.spawnEnemy(2048 - 60, 2048, 'TURRET', true);
    this.spawnEnemy(2048, 2048 + 60, 'TURRET', true);
    this.spawnEnemy(2040, 1960, 'MECH', true);
  }

  spawnEnemy(x: number, y: number, type: EnemyType, isGuard: boolean = false) {
    this.enemies.push(new Enemy(x, y, type, false, isGuard));
  }

  spawnDefender(x: number, y: number) {
    this.enemies.push(new Enemy(x, y, 'DEFENDER', true));
  }

  update(
    dt: number,
    map: GameMap,
    player: { x: number; y: number; takeDamage: (dmg: number) => void; radius: number; isDead: boolean }
  ) {
    this.playerRef = player;
    // 1. Spawning dynamic aggressive patrols towards bases (every 14 seconds)
    this.spawnTimer += dt;
    if (this.spawnTimer >= 14000) {
      this.spawnTimer = 0;

      // Select a random border coordinate to spawn an enemy infiltration squad
      const edge = Math.floor(Math.random() * 4);
      let sx = 100;
      let sy = 100;

      if (edge === 0) { // Top edge
        sx = Math.random() * (map.width * 64 - 200) + 100;
        sy = 100;
      } else if (edge === 1) { // Right edge
        sx = map.width * 64 - 100;
        sy = Math.random() * (map.height * 64 - 200) + 100;
      } else if (edge === 2) { // Bottom edge
        sx = Math.random() * (map.width * 64 - 200) + 100;
        sy = map.height * 64 - 100;
      } else { // Left edge
        sx = 100;
        sy = Math.random() * (map.height * 64 - 200) + 100;
      }

      const r = Math.random();
      let squadType: EnemyType = 'DRONE';
      if (r < 0.3) {
        squadType = 'DRONE';
      } else if (r < 0.5) {
        squadType = 'MECH';
      } else if (r < 0.65) {
        squadType = 'SUICIDE';
      } else if (r < 0.8) {
        squadType = 'SNIPER';
      } else if (r < 0.92) {
        squadType = 'SHIELD_MECH';
      } else {
        squadType = 'PORTAL';
      }
      this.spawnEnemy(sx, sy, squadType);
    }

    // 2. Update active units
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.isDead) {
        this.enemies.splice(i, 1);
        continue;
      }
      e.update(dt, map, player, this.enemies);
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, map: GameMap) {
    this.enemies.forEach(e => {
      // Only draw if the enemy is in a visible map zone
      const tx = Math.floor(e.x / map.tileSize);
      const ty = Math.floor(e.y / map.tileSize);
      if (map.inBounds(tx, ty) && map.visibility[ty][tx] === 2) {
        e.draw(ctx, cameraX, cameraY);
      }
    });
  }
}
export const enemiesManager = new EnemiesManager();
