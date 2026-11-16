import { buildApp } from "./app.js";
import { env } from "./env.js";
import { startRunEventRelay } from "./lib/run-events-relay.js";
import { startCleanup } from "./lib/cleanup.js";

const app = await buildApp();

if (env.RUN_ENABLED) {
  const stopRelay = await startRunEventRelay(env.REDIS_URL, (error) => app.log.error(error));
  app.addHook("onClose", stopRelay);
}

app.addHook("onClose", startCleanup(app.log));

app
  .listen({ port: env.PORT, host: env.HOST })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
