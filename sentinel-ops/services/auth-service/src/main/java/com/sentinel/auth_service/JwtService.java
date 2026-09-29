package com.sentinel.auth_service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtService {
  private final Key key;
  private final long expiryMillis;

  public JwtService(@Value("${app.jwt.secret}") String secret,
                     @Value("${app.jwt.expiry-hours}") long expiryHours) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes());
    this.expiryMillis = expiryHours * 3600_000L;
  }

  public String issue(String userId, String email, String role) {
    Date now = new Date();
    return Jwts.builder()
        .subject(userId)
        .claim("email", email)
        .claim("role", role)
        .issuedAt(now)
        .expiration(new Date(now.getTime() + expiryMillis))
        .signWith(key)
        .compact();
  }

  public io.jsonwebtoken.Claims parse(String token) {
    return Jwts.parser().verifyWith((javax.crypto.SecretKey) key).build()
        .parseSignedClaims(token).getPayload();
  }
}