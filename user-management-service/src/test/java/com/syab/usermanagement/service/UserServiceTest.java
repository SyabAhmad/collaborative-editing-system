package com.syab.usermanagement.service;

import com.syab.usermanagement.dto.AuthRequest;
import com.syab.usermanagement.dto.AuthResponse;
import com.syab.usermanagement.dto.UserDTO;
import com.syab.usermanagement.dto.UserRegistrationRequest;
import com.syab.usermanagement.model.User;
import com.syab.usermanagement.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private UserService userService;

    private UserRegistrationRequest registrationRequest;
    private User user;

    @BeforeEach
    void setUp() {
        registrationRequest = new UserRegistrationRequest("testuser", "test@example.com", "password123", "Test", "User");
        user = new User(1L, "testuser", "test@example.com", "encodedPassword", "Test", "User", true, null, null);
    }

    @Test
    void testRegisterUserSuccess() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserDTO result = userService.registerUser(registrationRequest);

        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testRegisterUserWithDuplicateUsername() {
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> userService.registerUser(registrationRequest));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testAuthenticateUserSuccess() {
        AuthRequest authRequest = new AuthRequest("testuser", "password123");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwtToken");

        AuthResponse result = userService.authenticateUser(authRequest);

        assertNotNull(result);
        assertEquals("jwtToken", result.getToken());
        assertNotNull(result.getUser());
    }

    @Test
    void testAuthenticateUserInvalidCredentials() {
        AuthRequest authRequest = new AuthRequest("testuser", "wrongpassword");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpassword", "encodedPassword")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> userService.authenticateUser(authRequest));
    }

    @Test
    void testGetUserProfileSuccess() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserDTO result = userService.getUserProfile(1L);

        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        assertEquals("test@example.com", result.getEmail());
    }

    @Test
    void testGetUserProfileNotFound() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> userService.getUserProfile(1L));
    }

    @Test
    void testUpdateUserProfileSuccess() {
        UserRegistrationRequest updateRequest = new UserRegistrationRequest("testuser", "test@example.com", "password123", "UpdatedFirst", "UpdatedLast");
        User updatedUser = new User(1L, "testuser", "test@example.com", "encodedPassword", "UpdatedFirst", "UpdatedLast", true, null, null);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);

        UserDTO result = userService.updateUserProfile(1L, updateRequest);

        assertNotNull(result);
        assertEquals("UpdatedFirst", result.getFirstName());
        assertEquals("UpdatedLast", result.getLastName());
    }
}
