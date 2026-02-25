// src/components/templates/SettingsContextTemplate.tsx
import React from 'react';
import { cn } from '../../lib/utils';
import { Page, PageToolbar } from '../../components/layout/Page';

export type TabDef = {
  id: string;
  label: string;
  content: React.ReactNode;
  headerActions?: React.ReactNode;
};

interface Props {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  tabs: TabDef[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  footerActions?: React.ReactNode;
}

export function SettingsContextTemplate({
  icon: Icon,
  title,
  subtitle,
  tabs,
  activeTabId,
  onTabChange,
  footerActions,
}: Props) {
  const active = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  return (
    <Page>
      {/* HEADER */}
      <Page.Header>
        <div className="px-4 pt-4 pb-3 flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-6 w-6 text-brand-500" />}
              <h1 className="text-2xl font-semibold text-gray-800 truncate">{title}</h1>
            </div>
            {subtitle && (
              <p className="text-sm text-gray-600 truncate">{subtitle}</p>
            )}
          </div>
          {active?.headerActions && (
            <div className="shrink-0">{active.headerActions}</div>
          )}
        </div>
      </Page.Header>

      {/* BODY */}
      <Page.Body>
        <div className="px-4 pb-20 min-w-0 max-w-full">

          {/* TABS MENU */}
          <div className="bg-white border-b -mt-px">
            <div className="px-2">
              <div className="flex items-center gap-2 overflow-x-auto">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        'relative px-4 py-2 text-sm font-medium transition-colors',
                        isActive ? 'text-brand-600' : 'text-gray-600 hover:text-gray-800'
                      )}
                    >
                      <span className="relative z-[1]">{tab.label}</span>

                      {/* ACCENT BAR — NO TOP, SEM GAP */}
                      <span
                        aria-hidden
                        className={cn(
                          'pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-md',
                          isActive ? 'bg-brand-500' : 'bg-transparent'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="mt-4 space-y-6">
            {active?.content}
          </div>
        </div>

        {/* FOOTER STICKY */}
        <PageToolbar position="bottom">
          <div className="flex justify-end items-center gap-2 py-3 px-4">
            {footerActions}
          </div>
        </PageToolbar>
      </Page.Body>
    </Page>
  );
}