import React from 'react';

interface ItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  danger?: boolean;
}

export const ContextMenuItem: React.FC<ItemProps> = ({ children, danger, className, ...rest }) => (
  <button
    type="button"
    className={[
      "w-full text-left px-3 py-2 text-sm",
      danger ? "text-red-300 hover:bg-red-500/10 hover:text-red-200" : "text-gray-200 hover:bg-gray-800/70",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 rounded-[6px]",
      className || ""
    ].join(' ')}
    {...rest}
  >
    {children}
  </button>
);