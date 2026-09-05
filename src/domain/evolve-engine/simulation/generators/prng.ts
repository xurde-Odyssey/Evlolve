export type SeededPrng = {
  seed: number;
  next: () => number;
  range: (min: number, max: number) => number;
  chance: (probability: number) => boolean;
};

export function createSeededPrng(seed: number): SeededPrng {
  let state = seed >>> 0;

  function next() {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  }

  return {
    seed,
    next,
    range: (min, max) => min + (max - min) * next(),
    chance: (probability) => next() < probability,
  };
}

export function deterministicJitter(
  prng: SeededPrng,
  magnitude = 0.04,
) {
  return 1 + prng.range(-magnitude, magnitude);
}
