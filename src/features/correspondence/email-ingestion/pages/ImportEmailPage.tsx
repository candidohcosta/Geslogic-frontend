// frontend/src/features/correspondence/email-ingestion/pages/ImportEmailPage.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';

import { ListPageTemplate } from '../../../../components/templates/ListPageTemplate';
import { Button } from '../../../../components/ui/Button';

import { ArrowLeft, Inbox } from 'lucide-react';

import { useEmailInbox } from '../hooks/useEmailInbox';
import { useImportEmail } from '../hooks/useImportEmail';

import { EmailEvaluationDrawer } from '../drawer/EmailEvaluationDrawer';

import { useEmailAction } from '../hooks/useEmailAction';

type AttachmentSelection = Record<string, boolean>;

function isProbablySignature(a: any) {
  return a.mimeType?.startsWith('image/') && a.size < 20000;
}

const COL_LIMITS = {
  left:   { min: 15, max: 40 },
  middle: { min: 20, max: 70 }, // ✅ reduzido (era demasiado grande antes)
  right:  { min: 20, max: 60 }, // ✅ aumentado → podes dar mais espaço ao preview
};

const STORAGE_KEY = 'email-layout-widths';

const ImportEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('companyId');

  const { data: emails = [], isLoading } =
    useEmailInbox(companyId ?? undefined);

  const importMutation = useImportEmail();

  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [selectedAttachments, setSelectedAttachments] =
    useState<AttachmentSelection>({});

  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ✅ widths persistidos
  const [leftWidth, setLeftWidth] = useState(25);
  const [rightWidth, setRightWidth] = useState(25);


const [isExpanded, setIsExpanded] = useState(false);

const actionMutation = useEmailAction();

const navigate = useNavigate();
const { user } = useAuth();

function goToInbox() {
  if (user?.role === 'PLATFORM_ADMIN' && companyId) {
    navigate(`/correspondence/inbox/company/${companyId}`);
    return;
  }

  navigate('/correspondence/inbox');
}

function toggleExpand() {
  setIsExpanded((prev) => !prev);
}


  // carregar do storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setLeftWidth(parsed.left);
      setRightWidth(parsed.right);
    }
  }, []);

  // guardar
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ left: leftWidth, right: rightWidth })
    );
  }, [leftWidth, rightWidth]);

  const resizing = useRef<any>(null);

  function startResize(type: 'left' | 'right', e: any) {
    document.body.style.userSelect = 'none';

    resizing.current = {
      type,
      startX: e.clientX,
      leftWidth,
      rightWidth,
    };

    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResize);
  }

function onResize(e: MouseEvent) {
  if (!resizing.current) return;

  const dx = e.clientX - resizing.current.startX;
  const delta = (dx / window.innerWidth) * 100;

  if (resizing.current.type === 'left') {
    let newLeft = resizing.current.leftWidth + delta;

    newLeft = Math.max(COL_LIMITS.left.min, Math.min(COL_LIMITS.left.max, newLeft));

    const newMiddle = 100 - newLeft - rightWidth;

    if (newMiddle < COL_LIMITS.middle.min) return;

    setLeftWidth(newLeft);
  }

  if (resizing.current.type === 'right') {
    let newRight = resizing.current.rightWidth - delta;

    newRight = Math.max(COL_LIMITS.right.min, Math.min(COL_LIMITS.right.max, newRight));

    const newMiddle = 100 - leftWidth - newRight;

    if (newMiddle < COL_LIMITS.middle.min) return;

    setRightWidth(newRight);
  }
}


function stopResize() {
  resizing.current = null;
  document.body.style.userSelect = '';

  window.removeEventListener('mousemove', onResize);
  window.removeEventListener('mouseup', stopResize);

  // ✅ SNAP MAIS INTELIGENTE
  const snap = (value: number, points: number[]) => {
    for (const p of points) {
      if (Math.abs(value - p) < 3) return p;
    }
    return value;
  };

  setLeftWidth((v) => snap(v, [20, 25, 30, 35]));
  setRightWidth((v) => snap(v, [25, 30, 35, 40, 50]));
}


function handleConfirm(action: 'IMPORT' | 'REJECT' | 'IGNORE') {
  if (!companyId || !selectedEmail) return;

  if (action === 'IMPORT') {
    const selectedIds = Object.entries(selectedAttachments)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);

    importMutation.mutate({
      companyId,
      emailId: selectedEmail.id,
      attachmentIds: selectedIds,
    });

    return;
  }

  // ✅ NOVO: REJECT + IGNORE
  actionMutation.mutate({
    companyId,
    emailId: selectedEmail.id,
    action: action === 'REJECT' ? 'REJECT' : 'IGNORE',
  });

  // ✅ limpar seleção local
  setSelectedEmail(null);
  setPreviewAttachment(null);
}

  useEffect(() => {
    if (emails.length > 0 && !selectedEmail) {
      setSelectedEmail(emails[0]);
    }
  }, [emails, selectedEmail]);

  useEffect(() => {
    if (!selectedEmail?.attachments) {
      setSelectedAttachments({});
      return;
    }

    const initial: Record<string, boolean> = {};

    selectedEmail.attachments.forEach((a: any) => {
      initial[a.id] = !isProbablySignature(a);
    });

    setSelectedAttachments(initial);
  }, [selectedEmail]);

  function handlePreview(att: any) {
    setPreviewAttachment(att);
    setPreviewLoading(true);
  }

  const previewUrl =
    previewAttachment && selectedEmail
      ? `/api/correspondence/email/${selectedEmail.id}/attachment/${previewAttachment.id}?companyId=${companyId}`
      : null;

  const showPreview =
    previewAttachment && selectedEmail?.attachments?.length > 0;


const effectiveLeft = isExpanded ? 0 : leftWidth;
const effectiveRight = isExpanded ? 100 : rightWidth;

const showLeft = !isExpanded;
const showMiddle = !isExpanded;

const middleWidth = showPreview
  ? 100 - effectiveLeft - effectiveRight
  : 100 - effectiveLeft;


  return (
    <ListPageTemplate
      header={{
        icon: Inbox,
        title: 'Importar Emails',
        subtitle: (
          <>
            Existem{' '}
            <span className="text-red-600 font-semibold">
              {emails.length}
            </span>{' '}
            emails por tratar
          </>
        ),
        
        actions: [
            <Button variant="secondary" onClick={goToInbox}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Inbox
            </Button>,
        ],

      }}
      table={{
        columns: [],
        data: [],
        rowKey: () => '',
        emptyState: (
          <div className="w-full">

            {!isLoading && emails.length > 0 && (
              <div className="flex h-[650px] border rounded overflow-hidden">

                {/* COLUNA 1 */}
                {showLeft && (
  <div style={{ width: `${effectiveLeft}%` }} className="border-r overflow-y-auto">

                  {emails.map((email: any) => (
                    <button
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(email);
                        setPreviewAttachment(null);
                      }}
                      className={`w-full text-left p-3 border-b ${
                        selectedEmail?.id === email.id
                          ? 'bg-blue-100'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span className="truncate">{email.from}</span>
                        <span>{new Date(email.receivedAt).toLocaleString()}</span>
                      </div>

                      <div className="font-semibold text-blue-700 truncate">
                        {email.subject || '(Sem assunto)'}
                      </div>

                      <div className="text-sm text-gray-600 truncate">
                        {email.bodyPreview}
                      </div>
                    </button>
                  ))}
                </div>
  )}
                {/* RESIZER */}

{showLeft && (
  <div
    className="w-1 cursor-col-resize bg-gray-200"
    onMouseDown={(e) => startResize('left', e)}
  />
)}


                {/* COLUNA 2 */}
                {showMiddle && (
  <div style={{ width: `${middleWidth}%` }} className="p-4 overflow-y-auto">


                  {selectedEmail && (
                    <div className="space-y-4">

                      {/* ✅ TITULO + DATA */}
                      <div className="flex justify-between items-start">
                        <h2 className="text-lg font-semibold">
                          {selectedEmail.subject || '(Sem assunto)'}
                        </h2>

                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(selectedEmail.receivedAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600">
                        {selectedEmail.from}
                      </p>

                      <div className="border p-3 rounded text-sm whitespace-pre-wrap">
                        {selectedEmail.bodyPreview}
                      </div>

                      {/* ANEXOS */}
                      <div>
                        <p className="font-medium mb-2">Anexos</p>

                        <div className="space-y-2">
                          {selectedEmail.attachments?.map((att: any) => {
                            const isPreviewing =
                              previewAttachment?.id === att.id;

                            return (
                              <div
                                key={att.id}
                                onClick={() => handlePreview(att)}
                                className={`border rounded p-2 cursor-pointer ${
                                  isPreviewing
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">

                                  <input
                                    type="checkbox"
                                    checked={selectedAttachments[att.id] ?? false}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      setSelectedAttachments((prev) => ({
                                        ...prev,
                                        [att.id]: e.target.checked,
                                      }))
                                    }
                                  />

                                  {/* ✅ ALINHAMENTO CORRETO */}
                                  <div className="flex justify-between w-full">

                                    <span className="text-sm truncate pr-4">
                                      {att.filename}
                                    </span>

                                    <div className="flex gap-6 text-xs text-gray-500 whitespace-nowrap">
                                      <span>{(att.size / 1000).toFixed(1)} KB</span>
                                      <span className="uppercase">
                                        {att.mimeType.split('/')[1]}
                                      </span>
                                    </div>

                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={() => setIsDrawerOpen(true)}>
                          Avaliar
                        </Button>
                      </div>

                    </div>
                  )}
                </div>
                )}
{showPreview && showMiddle && (
  <div
    className="w-1 cursor-col-resize bg-gray-200"
    onMouseDown={(e) => startResize('right', e)}
  />
)}

                {showPreview && (
                  <div style={{ width: `${effectiveRight}%` }} className="border-l p-2 flex flex-col">


<div className="flex justify-between items-center mb-2">

  <span className="text-sm font-semibold truncate">
    {previewAttachment.filename}
  </span>

  <button
    onClick={() => toggleExpand()}
    className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
  >
    ⛶
  </button>

</div>


                    <div className="flex-1 flex items-center justify-center overflow-auto">

                      {previewLoading && (
                        <p className="text-sm text-gray-400">
                          A carregar...
                        </p>
                      )}

                      {previewAttachment.mimeType?.startsWith('image/') && (
                        <img
                          src={previewUrl!}
                          onLoad={() => setPreviewLoading(false)}
                          className="max-w-full max-h-full"
                        />
                      )}

                      {previewAttachment.mimeType === 'application/pdf' && (
                        <iframe
                          src={previewUrl!}
                          onLoad={() => setPreviewLoading(false)}
                          className="w-full h-full"
                        />
                      )}

                    </div>

                  </div>
                )}

              </div>
            )}

            <EmailEvaluationDrawer
              isOpen={isDrawerOpen}
              email={selectedEmail}
              selectedAttachments={selectedAttachments}
              onChangeAttachments={(attId, checked) =>
                setSelectedAttachments((prev) => ({
                  ...prev,
                  [attId]: checked,
                }))
              }
              onClose={() => setIsDrawerOpen(false)}
              onConfirm={handleConfirm}
            />

          </div>
        ),
      }}
    />
  );
};

export default ImportEmailPage;