// frontend/scr/features/correspondence/components/filters/CorrespondenceFilters.tsx

interface Props {
  documentType: string;
  status: string;
  search: string;
  onChange: (v: { documentType: string; status: string; search: string }) => void;
}

export default function CorrespondenceFilters({
  documentType,
  status,
  search,
  onChange,
}: Props) {
  return (
    <div className="flex gap-3 flex-wrap text-sm">
      <input
        className="border rounded px-2 py-1"
        placeholder="Pesquisar…"
        value={search}
        onChange={(e) =>
          onChange({ documentType, status, search: e.target.value })
        }
      />

      <select
        className="border rounded px-2 py-1"
        value={documentType}
        onChange={(e) =>
          onChange({ documentType: e.target.value, status, search })
        }
      >
        <option value="">Todos os tipos</option>
        <option value="INVOICE">Invoice</option>
        <option value="CONTRACT">Contract</option>
      </select>

      <select
        className="border rounded px-2 py-1"
        value={status}
        onChange={(e) =>
          onChange({ documentType, status: e.target.value, search })
        }
      >
        <option value="">Todos os estados</option>
        <option value="DRAFT">Draft</option>
        <option value="RECEIVED">Received</option>
        <option value="ARCHIVED">Archived</option>
      </select>
    </div>
  );
}