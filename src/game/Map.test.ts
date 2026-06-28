import { describe, it, expect, vi } from 'vitest';
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

describe('GameMap Tile & Generation Logic', () => {
  it('should initialize width, height, and tiles matrix', () => {
    const map = new GameMap('FOREST');
    expect(map.width).toBe(40);
    expect(map.height).toBe(40);
    expect(map.tiles.length).toBe(40);
    expect(map.tiles[0].length).toBe(40);
  });

  it('should generate border walls', () => {
    const map = new GameMap('FOREST');
    // Border tiles must be WALLs
    for (let x = 0; x < map.width; x++) {
      expect(map.tiles[0][x]).toBe('WALL');
      expect(map.tiles[map.height - 1][x]).toBe('WALL');
    }
    for (let y = 0; y < map.height; y++) {
      expect(map.tiles[y][0]).toBe('WALL');
      expect(map.tiles[y][map.width - 1]).toBe('WALL');
    }
  });

  it('should detect collisions with solid walls and map boundaries', () => {
    const map = new GameMap('FOREST');
    // Edge coords should collide
    expect(map.collides(-5, 10, 10)).toBe(true);
    expect(map.collides(map.width * map.tileSize + 5, 10, 10)).toBe(true);

    // Let's force a wall tile inside the map and test collision
    map.tiles[5][5] = 'WALL';
    const tileX = 5 * map.tileSize + map.tileSize / 2;
    const tileY = 5 * map.tileSize + map.tileSize / 2;
    expect(map.collides(tileX, tileY, 10)).toBe(true);
  });

  it('should return correct movement speed factor based on terrain type', () => {
    const map = new GameMap('FOREST');

    // Make some tiles roads or water and verify speed factors
    map.tiles[10][10] = 'ROAD';
    map.tiles[11][11] = 'WATER';
    map.tiles[12][12] = 'GRASS';

    const roadX = 10 * map.tileSize + map.tileSize / 2;
    const roadY = 10 * map.tileSize + map.tileSize / 2;
    expect(map.getMovementSpeedFactor(roadX, roadY)).toBeCloseTo(1.35);

    const waterX = 11 * map.tileSize + map.tileSize / 2;
    const waterY = 11 * map.tileSize + map.tileSize / 2;
    expect(map.getMovementSpeedFactor(waterX, waterY)).toBeCloseTo(0.45);

    const grassX = 12 * map.tileSize + map.tileSize / 2;
    const grassY = 12 * map.tileSize + map.tileSize / 2;
    expect(map.getMovementSpeedFactor(grassX, grassY)).toBeCloseTo(1.0);
  });

  it('should enforce clear player spawn coordinates free of walls', () => {
    const map = new GameMap('FOREST');
    // Player spawn tile is (3, 3)
    expect(map.tiles[3][3]).not.toBe('WALL');
    expect(map.tiles[2][3]).not.toBe('WALL');
    expect(map.tiles[4][3]).not.toBe('WALL');
  });

  it('should handle visibility grid transitions', () => {
    const map = new GameMap('FOREST');
    // Set some tile to visible
    map.visibility[15][15] = 2;

    // Run visibility update
    map.updateVisibility(100, 100, []);

    // Visible tile (2) decays to explored (1) when far away
    expect(map.visibility[15][15]).toBe(1);
  });

  it('should generate power gates and shield nodes when CYBER biome is selected', () => {
    const map = new GameMap('CYBER');
    expect(map.powerGates.length).toBeGreaterThan(0);
    expect(map.shieldNodes.length).toBeGreaterThan(0);
  });

  it('should progress laser gate hacking timer when player is in proximity', () => {
    const map = new GameMap('CYBER');
    const gate = map.powerGates[0];
    gate.active = true;
    gate.hackTimer = 3000; // 3 seconds remaining

    const playerTarget = { x: gate.x + 10, y: gate.y + 10, takeDamage: () => {}, radius: 16, isDead: false };
    const onCreditsEarned = vi.fn();

    // Update with 1000ms steps until hacked
    map.update(1000, playerTarget, onCreditsEarned);
    expect(gate.hackTimer).toBe(2000);

    map.update(2000, playerTarget, onCreditsEarned);
    expect(gate.hackTimer).toBe(0);
    expect(gate.active).toBe(false);
    expect(onCreditsEarned).toHaveBeenCalledWith(50);
  });

  it('should block movement on active laser gates', () => {
    const map = new GameMap('CYBER');
    const gate = map.powerGates[0];
    gate.active = true;

    // Laser gate coordinates should collide when active
    expect(map.collides(gate.x, gate.y, 16)).toBe(true);

    // Should not collide once disabled
    gate.active = false;
    expect(map.collides(gate.x, gate.y, 16)).toBe(false);
  });
});
