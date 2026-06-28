# 🛡️ SECTOR VANGUARD: Tactical Grid Shooter

**Sector Vanguard** is a real-time, top-down strategic action shooter built on **React, TypeScript, Vite, and Web Audio API synthesis**. As a Tactical Commando Mech pilot, drop into contested biomes, capture key communications outposts to clear the Fog of War, construct automatic grid defense turrets, and coordinate support skills to eliminate the **Sector Overseer Command Boss Mech**.

---

## 🎮 Gameplay Mechanics

### 1. Outpost Capturing
- **Securing Bases**: Stand inside the red (enemy) or grey (neutral) outpost rings. A capture progression slider indicates faction control.
- **Dynamic Presence**: Capture speed scales based on player/allies inside the ring. Capturing freezes or rolls back if contested by hostile mechs.
- **Outpost Benefits**:
  - Clears the **Fog of War** in a local radius.
  - Spawns friendly defender AI mechs periodically to patrol the base.
  - Grants a passive tick of **+25 Tech Credits (CR)** every 5 seconds.

### 2. Fog of War Occlusion
- **Real-Time Sight**: The map is covered in a Fog of War. You, your bases, and friendly defenders cast dynamic vision lines.
- **Occluded Combat**: Enemies in unexplored or shadowed sectors are invisible. Fired bullets will cleanly pass through them in the dark without dealing damage; you must gain line-of-sight to engage.

### 3. Biomes & Environmental Hazards
- **Forest Ruins**: Swamp waters cover paths, slowing down all unit movement speeds by 55%.
- **Wasteland Sludge**: Green toxic mud pools cover the map. Standing in toxic pools inflicts **8 HP/sec** damage over time. Asphalt roads boost mech speed by 35%.
- **Frozen Tundra**: random blizzard storms sweep the sector. During blizzards, commando vision radius decays by 50% (from 7 tiles down to 3.5 tiles), making close combat extremely hazardous.

### 4. Sector Overseer Boss Fight
- **Victory Condition**: Once all **4 outposts** are player-controlled, the **Sector Overseer** command boss mech drops in the center of the map `(1280, 1280)`.
- **Boss Abilities**:
  - Octagonal heavy hull (800 HP).
  - Rotational dual-barrel heavy plasma cannons firing spiral bullet rings.
  - Kinetic front energy shield blocking **60% of all incoming damage** when HP falls below 50%.
  - Spawns support drone squads when crossing HP thresholds (600, 400, and 200 HP).

---

## 🛠️ Upgrades, Armory & Base Defenses

### Command Terminal Upgrades
Purchase upgrades from the terminal overlay in the left HUD panel:
- **Max Health**: Increases HP maximum (+25 HP per tier, capped at Tier 4).
- **Shield Matrix**: Increases max shield buffer capacity (+25 Shield per tier, capped at Tier 4).
- **Dash CDR**: Enhances thruster cooldown decay rates.

### Weapons Shop & Armory
Cycle through unlocked weapons using the **`[Q]`** key:
- **Tactical Pistol**: Infinite ammunition, moderate damage (Default).
- **Scatter Shotgun**: 150 CR. Fires a wide 5-pellet spread at close-range.
- **Plasma Rifle**: 250 CR. Rapid-fire repeating plasma projectiles.
- *Buying a weapon you already own purchases a 50% Ammo Refill for only 15% of the base cost.*

### Outpost Defense Customization
- Build an **Auto-Defense Turret** (200 CR) at the nearest captured player outpost.
- The turret scans for hostile units within a **280px range** and automatically fires high-velocity friendly green laser bolts.

---

## ⚡ Tactical Commander Skills
Activate powerful commander support abilities on the hotbar (bottom HUD):
- **`[1]` EMP Blast**: Releases a circular electromagnetic wave, stunning all nearby hostiles for 4 seconds (Cost: 120 CR, Cooldown: 12s).
- **`[2]` Carpet Airstrike**: Calls in sequential artillery bombings at your mouse cursor coordinates (Cost: 240 CR, Cooldown: 20s).
- **`[3]` Repair Drone**: Deploys a nanite repair drone to heal the pilot's mech over time for 10 seconds (Cost: 180 CR, Cooldown: 15s).

---

## ⌨️ Controls Reference

| Input | Tactical Action |
| :--- | :--- |
| **`W` / `A` / `S` / `D`** (or **Arrows**) | Move Mech |
| **`Mouse Cursor`** | Aim Weapon Trajectory |
| **`Left-Click`** | Shoot Weapon (Pistol/Shotgun/Plasma) |
| **`Shift` / `Spacebar`** | Thruster Boost (Dash) |
| **`Q`** | Cycle Equipped Weapons |
| **`1`** | Trigger EMP Blast |
| **`2`** | Trigger Carpet Airstrike (at Aim Cursor) |
| **`3`** | Trigger Repair Drone |
| **`ESC` / `P`** | Pause Operations |

---

## 🛠️ Developer Command Reference

Start the project locally using:
```bash
# Install dependencies
npm install

# Start local live development server
npm run dev

# Run full project linter
npm run lint

# Compile production-optimized static build bundle
npm run build

# Execute the Vitest unit/integration test suite
npm test
```
The test suite consists of **39 automated tests** checking Player upgrades, Boss HP thresholds, project collision, bases capture rates, and biome hazards.
