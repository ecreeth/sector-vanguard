import type { TileType } from './Types';

export class GameMap {
  width: number;
  height: number;
  tileSize: number = 64; // px size per tile
  tiles: TileType[][] = [];
  visibility: number[][] = []; // 0 = fog, 1 = explored (grey), 2 = currently visible

  constructor(biome: string) {
    this.width = 40; // 40 tiles wide
    this.height = 40; // 40 tiles high
    this.generateMap(biome);
  }

  private generateMap(biome: string) {
    // Initialize tiles
    this.tiles = Array(this.height).fill(null).map(() => Array(this.width).fill('GRASS'));
    this.visibility = Array(this.height).fill(null).map(() => Array(this.width).fill(0));

    // Base fill depending on biome
    let defaultFill: TileType = 'GRASS';
    if (biome === 'WASTELAND') {
      defaultFill = 'ROAD'; // asphalt ground
    } else if (biome === 'TUNDRA') {
      defaultFill = 'GRASS'; // snow field
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = defaultFill;
      }
    }

    // Generate elements: Walls, Rivers (Water), Roads, and Forests
    // 1. Rivers / Water canals
    this.generateRivers();

    // 2. Road systems (connecting the map)
    this.generateRoads();

    // 3. Forests / Tall Grass (for hiding/cover)
    this.generateForests();

    // 4. Wall clusters (cover)
    this.generateWalls();

    // 5. Border walls
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
          this.tiles[y][x] = 'WALL';
        }
      }
    }
  }

  private generateRivers() {
    const waterTile = 'WATER';
    // Single horizontal river in the middle
    const riverY = Math.floor(this.height / 2);
    for (let x = 0; x < this.width; x++) {
      // Wavy river path
      const offset = Math.floor(Math.sin(x / 4) * 2);
      const y = riverY + offset;
      this.tiles[y][x] = waterTile;
      this.tiles[y + 1][x] = waterTile; // 2 tiles wide
    }

    // Add a vertical river canal branching off
    const riverX = Math.floor(this.width / 3);
    for (let y = 0; y < this.height; y++) {
      const offset = Math.floor(Math.sin(y / 6) * 1.5);
      const x = riverX + offset;
      if (this.tiles[y][x] !== 'WALL') {
        this.tiles[y][x] = waterTile;
      }
    }
  }

  private generateRoads() {
    // Road crossing the river (bridges will be handled automatically since roads cross water)
    const roadY = Math.floor(this.height / 3);
    const roadX = Math.floor(this.width * 0.7);

    // Horizontal main road
    for (let x = 0; x < this.width; x++) {
      this.tiles[roadY][x] = 'ROAD';
    }

    // Vertical main road
    for (let y = 0; y < this.height; y++) {
      this.tiles[y][roadX] = 'ROAD';
    }

    // Bridges (road-over-water intersections)
    // If a road crosses water, it acts as a bridge (which speeds up movement and is crossable)
    // We will represent bridge tiles as 'ROAD'
  }

  private generateForests() {
    const forestTile = 'FOREST';
    // Generate several forest/tall grass clusters
    const clustersCount = 12;
    for (let c = 0; c < clustersCount; c++) {
      const startX = Math.floor(Math.random() * (this.width - 6)) + 3;
      const startY = Math.floor(Math.random() * (this.height - 6)) + 3;
      const radius = Math.floor(Math.random() * 3) + 2;

      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          if (x*x + y*y <= radius*radius) {
            const targetX = startX + x;
            const targetY = startY + y;
            if (this.inBounds(targetX, targetY) && this.tiles[targetY][targetX] === 'GRASS') {
              this.tiles[targetY][targetX] = forestTile;
            }
          }
        }
      }
    }
  }

  private generateWalls() {
    // Wall clusters for tactical gunfight cover
    const wallCount = 35;
    for (let i = 0; i < wallCount; i++) {
      const startX = Math.floor(Math.random() * (this.width - 8)) + 4;
      const startY = Math.floor(Math.random() * (this.height - 8)) + 4;
      
      // Horizontal or vertical wall segments of length 3-5
      const isHorizontal = Math.random() > 0.5;
      const length = Math.floor(Math.random() * 3) + 2;

      for (let l = 0; l < length; l++) {
        const tx = startX + (isHorizontal ? l : 0);
        const ty = startY + (isHorizontal ? 0 : l);
        
        if (this.inBounds(tx, ty)) {
          // Check proximity to bases to avoid spawning walls inside capture zones
          const bases = [
            { x: 32, y: 8 },   // Base Alpha
            { x: 8, y: 32 },   // Base Beta
            { x: 20, y: 20 },  // Base Gamma
            { x: 32, y: 32 }   // Base Delta
          ];

          let nearBase = false;
          for (const b of bases) {
            const dx = tx - b.x;
            const dy = ty - b.y;
            if (dx*dx + dy*dy < 4*4) { // 4 tiles radius clearance
              nearBase = true;
              break;
            }
          }

          // Check proximity to player spawn (3, 3)
          const dxSpawn = tx - 3;
          const dySpawn = ty - 3;
          if (dxSpawn*dxSpawn + dySpawn*dySpawn < 3*3) {
            nearBase = true;
          }

          if (nearBase) continue; // skip wall placement near strategic positions

          // Avoid overwriting roads or water (let's keep roads clear)
          if (this.tiles[ty][tx] !== 'ROAD' && this.tiles[ty][tx] !== 'WATER') {
            this.tiles[ty][tx] = 'WALL';
          }
        }
      }
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // Check if coordinates collide with solid tiles (Walls)
  collides(px: number, py: number, radius: number): boolean {
    const startTileX = Math.floor((px - radius) / this.tileSize);
    const endTileX = Math.floor((px + radius) / this.tileSize);
    const startTileY = Math.floor((py - radius) / this.tileSize);
    const endTileY = Math.floor((py + radius) / this.tileSize);

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        if (!this.inBounds(tx, ty)) return true; // Collide with outer edge
        if (this.tiles[ty][tx] === 'WALL') {
          // Circle AABB collision check
          const tileLeft = tx * this.tileSize;
          const tileTop = ty * this.tileSize;
          
          // Closest point on tile to circle
          const closestX = Math.max(tileLeft, Math.min(px, tileLeft + this.tileSize));
          const closestY = Math.max(tileTop, Math.min(py, tileTop + this.tileSize));

          const distSquare = (px - closestX) ** 2 + (py - closestY) ** 2;
          if (distSquare < radius * radius) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Check movement factor (e.g. roads = 1.3 speed, water = 0.5 speed, others = 1.0)
  getMovementSpeedFactor(px: number, py: number): number {
    const tx = Math.floor(px / this.tileSize);
    const ty = Math.floor(py / this.tileSize);
    if (!this.inBounds(tx, ty)) return 1.0;
    
    switch (this.tiles[ty][tx]) {
      case 'ROAD': return 1.35; // Fast road
      case 'WATER': return 0.45; // Slow swamp/water
      default: return 1.0;
    }
  }

  // Update visibility based on player position and fog clearing rules
  updateVisibility(playerX: number, playerY: number, basePositions: {x: number, y: number, isPlayerFaction: boolean}[]) {
    // 1. Decay current visible tiles (2) to explored (1)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.visibility[y][x] === 2) {
          this.visibility[y][x] = 1;
        }
      }
    }

    // 2. Set tiles near player to visible (2)
    const playerTileX = Math.floor(playerX / this.tileSize);
    const playerTileY = Math.floor(playerY / this.tileSize);
    const visionRadius = 7; // tiles

    for (let dy = -visionRadius; dy <= visionRadius; dy++) {
      for (let dx = -visionRadius; dx <= visionRadius; dx++) {
        if (dx*dx + dy*dy <= visionRadius*visionRadius) {
          const tx = playerTileX + dx;
          const ty = playerTileY + dy;
          if (this.inBounds(tx, ty)) {
            // Check line of sight from player to tile (raycast to avoid seeing through solid walls)
            if (this.hasLineOfSight(playerTileX, playerTileY, tx, ty)) {
              this.visibility[ty][tx] = 2;
            }
          }
        }
      }
    }

    // 3. Set tiles near captured player bases to visible (2)
    const baseVisionRadius = 8;
    basePositions.forEach(base => {
      if (base.isPlayerFaction) {
        const baseTileX = Math.floor(base.x / this.tileSize);
        const baseTileY = Math.floor(base.y / this.tileSize);

        for (let dy = -baseVisionRadius; dy <= baseVisionRadius; dy++) {
          for (let dx = -baseVisionRadius; dx <= baseVisionRadius; dx++) {
            if (dx*dx + dy*dy <= baseVisionRadius*baseVisionRadius) {
              const tx = baseTileX + dx;
              const ty = baseTileY + dy;
              if (this.inBounds(tx, ty)) {
                this.visibility[ty][tx] = 2;
              }
            }
          }
        }
      }
    });
  }

  // Basic line of sight check using Bresenham's algorithm
  private hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (x !== x1 || y !== y1) {
      // Don't block the start and end tiles themselves
      if ((x !== x0 || y !== y0) && (x !== x1 || y !== y1)) {
        if (this.tiles[y][x] === 'WALL') {
          return false;
        }
      }
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return true;
  }

  // Draw the map on the Canvas
  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, screenWidth: number, screenHeight: number, biome: string) {
    const startTileX = Math.max(0, Math.floor(cameraX / this.tileSize));
    const endTileX = Math.min(this.width - 1, Math.floor((cameraX + screenWidth) / this.tileSize));
    const startTileY = Math.max(0, Math.floor(cameraY / this.tileSize));
    const endTileY = Math.min(this.height - 1, Math.floor((cameraY + screenHeight) / this.tileSize));

    // Colors according to biome
    let grassColor = '#131e13';
    let roadColor = '#24252e';
    let waterColor = '#0f2042';
    let wallColor = '#3f4453';
    let wallTopColor = '#505668';
    let forestColor = '#0e290e';
    let forestLeafColor = '#184418';

    if (biome === 'WASTELAND') {
      grassColor = '#1f1a14';
      roadColor = '#171615';
      waterColor = '#152b1b'; // acidic toxic sludge
      wallColor = '#3c2a21';
      wallTopColor = '#4e3629';
      forestColor = '#251b12'; // dry dead wood/barren bushes
      forestLeafColor = '#3a2717';
    } else if (biome === 'TUNDRA') {
      grassColor = '#e2f1f6'; // snow
      roadColor = '#363d4a';
      waterColor = '#052a36'; // icy water
      wallColor = '#46505f';
      wallTopColor = '#6c7a8e';
      forestColor = '#708f9c'; // snowy evergreens
      forestLeafColor = '#94b3be';
    }

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const vis = this.visibility[ty][tx];
        if (vis === 0) {
          // Fog of war
          ctx.fillStyle = '#000000';
          ctx.fillRect(tx * this.tileSize - cameraX, ty * this.tileSize - cameraY, this.tileSize, this.tileSize);
          continue;
        }

        const tile = this.tiles[ty][tx];
        const screenX = tx * this.tileSize - cameraX;
        const screenY = ty * this.tileSize - cameraY;

        // Base tile rendering
        switch (tile) {
          case 'GRASS':
            ctx.fillStyle = grassColor;
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
            
            // Draw subtle grass tufts
            ctx.strokeStyle = biome === 'TUNDRA' ? '#ffffff' : '#1c2f1c';
            ctx.lineWidth = 1;
            if ((tx + ty) % 3 === 0) {
              ctx.beginPath();
              ctx.moveTo(screenX + 16, screenY + 32);
              ctx.lineTo(screenX + 20, screenY + 20);
              ctx.lineTo(screenX + 24, screenY + 32);
              ctx.stroke();
            }
            break;

          case 'ROAD':
            ctx.fillStyle = roadColor;
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
            // Draw yellow dashes in middle for road aesthetics
            ctx.fillStyle = '#4c4228';
            if ((tx % 2 === 0 && ty % 3 === 0) || (ty % 2 === 0 && tx % 3 === 0)) {
              ctx.fillRect(screenX + this.tileSize/2 - 2, screenY + this.tileSize/2 - 8, 4, 16);
            }
            break;

          case 'WATER':
            ctx.fillStyle = waterColor;
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
            // Draw subtle water waves
            ctx.strokeStyle = '#1e3c75';
            ctx.lineWidth = 1.5;
            if ((tx + ty) % 2 === 0) {
              ctx.beginPath();
              ctx.arc(screenX + 32, screenY + 32, 10, 0, Math.PI);
              ctx.stroke();
            }
            break;

          case 'WALL':
            // Draw walls with a 3D block perspective
            ctx.fillStyle = wallColor;
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
            
            // Wall top highlight
            ctx.fillStyle = wallTopColor;
            ctx.fillRect(screenX + 4, screenY + 4, this.tileSize - 8, this.tileSize - 8);
            
            // Outline
            ctx.strokeStyle = '#22252c';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
            break;

          case 'FOREST':
            // Base ground is grass color
            ctx.fillStyle = grassColor;
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

            // Draw forest trees
            ctx.fillStyle = forestColor;
            ctx.beginPath();
            ctx.arc(screenX + 32, screenY + 32, 22, 0, Math.PI * 2);
            ctx.fill();

            // Leaf highlights
            ctx.fillStyle = forestLeafColor;
            ctx.beginPath();
            ctx.arc(screenX + 24, screenY + 24, 12, 0, Math.PI * 2);
            ctx.arc(screenX + 40, screenY + 28, 10, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        // Apply a dark grey cover overlay for explored but not currently visible tiles (fog of war level 1)
        if (vis === 1) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        }
      }
    }
  }
}
