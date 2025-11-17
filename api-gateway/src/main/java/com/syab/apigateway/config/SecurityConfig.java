package com.syab.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        http
            .csrf().disable()
            // allow framing so SockJS iframe transport can properly load iframe content
            .headers(headers -> headers.frameOptions().disable())
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/ws/**").permitAll()
                .anyExchange().permitAll()
            );
        return http.build();
    }
}