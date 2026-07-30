# Cursor agent rules

Persistent architecture constraints for AI agents working on Praxi.

Committed under `.cursor/rules/` so an agent with only this repository can recover the intended design without tribal knowledge.

## Rules

| Rule | Purpose |
|------|---------|
| `Enforce-Experiment-Interface-Contract` | Experiments must implement the shared contract only |
| `Experiment-Registration-Pattern` | Register via `registerExperiment` only |
| `One-File-Experiment-Rule` | New experiments = one glue file + one registry entry |
| `Zero-Hardcoded-UI` | UI comes from `getParameterSchema()` |
| `Measurement-System` | Expose time-series via `getMeasurements()` |
| `Strict-Module-Boundaries` | Keep physics / rendering / UI / core separated |
| `Fixed-Timestep-ONLY` | Accumulator pattern; never variable-Δt physics |
| `Explicit-Integrator-Choice` | RK4 / semi-implicit Euler; no naive Euler for oscillators |
| `Physics-Must-Be-Unit-Tested` | Vitest coverage for equations / integrators / energy |
| `Never-Trust-AI-Physics` | Cross-check formulas and numerical results |
| `Deterministic-Physics` | Same inputs → same outputs |
| `No-Per-Frame-Allocations` | Reuse vectors/buffers in update loops |
| `Clean-Disposal` | Dispose geometries/materials on experiment switch |
| `Self-Explaining-Files` | Role / connections / extension comments on core files |
| `No-Hidden-Knowledge` | Prefer discoverable names and docs over magic |
| `Ask-Before-Assuming` | Clarify ambiguous architecture choices |
| `Incremental-Commits` | One feature per commit |

## Rules added because AI kept getting something wrong

- **`Fixed-Timestep-ONLY`** — agents repeatedly used `requestAnimationFrame` delta in physics.
- **`Never-Trust-AI-Physics`** — agents defaulted to small-angle pendulum (`sin θ ≈ θ`).

See also root [`AI_USAGE.md`](../AI_USAGE.md) and [`README.md`](../README.md).
