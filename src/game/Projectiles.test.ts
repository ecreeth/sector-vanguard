import { describe, it, expect, beforeEach, vi } from 'vitest';
import { projectilesManager } from './Projectiles';
import { GameMap } from './Map';

vi.mock('./Sound', () => ({
  sound: {
    playShoot: vi.fn(),
    playDash: vi.fn(),
    playHit: vi.fn(),
    playExplosion: vi.fn(),
    playCaptureProgress: vi.fn(),
    playCaptureComplete: vi.fn(),
    playPurchase: vi.fn(),
    playShieldRegen: vi.fn(),
    playLaser: vi.fn(),
    toggle: vi.fn(),
    isEnabled: () => false
  }
}));

describe('ProjectilesManager & Particle System', () => {
  beforeEach(() => {
    projectilesManager.projectiles = [];
    projectilesManager.particles = [];
    projectilesManager.shockwaves = [];
    projectilesManager.floatingTexts = [];
  });

  it('should spawn single bullet with proper attributes', () => {
    projectilesManager.spawnBullet(100, 100, 0, 10, 15, true);
    expect(projectilesManager.projectiles.length).toBe(1);
    
    const bullet = projectilesManager.projectiles[0];
    expect(bullet.x).toBe(100);
    expect(bullet.vx).toBe(10);
    expect(bullet.vy).toBe(0);
    expect(bullet.damage).toBe(15);
    expect(bullet.isPlayer).toBe(true);
  });

  it('should spawn shotgun pellet spreads', () => {
    projectilesManager.spawnShotgun(100, 100, 0, 12, true);
    // Spawns 5 pellets
    expect(projectilesManager.projectiles.length).toBe(5);
    
    // Spread should vary the velocity angles
    const firstPellet = projectilesManager.projectiles[0];
    const lastPellet = projectilesManager.projectiles[4];
    expect(firstPellet.vy).toBeLessThan(0); // spread up
    expect(lastPellet.vy).toBeGreaterThan(0); // spread down
  });

  it('should spawn sparks and explosion particles', () => {
    projectilesManager.spawnSparks(100, 100, '#fff', 10);
    expect(projectilesManager.particles.length).toBe(10);

    projectilesManager.spawnExplosionParticles(100, 100, 50);
    expect(projectilesManager.particles.length).toBe(30); // 10 + 20
  });

  it('should update and decay projectile lifespan', () => {
    projectilesManager.spawnBullet(100, 100, 0, 10, 15, true);
    
    const map = new GameMap('FOREST');
    // Run update for 2500ms (max life is 2000ms)
    projectilesManager.update(2500, map, []);
    expect(projectilesManager.projectiles.length).toBe(0); // removed due to lifespan expiration
  });

  it('should resolve bullet-to-target hits strictly on faction opposition', () => {
    projectilesManager.spawnBullet(100, 100, 0, 10, 15, true); // player-owned

    const map = new GameMap('FOREST');
    // Set target zone as visible to player (2)
    const tx = Math.floor(100 / map.tileSize);
    const ty = Math.floor(100 / map.tileSize);
    map.visibility[ty][tx] = 2;

    let damageReceived = 0;
    const enemyTarget = {
      x: 100,
      y: 100,
      radius: 15,
      takeDamage: (dmg: number) => {
        damageReceived += dmg;
      },
      isPlayer: false // Enemy
    };

    projectilesManager.update(16, map, [enemyTarget]);
    expect(damageReceived).toBe(15);
    expect(projectilesManager.projectiles.length).toBe(0); // bullet destroyed on hit
  });

  it('should not hit hostiles that are hidden in the fog of war', () => {
    projectilesManager.spawnBullet(100, 100, 0, 10, 15, true); // player-owned

    const map = new GameMap('FOREST');
    // Ensure target zone is hidden (0 = unexplored fog)
    const tx = Math.floor(100 / map.tileSize);
    const ty = Math.floor(100 / map.tileSize);
    map.visibility[ty][tx] = 0;

    let damageReceived = 0;
    const enemyTarget = {
      x: 100,
      y: 100,
      radius: 15,
      takeDamage: (dmg: number) => {
        damageReceived += dmg;
      },
      isPlayer: false // Enemy
    };

    projectilesManager.update(16, map, [enemyTarget]);
    expect(damageReceived).toBe(0); // no damage since hidden in fog
    expect(projectilesManager.projectiles.length).toBe(1); // bullet passes through
  });

  it('should not hit friendly targets of same faction', () => {
    projectilesManager.spawnBullet(100, 100, 0, 10, 15, true); // player-owned

    const map = new GameMap('FOREST');
    let damageReceived = 0;
    const playerTarget = {
      x: 100,
      y: 100,
      radius: 15,
      takeDamage: (dmg: number) => {
        damageReceived += dmg;
      },
      isPlayer: true // Friendly
    };

    projectilesManager.update(16, map, [playerTarget]);
    expect(damageReceived).toBe(0);
    expect(projectilesManager.projectiles.length).toBe(1); // bullet passes through friendlies
  });

  it('should damage and detonate explosive barrels', () => {
    const map = new GameMap('FOREST');
    // Place a barrel
    map.barrels = [{ x: 100, y: 100, hp: 10, isDead: false }];

    // Spawn a bullet moving right towards the barrel
    projectilesManager.spawnBullet(85, 100, 0, 12, 15, true);

    projectilesManager.update(16, map, []);
    
    // Barrel should be dead (since HP 10 <= damage 15)
    expect(map.barrels[0].isDead).toBe(true);
    expect(projectilesManager.projectiles.length).toBe(0); // bullet consumed
  });

  it('should bounce bullet off walls when bouncesLeft > 0', () => {
    const map = new GameMap('FOREST');
    // Force a wall block at tile (2, 2)
    map.tiles[2][2] = 'WALL';
    const wallX = 2 * map.tileSize + map.tileSize / 2;
    const wallY = 2 * map.tileSize + map.tileSize / 2;

    // Spawn a bullet moving directly towards the wall from the left with bouncesLeft = 1
    projectilesManager.spawnBullet(wallX - 10, wallY, 0, 10, 10, true, '#fff', 4, 1);
    
    projectilesManager.update(16, map, []);

    // Bullet should still exist, bouncesLeft decremented to 0, vx inverted
    expect(projectilesManager.projectiles.length).toBe(1);
    const bullet = projectilesManager.projectiles[0];
    expect(bullet.bouncesLeft).toBe(0);
    expect(bullet.vx).toBeLessThan(0); // bounced back to the left!
  });

  it('should pierce multiple enemies when pierceLeft > 0', () => {
    const map = new GameMap('FOREST');
    // Set target zone as visible to player (2). Targets are at (100, 100) -> tile (1, 1)
    map.visibility[1][1] = 2;

    let target1Damage = 0;
    let target2Damage = 0;

    const t1 = {
      x: 100,
      y: 100,
      radius: 15,
      takeDamage: (dmg: number) => { target1Damage += dmg; },
      isPlayer: false
    };

    const t2 = {
      x: 120,
      y: 100,
      radius: 15,
      takeDamage: (dmg: number) => { target2Damage += dmg; },
      isPlayer: false
    };

    // Spawn bullet at (80, 100) moving right with pierceLeft = 1
    projectilesManager.spawnBullet(80, 100, 0, 20, 15, true, '#fff', 4, 0, 1);
    
    // Update to hit first target
    projectilesManager.update(16, map, [t1, t2]);
    expect(target1Damage).toBe(15);
    expect(projectilesManager.projectiles.length).toBe(1); // bullet survives hit 1!
    expect(projectilesManager.projectiles[0].pierceLeft).toBe(0);

    // Update to hit second target
    projectilesManager.update(16, map, [t1, t2]);
    expect(target2Damage).toBe(15);
    expect(projectilesManager.projectiles.length).toBe(0); // bullet consumed on hit 2
  });

  it('should spawn shockwaves and floating text particles', () => {
    projectilesManager.spawnShockwave(100, 100, 150, '#00f2fe', 400);
    expect(projectilesManager.shockwaves.length).toBe(1);
    
    projectilesManager.spawnText(100, 100, 'BLOCKED', '#00f2fe');
    expect(projectilesManager.floatingTexts.length).toBe(1);
  });
});
