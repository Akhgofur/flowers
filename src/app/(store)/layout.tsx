import type { ReactNode } from "react";

export default function StoreLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
