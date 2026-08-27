/* Web Audio API Sound Synthesizer for System Notifications */
class AudioService {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  enableAudio() {
    this.soundEnabled = true;
    this.initContext();
  }

  disableAudio() {
    this.soundEnabled = false;
  }

  toggleAudio() {
    this.soundEnabled = !this.soundEnabled;
    if (this.soundEnabled) {
      this.initContext();
    }
    return this.soundEnabled;
  }

  isAudioEnabled() {
    return this.soundEnabled;
  }

  /* Play a pleasant 2-tone bell chime for new orders */
  playNewOrderSound() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Tone 1 (High bell - E5)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Tone 2 (Higher bell - A5)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.0, now + 0.15);
      gain2.gain.setValueAtTime(0.4, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.8);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }

  /* Play a 3-tone chime for order completion */
  playOrderReadySound() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5

      freqs.forEach((freq, idx) => {
        const startTime = now + idx * 0.12;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }
}

const audioService = new AudioService();
export default audioService;
