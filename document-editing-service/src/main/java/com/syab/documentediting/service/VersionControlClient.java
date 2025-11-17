package com.syab.documentediting.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
public class VersionControlClient {

    private final RestTemplate restTemplate;

    @Value("${version-control-service.url}")
    private String versionControlUrl;

    public VersionControlClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public void createVersion(Long documentId, Long userId, String content, String description) {
        String url = versionControlUrl + "/api/versions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("documentId", documentId.toString());
        map.add("userId", userId.toString());
        map.add("content", content);
        if (description != null) {
            map.add("description", description);
        }

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                System.err.println("Failed to create version: " + response.getStatusCode());
            }
        } catch (Exception e) {
            System.err.println("Error calling version control service: " + e.getMessage());
        }
    }
}