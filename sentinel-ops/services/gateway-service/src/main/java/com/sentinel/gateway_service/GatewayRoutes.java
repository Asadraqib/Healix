package com.sentinel.gateway_service;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRoutes {
  @Bean
  public Map<String, String> routeTable() {
    Map<String, String> routes = new LinkedHashMap<>();
    routes.put("/api/assets", "http://localhost:8081");
    routes.put("/api/simulation", "http://localhost:8081");
    routes.put("/api/work-orders", "http://localhost:8082");
    routes.put("/api/parts", "http://localhost:8082");
    routes.put("/api/suppliers", "http://localhost:8082");
    routes.put("/api/ai", "http://localhost:8083");
    routes.put("/api/auth", "http://localhost:8084");
    return routes;
  }
}