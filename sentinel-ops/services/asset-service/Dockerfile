# syntax=docker/dockerfile:1
FROM eclipse-temurin:25-jdk AS build
WORKDIR /build
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
COPY src/ src/
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -DskipTests package \
    && cp target/asset-service-0.0.1-SNAPSHOT.jar /build/app.jar

FROM eclipse-temurin:25-jre
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
WORKDIR /app
COPY --from=build --chown=app:app /build/app.jar ./app.jar
USER app
ENV SERVER_PORT=8081
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"
EXPOSE 8081
HEALTHCHECK --interval=20s --timeout=5s --start-period=60s --retries=5 \
    CMD curl --fail --silent http://localhost:${SERVER_PORT}/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
