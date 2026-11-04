export function coinTossCount(tokens: number): number {
  return Number.isSafeInteger(tokens) && tokens > 0 ? tokens : 0;
}

export function playCoinClink(context: AudioContext) {
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;
  for (const frequency of [2100, 3200, 4700]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(now); oscillator.stop(now + 0.3);
  }
}