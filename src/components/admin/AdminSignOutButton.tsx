"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function AdminSignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <button
      className="admin-signout"
      type="button"
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        await signOut({ callbackUrl: "/admin/login" });
      }}
    >
      {isSigningOut ? "Chiqilmoqda…" : "Chiqish"}
    </button>
  );
}
