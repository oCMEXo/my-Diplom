import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { errorResponseSchema, runAcceptedSchema, runRequestSchema } from "@collab/shared";
import { requireRunCode } from "../../lib/run-access.js";
import { requestRun, requestStop } from "./runs.service.js";

const params = z.object({ projectId: z.string().uuid(), fileId: z.string().uuid() });

export const runsRoutes: FastifyPluginAsyncZod<{ accessCode?: string }> = async (app, options) => {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", requireRunCode(options.accessCode));

  app.post(
    "/:projectId/files/:fileId/run",
    {
      schema: {
        tags: ["runs"],
        params,
        body: runRequestSchema,
        response: {
          202: runAcceptedSchema,
          400: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await requestRun(
        request.userId,
        request.params.projectId,
        request.params.fileId,
        request.body.code,
      );
      return reply.code(202).send(result);
    },
  );

  app.post(
    "/:projectId/runs/:runId/stop",
    {
      schema: {
        tags: ["runs"],
        params: z.object({ projectId: z.string().uuid(), runId: z.string().uuid() }),
        response: { 202: z.object({}), 403: errorResponseSchema, 404: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      await requestStop(request.userId, request.params.projectId, request.params.runId);
      return reply.code(202).send({});
    },
  );
};
