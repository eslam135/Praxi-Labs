# Praxi Physics Lab

A modular virtual physics laboratory built with Three.js. Four classic experiments (pendulum, projectile, spring-mass, Atwood machine) run on a shared, extensible framework designed for AI-assisted extension.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

### Other Commands

```bash
npm run build    # Production build
npm run test     # Run physics unit tests (Vitest)
npm run preview  # Preview production build
```

## Architecture Overview

```
src/
  core/           # Simulation loop, registry, types, parameter store, A/B comparison
  experiments/    # One file per experiment + index.ts registry
  physics/        # Pure math: integrators, equations, analysis
  rendering/      # Three.js scene manager, dual viewport, primitives
  ui/             # Schema-driven parameter panel, graph, scalar display
```

Class diagram and layer notes: [`architecture/`](./architecture/).

### Key Design Decisions

1. **Strict Experiment Interface** — All experiments implement `setup`, `update`, `reset`, `dispose`, `getMeasurements`, `getParameterSchema`, `setParameters`, and optional `render(alpha)`. The public `Experiment` type is composed from narrower ISP slices (`Parameterized`, `Steppable`, `Measurable`, `SceneAttached`) in `src/core/types.ts`.

2. **Dependency inversion for rendering** — `core/` does not import Three.js. Setup context is `ExperimentRenderContext` from `rendering/`. `ExperimentHost` receives an `ExperimentSceneAdapter` + comparison context factory from `main.ts`.

3. **Fixed-Timestep Physics** — 120 Hz accumulator pattern decouples simulation from render frame rate. Physics always receives `FIXED_DT`, never variable frame delta. Visuals interpolate with accumulator `alpha`.

4. **Schema-Driven UI** — No per-experiment UI. `ParameterPanel` auto-generates controls from `getParameterSchema()`.

5. **Physics/Rendering Separation** — All equations live in `physics/` with zero Three.js imports. Unit-testable in Node via Vitest.

6. **Integrator Choice** — RK4 for oscillators (pendulum, spring, Atwood) to avoid energy drift. Semi-implicit Euler for projectile (non-oscillatory, with drag). Plain explicit Euler is avoided for oscillators because it systematically gains energy. Pendulum/Spring expose a **Use explicit Euler** toggle so Compare A/B can show RK4 (Set A) vs Euler (Set B).

7. **One-File Experiments** — Adding a new experiment requires one file in `experiments/` and one `registerExperiment()` call in `experiments/index.ts` (plus pure math under `physics/equations/`).

8. **A/B Comparison** — Toggle Compare A/B for a dual 3D viewport (A left, B right, cameras synced from A) plus dashed B overlays on Time Series. Edit params for Set A or Set B from the left panel.

### Data Flow

```
ParameterPanel → ParameterStore → ExperimentHost → Experiment.update(dt)
Experiment.getMeasurements() → (+ optional B merge) → GraphSystem + ScalarDisplay
SimulationLoop (fixed dt) → ExperimentHost.fixedUpdate() → Experiment.render(alpha)
main.ts → adapters / ComparisonViewport → Host (DIP)
```

### UI Layout

- **Header** — brand only
- **Left panel** — experiment pills, Pause/Reset, Compare A/B, schema parameters
- **Center** — 3D viewport (splits into A|B when comparing)
- **Right panel** — scalar metrics + Time Series (energy/channels, scrub, CSV export)

## Experiments

| Experiment | Equation | Integrator | Graph | Scalar Metrics |
|-----------|----------|------------|-------|----------------|
| Pendulum | θ'' = -(g/L)sinθ - cθ' | RK4 | Angle / Energy vs time | Measured vs large-angle series period |
| Projectile | 2D motion + optional drag | Semi-implicit Euler | x, y / Energy vs time | Predicted vs actual range |
| Spring-mass | x'' = -(k/m)x - (c/m)x' | RK4 | Displacement / Energy vs time | Measured vs underdamped frequency |
| Atwood | a = (m1−m2)g/(m1+m2) | RK4 | Displacement / Energy vs time | Measured vs theoretical acceleration |

Energy channels (`energy_kinetic`, `energy_potential`, `energy_total`) are recorded for all experiments. The graph defaults to an **Energy (KE / PE / Total)** multi-series view when those channels exist. Experiments also expose an **Energy Drift (%)** scalar — `|E − E₀| / |E₀| × 100` from reset — omitted when `|E₀| ≈ 0`.

## Dependencies

| Package | Why |
|---------|-----|
| `three` | Required 3D engine for the assessment (includes `OrbitControls` via `three/addons`) |
| `vite` | Dev server + bundler |
| `typescript` | Type safety for the Experiment contract |
| `vitest` | Unit tests for pure physics (no browser) |

## Adding a New Experiment

1. Read `src/core/types.ts` for the full contract.
2. Copy the nearest neighbor experiment file in `src/experiments/`.
3. Put physics equations in `src/physics/equations/`.
4. Register in `src/experiments/index.ts`:

```typescript
registerExperiment({
  id: 'my-experiment',
  name: 'My Experiment',
  factory: () => new MyExperiment(),
});
```

See also `src/experiments/README.md`.

## AI Agent Environment

Cursor rules in [`.cursor/rules/`](./.cursor/rules/) enforce architecture constraints (experiment interface, fixed timestep, module boundaries, no hardcoded UI). Index: [`.cursor/rules/README.md`](./.cursor/rules/README.md). Workflow notes: [`AI_USAGE.md`](./AI_USAGE.md).

## Known Limitations

- Pendulum period theory uses the first large-angle series correction `T ≈ T₀(1 + ½sin²(θ₀/2))`; very large amplitudes still deviate from the full elliptic integral.
- Spring frequency theory uses the underdamped formula `f = √(ω₀² − γ²)/(2π)`; critical/overdamped cases report no oscillation frequency.
- Projectile drag uses quadratic form `-c |v| v` (coefficient units documented in the UI).
- Compare mode syncs cameras from A→B (orbit the left view); B is not independently orbitable.
- Graph scrubbing is read-only over recorded samples (no 3D timeline rewind).
- Mobile / narrow layouts are usable but not a design target (assessment targets desktop browsers).

## What I Would Do Next

- Independent orbit controls on compare pane B (optional unlock)
- Phase-space plot mode from existing measurement channels
- Elliptic-integral pendulum period for large amplitudes
- Addressables-style trail / particle pooling beyond the projectile ring buffer
