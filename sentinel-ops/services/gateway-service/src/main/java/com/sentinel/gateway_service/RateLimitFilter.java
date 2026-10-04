package com.sentinel.gateway_service;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RateLimitFilter implements Filter {

  private final int limit;
  private final long windowMillis;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  private static class Window {

    long start = System.currentTimeMillis();
    int count;
  }

  public RateLimitFilter(
    @Value("${GATEWAY_RATE_LIMIT_PER_MINUTE:300}") int limit,
    @Value("${GATEWAY_RATE_LIMIT_WINDOW_SECONDS:60}") int windowSeconds
  ) {
    if (limit < 1 || windowSeconds < 1) throw new IllegalArgumentException(
      "Rate limits must be positive"
    );
    this.limit = limit;
    this.windowMillis = windowSeconds * 1000L;
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
    throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    if ("OPTIONS".equals(request.getMethod()) || !request.getRequestURI().startsWith("/api/")) {
      chain.doFilter(req, res);
      return;
    }
    Window window = windows.computeIfAbsent(request.getRemoteAddr(), key -> new Window());
    long retrySeconds = 0;
    synchronized (window) {
      long now = System.currentTimeMillis();
      if (now - window.start >= windowMillis) {
        window.start = now;
        window.count = 0;
      }
      if (++window.count > limit) retrySeconds = Math.max(
        1,
        (windowMillis - (now - window.start) + 999) / 1000
      );
    }
    if (retrySeconds > 0) {
      response.setStatus(429);
      response.setHeader("Retry-After", Long.toString(retrySeconds));
      response.setContentType("application/json");
      response
        .getWriter()
        .write(
          "{\"message\":\"Request limit reached. Please retry in " + retrySeconds + " seconds.\"}"
        );
      return;
    }
    chain.doFilter(req, res);
  }
}
