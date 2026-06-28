import { useState, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import type { GameEngine } from './game/Engine';
import type { GameState, EngineStateUpdate, WeaponType } from './game/Types';
import { sound } from './game/Sound';
import { basesManager } from './game/Bases';
import { enemiesManager } from './game/Enemies';
import { projectilesManager } from './game/Projectiles';
import { Play, RotateCcw } from 'lucide-react';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [selectedBiome, setSelectedBiome] = useState<string>('FOREST');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  
  // Track state updates directly from the GameEngine loop
  const [engineState, setEngineState] = useState<EngineStateUpdate | null>(null);
  
  // Hold ref to engine to trigger method calls (like weapon purchases)
  const engineRef = useRef<GameEngine | null>(null);

  const handleStartGame = (biome: string) => {
    sound.toggle(soundEnabled);
    setGameState('PLAYING');
    setSelectedBiome(biome);
  };

  const handleStateUpdate = (update: EngineStateUpdate) => {
    setEngineState(update);
    // Synced engine game over/victory state triggers transition in React UI
    if (update.gameState !== 'PLAYING') {
      setGameState(update.gameState);
    }
  };

  const handleBuyWeapon = (type: WeaponType) => {
    if (engineRef.current) {
      engineRef.current.player.buyWeapon(type);
    }
  };

  const handleToggleSound = () => {
    const nextState = sound.toggle();
    setSoundEnabled(nextState);
  };

  const handleQuit = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setGameState('MENU');
    setEngineState(null);
  };

  const handleBuyUpgrade = (type: 'HEALTH' | 'SHIELD' | 'DASH' | 'RICOCHET' | 'PIERCE' | 'PLASMA_BURN') => {
    if (engineRef.current) {
      engineRef.current.player.buyUpgrade(type);
    }
  };

  const handleBuildDefense = (defense: 'TURRET' | 'SHIELD' | 'RADAR') => {
    if (engineRef.current) {
      const player = engineRef.current.player;
      const cost = defense === 'TURRET' ? 200 : (defense === 'SHIELD' ? 250 : 180);
      
      if (player.credits >= cost) {
        // Find nearest player-owned base
        let bestBase: any = null;
        let bestDist = Infinity;
        basesManager.bases.forEach(b => {
          if (b.faction === 'PLAYER') {
            const dx = player.x - b.x;
            const dy = player.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
              bestDist = dist;
              bestBase = b;
            }
          }
        });

        // Only build if nearest base has a different defense type
        if (bestBase && bestBase.defenseType !== defense) {
          player.credits -= cost;
          bestBase.defenseType = defense;
          bestBase.turretCooldown = 0;
          bestBase.turretAngle = 0;

          if (defense === 'SHIELD') {
            bestBase.maxShieldHp = 200;
            bestBase.shieldHp = 200;
            bestBase.shieldRechargeTimer = 0;
            bestBase.shieldOfflineTimer = 0;
          }

          sound.playPurchase();
        }
      }
    }
  };

  const handleSetSquadOrder = (order: 'DEFEND' | 'ESCORT' | 'SEARCH_AND_DESTROY') => {
    if (engineRef.current) {
      enemiesManager.squadOrder = order;
      sound.playOrderChange();
      let color = '#00f2fe';
      if (order === 'ESCORT') color = '#39ff14';
      if (order === 'SEARCH_AND_DESTROY') color = '#f97316';
      
      projectilesManager.spawnText(engineRef.current.player.x, engineRef.current.player.y - 35, `SQUAD: ${order}`, color);
    }
  };

  const handleDevAction = (action: 'god' | 'credits' | 'clear' | 'capture' | 'spawn', data?: any) => {
    if (engineRef.current) {
      const engine = engineRef.current;
      if (action === 'god') {
        engine.player.godMode = !engine.player.godMode;
      } else if (action === 'credits') {
        engine.player.credits = 9999;
      } else if (action === 'clear') {
        enemiesManager.enemies = [];
      } else if (action === 'capture') {
        basesManager.bases.forEach(b => {
          b.faction = 'PLAYER';
          b.progress = 100;
        });
      } else if (action === 'spawn' && data) {
        // Spawn at a random position, not too close to player (between 200px and 450px)
        let sx = 0;
        let sy = 0;
        let attempts = 0;
        const minDistance = 200;
        const maxDistance = 450;
        const enemyRadius = 16;
        
        while (attempts < 50) {
          const angle = Math.random() * Math.PI * 2;
          const dist = minDistance + Math.random() * (maxDistance - minDistance);
          sx = engine.player.x + Math.cos(angle) * dist;
          sy = engine.player.y + Math.sin(angle) * dist;
          
          const mapW = engine.map.width * engine.map.tileSize;
          const mapH = engine.map.height * engine.map.tileSize;
          if (sx > enemyRadius && sx < mapW - enemyRadius && sy > enemyRadius && sy < mapH - enemyRadius) {
            if (!engine.map.collides(sx, sy, enemyRadius)) {
              break;
            }
          }
          attempts++;
        }

        if (attempts >= 50) {
          // Fallback to original spawn logic if no valid random location found
          const offset = 64;
          sx = engine.player.x + Math.cos(engine.player.angle) * offset;
          sy = engine.player.y + Math.sin(engine.player.angle) * offset;
        }

        if (data === 'DEFENDER') {
          enemiesManager.spawnDefender(sx, sy);
        } else {
          enemiesManager.spawnEnemy(sx, sy, data, false);
        }
      }
    }
  };

  return (
    <div className="app-container">
      {/* Global CRT Screen Filter */}
      {crtEnabled && <div className="crt-overlay" />}
      {/* 1. Core Game Canvas */}
      {gameState !== 'MENU' && (
        <GameCanvas
          onStateUpdate={handleStateUpdate}
          gameState={gameState}
          selectedBiome={selectedBiome}
          engineRef={engineRef}
        />
      )}

      {/* 2. HUD Overlay when playing */}
      {gameState === 'PLAYING' && engineState && (
        <HUD
          stats={engineState.stats}
          activeCapture={engineState.activeCaptureProgress}
          onBuyWeapon={handleBuyWeapon}
          onToggleSound={handleToggleSound}
          soundEnabled={soundEnabled}
          crtEnabled={crtEnabled}
          onToggleCrt={() => setCrtEnabled(!crtEnabled)}
          onPause={() => engineRef.current?.togglePause()}
          onQuit={handleQuit}
          onBuyUpgrade={handleBuyUpgrade}
          onBuildDefense={handleBuildDefense}
          onSetSquadOrder={handleSetSquadOrder}
          selectedBiome={selectedBiome}
          onDevAction={handleDevAction}
        />
      )}

      {/* 3. Main Menu Screen */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartGame={handleStartGame}
          selectedBiome={selectedBiome}
          setSelectedBiome={setSelectedBiome}
          crtEnabled={crtEnabled}
          onToggleCrt={() => setCrtEnabled(!crtEnabled)}
        />
      )}

      {/* Pause Screen Overlay */}
      {gameState === 'PAUSED' && (
        <div className="game-overlay fade-in">
          <div className="overlay-card hud-panel" style={{ width: '380px' }}>
            <h2 className="overlay-title" style={{ color: 'var(--neon-cyan)', textShadow: '0 0 10px var(--neon-cyan-glow)' }}>
              MISSION PAUSED
            </h2>
            <div className="overlay-subtitle">TACTICAL COMMS SUSPENDED</div>
            <p className="overlay-desc">
              Press [ESC] / [P] to resume active duty, or select an option below.
            </p>
            <div className="overlay-buttons" style={{ flexDirection: 'column', width: '100%', gap: '10px' }}>
              <button 
                onClick={() => engineRef.current?.togglePause()} 
                className="sci-fi-button success"
                style={{ width: '100%', letterSpacing: '1px' }}
              >
                RESUME OPERATIONS
              </button>
              <button 
                onClick={() => {
                  if (engineRef.current) {
                    engineRef.current.start(selectedBiome);
                  }
                  setGameState('PLAYING');
                }} 
                className="sci-fi-button"
                style={{ width: '100%', borderColor: 'var(--neon-yellow)', color: 'var(--neon-yellow)', letterSpacing: '1px' }}
              >
                RESTART SECTOR
              </button>
              <button onClick={handleQuit} className="sci-fi-button danger" style={{ width: '100%', letterSpacing: '1px' }}>
                ABANDON MISSION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Game Over Screen Overlay */}
      {gameState === 'GAMEOVER' && (
        <div className="game-overlay fade-in">
          <div className="overlay-card hud-panel alert-red">
            <h2 className="overlay-title blink-anim" style={{ color: 'var(--neon-red)', animation: 'blink 1.2s infinite' }}>
              SYSTEM COLLAPSE
            </h2>
            <div className="overlay-subtitle">TACTICAL COMMANDER ELIMINATED</div>
            <p className="overlay-desc">
              All combat shields failed. Sector control has reverted to hostiles.
            </p>
            <div className="overlay-buttons">
              <button 
                onClick={() => handleStartGame(selectedBiome)} 
                className="sci-fi-button danger"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RotateCcw size={16} /> REDEPLOY UNIT
              </button>
              <button onClick={handleQuit} className="sci-fi-button">
                RETURN TO BASE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Victory Screen Overlay */}
      {gameState === 'VICTORY' && (
        <div className="game-overlay fade-in">
          <div className="overlay-card hud-panel alert-green">
            <h2 className="overlay-title" style={{ color: 'var(--neon-green)', textShadow: '0 0 10px var(--neon-green-glow)' }}>
              MISSION COMPLETE
            </h2>
            <div className="overlay-subtitle">ALL SECTORS SECURED</div>
            <p className="overlay-desc">
              Excellent marksman performance. Enemy drone outposts have been fully dismantled.
            </p>
            <div className="overlay-buttons">
              <button 
                onClick={() => handleStartGame(selectedBiome)} 
                className="sci-fi-button success"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Play size={16} /> ACQUIRE NEXT SECTOR
              </button>
              <button onClick={handleQuit} className="sci-fi-button">
                RETURN TO BASE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
