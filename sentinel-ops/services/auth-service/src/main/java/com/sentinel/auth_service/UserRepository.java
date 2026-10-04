package com.sentinel.auth_service;

import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

  private final JdbcClient jdbc;

  public UserRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  private static final String COLS = "id, email, password_hash, name, role";

  public Optional<UserRow> findByEmail(String email) {
    return jdbc
      .sql("SELECT " + COLS + " FROM auth.users WHERE email = :email")
      .param("email", email)
      .query(UserRow.class)
      .optional();
  }

  public void insert(UserRow u) {
    jdbc
      .sql(
        "INSERT INTO auth.users (id, email, password_hash, name, role) VALUES (:id, :email, :hash, :name, :role)"
      )
      .param("id", u.id())
      .param("email", u.email())
      .param("hash", u.passwordHash())
      .param("name", u.name())
      .param("role", u.role())
      .update();
  }
}
