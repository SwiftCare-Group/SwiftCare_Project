package com.swiftcare.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.cloud.gateway.route.RouteDefinitionLocator;

import java.net.URI;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "IDENTITY_SERVICE_URL=http://identity:8081",
        "APPOINTMENT_SERVICE_URL=http://appointment:8082",
        "CLINICAL_SERVICE_URL=http://clinical:8083",
        "SYMPTOM_SERVICE_URL=http://symptom:8084",
        "SUBSCRIPTION_SERVICE_URL=http://subscription:8085",
        "NOTIFICATION_SERVICE_URL=http://notification:8086"
})
class GatewayRouteContractTest {

    @Autowired
    private RouteDefinitionLocator routeDefinitionLocator;

    @Test
    void loadsEveryPublicAndHealthRouteWithExpectedDestination() {
        Map<String, RouteDefinition> routes = routeDefinitionLocator
                .getRouteDefinitions()
                .collectList()
                .blockOptional()
                .orElseThrow()
                .stream()
                .collect(Collectors.toMap(
                        RouteDefinition::getId,
                        Function.identity()
                ));

        assertThat(routes.keySet()).containsExactlyInAnyOrder(
                "identity-health",
                "appointment-health",
                "clinical-health",
                "symptom-health",
                "subscription-health",
                "notification-health",
                "identity-service",
                "clinical-admin",
                "appointment-admin",
                "appointment-service",
                "clinical-service",
                "symptom-service",
                "subscription-service",
                "notification-service"
        );

        assertDestination(routes, "identity-health", "http://identity:8081");
        assertDestination(routes, "identity-service", "http://identity:8081");
        assertDestination(routes, "appointment-health", "http://appointment:8082");
        assertDestination(routes, "appointment-service", "http://appointment:8082");
        assertDestination(routes, "appointment-admin", "http://appointment:8082");
        assertDestination(routes, "clinical-health", "http://clinical:8083");
        assertDestination(routes, "clinical-service", "http://clinical:8083");
        assertDestination(routes, "clinical-admin", "http://clinical:8083");
        assertDestination(routes, "symptom-health", "http://symptom:8084");
        assertDestination(routes, "symptom-service", "http://symptom:8084");
        assertDestination(routes, "subscription-health", "http://subscription:8085");
        assertDestination(routes, "subscription-service", "http://subscription:8085");
        assertDestination(routes, "notification-health", "http://notification:8086");
        assertDestination(routes, "notification-service", "http://notification:8086");

        assertThat(routes.entrySet())
                .filteredOn(entry -> entry.getKey().endsWith("-health"))
                .allSatisfy(entry ->
                        assertThat(entry.getValue().getFilters())
                                .anySatisfy(filter ->
                                        assertThat(filter.getName())
                                                .isEqualTo("SetPath")
                                )
                );
    }

    private void assertDestination(
            Map<String, RouteDefinition> routes,
            String routeId,
            String expectedUri
    ) {
        assertThat(routes.get(routeId).getUri())
                .isEqualTo(URI.create(expectedUri));
    }
}