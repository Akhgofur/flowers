import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const signIn = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import { AdminLoginForm } from "./AdminLoginForm";

describe("AdminLoginForm", () => {
  it("explains missing server setup and never calls NextAuth in that state", async () => {
    const user = userEvent.setup();
    render(<AdminLoginForm authConfigured={false} />);

    expect(
      screen.getByText(/administrator kirishi hali serverda sozlanmagan/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirish" })).toBeDisabled();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Parol"), "secret");
    expect(signIn).not.toHaveBeenCalled();
  });
});
