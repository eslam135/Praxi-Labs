/**
 * Parameter store — holds current experiment parameter values.
 *
 * Role: Decouples schema-driven UI from experiment instances.
 * Connections: ParameterPanel writes; ExperimentHost listens and forwards to experiments.
 * Extension: No changes needed when adding experiments (schema drives keys).
 */
import type { ParameterChangeListener, ParameterSchema, ParameterValues } from './types';

export class ParameterStore {
  private values: ParameterValues = {};
  private listeners: ParameterChangeListener[] = [];

  setSchema(schema: ParameterSchema[]): void {
    const next: ParameterValues = {};
    for (const field of schema) {
      next[field.key] = this.values[field.key] ?? field.default;
    }
    this.values = next;
  }

  getValues(): ParameterValues {
    return { ...this.values };
  }

  setValue(key: string, value: number | boolean): void {
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.notify();
  }

  setValues(values: ParameterValues, options?: { silent?: boolean }): void {
    this.values = { ...values };
    if (!options?.silent) {
      this.notify();
    }
  }

  onChange(listener: ParameterChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const snapshot = this.getValues();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
