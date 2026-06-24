package com.company.skillmd.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        Info info = new Info()
            .title("Skill.md Service")
            .version("0.0.1")
            .description("Team-shared Skill.md editor and management service")
            .contact(new Contact()
                .name("Skill.md Team")
                .email("skillmd@company.com"));
        
        return new OpenAPI().info(info);
    }
}
