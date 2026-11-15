import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  authResponseSchema,
  authUserSchema,
  deleteAccountSchema,
  errorResponseSchema,
  forgotPasswordSchema,
  githubExchangeSchema,
  guestLoginSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  upgradeGuestSchema,
  verifyEmailSchema,
} from "@collab/shared";
import {
  deleteAccount,
  loginAsGuest,
  loginUser,
  refreshSession,
  registerUser,
  revokeRefreshToken,
  toAuthUser,
  updateProfile,
  upgradeGuest,
} from "./auth.service.js";
import { requestPasswordReset, resendVerification, resetPassword, verifyEmail } from "./email.service.js";
import { completeGithubSignIn, exchangeGithubCode, githubAuthorizeUrl } from "./github-signin.service.js";
import { env } from "../../env.js";

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

  app.post(
    "/forgot-password",
    { schema: { tags: ["auth"], body: forgotPasswordSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await requestPasswordReset(request.body.email);
      return reply.code(204).send(null);
    },
  );

  app.post(
    "/reset-password",
    { schema: { tags: ["auth"], body: resetPasswordSchema, response: { 204: z.null(), 400: errorResponseSchema } } },
    async (request, reply) => {
      await resetPassword(request.body);
      return reply.code(204).send(null);
    },
  );

  app.post(
    "/verify-email",
    { schema: { tags: ["auth"], body: verifyEmailSchema, response: { 200: authUserSchema, 400: errorResponseSchema } } },
    async (request) => toAuthUser(await verifyEmail(request.body.token)),
  );

  app.post(
    "/resend-verification",
    {
      preHandler: [app.authenticate],
      schema: { tags: ["auth"], security: [{ bearerAuth: [] }], response: { 204: z.null(), 400: errorResponseSchema } },
    },
    async (request, reply) => {
      await resendVerification(request.userId);
      return reply.code(204).send(null);
    },
  );

  app.get(
    "/github/start",
    { schema: { tags: ["auth"], querystring: z.object({ redirect: z.string().max(500).optional() }) } },
    async (request, reply) => reply.redirect(githubAuthorizeUrl(request.query.redirect)),
  );

  // GitHub sends the person back here; the browser then goes on to the web app with a one-time code.
  app.get(
    "/github/callback",
    {
      schema: {
        tags: ["auth"],
        querystring: z.object({ code: z.string().max(200).optional(), state: z.string().max(200).optional(), error: z.string().optional() }),
      },
    },
    async (request, reply) => {
      const back = new URL(`${env.APP_URL}/auth/github`);
      if (!request.query.code || !request.query.state) {
        back.hash = new URLSearchParams({ error: "GitHub sign-in was cancelled." }).toString();
        return reply.redirect(back.toString());
      }
      try {
        const { exchange, redirect } = await completeGithubSignIn(request.query.code, request.query.state);
        back.hash = new URLSearchParams({ code: exchange, redirect }).toString();
      } catch (error) {
        back.hash = new URLSearchParams({ error: (error as Error).message }).toString();
      }
      return reply.redirect(back.toString());
    },
  );

  app.post(
    "/github/exchange",
    { schema: { tags: ["auth"], body: githubExchangeSchema, response: { 200: authResponseSchema, 400: errorResponseSchema } } },
    async (request) => exchangeGithubCode(request.body.code),
  );
};
