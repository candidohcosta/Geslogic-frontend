// src/pages/CompanyHomepageEditPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchCompanyDetails, updateCompany, fetchFilesByOwnerPurpose } from "../services/api";

import {
  UtilityPageTemplate,
  UtilitySection,
} from "../components/templates/UtilityPageTemplate";

import { Button } from "../components/ui/Button";
import { Label } from "../components/ui/Label";
import { Input } from "../components/ui/Input";
import RichTextEditor from "../components/ui/RichTextEditor";

import SingleFileUpload from "../components/ui/SingleFileUpload";
import MultiFileUploadManagerV2 from "../components/ui/MultiFileUploadManagerV2";

import { FilePurpose } from "../types/file";
import { useAuth } from "../context/AuthContext";
import { Earth } from "lucide-react";

// Tipos locais v2
interface ImageRef {
  fileId: string;
  url: string;
  displayName?: string;
  alt?: string;
}
interface PublicEventItem {
  id: string;
  name: string;
  date?: string;
  location?: string;
  description?: string;
  image?: ImageRef | null;
  url?: string;
}
interface HomepageConfigV2 {
  version?: number;
  seo?: { title?: string; description?: string; shareImage?: ImageRef | null; };
  logo?: ImageRef | null;
  hero?: { title?: string; subtitle?: string; backgroundImage?: ImageRef | null; overlay?: boolean; };
  about?: { title?: string; html?: string; };
  slideshow?: ImageRef[];
  eventsSection?: { enabled: boolean; title?: string; items: PublicEventItem[]; };
  layout?: {
    maxWidth?: number; showHeader?: boolean; showFooter?: boolean;
    logoMaxHeight?: number; heroHeight?: number; cardRadius?: number; cardShadow?: 'none'|'sm'|'md'|'lg'; sectionSpacing?: number;
  };
  theme?: {
    primaryColor?: string; secondaryColor?: string; textColor?: string; backgroundColor?: string;
    backgroundImage?: ImageRef | null; backgroundMode?: 'cover'|'contain'|'repeat'|'no-repeat'|'pattern';
    backgroundOpacity?: number;
    gradient?: { from?: string; to?: string; direction?: 'to-r'|'to-l'|'to-t'|'to-b'|'to-tr'|'to-tl'|'to-br'|'to-bl' };
    fontScale?: number;
  };
  social?: { hashtags?: string[]; twitterHandle?: string; shareCtaText?: string; };
}

// Helpers
const parseNumber = (v: string, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const CompanyHomepageEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar detalhes da empresa
  const { data: companyDetails, isLoading, error } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => fetchCompanyDetails(companyId!),
    enabled: !!companyId,
  });

  // Estado do JSON (v2 com defaults)
  const [config, setConfig] = useState<HomepageConfigV2 | null>(null);

  useEffect(() => {
    if (companyDetails?.homepageConfig) {
      const c = companyDetails.homepageConfig as HomepageConfigV2;
      // migrar defaults em memória (v2)
      setConfig({
        version: 2,
        ...c,
        layout: {
          maxWidth: 1200,
          showHeader: true,
          showFooter: true,
          logoMaxHeight: 96,
          heroHeight: 360,
          cardRadius: 12,
          cardShadow: 'md',
          sectionSpacing: 48,
          ...(c.layout || {}),
        },
        theme: {
          primaryColor: '#2563eb',
          secondaryColor: '#10b981',
          textColor: '#111827',
          backgroundColor: '#ffffff',
          fontScale: 1,
          ...(c.theme || {}),
        },
      });
    } else {
      setConfig({
        version: 2,
        seo: {},
        logo: null,
        hero: {},
        about: { title: "Sobre Nós", html: "" },
        slideshow: [],
        eventsSection: { enabled: false, title: "Eventos", items: [] },
        layout: {
          maxWidth: 1200, showHeader: true, showFooter: true,
          logoMaxHeight: 96, heroHeight: 360, cardRadius: 12, cardShadow: 'md', sectionSpacing: 48
        },
        theme: {
          primaryColor: '#2563eb', secondaryColor: '#10b981',
          textColor: '#111827', backgroundColor: '#ffffff', fontScale: 1
        },
      });
    }
  }, [companyDetails]);

  // Ficheiros de slideshow (da BD)
  const { data: slideshowFiles = [] } = useQuery({
    queryKey: ['files', 'Company', companyId, FilePurpose.HOMEPAGE_SLIDESHOW],
    queryFn: () => fetchFilesByOwnerPurpose('Company', companyId!, FilePurpose.HOMEPAGE_SLIDESHOW),
    enabled: !!companyId,
  });

  // URL do preview público
  const previewUrl = useMemo(() => {
    if (!companyDetails?.slug) return null;
    return `${window.location.protocol}//${companyDetails.slug}.${process.env.REACT_APP_MAIN_DOMAIN}:${window.location.port}/?asPublic=1&preview=1`;
  }, [companyDetails]);

  // Mutação de gravação
  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
  });

  const saveChanges = () => {
    if (!config) return;

    // 1) sincronizar slideshow no JSON (verdade para a página pública)
    const mappedSlides = (slideshowFiles || []).map((f: any) => ({
      fileId: f.id,
      url: f.url,
      displayName: f.displayName,
    }));

    const payload: HomepageConfigV2 = {
      ...config,
      version: 2,
      slideshow: mappedSlides,
    };

    mutation.mutate({
      companyId: companyId!,
      companyData: { homepageConfig: payload },
    });
  };

  // Update nested path helper
  const updateField = (path: string, value: any) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const clone: any = structuredClone(prev);
      const parts = path.split(".");
      let node = clone;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (!node[k]) node[k] = {};
        node = node[k];
      }
      node[parts[parts.length - 1]] = value;
      return clone;
    });
  };

  // Validações brandas (avisos de imagem)
  const [logoHint, setLogoHint] = useState<string | null>(null);
  const [heroHint, setHeroHint] = useState<string | null>(null);

  const onImageSelectValidate = (file: File | null, target: 'logo'|'hero') => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const w = img.width; const h = img.height;
      if (target === 'logo') {
        if (h > 512) setLogoHint(`Sugestão: o logótipo tem ${h}px de altura. Recomendamos ≤ 512px e altura final ≤ ${config?.layout?.logoMaxHeight ?? 96}px na página pública.`);
        else setLogoHint(null);
      } else if (target === 'hero') {
        const ratio = w / h;
        const delta = Math.abs(ratio - (16/9));
        if (delta > 0.2) setHeroHint(`Sugestão: proporção atual ≈ ${(ratio).toFixed(2)}. Recomendado 16:9 (ex.: 1920×1080).`);
        else setHeroHint(null);
      }
    };
    img.src = URL.createObjectURL(file);
  };

  if (!user) return <div>Acesso negado</div>;
  if (isLoading || !config) return <div>A carregar…</div>;
  if (error) return <div>Erro a carregar empresa.</div>;

  return (
    <UtilityPageTemplate
      header={{
        icon: Earth,
        title: "Homepage Pública",
        subtitle: companyDetails?.name || '',
        actions: (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Voltar</Button>
            <Button onClick={saveChanges} size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "A guardar…" : "Guardar Alterações"}
            </Button>
          </div>
        ),
      }}
      // igual ao teu exemplo DevicesStatusPage
      accent={{ content: false, options: true }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full min-h-0">
        {/* COLUNA ESQUERDA — FORM */}
        <div className="space-y-6 overflow-y-auto pr-2">

          {/* AJUDA GERAL */}
          <UtilitySection withAccent>
            <h2 className="text-lg font-semibold mb-2">Ajuda Rápida</h2>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li><strong>Logo</strong>: PNG/SVG com fundo transparente. Altura final recomendada ≤ <code>{config.layout?.logoMaxHeight}</code> px.</li>
              <li><strong>Hero</strong>: proporção 16:9 (ex.: 1920×800). Use imagens leves (WEBP/JPG). Overlay opcional.</li>
              <li><strong>Slideshow</strong>: proporção 16:9, alvo ~1600×900; até 10 imagens.</li>
              <li><strong>Partilha Social</strong>: imagem 1200×630 em <em>SEO / Social</em> para melhor aparência.</li>
            </ul>
          </UtilitySection>

          {/* SEO / SOCIAL */}
          <UtilitySection withAccent>
            <h2 className="text-xl font-semibold mb-4">SEO / Social</h2>

            <Label>Título</Label>
            <Input
              value={config.seo?.title ?? ""}
              onChange={(e) => updateField("seo.title", e.target.value)}
            />

            <Label className="mt-4">Descrição</Label>
            <Input
              value={config.seo?.description ?? ""}
              onChange={(e) => updateField("seo.description", e.target.value)}
            />

            <Label className="mt-4">Imagem de Partilha (1200×630 recomendado)</Label>
            <SingleFileUpload
              ownerType="Company"
              ownerId={companyId!}
              purpose={FilePurpose.HOMEPAGE_SHARE_IMAGE}
              currentFileUrl={config.seo?.shareImage?.url || null}
              onUploadSuccess={(file) =>
                updateField("seo.shareImage", { fileId: file.id, url: file.url, displayName: file.displayName })
              }
              onFileClear={() => updateField("seo.shareImage", null)}
            />
          </UtilitySection>

          {/* TEMA & BACKGROUND */}
          <UtilitySection withAccent>
            <h2 className="text-xl font-semibold mb-4">Tema & Background</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Cor Primária</Label>
                <Input type="color"
                  value={config.theme?.primaryColor ?? '#2563eb'}
                  onChange={(e) => updateField("theme.primaryColor", e.target.value)} />
              </div>
              <div>
                <Label>Cor Secundária</Label>
                <Input type="color"
                  value={config.theme?.secondaryColor ?? '#10b981'}
                  onChange={(e) => updateField("theme.secondaryColor", e.target.value)} />
              </div>
              <div>
                <Label>Cor do Texto</Label>
                <Input type="color"
                  value={config.theme?.textColor ?? '#111827'}
                  onChange={(e) => updateField("theme.textColor", e.target.value)} />
              </div>
              <div>
                <Label>Cor de Fundo</Label>
                <Input type="color"
                  value={config.theme?.backgroundColor ?? '#ffffff'}
                  onChange={(e) => updateField("theme.backgroundColor", e.target.value)} />
              </div>

              <div>
                <Label>Tamanho do Texto (escala)</Label>
                <Input type="number" step="0.05" min="0.8" max="1.5"
                  value={config.theme?.fontScale ?? 1}
                  onChange={(e) => updateField("theme.fontScale", parseNumber(e.target.value, 1))} />
              </div>
              <div>
                <Label>Overlay do Hero (0–1) — cor primária</Label>
                <Input type="number" step="0.05" min="0" max="1"
                  value={config.theme?.backgroundOpacity ?? 0}
                  onChange={(e) => updateField("theme.backgroundOpacity", parseNumber(e.target.value, 0))} />
                <p className="text-xs text-gray-500 mt-1">
                  Se &gt; 0, aplica um overlay colorido (com a cor primária) por cima da imagem do hero.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Label>Gradiente (opcional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <Label>De</Label>
                  <Input type="color"
                    value={config.theme?.gradient?.from ?? '#111827'}
                    onChange={(e) => updateField("theme.gradient.from", e.target.value)} />
                </div>
                <div>
                  <Label>Para</Label>
                  <Input type="color"
                    value={config.theme?.gradient?.to ?? '#1f2937'}
                    onChange={(e) => updateField("theme.gradient.to", e.target.value)} />
                </div>
                <div>
                  <Label>Direção</Label>
                  <select
                    className="border rounded px-2 py-1 w-full"
                    value={config.theme?.gradient?.direction ?? 'to-b'}
                    onChange={(e) => updateField("theme.gradient.direction", e.target.value)}
                  >
                    <option value="to-r">Direita</option>
                    <option value="to-l">Esquerda</option>
                    <option value="to-t">Cima</option>
                    <option value="to-b">Baixo</option>
                    <option value="to-tr">Topo‑Direita</option>
                    <option value="to-tl">Topo‑Esquerda</option>
                    <option value="to-br">Baixo‑Direita</option>
                    <option value="to-bl">Baixo‑Esquerda</option>
                  </select>
                </div>
              </div>
            </div>
          </UtilitySection>

          {/* LAYOUT */}
          <UtilitySection withAccent>
            <h2 className="text-xl font-semibold mb-4">Layout</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Largura Máxima (px)</Label>
                <Input type="number"
                  value={config.layout?.maxWidth ?? 1200}
                  onChange={(e) => updateField("layout.maxWidth", parseNumber(e.target.value, 1200))} />
              </div>
              <div>
                <Label>Altura do Hero (px)</Label>
                <Input type="number"
                  value={config.layout?.heroHeight ?? 360}
                  onChange={(e) => updateField("layout.heroHeight", parseNumber(e.target.value, 360))} />
              </div>
              <div>
                <Label>Altura Máxima do Logo (px)</Label>
                <Input type="number"
                  value={config.layout?.logoMaxHeight ?? 96}
                  onChange={(e) => updateField("layout.logoMaxHeight", parseNumber(e.target.value, 96))} />
              </div>
              <div>
                <Label>Espaçamento entre Secções (px)</Label>
                <Input type="number"
                  value={config.layout?.sectionSpacing ?? 48}
                  onChange={(e) => updateField("layout.sectionSpacing", parseNumber(e.target.value, 48))} />
              </div>
              <div>
                <Label>Raio dos Cartões (px)</Label>
                <Input type="number"
                  value={config.layout?.cardRadius ?? 12}
                  onChange={(e) => updateField("layout.cardRadius", parseNumber(e.target.value, 12))} />
              </div>
              <div>
                <Label>Sombra dos Cartões</Label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={config.layout?.cardShadow ?? 'md'}
                  onChange={(e) => updateField("layout.cardShadow", e.target.value)}
                >
                  <option value="none">Sem sombra</option>
                  <option value="sm">Pequena</option>
                  <option value="md">Média</option>
                  <option value="lg">Grande</option>
                </select>
              </div>
            </div>
          </UtilitySection>

          {/* LOGO */}
          <UtilitySection withAccent>
            <h2 className="text-xl font-semibold mb-1">Logótipo da Homepage</h2>
            <p className="text-xs text-gray-500 mb-4">Recomendado: PNG/SVG com fundo transparente; altura final ≤ {config.layout?.logoMaxHeight}px.</p>

            {logoHint && <p className="text-xs text-amber-600 mb-2">{logoHint}</p>}

            <SingleFileUpload
              ownerType="Company"
              ownerId={companyId!}
              purpose={FilePurpose.HOMEPAGE_LOGO}
              currentFileUrl={config.logo?.url || null}
              onFileSelect={(f) => onImageSelectValidate(f, 'logo')}
              onUploadSuccess={(file) =>
                updateField("logo", { fileId: file.id, url: file.url, displayName: file.displayName })
              }
              onFileClear={() => updateField("logo", null)}
            />
          </UtilitySection>

          {/* HERO */}
          <UtilitySection withAccent>
            <h2 className="text-xl font-semibold mb-1">Hero</h2>
            <p className="text-xs text-gray-500 mb-4">Recomendado: 16:9 (ex.: 1920×800). A altura visível é controlada em <em>Layout &gt; Altura do Hero</em>. Pode usar overlay escuro ou overlay colorido (em Tema &gt; Overlay do Hero).</p>

            <Label>Título</Label>
            <Input
              value={config.hero?.title ?? ""}
              onChange={(e) => updateField("hero.title", e.target.value)}
            />

            <Label className="mt-4">Subtítulo</Label>
            <Input
              value={config.hero?.subtitle ?? ""}
              onChange={(e) => updateField("hero.subtitle", e.target.value)}
            />

            {heroHint && <p className="text-xs text-amber-600 mt-2">{heroHint}</p>}

            <Label className="mt-4">Imagem de Fundo</Label>
            <SingleFileUpload
              ownerType="Company"
              ownerId={companyId!}
              purpose={FilePurpose.HOMEPAGE_HERO_IMAGE}
              currentFileUrl={config.hero?.backgroundImage?.url || null}
              onFileSelect={(f) => onImageSelectValidate(f, 'hero')}
              onUploadSuccess={(file) =>
                updateField("hero.backgroundImage", { fileId: file.id, url: file.url })
              }
              onFileClear={() => updateField("hero.backgroundImage", null)}
            />

            <div className="mt-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!config.hero?.overlay}
                  onChange={(e) => updateField("hero.overlay", e.target.checked)}
                />
                Overlay escuro (preto 50%) se o overlay colorido não estiver ativo.
              </label>
            </div>
          </UtilitySection>

          {/* SOBRE NÓS */}
          <UtilitySection withAccent>
            <h2 className="text-xl font-semibold mb-4">Sobre Nós</h2>

            <Label>Título</Label>
            <Input
              value={config.about?.title ?? ""}
              onChange={(e) => updateField("about.title", e.target.value)}
            />

            <Label className="mt-4">Texto</Label>
            <RichTextEditor
              value={config.about?.html ?? ""}
              onChange={(html) => updateField("about.html", html)}
            />
          </UtilitySection>

          {/* SLIDESHOW */}
          <UtilitySection withAccent>
            <h2 className="text-xl font-semibold mb-1">Slideshow</h2>
            <p className="text-xs text-gray-500 mb-4">Recomendado: 16:9 · alvo 1600×900 · formatos WEBP/JPG.</p>

            <MultiFileUploadManagerV2
              ownerType="Company"
              ownerId={companyId!}
              purpose={FilePurpose.HOMEPAGE_SLIDESHOW}
              existingFiles={slideshowFiles.map((f: any) => ({
                id: f.id,
                url: f.url,
                displayName: f.displayName ?? 'Imagem',
              }))}
              queryKeyToInvalidate={['files', 'Company', companyId, FilePurpose.HOMEPAGE_SLIDESHOW]}
              maxFiles={10}
              thumbnailSize={120}
            />
          </UtilitySection>

          {/* SOCIAL */}
          <UtilitySection withAccent>
            <h2 className="text-xl font-semibold mb-4">Social</h2>
            <Label>Hashtags (separar por vírgulas)</Label>
            <Input
              value={(config.social?.hashtags || []).join(',')}
              onChange={(e) => updateField("social.hashtags", e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
            <Label className="mt-4">Twitter (X) handle (sem @)</Label>
            <Input
              value={config.social?.twitterHandle ?? ''}
              onChange={(e) => updateField("social.twitterHandle", e.target.value)}
            />
            <Label className="mt-4">Texto do Botão de Partilha</Label>
            <Input
              value={config.social?.shareCtaText ?? 'Partilhar'}
              onChange={(e) => updateField("social.shareCtaText", e.target.value)}
            />
          </UtilitySection>

          {/* GUARDAR */}
          <UtilitySection withAccent>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Voltar
            </Button>            
            <Button onClick={saveChanges} size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "A guardar…" : "Guardar Alterações"}
            </Button>
          </UtilitySection>
        </div>

        {/* COLUNA DIREITA — PREVIEW */}
        <div className="border rounded-xl shadow-sm overflow-hidden bg-white flex flex-col border-t-2 border-t-brand-500">
          {/* Accent bar (uniformização no preview) */}
{/*           <div className="w-full border-t-2" /> */}
          <div className="px-4 py-2 border-b font-semibold text-gray-700">
            Pré‑visualização
          </div>

          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="Preview público"
              className="w-full flex-1 border-0"
              style={{ height: "calc(100vh - 180px)" }}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              Sem preview disponível.
            </div>
          )}
        </div>
      </div>
    </UtilityPageTemplate>
  );
};

export default CompanyHomepageEditPage;