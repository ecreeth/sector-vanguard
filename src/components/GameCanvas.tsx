import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/Engine';
import type { EngineStateUpdate } from '../game/Types';

interface GameCanvasProps {
  onStateUpdate: (update: EngineStateUpdate) => void;
  gameState: string;
  selectedBiome: string;
  engineRef: React.MutableRefObject<GameEngine | null>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  onStateUpdate,
  gameState,
  selectedBiome,
  engineRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Instantiate Engine
    const engine = new GameEngine(canvasRef.current, (update) => {
      onStateUpdate(update);
    });
    
    engineRef.current = engine;

    // Handle canvas resizing
    const handleResize = () => {
      engine.resizeCanvas();
    };
    window.addEventListener('resize', handleResize);

    // If starting in playing state, start engine immediately
    if (gameState === 'PLAYING') {
      engine.start(selectedBiome);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stop();
      engineRef.current = null;
    };
  }, [canvasRef]);

  // Restart or trigger engine starts if state shifts in React parent
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (gameState === 'PLAYING' && engine.gameState !== 'PLAYING') {
      engine.start(selectedBiome);
    } else if (gameState === 'MENU' && engine.gameState !== 'MENU') {
      engine.stop();
    }
  }, [gameState, selectedBiome]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          backgroundColor: '#06070d'
        }}
      />
    </div>
  );
};
