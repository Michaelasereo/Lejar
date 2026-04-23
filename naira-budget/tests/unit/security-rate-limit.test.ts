import { describe, expect, it } from "vitest";
import { getClientIp, limitByKey } from "../../lib/security/rate-limit";

describe("security rate limiting", () => {
  it("extracts first forwarded ip", () => {
    expect(getClientIp("10.0.0.1, 192.168.0.1")).toBe("10.0.0.1");
    expect(getClientIp(null)).toBe("unknown");
  });

  it("blocks requests after threshold in active window", () => {
    const namespace = `test-${Date.now()}`;
    const first = limitByKey({
      namespace,
      keyParts: ["ip", "127.0.0.1"],
      max: 2,
      windowMs: 60_000,
    });
    const second = limitByKey({
      namespace,
      keyParts: ["ip", "127.0.0.1"],
      max: 2,
      windowMs: 60_000,
    });
    const third = limitByKey({
      namespace,
      keyParts: ["ip", "127.0.0.1"],
      max: 2,
      windowMs: 60_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });
});

