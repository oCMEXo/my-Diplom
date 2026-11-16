import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { clientErrorSchema } from "@collab/shared";

function pathOnly(url: string | undefined) {
  if (!url) return undefined;
  try {
    return new URL(url).pathname;
  } catch {
    return url.split(/[?#]/)[0];
  }
}

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
