import React, { useState } from 'react';
import type { PlayerStats } from '../game/Types';
import { CAMPAIGN_STAGES_PER_SECTOR } from '../game/Types';
import { Heart, Shield, Users, ChevronRight } from 'lucide-react';

interface TransitionMenuProps {
  stats: PlayerStats;
  selectedBiome: string;
  onContinue: () => void;
  onQuit: () => void;
}

const BIOME_NAMES: Record<string, string> = {
  FOREST: 'FOREST RUINS',
  WASTELAND: 'WASTELAND SLUDGE',
  TUNDRA: 'FROZEN TUNDRA',
  CYBER: 'CYBER-GRID ROAD'
};

export const TransitionMenu: React.FC<TransitionMenuProps> = ({
  stats,
  selectedBiome,
  onContinue,
  onQuit
}) => {
  const [healApplied, setHealApplied] = useState(false);
  const [shieldApplied, setShieldApplied] = useState(false);
  const [defenderHired, setDefenderHired] = useState(false);

  const nextStage = stats.campaignStage + 1;
  const isLastStage = stats.campaignStage >= CAMPAIGN_STAGES_PER_SECTOR;
  const healCost = 80;
  const shieldCost = 60;
  const defenderCost = 120;

  const canHeal = stats.credits >= healCost && !healApplied && stats.health < stats.maxHealth;
  const canShield = stats.credits >= shieldCost && !shieldApplied && stats.shield < stats.maxShield;
  const canHire = stats.credits >= defenderCost && !defenderHired;

  return (
    <div style={styles.overlay} className="fade-in">
      <div style={styles.container} className="hud-panel">
        {/* Terminal Header */}
        <div style={styles.header}>
          <div style={styles.headerLine} />
          <h2 style={styles.title}>SECTOR WARP IN-PROGRESS</h2>
          <div style={styles.subtitle}>
            {BIOME_NAMES[selectedBiome] || selectedBiome} — STAGE {stats.campaignStage} CLEARED
          </div>
          <div style={styles.headerLine} />
        </div>

        {/* Status Output */}
        <div style={styles.terminal}>
          <div style={styles.terminalLine}>
            <span style={styles.prompt}>{'>'}</span>
            <span style={styles.terminalText}>WARP DRIVE CHARGING...</span>
          </div>
          <div style={styles.terminalLine}>
            <span style={styles.prompt}>{'>'}</span>
            <span style={styles.terminalText}>
              NEXT DESTINATION: STAGE {isLastStage ? '5 — SECTOR OVERSEER' : `${nextStage}`}
            </span>
          </div>
          {isLastStage && (
            <div style={styles.terminalLine}>
              <span style={{ ...styles.prompt, color: 'var(--neon-red)' }}>{'!'}</span>
              <span style={{ ...styles.terminalText, color: 'var(--neon-red)' }}>
                WARNING: BOSS ENCOUNTER AHEAD
              </span>
            </div>
          )}
          <div style={styles.terminalLine}>
            <span style={styles.prompt}>{'>'}</span>
            <span style={styles.terminalText}>
              DIFFICULTY SCALE: x{(1.0 + (nextStage - 1) * 0.15).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Stats Summary */}
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <Heart size={14} color="var(--neon-red)" />
            <span style={{ color: 'var(--neon-red)' }}>
              {Math.ceil(stats.health)} / {stats.maxHealth}
            </span>
          </div>
          <div style={styles.statBox}>
            <Shield size={14} color="var(--neon-cyan)" />
            <span style={{ color: 'var(--neon-cyan)' }}>
              {Math.ceil(stats.shield)} / {stats.maxShield}
            </span>
          </div>
          <div style={styles.statBox}>
            <span style={{ color: 'var(--neon-yellow)', fontWeight: 'bold' }}>
              {stats.credits} CR
            </span>
          </div>
        </div>

        {/* Warp Shop */}
        <div style={styles.shopSection}>
          <div style={styles.shopTitle}>WARP SHOP — FIELD REPAIRS & HIRE</div>

          <button
            onClick={() => setHealApplied(true)}
            disabled={!canHeal}
            style={{
              ...styles.shopBtn,
              borderColor: canHeal ? 'var(--neon-red)' : 'var(--border-color)',
              color: canHeal ? 'var(--neon-red)' : 'var(--text-muted)',
              opacity: canHeal ? 1 : 0.4,
              cursor: canHeal ? 'pointer' : 'not-allowed'
            }}
          >
            <Heart size={14} />
            <span>REPAIR HULL — {healCost} CR</span>
            {healApplied && <span style={{ color: 'var(--neon-green)' }}>DONE</span>}
          </button>

          <button
            onClick={() => setShieldApplied(true)}
            disabled={!canShield}
            style={{
              ...styles.shopBtn,
              borderColor: canShield ? 'var(--neon-cyan)' : 'var(--border-color)',
              color: canShield ? 'var(--neon-cyan)' : 'var(--text-muted)',
              opacity: canShield ? 1 : 0.4,
              cursor: canShield ? 'pointer' : 'not-allowed'
            }}
          >
            <Shield size={14} />
            <span>RECHARGE SHIELDS — {shieldCost} CR</span>
            {shieldApplied && <span style={{ color: 'var(--neon-green)' }}>DONE</span>}
          </button>

          <button
            onClick={() => setDefenderHired(true)}
            disabled={!canHire}
            style={{
              ...styles.shopBtn,
              borderColor: canHire ? 'var(--neon-green)' : 'var(--border-color)',
              color: canHire ? 'var(--neon-green)' : 'var(--text-muted)',
              opacity: canHire ? 1 : 0.4,
              cursor: canHire ? 'pointer' : 'not-allowed'
            }}
          >
            <Users size={14} />
            <span>HIRE DEFENDER — {defenderCost} CR</span>
            {defenderHired && <span style={{ color: 'var(--neon-green)' }}>DONE</span>}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            onClick={() => {
              if (healApplied) stats.health = stats.maxHealth;
              if (shieldApplied) stats.shield = stats.maxShield;
              if (defenderHired) stats.credits -= defenderCost;
              if (healApplied) stats.credits -= healCost;
              if (shieldApplied) stats.credits -= shieldCost;
              onContinue();
            }}
            className="sci-fi-button success"
            style={styles.continueBtn}
          >
            <span>WARP TO NEXT SECTOR</span>
            <ChevronRight size={18} />
          </button>

          <button onClick={onQuit} className="sci-fi-button danger" style={styles.quitBtn}>
            ABANDON MISSION
          </button>
        </div>
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
    backgroundColor: 'rgba(5, 6, 11, 0.92)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1500,
    padding: '24px',
    boxSizing: 'border-box'
  },
  container: {
    width: '480px',
    maxWidth: '100%',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 0 40px rgba(0, 242, 254, 0.12)'
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  headerLine: {
    width: '100%',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, var(--neon-cyan), transparent)'
  },
  title: {
    fontFamily: 'var(--font-header)',
    fontSize: '18px',
    fontWeight: 'bold',
    letterSpacing: '3px',
    color: 'var(--neon-cyan)',
    textShadow: '0 0 12px var(--neon-cyan-glow)',
    margin: 0
  },
  subtitle: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    letterSpacing: '1px'
  },
  terminal: {
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(0, 242, 254, 0.15)',
    padding: '10px 12px',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  terminalLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px'
  },
  prompt: {
    color: 'var(--neon-cyan)',
    fontWeight: 'bold'
  },
  terminalText: {
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px'
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px'
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  shopSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  shopTitle: {
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: 'var(--text-muted)',
    borderBottom: '1px dashed var(--border-color)',
    paddingBottom: '4px'
  },
  shopBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid',
    padding: '8px 12px',
    fontFamily: 'var(--font-header)',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '4px'
  },
  continueBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    fontFamily: 'var(--font-header)',
    fontSize: '14px',
    letterSpacing: '2px'
  },
  quitBtn: {
    width: '100%',
    padding: '8px',
    fontFamily: 'var(--font-header)',
    fontSize: '11px',
    letterSpacing: '1px'
  }
};
