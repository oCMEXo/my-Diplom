import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  authResponseSchema,
  authUserSchema,
  deleteAccountSchema,
  errorResponseSchema,
  guestLoginSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
  upgradeGuestSchema,
} from "@collab/shared";
import {
  deleteAccount,
  loginAsGuest,
  loginUser,
  refreshSession,
  registerUser,
  revokeRefreshToken,
  updateProfile,
  upgradeGuest,
} from "./auth.service.js";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/register",
    {
      schema: {
        tags: ["auth"],
        body: registerSchema,
        response: { 201: authResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await registerUser(request.body);
      return reply.code(201).send(result);
    },
  );

  app.post(
    "/login",
    {
      schema: {
        tags: ["auth"],
        body: loginSchema,
        response: { 200: authResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request) => loginUser(request.body),
  );

  app.post(
    "/guest",
    {
      schema: {
        tags: ["auth"],
        body: guestLoginSchema,
        response: { 201: authResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await loginAsGuest(request.body);
      return reply.code(201).send(result);
    },
  );

  app.post(
    "/refresh",
    {
      schema: {
        tags: ["auth"],
        body: refreshSchema,
        response: { 200: authResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request) => refreshSession(request.body.refreshToken),
  );

  app.post(
    "/logout",
    {
      schema: {
        tags: ["auth"],
        body: refreshSchema,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await revokeRefreshToken(request.body.refreshToken);
      return reply.code(204).send(null);
    },
  );

  app.get(
    "/me",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({ userId: z.string().uuid() }),
        },
      },
    },
    async (request, reply) => {
      return reply.send({ userId: request.userId });
    },
  );

  app.patch(
    "/me",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        body: updateProfileSchema,
        response: { 200: authUserSchema },
      },
    },
    async (request) => updateProfile(request.userId, request.body),
  );

  app.post(
    "/upgrade",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        body: upgradeGuestSchema,
        response: { 200: authUserSchema, 400: errorResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request) => upgradeGuest(request.userId, request.body),
  );

  app.post(
    "/delete-account",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        body: deleteAccountSchema,
        response: { 204: z.null(), 403: errorResponseSchema },
      },
    },
    async (request, reply) => {
      await deleteAccount(request.userId, request.body);
      return reply.code(204).send(null);
    },
  );
};
