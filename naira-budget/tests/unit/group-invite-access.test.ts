import { describe, expect, it } from "vitest";
import { canAccessInviteByEmail } from "../../lib/security/group-invite";

describe("group invite access", () => {
  it("allows only matching normalized invite email", () => {
    expect(canAccessInviteByEmail("Test@Example.com", "test@example.com")).toBe(true);
    expect(canAccessInviteByEmail("other@example.com", "test@example.com")).toBe(false);
    expect(canAccessInviteByEmail(null, "test@example.com")).toBe(false);
  });
});

