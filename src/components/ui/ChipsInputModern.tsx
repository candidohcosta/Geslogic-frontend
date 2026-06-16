// frontend/src/features/settings/security/pages/ChipsInputModern.tsx

import React, { useState, useMemo } from 'react';
import { Label } from './Label';

type Props = {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
};

export default function ChipsInputModern({
  label,
  values,
  onChange,
  suggestions = [],
  placeholder,
}: Props) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = draft.trim().toLowerCase();
    if (!t) return suggestions.slice(0, 10);
    return suggestions.filter((s) => s.toLowerCase().includes(t)).slice(0, 10);
  }, [draft, suggestions]);

  const add = (v: string) => {
    const val = v.trim();
    if (!val) return;
    if (!values.includes(val)) onChange([...values, val]);
    setDraft('');
    setOpen(false);
  };

  const remove = (v: string) => {
    onChange(values.filter((x) => x !== v));
  };

  return (
    <div className="w-full">
      {label && <Label className="font-medium text-gray-700 mb-1 block">{label}</Label>}

      <div className="border rounded-md p-2 bg-white relative">
        {/* CHIPS */}
        <div className="flex flex-wrap gap-1 mb-1">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 text-sm bg-gray-100 border rounded px-2 py-0.5"
            >
              {v}
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => remove(v)}
              >
                ×
              </button>
            </span>
          ))}

          {/* INPUT */}
          <input
            className="flex-1 min-w-[8rem] outline-none px-1"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add(draft);
              } else if (e.key === 'Backspace' && !draft && values.length > 0) {
                remove(values[values.length - 1]);
              }
            }}
            placeholder={placeholder}
          />
        </div>

        {/* AUTOCOMPLETE */}
        {open && filtered.length > 0 && (
          <div className="absolute left-0 right-0 bg-white border rounded shadow-md max-h-48 overflow-auto z-20">
            {filtered.map((s) => (
              <button
                key={s}
                className="w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                onClick={() => add(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}