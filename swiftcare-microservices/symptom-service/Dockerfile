FROM eclipse-temurin:24-jdk AS build

WORKDIR /workspace

COPY . .

RUN sed -i 's/\r$//' gradlew \
    && chmod +x gradlew \
    && ./gradlew :symptom-service:bootJar --no-daemon

FROM eclipse-temurin:24-jdk

WORKDIR /app

COPY --from=build /workspace/symptom-service/build/libs/*.jar app.jar

EXPOSE 10000

ENTRYPOINT ["java", "-jar", "/app/app.jar"]