package com.sentinel.auth_service;

import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final UserRepository repo;
  private final JwtService jwt;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

  public AuthController(UserRepository repo, JwtService jwt) {
    this.repo = repo;
    this.jwt = jwt;
  }

  @PostMapping("/register")
  public UserResponse register(@RequestBody RegisterRequest req, HttpServletResponse response) {
    if (repo.findByEmail(req.email()).isPresent()) {
      throw new IllegalArgumentException("Email already registered");
    }
    String id = "USR-" + UUID.randomUUID().toString().substring(0, 8);
    String hash = encoder.encode(req.password());
    UserRow user = new UserRow(id, req.email(), hash, req.name(), "VIEWER");
    repo.insert(user);
    setCookie(response, user);
    return new UserResponse(user.id(), user.email(), user.name(), user.role());
  }

  @PostMapping("/login")
  public UserResponse login(@RequestBody LoginRequest req, HttpServletResponse response) {
    UserRow user = repo
      .findByEmail(req.email())
      .filter(u -> encoder.matches(req.password(), u.passwordHash()))
      .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));
    setCookie(response, user);
    return new UserResponse(user.id(), user.email(), user.name(), user.role());
  }

  @PostMapping("/logout")
  public void logout(HttpServletResponse response) {
    ResponseCookie expired = ResponseCookie.from("sentinel_token", "")
      .httpOnly(true)
      .path("/")
      .maxAge(0)
      .sameSite("Lax")
      .build();
    response.addHeader("Set-Cookie", expired.toString());
  }

  private void setCookie(HttpServletResponse response, UserRow user) {
    String token = jwt.issue(user.id(), user.email(), user.role());
    ResponseCookie cookie = ResponseCookie.from("sentinel_token", token)
      .httpOnly(true)
      .path("/")
      .maxAge(12 * 3600)
      .sameSite("Lax")
      .build();
    response.addHeader("Set-Cookie", cookie.toString());
  }
}
