package com.syab.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();
        corsConfig.setAllowedOrigins(Arrays.asList(
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000"
        ));
        // Support origin patterns (e.g., dev proxies and dynamic ports) to allow SockJS
        // /info requests from frontend dev servers without adding duplicate headers.
        corsConfig.setAllowedOriginPatterns(Arrays.asList("*"));
        corsConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        corsConfig.setAllowedHeaders(Arrays.asList("*"));
        corsConfig.setAllowCredentials(true);
        corsConfig.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply CORS for API and WebSocket routes so SockJS/WS probing through
        // the gateway returns proper CORS headers. Backend services should NOT
        // add their own CORS headers to avoid duplicates.
        source.registerCorsConfiguration("/api/**", corsConfig);
        // Also allow CORS for websocket endpoints (SockJS probes /ws/info and /ws/iframe.html)
        source.registerCorsConfiguration("/ws/**", corsConfig);

        return new CorsWebFilter(source);
    }
}
