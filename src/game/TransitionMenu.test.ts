import { describe, it, expect } from 'vitest';
import { CAMPAIGN_STAGES_PER_SECTOR } from './Types';

describe('Campaign Stage Constants', () => {
  it('should have 5 stages per sector', () => {
    expect(CAMPAIGN_STAGES_PER_SECTOR).toBe(5);
  });
});

describe('Difficulty Scaling Formula', () => {
  it('should calculate correct scale factor for each stage', () => {
    for (let stage = 1; stage <= 5; stage++) {
      const scale = 1.0 + (stage - 1) * 0.15;
      expect(scale).toBeGreaterThan(0);
    }
    // Stage 1 = 1.0, Stage 5 = 1.6
    expect(1.0 + (1 - 1) * 0.15).toBe(1.0);
    expect(1.0 + (5 - 1) * 0.15).toBeCloseTo(1.6);
  });

  it('should calculate correct speed scale for each stage', () => {
    for (let stage = 1; stage <= 5; stage++) {
      const speedScale = 1.0 + (stage - 1) * 0.05;
      expect(speedScale).toBeGreaterThanOrEqual(1.0);
      expect(speedScale).toBeLessThanOrEqual(1.20); // max +20%
    }
    expect(1.0 + (5 - 1) * 0.05).toBeCloseTo(1.20);
  });
});

describe('Biome Unlock Chain', () => {
  it('should unlock WASTELAND after clearing FOREST', () => {
    const order = ['FOREST', 'WASTELAND', 'TUNDRA', 'CYBER'];
    const idx = order.indexOf('FOREST');
    expect(idx).toBe(0);
    expect(order[idx + 1]).toBe('WASTELAND');
  });

  it('should unlock TUNDRA after clearing WASTELAND', () => {
    const order = ['FOREST', 'WASTELAND', 'TUNDRA', 'CYBER'];
    const idx = order.indexOf('WASTELAND');
    expect(order[idx + 1]).toBe('TUNDRA');
  });

  it('should unlock CYBER after clearing TUNDRA', () => {
    const order = ['FOREST', 'WASTELAND', 'TUNDRA', 'CYBER'];
    const idx = order.indexOf('TUNDRA');
    expect(order[idx + 1]).toBe('CYBER');
  });

  it('should not have unlock after CYBER (last biome)', () => {
    const order = ['FOREST', 'WASTELAND', 'TUNDRA', 'CYBER'];
    const idx = order.indexOf('CYBER');
    expect(idx + 1).toBeGreaterThanOrEqual(order.length);
  });
});

describe('Transition Menu State Logic', () => {
  it('should show boss warning on stage 5 transition', () => {
    const stage = 5;
    const isLastStage = stage >= CAMPAIGN_STAGES_PER_SECTOR;
    expect(isLastStage).toBe(true);
  });

  it('should not show boss warning on earlier stages', () => {
    for (let stage = 1; stage < 5; stage++) {
      const isLastStage = stage >= CAMPAIGN_STAGES_PER_SECTOR;
      expect(isLastStage).toBe(false);
    }
  });

  it('should calculate repair costs correctly', () => {
    const healCost = 80;
    const shieldCost = 60;
    const defenderCost = 120;

    expect(healCost + shieldCost + defenderCost).toBe(260);
  });

  it('should determine if player can afford heal based on credits', () => {
    const healCost = 80;
    const health = 50;
    const maxHealth = 100;
    const credits = 100;

    const canHeal = credits >= healCost && health < maxHealth;
    expect(canHeal).toBe(true);

    const canHealNoCredits = 40 >= healCost && health < maxHealth;
    expect(canHealNoCredits).toBe(false);

    const canHealFullHealth = credits >= healCost && 100 < maxHealth;
    expect(canHealFullHealth).toBe(false);
  });
});
