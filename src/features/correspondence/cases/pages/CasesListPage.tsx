// frontend/src/features/correspondence/components/cases/pages/CasesListPage.tsx

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanies, apiFetch } from '../../../../services/api';

import { CompanySelect } from '../../../../components/common/CompanySelect';
import { ListPageTemplate } from '../../../../components/templates/ListPageTemplate';
import type { Column } from '../../../../components/templates/types';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

import { FileText } from 'lucide-react';
import { UserRole } from '../../../../types/user';

/* ================= helpers ================= */

function formatDate(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

/* ================= types ================= */

type CorrespondenceCase = {
  id: string;
  number: string;
  documentType: string;
  status: string;
  direction: string;
  updatedAt?: string;
  createdAt: string;
};

/* ================= page ================= */

export default function CasesListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { companyId: companyIdFromUrl } =
    useParams<{ companyId?: string }>();

  const isPlatformAdmin =
    user?.role === UserRole.PLATFORM_ADMIN;

  const selectedCompanyId = isPlatformAdmin
    ? companyIdFromUrl
    : user?.company?.id;

  /* ================= companies ================= */

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: isPlatformAdmin,
  });

  /* ================= filtros ================= */

  const [filterNumber, setFilterNumber] = useState('');
  const [filterDocumentType, setFilterDocumentType] =
    useState('');
  const [filterStatus, setFilterStatus] = useState('');

  /* ================= sorting ================= */

  const [sortBy, setSortBy] =
    useState<'createdAt' | 'number' | 'status'>(
      'createdAt'
    );
  const [sortOrder, setSortOrder] =
    useState<'ASC' | 'DESC'>('DESC');

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) =>
        prev === 'ASC' ? 'DESC' : 'ASC'
      );
    } else {
      setSortBy(key as any);
      setSortOrder('ASC');
    }
  };

  /* ================= query ================= */

  const { data: cases = [] } = useQuery<
    CorrespondenceCase[]
  >({
    queryKey: [
      'correspondence',
      'cases',
      selectedCompanyId,
    ],
    queryFn: () =>
      apiFetch(
        `/correspondence/cases?companyId=${selectedCompanyId}`
      ),
    enabled: !!selectedCompanyId,
  });

  /* ================= filtros locais ================= */

  const filteredCases = cases.filter((c) => {
    if (
      filterNumber &&
      !c.number
        ?.toLowerCase()
        .includes(filterNumber.toLowerCase())
    )
      return false;

    if (
      filterDocumentType &&
      c.documentType !== filterDocumentType
    )
      return false;

    if (filterStatus && c.status !== filterStatus)
      return false;

    return true;
  });

  /* ================= sorting ================= */

  const sortValue = (
    c: CorrespondenceCase,
    key: string
  ) => {
    switch (key) {
      case 'number':
        return c.number?.toLowerCase() ?? '';
      case 'documentType':
        return c.documentType;
      case 'status':
        return c.status;
      case 'direction':
        return c.direction;
      case 'createdAt':
        return new Date(c.createdAt).getTime();
      case 'updatedAt':
        return c.updatedAt
          ? new Date(c.updatedAt).getTime()
          : 0;
      default:
        return '';
    }
  };

  const sortedCases = [...filteredCases].sort(
    (a, b) => {
      const av = sortValue(a, sortBy);
      const bv = sortValue(b, sortBy);

      if (av < bv) return sortOrder === 'ASC' ? -1 : 1;
      if (av > bv) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    }
  );

  /* ================= columns ================= */

  const columns: Column<CorrespondenceCase>[] = [
    {
      key: 'number',
      header: 'Número',
      sortable: true,
      render: (c) => (
        <span className="font-mono font-medium">
          {c.number}
        </span>
      ),
    },
    {
      key: 'documentType',
      header: 'Tipo',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
    },
    {
      key: 'direction',
      header: 'Direção',
      sortable: true,
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      sortable: true,
      render: (c) => formatDate(c.createdAt),
    },
    {
      key: 'updatedAt',
      header: 'Atualizado em',
      sortable: true,
      render: (c) => formatDate(c.updatedAt),
    },
  ];

  /* ================= render ================= */

  return (
    <ListPageTemplate<CorrespondenceCase>
      header={{
        icon: FileText,
        title: 'Expedientes',
        actions: (
          <div className="flex items-center gap-3">
            {isPlatformAdmin && (
              <CompanySelect
                mode="navigate"
                companies={companies}
                value={selectedCompanyId ?? ''}
                buildHref={(id) =>
                  `/correspondence/cases/company/${id}`
                }
              />
            )}

            {selectedCompanyId && (
              <Button asChild>
                <Link
                  to={`/correspondence/cases/create?companyId=${selectedCompanyId}`}
                >
                  Novo Expediente
                </Link>
              </Button>
            )}
          </div>
        ),
      }}
      filters={{
        colsTemplate: 'repeat(3, minmax(0, 1fr))',
        children: (
          <>
            <Input
              placeholder="Número"
              value={filterNumber}
              onChange={(e) =>
                setFilterNumber(e.target.value)
              }
            />

            <Input
              placeholder="Tipo"
              value={filterDocumentType}
              onChange={(e) =>
                setFilterDocumentType(e.target.value)
              }
            />

            <Input
              placeholder="Estado"
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value)
              }
            />
          </>
        ),
      }}
      table={{
        columns,
        data: sortedCases,
        rowKey: (c) => c.id,
        stickyHeader: true,
        sortBy,
        sortOrder,
        onSort: handleSort,
        onRowClick: (row) => {
          navigate(
            `/correspondence/cases/company/${selectedCompanyId}/case/${row.id}`
          );
        },
        rowClassName: () =>
          'py-1.5 hover:bg-gray-100 cursor-pointer',
      }}
    />
  );
}