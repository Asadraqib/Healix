package com.sentinel.gateway_service;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

@RestController
public class ProxyController {

  private final RestClient restClient = RestClient.create();
  private final Map<String, String> routes;

  public ProxyController(Map<String, String> routeTable) {
    this.routes = routeTable;
  }

  @RequestMapping("/api/**")
  public ResponseEntity<byte[]> proxy(HttpServletRequest request) throws Exception {
    String path = request.getRequestURI();
    String target = routes
      .entrySet()
      .stream()
      .filter(e -> path.startsWith(e.getKey()))
      .map(Map.Entry::getValue)
      .findFirst()
      .orElse(null);

    if (target == null) {
      return ResponseEntity.status(502).body(("No route for " + path).getBytes());
    }

    String query = request.getQueryString();
    String url = target + path + (query != null ? "?" + query : "");
    byte[] body = request.getInputStream().readAllBytes();

    RestClient.RequestBodySpec spec = restClient
      .method(HttpMethod.valueOf(request.getMethod()))
      .uri(url);

    for (String name : Collections.list(request.getHeaderNames())) {
      if (!name.equalsIgnoreCase("host") && !name.equalsIgnoreCase("content-length")) {
        spec.header(name, request.getHeader(name));
      }
    }
    if (body.length > 0) spec.body(body);

    return spec.exchange((req, resp) -> {
      HttpHeaders headers = new HttpHeaders();
      resp.getHeaders().forEach((k, v) -> {
        if (!k.equalsIgnoreCase("transfer-encoding") && !k.equalsIgnoreCase("connection")) {
          headers.put(k, v);
        }
      });
      return ResponseEntity.status(resp.getStatusCode())
        .headers(headers)
        .body(resp.getBody().readAllBytes());
    });
  }
}
