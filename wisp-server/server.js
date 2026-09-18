// Deploy this folder on any host that supports WebSockets (Render, Fly.io,
// Railway, Koyeb, a VPS). Not Vercel — serverless functions can't hold a socket.
import { createServer } from "node:http";
import wisp from "wisp-server-node";

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("wisp ok");
});

server.on("upgrade", (req, socket, head) => {
  wisp.routeRequest(req, socket, head);
});

server.listen(process.env.PORT || 3000, () => {
  console.log("wisp listening on " + (process.env.PORT || 3000));
});
