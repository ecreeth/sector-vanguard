import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BasesManager } from './Bases';
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

describe('BasesManager & Capturing Logic', () => {
  beforeEach(() => {
    projectilesManager.projectiles = [];
    projectilesManager.particles = [];
  });

  it('should initialize with standard map outposts', () => {
    const manager = new BasesManager();
    expect(manager.bases.length).toBe(4);
    expect(manager.bases[0].id).toBe('alpha');
    expect(manager.bases[1].id).toBe('beta');
    expect(manager.bases[2].id).toBe('gamma');
    expect(manager.bases[3].id).toBe('delta');
  });

  it('should progress capture towards player when player is inside neutral base', () => {
    const manager = new BasesManager();
    const base = manager.bases[1]; // Outpost Beta is neutral initially
    expect(base.faction).toBe('NEUTRAL');
    expect(base.progress).toBe(0);

    // Position player directly on top of the base center
    manager.update(
      2000, // 2 seconds
      base.x,
      base.y,
      [],
      () => {},
      () => {}
    );

    expect(base.capturingFaction).toBe('PLAYER');
    expect(base.progress).toBeGreaterThan(0);
  });

  it('should progress capture towards enemy when hostiles are inside player base', () => {
    const manager = new BasesManager();
    const base = manager.bases[1];
    base.faction = 'PLAYER';
    base.progress = 100;

    // Place an enemy inside base capture radius
    const mockEnemy = {
      x: base.x + 10,
      y: base.y + 10,
      isFriendly: false,
      isDead: false
    };

    manager.update(
      2000,
      base.x + 500, // Player is far away
      base.y + 500,
      [mockEnemy],
      () => {},
      () => {}
    );

    expect(base.capturingFaction).toBe('ENEMY');
    expect(base.progress).toBeLessThan(100);
  });

  it('should generate tech credit income from captured player bases', () => {
    const manager = new BasesManager();
    // Set 2 bases to player faction
    manager.bases[0].faction = 'PLAYER';
    manager.bases[1].faction = 'PLAYER';

    let creditsEarned = 0;
    const addCredits = (amt: number) => {
      creditsEarned += amt;
    };

    // Income generates every 5000ms
    manager.update(5000, 0, 0, [], addCredits, () => {});
    expect(creditsEarned).toBe(50); // 2 bases * 25 credits
  });

  it('should trigger defender spawning from player bases periodically', () => {
    const manager = new BasesManager();
    manager.bases[0].faction = 'PLAYER'; // outpost alpha player controlled

    let spawnTriggered = false;
    let spawnX = 0;
    let spawnY = 0;

    const spawnDefender = (x: number, y: number) => {
      spawnTriggered = true;
      spawnX = x;
      spawnY = y;
    };

    // Spawning ticks every 15000ms
    manager.update(15000, 0, 0, [], () => {}, spawnDefender);
    expect(spawnTriggered).toBe(true);
    // Spawns near base
    expect(Math.abs(spawnX - manager.bases[0].x)).toBeLessThan(60);
    expect(Math.abs(spawnY - manager.bases[0].y)).toBeLessThan(60);
  });

  it('should handle defense turret locking target and shooting', () => {
    const manager = new BasesManager();
    const base = manager.bases[0];
    base.faction = 'PLAYER';
    base.hasTurret = true;
    base.turretCooldown = 0;

    const hostile = {
      x: base.x + 120,
      y: base.y + 120,
      isFriendly: false,
      isDead: false
    };

    manager.update(
      500,
      base.x + 500,
      base.y + 500,
      [hostile],
      () => {},
      () => {}
    );

    // Verify a friendly bullet is spawned
    expect(projectilesManager.projectiles.length).toBe(1);
    expect(projectilesManager.projectiles[0].isPlayer).toBe(true);
  });

  it('should handle defense shield absorbing bullets and taking damage', () => {
    const manager = new BasesManager();
    const base = manager.bases[0];
    base.faction = 'PLAYER';
    base.defenseType = 'SHIELD';
    base.shieldHp = 200;

    manager.update(
      16,
      base.x + 500,
      base.y + 500,
      [],
      () => {},
      () => {}
    );

    expect(base.shieldHp).toBe(200);

    // Spawn an enemy bullet hitting the shield (shield radius is 80px)
    projectilesManager.projectiles = [];
    projectilesManager.spawnBullet(
      base.x + 40,
      base.y + 40,
      0,
      0,
      25,
      false // enemy bullet
    );

    // Update projectiles
    const map = new GameMap('FOREST');
    projectilesManager.update(16, map, [], manager.bases);

    // Bullet should be absorbed
    expect(projectilesManager.projectiles.length).toBe(0);
    expect(base.shieldHp).toBe(175); // 200 - 25
  });

  it('should double base vision multiplier if base has radar', () => {
    const manager = new BasesManager();
    const base = manager.bases[0];
    base.faction = 'PLAYER';
    base.defenseType = 'RADAR';

    const positions = manager.getPositionsForFog();
    const radarBase = positions.find(p => p.hasRadar);
    expect(radarBase).toBeDefined();
    expect(radarBase?.hasRadar).toBe(true);
  });
});
