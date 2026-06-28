import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from './Engine';
import { basesManager } from './Bases';
import { enemiesManager } from './Enemies';

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

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  innerWidth: 800,
  innerHeight: 600,
  parent: null
};
vi.stubGlobal('window', mockWindow);
vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

const mockCanvas = {
  getContext: () => ({
    fillRect: () => {},
    stroke: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    drawImage: () => {},
    fillText: () => {},
    clearRect: () => {}
  }),
  width: 800,
  height: 600,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  addEventListener: () => {},
  removeEventListener: () => {},
  parentElement: {
    clientWidth: 800,
    clientHeight: 600
  }
} as unknown as HTMLCanvasElement;

describe('GameEngine Loop & Transitions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with MENU state', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    expect(engine.gameState).toBe('MENU');
  });

  it('should switch to PLAYING state on start()', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    expect(engine.gameState).toBe('PLAYING');
    expect(engine.selectedBiome).toBe('FOREST');
  });

  it('should toggle pause states correctly', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    
    // Pause
    engine.togglePause();
    expect(engine.gameState).toBe('PAUSED');

    // Resume
    engine.togglePause();
    expect(engine.gameState).toBe('PLAYING');
  });

  it('should trigger GAMEOVER when player is dead', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    
    // Kill player
    engine.player.isDead = true;

    // Run engine update
    (engine as any).update(16);

    expect(engine.gameState).toBe('GAMEOVER');
  });

  it('should trigger boss fight when all bases captured', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');

    // Clear enemies to prevent them from decapping player bases during baseManager.update inside engine.update
    enemiesManager.enemies = [];

    // Force all bases captured by player
    basesManager.bases.forEach(b => {
      b.faction = 'PLAYER';
      b.progress = 100;
    });

    // Run engine update to trigger boss spawn check
    (engine as any).update(16);

    expect(engine.bossSpawned).toBe(true);
    expect(enemiesManager.enemies.some(e => e.type === 'BOSS')).toBe(true);
  });

  it('should only trigger VICTORY once boss is dead', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');

    // Clear enemies
    enemiesManager.enemies = [];

    // Capture all bases
    basesManager.bases.forEach(b => {
      b.faction = 'PLAYER';
      b.progress = 100;
    });

    // Run update to spawn boss
    (engine as any).update(16);
    expect(engine.gameState).toBe('PLAYING'); // not won yet

    // Kill boss
    const boss = enemiesManager.enemies.find(e => e.type === 'BOSS');
    if (boss) {
      boss.isDead = true;
    }

    // Run engine update again
    (engine as any).update(16);
    expect(engine.gameState).toBe('VICTORY');
  });
});
