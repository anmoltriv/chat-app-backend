import WebSocket from "ws";

const BASE = "http://localhost:4000";
const WS_BASE = "ws://localhost:4000";
const USERS = [
  { user_name: "testuser1", name: "Test User 1", email: "testuser1@test.com" },
  { user_name: "testuser2", name: "Test User 2", email: "testuser2@test.com" },
  { user_name: "testuser3", name: "Test User 3", email: "testuser3@test.com" },
  { user_name: "testuser4", name: "Test User 4", email: "testuser4@test.com" },
  { user_name: "testuser5", name: "Test User 5", email: "testuser5@test.com" },
];
const PASSWORD = "Test1pass";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (n) => Math.floor(Math.random() * n);

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function signupOrLogin(user) {
  let res = await api("/api/auth/signup", {
    method: "POST",
    body: { ...user, password: PASSWORD },
  });
  if (res.status === 201) return res.json.token;

  res = await api("/api/auth/login", {
    method: "POST",
    body: { user_name: user.user_name, password: PASSWORD },
  });
  if (res.status !== 200) {
    throw new Error(`Auth failed for ${user.user_name}: ${JSON.stringify(res.json)}`);
  }
  return res.json.token;
}

function connectWs(token, userName) {
  return new Promise((resolve, reject) => {
    const received = {
      SEND_MESSAGE: [],
      EDIT_MESSAGE: [],
      DELETE_MESSAGE: [],
    };

    const ws = new WebSocket(`${WS_BASE}?token=${token}`);

    ws.on("open", () => {
      // Server runs addConnection async after upgrade; wait for READY signal
    });
    ws.on("error", reject);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "READY") {
          resolve({ ws, received, userName });
          return;
        }
        if (received[msg.type]) received[msg.type].push(msg);
      } catch {
        /* ignore */
      }
    });
  });
}

function sendWs(ws, payload) {
  ws.send(JSON.stringify(payload));
}

async function main() {
  console.log("=== Multi-user RTC + persistence test ===\n");

  // 1. Authenticate 5 users
  console.log("1) Authenticating 5 users...");
  const tokens = [];
  for (const user of USERS) {
    const token = await signupOrLogin(user);
    tokens.push({ token, userName: user.user_name });
    console.log(`   ✓ ${user.user_name}`);
  }

  // 2. User 1 creates room
  console.log("\n2) User 1 creates a room...");
  const createRes = await api("/api/room", {
    method: "POST",
    token: tokens[0].token,
    body: { name: `LoadTest-${Date.now()}` },
  });
  if (createRes.status !== 201) {
    throw new Error(`Create room failed: ${JSON.stringify(createRes.json)}`);
  }
  const roomId = createRes.json.room.id;
  console.log(`   ✓ Room created: id=${roomId}, name=${createRes.json.room.name}`);

  // 3. Users 2-5 join room (HTTP)
  console.log("\n3) Users 2-5 join room via HTTP...");
  for (let i = 1; i < 5; i++) {
    const joinRes = await api(`/api/room/${roomId}/join`, {
      method: "POST",
      token: tokens[i].token,
    });
    if (joinRes.status !== 200) {
      throw new Error(`Join failed for ${tokens[i].userName}: ${JSON.stringify(joinRes.json)}`);
    }
    console.log(`   ✓ ${tokens[i].userName} joined`);
  }

  // 4. Connect all WebSockets
  console.log("\n4) Connecting 5 WebSocket clients...");
  const clients = await Promise.all(
    tokens.map(({ token, userName }) => connectWs(token, userName)),
  );
  console.log("   ✓ All 5 connected");
  await sleep(500);

  // 5. Random send / edit / delete
  console.log("\n5) Sending random messages (send/edit/delete)...");
  const sentMessages = [];
  const deletedIds = new Set();
  const contentToId = new Map();

  for (const client of clients) {
    const origHandler = client.ws.listeners("message");
    client.ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "SEND_MESSAGE" && msg.data?.content && msg.data?.id) {
          contentToId.set(msg.data.content, msg.data.id);
          const sent = sentMessages.find((m) => m.content === msg.data.content);
          if (sent) sent.id = msg.data.id;
        }
      } catch {
        /* ignore */
      }
    });
  }

  const actions = ["SEND", "EDIT", "DELETE"];
  const NUM_ACTIONS = 30;

  const ownMessages = (userName) =>
    sentMessages.filter((m) => m.action !== "DELETE" && m.sender === userName && m.id);

  for (let i = 0; i < NUM_ACTIONS; i++) {
    const clientIdx = rand(5);
    const { ws, userName } = clients[clientIdx];
    const action = actions[rand(actions.length)];

    if (action === "SEND" || sentMessages.length === 0) {
      const content = `msg-${i}-from-${userName}-${Date.now()}`;
      sendWs(ws, {
        type: "SEND_MESSAGE",
        data: { roomId, content },
      });
      sentMessages.push({ content, sender: userName, action: "SEND" });
      console.log(`   [${i + 1}] SEND by ${userName}: "${content}"`);
      await sleep(200);
    } else if (action === "EDIT") {
      const owned = ownMessages(userName);
      if (owned.length === 0) {
        const content = `msg-${i}-from-${userName}-${Date.now()}`;
        sendWs(ws, { type: "SEND_MESSAGE", data: { roomId, content } });
        sentMessages.push({ content, sender: userName, action: "SEND" });
        console.log(`   [${i + 1}] SEND (fallback) by ${userName}: "${content}"`);
        await sleep(200);
      } else {
        const target = owned[rand(owned.length)];
        const newContent = `edited-${Date.now()}`;
        sendWs(ws, {
          type: "EDIT_MESSAGE",
          data: { messageId: target.id, content: newContent },
        });
        target.content = newContent;
        target.action = "EDIT";
        console.log(`   [${i + 1}] EDIT by ${userName} on msg id=${target.id}`);
      }
    } else {
      const owned = ownMessages(userName);
      if (owned.length === 0) {
        const content = `msg-${i}-from-${userName}-${Date.now()}`;
        sendWs(ws, { type: "SEND_MESSAGE", data: { roomId, content } });
        sentMessages.push({ content, sender: userName, action: "SEND" });
        console.log(`   [${i + 1}] SEND (fallback) by ${userName}: "${content}"`);
        await sleep(200);
      } else {
        const target = owned[rand(owned.length)];
        sendWs(ws, {
          type: "DELETE_MESSAGE",
          data: { messageId: target.id },
        });
        target.action = "DELETE";
        deletedIds.add(target.id);
        console.log(`   [${i + 1}] DELETE by ${userName} on msg id=${target.id}`);
      }
    }
    await sleep(150);
  }

  // Wait for broadcasts to settle
  await sleep(2000);

  // Collect message IDs from broadcasts
  const broadcastIds = new Set();
  const editBroadcastIds = new Set();
  const deleteBroadcastIds = new Set();
  for (const client of clients) {
    for (const msg of client.received.SEND_MESSAGE) {
      if (msg.data?.id) broadcastIds.add(msg.data.id);
      const sent = sentMessages.find((m) => m.content === msg.data?.content);
      if (sent) sent.id = msg.data.id;
    }
    for (const msg of client.received.EDIT_MESSAGE) {
      if (msg.data?.id) editBroadcastIds.add(msg.data.id);
      const sent = sentMessages.find((m) => m.id === msg.data?.id);
      if (sent) {
        sent.content = msg.data.content;
        sent.id = msg.data.id;
      }
    }
    for (const msg of client.received.DELETE_MESSAGE) {
      if (msg.data?.id) deleteBroadcastIds.add(msg.data.id);
    }
  }

  // 6. RTC verification
  console.log("\n6) RTC (real-time broadcast) verification:");
  let rtcPass = true;
  for (const client of clients) {
    const count = client.received.SEND_MESSAGE.length;
    const editCount = client.received.EDIT_MESSAGE.length;
    const deleteCount = client.received.DELETE_MESSAGE.length;
    console.log(
      `   ${client.userName}: received ${count} SEND, ${editCount} EDIT, ${deleteCount} DELETE broadcasts`,
    );
    if (count === 0) rtcPass = false;
  }

  const uniqueBroadcasts = clients[0].received.SEND_MESSAGE.length;
  const allSameCount = clients.every(
    (c) => c.received.SEND_MESSAGE.length === uniqueBroadcasts,
  );
  console.log(`   All clients got same SEND count: ${allSameCount ? "YES" : "NO"}`);
  console.log(`   Total unique message IDs from broadcasts: ${broadcastIds.size}`);

  // 7. Persistence verification
  console.log("\n7) Message persistence verification (GET /api/room/:id/messages):");
  const persistRes = await api(`/api/room/${roomId}/messages`, {
    token: tokens[0].token,
  });
  if (persistRes.status !== 200) {
    throw new Error(`Fetch messages failed: ${JSON.stringify(persistRes.json)}`);
  }
  const persisted = persistRes.json.messages ?? [];
  console.log(`   Persisted message count: ${persisted.length}`);
  console.log(`   Expected ~${sentMessages.filter((m) => m.action === "SEND").length} sent messages`);

  const persistedIds = new Set(persisted.map((m) => m.id));
  const broadcastInDb = [...broadcastIds]
    .filter((id) => !deletedIds.has(id))
    .every((id) => persistedIds.has(id));
  const deletedNotInDb = [...deletedIds].every((id) => !persistedIds.has(id));
  console.log(`   All non-deleted broadcast IDs found in DB: ${broadcastInDb ? "YES" : "NO"}`);
  console.log(`   Deleted messages absent from DB: ${deletedNotInDb ? "YES" : "NO"}`);

  if (persisted.length > 0) {
    console.log("   Sample persisted messages:");
    for (const m of persisted.slice(-3)) {
      console.log(`     id=${m.id} sender=${m.sender?.username}: "${m.content}"`);
    }
  }

  // 8. Summary
  console.log("\n=== SUMMARY ===");
  const sendWorks = broadcastIds.size > 0 && allSameCount;
  const editCount = clients[0].received.EDIT_MESSAGE.length;
  const deleteCount = clients[0].received.DELETE_MESSAGE.length;
  const editWorks =
    editCount > 0 && clients.every((c) => c.received.EDIT_MESSAGE.length === editCount);
  const deleteWorks =
    deleteCount > 0 &&
    clients.every((c) => c.received.DELETE_MESSAGE.length === deleteCount);
  const persistenceWorks = persisted.length > 0 && broadcastInDb && deletedNotInDb;

  console.log(`SEND (RTC):         ${sendWorks ? "PASS" : "FAIL"}`);
  console.log(`SEND (persistence): ${persistenceWorks ? "PASS" : "FAIL"}`);
  console.log(`EDIT (RTC):         ${editWorks ? "PASS" : "FAIL"}`);
  console.log(`DELETE (RTC):       ${deleteWorks ? "PASS" : "FAIL"}`);

  // Cleanup
  for (const { ws } of clients) ws.close();

  const allPass = sendWorks && persistenceWorks && editWorks && deleteWorks;
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("\nTest failed:", err);
  process.exit(1);
});
