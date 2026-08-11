import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { getAuthOptions, isAdminAuthConfigured } from "@/lib/auth";

const handler = (...arguments_: Parameters<ReturnType<typeof NextAuth>>) => {
  const request = arguments_[0] as Request;
  if (!isAdminAuthConfigured()) {
    return NextResponse.redirect(new URL("/admin/login?setup=required", request.url));
  }

  return NextAuth(getAuthOptions())(...arguments_);
};

export { handler as GET, handler as POST };
