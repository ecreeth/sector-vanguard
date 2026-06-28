import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine, loadCampaignProgress, saveCampaignProgress } from './Engine';
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

// Stub localStorage for campaign progress tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

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
    localStorageMock.clear();
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

  it('should trigger boss fight when all bases captured on stage 5', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    engine.campaignStage = 5;

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

  it('should activate portal instead of boss on stages 1-4', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    engine.campaignStage = 2;

    enemiesManager.enemies = [];

    basesManager.bases.forEach(b => {
      b.faction = 'PLAYER';
      b.progress = 100;
    });

    // Place player near portal
    engine.player.x = 1280;
    engine.player.y = 1280;

    (engine as any).update(16);

    expect(engine.map.portalActive).toBe(true);
    expect(engine.bossSpawned).toBe(false);
    expect(engine.gameState).toBe('TRANSITION');
  });

  it('should only trigger VICTORY once boss is dead', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    engine.campaignStage = 5;

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

  it('should set campaignStage to 1 and difficultyScale to 1.0 on start', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    expect(engine.campaignStage).toBe(1);
    expect(engine.difficultyScale).toBe(1.0);
  });

  it('should increment campaignStage and difficultyScale on startStage', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');

    engine.startStage(2);
    expect(engine.campaignStage).toBe(2);
    expect(engine.difficultyScale).toBeCloseTo(1.15);

    engine.startStage(3);
    expect(engine.campaignStage).toBe(3);
    expect(engine.difficultyScale).toBeCloseTo(1.30);

    engine.startStage(4);
    expect(engine.campaignStage).toBe(4);
    expect(engine.difficultyScale).toBeCloseTo(1.45);

    engine.startStage(5);
    expect(engine.campaignStage).toBe(5);
    expect(engine.difficultyScale).toBeCloseTo(1.60);
  });

  it('should set gameState to TRANSITION when player enters portal on non-boss stage', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');

    enemiesManager.enemies = [];

    // Capture all bases
    basesManager.bases.forEach(b => {
      b.faction = 'PLAYER';
      b.progress = 100;
    });

    // Teleport player to portal location (1280, 1280)
    engine.player.x = 1280;
    engine.player.y = 1280;

    (engine as any).update(16);

    expect(engine.map.portalActive).toBe(true);
    expect(engine.gameState).toBe('TRANSITION');
  });

  it('should continueFromTransition advance to next stage', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    engine.gameState = 'TRANSITION';
    engine.campaignStage = 1;

    engine.continueFromTransition();
    expect(engine.gameState).toBe('PLAYING');
    expect(engine.campaignStage).toBe(2);
    expect(engine.difficultyScale).toBeCloseTo(1.15);
  });

  it('should notify onStateUpdate with PLAYING after continueFromTransition', () => {
    let lastState: any = null;
    const engine = new GameEngine(mockCanvas, (s) => { lastState = s; });
    engine.start('FOREST');

    // Enter portal to trigger TRANSITION
    enemiesManager.enemies = [];
    basesManager.bases.forEach(b => {
      b.faction = 'PLAYER';
      b.progress = 100;
    });
    engine.player.x = 1280;
    engine.player.y = 1280;
    (engine as any).update(16);
    expect(engine.gameState).toBe('TRANSITION');
    expect(lastState.gameState).toBe('TRANSITION');

    // Simulate React calling continueFromTransition (the WARP TO NEXT SECTOR button)
    engine.continueFromTransition();

    // Engine should immediately be PLAYING
    expect(engine.gameState).toBe('PLAYING');

    // Manually run one update cycle to push state to React
    (engine as any).update(16);

    // onStateUpdate should now report PLAYING
    expect(lastState.gameState).toBe('PLAYING');
    expect(lastState.stats.campaignStage).toBe(2);
  });

  it('should not continueFromTransition if already on last stage', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    engine.gameState = 'TRANSITION';
    engine.campaignStage = 5;

    engine.continueFromTransition();
    // Stage 5 is boss stage, continueFromTransition should not advance past it
    expect(engine.campaignStage).toBe(5);
  });

  it('should completeSector save progress and unlock next biome', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    engine.campaignStage = 5;

    const progress = engine.completeSector();
    expect(progress.unlockedBiomes).toContain('WASTELAND');
    expect(progress.highestStageCleared['FOREST']).toBe(5);
  });

  it('should completeSector not unlock biome if not final stage', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');
    engine.campaignStage = 3;

    const progress = engine.completeSector();
    expect(progress.unlockedBiomes).not.toContain('WASTELAND');
    expect(progress.highestStageCleared['FOREST']).toBe(3);
  });

  it('should pass campaignStage and difficultyScale to enemiesManager', () => {
    const engine = new GameEngine(mockCanvas, () => {});
    engine.start('FOREST');

    engine.startStage(3);
    expect(enemiesManager.campaignStage).toBe(3);
    expect(enemiesManager.difficultyScale).toBeCloseTo(1.30);
  });
});

describe('Campaign Progress localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default progress when no saved data exists', () => {
    const progress = loadCampaignProgress();
    expect(progress.unlockedBiomes).toContain('FOREST');
    expect(progress.highestStageCleared).toEqual({});
  });

  it('should save and load campaign progress', () => {
    const data = {
      unlockedBiomes: ['FOREST', 'WASTELAND'],
      highestStageCleared: { FOREST: 5, WASTELAND: 3 }
    };
    saveCampaignProgress(data);
    const loaded = loadCampaignProgress();
    expect(loaded.unlockedBiomes).toEqual(['FOREST', 'WASTELAND']);
    expect(loaded.highestStageCleared).toEqual({ FOREST: 5, WASTELAND: 3 });
  });

  it('should return default progress for corrupted data', () => {
    localStorage.setItem('sector_vanguard_campaign', '{invalid json');
    const progress = loadCampaignProgress();
    expect(progress.unlockedBiomes).toContain('FOREST');
  });
});
