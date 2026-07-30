# Architecture

Praxi’s architecture is intentionally discoverable for humans and AI agents.

## Diagram

Open [`Praxi_Class_Diagram.mmd`](./Praxi_Class_Diagram.mmd) in GitHub, [mermaid.live](https://mermaid.live), or a Mermaid VS Code preview.

It summarizes:

- The composed `Experiment` contract
- Host / comparison / simulation loop wiring
- Dual-viewport comparison (`ComparisonViewport` + factory)
- UI entry points (`SessionControls`, schema panel, graphs)

## Layer rules (enforced by `.cursor/rules/`)

| Layer | May import | Must not |
|-------|------------|----------|
| `physics/` | pure TS / math only | Three.js, DOM, UI |
| `rendering/` | Three.js, `core` types | experiment business UI |
| `experiments/` | physics + rendering context | hardcode UI controls |
| `ui/` | schema + measurements | physics equations |
| `core/` | nothing from Three.js | know canvas details |

## Extending

A new experiment should need:

1. `src/physics/equations/<system>.ts`
2. `src/experiments/<Name>Experiment.ts`
3. One `registerExperiment()` in `src/experiments/index.ts`

See [`src/experiments/README.md`](../src/experiments/README.md).
