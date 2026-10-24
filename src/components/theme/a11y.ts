/**
 * Fixed-size parts of the picker (day cells, chips, time boxes, wheel rows) grow
 * with the system font size up to this factor, then stop so they don't clip.
 */
export const MAX_FONT_SCALE = 1.4;

/** Extra touch area around 40 pt day cells, so the target reaches the recommended 48. */
export const DAY_HIT_SLOP = 4;
