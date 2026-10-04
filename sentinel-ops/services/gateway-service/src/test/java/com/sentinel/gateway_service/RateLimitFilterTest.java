package com.sentinel.gateway_service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitFilterTest {

  @Test
  void acceptsConfiguredBudgetAndReturnsCooldownWhenExceeded() throws Exception {
    var filter = new RateLimitFilter(3, 60);
    FilterChain chain = mock(FilterChain.class);
    for (int i = 0; i < 3; i++) {
      var response = new MockHttpServletResponse();
      filter.doFilter(new MockHttpServletRequest("GET", "/api/assets"), response, chain);
      assertEquals(200, response.getStatus());
    }
    var rejected = new MockHttpServletResponse();
    filter.doFilter(new MockHttpServletRequest("GET", "/api/assets"), rejected, chain);
    assertEquals(429, rejected.getStatus());
    assertTrue(Integer.parseInt(rejected.getHeader("Retry-After")) > 0);
    verify(chain, times(3)).doFilter(any(), any());
  }

  @Test
  void healthChecksAndPreflightDoNotConsumeTheBudget() throws Exception {
    var filter = new RateLimitFilter(1, 60);
    FilterChain chain = mock(FilterChain.class);
    filter.doFilter(
      new MockHttpServletRequest("GET", "/actuator/health"),
      new MockHttpServletResponse(),
      chain
    );
    filter.doFilter(
      new MockHttpServletRequest("OPTIONS", "/api/assets"),
      new MockHttpServletResponse(),
      chain
    );
    var response = new MockHttpServletResponse();
    filter.doFilter(new MockHttpServletRequest("GET", "/api/assets"), response, chain);
    assertEquals(200, response.getStatus());
    verify(chain, times(3)).doFilter(any(), any());
  }

  @Test
  void defaultBudgetSupportsNormalDashboardPolling() throws Exception {
    var filter = new RateLimitFilter(300, 60);
    for (int i = 0; i < 120; i++) {
      var response = new MockHttpServletResponse();
      filter.doFilter(
        new MockHttpServletRequest("GET", "/api/assets"),
        response,
        mock(FilterChain.class)
      );
      assertEquals(200, response.getStatus());
    }
  }
}
