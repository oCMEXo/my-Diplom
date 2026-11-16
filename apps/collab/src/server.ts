import { env } from "./env.js";
import { WEBSOCKET_OPTIONS, createHocuspocus } from "./hocuspocus.js";
import { startAccessChangeListener } from "./lib/access-changes.js";

const server = createHocuspocus({ port: env.PORT, address: env.HOST });

startAccessChangeListener(env.REDIS_URL, server, (error) => console.error(error));

server.listen(null, null, WEBSOCKET_OPTIONS);
