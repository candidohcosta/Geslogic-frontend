// frontend/src/features/correspondence/pages/OutboxPage.tsx

import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanies, apiFetch } from '../../../services/api';

import { CompanySelect } from '../../../components/common/CompanySelect';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import type { Column } from '../../../components/templates/types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

import { Send, Paperclip, Hand, MessageSquareMore, Mail } from 'lucide-react';
import { UserRole } from '../../../types/user';
import { OutboundRegistry } from '../types/registry.types';

import OutboundRegistryModal from '../outbox/components/modals/OutboundRegistryModal';
import { useDeleteOutboundRegistry } from '../outbox/hooks/useDeleteOutboundRegistry';

import { confirmDialog } from '../../../components/system/confirmDialog';
import OutboundSendDrawer from '../outbox/components/OutboundSendDrawer';
import { InboxCommentModal } from '../components/modals/InboxCommentModal';

/* ---------------- helpers ---------------- */

function formatOutboxDate(e: OutboundRegistry) {
  return new Date(e.createdAt).toLocaleString();
}

const compactCell = 'py-1 text-sm leading-tight';

type OutboxFilter =
  | 'DRAFT'
  | 'SENT'
  | 'CANCELLED'
  | 'ALL';

/* ---------------- page ---------------- */

export default function OutboxPage() {
  const { user } = useAuth();
  const { companyId: companyIdFromUrl } =
    useParams<{ companyId?: string }>();

  const isPlatformAdmin =
    user?.role === UserRole.PLATFORM_ADMIN;

  const selectedCompanyId = isPlatformAdmin
    ? companyIdFromUrl
    : user?.company?.id;

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: isPlatformAdmin,
  });

const deleteOutboundRegistry = useDeleteOutboundRegistry(selectedCompanyId);

/*   const [showCancelled, setShowCancelled] = useState(false); */

  const [outboxFilter, setOutboxFilter] = useState<OutboxFilter>('DRAFT');

  const [filterRegistryNumber, setFilterRegistryNumber] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev: 'ASC' | 'DESC') =>
        prev === 'ASC' ? 'DESC' : 'ASC'
      );
    } else {
      setSortBy(key);
      setSortOrder('ASC');
    }
  };

  const { data: entries = [] } = useQuery<OutboundRegistry[]>({
    queryKey: [
      'correspondence',
      'outbox',
      selectedCompanyId,
      outboxFilter,
    ],
    queryFn: () =>
      apiFetch(
        `/correspondence/outbox?companyId=${selectedCompanyId}&filter=${outboxFilter}`,
      ),
    enabled: !!selectedCompanyId,
  });

  const [selectedRegistry, setSelectedRegistry] =
    useState<OutboundRegistry | null>(null);

const [sendDrawerRegistry, setSendDrawerRegistry] =
  useState<OutboundRegistry | null>(null);    

const [commentRegistryId, setCommentRegistryId] =
  useState<string | null>(null);

  const filteredEntries = entries.filter((e: any) => {

/*     if (outboxFilter !== 'ALL' && e.status !== outboxFilter) {
      return false;
    } */

    const normalizedFilterRegistryNumber = filterRegistryNumber.trim().toLowerCase();
    if (
      filterRegistryNumber &&
      !e.registryNumber?.trim().toLowerCase().includes(normalizedFilterRegistryNumber)
    ) {
      return false;
    }

    const normalizedFilterSubject = filterSubject.trim().toLowerCase();
    if (
      filterSubject &&
      !e.subject?.trim().toLowerCase().includes(normalizedFilterSubject)
    ) {
      return false;
    }

    const normalizedFilterDescription = filterDescription.trim().toLowerCase();
    if (
      filterDescription &&
      !e.description?.trim().toLowerCase().includes(normalizedFilterDescription)
    ) {
      return false;
    }

    const normalizedFilterEntity = filterEntity.trim().toLowerCase();
    if (
      filterEntity &&
      !e.destination?.name?.trim().toLowerCase().includes(normalizedFilterEntity)
    ) {
      return false;
    }

    return true;
  });

type SortKey =
  | 'destination'
  | 'createdAt'
  | 'subject'
  | 'channel'
  | 'status'
  | 'description'
  | 'registryNumber';

const sortValue = (e: OutboundRegistry, key: SortKey) => {
  switch (key) {
    case 'destination':
      return e.destination?.name?.toLowerCase() ?? '';

    case 'createdAt':
      return new Date(e.createdAt).getTime();

    case 'subject':
      return e.subject?.toLowerCase() ?? '';

    case 'channel':
      return e.channel;

    case 'status':
      return e.status;

    case 'description':
      return e.description?.toLowerCase() ?? '';

    case 'registryNumber':
      return e.registryNumber?.toLowerCase() ?? '';

    default:
      return '';
  }
};



const sortedEntries = [...filteredEntries].sort((a, b) => {
  const av = sortValue(a, sortBy as SortKey);
  const bv = sortValue(b, sortBy as SortKey);

  if (av < bv) return sortOrder === 'ASC' ? -1 : 1;
  if (av > bv) return sortOrder === 'ASC' ? 1 : -1;
  return 0;
});


const totalCount = filteredEntries.length;

  const columns: Column<OutboundRegistry>[] = [
{
  key: 'destination',
  header: 'Entidade',
  sortable: true,
  widthPct: 20,
  className: compactCell,
  render: (e) => (
    <span>
      {e.destination?.name ?? '—'}
    </span>
  ),
},

    {
      key: 'registryNumber',
      header: 'Nº Saída',
      sortable: true,
      widthPct: 16,
      className: compactCell,
      render: (e) => (
        <span className="font-mono font-medium">
          {e.registryNumber ?? '—'}
        </span>
      ),
    },

    {
      key: 'subject',
      header: 'Assunto',
      sortable: true,
      widthPct: 24,
      className: compactCell,
      render: (e) =>
        e.subject ? (
          e.subject
        ) : (
          <span className="italic text-gray-400">
            Sem assunto
          </span>
        ),
    },

    {
      key: 'description',
      header: 'Descrição / Corpo',
      sortable: true,
      widthPct: 24,
      className: compactCell,
      render: (e) => (
        <span title={e.description ?? ''}>
          <span className="truncate block max-w-[250px]">
            {e.description ?? '—'}
          </span>
        </span>
      ),
    },

    {
      key: 'channel',
      header: 'Canal',
      sortable: true,
      widthPct: 10,
      className: compactCell,
      render: (e) => (
        <div className="flex items-center gap-2">
          {e.channel === 'MANUAL' ? (
            <span title="Manual">
              <Hand className="h-4 w-4 text-gray-700" />
            </span>
) : e.channel === 'EMAIL' ? (
  <span title="Email" className="flex items-center">
    <Mail className="h-4 w-4 text-gray-700" />
  </span>
) : (
            <span className="text-sm font-medium text-gray-700">
              {e.channel}
            </span>
          )}
        </div>
      ),
    },

/*     {
      key: 'status',
      header: 'Estado',
      sortable: true,
      widthPct: 10,
      className: compactCell,
render: (e) => (
  <div className="flex items-center gap-2">
    <span>{e.status}</span>

    {e.status === 'SENT' && (
      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
        Enviado
      </span>
    )}

    {e.status === 'CANCELLED' && (
      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
        Cancelado
      </span>
    )}
  </div>
),
    }, */

    {
      key: 'createdAt',
      header: 'Criado em',
      sortable: true,
      widthPct: 14,
      className: compactCell,
      render: (e) => formatOutboxDate(e),
    },

    {
      key: 'attachments',
      header: '',
      widthPct: 4,
      className: compactCell,
      align: 'center',
      render: (e: any) =>
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
  render: (e: any) =>
    e.commentsCount > 0 ? (
      <button
        type="button"
        title="Ver comentário"
        onClick={(ev) => {
          ev.stopPropagation();
          setCommentRegistryId(e.id);
        }}
        className="text-gray-600 hover:text-gray-900 transition"
      >
        <MessageSquareMore className="h-4 w-4 text-gray-600" />
        <span className="text-xs ml-1">
          ({e.commentsCount})
        </span>
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

      {/* ✅ Avaliar / Send */}
      {e.status === 'DRAFT' && (
        <Button
          size="sm"
          onClick={(ev) => {
            ev.stopPropagation();
            setSendDrawerRegistry(e); // abre drawer/modal
          }}
        >
          Avaliar
        </Button>
      )}

      {/* ✅ Delete (PlatformAdmin) */}
      {isPlatformAdmin && (
        <Button
          size="sm"
          variant="destructive"
          title="Eliminar registo"
          onClick={async (ev) => {
            ev.stopPropagation();

            const confirmed = await confirmDialog({
              title: 'Eliminar saída',
              message:
                'Tem a certeza que deseja eliminar este registo de saída e os seus anexos?',
              confirmText: 'Eliminar',
              cancelText: 'Cancelar',
            });

            if (!confirmed) return;

            // 👉 aqui vais precisar de um hook tipo:
            deleteOutboundRegistry.mutate(e.id);
          }}
        >
          🗑
        </Button>
      )}

    </div>
  ),
}

  ];

  return (
    <>
      <ListPageTemplate<OutboundRegistry>
        header={{
          icon: Send,
          title: 'Outbox de Correspondência',
          actions: (
            <div className="flex items-center gap-3">
              {isPlatformAdmin && (
                <CompanySelect
                  mode="navigate"
                  companies={companies}
                  value={selectedCompanyId ?? ''}
                  buildHref={(id) =>
                    `/correspondence/outbox/company/${id}`
                  }
                />
              )}

              {selectedCompanyId && (
                <Button asChild>
                  <Link
                    to={`/correspondence/outbound/new?companyId=${selectedCompanyId}`}
                  >
                    Criar Registo de Saída
                  </Link>
                </Button>
              )}
            </div>
          ),
        }}

        filters={{
          colsTemplate: 'repeat(5, minmax(0, 1fr))',
          children: (
            <>

              <Input
                placeholder="Entidade"
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
              />

              <Input
                placeholder="Nº Saída"
                value={filterRegistryNumber}
                onChange={(e) =>
                  setFilterRegistryNumber(e.target.value)
                }
              />

              <Input
                placeholder="Assunto"
                value={filterSubject}
                onChange={(e) =>
                  setFilterSubject(e.target.value)
                }
              />

              <Input
                placeholder="Descrição"
                value={filterDescription}
                onChange={(e) =>
                  setFilterDescription(e.target.value)
                }
              />

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Estado:</span>

                <select
                  value={outboxFilter}
                  onChange={(e) =>
                    setOutboxFilter(e.target.value as OutboxFilter)
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                
                <option value="DRAFT">Rascunhos</option>
                <option value="SENT">Enviados</option>
                <option value="CANCELLED">Cancelados</option>
                <option value="ALL">Todos</option>

                </select>

                <span className="text-sm text-gray-500">
                  ({totalCount})
                </span>

              </div>
            </>
          ),
        }}

        table={{
          columns,
          data: sortedEntries,
          rowKey: (e) => e.id,
          stickyHeader: true,
          sortBy,
          sortOrder,
          onSort: handleSort,
          onRowClick: (row) => setSelectedRegistry(row),
rowClassName: (e: any) => {
  if (e.status === 'CANCELLED') {
    return 'py-1.5 bg-red-50 text-gray-500 line-through hover:bg-red-100 cursor-pointer';
  }

  if (e.status === 'SENT') {
    return 'py-1.5 bg-green-50 hover:bg-green-100 cursor-pointer';
  }

  if (e.commentsCount > 0 && e.status === 'DRAFT') {
    return 'py-1.5 bg-amber-50 hover:bg-amber-100 cursor-pointer';
  }

  return 'py-1.5 hover:bg-gray-100 cursor-pointer';
},
        }}
      />

      {selectedRegistry && (
        <OutboundRegistryModal
          registry={selectedRegistry}
          onClose={() => setSelectedRegistry(null)}
        />
      )}

      {sendDrawerRegistry && (
        <OutboundSendDrawer
          registry={sendDrawerRegistry}
          isOpen={!!sendDrawerRegistry}
          onClose={() => setSendDrawerRegistry(null)}
        />
      )}

{commentRegistryId && (
  <InboxCommentModal
    registryId={commentRegistryId}
    onClose={() => setCommentRegistryId(null)}
  />
)}      
    </>
  );
}
