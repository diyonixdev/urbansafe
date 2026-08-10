export const SCORE_WEIGHTS = {
  crime: 0.50,
  accident: 0.30,
  policeProximity: 0.20,
};

export const DECAY_CONFIG = {
  type: "exponential", // "exponential" or "linear"
  halfLifeMonths: 3,   // Incident penalty halves every N months
};

export const CORRIDOR_WIDTH_METERS = 200;

export const SEVERITY_CONFIG = {
  enabled: true
};
