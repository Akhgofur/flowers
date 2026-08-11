import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getAuthOptions: vi.fn(),
  isAdminAuthConfigured: vi.fn(),
}));
const nextAuth = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({ default: nextAuth }));
vi.mock("@/lib/auth", () => auth);

import { GET } from "./route";

describe("NextAuth route configuration guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a missing-config auth request to the human-readable login setup screen", async () => {
    auth.isAdminAuthConfigured.mockReturnValue(false);

    const response = await GET(new Request("http://localhost/api/auth/error"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login?setup=required"
    );
    expect(nextAuth).not.toHaveBeenCalled();
  });

  it("delegates to NextAuth only after the server credentials are configured", async () => {
    auth.isAdminAuthConfigured.mockReturnValue(true);
    const nextHandler = vi.fn().mockResolvedValue(new Response("ok"));
    nextAuth.mockReturnValue(nextHandler);
    auth.getAuthOptions.mockReturnValue({});

    const request = new Request("http://localhost/api/auth/session");
    const response = await GET(request);

    expect(await response.text()).toBe("ok");
    expect(auth.getAuthOptions).toHaveBeenCalledTimes(1);
    expect(nextHandler).toHaveBeenCalledWith(request);
  });
});
