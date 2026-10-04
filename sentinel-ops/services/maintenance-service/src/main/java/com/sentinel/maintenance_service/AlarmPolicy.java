package com.sentinel.maintenance_service;

/** Direction-aware thresholds shared by the backend incident monitor. */
final class AlarmPolicy {

  static double ratio(double reading, double baseline, double critical) {
    if (
      !Double.isFinite(reading) ||
      !Double.isFinite(baseline) ||
      !Double.isFinite(critical) ||
      baseline == critical
    ) return Double.NaN;
    return (reading - baseline) / (critical - baseline);
  }

  static String severity(double ratio) {
    if (!Double.isFinite(ratio)) return "INVALID";
    return ratio >= 1 ? "CRITICAL" : ratio >= .65 ? "WARNING" : "HEALTHY";
  }
}
