package com.syab.usermanagement.controller;

import com.syab.usermanagement.dto.AuthRequest;
import com.syab.usermanagement.dto.AuthResponse;
import com.syab.usermanagement.dto.UserDTO;
import com.syab.usermanagement.dto.UserRegistrationRequest;
import com.syab.usermanagement.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Operation 1: Register a new user
     * POST /api/users/register
     */
    @PostMapping("/register")
    public ResponseEntity<UserDTO> registerUser(@Valid @RequestBody UserRegistrationRequest request) {
        UserDTO user = userService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    /**
     * Operation 2: Authenticate user and get JWT token
     * POST /api/users/authenticate
     */
    @PostMapping("/authenticate")
    public ResponseEntity<AuthResponse> authenticateUser(@RequestBody AuthRequest request) {
        AuthResponse response = userService.authenticateUser(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Operation 3: Get user profile
     * GET /api/users/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserDTO> getUserProfile(@PathVariable Long userId) {
        UserDTO user = userService.getUserProfile(userId);
        return ResponseEntity.ok(user);
    }

    /**
     * Operation 3 (Extended): Update user profile
     * PUT /api/users/{userId}
     */
    @PutMapping("/{userId}")
    public ResponseEntity<UserDTO> updateUserProfile(@PathVariable Long userId, @Valid @RequestBody UserRegistrationRequest request) {
        UserDTO user = userService.updateUserProfile(userId, request);
        return ResponseEntity.ok(user);
    }
}
