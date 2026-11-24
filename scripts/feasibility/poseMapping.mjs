// Phase 1 feasibility: maps our CharacterState (spec 7.2) to the parameters of the
// LivePortrait "expression editor" (AdvancedLivePortrait) used by the free
// Hugging Face Space fffiloni/expression-editor (same model as Replicate fofr/expression-editor).
// Values below are first guesses that the feasibility test checks visually.

/** Model limits (AdvancedLivePortrait slider ranges). */
export const MODEL_LIMITS = {
  rotate: 20, // pitch/yaw/roll: -20..20
  pupil: 15 // pupil_x / pupil_y: -15..15
}

/** Spec limits (section 7.2). */
export const SPEC_LIMITS = { yaw: 25, pitch: 15 }

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

// Gaze direction → pupil offsets (discrete, spec 7.2).
const GAZE = {
  center: { pupil_x: 0, pupil_y: 0 },
  left: { pupil_x: -12, pupil_y: 0 },
  right: { pupil_x: 12, pupil_y: 0 },
  up: { pupil_x: 0, pupil_y: 10 },
  down: { pupil_x: 0, pupil_y: -10 }
}

// Mouth state → mouth parameters (4 discrete states, spec 7.2).
const MOUTH = {
  neutral: { aaa: 0, smile: 0 },
  smile: { aaa: 0, smile: 1 },
  open: { aaa: 60, smile: 0 },
  close: { aaa: -15, smile: 0 }
}

/**
 * Converts a CharacterState into expression-editor parameters.
 * Roll is NOT sent (spec: roll is a local 2D transform), so rotate_roll is always 0.
 * Yaw/pitch are clamped first to the spec limits, then to the model limit.
 */
export function stateToParams(state) {
  const yaw = clamp(state.head.yaw, -SPEC_LIMITS.yaw, SPEC_LIMITS.yaw)
  const pitch = clamp(state.head.pitch, -SPEC_LIMITS.pitch, SPEC_LIMITS.pitch)
  const gaze = GAZE[state.eyes.direction] ?? GAZE.center
  const mouth = MOUTH[state.mouth] ?? MOUTH.neutral
  return {
    rotate_pitch: clamp(pitch, -MODEL_LIMITS.rotate, MODEL_LIMITS.rotate),
    rotate_yaw: clamp(yaw, -MODEL_LIMITS.rotate, MODEL_LIMITS.rotate),
    rotate_roll: 0,
    blink: state.eyes.open ? 0 : -20,
    eyebrow: 0,
    wink: 0,
    pupil_x: gaze.pupil_x,
    pupil_y: gaze.pupil_y,
    aaa: mouth.aaa,
    eee: 0,
    woo: 0,
    smile: mouth.smile,
    src_ratio: 1,
    sample_ratio: 1,
    sample_parts: 'All',
    crop_factor: 1.7
  }
}

/** Stable cache key for a pose (used later by the Pose Cache). Roll excluded. */
export function stateKey(state) {
  const e = state.eyes
  return `y${state.head.yaw}_p${state.head.pitch}_e${e.direction}-${e.open ? 'o' : 'c'}_m${state.mouth}`
}

/** Neutral default state (spec "Reset All"). */
export const NEUTRAL = {
  head: { yaw: 0, pitch: 0, roll: 0 },
  eyes: { direction: 'center', open: true },
  mouth: 'neutral'
}
