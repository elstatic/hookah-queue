import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./src/lib/socket-handlers";
import { cleanupExpiredRooms } from "./src/lib/db";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  setupSocketHandlers(io);

  // Cleanup expired rooms on start and every hour
  cleanupExpiredRooms();
  setInterval(cleanupExpiredRooms, 60 * 60 * 1000);

  httpServer.listen(port, () => {
    console.log(`> Hookah Queue running at http://localhost:${port}`);
  });
});
