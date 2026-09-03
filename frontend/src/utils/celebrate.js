import confetti from 'canvas-confetti';

/**
 * A quick, tasteful confetti burst for genuinely positive moments —
 * registration, a completed visit, a submitted rating. Not used for
 * routine actions; celebration loses meaning if it happens constantly.
 */
export function celebrate() {
  confetti({
    particleCount: 60,
    spread: 65,
    startVelocity: 35,
    origin: { y: 0.7 },
    colors: ['#45632f', '#b5793a', '#3e6e8e', '#cf8f2f'],
    disableForReducedMotion: true,
  });
}
