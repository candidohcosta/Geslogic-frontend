// frontend/src/features/correspondence/pages/InboxPage.tsx

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanies } from '../../../services/api';

import { useInboxEntries } from '../hooks/useInboxEntries';
import { useDeleteInboxEntry } from '../hooks/useDeleteInboxEntry';
import { InboxEntry, InboxStatus } from '../types/inbox.types';

import { CompanySelect } from '../../../components/common/CompanySelect';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import type { Column } from '../../../components/templates/types';
import { Button } from '../../../components/ui/Button';
import { useEmailAvailability } from '../hooks/useEmailAvailability'

import {
  Hand,
  Inbox as InboxIcon,
  Paperclip,
  X,
  Mail,
  Plug,
  FileText,
  MessageSquareMore,
} from 'lucide-react';

import { UserRole } from '../../../types/user';

import InboxEntryModal from '../components/modals/InboxEntryModal';
import { confirmDialog } from '../../../components/system/confirmDialog';

import InboxDecisionDrawer from '../components/InboxDecisionDrawer';
import { Input } from '../../../components/ui/Input';
import { InboxCommentModal } from '../components/modals/InboxCommentModal';
/* ---------------- helpers ---------------- */

function formatInboxDate(e: InboxEntry) {
  const d = new Date(e.receivedAt ?? e.createdAt);
  return e.channel === 'MANUAL'
    ? d.toLocaleDateString()
    : d.toLocaleString();
}

function bodyPreview(e: InboxEntry) {
  return e.description ?? '';
}

type SortKey = 'date' | 'subject' | 'channel' | 'department' | 'description' | 'origin';

type StatusFilter =
  | 'PENDING'
  | 'ON_HOLD'
  | 'REJECTED'
  | 'ASSOCIATED'
  | 'ALL';


const sortValue = (e: InboxEntry, key: SortKey) => {
  switch (key) {
    case 'origin':
      return e.origin?.name?.toLowerCase() ?? '';
      //return e.origin?.name ?? '';
    case 'date':
      return new Date(e.receivedAt ?? e.createdAt).getTime();
    case 'subject':
      return e.subject?.toLowerCase() ?? '';
      //return e.subject ?? '';
    case 'channel':
      return e.channel;
    case 'department':
      return e.department ?? '';
    case 'description':
      return e.description?.toLowerCase() ?? '';
  
    default:
      return '';
  }
};

/* function InboxStatusBadge({ status }: { status: string }) {
  if (status === 'ON_HOLD') {
    return (
      <span className="ml-2 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
        Em espera
      </span>
    );
  }

  return null;
} */

function InboxChannelCell({
  channel,
  status,
}: {
  channel: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {channel === 'MANUAL' ? (
        
<span title="Manual" className="flex items-center">
  <Hand className="h-4 w-4 text-gray-700" />
</span>

) : channel === 'EMAIL' ? (
  <span title="Email" className="flex items-center">
    <Mail className="h-4 w-4 text-gray-700" />
  </span>
) : (
        <span className="text-sm font-medium text-gray-700">
          {channel}
        </span>
      )}

      {status === 'ON_HOLD' && (
        <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
          Em espera
        </span>
      )}
    </div>
  );
}

const compactCell = 'py-1 text-sm leading-tight';

/* ---------------- page ---------------- */

export default function InboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { companyId: companyIdFromUrl } =
    useParams<{ companyId?: string }>();

  const [openEntry, setOpenEntry] =
    useState<InboxEntry | null>(null);

  const isPlatformAdmin =
    user?.role === UserRole.PLATFORM_ADMIN;

  const selectedCompanyId = isPlatformAdmin
    ? companyIdFromUrl
    : user?.company?.id;

const { data: emailAvailability } =
  useEmailAvailability(selectedCompanyId ?? undefined);

const canUseEmail = emailAvailability?.enabled === true;

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: isPlatformAdmin,
  });

/* const [showRejected, setShowRejected] = useState(false);
const [showAssociated, setShowAssociated] = useState(false); */

const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');

  const { data: entries = [] } =
    useInboxEntries(selectedCompanyId ?? null, statusFilter);

  const deleteInboxEntry = useDeleteInboxEntry(selectedCompanyId ?? null);

  const [decisionEntry, setDecisionEntry] = useState<InboxEntry | null>(null);


const [commentEntry, setCommentEntry] =
  useState<InboxEntry | null>(null);

/*   const canEvaluate = (status: string) => */
const canEvaluate = (status: InboxStatus) =>    
    status === 'PENDING' || status === 'ON_HOLD';

const [commentRegistryId, setCommentRegistryId] =
  useState<string | null>(null);


const [sortBy, setSortBy] = useState<string>('date');
const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

const [filterEntity, setFilterEntity] = useState('');
const [filterSubject, setFilterSubject] = useState('');
const [filterDescription, setFilterDescription] = useState('');



function handleSort(key: string) {
  if (sortBy === key) {
    setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
  } else {
    setSortBy(key);
    setSortOrder('ASC');
  }
}

const filteredEntries = entries
  .filter((e: InboxEntry) => {
/*     if (!showRejected && e.status === 'REJECTED') return false;
    if (!showAssociated && e.status === 'ASSOCIATED') return false; */

/*     if (statusFilter !== 'ALL' && e.status !== statusFilter) {
      return false;
    } */


    const normalizedFilterEntity = filterEntity.trim().toLowerCase();
    if (filterEntity &&
        !e.origin?.name?.trim().toLowerCase().includes(normalizedFilterEntity)) {
      return false;
    }

    const normalizedFilterSubject = filterSubject.trim().toLowerCase();
    if (filterSubject &&
        !e.subject?.trim().toLowerCase().includes(normalizedFilterSubject)) {
      return false;
    }

    const normalizedFilterDescription = filterDescription.trim().toLowerCase();
    if (filterDescription &&
        !e.description?.trim().toLowerCase().includes(normalizedFilterDescription)) {
      return false;
    }

    return true;
  })

  .sort((a: InboxEntry, b: InboxEntry) => {
    const av = sortValue(a, sortBy as SortKey);
    const bv = sortValue(b, sortBy as SortKey);

    if (av < bv) return sortOrder === 'ASC' ? -1 : 1;
    if (av > bv) return sortOrder === 'ASC' ? 1 : -1;
    return 0;
  });

/*   .sort((a, b) => {

    if (sortBy === 'date') {
      const ad = new Date(a.receivedAt ?? a.createdAt).getTime();
      const bd = new Date(b.receivedAt ?? b.createdAt).getTime();

      return sortOrder === 'ASC' ? ad - bd : bd - ad;
    }

    const av = (a as any)[sortBy];
    const bv = (b as any)[sortBy];

    if (av == null || bv == null) return 0;

    if (av < bv) return sortOrder === 'ASC' ? -1 : 1;
    if (av > bv) return sortOrder === 'ASC' ? 1 : -1;
    return 0;
  }); */

const totalCount = filteredEntries.length;


  const columns: Column<InboxEntry>[] = [
    {
      key: 'origin',
      header: 'Entidade',
      sortable: true,
      widthPct: 16,
      className: compactCell,
      render: (e) => e.origin?.name ?? '—',
    },
{
  key: 'subject',
  header: 'Assunto',
  sortable: true,
  widthPct: 20,
  className: compactCell,
  render: (e) => (
    <div className="flex flex-col">
      
      {/* ✅ SUBJECT */}
      <span>
        {e.subject ? (
          e.subject
        ) : (
          <span className="italic text-gray-400">
            Sem assunto
          </span>
        )}
      </span>

      {/* ✅ CASE NUMBER (SE EXISTIR) */}

  {e.caseNumber && (
    <div
      className="flex items-center gap-1 text-xs text-green-600 cursor-pointer hover:underline"
      onClick={(ev) => {
        ev.stopPropagation();
        if (e.caseId) {
          navigate(`/correspondence/case/${e.caseId}`);
        }
      }}
    >
      <FileText className="w-3 h-3" />
      <span className="text-gray-500">Expediente:</span>
      <span>#{e.caseNumber}</span>
    </div>
  )}


    </div>
  ),
},
    {
      key: 'description',
      header: 'Descrição / Corpo',
      sortable: true,
      widthPct: 32,
      className: compactCell,
      render: (e) => (
        <span
          className="truncate block"
          title={bodyPreview(e)}
        >
          {bodyPreview(e)}
        </span>
      ),
    },
{
  key: 'channel',
  header: 'Canal',
  sortable: true,
  widthPct: 8,
  className: compactCell,
  render: (e) => (
    <InboxChannelCell
      channel={e.channel}
      status={e.status}
    />
  ),
},

    {
      key: 'date',
      header: 'Data',
      sortable: true,
      widthPct: 12,
      className: compactCell,
      render: (e) => formatInboxDate(e),
    },
    {
      key: 'attachments',
      header: '',
      widthPct: 4,
      className: compactCell,
      align: 'center',
      render: (e) =>
        e.attachmentsCount > 0 ? (
          <>
          <Paperclip className="h-4 w-4 text-gray-600" />
          <span className="text-xs">({e.attachmentsCount})</span>
          </>
        ) : null,
    },
{
  key: 'comment',
  header: '',
  widthPct: 4,
  align: 'center',
  className: compactCell,
/*   render: (e) =>
    e.comment && e.comment.trim().length > 0 ? ( */

    render: (e) =>
      e.commentsCount > 0 ? (

      <button
        type="button"
        title="Ver comentário"
        onClick={(ev) => {
          ev.stopPropagation(); // não abre o modal da linha
          //setCommentEntry(e);   // abre o mini‑modal
          setCommentRegistryId(e.id);
        }}
        className="text-gray-600 hover:text-gray-900 transition"
      >
        <MessageSquareMore className="h-4 w-4 text-gray-600" />
        <span className="sr-only">Ver comentário</span>
        <span className="text-xs">({e.commentsCount})</span>
        {/* 💬 */}
      </button>
    ) : null,
},
    {
      key: 'actions',
      header: '',
      widthPct: 12,
      className: compactCell,
      align: 'right',
      render: (e) => (
        <div className="flex justify-end gap-1">
          {canEvaluate(e.status) && (
            <Button
              size="sm"
              className="flex-1"
              onClick={(ev) => {
                ev.stopPropagation();
                setDecisionEntry(e);
              }}
            >
              Avaliar
            </Button>
          )}
{e.status === "ASSOCIATED" && e.caseId && (
  <Button
    size="sm"
    className="flex-1 leading-tight text-center"
    variant="outline"
    onClick={(ev) => {
      ev.stopPropagation();
      navigate(`/correspondence/case/${e.caseId}`);
    }}
  >

  Abrir<br />Expediente

  </Button>
)}
          {isPlatformAdmin && (
          <Button
            size="sm"
            variant="destructive"
            title="Apagar entrada"
            onClick={async (ev) => {
              ev.stopPropagation();

              const confirmed = await confirmDialog({
                title: 'Apagar entrada',
                message:
                  'Tem a certeza que deseja apagar esta entrada e todos os seus anexos?',
                confirmText: 'Apagar',
                cancelText: 'Cancelar',
              });

              if (!confirmed) return;

              deleteInboxEntry.mutate(e.id, {
                onSuccess: () => {
                  setOpenEntry(null);
                },
              });
            }}
          >
            🗑
          </Button>

          )}
        </div>
      ),
    },

  ];

  return (
    <>
      <ListPageTemplate<InboxEntry>
        header={{
          icon: InboxIcon,
          title: 'Inbox de Correspondência',
          actions: (
            <div className="flex items-center gap-3">
              {isPlatformAdmin && (
                <CompanySelect
                  mode="navigate"
                  companies={companies}
                  value={selectedCompanyId ?? ''}
                  buildHref={(id) =>
                    `/correspondence/inbox/company/${id}`
                  }
                />
              )}
{selectedCompanyId && (
  <>
    <Button asChild>
      <Link
        to={`/correspondence/inbound/manual?companyId=${selectedCompanyId}`}
      >
        Criar Nova Entrada
      </Link>
    </Button>

{canUseEmail && (
  <Button asChild variant="outline">
    <Link
      to={`/correspondence/inbox/import-email?companyId=${selectedCompanyId}`}
    >
      <Mail className="w-4 h-4 mr-2" />
      Importar Emails
    </Link>
  </Button>
)}
  </>
)}
            </div>
          ),
        }}

  filters={{
    colsTemplate: 'repeat(4, minmax(0, 1fr))',
    children: (
      <>
        <Input
          placeholder="Entidade"
          value={filterEntity}
          onChange={e => setFilterEntity(e.target.value)}
        />

        <Input
          placeholder="Assunto"
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
        />

        <Input
          placeholder="Descrição"
          value={filterDescription}
          onChange={e => setFilterDescription(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Estado:</span>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as StatusFilter)
            }
            className="border rounded px-2 py-1 text-sm"
          >
          
            <option value="PENDING">Pendentes</option>
            <option value="ON_HOLD">Em espera</option>
            <option value="ASSOCIATED">Associados</option>
            <option value="REJECTED">Rejeitados</option>
            <option value="ALL">Todos</option>
          </select>

  <span className="text-sm text-gray-500">
    ({totalCount})
  </span>

        </div>

{/*         <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showRejected}
              onChange={e => setShowRejected(e.target.checked)}
            />
            Ver rejeitadas
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAssociated}
              onChange={e => setShowAssociated(e.target.checked)}
            />
            Ver associadas
          </label>
        </div> */}
      </>
    ),
  }}

        table={{
          columns,
          //data: entries,
          data: filteredEntries,
          rowKey: (e) => e.id,
          stickyHeader: true,

  sortBy,
  sortOrder,
  onSort: handleSort,

          onRowClick: (row) => setOpenEntry(row),
/*           rowClassName: () =>
            'py-1.5 hover:bg-gray-100 cursor-pointer', */

rowClassName: (e) =>
  e.status === 'REJECTED'
    ? 'py-1.5 bg-red-50 text-gray-500 line-through hover:bg-red-100 cursor-pointer'
    : e.status === 'ON_HOLD'
    ? 'py-1.5 bg-amber-50 hover:bg-amber-100 cursor-pointer'
    : e.status === 'ASSOCIATED'
    ? 'py-1.5 bg-green-50 text-gray-600 hover:bg-green-100 cursor-pointer'
    : 'py-1.5 hover:bg-gray-100 cursor-pointer',

        }}
      />

      {openEntry && (
        <InboxEntryModal
          entry={openEntry}
          onClose={() => setOpenEntry(null)}
        />
      )}

{decisionEntry && selectedCompanyId && (
  <InboxDecisionDrawer
    entry={decisionEntry}
    companyId={selectedCompanyId}
    isOpen={!!decisionEntry}
    onClose={() => setDecisionEntry(null)}
  />
)}

{/* {commentEntry && (
  <InboxCommentModal
    entry={commentEntry}
    onClose={() => setCommentEntry(null)}
  />
)} */}


{commentRegistryId && (
  <InboxCommentModal
    registryId={commentRegistryId}
    onClose={() => setCommentRegistryId(null)}
  />
)}


    </>
  );
}