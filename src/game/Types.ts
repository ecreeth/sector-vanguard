// Shared types for Sector Vanguard

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export type WeaponType = 'PISTOL' | 'SHOTGUN' | 'PLASMA_RIFLE';

export interface Weapon {
  type: WeaponType;
  name: string;
  damage: number;
  fireRate: number; // millisecond delay between shots
  ammo: number;
  maxAmmo: number;
  unlocked: boolean;
  cost: number;
}

export type TileType = 'GRASS' | 'ROAD' | 'WATER' | 'WALL' | 'FOREST';

export interface GameMapConfig {
  width: number; // number of tiles wide
  height: number; // number of tiles high
  tileSize: number; // size in pixels of each tile
  tiles: TileType[][];
  spawnX: number; // player spawn X in tile coords
  spawnY: number; // player spawn Y in tile coords
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  dashCooldown: number; // 0 to 1 percentage representing progress
  credits: number;
  currentWeapon: WeaponType;
  ammo: number;
  maxAmmo: number;
  weapons: Record<WeaponType, Weapon>;
  capturedBasesCount: number;
  totalBasesCount: number;
  isDead: boolean;
}

export interface EngineStateUpdate {
  stats: PlayerStats;
  gameState: GameState;
  selectedBiome: string;
  activeCaptureProgress: {
    name: string;
    progress: number; // 0 to 100
    faction: 'NEUTRAL' | 'PLAYER' | 'ENEMY';
  } | null;
}
