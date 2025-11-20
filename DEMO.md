# Demo Instructions

This file contains a short demo script and steps to show the collaborative editing flows.

Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 18+ (or compatible) + npm

Quick start (one-liners)

1. Start all services and the frontend (opens new windows):

```powershell
./start.ps1
```

2. Open two browsers (or one browser and an incognito window)
3. Register two accounts via the frontend: `http://localhost:5173`
4. Create a document with user A, then copy the share link and open it as user B
5. Make changes in user A and click Save (or toggle Auto-save). User B should see a small "Remote changes detected" banner and may choose to apply the remote change.
6. Look at the top of the editor: there is a small indicator that shows whether the client is using WebSocket for real-time updates (`Realtime: WS`) or SSE fallback (`Realtime: SSE`).
7. Create a new version via the `Create Version` button and open the `History` page to show revert functionality.

Notes

- The application uses both SSE and WebSocket. SSE provides presence and server-initiated events; the WebSocket is a simple low-latency broadcast for immediate notifications and updates.
- Conflict handling is intentionally simple: if the local text differs from the last fetched content, we show a remote change banner and let the user choose to apply or ignore remote changes.

Optional

- For a more reproducible demo, you can create two test accounts and show the same steps quickly.

## Debugging WebSocket issues

If your browser console shows "WebSocket closed before the connection is established", try the following:

1. Make sure `document-editing-service` is running on port `8083` (run `mvn spring-boot:run` inside the service directory). Check the server console for logs.
2. Watch the `document-editing-service` console for `WS connect request:` lines — they should be logged when the client attempts a connection.
3. Use a WebSocket test client (e.g. `wscat`) in a separate terminal to verify the endpoint:

```powershell
# (install if needed): npm i -g wscat
wscat -c ws://localhost:8083/ws/documents?documentId=1&userId=1
```

4. If the server closes the connection early, check for errors in the service logs; we log the reason for closure and the `sessionId` (search for `WS connect request:`).
5. If the server is behind a reverse proxy or API Gateway, consider routing `/ws/**` through the gateway or let the client connect directly to the service port.
6. If the connection fails but SSE works, the UI will still receive presence and change events via SSE (the WebSocket is a low-latency optimization — the system falls back to SSE).

## Gateway checks

If you want to test via the gateway (i.e. `ws://localhost:8081`), run a `wscat` test against the gateway and then inspect the gateway logs for a debug handshake log (the gateway will output proxy logs if `org.springframework.cloud.gateway` debugging is enabled):

```powershell
wscat -c ws://localhost:8081/ws/documents?documentId=1&userId=1
```

Watch gateway logs (api-gateway console) for route match and websocket handshake activity. If the gateway logs show a proxy error or connection failure, ensure the gateway is running and the route `/ws/**` points to the doc-editing service.

## Quick ws-check script

You can run a Node script to test the ws endpoint and echo messages:

```powershell
cd frontend
npm install
npm run ws-check ws://localhost:8081/ws/documents?documentId=1&userId=1
```

This tests the gateway path. If you want to check the document service directly, change the URL to `ws://localhost:8083/ws/documents?documentId=1&userId=1`.
