/**
 * Experiment registry entries — the ONLY file to edit when adding experiments.
 *
 * Role: Imports and registers all experiments via registerExperiment().
 * Connections: Read by ExperimentRegistry; loaded by ExperimentHost.
 * Extension: Add one import + one registerExperiment() call per new experiment.
 */
import { registerExperiment } from '../core/ExperimentRegistry';
import { AtwoodExperiment } from './AtwoodExperiment';
import { PendulumExperiment } from './PendulumExperiment';
import { ProjectileExperiment } from './ProjectileExperiment';
import { SpringExperiment } from './SpringExperiment';

registerExperiment({
  id: 'pendulum',
  name: 'Pendulum',
  factory: () => new PendulumExperiment(),
});

registerExperiment({
  id: 'projectile',
  name: 'Projectile Motion',
  factory: () => new ProjectileExperiment(),
});

registerExperiment({
  id: 'spring',
  name: 'Spring-Mass Oscillator',
  factory: () => new SpringExperiment(),
});

registerExperiment({
  id: 'atwood',
  name: 'Atwood Machine',
  factory: () => new AtwoodExperiment(),
});
