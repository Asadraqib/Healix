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
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String path = request.getRequestURI();

    boolean isPublic = PUBLIC_PREFIXES.stream().anyMatch(path::startsWith) || "OPTIONS".equals(request.getMethod());
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
      Jwts.parser().verifyWith((javax.crypto.SecretKey) key).build().parseSignedClaims(token);
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