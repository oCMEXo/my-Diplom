import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { clientErrorSchema } from "@collab/shared";

/** Links can carry one-time tokens (reset, verification); only the path is kept. */
function pathOnly(url: string | undefined) {
  if (!url) return undefined;
  try {
    return new URL(url).pathname;
  } catch {
    return url.split(/[?#]/)[0];
  }
}

/**
 * Errors from the browser, written to the server log so the site owner sees them. No third-party
 * service: nothing leaves the server, and no user id is stored with the error.
 */
export const clientErrorsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/client-errors",
    { schema: { tags: ["health"], body: clientErrorSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      const { message, stack, url, release } = request.body;
      request.log.warn({ clientError: { message, stack, path: pathOnly(url), release } }, "client error");
      return reply.code(204).send(null);
    },
  );
};
