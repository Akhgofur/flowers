import type { ReactNode } from "react";
import { fontVariables } from "@/app/fonts";
import "@/app/globals.css";

export default function RootRedirectLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
