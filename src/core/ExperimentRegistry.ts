/**
 * Experiment registry — single registration point for all experiments.
 *
 * Role: Stores experiment factories; prevents manual instantiation elsewhere.
 * Connections: experiments/index.ts registers; ExperimentHost loads by id.
 * Extension: Add one registerExperiment() call in experiments/index.ts only.
 */
import type { ExperimentRegistration } from './types';

const registry = new Map<string, ExperimentRegistration>();

export function registerExperiment(entry: ExperimentRegistration): void {
  if (registry.has(entry.id)) {
    throw new Error(`Experiment "${entry.id}" is already registered.`);
  }
  registry.set(entry.id, entry);
}

export function getExperiment(id: string): ExperimentRegistration | undefined {
  return registry.get(id);
}

export function listExperiments(): ExperimentRegistration[] {
  return Array.from(registry.values());
}
