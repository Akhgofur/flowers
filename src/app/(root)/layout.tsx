import type { ReactNode } from "react";
import "@/app/globals.css";

export default function RootRedirectLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
