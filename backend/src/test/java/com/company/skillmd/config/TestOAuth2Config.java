package com.company.skillmd.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@TestConfiguration
@Profile("test")
public class TestOAuth2Config {

    @Bean
    @Primary
    public JwtDecoder jwtDecoder() {
        // Return a no-op decoder for tests - all JWTs will be considered invalid
        // but since we're permitting all requests in TestSecurityConfig, this won't matter
        return token -> null;
    }
}
