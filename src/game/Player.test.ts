import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from './Player';
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

describe('Player Logic & Mechanics', () => {
  beforeEach(() => {
    projectilesManager.projectiles = [];
    projectilesManager.particles = [];
  });

  it('should initialize with starting weapons, pistol unlocked, and others locked', () => {
    const player = new Player(100, 100);
    expect(player.currentWeaponType).toBe('PISTOL');
    expect(player.weapons['PISTOL'].unlocked).toBe(true);
    expect(player.weapons['SHOTGUN'].unlocked).toBe(false);
    expect(player.weapons['PLASMA_RIFLE'].unlocked).toBe(false);
  });

  it('should allow buying and unlocking weapons', () => {
    const player = new Player(100, 100);
    player.credits = 300;

    // Shotgun cost is 150
    const success = player.buyWeapon('SHOTGUN');
    expect(success).toBe(true);
    expect(player.weapons['SHOTGUN'].unlocked).toBe(true);
    expect(player.credits).toBe(150);
    expect(player.currentWeaponType).toBe('SHOTGUN');
  });

  it('should cycle only between unlocked weapons', () => {
    const player = new Player(100, 100);
    expect(player.currentWeaponType).toBe('PISTOL');

    // Cycle when shotgun and plasma rifle are locked -> should remain pistol
    player.cycleWeapon();
    expect(player.currentWeaponType).toBe('PISTOL');

    // Unlock Shotgun and cycle
    player.weapons['SHOTGUN'].unlocked = true;
    player.cycleWeapon();
    expect(player.currentWeaponType).toBe('SHOTGUN');

    player.cycleWeapon();
    expect(player.currentWeaponType).toBe('PISTOL');
  });

  it('should trigger Thruster Boost (Dash) and move fast', () => {
    const player = new Player(100, 100);
    player.dashCooldown = 0;

    // Trigger dash moving right (1, 0)
    player.triggerDash(1, 0);
    expect(player.dashDuration).toBeGreaterThan(0);
    expect(player.dashCooldown).toBe(player.dashMaxCooldown);
    expect(player.dashDirX).toBe(1);
    expect(player.dashDirY).toBe(0);
  });

  it('should apply maximum caps (level 4) to upgrades', () => {
    const player = new Player(100, 100);
    player.credits = 10000;

    // Level up health 4 times
    for (let i = 0; i < 4; i++) {
      expect(player.buyUpgrade('HEALTH')).toBe(true);
    }
    // 5th time should fail
    expect(player.buyUpgrade('HEALTH')).toBe(false);
    expect(player.healthLvl).toBe(4);
  });

  it('should deduct shield first on taking damage, then health', () => {
    const player = new Player(100, 100);
    player.shield = 40;
    player.health = 100;

    player.takeDamage(30);
    expect(player.shield).toBe(10);
    expect(player.health).toBe(100);

    player.takeDamage(20); // 10 shield left, remaining 10 goes to health
    expect(player.shield).toBe(0);
    expect(player.health).toBe(90);
  });

  it('should trigger death when HP reaches 0', () => {
    const player = new Player(100, 100);
    player.takeDamage(200);
    expect(player.health).toBe(0);
    expect(player.isDead).toBe(true);
  });

  it('should process Airstrike bombings sequentially via queued explosions', () => {
    const player = new Player(100, 100);
    player.credits = 500;

    // Trigger Airstrike at (300, 300)
    const success = player.triggerAirstrike(300, 300);
    expect(success).toBe(true);
    expect(player.queuedExplosions.length).toBe(6); // carpet bombing spawns 6 explosive shells

    // Simulate update to tick down delay and run explosion triggers
    const map = new GameMap('FOREST');
    player.update(200, 0, 0, map);
    // Some explosions should have triggered
    expect(player.queuedExplosions.some(e => e.exploded)).toBe(true);
  });
});
