export class ProceduralAudio {
  private context?: AudioContext;

  constructor(private readonly isMuted: () => boolean) {}

  tap(): void {
    this.tone(340, 470, 0.055, "sine", 0.025);
  }

  topping(): void {
    this.tone(210, 300, 0.075, "triangle", 0.028);
  }

  box(): void {
    this.noise(0.08, 0.016);
    this.tone(250, 520, 0.16, "sine", 0.026);
  }

  success(streak: number): void {
    const root = 440 + Math.min(streak, 4) * 30;
    this.chord([root, root * 1.25, root * 1.5], 0.26, 0.028);
  }

  streak(): void {
    this.chord([523, 659, 784, 1047], 0.38, 0.032);
  }

  miss(): void {
    this.tone(220, 150, 0.16, "triangle", 0.025);
  }

  ding(): void {
    this.tone(880, 1050, 0.18, "sine", 0.024);
  }

  finale(): void {
    this.chord([262, 330, 392, 523, 659], 0.62, 0.035);
  }

  unlock(): void {
    this.chord([659, 784, 988], 0.42, 0.03);
  }

  private ensureContext(): AudioContext | undefined {
    if (this.isMuted() || typeof window === "undefined" || !window.AudioContext) return undefined;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  private tone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    const context = this.ensureContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  private chord(frequencies: readonly number[], duration: number, volume: number): void {
    frequencies.forEach((frequency, index) =>
      this.tone(frequency, frequency * 1.02, duration, "triangle", volume, index * 0.045),
    );
  }

  private noise(duration: number, volume: number): void {
    const context = this.ensureContext();
    if (!context) return;
    const frames = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.connect(gain).connect(context.destination);
    source.start();
  }
}
