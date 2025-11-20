// Simple Node CLI WebSocket tester
// Usage: node tools/ws-test.js ws://localhost:8081/ws/documents?documentId=1&userId=1
const WebSocket = require("ws");

const argUrl = process.argv[2];
const direct =
  argUrl || "ws://localhost:8083/ws/documents?documentId=1&userId=1";
const gateway = argUrl
  ? null
  : "ws://localhost:8081/ws/documents?documentId=1&userId=1";
// If you pass an explicit arg, test only that URL; otherwise try direct then gateway
const tryUrls = gateway ? [direct, gateway] : [direct];

(async function () {
  for (const url of tryUrls) {
    console.log("Trying", url);
    try {
      await new Promise((resolve, reject) => {
        const w = new WebSocket(url);
        const t = setTimeout(() => {
          try {
            w.close();
          } catch (e) {}
          reject(new Error("timeout"));
        }, 2000);
        w.onopen = () => {
          clearTimeout(t);
          console.log("Connected to", url);
          w.send(
            JSON.stringify({
              documentId: 1,
              userId: 1,
              content: "Hello from ws-test",
              operationType: "UPDATE",
            })
          );
          w.onmessage = (data) => {
            console.log("Received:", data);
            w.close();
            resolve();
          };
        };
        w.onerror = (err) => {
          clearTimeout(t);
          reject(err);
        };
        w.onclose = () => {
          /* nothing */
        };
      });
      return;
    } catch (err) {
      console.warn(
        "Connection to",
        url,
        "failed:",
        err && (err.message || err)
      );
    }
  }
  console.error("All connection attempts failed");
})();
