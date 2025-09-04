// src/components/ui/Input.tsx

import * as React from "react"
import { cn } from "../../lib/utils" // Usamos a nossa função 'cn' novamente

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        // A nossa função 'cn' junta as classes padrão com quaisquer classes extras que passemos
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
          "read-only:bg-gray-100 read-only:cursor-not-allowed",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }