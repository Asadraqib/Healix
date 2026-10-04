package com.sentinel.gateway_service;

import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

@SpringBootTest
class GatewayServiceApplicationTests {

  @Autowired
  ApplicationContext context;

  @Test
  void contextLoads() {}

  @Test
  void uploadsRemainRawForProxyForwarding() {
    assertFalse(
      context.containsBean("multipartResolver"),
      "Gateway must not consume or apply Spring's default 1 MB limit to AI uploads"
    );
  }
}
