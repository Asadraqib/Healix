package com.sentinel.gateway_service;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRoutes {
  @Bean
  public Map<String, String> routeTable(
      @Value("${ASSET_SERVICE_URL:http://localhost:8081}") String assetUrl,
      @Value("${MAINTENANCE_SERVICE_URL:http://localhost:8082}") String maintenanceUrl,
      @Value("${AI_SERVICE_URL:http://localhost:8083}") String aiUrl,
      @Value("${AUTH_SERVICE_URL:http://localhost:8084}") String authUrl) {
    Map<String, String> routes = new LinkedHashMap<>();
    routes.put("/api/assets", assetUrl);
    routes.put("/api/dashboard", assetUrl);
    routes.put("/api/simulation", assetUrl);
    routes.put("/api/work-orders", maintenanceUrl);
    routes.put("/api/parts", maintenanceUrl);
    routes.put("/api/suppliers", maintenanceUrl);
    routes.put("/api/notifications", maintenanceUrl);
    routes.put("/api/alarms", maintenanceUrl);
    routes.put("/api/ai", aiUrl);
    routes.put("/api/auth", authUrl);
    return routes;
  }
}
