package com.swiftcare.backend.config;

import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient.Builder restClientBuilder() {
        var requestFactory =
                ClientHttpRequestFactoryBuilder
                        .detect()
                        .build();

        requestFactory.setConnectTimeout(
                Duration.ofSeconds(2)
        );

        requestFactory.setReadTimeout(
                Duration.ofSeconds(3)
        );

        return RestClient.builder()
                .requestFactory(requestFactory);
    }
}