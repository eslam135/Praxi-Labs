/**
 * Merges primary (A) and comparison (B) measurement snapshots for the graph system.
 *
 * Role: Pure helper — prefixes B channel ids with COMPARISON_B_SUFFIX so GraphSystem
 * can overlay A vs B without experiment-specific UI.
 * Connections: Used by ExperimentHost when comparison mode is enabled.
 * Extension: Keep B suffix contract stable; GraphSystem relies on it for overlays.
 */
import { COMPARISON_B_SUFFIX, type MeasurementSnapshot } from './types';

export function mergeComparisonSnapshots(
  primary: MeasurementSnapshot,
  secondary: MeasurementSnapshot,
): MeasurementSnapshot {
  const bChannels = secondary.channels.map((channel) => ({
    id: `${channel.id}${COMPARISON_B_SUFFIX}`,
    label: `${channel.label} (B)`,
    unit: channel.unit,
    values: channel.values,
  }));

  const primaryCount = primary.count;
  const secondaryCount = secondary.count;
  const count = Math.max(primaryCount, secondaryCount);
  const time = secondaryCount > primaryCount ? secondary.time : primary.time;

  return {
    time,
    channels: [...primary.channels, ...bChannels],
    scalars: primary.scalars,
    count,
    comparisonActive: true,
    primaryCount,
    secondaryCount,
  };
}
