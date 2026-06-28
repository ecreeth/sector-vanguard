import React from 'react';
import { Crosshair, Shield, Zap, CircleAlert } from 'lucide-react';

interface MainMenuProps {
  onStartGame: (biome: string) => void;
  selectedBiome: string;
  setSelectedBiome: (biome: string) => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  selectedBiome,
  setSelectedBiome,
  crtEnabled,
  onToggleCrt
}) => {
  const biomes = [
    {
      id: 'FOREST',
      name: 'FOREST RUINS',
      desc: 'Moderate cover, standard swamp marsh slows, optimal starting conditions.',
      color: 'var(--neon-green)'
    },
    {
      id: 'WASTELAND',
      name: 'WASTELAND SLUDGE',
      desc: 'Acid sludge slows, asphalt pathways speed up, heavily fortified cover.',
      color: 'var(--neon-yellow)'
    },
    {
      id: 'TUNDRA',
      name: 'FROZEN TUNDRA',
      desc: 'Slippery snow fields, icy water slows heavily, sparse cover, longer sight lines.',
      color: 'var(--neon-cyan)'
    }
  ];

  return (
    <div style={styles.overlay} className="menu-root">
      {/* Visual background grids */}
      <div className="scanline-bar" />

      {/* Main Title Header */}
      <div style={styles.headerArea}>
        <h1 style={styles.title} className="neon-text">SECTOR VANGUARD</h1>
        <div style={styles.subtitle}>REAL-TIME TACTICAL GRID SHOOTER</div>
      </div>

      {/* Biome Select Grid */}
      <div style={styles.selectionArea} className="hud-panel">
        <div style={styles.sectionTitle}>SELECT DROP ZONE BIOME</div>
        <div style={styles.biomeList}>
          {biomes.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedBiome(b.id)}
              style={{
                ...styles.biomeCard,
                borderColor: selectedBiome === b.id ? b.color : 'rgba(255, 255, 255, 0.08)',
                background: selectedBiome === b.id ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.4)'
              }}
            >
              <div style={{ ...styles.biomeName, color: b.color }}>{b.name}</div>
              <div style={styles.biomeDesc}>{b.desc}</div>
              {selectedBiome === b.id && (
                <div style={{ ...styles.activeIndicator, backgroundColor: b.color }}>
                  ZONE CALIBRATED
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions / Info Panel */}
      <div style={styles.instructionsArea} className="hud-panel">
        <div style={styles.sectionTitle}>MISSION DIRECTIVES</div>
        
        <div style={styles.directiveGrid}>
          <div style={styles.directiveItem}>
            <Crosshair size={18} color="var(--neon-cyan)" style={styles.icon} />
            <div>
              <span style={styles.controlLabel}>MOVEMENT & AIM:</span> Use <strong>WASD / Arrow Keys</strong> to navigate. Aim and shoot with your <strong>Mouse Left-Click</strong>.
            </div>
          </div>
          
          <div style={styles.directiveItem}>
            <Zap size={18} color="var(--neon-yellow)" style={styles.icon} />
            <div>
              <span style={styles.controlLabel}>THRUSTER DASH:</span> Press <strong>Shift / Spacebar</strong> to execute a rapid speed burst. Perfect for dodging plasma.
            </div>
          </div>

          <div style={styles.directiveItem}>
            <Shield size={18} color="var(--neon-green)" style={styles.icon} />
            <div>
              <span style={styles.controlLabel}>OUTPOST CAPTURE:</span> Stand inside outpost circles to capture bases. Secured bases clear Fog of War, generate Tech Credits, and spawn friendly AI guards.
            </div>
          </div>

          <div style={styles.directiveItem}>
            <CircleAlert size={18} color="var(--neon-red)" style={styles.icon} />
            <div>
              <span style={styles.controlLabel}>TACTICAL SHOPS:</span> Use earned Tech Credits at your HUD armory to unlock the <strong>Scatter Shotgun</strong> or <strong>Plasma Repeater</strong>. Use <strong>[Q]</strong> to cycle weapons.
            </div>
          </div>
        </div>
      </div>

      {/* Deploy & Options Action Container */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button 
          onClick={onToggleCrt} 
          className="sci-fi-button"
          style={{ fontFamily: 'var(--font-header)', fontSize: '13px', padding: '12px 24px', letterSpacing: '1px' }}
        >
          CRT SCANLINES: {crtEnabled ? 'ON' : 'OFF'}
        </button>

        <button 
          onClick={() => onStartGame(selectedBiome)} 
          style={styles.deployBtn} 
          className="sci-fi-button success"
        >
          DEPLOY STRATEGIC COMMANDO
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#05060b',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '32px',
    boxSizing: 'border-box',
    gap: '24px',
    zIndex: 1000
  },
  headerArea: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  title: {
    fontFamily: 'var(--font-header)',
    fontSize: '44px',
    fontWeight: 900,
    letterSpacing: '8px',
    color: '#ffffff',
    margin: '0',
    textShadow: '0 0 10px var(--neon-cyan-glow), 0 0 20px var(--neon-cyan-glow)'
  },
  subtitle: {
    fontSize: '13px',
    letterSpacing: '4px',
    color: 'var(--neon-cyan)',
    marginTop: '6px',
    fontFamily: 'var(--font-header)'
  },
  selectionArea: {
    width: '640px',
    maxWidth: '100%',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sectionTitle: {
    fontFamily: 'var(--font-header)',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    color: 'var(--neon-cyan)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '6px'
  },
  biomeList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginTop: '4px'
  },
  biomeCard: {
    border: '1px solid',
    padding: '12px',
    borderRadius: '4px',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    transition: 'all 0.25s'
  },
  biomeName: {
    fontFamily: 'var(--font-header)',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px'
  },
  biomeDesc: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4'
  },
  activeIndicator: {
    fontSize: '8px',
    color: '#000000',
    fontWeight: 'bold',
    padding: '2px 4px',
    alignSelf: 'flex-start',
    borderRadius: '2px',
    marginTop: 'auto'
  },
  instructionsArea: {
    width: '640px',
    maxWidth: '100%',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  directiveGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    lineHeight: '1.5'
  },
  directiveItem: {
    display: 'flex',
    alignItems: 'flex-start'
  },
  icon: {
    marginRight: '12px',
    marginTop: '2px',
    flexShrink: 0
  },
  controlLabel: {
    fontWeight: 'bold',
    color: 'var(--neon-cyan)',
    marginRight: '4px'
  },
  deployBtn: {
    fontFamily: 'var(--font-header)',
    fontSize: '16px',
    letterSpacing: '3px',
    padding: '14px 44px',
    boxShadow: '0 0 20px var(--neon-green-glow)'
  }
};
