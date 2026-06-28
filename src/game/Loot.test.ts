import { describe, it, expect, beforeEach, vi } from 'vitest';
import { lootManager } from './Loot';

vi.mock('./Sound', () => ({
  sound: {
    playPickup: vi.fn()
  }
}));

describe('Loot drops manager', () => {
  beforeEach(() => {
    lootManager.reset();
  });

  it('should spawn loot chip or ammo on enemy death', () => {
    lootManager.spawnDrop(100, 100);
    expect(lootManager.drops.length).toBe(1);
    const drop = lootManager.drops[0];
    expect(drop.x).toBe(100);
    expect(drop.y).toBe(100);
    expect(drop.life).toBeGreaterThan(0);
  });

  it('should decrease lifespan and remove expired loot drops', () => {
    lootManager.spawnDrop(100, 100);
    const drop = lootManager.drops[0];
    drop.life = 100; // 100ms remaining

    // Update player far away
    const player = { x: 500, y: 500, radius: 16, credits: 0, currentWeaponType: 'PISTOL', weapons: {} } as any;
    lootManager.update(150, player);
    
    // Loot drop should have expired and been removed
    expect(lootManager.drops.length).toBe(0);
  });

  it('should attract loot to player when in vacuum radius and collect it on contact', () => {
    lootManager.spawnDrop(100, 100);
    const drop = lootManager.drops[0];
    // force type to CREDITS for deterministic testing
    drop.type = 'CREDITS';

    // Player inside magnet range (70px)
    const player = { x: 140, y: 100, radius: 16, credits: 10, currentWeaponType: 'PISTOL', weapons: {} } as any;
    lootManager.update(100, player);

    // Drop should have moved towards player (x coordinate should increase from 100 towards 140)
    expect(drop.x).toBeGreaterThan(100);

    // Player touches the drop directly
    player.x = drop.x;
    player.y = drop.y;
    lootManager.update(16, player);

    expect(lootManager.drops.length).toBe(0);
    expect(player.credits).toBeGreaterThan(10);
  });
});
