# AI Usage Documentation

## Tools and Models Used

- **Cursor IDE** with Claude (Auto agent) for architecture design, implementation, and test generation
- Architecture rules committed in `.cursor/rules/` to enforce constraints across sessions

## Agent-Extensible Path Exercised

The Atwood machine experiment was added using only:

1. `src/physics/equations/atwood.ts` (pure math)
2. `src/experiments/AtwoodExperiment.ts` (glue + visuals)
3. One `registerExperiment()` call in `src/experiments/index.ts`

No changes to `ui/`, `SimulationLoop`, or `SceneManager` were required — confirming the one-file experiment rule under real use.

## Representative Prompts

1. *"Design Phase 1 architecture for a modular Physics Experiments Platform with strict Experiment interface, fixed timestep, schema-driven UI, and one-file experiment rule."*

2. *"Implement RK4 integrator for nonlinear pendulum with full equation θ'' = -(g/L)sinθ - cθ', not small-angle approximation."*

3. *"Build schema-driven ParameterPanel that auto-generates sliders, number inputs, and toggles from getParameterSchema() with no per-experiment UI."*

4. *"Add unit tests for pendulum period, spring frequency, and frame-rate independence using Vitest without Three.js."*

5. *"Implement projectile experiment with analytic dotted trajectory preview before launch and measured vs predicted range comparison."*

6. *"Add light A/B comparison: headless second experiment instance, Edit A/B parameter routing, and graph overlay of __B channels — no dual viewport."*

## Cases Where AI Output Was Wrong or Suboptimal

### 1. RK4 Buffer Sizing

**Problem:** Initial RK4 implementation used fixed-size `Float64Array(8)` and attempted to resize via `.length` assignment, which does not work for typed arrays.

**Detection:** TypeScript strict mode and logical review of state sizes (pendulum state = 2 elements).

**Fix:** Replaced with lazy-allocated buffers that resize when `state.length` changes.

### 2. Three.js Object Hierarchy for Pendulum

**Problem:** AI initially added rod and bob directly to the scene AND to the pivot object, causing duplicate scene graph entries.

**Detection:** Visual inspection of scene graph logic; `createRod`/`createSphere` always called `addToScene`.

**Fix:** Added optional `parent` parameter to primitives; children attach to parent only, parent added to scene once.

### 3. Spring Stretch via Mesh Scale

**Problem:** AI suggested scaling the spring line's `scale.y` to stretch/compress, which distorted coil radius and looked incorrect.

**Detection:** Visual check of spring experiment; README listed mesh rebuild as a limitation.

**Fix:** Preallocate coil `Vector3` buffers and update helix points in place each frame via `updateSpringPoints`.

### 4. Results Panel Resize Grew Off-Screen to the Right

**Problem:** AI implemented a drag-to-resize handle for the right results column by only updating `--panel-width-results`, while the center grid track used bare `1fr`. CSS Grid’s default `min-width: auto` on that track prevented the 3D viewport from shrinking, so increasing the results width expanded the whole layout past the window’s right edge instead of growing left into the canvas.

**Detection:** Manual UI check — dragging the handle made the Results / Time Series panel expand out of the screen to the right rather than reclaiming space from the viewport.

**Fix:** Changed the center column to `minmax(0, 1fr)`, set `min-width: 0` / `overflow: hidden` on the viewport, and clamped resize width so params + a minimum viewport width always remain visible.

## Parts Written Fully by Hand

- `.cursor/rules/` architecture constraints (pre-existing in repo)
- Integrator assignment rationale (RK4 for oscillators, semi-implicit Euler for projectile)
- Parameter schema field definitions per experiment
- Test tolerance values after numerical validation

## What Was Set Up Before Writing Code

Before any implementation, the following was designed and confirmed:

1. **Module boundaries** — `physics/`, `rendering/`, `experiments/`, `ui/`, `core/` with strict import rules
2. **Experiment interface** — Full contract in `types.ts` including `dispose()` and `setParameters()`
3. **Registry pattern** — Single `experiments/index.ts` as the only registration touchpoint
4. **Measurement system** — Framework-owned ring buffer with scalar metrics for generic UI
5. **Simulation loop** — Fixed 120 Hz timestep with accumulator and max substep guard
6. **Cursor rules** — 16 `.mdc` files enforcing architecture for future AI sessions

**Why:** The assessment explicitly scores AI-extensibility — an agent with zero guidance must find the contract, registry, and conventions unambiguously from committed code and configuration. Designing structure first prevents inconsistent implementations across experiments and ensures the "one file + one registry entry" rule holds.

## Rule Added Because AI Kept Getting Something Wrong

**`Fixed-Timestep-ONLY.mdc`** — AI repeatedly suggested using `requestAnimationFrame` delta directly in physics updates. This rule enforces the accumulator pattern so physics results are frame-rate independent.

**`Never-Trust-AI-Physics.mdc`** — AI-generated pendulum code initially used small-angle approximation `sin(θ) ≈ θ`. This rule requires verifying equations against known formulas and testing numerically.
