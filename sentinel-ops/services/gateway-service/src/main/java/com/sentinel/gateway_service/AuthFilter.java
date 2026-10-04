package com.sentinel.gateway_service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.Key;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AuthFilter implements Filter {

  private final Key key;
  private static final Set<String> PUBLIC_PREFIXES = Set.of("/api/auth", "/actuator");

  public AuthFilter(@Value("${app.jwt.secret}") String secret) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes());
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
    throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String path = request.getRequestURI();

    boolean isPublic =
      PUBLIC_PREFIXES.stream().anyMatch(path::startsWith) || "OPTIONS".equals(request.getMethod());
    if (isPublic) {
      chain.doFilter(req, res);
      return;
    }

    String token = extractToken(request);
    if (token == null) {
      unauthorized(response, "Missing session");
      return;
    }
    try {
      var claims = Jwts.parser()
        .verifyWith((javax.crypto.SecretKey) key)
        .build()
        .parseSignedClaims(token)
        .getPayload();
      String role = String.valueOf(claims.get("role"));
      boolean write = !Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod());
      boolean engineer = Set.of("ADMIN", "RELIABILITY_ENGINEER").contains(role);
      boolean operator = engineer || "TECHNICIAN".equals(role);
      boolean allowed =
        path.startsWith("/api/notifications") ||
        (!write && !path.startsWith("/api/ai")) ||
        (path.startsWith("/api/ai")
          ? engineer
          : path.startsWith("/api/parts") || path.startsWith("/api/suppliers")
            ? path.endsWith("/consume")
              ? operator
              : engineer
            : operator);
      if (!allowed) {
        response.setStatus(403);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"Your role does not permit this action\"}");
        return;
      }
      if (
        write &&
        "SIMULATION".equalsIgnoreCase(request.getHeader("X-Healix-Mode")) &&
        !path.startsWith("/api/ai")
      ) {
        response.setStatus(409);
        response
          .getWriter()
          .write("{\"message\":\"Simulation writes must remain in temporary browser state\"}");
        return;
      }
    } catch (Exception e) {
      unauthorized(response, "Invalid or expired session");
      return;
    }
    chain.doFilter(req, res);
  }

  private String extractToken(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) return null;
    for (Cookie c : cookies) {
      if ("sentinel_token".equals(c.getName())) return c.getValue();
    }
    return null;
  }

  private void unauthorized(HttpServletResponse response, String message) throws IOException {
    response.setStatus(401);
    response.setContentType("application/json");
    response.getWriter().write("{\"message\":\"" + message + "\"}");
  }
}
