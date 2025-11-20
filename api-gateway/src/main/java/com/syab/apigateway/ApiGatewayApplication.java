package com.syab.apigateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class ApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }

    @Bean
    public RouteLocator gatewayRoutes(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("user-management", r -> r
                        .path("/api/users/**")
                        .uri("http://localhost:8082"))
                .route("document-editing", r -> r
                        .path("/api/documents/**")
                        .uri("http://localhost:8083"))
                // route to proxy WebSocket connections for document editing
                .route("document-editing-ws", r -> r
                        .path("/ws/**")
                        .uri("http://localhost:8083"))
                .route("version-control", r -> r
                        .path("/api/versions/**")
                        .uri("http://localhost:8084"))
                .build();
    }
}
