# Collaborative Editing System - Frontend

A modern, professional React frontend for the collaborative document editing system.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── styles/
│   │   │       └── Auth.css
│   │   ├── documents/
│   │   │   ├── DocumentList.jsx
│   │   │   ├── DocumentEditor.jsx
│   │   │   └── styles/
│   │   │       ├── DocumentList.css
│   │   │       └── DocumentEditor.css
│   │   ├── versions/
│   │   │   ├── VersionHistory.jsx
│   │   │   └── styles/
│   │   │       └── VersionHistory.css
│   │   ├── ProtectedRoute.jsx
│   │   └── styles/
│   ├── context/
│   │   ├── AuthContext.js
│   │   └── DocumentContext.js
│   ├── services/
│   │   ├── api.js
│   │   └── endpoints.js
│   ├── hooks/
│   │   └── useCustomHooks.js
│   ├── utils/
│   │   └── helpers.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── package.json
└── vite.config.js
```

## Features

- **Authentication**: Register and login with JWT token support
- **Document Management**: Create, edit, and view documents
- **Version Control**: Track document versions, contributions, and revert to previous versions
- **Protected Routes**: Routes are protected with authentication checks
- **State Management**: Context API for auth and document state
- **API Integration**: Axios-based service layer for backend communication
- **Real-time**: Uses Server-Sent Events (SSE) for presence and a WebSocket channel for low-latency edit updates

## Setup & Installation

1. Install dependencies:

```bash
npm install
```

2. Install additional required packages:

```bash
npm install react-router-dom axios date-fns react-icons
```

3. Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Environment Configuration

Ensure the backend services are running:

- API Gateway: `http://localhost:8081`
- User Management: `http://localhost:8082`
- Document Editing: `http://localhost:8083`
- Version Control: `http://localhost:8084`

### Custom backend URL

- The frontend defaults to `/api` so requests go through the API Gateway (port `8081`).
- When running a service directly (e.g., document editing on `8083`) without the gateway, set `VITE_API_URL` to `http://localhost:8083/api` and restart the dev server.
- Store overrides in `.env.local` or `.env` in the `frontend` directory, e.g. `VITE_API_URL=http://localhost:8081/api`.

## API Endpoints Used

### Authentication

- `POST /api/users/register` - Register new user
- `POST /api/users/authenticate` - Login user
- `GET /api/users/{userId}` - Get user profile
- `PUT /api/users/{userId}` - Update profile

### Documents

- `POST /api/documents` - Create document
- `GET /api/documents/{documentId}` - Get document
- `GET /api/documents/user/{userId}` - Get user's documents
- `PUT /api/documents/{documentId}/edit` - Edit document
- `GET /api/documents/{documentId}/changes` - Get changes
- `DELETE /api/documents/{documentId}` - Delete document

### Versions

- `POST /api/versions` - Create version
- `GET /api/versions/{documentId}/history` - Get version history
- `GET /api/versions/{documentId}/revert/{versionNumber}` - Revert version
- `GET /api/versions/{documentId}/contributions` - Get user contributions

## Code Architecture

### Services Layer

- `api.js`: Axios instance with JWT token handling and interceptors
- `endpoints.js`: Organized API endpoints by domain (auth, document, version)

### Context API

- `AuthContext.js`: Manages user authentication state and JWT token
- `DocumentContext.js`: Manages document and version state

### Components

- **Auth**: Login and Register pages with form validation
- **Documents**: List, create, and edit documents
- **Versions**: View version history and revert to previous versions
- **ProtectedRoute**: Route guard for authenticated pages

### Utils

- `helpers.js`: Common utility functions (date formatting, validation, etc.)

## Features Breakdown

### Authentication Flow

1. User registers with email, password, and full name
2. Backend returns user data and JWT token
3. Token is stored in localStorage
4. Token is automatically added to API requests via axios interceptor
5. On logout, token and user data are cleared

### Document Management

1. Users can create new documents with a title
2. Documents can be edited in a textarea editor
3. Content is saved to the backend
4. Users can view all their documents
5. Each document shows a preview of the content

### Version Control

1. Users can create versions of documents
2. Version history shows all previous versions with timestamps
3. User contributions are tracked and displayed
4. Users can revert to any previous version

## Styling

The app uses a modern, gradient-based design with:

- Purple to violet gradient (`#667eea` to `#764ba2`)
- Clean card layouts
- Responsive grid system
- Smooth transitions and hover effects
- Professional typography

## Future Enhancements

- Real-time collaboration with WebSockets
- Rich text editor (draft-js or slate)
- Document sharing and permissions
- Comments and annotations
- Search functionality
- Dark mode
- Mobile responsive design improvements
- Undo/redo functionality
- Diff viewer for versions
