import type { GameState, EngineStateUpdate } from './Types';
import { GameMap } from './Map';
import { Player } from './Player';
import { projectilesManager } from './Projectiles';
import { basesManager } from './Bases';
import { enemiesManager } from './Enemies';
import { sound } from './Sound';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  
  // Game Entities
  map!: GameMap;
  player!: Player;

  // Viewport / Camera
  cameraX: number = 0;
  cameraY: number = 0;
  screenWidth: number = 800;
  screenHeight: number = 600;

  // Game Settings & State
  gameState: GameState = 'MENU';
  selectedBiome: string = 'FOREST';
  
  // Input Handling
  keys: Record<string, boolean> = {};
  mouseX: number = 0;
  mouseY: number = 0;
  mouseClicked: boolean = false;

  // UI Callback
  onStateUpdate: (state: EngineStateUpdate) => void;

  constructor(canvas: HTMLCanvasElement, onStateUpdate: (state: EngineStateUpdate) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D Canvas context');
    }
    this.ctx = context;
    this.onStateUpdate = onStateUpdate;
    this.resizeCanvas();
    this.setupInputListeners();
  }

  resizeCanvas() {
    this.screenWidth = this.canvas.parentElement?.clientWidth || window.innerWidth;
    this.screenHeight = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.canvas.width = this.screenWidth;
    this.canvas.height = this.screenHeight;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.key === 'Shift') {
      e.preventDefault(); // stop browser scroll
    }
    if (e.key === 'q' || e.key === 'Q') {
      this.player?.cycleWeapon();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) { // left click
      if (e.target === this.canvas) {
        this.mouseClicked = true;
      }
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseClicked = false;
    }
  };

  private handleBlur = () => {
    this.keys = {};
    this.mouseClicked = false;
  };

  private setupInputListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('blur', this.handleBlur);
  }

  cleanup() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  // Starts the playing phase
  start(biome: string) {
    this.selectedBiome = biome;
    this.map = new GameMap(biome);
    
    // Set player spawn coordinates centered in tile (3, 3)
    const spawnX = 3 * this.map.tileSize + this.map.tileSize / 2;
    const spawnY = 3 * this.map.tileSize + this.map.tileSize / 2;
    
    this.player = new Player(spawnX, spawnY);
    this.cameraX = this.player.x - this.screenWidth / 2;
    this.cameraY = this.player.y - this.screenHeight / 2;

    // Reset Managers
    projectilesManager.projectiles = [];
    projectilesManager.particles = [];
    basesManager.reset();
    enemiesManager.reset();

    this.gameState = 'PLAYING';
    this.lastTime = performance.now();
    
    // Stop any running loop first
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.gameState = 'MENU';
  }

  private loop(timestamp: number) {
    if (this.gameState !== 'PLAYING') return;

    let dt = timestamp - this.lastTime;
    // Cap delta time to prevent massive teleports/skips during frame lags
    if (dt > 100) dt = 16.66;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number) {
    // 1. Process player WASD movement vector
    let moveX = 0;
    let moveY = 0;
    if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    // 2. Dash Action (Space or Shift key triggers)
    if (this.keys['shift'] || this.keys[' ']) {
      this.player.triggerDash(moveX, moveY);
    }

    this.player.update(dt, moveX, moveY, this.map);
    this.player.updateAimAngle(this.mouseX, this.mouseY, this.cameraX, this.cameraY);

    // 3. Handle Weapon Shooting
    if (this.mouseClicked && !this.player.isDead) {
      const now = performance.now();
      const weapon = this.player.weapons[this.player.currentWeaponType];
      
      if (now - this.player.lastShotTime >= weapon.fireRate) {
        if (weapon.ammo > 0) {
          this.player.lastShotTime = now;
          if (weapon.ammo !== Infinity) {
            weapon.ammo--;
          }

          // Trigger sound
          sound.playShoot();

          // Spawn Bullet
          const muzzleOffset = this.player.radius + 4;
          const bulletSpawnX = this.player.x + Math.cos(this.player.angle) * muzzleOffset;
          const bulletSpawnY = this.player.y + Math.sin(this.player.angle) * muzzleOffset;

          if (this.player.currentWeaponType === 'SHOTGUN') {
            projectilesManager.spawnShotgun(
              bulletSpawnX,
              bulletSpawnY,
              this.player.angle,
              weapon.damage,
              true
            );
          } else if (this.player.currentWeaponType === 'PLASMA_RIFLE') {
            // Rapid Plasma Repeater fires slightly larger glowing projectlies
            projectilesManager.spawnBullet(
              bulletSpawnX,
              bulletSpawnY,
              this.player.angle,
              15, // fast speed
              weapon.damage,
              true,
              '#00f2fe',
              5
            );
          } else {
            // Laser Pistol
            projectilesManager.spawnBullet(
              bulletSpawnX,
              bulletSpawnY,
              this.player.angle,
              14,
              weapon.damage,
              true,
              '#39ff14',
              3.5
            );
          }
        }
      }
    }

    // 4. Update Bases Capturing states
    const { activeBase } = basesManager.update(
      dt,
      this.player.x,
      this.player.y,
      enemiesManager.enemies,
      // onCreditsEarned callback
      (amount) => {
        this.player.credits += amount;
      },
      // onSpawnDefender callback
      (x, y) => {
        enemiesManager.spawnDefender(x, y);
      }
    );

    // 5. Update Enemies
    // Prepare player as a target object
    const playerTarget = {
      x: this.player.x,
      y: this.player.y,
      takeDamage: (dmg: number) => this.player.takeDamage(dmg),
      radius: this.player.radius,
      isDead: this.player.isDead
    };
    enemiesManager.update(dt, this.map, playerTarget);

    // 6. Update Projectiles
    // Gather all valid hit targets (player and enemies)
    const targets = enemiesManager.enemies.map(e => ({
      x: e.x,
      y: e.y,
      radius: e.radius,
      takeDamage: (dmg: number) => e.takeDamage(dmg),
      isPlayer: e.isFriendly // if friendly defender, it counts as player side
    }));
    targets.push({
      x: this.player.x,
      y: this.player.y,
      radius: this.player.radius,
      takeDamage: (dmg: number) => this.player.takeDamage(dmg),
      isPlayer: true
    });

    projectilesManager.update(dt, this.map, targets);

    // 7. Update camera position to center on player smoothly (LERP)
    const targetCamX = this.player.x - this.screenWidth / 2;
    const targetCamY = this.player.y - this.screenHeight / 2;
    this.cameraX += (targetCamX - this.cameraX) * 0.1;
    this.cameraY += (targetCamY - this.cameraY) * 0.1;

    // Constrain camera within map borders
    const mapMaxW = this.map.width * this.map.tileSize;
    const mapMaxH = this.map.height * this.map.tileSize;
    this.cameraX = Math.max(0, Math.min(this.cameraX, mapMaxW - this.screenWidth));
    this.cameraY = Math.max(0, Math.min(this.cameraY, mapMaxH - this.screenHeight));

    // 8. Raycast Visibility Fog of War updates
    this.map.updateVisibility(
      this.player.x,
      this.player.y,
      basesManager.getPositionsForFog()
    );

    // 9. Check Game State Conditions (Victory vs Defeat)
    if (this.player.isDead) {
      this.gameState = 'GAMEOVER';
    } else {
      // Victory if player captures all bases (total bases count = bases length)
      const playerBases = basesManager.bases.filter(b => b.faction === 'PLAYER').length;
      if (playerBases === basesManager.bases.length) {
        this.gameState = 'VICTORY';
      }
    }

    // 10. Call state update for React HUD
    const activeCapture = activeBase ? {
      name: activeBase.name,
      progress: activeBase.progress,
      faction: activeBase.faction
    } : null;

    this.onStateUpdate({
      stats: this.player.getStats(
        basesManager.bases.filter(b => b.faction === 'PLAYER').length,
        basesManager.bases.length
      ),
      gameState: this.gameState,
      selectedBiome: this.selectedBiome,
      activeCaptureProgress: activeCapture
    });
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

    // 1. Draw Map Tiles and fog
    this.map.draw(this.ctx, this.cameraX, this.cameraY, this.screenWidth, this.screenHeight, this.selectedBiome);

    // 2. Draw Capture Outposts
    basesManager.draw(this.ctx, this.cameraX, this.cameraY);

    // 3. Draw Enemies and friendly defenders
    enemiesManager.draw(this.ctx, this.cameraX, this.cameraY, this.map);

    // 4. Draw Player character
    this.player.draw(this.ctx, this.cameraX, this.cameraY);

    // 5. Draw active bullets and particle sparks
    projectilesManager.draw(this.ctx, this.cameraX, this.cameraY);

    // 6. Draw visual boundary grid markers on visible tiles (grid lining detail)
    this.drawGridOverlay();

    // 7. Draw Tactical Satellite Radar Minimap
    this.drawRadarMinimap();
  }

  // Subtle grid overlays matching Athena Crisis grid styling
  private drawGridOverlay() {
    const ts = this.map.tileSize;
    const startTileX = Math.max(0, Math.floor(this.cameraX / ts));
    const endTileX = Math.min(this.map.width - 1, Math.floor((this.cameraX + this.screenWidth) / ts));
    const startTileY = Math.max(0, Math.floor(this.cameraY / ts));
    const endTileY = Math.min(this.map.height - 1, Math.floor((this.cameraY + this.screenHeight) / ts));

    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.035)'; // very faint cyan grid lines
    this.ctx.lineWidth = 1;

    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        if (this.map.visibility[y][x] > 0) {
          const screenX = x * ts - this.cameraX;
          const screenY = y * ts - this.cameraY;
          this.ctx.strokeRect(screenX, screenY, ts, ts);
        }
      }
    }
  }

  // Circular Sci-Fi Radar Minimap showing bases, player aim, and visible enemies
  private drawRadarMinimap() {
    const r = 55; // radius
    const cx = this.screenWidth - 85;
    const cy = 135;

    this.ctx.save();
    
    // Create circular clipping path for minimap layout content
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.clip();

    // Background fill
    this.ctx.fillStyle = 'rgba(12, 14, 24, 0.85)';
    this.ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Scale map to fit in radar (leaving 5px borders)
    const tileSizeMinimap = (r * 2 - 10) / this.map.width;
    const startX = cx - (this.map.width * tileSizeMinimap) / 2;
    const startY = cy - (this.map.height * tileSizeMinimap) / 2;

    // 1. Draw Explored Map Grid
    for (let ty = 0; ty < this.map.height; ty++) {
      for (let tx = 0; tx < this.map.width; tx++) {
        const vis = this.map.visibility[ty][tx];
        if (vis > 0) {
          const tile = this.map.tiles[ty][tx];
          const tileX = startX + tx * tileSizeMinimap;
          const tileY = startY + ty * tileSizeMinimap;

          if (tile === 'WALL') {
            this.ctx.fillStyle = vis === 2 ? '#4b5563' : '#1f2937';
          } else if (tile === 'WATER') {
            this.ctx.fillStyle = vis === 2 ? '#0f326b' : '#051838';
          } else if (tile === 'ROAD') {
            this.ctx.fillStyle = vis === 2 ? '#2d2e38' : '#14151b';
          } else {
            this.ctx.fillStyle = vis === 2 ? '#182c18' : '#0a140a';
          }
          this.ctx.fillRect(tileX, tileY, tileSizeMinimap, tileSizeMinimap);
        }
      }
    }

    // 2. Draw Capture Bases
    basesManager.bases.forEach(base => {
      const tx = Math.floor(base.x / this.map.tileSize);
      const ty = Math.floor(base.y / this.map.tileSize);

      if (this.map.visibility[ty][tx] > 0) {
        const bx = startX + tx * tileSizeMinimap + tileSizeMinimap / 2;
        const by = startY + ty * tileSizeMinimap + tileSizeMinimap / 2;

        let baseColor = '#64748b'; // neutral grey
        if (base.faction === 'PLAYER') baseColor = '#00f2fe';
        else if (base.faction === 'ENEMY') baseColor = '#ff0055';

        this.ctx.fillStyle = baseColor;
        this.ctx.beginPath();
        this.ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Contested flash ring
        if (base.progress > 0 && base.progress < 100) {
          this.ctx.strokeStyle = base.capturingFaction === 'PLAYER' ? '#00f2fe' : '#ff0055';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.arc(bx, by, 5.5 + Math.sin(Date.now() / 150) * 1.5, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }
    });

    // 3. Draw Active Enemies (only if visible under fog of war level 2)
    enemiesManager.enemies.forEach(e => {
      const tx = Math.floor(e.x / this.map.tileSize);
      const ty = Math.floor(e.y / this.map.tileSize);

      if (this.map.visibility[ty][tx] === 2 && !e.isDead) {
        const ex = startX + tx * tileSizeMinimap + tileSizeMinimap / 2;
        const ey = startY + ty * tileSizeMinimap + tileSizeMinimap / 2;

        this.ctx.fillStyle = e.isFriendly ? '#39ff14' : '#ff0055';
        this.ctx.beginPath();
        this.ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // 4. Draw Player Beacon
    const pTx = Math.floor(this.player.x / this.map.tileSize);
    const pTy = Math.floor(this.player.y / this.map.tileSize);
    const px = startX + pTx * tileSizeMinimap + tileSizeMinimap / 2;
    const py = startY + pTy * tileSizeMinimap + tileSizeMinimap / 2;

    const blink = Math.abs(Math.sin(Date.now() / 200));
    this.ctx.fillStyle = `rgba(0, 242, 254, ${0.4 + blink * 0.6})`;
    this.ctx.beginPath();
    this.ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Aim Line Vector
    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.85)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(px, py);
    this.ctx.lineTo(px + Math.cos(this.player.angle) * 8, py + Math.sin(this.player.angle) * 8);
    this.ctx.stroke();

    this.ctx.restore(); // restore clipping

    // 5. Draw Outer Radar Ring Overlays
    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.stroke();

    // Ticks Ring
    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
    this.ctx.setLineDash([2, 6]);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 6. Draw Circular Grid Lines inside Radar
    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2);
    this.ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(cx - r, cy);
    this.ctx.lineTo(cx + r, cy);
    this.ctx.moveTo(cx, cy - r);
    this.ctx.lineTo(cx, cy + r);
    this.ctx.stroke();

    // 7. Radar Sweeper Line Animation
    const sweepAngle = (Date.now() / 800) % (Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
    this.ctx.stroke();

    // Label
    this.ctx.fillStyle = 'rgba(0, 242, 254, 0.65)';
    this.ctx.font = 'bold 9px "Share Tech Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SATELLITE RADAR', cx, cy - r - 8);
  }
}
