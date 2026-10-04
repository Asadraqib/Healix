package com.sentinel.maintenance_service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AlarmPolicyTest {
    @Test void detectsExactWarningAndCriticalBoundaries() {
        assertEquals("HEALTHY", AlarmPolicy.severity(AlarmPolicy.ratio(62.9, 50, 70)));
        assertEquals("WARNING", AlarmPolicy.severity(AlarmPolicy.ratio(63, 50, 70)));
        assertEquals("CRITICAL", AlarmPolicy.severity(AlarmPolicy.ratio(70, 50, 70)));
    }
    @Test void supportsLowPressureAndOtherFallingThresholds() {
        assertEquals("WARNING", AlarmPolicy.severity(AlarmPolicy.ratio(67.5, 100, 50)));
        assertEquals("CRITICAL", AlarmPolicy.severity(AlarmPolicy.ratio(49, 100, 50)));
        assertEquals("HEALTHY", AlarmPolicy.severity(AlarmPolicy.ratio(110, 100, 50)));
    }
    @Test void invalidReadingsMustNotResolveAnIncident() {
        assertEquals("INVALID", AlarmPolicy.severity(AlarmPolicy.ratio(Double.NaN, 50, 70)));
        assertEquals("INVALID", AlarmPolicy.severity(AlarmPolicy.ratio(60, 50, 50)));
        assertEquals("INVALID", AlarmPolicy.severity(AlarmPolicy.ratio(Double.POSITIVE_INFINITY, 50, 70)));
    }
}
