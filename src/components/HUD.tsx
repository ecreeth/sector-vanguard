import React, { useState } from 'react';
import type { PlayerStats, WeaponType } from '../game/Types';
import { 
  Heart, Shield as ShieldIcon, Zap, Coins, Crosshair, 
  Volume2, VolumeX, ShieldAlert
} from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  activeCapture: {
    name: string;
    progress: number;
    faction: 'NEUTRAL' | 'PLAYER' | 'ENEMY';
  } | null;
  onBuyWeapon: (type: WeaponType) => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  onPause: () => void;
  onQuit: () => void;
  onBuyUpgrade: (type: 'HEALTH' | 'SHIELD' | 'DASH' | 'RICOCHET' | 'PIERCE' | 'PLASMA_BURN') => void;
  onBuildTurret: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  activeCapture,
  onBuyWeapon,
  onToggleSound,
  soundEnabled,
  crtEnabled,
  onToggleCrt,
  onPause,
  onQuit,
  onBuyUpgrade,
  onBuildTurret
}) => {
  const { health, maxHealth, shield, maxShield, dashCooldown, credits, currentWeapon, ammo, maxAmmo, weapons, skills, upgrades } = stats;
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const healthPercent = (health / maxHealth) * 100;
  const shieldPercent = maxShield > 0 ? (shield / maxShield) * 100 : 0;

  return (
    <div style={hudStyles.container} className="hud-root">
      {/* 1. TOP HEADER BAR */}
      <div style={hudStyles.topBar} className="hud-panel">
        {/* Faction/Base Control Counter */}
        <div style={hudStyles.baseCounter}>
          <Crosshair size={18} color="var(--neon-cyan)" style={{ marginRight: 6 }} />
          <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>BASES SECURED:</span>
          <span style={{ 
            color: stats.capturedBasesCount === stats.totalBasesCount ? 'var(--neon-green)' : 'var(--neon-cyan)',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            {stats.capturedBasesCount} / {stats.totalBasesCount}
          </span>
        </div>

        {/* Dynamic Capturing Alert */}
        {activeCapture ? (
          <div style={hudStyles.captureAlert}>
            <ShieldAlert 
              size={18} 
              color={activeCapture.progress > 0 && activeCapture.progress < 100 && activeCapture.faction !== 'PLAYER' ? 'var(--neon-red)' : 'var(--neon-cyan)'} 
              className="blink-anim"
              style={{ marginRight: 8, animation: 'blink 1s infinite' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-primary)', marginRight: 8 }}>
              {activeCapture.name.toUpperCase()}
            </span>
            <div style={hudStyles.captureBarBg}>
              <div 
                style={{
                  ...hudStyles.captureBarFill,
                  width: `${activeCapture.progress}%`,
                  backgroundColor: activeCapture.faction === 'PLAYER' ? 'var(--neon-cyan)' : 'var(--neon-red)'
                }}
              />
            </div>
            <span style={{
              marginLeft: 8, 
              fontWeight: 'bold', 
              fontSize: '14px',
              color: activeCapture.faction === 'PLAYER' ? 'var(--neon-cyan)' : 'var(--neon-red)'
            }}>
              {Math.floor(activeCapture.progress)}%
            </span>
          </div>
        ) : (
          <div style={{ ...hudStyles.captureAlert, color: 'var(--text-muted)' }}>
            SECURE OUTPOSTS TO GAIN TECH CREDITS
          </div>
        )}

        {/* Global Controls */}
        <div style={hudStyles.globalButtons}>
          <button onClick={onPause} style={hudStyles.controlBtn} title="Pause Mission [ESC] / [P]">
            PAUSE
          </button>
          <button onClick={onToggleCrt} style={hudStyles.controlBtn} title="Toggle CRT Screen Scanlines">
            CRT: {crtEnabled ? 'ON' : 'OFF'}
          </button>
          <button onClick={onToggleSound} style={hudStyles.controlBtn}>
            {soundEnabled ? <Volume2 size={16} color="var(--neon-cyan)" /> : <VolumeX size={16} color="var(--text-muted)" />}
          </button>
          <button onClick={onQuit} style={hudStyles.controlBtn}>
            ABANDON MISSION
          </button>
        </div>
      </div>

      {/* 2. LEFT VITALS CARD */}
      {leftCollapsed ? (
        <button
          onClick={() => setLeftCollapsed(false)}
          style={{ ...hudStyles.collapsedTab, left: '16px', top: '80px' }}
          className="hud-panel"
        >
          [ + ] VITALS
        </button>
      ) : (
        <div style={hudStyles.leftCard} className="hud-panel">
          <div style={hudStyles.panelTitle}>
            <span>VITALS ANALYSIS</span>
            <button 
              onClick={() => setLeftCollapsed(true)} 
              style={hudStyles.collapseBtn}
            >
              [ MINIMIZE ]
            </button>
          </div>
          
          {/* Health */}
          <div style={hudStyles.vitalRow}>
            <div style={hudStyles.vitalHeader}>
              <Heart size={14} color="var(--neon-red)" style={{ marginRight: 6 }} />
              <span>CORE INTEGRITY</span>
              <span style={{ marginLeft: 'auto', color: 'var(--neon-red)', fontWeight: 'bold' }}>
                {health} / {maxHealth}
              </span>
            </div>
            <div style={hudStyles.vitalBarBg}>
              <div style={{ ...hudStyles.vitalBarFill, width: `${healthPercent}%`, backgroundColor: 'var(--neon-red)' }} />
            </div>
          </div>

          {/* Shield */}
          <div style={hudStyles.vitalRow}>
            <div style={hudStyles.vitalHeader}>
              <ShieldIcon size={14} color="var(--neon-cyan)" style={{ marginRight: 6 }} />
              <span>SHIELD MATRIX</span>
              <span style={{ marginLeft: 'auto', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                {shield} / {maxShield}
              </span>
            </div>
            <div style={hudStyles.vitalBarBg}>
              <div style={{ ...hudStyles.vitalBarFill, width: `${shieldPercent}%`, backgroundColor: 'var(--neon-cyan)' }} />
            </div>
          </div>

          {/* Dash */}
          <div style={hudStyles.vitalRow}>
            <div style={hudStyles.vitalHeader}>
              <Zap size={14} color={dashCooldown === 0 ? 'var(--neon-green)' : 'var(--neon-yellow)'} style={{ marginRight: 6 }} />
              <span>THRUSTER BOOST (SHIFT)</span>
              <span style={{ 
                marginLeft: 'auto', 
                color: dashCooldown === 0 ? 'var(--neon-green)' : 'var(--neon-yellow)',
                fontWeight: 'bold'
              }}>
                {dashCooldown === 0 ? 'READY' : 'CHARGING'}
              </span>
            </div>
            <div style={hudStyles.vitalBarBg}>
              <div 
                style={{ 
                  ...hudStyles.vitalBarFill, 
                  width: `${dashCooldown === 0 ? 100 : (1 - dashCooldown) * 100}%`, 
                  backgroundColor: dashCooldown === 0 ? 'var(--neon-green)' : 'var(--neon-yellow)' 
                }} 
              />
            </div>
          </div>

          {/* Tech Credits */}
          <div style={hudStyles.creditsDisplay}>
            <Coins size={16} color="var(--neon-yellow)" style={{ marginRight: 6 }} />
            <span>TECH CREDITS:</span>
            <span style={hudStyles.creditsAmount}>{credits} CR</span>
          </div>

          {/* Command Terminal Upgrades */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 6 }}>
              COMMAND TERMINAL
            </div>
            {([
              { type: 'HEALTH' as const, label: 'MAX HP', lvl: upgrades.healthLvl, cost: upgrades.healthCost, color: 'var(--neon-red)', max: 4 },
              { type: 'SHIELD' as const, label: 'MAX SHIELD', lvl: upgrades.shieldLvl, cost: upgrades.shieldCost, color: 'var(--neon-cyan)', max: 4 },
              { type: 'DASH' as const, label: 'DASH CDR', lvl: upgrades.dashLvl, cost: upgrades.dashCost, color: 'var(--neon-green)', max: 4 },
              { type: 'RICOCHET' as const, label: 'RICOCHET MOD', lvl: upgrades.ricochetLvl, cost: upgrades.ricochetCost, color: '#c084fc', max: 2 },
              { type: 'PIERCE' as const, label: 'PIERCE MOD', lvl: upgrades.pierceLvl, cost: upgrades.pierceCost, color: '#ffb703', max: 2 },
              { type: 'PLASMA_BURN' as const, label: 'PLASMA BURN DoT', lvl: upgrades.plasmaBurnLvl, cost: upgrades.plasmaBurnCost, color: '#f97316', max: 2 }
            ]).map(u => (
              <div key={u.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '11px', color: u.color, fontWeight: 'bold' }}>{u.label}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {'▰'.repeat(u.lvl)}{'▱'.repeat(u.max - u.lvl)}
                  </span>
                </div>
                {u.lvl < u.max ? (
                  <button
                    onClick={() => onBuyUpgrade(u.type)}
                    disabled={credits < u.cost}
                    style={{
                      ...hudStyles.shopBuyBtn,
                      borderColor: u.color,
                      color: u.color,
                      opacity: credits >= u.cost ? 1 : 0.35,
                      cursor: credits >= u.cost ? 'pointer' : 'not-allowed',
                      fontSize: '10px',
                      padding: '2px 7px'
                    }}
                  >
                    {u.cost} CR
                  </button>
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--neon-green)', fontWeight: 'bold' }}>MAX</span>
                )}
              </div>
            ))}
          </div>

          {/* Build Turret Button */}
          <button
            onClick={onBuildTurret}
            disabled={credits < 200}
            style={{
              ...hudStyles.shopBuyBtn,
              width: '100%',
              padding: '6px 0',
              borderColor: credits >= 200 ? '#f97316' : 'var(--border-color)',
              color: credits >= 200 ? '#f97316' : 'var(--text-muted)',
              cursor: credits >= 200 ? 'pointer' : 'not-allowed',
              opacity: credits >= 200 ? 1 : 0.4,
              fontSize: '11px',
              letterSpacing: '1px',
              marginTop: 4,
              textAlign: 'center'
            }}
          >
            🔫 BUILD BASE TURRET — 200 CR
          </button>
        </div>
      )}

      {/* 3. BOTTOM CENTER SKILLS HOTBAR */}
      <div style={hudStyles.skillsBar} className="hud-panel">
        {([
          { key: '1', label: 'EMP BLAST', cd: skills.empCooldown, cost: skills.empCost, color: '#00f2fe' },
          { key: '2', label: 'AIRSTRIKE', cd: skills.airstrikeCooldown, cost: skills.airstrikeCost, color: '#ff6b35' },
          { key: '3', label: 'REPAIR DRONE', cd: skills.droneCooldown, cost: skills.droneCost, color: '#39ff14' },
          { key: '4', label: 'DECOY MECH', cd: skills.decoyCooldown, cost: skills.decoyCost, color: '#c084fc' }
        ]).map(skill => {
          const isReady = skill.cd <= 0;
          const canAfford = credits >= skill.cost;
          const usable = isReady && canAfford;
          return (
            <div key={skill.key} style={{
              ...hudStyles.skillSlot,
              borderColor: usable ? skill.color : 'rgba(255,255,255,0.08)',
              boxShadow: usable ? `0 0 8px ${skill.color}40` : 'none',
              opacity: usable ? 1 : 0.55
            }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: skill.color, lineHeight: 1 }}>[{skill.key}]</div>
              <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-primary)', marginTop: 2 }}>
                {skill.label}
              </div>
              {!isReady ? (
                <div style={{ fontSize: '10px', color: 'var(--neon-yellow)', marginTop: 2 }}>
                  {Math.ceil(skill.cd * 100)}%
                </div>
              ) : (
                <div style={{ fontSize: '10px', color: canAfford ? skill.color : 'var(--neon-red)', marginTop: 2 }}>
                  {skill.cost} CR
                </div>
              )}
              {/* Cooldown sweep overlay */}
              {!isReady && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: `${Math.min(100, skill.cd * 100)}%`,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: '4px',
                  pointerEvents: 'none'
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* 4. BOSS HEALTH BAR (shown only when boss is active) */}
      {stats.bossActive && stats.bossMaxHp > 0 && (
        <div style={hudStyles.bossBar} className="hud-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ 
              fontSize: '13px', 
              fontWeight: 'bold', 
              letterSpacing: '2px',
              color: '#ef4444',
              textShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
            }}>
              ⚠ SECTOR OVERSEER
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '10px',
            backgroundColor: '#0c0d14',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '5px',
            overflow: 'hidden',
            marginTop: 5
          }}>
            <div style={{
              height: '100%',
              width: `${(stats.bossHp / stats.bossMaxHp) * 100}%`,
              background: stats.bossHp > stats.bossMaxHp * 0.3
                ? 'linear-gradient(90deg, #ef4444, #f97316)'
                : 'linear-gradient(90deg, #dc2626, #b91c1c)',
              borderRadius: '5px',
              transition: 'width 0.15s linear',
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)'
            }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#fca5a5', marginTop: 3, fontWeight: 'bold' }}>
            {stats.bossHp} / {stats.bossMaxHp} HP
          </div>
        </div>
      )}

      {/* 5. BOTTOM RIGHT SHOP & WEAPONS CARD */}
      {rightCollapsed ? (
        <button
          onClick={() => setRightCollapsed(false)}
          style={{ ...hudStyles.collapsedTab, right: '16px', bottom: '16px' }}
          className="hud-panel"
        >
          [ + ] WEAPONS
        </button>
      ) : (
        <div style={hudStyles.rightCard} className="hud-panel">
          <div style={hudStyles.panelTitle}>
            <span>TACTICAL WEAPON LOADOUT</span>
            <button 
              onClick={() => setRightCollapsed(true)} 
              style={hudStyles.collapseBtn}
            >
              [ MINIMIZE ]
            </button>
          </div>

          {/* Active Weapon */}
          <div style={hudStyles.activeWeaponArea}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>EQUIPPED WEAPON</div>
            <div style={hudStyles.activeWeaponName}>{weapons[currentWeapon].name}</div>
            <div style={hudStyles.ammoDisplay}>
              AMMO:{' '}
              <span style={{ color: ammo > 0 ? '#ffffff' : 'var(--neon-red)', fontSize: '20px', fontWeight: 'bold' }}>
                {ammo === Infinity ? '∞' : ammo}
              </span>
              {ammo !== Infinity && <span style={{ color: 'var(--text-muted)' }}> / {maxAmmo}</span>}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: 4 }}>
              PRESS [Q] TO CYCLE WEAPONS
            </div>
          </div>

          {/* Weapons Shop */}
          <div style={hudStyles.shopArea}>
            <div style={hudStyles.shopTitle}>ARMORY ACQUISITIONS</div>
            
            {(['SHOTGUN', 'PLASMA_RIFLE'] as WeaponType[]).map(wType => {
              const wep = weapons[wType];
              const cost = wep.unlocked ? Math.floor(wep.cost * 0.15) : wep.cost;
              const canAfford = credits >= cost;

              return (
                <div key={wType} style={hudStyles.shopItem}>
                  <div style={hudStyles.shopItemText}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{wep.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {wep.unlocked ? 'Ammo Refill' : 'Unlock Weapon'}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onBuyWeapon(wType)}
                    disabled={!canAfford}
                    style={{
                      ...hudStyles.shopBuyBtn,
                      borderColor: wep.unlocked ? 'var(--neon-green)' : 'var(--neon-yellow)',
                      color: wep.unlocked ? 'var(--neon-green)' : 'var(--neon-yellow)',
                      opacity: canAfford ? 1 : 0.4,
                      cursor: canAfford ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {cost} CR
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const hudStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none', // Allow clicks to pass through to the game canvas below
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '16px',
    boxSizing: 'border-box'
  },
  topBar: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    pointerEvents: 'auto', // Enable buttons
    height: '48px'
  },
  baseCounter: {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    letterSpacing: '1px'
  },
  captureAlert: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '13px',
    letterSpacing: '1px',
    flex: 1,
    margin: '0 24px'
  },
  captureBarBg: {
    width: '120px',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  captureBarFill: {
    height: '100%',
    transition: 'width 0.1s linear'
  },
  globalButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  controlBtn: {
    background: 'rgba(0, 242, 254, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--neon-cyan)',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: 'var(--font-header)',
    fontWeight: 'bold',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  leftCard: {
    position: 'absolute',
    left: '16px',
    top: '80px',
    width: '260px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    pointerEvents: 'auto'
  },
  panelTitle: {
    fontFamily: 'var(--font-header)',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    color: 'var(--neon-cyan)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '4px',
    marginBottom: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },
  collapsedTab: {
    position: 'absolute',
    padding: '8px 14px',
    fontSize: '11px',
    fontWeight: 'bold',
    fontFamily: 'var(--font-header)',
    color: 'var(--neon-cyan)',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    pointerEvents: 'auto',
    borderRadius: '4px',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
    transition: 'all 0.2s',
    letterSpacing: '1px'
  },
  collapseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '10px',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    padding: '0 4px',
    transition: 'color 0.2s'
  },
  vitalRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  vitalHeader: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    letterSpacing: '1px',
    color: 'var(--text-secondary)'
  },
  vitalBarBg: {
    width: '100%',
    height: '8px',
    backgroundColor: '#0c0d14',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  vitalBarFill: {
    height: '100%',
    borderRadius: '4px'
  },
  creditsDisplay: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '4px',
    borderTop: '1px dashed var(--border-color)',
    paddingTop: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)'
  },
  creditsAmount: {
    marginLeft: 'auto',
    color: 'var(--neon-yellow)',
    fontSize: '16px',
    textShadow: '0 0 5px var(--neon-yellow-glow)'
  },
  rightCard: {
    position: 'absolute',
    right: '16px',
    bottom: '16px',
    width: '290px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    pointerEvents: 'auto'
  },
  activeWeaponArea: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    padding: '8px 12px',
    borderRadius: '4px'
  },
  activeWeaponName: {
    fontFamily: 'var(--font-header)',
    fontSize: '15px',
    fontWeight: 'bold',
    color: 'var(--neon-cyan)',
    margin: '2px 0'
  },
  ammoDisplay: {
    fontSize: '13px',
    color: 'var(--text-primary)'
  },
  shopArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  shopTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: 'var(--text-muted)',
    borderBottom: '1px dashed var(--border-color)',
    paddingBottom: '3px'
  },
  shopItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.01)',
    padding: '4px 6px',
    borderRadius: '2px'
  },
  shopItemText: {
    display: 'flex',
    flexDirection: 'column'
  },
  shopBuyBtn: {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid',
    padding: '4px 10px',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 'bold',
    borderRadius: '2px',
    transition: 'all 0.2s'
  },

  // Skills Hotbar
  skillsBar: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '10px',
    padding: '8px 14px',
    pointerEvents: 'auto'
  },
  skillSlot: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '76px',
    height: '65px',
    border: '1px solid',
    borderRadius: '5px',
    background: 'rgba(0, 0, 0, 0.45)',
    overflow: 'hidden',
    transition: 'all 0.2s'
  },

  // Boss Health Bar
  bossBar: {
    position: 'absolute',
    top: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '360px',
    padding: '8px 16px',
    pointerEvents: 'none'
  }
};
