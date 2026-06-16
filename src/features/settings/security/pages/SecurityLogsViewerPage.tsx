// frontend/src/features/settings/security/pages/SecurityLogsViewerPage.tsx

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getApiBase } from "../../../../lib/socketClient";

import { SettingsSectionCard } from "../../../../components/templates/SettingsSectionCard";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { Label } from "../../../../components/ui/Label";
import { fetchLogs } from "../../../../services/api";

// ======================================================
// Tipos
// ======================================================
export type DebugEntry = {
  ts: number;
  category: string;
  message: string;
  context?: {
    path?: string;
    method?: string;
    effectiveRole?: string;
    category?: string;
    signature?: string;
    subscribedServices?: string[];
    [key: string]: any;
  };
};

export type InitialPayload = {
  bufferSize: number;
  entries: DebugEntry[];
};

// ======================================================
// Cores por categoria
// ======================================================
const colorFor = (e: DebugEntry) => {
  switch (e.category) {
    case "match": return "text-green-400";
    case "rules": return "text-blue-300";
    case "grants": return "text-purple-300";
    case "service": return "text-amber-300";
    case "defaults": return "text-gray-400";
    case "deny": return "text-red-500";
    case "finalDecision":
      return e.message?.toLowerCase().includes("deny")
        ? "text-red-500"
        : "text-emerald-400";
    default:
      return "text-gray-300";
  }
};

// ======================================================
// WebSocket — COM TIPOS e SEM ERROS TS
// ======================================================
function connectSecurityDebugSocket(
  onInitial: (payload: InitialPayload) => void,
  onDebug: (entry: DebugEntry) => void,
  onBufferChange: (size: number) => void
): Socket {
  const base = getApiBase();
  const socket = io(`${base}/security-debug`, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
  });

  socket.on("initial", onInitial);
  socket.on("debug", onDebug);
  socket.on("bufferSizeChanged", ({ size }) => onBufferChange(size));

  return socket;
}

// ======================================================
// Agrupamento (SEM requestId, 100% compatível)
// ======================================================
function groupEntries(entries: DebugEntry[]) {
  const groups: {
    header: {
      method: string;
      path: string;
      ts: number;
      role?: string;
    };
    items: DebugEntry[];
    collapsed: boolean;
  }[] = [];

  for (const e of entries) {
    const ctx = e.context ?? {};
    const method = ctx.method ?? "?";
    const path = ctx.path ?? "?";
    const ts = e.ts;
    const role = ctx.effectiveRole;

    const key = `${method}::${path}`;

    const last = groups[groups.length - 1];
    if (last && `${last.header.method}::${last.header.path}` === key && (ts - last.header.ts) < 120) {
      last.items.push(e);
      continue;
    }

    groups.push({
      header: { method, path, ts, role },
      items: [e],
      collapsed: false,
    });
  }

  return groups;
}

// ======================================================
// Componente principal
// ======================================================
export default function SecurityLogsViewerPage() {
  const [mode, setMode] = useState<"console" | "table">("console");

  // Console Mode
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [bufferSize, setBufferSize] = useState(300);
  const [newSize, setNewSize] = useState("300");
  const consoleRef = useRef<HTMLDivElement>(null);

  // Ligação ao socket — 100% tipada e sem erros TS
  useEffect(() => {
    const socket = connectSecurityDebugSocket(
      (payload: InitialPayload) => {
        setBufferSize(payload.bufferSize);
        setNewSize(String(payload.bufferSize));
        setEntries(payload.entries ?? []);
      },

      (entry: DebugEntry) => {
        if (!paused) {
          setEntries(prev => [...prev, entry].slice(-bufferSize));
        }
      },

      (size: number) => {
        setBufferSize(size);
        setNewSize(String(size));
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [paused, bufferSize]);

  // Scroll automático
  useEffect(() => {
    if (!paused && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [entries, paused]);

  // ======================================================
  // Table Mode
  // ======================================================
  const [table, setTable] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  const loadTableData = async () => {
    setLoadingTable(true);
    try {
      // ATUALIZADO: logs reais usam "SECURITY_match", "SECURITY_rules", etc.
      const data = await fetchLogs({
        page: 1,
//        action: "SECURITY_",  // Agora funciona com os logs que me enviaste
        limit: 100,
        sortBy: "timestamp",
        sortOrder: "DESC",
      });
      setTable(data.data ?? []);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    if (mode === "table") loadTableData();
  }, [mode]);

  // ======================================================
  // Render
  // ======================================================
  return (
    <SettingsSectionCard
      accent
      title="Security Logs Viewer"
      description="Agrupamento por pedido, highlight de DENY e Table Mode corrigido."
    >
      {/* Switch */}
      <div className="flex gap-3 mb-4">
        <Button variant={mode === "console" ? "default" : "outline"} onClick={() => setMode("console")}>
          Console Mode
        </Button>
        <Button variant={mode === "table" ? "default" : "outline"} onClick={() => setMode("table")}>
          Table Mode
        </Button>
      </div>

      {/* ============= Console Mode ============= */}
      {mode === "console" && (
        <>
          <div className="flex gap-3 mb-3">
            <Button variant="outline" onClick={() => setPaused(p => !p)}>
              {paused ? "Despausar" : "Pausar"}
            </Button>

            <Button variant="outline" onClick={() => setEntries([])}>
              Limpar
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-sm text-gray-400">Buffer Size</Label>
              <Input className="w-24 h-9" value={newSize} onChange={e => setNewSize(e.target.value)} />
              <Button variant="outline">Apply</Button>
            </div>
          </div>

          <div
            ref={consoleRef}
            className="border rounded bg-black p-3 h-[500px] overflow-auto text-xs text-gray-200 font-mono"
          >
            {groupEntries(entries).map((group, gi) => {
              const h = group.header;
              const deny = group.items.some(
                e => e.category === "finalDecision" && e.message.toLowerCase().includes("deny")
              );

              return (
                <div
                  key={gi}
                  className={`mb-4 border rounded p-2 ${
                    deny ? "border-red-600 bg-red-900/30" : "border-gray-700"
                  }`}
                >
                  {/* Header */}
                  <div
                    className="cursor-pointer text-blue-300 font-bold mb-2 flex items-center gap-2"
                    onClick={() => {
                      group.collapsed = !group.collapsed;
                      setEntries([...entries]); // trigger re-render
                    }}
                  >
                    <span>{group.collapsed ? "▶" : "▼"}</span>
                    <span>{h.method} {h.path}</span>
                    <span className="text-gray-400 ml-2">{new Date(h.ts).toLocaleTimeString()}</span>
                    {h.role && <span className="text-gray-400 ml-4">role={h.role}</span>}
                    {deny && <span className="ml-4 text-red-400">DENY</span>}
                  </div>

                  {!group.collapsed &&
                    group.items.map((e, i) => (
                      <div key={i} className="ml-6 whitespace-pre mb-1">
                        <span className={`${colorFor(e)} font-bold mr-2`}>
                          [{e.category.toUpperCase()}]
                        </span>
                        <span>{e.message}</span>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ============= Table Mode ============= */}
      {mode === "table" && (
        <div className="mt-4 space-y-2">
          {loadingTable && <p className="text-sm text-gray-500">A carregar logs…</p>}

          {!loadingTable &&
            table.map((log) => {
              const ctx = log.context || {};
              return (
                <div key={log.id} className="border p-3 rounded bg-white text-sm shadow">
                  <div className="font-semibold text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>

                  <div><strong>Método:</strong> {ctx.method}</div>
                  <div><strong>Path:</strong> {ctx.path}</div>
                  <div><strong>Categoria:</strong> {ctx.category}</div>
                  <div><strong>Mensagem:</strong> {log.message}</div>
                  <div><strong>Role:</strong> {ctx.effectiveRole}</div>

                  <pre className="bg-gray-100 p-2 rounded mt-2 text-xs overflow-auto">
                    {JSON.stringify(ctx, null, 2)}
                  </pre>
                </div>
              );
            })}

          {!loadingTable && table.length === 0 && (
            <p className="text-gray-500 text-sm">Sem resultados.</p>
          )}
        </div>
      )}
    </SettingsSectionCard>
  );
}