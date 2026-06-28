import React, { useState } from 'react';
import { Crosshair, Shield, Zap, CircleAlert, X, BookOpen } from 'lucide-react';

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
  const [showManual, setShowManual] = useState(false);
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
    },
    {
      id: 'CYBER',
      name: 'CYBER-GRID ROAD',
      desc: 'Glowing charge nodes boost shield regen, active laser gates obstruct movement, hackable pathways.',
      color: '#c084fc'
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
          onClick={() => setShowManual(true)} 
          className="sci-fi-button"
          style={{ 
            fontFamily: 'var(--font-header)', 
            fontSize: '13px', 
            padding: '12px 24px', 
            letterSpacing: '1px',
            borderColor: 'var(--neon-cyan)',
            color: 'var(--neon-cyan)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <BookOpen size={16} /> MANUAL
        </button>

        <button 
          onClick={() => onStartGame(selectedBiome)} 
          style={styles.deployBtn} 
          className="sci-fi-button success"
        >
          DEPLOY STRATEGIC COMMANDO
        </button>
      </div>

      {/* Game Manual Modal Overlay */}
      {showManual && (
        <div style={manualStyles.modalBg} className="fade-in">
          <div style={manualStyles.modalCard} className="hud-panel">
            {/* Modal Header */}
            <div style={manualStyles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen color="var(--neon-cyan)" size={20} />
                <span style={manualStyles.modalTitle}>SECTOR VANGUARD FIELDBOOK</span>
              </div>
              <button 
                onClick={() => setShowManual(false)}
                style={manualStyles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scroll */}
            <div style={manualStyles.scrollArea}>
              {/* Section 1: Tactical Controls */}
              <div style={manualStyles.section}>
                <div style={manualStyles.sectionHeader}>1. COMMAND & TACTICAL CONTROLS</div>
                <ul style={manualStyles.list}>
                  <li><strong>WASD / Arrow Keys</strong>: Move the commander mech.</li>
                  <li><strong>Mouse Cursor</strong>: Aim weapon trajectory.</li>
                  <li><strong>Left-Click</strong>: Fire equipped weapon.</li>
                  <li><strong>Shift / Spacebar</strong>: Execute Thruster Boost (Dash) to dodge projectiles.</li>
                  <li><strong>Key [Q]</strong>: Cycle between unlocked armory weapons.</li>
                  <li><strong>Key [1]</strong>: Release <strong>EMP Blast</strong> (20s Cooldown) to stun hostiles in radius.</li>
                  <li><strong>Key [2]</strong>: Coordinate <strong>Carpet Airstrike</strong> (25s Cooldown) at cursor world location.</li>
                  <li><strong>Key [3]</strong>: Deploy <strong>Repair Drone</strong> (15s Cooldown) to heal HP over time.</li>
                  <li><strong>Key [ESC] / [P]</strong>: Pause active operations.</li>
                </ul>
              </div>

              {/* Section 2: HUD Shop & Upgrade Systems */}
              <div style={manualStyles.section}>
                <div style={manualStyles.sectionHeader}>2. ARMORY PURCHASES & COMMAND TERMINAL</div>
                <p style={manualStyles.paragraph}>
                  Securing outposts generates <strong>Tech Credits (CR)</strong>. Use credits in the HUD panels to unlock upgrades:
                </p>
                <ul style={manualStyles.list}>
                  <li><strong>Weapons Armory</strong>: Purchase/unlock the <strong>Shotgun</strong> (150 CR, fires 5-pellet spreads) or the rapid-fire <strong>Plasma Rifle</strong> (250 CR). If unlocked, buying weapon again refills ammo for 15% cost.</li>
                  <li><strong>Command Terminal</strong>: Purchase tier upgrades (4 levels max) to boost stats: Max HP (120 CR+), Shield Matrix (100 CR+), and Dash Cooldown decay rate (150 CR+).</li>
                  <li><strong>Base Turrets</strong>: Click <em>"BUILD BASE TURRET"</em> (200 CR) to place a stationary green laser cannon at the closest player-secured outpost flag.</li>
                </ul>
              </div>

              {/* Section 3: Base Capturing & The Overseer Boss */}
              <div style={manualStyles.section}>
                <div style={manualStyles.sectionHeader}>3. OUTPOST SECURING & BOSS ENCOUNTER</div>
                <ul style={manualStyles.list}>
                  <li><strong>Capturing</strong>: Stand inside outpost boundary circles. The capture speed is influenced by your faction presence vs hostile presence (contested zones halt capture).</li>
                  <li><strong>Outpost Benefits</strong>: Secured outposts clear local fog of war visibility, spawn friendly defender AI guards periodically, and provide regular tech credits income.</li>
                  <li><strong>The Sector Overseer</strong>: Once all 4 bases on the map are player-controlled, a giant command boss mech drops at the center of the sector `(1280, 1280)`. Defeating the boss is required to achieve absolute victory.</li>
                </ul>
              </div>

              {/* Section 4: Biomes and Hazards */}
              <div style={manualStyles.section}>
                <div style={manualStyles.sectionHeader}>4. DROP ZONE BIOME SPECIFICATIONS</div>
                <ul style={manualStyles.list}>
                  <li><strong>Forest Ruins</strong>: swamp marsh water zones slow down speeds by 55%.</li>
                  <li><strong>Wasteland Sludge</strong>: green toxic pools spawn near structures. Standing in pools deals 8 HP/sec damage. Asphalt roadways speed up movement by 35%.</li>
                  <li><strong>Frozen Tundra</strong>: slippery snow banks. Random blizzards arise, severely decaying commander visual sight radius from 7 tiles to 3.5 tiles.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const manualStyles: Record<string, React.CSSProperties> = {
  modalBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 6, 11, 0.85)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '24px',
    boxSizing: 'border-box'
  },
  modalCard: {
    width: '580px',
    maxWidth: '100%',
    maxHeight: '90%',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 0 30px rgba(0, 242, 254, 0.15)',
    boxSizing: 'border-box'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '10px'
  },
  modalTitle: {
    fontFamily: 'var(--font-header)',
    fontSize: '14px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    color: 'var(--neon-cyan)',
    textShadow: '0 0 8px var(--neon-cyan-glow)'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s'
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingRight: '6px'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  sectionHeader: {
    fontFamily: 'var(--font-header)',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: 'var(--neon-cyan)',
    borderBottom: '1px dashed rgba(255, 255, 255, 0.1)',
    paddingBottom: '3px'
  },
  paragraph: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    margin: 0
  },
  list: {
    fontSize: '11.5px',
    color: 'var(--text-secondary)',
    lineHeight: '1.55',
    margin: 0,
    paddingLeft: '16px'
  }
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
