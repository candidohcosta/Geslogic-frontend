// src/components/layout/Page.tsx

import * as React from "react";

/** Wrapper base para páginas com o novo padrão */
export const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-0 flex flex-col gap-6">{children}</div>
);

/** Header sticky padrão da página (topo) */
Page.Header = ({ children }: { children: React.ReactNode }) => (
  <div className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
    <div className="px-4 py-4">{children}</div>
  </div>
);

/** Corpo padrão da página */
Page.Body = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 pb-6">{children}</div>
);

/** Barra sticky de ações (para usar dentro de Cards): top ou bottom */
export function PageToolbar({
  children,
  position = "bottom", // "top" | "bottom"
}: {
  children: React.ReactNode;
  position?: "top" | "bottom";
}) {
  const posClass =
    position === "bottom" ? "bottom-0 -mb-6 pb-4 border-t" : "top-0 -mt-6 pt-2 border-b";
  return (
    <div
      className={[
        "sticky left-0 -mx-6 px-6 z-20",
        posClass,
        "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
      ].join(" ")}
    >
      {children}
    </div>
  );
}