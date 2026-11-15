import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { RUN_CODE_HEADER, type RunMode } from "@collab/shared";
import { AppError } from "./errors.js";

export function runMode(enabled: boolean, accessCode: string | undefined): RunMode {
  if (!enabled) return "off";
  return accessCode ? "code" : "open";
}

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time compare. */
export function codeMatches(expected: string, given: unknown): boolean {
  return typeof given === "string" && timingSafeEqual(digest(expected), digest(given.trim()));
}

export const WRONG_CODE_MESSAGE = "Running code on this site needs an access code. Enter the right code.";

/** A preHandler for routes that run code: with an access code set, the request must carry it. */
export function requireRunCode(accessCode: string | undefined) {
  return async (request: FastifyRequest) => {
    if (accessCode && !codeMatches(accessCode, request.headers[RUN_CODE_HEADER])) {
      throw new AppError(WRONG_CODE_MESSAGE, 403);
    }
  };
}
