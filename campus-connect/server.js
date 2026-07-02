const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const dataPath = path.join(rootDir, "data", "db.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function readDb() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(dataPath, JSON.stringify(db, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1000000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function required(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function createItem(input, type) {
  return {
    id: crypto.randomUUID(),
    type,
    createdAt: new Date().toISOString(),
    ...input
  };
}

async function handleApi(req, res, url) {
  const db = readDb();

  if (req.method === "GET" && url.pathname === "/api/overview") {
    sendJson(res, 200, {
      profile: db.profile,
      stats: {
        notices: db.notices.length,
        events: db.events.length,
        clubs: db.clubs.length,
        lostFound: db.lostFound.length
      },
      notices: db.notices,
      events: db.events,
      clubs: db.clubs,
      lostFound: db.lostFound
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await parseBody(req);
    if (!required(body.email) || !required(body.role)) {
      sendJson(res, 400, { message: "Email and role are required." });
      return;
    }
    db.profile = {
      name: body.name?.trim() || "Campus Member",
      email: body.email.trim(),
      role: body.role.trim(),
      department: body.department?.trim() || "Computer Science"
    };
    writeDb(db);
    sendJson(res, 200, { profile: db.profile });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/notices") {
    const body = await parseBody(req);
    if (!required(body.title) || !required(body.message)) {
      sendJson(res, 400, { message: "Notice title and message are required." });
      return;
    }
    const notice = createItem({
      title: body.title.trim(),
      message: body.message.trim(),
      audience: body.audience?.trim() || "All Students",
      priority: body.priority?.trim() || "Normal"
    }, "notice");
    db.notices.unshift(notice);
    writeDb(db);
    sendJson(res, 201, notice);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/events") {
    const body = await parseBody(req);
    if (!required(body.title) || !required(body.date) || !required(body.venue)) {
      sendJson(res, 400, { message: "Event title, date, and venue are required." });
      return;
    }
    const event = createItem({
      title: body.title.trim(),
      date: body.date.trim(),
      venue: body.venue.trim(),
      host: body.host?.trim() || "Student Council",
      seats: Number(body.seats) || 100
    }, "event");
    db.events.unshift(event);
    writeDb(db);
    sendJson(res, 201, event);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/lost-found") {
    const body = await parseBody(req);
    if (!required(body.item) || !required(body.place)) {
      sendJson(res, 400, { message: "Item name and place are required." });
      return;
    }
    const entry = createItem({
      item: body.item.trim(),
      place: body.place.trim(),
      status: body.status?.trim() || "Found",
      contact: body.contact?.trim() || db.profile.email
    }, "lost-found");
    db.lostFound.unshift(entry);
    writeDb(db);
    sendJson(res, 201, entry);
    return;
  }

  sendJson(res, 404, { message: "API route not found." });
}

function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const filePath = path.join(publicDir, requested);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(publicDir, "index.html"), (fallbackError, fallbackData) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fallbackData);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { message: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Campus Connect is running at http://localhost:${PORT}`);
});
