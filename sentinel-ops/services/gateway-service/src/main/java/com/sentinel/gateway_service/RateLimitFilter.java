package com.sentinel.gateway_service;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

@Component
public class RateLimitFilter implements Filter {
  private static final int LIMIT_PER_MINUTE = 60;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  private static class Window {
    long windowStart = System.currentTimeMillis();
    AtomicInteger count = new AtomicInteger(0);
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String ip = request.getRemoteAddr();
    Window w = windows.computeIfAbsent(ip, k -> new Window());

    long now = System.currentTimeMillis();
    if (now - w.windowStart > 60_000) {
      w.windowStart = now;
      w.count.set(0);
    }
    if (w.count.incrementAndGet() > LIMIT_PER_MINUTE) {
      response.setStatus(429);
      response.setContentType("application/json");
      response.getWriter().write("{\"message\":\"Too many requests, slow down.\"}");
      return;
    }
    chain.doFilter(req, res);
  }
}