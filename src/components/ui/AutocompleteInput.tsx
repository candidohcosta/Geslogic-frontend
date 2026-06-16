import React, { useEffect, useMemo, useRef, useState } from 'react';

type AutocompleteInputProps = {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  maxVisible?: number;
};

export default function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  className,
  maxVisible = 8,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Mantém o control externo como fonte de verdade
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? options.filter((opt) => opt.toLowerCase().includes(q))
      : options.slice();
    return base.slice(0, maxVisible);
  }, [options, query, maxVisible]);

  useEffect(() => {
    if (!open) setHighlight(0);
    else setHighlight((h) => Math.min(h, Math.max(filtered.length - 1, 0)));
  }, [open, filtered.length]);

  // Fechar ao clicar fora
  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function commitSelection(next: string) {
    onChange(next);
    setQuery(next);
    setOpen(false);
    // manter foco no input
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = filtered[highlight];
      if (sel) commitSelection(sel);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        className={className}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value); // mantém controlado
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow"
          role="listbox"
          aria-label="Sugestões"
        >
          {filtered.map((opt, i) => {
            const active = i === highlight;
            return (
              <div
                key={`${opt}-${i}`}
                role="option"
                aria-selected={active}
                className={`px-2 py-1 cursor-pointer text-sm ${
                  active ? 'bg-gray-100' : ''
                }`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  // evitar blur do input antes do click
                  e.preventDefault();
                  commitSelection(opt);
                }}
              >
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}