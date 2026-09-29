package com.sentinel.auth_service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {
  private final JwtService jwt;
  public MeController(JwtService jwt) { this.jwt = jwt; }

  @GetMapping("/api/auth/me")
  public ResponseEntity<?> me(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) return ResponseEntity.status(401).build();
    for (Cookie c : cookies) {
      if ("sentinel_token".equals(c.getName())) {
        try {
          var claims = jwt.parse(c.getValue());
          return ResponseEntity.ok(java.util.Map.of(
              "id", claims.getSubject(), "email", claims.get("email"), "role", claims.get("role")));
        } catch (Exception e) {
          return ResponseEntity.status(401).build();
        }
      }
    }
    return ResponseEntity.status(401).build();
  }
}