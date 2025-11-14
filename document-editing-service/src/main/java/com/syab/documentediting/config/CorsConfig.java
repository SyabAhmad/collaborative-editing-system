package com.syab.documentediting.config;

import org.springframework.context.annotation.Configuration;

/**
 * CORS configuration is handled by the API Gateway (CorsConfig).
 * Backend services should not set CORS headers to avoid duplicate headers.
 * Keeping this class for reference, but it's not active.
 */
@Configuration
public class CorsConfig {
    // CORS is managed at the API Gateway level
}
