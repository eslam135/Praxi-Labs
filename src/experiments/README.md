# Adding a New Experiment

**Start here:** [`src/core/types.ts`](../core/types.ts) — all framework interfaces.

## Steps

1. Create `src/experiments/YourExperiment.ts` implementing the `Experiment` interface (include optional `render(alpha)` for smooth visuals).
2. Put physics math in `src/physics/equations/yourSystem.ts` (no Three.js imports).
3. Add one line to `src/experiments/index.ts`:

```typescript
registerExperiment({
  id: 'your-experiment',
  name: 'Your Experiment',
  factory: () => new YourExperiment(),
});
```

## Rules

- Do **not** edit `ui/`, `core/SimulationLoop.ts`, or `rendering/SceneManager.ts`.
- Do **not** create per-experiment UI — use `getParameterSchema()` and `getMeasurements()`.
- Use `context.recorder.registerChannel()` in `setup()` and `recorder.append()` in `update()`.
- Register `energy_kinetic`, `energy_potential`, and `energy_total` when applicable so the graph Energy view works.
- Use `context.renderKit` for all Three.js objects (auto-disposed on switch).
- Use RK4 for oscillators; semi-implicit Euler for non-oscillatory systems.
- Comparison mode is framework-owned: do not build a second viewport inside the experiment.

## Template

Copy `PendulumExperiment.ts` for oscillatory systems or `ProjectileExperiment.ts` for trajectory-based systems.
