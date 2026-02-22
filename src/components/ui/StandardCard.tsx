// src/components/ui/StandardCard.tsx

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./Card";

export function StandardCard({
  title,
  description,
  headerRight,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={["overflow-visible", className].filter(Boolean).join(" ")}>
      {(title || description || headerRight) && (
        <CardHeader className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {headerRight && <div className="shrink-0">{headerRight}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className="px-6 pt-4 pb-6">{children}</CardContent>
    </Card>
  );
}