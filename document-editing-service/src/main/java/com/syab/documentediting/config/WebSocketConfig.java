package com.syab.documentediting.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Allow SockJS and WebSocket connections from the UI and gateway origins.
        // This enables STOMP handshake to accept cross-origin connections.
        // Rely on API gateway to handle CORS. Avoid setting CORS headers here to prevent
        // duplicate Access-Control-Allow-Origin headers when the gateway already sets them.
        registry.addEndpoint("/ws").withSockJS();
    }
}