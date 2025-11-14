# Collaborative Editing System - Microservices Architecture

A complete microservice-based collaborative editing system similar to Google Docs, built with Spring Boot, featuring real-time collaborative editing, version control, and user management.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway (8081)                      │
│                    Routes to all microservices                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│   User Mgmt  │ │  Document    │ │  Version Control │
│   (8082)     │ │  Editing     │ │  (8084)          │
│              │ │  (8083)      │ │                  │
│ PostgreSQL   │ │              │ │  PostgreSQL      │
│ user_mgmt    │ │  PostgreSQL  │ │ version_control  │
│              │ │  doc_editing │ │                  │
└──────────────┘ └──────────────┘ └──────────────────┘
```

## Microservices Overview

### 1. User Management Service (Port 8082)

**Database:** `user_management`

**Operations:**

1. **User Registration** - `POST /api/users/register`
   - Register new users with email and password
   - Validates duplicate username/email
2. **User Authentication** - `POST /api/users/authenticate`
   - Authenticate users and return JWT token
   - Validates credentials
3. **User Profile Management** - `GET/PUT /api/users/{userId}`
   - Get user profile information
   - Update user profile (name, etc.)

### 2. Document Editing Service (Port 8083)

**Database:** `document_editing`

**Operations:**

1. **Create Document** - `POST /api/documents`
   - Create new document with title
   - Owned by specific user
2. **Edit Document** - `PUT /api/documents/{documentId}/edit`
   - Edit document content collaboratively
   - Supports INSERT, DELETE, UPDATE operations
3. **Track Changes in Real-time** - `GET /api/documents/{documentId}/changes`
   - Get all changes made to a document
   - Shows user, operation type, and timestamp

### 3. Version Control Service (Port 8084)

**Database:** `version_control`

**Operations:**

1. **Maintain Version History** - `POST /api/versions`
   - Create new versions when documents are edited
   - Stores version number, content, creator
2. **Revert to Previous Versions** - `GET /api/versions/{documentId}/revert/{versionNumber}`
   - Retrieve specific version of a document
   - Can restore previous versions
3. **Track User Contributions** - `GET /api/versions/{documentId}/contributions`
   - Track user contributions to each document
   - Count changes made by each user

### 4. API Gateway (Port 8081)

Routes all client requests to appropriate microservices using Spring Cloud Gateway

## Project Structure

```
collaborative-editing-system/
├── pom.xml (parent POM)
├── api-gateway/
│   ├── pom.xml
│   └── src/main/java/com/syab/apigateway/
│       └── ApiGatewayApplication.java
│   └── src/main/resources/
│       └── application.yml
├── user-management-service/
│   ├── pom.xml
│   └── src/main/java/com/syab/usermanagement/
│       ├── model/User.java
│       ├── repository/UserRepository.java
│       ├── service/UserService.java
│       ├── service/JwtService.java
│       ├── controller/UserController.java
│       ├── dto/UserRegistrationRequest.java
│       ├── dto/AuthRequest.java
│       ├── dto/AuthResponse.java
│       ├── dto/UserDTO.java
│       └── UserManagementApplication.java
│   └── src/test/java/com/syab/usermanagement/
│       └── service/UserServiceTest.java
├── document-editing-service/
│   ├── pom.xml
│   └── src/main/java/com/syab/documentediting/
│       ├── model/Document.java
│       ├── model/DocumentChange.java
│       ├── repository/DocumentRepository.java
│       ├── repository/DocumentChangeRepository.java
│       ├── service/DocumentService.java
│       ├── controller/DocumentController.java
│       ├── dto/DocumentDTO.java
│       ├── dto/DocumentChangeDTO.java
│       ├── dto/EditDocumentRequest.java
│       └── DocumentEditingApplication.java
│   └── src/test/java/com/syab/documentediting/
│       └── service/DocumentServiceTest.java
└── version-control-service/
    ├── pom.xml
    └── src/main/java/com/syab/versioncontrol/
        ├── model/DocumentVersion.java
        ├── model/UserContribution.java
        ├── repository/DocumentVersionRepository.java
        ├── repository/UserContributionRepository.java
        ├── service/VersionControlService.java
        ├── controller/VersionControlController.java
        ├── dto/DocumentVersionDTO.java
        ├── dto/UserContributionDTO.java
        └── VersionControlApplication.java
    └── src/test/java/com/syab/versioncontrol/
        └── service/VersionControlServiceTest.java
```

## Database Schema

### User Management DB (user_management)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Document Editing DB (document_editing)

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  owner_id BIGINT NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_changes (
  id SERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  change_content TEXT,
  operation_type VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Version Control DB (version_control)

```sql
CREATE TABLE document_versions (
  id SERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL,
  version_number INT NOT NULL,
  content TEXT NOT NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

CREATE TABLE user_contributions (
  id SERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  changes_count INT DEFAULT 0,
  last_edited_at TIMESTAMP
);
```

## Setup & Installation

### Prerequisites

- Java 17+
- PostgreSQL 12+
- Maven 3.8+

### Database Setup

Create the three databases:

```sql
CREATE DATABASE user_management;
CREATE DATABASE document_editing;
CREATE DATABASE version_control;
```

### Configuration

Update PostgreSQL credentials in each service's `application.yml`:

```yaml
spring:
  datasource:
    username: postgres
    password: your_password
```

# Build & Run

**Build entire project:**

```bash
cd collaborative-editing-system
mvn clean install
```

**Start each microservice:**

```bash
# Terminal 1: API Gateway (port 8081)
cd api-gateway
mvn spring-boot:run

# Terminal 2: User Management Service (port 8082)
cd user-management-service
mvn spring-boot:run

# Terminal 3: Document Editing Service (port 8083)
cd document-editing-service
mvn spring-boot:run

# Terminal 4: Version Control Service (port 8084)
cd version-control-service
mvn spring-boot:run
```

All requests go through API Gateway at `http://localhost:8081`

## API Endpoints

### User Management

- **Register:** `POST /api/users/register`
- **Authenticate:** `POST /api/users/authenticate`
- **Get Profile:** `GET /api/users/{userId}`
- **Update Profile:** `PUT /api/users/{userId}`

### Document Editing

- **Create:** `POST /api/documents?title=MyDoc&userId=1`
- **Edit:** `PUT /api/documents/{documentId}/edit?userId=1`
- **Get Changes:** `GET /api/documents/{documentId}/changes`
- **Get Document:** `GET /api/documents/{documentId}`
- **User Documents:** `GET /api/documents/user/{userId}`

### Version Control

- **Create Version:** `POST /api/versions?documentId=1&userId=1&content=...`
- **Revert:** `GET /api/versions/{documentId}/revert/{versionNumber}`
- **Contributions:** `GET /api/versions/{documentId}/contributions`
- **History:** `GET /api/versions/{documentId}/history`

## Testing

Run unit tests:

```bash
# Test User Management Service
mvn -f user-management-service/pom.xml test

# Test Document Editing Service
mvn -f document-editing-service/pom.xml test

# Test Version Control Service
mvn -f version-control-service/pom.xml test
```

All services include JUnit tests with Mockito for service layer testing.

## Example Usage Flow

1. **Register User**

   ```bash
   curl -X POST http://localhost:8081/api/users/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "john_doe",
       "email": "john@example.com",
       "password": "securepass123",
       "firstName": "John",
       "lastName": "Doe"
     }'
   ```

2. **Authenticate & Get Token**

   ```bash
   curl -X POST http://localhost:8081/api/users/authenticate \
     -H "Content-Type: application/json" \
     -d '{
       "username": "john_doe",
       "password": "securepass123"
     }'
   ```

3. **Create Document**

   ```bash
   curl -X POST http://localhost:8081/api/documents?title=MyDocument&userId=1
   ```

4. **Edit Document**

   ```bash
   curl -X PUT http://localhost:8081/api/documents/1/edit?userId=1 \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Updated content here",
       "operationType": "UPDATE"
     }'
   ```

5. **Track Changes**
   ```bash
   curl http://localhost:8081/api/documents/1/changes
   ```

## Technologies Used

- **Framework:** Spring Boot 3.5.7
- **Database:** PostgreSQL
- **API Gateway:** Spring Cloud Gateway
- **Security:** Spring Security + JWT
- **Testing:** JUnit 5 + Mockito
- **Build:** Maven
- **Java Version:** 17

## Key Features

✅ **Multi-microservice architecture** with independent databases  
✅ **Real-time collaborative editing** with change tracking  
✅ **Complete version control** with revert capabilities  
✅ **User authentication** with JWT tokens  
✅ **Comprehensive REST APIs** for all operations  
✅ **Complete unit tests** using JUnit and Mockito  
✅ **Scalable design** with API Gateway routing  
✅ **Database persistence** with JPA/Hibernate

## Future Enhancements

- WebSocket integration for real-time collaboration
- Redis caching for performance
- Message queues for async operations
- Eureka service discovery
- Docker containerization
- Swagger/OpenAPI documentation
- Load balancing and clustering
