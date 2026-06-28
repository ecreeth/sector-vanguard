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
});
