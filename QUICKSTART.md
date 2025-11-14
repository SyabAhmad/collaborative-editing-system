# Quick Start Guide - Collaborative Editing System

## Prerequisites

- PostgreSQL 12+
- Java 17+
- Maven 3.8+

## Step 1: Create PostgreSQL Databases

```sql
CREATE DATABASE user_management;
CREATE DATABASE document_editing;
CREATE DATABASE version_control;
```

## Step 2: Build the Project

```bash
cd "f:\code\CSC TASK\collaborative-editing-system"
mvn clean install
```

## Step 3: Run All Services

Open 4 terminal windows and run each service:

### Terminal 1 - API Gateway (Port 8081)

```bash
cd api-gateway
mvn spring-boot:run
```

### Terminal 2 - User Management (Port 8082)

```bash
cd user-management-service
mvn spring-boot:run
```

### Terminal 3 - Document Editing (Port 8083)

```bash
cd document-editing-service
mvn spring-boot:run
```

### Terminal 4 - Version Control (Port 8084)

```bash
cd version-control-service
mvn spring-boot:run
```

## Step 4: Test the System

### 1. Register a User

```bash
curl -X POST http://localhost:8081/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "password123",
    "firstName": "Alice",
    "lastName": "Smith"
  }'
```

Response: Returns user ID (use this as userId in next steps)

### 2. Authenticate User

```bash
curl -X POST http://localhost:8081/api/users/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "password123"
  }'
```

Response: Returns JWT token and user details

### 3. Create a Document

```bash
curl -X POST "http://localhost:8081/api/documents?title=ProjectProposal&userId=1"
```

Response: Returns document ID (use this as documentId)

### 4. Edit Document

```bash
curl -X PUT http://localhost:8081/api/documents/1/edit?userId=1 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is the project proposal content.",
    "operationType": "UPDATE"
  }'
```

### 5. Track Changes

```bash
curl http://localhost:8081/api/documents/1/changes
```

Response: Shows all edits made to the document

### 6. Create Version

```bash
curl -X POST "http://localhost:8081/api/versions?documentId=1&userId=1&content=Final+version+content&description=Final+proposal"
```

### 7. View Version History

```bash
curl http://localhost:8081/api/versions/1/history
```

### 8. Get User Contributions

```bash
curl http://localhost:8081/api/versions/1/contributions
```

Response: Shows how many changes each user made

## Testing

Run all unit tests:

```bash
mvn test
```

Run tests for specific service:

```bash
mvn -f user-management-service/pom.xml test
mvn -f document-editing-service/pom.xml test
mvn -f version-control-service/pom.xml test
```

## Service Ports Summary

| Service          | Port | Database         |
| ---------------- | ---- | ---------------- |
| API Gateway      | 8081 | -                |
| User Management  | 8082 | user_management  |
| Document Editing | 8083 | document_editing |
| Version Control  | 8084 | version_control  |

## Troubleshooting

**"Failed to determine a suitable driver class"**

- Make sure PostgreSQL is running and databases are created

**"Connection refused" on port 8081-8084**

- Ensure no other services are running on these ports. Stop any previous instances with Ctrl+C.
- If you get "Port already in use", kill the process using that port or use a different port temporarily.

**Tests failing**

- Make sure no services are running when running tests
- Tests use H2 in-memory database

## Key Endpoints

### User Management (/api/users)

- `POST /register` - Register new user
- `POST /authenticate` - Login
- `GET /{userId}` - Get profile
- `PUT /{userId}` - Update profile

### Document Editing (/api/documents)

- `POST ?title=X&userId=Y` - Create document
- `PUT /{id}/edit?userId=Y` - Edit document
- `GET /{id}/changes` - Get changes
- `GET /{id}` - Get document
- `GET /user/{userId}` - Get user's documents

### Version Control (/api/versions)

- `POST ?documentId=X&userId=Y&content=Z` - Create version
- `GET /{id}/revert/{versionNumber}` - Revert to version
- `GET /{id}/contributions` - User contributions
- `GET /{id}/history` - Version history

## Notes

- Each microservice has its own database for data isolation
- JWT authentication can be integrated by adding the token to request headers
- Real-time collaboration can be enhanced with WebSockets
- Consider adding message queues (RabbitMQ/Kafka) for async operations at scale
