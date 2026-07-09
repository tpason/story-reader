/** Shared crane (stork) GLB — shorter than legacy flamingo (~118 vs ~242 units tall). */
export const CRANE_MODEL_URL = "/assets/xianxia/models/stork.glb";

// Scales calibrated to match prior flamingo flock visual size (× ~2.05 height ratio).
export const CRANE_FLOCK_SCALE = 0.018;
export const CRANE_ORBIT_SCALE = 0.011;
export const CRANE_LONER_SCALE = 0.016;

/** Y offset for the red crown mesh, as a fraction of model bounding-box max Y. */
export const CRANE_CROWN_HEAD_FACTOR = 0.85;

/** Smooth yaw when the flock reverses direction (higher = snappier). */
export const CRANE_TURN_LERP = 8;
