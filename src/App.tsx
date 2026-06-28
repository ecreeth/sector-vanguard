import { useState, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import type { GameEngine } from './game/Engine';
import type { EngineStateUpdate, WeaponType } from './game/Types';
import { sound } from './game/Sound';
import { Play, RotateCcw } from 'lucide-react';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('MENU');
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
          onQuit={handleQuit}
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
