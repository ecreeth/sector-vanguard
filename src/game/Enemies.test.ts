import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Enemy, enemiesManager } from './Enemies';
import { GameMap } from './Map';
import { projectilesManager } from './Projectiles';
import { basesManager } from './Bases';

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
    startMusic: vi.fn(),
    stopMusic: vi.fn(),
    playDecoyDeploy: vi.fn(),
    playSniperWarning: vi.fn(),
    playSniperShoot: vi.fn(),
    playPickup: vi.fn(),
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

  it('should trigger squad spawns on Boss HP HP triggers', () => {
    enemiesManager.spawnEnemy(100, 100, 'BOSS');
    const boss = enemiesManager.enemies[enemiesManager.enemies.length - 1];

    // Inflict damage to cross 600 HP threshold
    boss.takeDamage(210); // HP drops to 590
    
    // Drones should be spawned
    expect(enemiesManager.enemies.length).toBeGreaterThan(1);
    expect(enemiesManager.enemies.some(e => e.type === 'DRONE')).toBe(true);
  });

  it('should detonate Suicide drone on contact with target unit', () => {
    const suicide = new Enemy(100, 100, 'SUICIDE', false);
    const target = { x: 105, y: 100, takeDamage: vi.fn(), radius: 18, isDead: false };
    const map = new GameMap('FOREST');

    suicide.targetUnit = target;
    suicide.update(100, map, target, []);
    expect(suicide.isDead).toBe(true);
    expect(suicide.detonated).toBe(true);
    expect(target.takeDamage).toHaveBeenCalledWith(30);
  });

  it('should trigger warning laser for Sniper mech within telegraph range', () => {
    const sniper = new Enemy(100, 100, 'SNIPER', false);
    const target = { x: 300, y: 100, takeDamage: vi.fn(), radius: 18, isDead: false };
    const map = new GameMap('FOREST');

    sniper.targetUnit = target;
    sniper.shootCooldown = 1000; // within 1.5s warning telegraph window
    sniper.update(100, map, target, []);
    expect(sniper.warningLaserActive).toBe(true);
  });

  it('should tick Decoy lifespan and detonate decoy on decay expiry', () => {
    const decoy = new Enemy(100, 100, 'DECOY', true);
    decoy.life = 100; // 100ms remaining
    const map = new GameMap('FOREST');
    const playerTarget = { x: 150, y: 150, takeDamage: () => {}, radius: 16, isDead: false };

    decoy.update(150, map, playerTarget, []);
    expect(decoy.isDead).toBe(true);
    expect(decoy.detonated).toBe(true);
  });

  it('should escort player when defender has no hostiles in vision range', () => {
    const defender = new Enemy(100, 100, 'DEFENDER', true);
    const playerTarget = { x: 200, y: 100, takeDamage: () => {}, radius: 18, isDead: false };
    const map = new GameMap('FOREST');

    defender.update(100, map, playerTarget, []);
    // vx should be positive towards player (200, 100)
    expect(defender.vx).toBeGreaterThan(0);
  });

  it('should block all damage to Shield Mech when hit from the front and bypass when hit from behind', () => {
    const shieldMech = new Enemy(100, 100, 'SHIELD_MECH', false);
    // Facing player (facing to the right towards player at 150, 100)
    shieldMech.vx = 1;
    shieldMech.vy = 0;
    
    // 1. Hit from the front (where player is)
    enemiesManager.playerRef = { x: 150, y: 100, radius: 16, takeDamage: () => {}, isDead: false };
    shieldMech.takeDamage(30);
    expect(shieldMech.hp).toBe(100); // blocked!

    // 2. Hit from behind (player at 50, 100)
    enemiesManager.playerRef = { x: 50, y: 100, radius: 16, takeDamage: () => {}, isDead: false };
    shieldMech.takeDamage(30);
    expect(shieldMech.hp).toBe(70); // damaged!
  });

  it('should periodically spawn drones/suicides from active portals', () => {
    const portal = new Enemy(100, 100, 'PORTAL', false);
    const map = new GameMap('FOREST');
    const player = { x: 100, y: 100, radius: 16, takeDamage: () => {}, isDead: false };

    enemiesManager.enemies = [portal];
    
    // Portal spawn timer builds up
    portal.update(5000, map, player, []);

    // Portal spawning drone/suicide should insert it into enemiesManager list
    expect(enemiesManager.enemies.length).toBe(2);
    expect(enemiesManager.enemies[1].type).toMatch(/DRONE|SUICIDE/);
  });

  it('should apply plasma flame DoT burn ticks to hostiles', () => {
    const drone = new Enemy(100, 100, 'DRONE', false);
    const map = new GameMap('FOREST');
    const player = { x: 100, y: 100, radius: 16, takeDamage: () => {}, isDead: false };

    drone.applyPlasmaBurn(2); // level 2 = 8 damage per tick
    expect(drone.plasmaBurnTicks).toBe(6);

    // Update with 500ms step to trigger first burn tick
    drone.update(500, map, player, []);
    expect(drone.hp).toBe(drone.maxHp - 8);
    expect(drone.plasmaBurnTicks).toBe(5);
  });

  it('should drop target lock and return home when player flees guard leash radius (240px)', () => {
    const guard = new Enemy(100, 100, 'DRONE', false, true); // isGuard = true
    const player = { x: 120, y: 100, radius: 16, takeDamage: () => {}, isDead: false };
    const map = new GameMap('FOREST');

    // 1. Player is close: guard acquires target
    guard.update(16, map, player, []);
    expect(guard.targetUnit).toBe(player);

    // Move guard beyond 240px leash from home (100, 100)
    guard.x = 350;
    
    // 2. Player is still nearby the guard but guard is too far from home
    player.x = 380;
    guard.update(16, map, player, []);
    
    // Guard should drop target lock because it's beyond 240px from home!
    expect(guard.targetUnit).toBeNull();
    
    // 3. Since guard has no target and is far from home, update should steer them home (homeDx < 0)
    expect(guard.vx).toBeLessThan(0);
  });

  it('should not allow base guards to march off and assault player outposts on the other side of the map', () => {
    const guard = new Enemy(100, 100, 'DRONE', false, true); // isGuard = true
    const player = { x: 999, y: 999, radius: 16, takeDamage: () => {}, isDead: false };
    const map = new GameMap('FOREST');
    
    // Set a captured player base
    basesManager.bases = [{ x: 2000, y: 2000, faction: 'PLAYER', radius: 100 } as any];

    guard.update(16, map, player, []);

    // Guard should not steer vertically towards (2000, 2000)
    expect(guard.vy).toBeLessThan(0.1);
  });

  it('should allow border infiltration squads to roam and assault player outposts without being leashed', () => {
    const intruder = new Enemy(100, 100, 'DRONE', false, false); // isGuard = false
    const player = { x: 999, y: 999, radius: 16, takeDamage: () => {}, isDead: false };
    const map = new GameMap('FOREST');
    
    // Set a captured player base at (200, 200)
    basesManager.bases = [{ x: 200, y: 200, faction: 'PLAYER', radius: 100 } as any];

    intruder.update(16, map, player, []);

    // Infiltration unit should steer towards (200, 200) - both vx and vy should be positive!
    expect(intruder.vx).toBeGreaterThan(0);
    expect(intruder.vy).toBeGreaterThan(0);
  });

  it('should push overlapping units apart via separation steering', () => {
    // Place two defenders directly on top of each other
    const def1 = new Enemy(200, 200, 'DEFENDER', true);
    const def2 = new Enemy(200, 200, 'DEFENDER', true);
    const player = { x: 500, y: 500, radius: 16, takeDamage: () => {}, isDead: false };
    const map = new GameMap('FOREST');

    // Run several updates so separation forces kick in
    for (let i = 0; i < 10; i++) {
      def1.update(16, map, player, [def1, def2]);
      def2.update(16, map, player, [def1, def2]);
    }

    // They should no longer be at the exact same position
    const dx = def1.x - def2.x;
    const dy = def1.y - def2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeGreaterThan(1);
  });

  it('should target and fire back at player outside normal vision range when taking damage (alerted state)', () => {
    const drone = new Enemy(100, 100, 'DRONE', false); // visionRange is 300
    const player = { x: 500, y: 100, radius: 16, takeDamage: () => {}, isDead: false };
    const map = new GameMap('FOREST');

    // 1. Initial state: player is 400px away (beyond 300px vision), no target acquired
    drone.update(16, map, player, []);
    expect(drone.targetUnit).toBeNull();

    // 2. Take damage: sets alertedTimer and targets the player
    drone.takeDamage(10);
    expect(drone.alertedTimer).toBeGreaterThan(0);

    drone.update(16, map, player, []);
    expect(drone.targetUnit).toBe(player);
  });

  it('should propagate alerts to nearby hostiles within a 250px radius', () => {
    const mainEnemy = new Enemy(100, 100, 'DRONE', false);
    const nearbyEnemy = new Enemy(120, 100, 'DRONE', false); // 20px away
    const farEnemy = new Enemy(400, 100, 'DRONE', false); // 300px away

    enemiesManager.enemies = [mainEnemy, nearbyEnemy, farEnemy];

    // Trigger hit on mainEnemy
    mainEnemy.takeDamage(5);

    // Nearby enemy should be alerted, far enemy should not
    expect(mainEnemy.alertedTimer).toBeGreaterThan(0);
    expect(nearbyEnemy.alertedTimer).toBeGreaterThan(0);
    expect(farEnemy.alertedTimer).toBe(0);
  });
});
