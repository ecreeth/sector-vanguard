import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Enemy, enemiesManager } from './Enemies';
import { GameMap } from './Map';
import { projectilesManager } from './Projectiles';

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

describe('Enemy Types and AI Behaviors', () => {
  beforeEach(() => {
    projectilesManager.projectiles = [];
    projectilesManager.particles = [];
    enemiesManager.reset();
  });

  it('should initialize stats according to enemy type', () => {
    const drone = new Enemy(100, 100, 'DRONE', false);
    expect(drone.maxHp).toBe(35);
    expect(drone.speed).toBe(2.2);

    const mech = new Enemy(100, 100, 'MECH', false);
    expect(mech.maxHp).toBe(150);
    expect(mech.speed).toBe(1.0);

    const turret = new Enemy(100, 100, 'TURRET', false);
    expect(turret.speed).toBe(0); // Stationary
  });

  it('should reduce shield damage for Boss beneath 50% HP', () => {
    const boss = new Enemy(100, 100, 'BOSS', false);
    boss.hp = 300; // < 400

    // Take 100 raw damage. Shield absorbs 60%, so boss should take 40 damage.
    boss.takeDamage(100);
    expect(boss.hp).toBe(260); // 300 - 40
  });

  it('should decrease stun timer on update and restrict movements', () => {
    const drone = new Enemy(100, 100, 'DRONE', false);
    drone.stunTimer = 1000; // 1s stun
    
    const map = new GameMap('FOREST');
    const playerTarget = { x: 150, y: 150, takeDamage: () => {}, radius: 16, isDead: false };

    // Update with 400ms step
    drone.update(400, map, playerTarget, []);
    expect(drone.stunTimer).toBe(600);
    expect(drone.vx).toBe(0);
    expect(drone.vy).toBe(0);
  });

  it('should target nearest hostile unit within vision range', () => {
    enemiesManager.spawnEnemy(100, 100, 'DRONE');
    const drone = enemiesManager.enemies[enemiesManager.enemies.length - 1];

    const playerTarget = { x: 150, y: 100, takeDamage: () => {}, radius: 16, isDead: false };
    const map = new GameMap('FOREST');

    // Run update
    enemiesManager.update(100, map, playerTarget);
    
    // Check that target is acquired
    expect(drone.targetUnit).toBeDefined();
    expect(drone.targetUnit?.x).toBe(150);
  });

  it('should trigger squad spawns on Boss HP threshold triggers', () => {
    enemiesManager.spawnEnemy(100, 100, 'BOSS');
    const boss = enemiesManager.enemies[enemiesManager.enemies.length - 1];

    // Inflict damage to cross 600 HP threshold
    boss.takeDamage(210); // HP drops to 590
    
    // Drones should be spawned
    expect(enemiesManager.enemies.length).toBeGreaterThan(14);
    expect(enemiesManager.enemies.some(e => e.type === 'DRONE')).toBe(true);
  });
});
