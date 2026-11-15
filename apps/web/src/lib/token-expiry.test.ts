import { describe, expect, it } from "vitest";
import { expiresWithin, tokenExpiry } from "./token-expiry";

function jwt(claims: object) {
  const part = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${part({ alg: "HS256" })}.${part(claims)}.signature`;
}

describe("tokenExpiry", () => {
  it("reads exp from the token and converts it to milliseconds", () => {
    expect(tokenExpiry(jwt({ exp: 1000 }))).toBe(1_000_000);
  });

  it("reads a payload with characters that only base64url has", () => {
    const payloads = ["Vlad", "Zoë", "José", "Søren"].map((name) => {
      const bytes = String.fromCharCode(...new TextEncoder().encode(JSON.stringify({ name, exp: 5 })));
      return btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    });
    // "Zoë" encodes to a payload with "_", which plain base64 would not accept.
    expect(payloads.some((payload) => /[-_]/.test(payload))).toBe(true);
    for (const payload of payloads) expect(tokenExpiry(`a.${payload}.c`)).toBe(5000);
  });

  it("gives null for anything that is not a token", () => {
    expect(tokenExpiry("")).toBeNull();
    expect(tokenExpiry("not-a-token")).toBeNull();
    expect(tokenExpiry("a.%%%.c")).toBeNull();
    expect(tokenExpiry(jwt({ sub: "user" }))).toBeNull();
  });
});

describe("expiresWithin", () => {
  it("says whether the token runs out inside the margin", () => {
    const token = jwt({ exp: 100 });
    expect(expiresWithin(token, 30_000, 50_000)).toBe(false);
    expect(expiresWithin(token, 30_000, 70_000)).toBe(true);
    expect(expiresWithin(token, 30_000, 200_000)).toBe(true);
  });

  it("treats an unreadable token as expiring", () => {
    expect(expiresWithin("garbage", 0)).toBe(true);
  });
});
