// Synthesized Audio Engine using Web Audio API for Sector Vanguard

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user interaction due to browser policies
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle(enabled?: boolean) {
    this.enabled = enabled !== undefined ? enabled : !this.enabled;
    if (this.enabled) {
      this.init();
    }
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  // Laser shoot sound
  playShoot() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, time);
    // Sweep frequency down rapidly
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.15);

    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  // Dash sound (frequency sweep up)
  playDash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(1200, time + 0.2);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  // Hit sound (short noise burst)
  playHit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.setValueAtTime(80, time + 0.05);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc.start(time);
    osc.stop(time + 0.08);
  }

  // Explosion sound (procedural low frequency noise sweep)
  playExplosion() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const duration = 0.5;
    
    // Create buffer for noise
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(30, time + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(time);
    noise.stop(time + duration);
  }

  // Base capturing/captured arpeggio (success chime)
  playCaptureProgress() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, time); // C5
    osc.frequency.setValueAtTime(659.25, time + 0.08); // E5

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.16);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  playCaptureComplete() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    
    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + index * 0.1);

      gain.gain.setValueAtTime(0.12, time + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, time + index * 0.1 + 0.25);

      osc.start(time + index * 0.1);
      osc.stop(time + index * 0.1 + 0.25);
    });
  }

  // Purchase item sound
  playPurchase() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const notes = [392.00, 587.33, 783.99]; // G4, D5, G5
    
    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + index * 0.06);

      gain.gain.setValueAtTime(0.1, time + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, time + index * 0.06 + 0.15);

      osc.start(time + index * 0.06);
      osc.stop(time + index * 0.06 + 0.15);
    });
  }

  // Rising sweep alarm (EMP, Boss alarm, shield regen cue)
  playShieldRegen() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(880, time + 0.35);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  // Quick laser zap (base turret fire)
  playLaser() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, time);
    osc.frequency.exponentialRampToValueAtTime(200, time + 0.1);

    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  private musicIntervalId: any = null;
  private musicStep: number = 0;

  startMusic() {
    if (!this.enabled || this.musicIntervalId) return;
    this.init();
    if (!this.ctx) return;

    // A nice retro cyberpunk minor progression in A minor / G major
    const bassline = [110, 110, 130, 130, 146, 146, 98, 98]; // A2, C3, D3, G2

    this.musicStep = 0;
    this.musicIntervalId = setInterval(() => {
      if (!this.enabled || !this.ctx) {
        this.stopMusic();
        return;
      }
      if (this.ctx.state === 'suspended') return;

      try {
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        const freq = bassline[this.musicStep % bassline.length];
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, time);

        gain.gain.setValueAtTime(0.015, time); // low volume background hum
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.45);
        this.musicStep++;
      } catch (err) {
        // Silently catch audio scheduling errors
      }
    }, 500);
  }

  stopMusic() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  playDecoyDeploy() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(600, time + 0.25);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  playPickup() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + index * 0.04);

      gain.gain.setValueAtTime(0.06, time + index * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + index * 0.04 + 0.1);

      osc.start(time + index * 0.04);
      osc.stop(time + index * 0.04 + 0.1);
    });
  }

  playSniperWarning() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, time); // B5 high alert

    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.start(time);
    osc.stop(time + 0.08);
  }

  playSniperShoot() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500, time);
    osc.frequency.exponentialRampToValueAtTime(300, time + 0.25);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.25);
  }
}

export const sound = new SoundManager();
