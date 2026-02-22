// src/pages/PublicCompanyPage.tsx
import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchPublicHomepage } from "../services/api";
import { Helmet } from "react-helmet-async";
import { ImageSlideshow } from "../components/ui/ImageSlideshow";
import { useSubdomain } from "../context/SubdomainContext";
import ShareButtons from "../components/ui/ShareButtons";

// Tipos locais (compatíveis com editor)
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
  seo?: { title?: string; description?: string; shareImage?: ImageRef | null };
  logo?: ImageRef | null;
  hero?: { title?: string; subtitle?: string; backgroundImage?: ImageRef | null; overlay?: boolean };
  about?: { title?: string; html?: string };
  slideshow?: ImageRef[];
  eventsSection?: { enabled: boolean; title?: string; items: PublicEventItem[] };
  layout?: {
    maxWidth?: number; showHeader?: boolean; showFooter?: boolean;
    logoMaxHeight?: number; heroHeight?: number; cardRadius?: number; cardShadow?: 'none'|'sm'|'md'|'lg'; sectionSpacing?: number;
  };
  theme?: {
    primaryColor?: string; secondaryColor?: string; textColor?: string; backgroundColor?: string;
    backgroundImage?: ImageRef | null; backgroundMode?: 'cover'|'contain'|'repeat'|'no-repeat'|'pattern';
    backgroundOpacity?: number; // 0..1 → overlay colorido baseado na primaryColor
    gradient?: { from?: string; to?: string; direction?: 'to-r'|'to-l'|'to-t'|'to-b'|'to-tr'|'to-tl'|'to-br'|'to-bl' };
    fontScale?: number;
  };
  social?: { hashtags?: string[]; twitterHandle?: string; shareCtaText?: string };
}

const shadowClass = (s?: 'none' | 'sm' | 'md' | 'lg') =>
  s === 'none' ? 'shadow-none' : s === 'sm' ? 'shadow' : s === 'md' ? 'shadow-md' : 'shadow-lg';

const gradientClass = (dir?: string) => {
  switch (dir) {
    case 'to-r': return 'bg-gradient-to-r';
    case 'to-l': return 'bg-gradient-to-l';
    case 'to-t': return 'bg-gradient-to-t';
    case 'to-b': return 'bg-gradient-to-b';
    case 'to-tr': return 'bg-gradient-to-tr';
    case 'to-tl': return 'bg-gradient-to-tl';
    case 'to-br': return 'bg-gradient-to-br';
    case 'to-bl': return 'bg-gradient-to-bl';
    default: return '';
  }
};

const PublicCompanyPage: React.FC = () => {
  // HOOKS no topo (ESLint: rules-of-hooks)
  const params = useParams<{ slug: string }>();
  const { companySlug: slugFromSubdomain } = useSubdomain();
  const slug = slugFromSubdomain || params.slug;

  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

  const { data, isLoading, error } = useQuery({
    queryKey: ["publicHomepage", slug],
    queryFn: () => fetchPublicHomepage(slug!),
    enabled: !!slug,
  });

  // Unwrap seguro: aceita { homepageConfig } OU o JSON direto
  const homepageConfig = React.useMemo(() => {
    if (!data) return null;
    if (typeof data === 'object' && 'homepageConfig' in (data as any)) {
      return (data as any).homepageConfig ?? null;
    }
    return data as any; // já é o JSON
  }, [data]);

  const publicUrl = React.useMemo(() => {
    if (!slug) return '';
    const proto = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${proto}//${slug}.${process.env.REACT_APP_MAIN_DOMAIN}${port}/`;
  }, [slug]);

  // Guards
  if (!slug) {
    return <div className="p-8 text-center text-red-500">Não foi possível determinar a empresa (slug ausente).</div>;
  }
  if (isLoading) return <div className="p-8 text-center">A carregar…</div>;
  if (error) return <div className="p-8 text-center text-red-500">Ocorreu um erro ao carregar esta página pública.</div>;
  if (!homepageConfig) return <div className="p-8 text-center text-gray-700">Esta empresa ainda não tem página pública configurada.</div>;

  // Derivados
  const cfg = homepageConfig as HomepageConfigV2;

  const seo = cfg.seo || {};
  const hero = cfg.hero || null;
  const logo = cfg.logo || null;
  const about = cfg.about || null;
  const slideshow = cfg.slideshow || [];
  const eventsSection = cfg.eventsSection || null;

  // defaults v2 (compatível com JSON v1)
  const layout = {
    maxWidth: 1200,
    logoMaxHeight: 96,
    heroHeight: 360,
    cardRadius: 12,
    cardShadow: 'md' as const,
    sectionSpacing: 48,
    ...(cfg.layout || {}),
  };
  const theme = {
    primaryColor: '#2563eb',
    secondaryColor: '#10b981',
    textColor: '#111827',
    backgroundColor: '#ffffff',
    fontScale: 1,
    ...(cfg.theme || {}),
  };

  const { maxWidth, logoMaxHeight: logoMaxH, heroHeight: baseHeroH, sectionSpacing: sectionGap, cardRadius: radius, cardShadow } = layout;

  // Responsividade: clamp() para alturas/spacing
  const heroHeightResponsive = `clamp(220px, ${Math.max(280, baseHeroH - 80)}px + 3vw, ${Math.max(420, baseHeroH + 160)}px)`;
  const sectionGapResponsive = `clamp(24px, ${Math.max(32, sectionGap - 8)}px + 1.2vw, ${Math.max(56, sectionGap + 16)}px)`;
  const logoMaxHResponsive = `clamp(56px, 8vh, ${logoMaxH}px)`;

  // CSS vars (tema, tipografia, tamanhos fluidos)
  const styleVars = {
    ['--hp-primary' as any]: theme.primaryColor ?? '#2563eb',
    ['--hp-secondary' as any]: theme.secondaryColor ?? '#10b981',
    ['--hp-text' as any]: theme.textColor ?? '#111827',
    ['--hp-bg' as any]: theme.backgroundColor ?? '#ffffff',

    // Responsivo
    ['--hp-logo-h' as any]: logoMaxHResponsive,
    ['--hp-hero-h' as any]: heroHeightResponsive,
    ['--hp-section-gap' as any]: sectionGapResponsive,
    ['--hp-radius' as any]: `${radius}px`,

    // escalonador de fonte global (aplicado nos clamps abaixo)
    ['--hp-font-scale' as any]: String(theme.fontScale ?? 1),
  } as React.CSSProperties;

  const gradientCls = theme.gradient?.from && theme.gradient?.to
    ? `${gradientClass(theme.gradient.direction)} from-[${theme.gradient.from}] to-[${theme.gradient.to}]`
    : '';

  // Render
  return (
    <>
      <Helmet>
        <title>{seo.title || slug}</title>
        <meta name="description" content={seo.description || ""} />

        {/* OpenGraph */}
        {seo.shareImage?.url && (
          <>
            <meta property="og:title" content={seo.title || ""} />
            <meta property="og:description" content={seo.description || ""} />
            <meta property="og:image" content={seo.shareImage.url} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={publicUrl} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
          </>
        )}

        {/* Twitter */}
        {seo.shareImage?.url && (
          <>
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seo.title || ""} />
            <meta name="twitter:description" content={seo.description || ""} />
            <meta name="twitter:image" content={seo.shareImage.url} />
          </>
        )}
      </Helmet>

      <div className="min-h-screen flex flex-col" style={styleVars}>
        {/* Accent bar (uniformização) */}
        <div className="w-full border-t-2 border-t-brand-500" />

        {/* Fundo com cor/gradiente */}
        <div className={`min-h-screen ${gradientCls}`} style={{ backgroundColor: theme.backgroundColor ?? '#ffffff' }}>

          {/* HERO (Opção D) */}
          <section className="relative w-full overflow-hidden" style={{ height: 'var(--hp-hero-h)' }}>
            {/* Caso 1: hero com IMAGEM */}
            {hero?.backgroundImage?.url ? (
              <>
                <img
                  src={hero.backgroundImage.url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Overlay colorido baseado em theme.primaryColor + backgroundOpacity */}
                {typeof theme.backgroundOpacity === 'number' && theme.backgroundOpacity > 0 && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: theme.primaryColor,
                      opacity: theme.backgroundOpacity,
                      mixBlendMode: 'multiply',
                    }}
                  />
                )}

                {/* Overlay escuro (se ativo e sem overlay colorido) */}
                {hero.overlay && !(typeof theme.backgroundOpacity === 'number' && theme.backgroundOpacity > 0) && (
                  <div className="absolute inset-0 bg-black/50" />
                )}
              </>
            ) : (
              // Caso 2: hero SEM imagem → usa gradiente do tema ou backgroundColor
              <>
                {/* Gradiente já aplicado no wrapper; se quiseres um gradiente dedicado ao hero, poderíamos duplicar aqui */}
                {/* (Opcional) usar theme.backgroundImage como fallback se existir */}
                {theme.backgroundImage?.url && (
                  <img
                    src={theme.backgroundImage.url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectFit: theme.backgroundMode === 'contain' ? 'contain' : 'cover' }}
                  />
                )}
                {/* Se quiser overlay leve mesmo sem imagem */}
                {hero?.overlay && <div className="absolute inset-0 bg-black/30" />}
              </>
            )}

            {/* Conteúdo do hero */}
            {(hero?.title || hero?.subtitle) && (
              <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4 sm:px-6">
                <h1
                  className="font-bold text-white drop-shadow-lg"
                  style={{
                    fontSize: `clamp(1.75rem, calc(1.5rem + 1.5vw * var(--hp-font-scale)), 3rem)`,
                    lineHeight: 1.15,
                  }}
                >
                  {hero?.title}
                </h1>

                {hero?.subtitle && (
                  <p
                    className="mt-2 text-white/90"
                    style={{
                      fontSize: `clamp(1rem, calc(0.9rem + 0.6vw * var(--hp-font-scale)), 1.375rem)`,
                      lineHeight: 1.35,
                    }}
                  >
                    {hero.subtitle}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* LOGO (max-height responsivo) */}
          {logo?.url && (
            <div className="w-full flex justify-center" style={{ marginTop: 'calc(var(--hp-section-gap) / 2)' }}>
              <img
                src={logo.url}
                alt="Logótipo"
                style={{ maxHeight: 'var(--hp-logo-h)' }}
                className="w-auto object-contain"
              />
            </div>
          )}

          {/* CONTEÚDO principal com paddings responsivos */}
          <main
            className="mx-auto w-full px-4 sm:px-6 lg:px-8"
            style={{
              maxWidth,
              paddingTop: 'var(--hp-section-gap)',
              paddingBottom: 'var(--hp-section-gap)',
              color: `var(--hp-text)`,
            }}
          >
            {/* Share Buttons */}
            <div className="mb-6">
              <ShareButtons
                url={publicUrl}
                title={seo.title || hero?.title || slug}
                description={seo.description || about?.title || ''}
                hashtags={cfg.social?.hashtags}
                twitterHandle={cfg.social?.twitterHandle}
                ctaText={cfg.social?.shareCtaText || 'Partilhar'}
              />
            </div>

            {/* ABOUT */}
            {about?.html && (
              <section className="mb-10 sm:mb-12">
                <h2
                  className="font-bold mb-4"
                  style={{
                    color: 'var(--hp-primary)',
                    fontSize: `clamp(1.375rem, calc(1.1rem + 1vw * var(--hp-font-scale)), 1.875rem)`,
                    lineHeight: 1.2,
                  }}
                >
                  {about.title || "Sobre Nós"}
                </h2>

                <div
                  className="prose max-w-none prose-p:my-3 prose-img:rounded-md prose-ul:list-disc prose-ul:pl-6"
                  dangerouslySetInnerHTML={{ __html: about.html }}
                />
              </section>
            )}

            {/* SLIDESHOW */}
            {slideshow.length > 0 && (
              <section className="mb-10 sm:mb-12">
                <div className="w-full">
                  <ImageSlideshow
                    images={slideshow.map((img) => ({
                      id: img.fileId,
                      url: img.url,
                      displayName: img.displayName ?? "Imagem",
                    }))}
                  />
                </div>
              </section>
            )}

            {/* EVENTS */}
            {eventsSection?.enabled && (
              <section className="mb-10 sm:mb-12">
                <h2
                  className="font-bold mb-6"
                  style={{
                    color: 'var(--hp-primary)',
                    fontSize: `clamp(1.375rem, calc(1.1rem + 1vw * var(--hp-font-scale)), 1.875rem)`,
                    lineHeight: 1.2,
                  }}
                >
                  {eventsSection.title || "Eventos"}
                </h2>

                {(!eventsSection.items || eventsSection.items.length === 0) ? (
                  <p className="text-gray-600">Nenhum evento disponível.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {eventsSection.items.map((ev) => (
                      <div
                        key={ev.id}
                        className={`rounded-lg bg-white overflow-hidden ${shadowClass(cardShadow)}`}
                        style={{ borderRadius: 'var(--hp-radius)' }}
                      >
                        {ev.image?.url && (
                          <img
                            src={ev.image.url}
                            alt=""
                            className="w-full h-40 sm:h-44 lg:h-48 object-cover"
                            loading="lazy"
                          />
                        )}

                        <div className="p-4 sm:p-5">
                          <h3
                            className="font-semibold"
                            style={{ fontSize: `clamp(1rem, 0.95rem + 0.4vw, 1.25rem)` }}
                          >
                            {ev.name}
                          </h3>

                          <div className="mt-1 text-gray-600 space-y-0.5">
                            {ev.date && (
                              <p className="text-sm">
                                {new Date(ev.date).toLocaleDateString("pt-PT")}
                              </p>
                            )}
                            {ev.location && (
                              <p className="text-sm">{ev.location}</p>
                            )}
                          </div>

                          {ev.description && (
                            <p className="text-gray-700 mt-2 line-clamp-3">
                              {ev.description}
                            </p>
                          )}

                          {ev.url && (
                            <a
                              href={ev.url}
                              className="inline-block mt-3 font-medium hover:underline"
                              style={{ color: 'var(--hp-primary)' }}
                            >
                              Ver detalhes →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </main>

          {/* PREVIEW MARKER */}
          {isPreview && (
            <div className="fixed bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg shadow-lg">
              Preview (visitante)
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PublicCompanyPage;