import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  classDetailSchema,
  classPreviewSchema,
  classSchema,
  createClassSchema,
  errorResponseSchema,
  joinClassResultSchema,
} from "@collab/shared";
import {
  createClass,
  deleteClass,
  getClass,
  joinClass,
  listClasses,
  previewClass,
  regenerateClassLink,
} from "./classes.service.js";

const classParams = z.object({ classId: z.string().uuid() });
const codeParams = z.object({ code: z.string().min(1).max(100) });
const auth = { tags: ["classes"], security: [{ bearerAuth: [] }] };

export const classesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/projects/:projectId/class",
    {
      preHandler: [app.authenticate],
      schema: {
        ...auth,
        params: z.object({ projectId: z.string().uuid() }),
        body: createClassSchema,
        response: { 200: classSchema, 400: errorResponseSchema, 403: errorResponseSchema },
      },
    },
    async (request) => createClass(request.userId, request.params.projectId, request.body),
  );

  app.get(
    "/classes",
    { preHandler: [app.authenticate], schema: { ...auth, response: { 200: z.array(classSchema) } } },
    async (request) => listClasses(request.userId),
  );

  app.get(
    "/classes/:classId",
    {
      preHandler: [app.authenticate],
      schema: { ...auth, params: classParams, response: { 200: classDetailSchema, 404: errorResponseSchema } },
    },
    async (request) => getClass(request.userId, request.params.classId),
  );

  app.post(
    "/classes/:classId/regenerate-link",
    {
      preHandler: [app.authenticate],
      schema: { ...auth, params: classParams, response: { 200: classSchema, 404: errorResponseSchema } },
    },
    async (request) => regenerateClassLink(request.userId, request.params.classId),
  );

  app.delete(
    "/classes/:classId",
    {
      preHandler: [app.authenticate],
      schema: { ...auth, params: classParams, response: { 204: z.null(), 404: errorResponseSchema } },
    },
    async (request, reply) => {
      await deleteClass(request.userId, request.params.classId);
      return reply.code(204).send(null);
    },
  );

  app.get(
    "/class-links/:code",
    { schema: { tags: ["classes"], params: codeParams, response: { 200: classPreviewSchema, 404: errorResponseSchema } } },
    async (request) => previewClass(request.params.code),
  );

  app.post(
    "/class-links/:code/join",
    {
      preHandler: [app.authenticate],
      schema: { ...auth, params: codeParams, response: { 200: joinClassResultSchema, 403: errorResponseSchema, 404: errorResponseSchema } },
    },
    async (request) => joinClass(request.userId, request.params.code),
  );
};
