/**
 * Experiment registry — single registration point for all experiments.
 *
 * Role: Stores experiment factories; prevents manual instantiation elsewhere.
 * Connections: experiments/index.ts registers; ExperimentHost loads by id.
 * Extension: Add one registerExperiment() call in experiments/index.ts only.
 */
import type { ExperimentRegistration } from './types';

const registry = new Map<string, ExperimentRegistration>();

export function registerExperiment<C = unknown>(entry: ExperimentRegistration<C>): void {
  if (registry.has(entry.id)) {
    throw new Error(`Experiment "${entry.id}" is already registered.`);
  }
  registry.set(entry.id, entry as ExperimentRegistration);
}

export function getExperiment<C = unknown>(id: string): ExperimentRegistration<C> | undefined {
  return registry.get(id) as ExperimentRegistration<C> | undefined;
}

export function listExperiments<C = unknown>(): ExperimentRegistration<C>[] {
  return Array.from(registry.values()) as ExperimentRegistration<C>[];
}
