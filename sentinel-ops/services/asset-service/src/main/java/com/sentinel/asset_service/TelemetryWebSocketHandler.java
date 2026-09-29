package com.sentinel.asset_service;

import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class TelemetryWebSocketHandler extends TextWebSocketHandler {
  private final CopyOnWriteArrayList<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    sessions.add(session);
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    sessions.remove(session);
  }

  public void broadcast(String json) {
    for (WebSocketSession session : sessions) {
      try {
        if (session.isOpen()) session.sendMessage(new TextMessage(json));
      } catch (Exception ignored) {
        // a dead session will be removed on its own close callback
      }
    }
  }
}