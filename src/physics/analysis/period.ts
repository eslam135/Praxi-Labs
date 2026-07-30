/**
 * Period analysis — peak detection on time-series data.
 *
 * Role: Computes measured oscillation period from simulation samples.
 * Connections: Used by pendulum and spring experiments for scalar metrics.
 * Extension: Works on any channel id passed from MeasurementRecorder buffers.
 */
export function measurePeriod(time: Float64Array, values: Float64Array, count: number): number | null {
  if (count < 10) return null;

  const peaks: number[] = [];
  for (let i = 1; i < count - 1; i++) {
    if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
      peaks.push(time[i]);
    }
  }

  if (peaks.length < 2) return null;

  let sum = 0;
  for (let i = 1; i < peaks.length; i++) {
    sum += peaks[i] - peaks[i - 1];
  }
  return sum / (peaks.length - 1);
}

export function measureFrequency(time: Float64Array, values: Float64Array, count: number): number | null {
  const period = measurePeriod(time, values, count);
  if (!period || period <= 0) return null;
  return 1 / period;
}

export function percentDifference(measured: number, theoretical: number): number {
  if (theoretical === 0) return 0;
  return Math.abs((measured - theoretical) / theoretical) * 100;
}
