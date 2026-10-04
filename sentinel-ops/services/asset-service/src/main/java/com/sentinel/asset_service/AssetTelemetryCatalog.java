package com.sentinel.asset_service;

import java.util.List;

/** Shared telemetry contract mirrored by the browser simulation's fleet fixtures. */
public final class AssetTelemetryCatalog {

  private AssetTelemetryCatalog() {}

  public record Sensor(
    String id,
    String name,
    String type,
    double currentValue,
    double baseline,
    double criticalThreshold,
    String unit,
    List<Double> history,
    String source
  ) {}

  public static List<Sensor> from(AssetRow r) {
    return values(
      r.id(),
      r.temperature().doubleValue(),
      r.vibration().doubleValue(),
      r.loadPct(),
      r.powerKw().doubleValue(),
      r.rpm(),
      r.productionCount()
    );
  }

  public static List<Sensor> from(AssetState s) {
    return values(s.id, s.temperature, s.vibration, s.load, s.power, s.rpm, s.productionCount);
  }

  private static List<Sensor> values(
    String id,
    double temp,
    double vibration,
    int load,
    double power,
    int rpm,
    long production
  ) {
    return switch (id) {
      case "ast-sinumerik-01" -> List.of(
        sensor("sn-snm-01", "Spindle Vibration RMS", "Vibration", vibration, 1.5, 6.5, "mm/s"),
        sensor("sn-snm-02", "Spindle Bearing Temp", "Temperature", temp, 45, 82, "°C"),
        sensor("sn-snm-03", "Spindle Drive RPM", "Speed", rpm, 12000, 15500, "RPM"),
        sensor(
          "sn-snm-04",
          "High-Pressure Coolant",
          "Pressure",
          4.3 + (temp - 48.4) * 0.006,
          4.5,
          2.1,
          "Bar"
        )
      );
      case "ast-simatic-02" -> List.of(
        sensor(
          "sn-smk-01",
          "Joint 3 Harmonic Torque",
          "Torque",
          142.5 + (load - 58) * 0.2,
          135,
          210,
          "Nm"
        ),
        sensor("sn-smk-02", "Servo Winding Temp", "Temperature", temp, 55, 90, "°C"),
        sensor(
          "sn-smk-03",
          "TCP Repeatability Drift",
          "Position",
          0.042 + (vibration - 1.42) * 0.001,
          0.02,
          0.12,
          "mm"
        )
      );
      case "ast-sinamics-03" -> List.of(
        sensor("sn-snx-01", "Inverter Bridge Temp", "Temperature", temp, 62, 88, "°C"),
        sensor("sn-snx-02", "Output Current RMS", "Current", 48.2 + (load - 86) * 0.5, 40, 65, "A"),
        sensor(
          "sn-snx-03",
          "DC Link Ripple Voltage",
          "Voltage",
          14.5 + (vibration - 4.4) * 0.2,
          8,
          25,
          "V"
        )
      );
      case "ast-hydraulic-04" -> List.of(
        sensor(
          "sn-hyd-01",
          "Main Cylinder Pressure",
          "Pressure",
          312 + (load - 63) * 0.4,
          310,
          390,
          "Bar"
        ),
        sensor("sn-hyd-02", "Hydraulic Fluid Temp", "Temperature", temp, 50, 75, "°C"),
        sensor(
          "sn-hyd-03",
          "Proportional Valve Flow",
          "Flow",
          88 - (load - 63) * 0.1,
          90,
          60,
          "L/min"
        )
      );
      case "ast-chiller-05" -> List.of(
        sensor("sn-chl-01", "Evaporator Temperature", "Temperature", temp, 6.5, 14, "°C"),
        sensor(
          "sn-chl-02",
          "Refrigerant Head Pressure",
          "Pressure",
          16.4 + (power - 40) * 0.2,
          16,
          24,
          "Bar"
        ),
        sensor("sn-chl-03", "Scroll Compressor Load", "Load", 70 + (load - 71), 70, 95, "%")
      );
      default -> List.of(
        sensor(
          id + "-temperature",
          "Temperature",
          "Temperature",
          temp,
          temp,
          Double.MAX_VALUE,
          "°C"
        ),
        sensor(
          id + "-vibration",
          "Vibration",
          "Vibration",
          vibration,
          vibration,
          Double.MAX_VALUE,
          "mm/s"
        )
      );
    };
  }

  private static Sensor sensor(
    String id,
    String name,
    String type,
    double value,
    double baseline,
    double critical,
    String unit
  ) {
    return new Sensor(
      id,
      name,
      type,
      round(value),
      baseline,
      critical,
      unit,
      List.of(round(value)),
      "GENERATED_DEMO"
    );
  }

  private static double round(double v) {
    return Math.round(v * 100.0) / 100.0;
  }
}
