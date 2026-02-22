// src/components/ui/Textarea.tsx
import * as React from "react";
import { cn } from "../../lib/utils"; // <-- corrigi o caminho com duas barras

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Linhas mínimas (altura inicial). Default: 3 */
  minRows?: number;
  /** Linhas máximas antes de começar a ter scroll interno. Default: 12 */
  maxRows?: number;
  /** Ativa/desativa auto-resize. Default: true */
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      minRows = 3,
      maxRows = 12,
      autoResize = true,
      style,
      onInput,
      ...props
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Combina o ref externo com o interno
    const setRef = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref && "current" in ref) (ref as any).current = el;
    };

    const doAutoResize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoResize) return;

      // Reset para calcular scrollHeight
      el.style.height = "auto";

      // Cálculo do maxHeight com base no line-height atual
      const computed = window.getComputedStyle(el);
      const lineHeight = parseFloat(computed.lineHeight || "20");
      const paddingY =
        parseFloat(computed.paddingTop || "0") +
        parseFloat(computed.paddingBottom || "0");
      const borderY =
        parseFloat(computed.borderTopWidth || "0") +
        parseFloat(computed.borderBottomWidth || "0");

      const maxHeight = maxRows * lineHeight + paddingY + borderY;

      const newHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${newHeight}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [autoResize, maxRows]);

    // Redimensiona quando o value muda (controlado)
    React.useEffect(() => {
      if (!autoResize) return;
      // Em ambientes SSR/sem layout, ignora
      if (typeof window === "undefined") return;
      doAutoResize();
    }, [props.value, doAutoResize, autoResize]);

    const mergedStyle: React.CSSProperties = {
      ...style,
      // não definimos height aqui — o autoresize trata disso
    };

    return (
      <textarea
        {...props}
        ref={setRef}
        rows={minRows}
        style={mergedStyle}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none", // evita o handle de redimensionamento manual; remova se quiseres permitir
          className
        )}
        onInput={(e) => {
          onInput?.(e);
          doAutoResize();
        }}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };