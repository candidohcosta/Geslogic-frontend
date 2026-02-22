import React from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ClipboardList,
  Mail,
  BarChart3,
  Users2,
  CheckCircle2,
  QrCode,
  ListChecks,
  Clock8,
  ShieldCheck,
  ServerCog,
  Lock,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { useQuery } from '@tanstack/react-query'
import { fetchPubliclyListedEvents } from '../services/api'
import BrandLogo from '../components/brand/BrandLogo'

/**
 * Pequena maquete visual que dá “produto vivo” ao Hero.
 * Não usa imagens externas, apenas cores e caixas.
 */
const DashboardMock: React.FC = () => {
  return (
    <div className="relative w-full max-w-xl rounded-2xl border bg-white/80 backdrop-blur shadow-soft dark:bg-slate-800/70">
      <div className="flex items-center justify-between border-b px-4 py-2 dark:border-slate-700">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>
        <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="grid grid-cols-5 gap-4 p-4">
        <div className="col-span-5 md:col-span-3">
          <div className="h-48 rounded-lg bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800/40 dark:to-brand-700/30" />
          <div className="mt-3 h-3 w-3/5 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-3 w-2/5 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="col-span-5 md:col-span-2 space-y-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="rounded-lg border p-3 dark:border-slate-700">
              <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-2.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const LandingPage: React.FC = () => {
  const { data: featuredEvents = [], isLoading } = useQuery({
    queryKey: ['featuredEvents'],
    queryFn: fetchPubliclyListedEvents,
  })

  return (
    <div className="min-h-screen flex flex-col bg-white text-ink-700 dark:bg-slate-950 dark:text-slate-200">
      {/* NAVBAR (full width) */}
      <header className="fixed inset-x-0 top-0 z-40 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/60 dark:border-slate-800">
        <div className="w-full px-6 md:px-12 lg:px-20">
          <div className="h-16 flex items-center justify-between">
            <BrandLogo withLink={true} variant="horizontal" />
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a href="#modules" className="hover:text-ink-900 dark:hover:text-white">Módulos</a>
              <a href="#shortcuts" className="hover:text-ink-900 dark:hover:text-white">Atalhos</a>
              <a href="#features" className="hover:text-ink-900 dark:hover:text-white">Funcionalidades</a>
              <a href="#how-it-works" className="hover:text-ink-900 dark:hover:text-white">Como funciona</a>
              <a href="#about" className="hover:text-ink-900 dark:hover:text-white">Sobre</a>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
              <Button asChild><Link to="/register">Criar conta</Link></Button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO (full width; podes trocar bg por imagem em /assets/hero-bg[-texture].png) */}
      <section
        className="relative pt-28 md:pt-32 pb-12 md:pb-20 bg-hero-grid"
        // Se quiseres usar imagem:
        // style={{ backgroundImage: 'url(/assets/hero-bg-texture.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="w-full px-6 md:px-12 lg:px-20">
          <div className="grid gap-10 md:gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-[68ch]">
              <h1 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl dark:text-white">
                A plataforma unificada para <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-700">operações, eventos, agendamentos e atendimento</span>.
              </h1>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                A <strong>GesLogic</strong> é um SaaS modular: ativa apenas os serviços que a sua empresa precisa —
                eventos, filas, agendamentos, comunicação, check‑in e relatórios — tudo integrado.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" asChild><Link to="/register">Experimentar grátis</Link></Button>
                <Button size="lg" variant="outline" asChild><a href="#modules">Ver módulos</a></Button>
              </div>
              <div className="mt-6 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-brand-600" />
                <span>Sem cartão para experimentar</span>
              </div>
            </div>
            <div className="flex justify-center">
              <DashboardMock />
            </div>
          </div>
        </div>
      </section>

      {/* MÓDULOS DA PLATAFORMA */}
      <section id="modules" className="py-16 md:py-20">
        <div className="w-full px-6 md:px-12 lg:px-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-ink-900 dark:text-white">Módulos da plataforma</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-[68ch]">
            Ative apenas o que precisa. Todos os módulos partilham a mesma base: autenticação, permissões, auditoria e exportações.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: CalendarDays, title: 'Eventos & Inscrições', desc: 'Crie eventos, formulários, faça check‑in e acompanhe resultados.' },
              { icon: Clock8,        title: 'Agendamentos',        desc: 'Disponibilize horários, aceitação automática e confirmações.' },
              { icon: ListChecks,    title: 'Filas de Espera',     desc: 'Senhas digitais, ecrãs, impressoras e gestão de atendimento.' },
              { icon: QrCode,        title: 'Check‑in & Operações',desc: 'Validação QR, fluxos simples e dashboards de operação.' },
              { icon: Mail,          title: 'Comunicação',         desc: 'Envio de e‑mails, templates, SMS (opcional) e logs.' },
              { icon: BarChart3,     title: 'Relatórios',          desc: 'Métricas, exportações e integrações por API.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border p-6 hover:shadow-soft transition-colors dark:border-slate-800">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-slate-600 dark:text-slate-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ATALHOS / EVENTOS PRÓXIMOS (carrossel horizontal) */}
      <section id="shortcuts" className="py-14 md:py-20 bg-slate-50 dark:bg-slate-900/40">
        <div className="w-full px-6 md:px-12 lg:px-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-ink-900 dark:text-white">Eventos próximos</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-[68ch]">
                Aceda rapidamente aos eventos públicos em agenda.
              </p>
            </div>
            <div className="hidden md:flex">
              <Button variant="outline" asChild><Link to="/events">Ver todos</Link></Button>
            </div>
          </div>

          {isLoading ? (
            <p className="mt-8 text-slate-600 dark:text-slate-300">A carregar eventos...</p>
          ) : featuredEvents?.length ? (
            <div className="mt-8 overflow-x-auto">
              <div className="grid auto-cols-[minmax(280px,340px)] grid-flow-col gap-6 pr-6">
                {featuredEvents.map((event: any) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="group rounded-xl border overflow-hidden hover:shadow-soft transition-all dark:border-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-label={`Abrir evento ${event.name}`}
                  >
                    <div className="relative">
                      <img
                        src={event.bannerImageUrl || 'https://placehold.co/800x450/e2e8f0/e2e8f0'}
                        alt={event.name}
                        className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-3">
                        <h3 className="text-base font-semibold text-white">{event.name}</h3>
                        <p className="text-xs text-gray-200">{event?.company?.name ?? '—'}</p>
                      </div>
                    </div>
                    <div className="p-3 text-sm text-slate-600 dark:text-slate-300 flex justify-between items-center">
                      <span>
                        {event.startDate
                          ? new Date(event.startDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
                          : 'Data a definir'}
                      </span>
                      <span className="truncate max-w-[50%]">{event?.location ?? 'Local a definir'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-8 text-slate-600 dark:text-slate-300">Sem eventos em destaque de momento.</p>
          )}
        </div>
      </section>

      {/* FUNCIONALIDADES TÉCNICAS / BASE COMUM */}
      <section id="features" className="py-14 md:py-20">
        <div className="w-full px-6 md:px-12 lg:px-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-ink-900 dark:text-white">O que vem de base</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-[68ch]">
            Segurança, fiabilidade e governança: a fundação comum a todos os módulos da GesLogic.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: ShieldCheck, title: 'Permissões & Perfis',  desc: 'Controlo por papéis, equipas e contexto de empresa.' },
              { icon: ServerCog,   title: 'Integrações & API',    desc: 'Exportações e integrações sob pedido com APIs estáveis.' },
              { icon: Lock,        title: 'Auditoria & Logs',     desc: 'Rastreabilidade de ações e comunicação.' },
              { icon: Users2,      title: 'Contas & Equipas',     desc: 'Convites, pertença a empresas e gestão simples.' },
              { icon: ClipboardList,title: 'Formulários',         desc: 'Campos flexíveis, validações e recolha de dados.' },
              { icon: BarChart3,   title: 'Relatórios',           desc: 'Métricas, CSV/PDF e painéis sintéticos.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border p-6 hover:shadow-soft transition-colors dark:border-slate-800">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-slate-600 dark:text-slate-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="how-it-works" className="py-14 md:py-20 bg-slate-50 dark:bg-slate-900/40">
        <div className="w-full px-6 md:px-12 lg:px-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-ink-900 dark:text-white">Como funciona</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { step: '1', title: 'Crie a conta',       desc: 'Defina a sua empresa e convide a sua equipa.' },
              { step: '2', title: 'Ative módulos',      desc: 'Escolha eventos, agendamentos, filas, comunicação…' },
              { step: '3', title: 'Operação diária',    desc: 'Trabalhe com dashboards, relatórios e integrações.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="rounded-xl border p-6 dark:border-slate-800">
                <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold dark:bg-brand-900/30 dark:text-brand-300">
                  {step}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-slate-600 dark:text-slate-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOBRE A LOGICWISE */}
      <section id="about" className="py-14 md:py-20">
        <div className="w-full px-6 md:px-12 lg:px-20">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="max-w-[68ch]">
              <h2 className="text-2xl md:text-3xl font-semibold text-ink-900 dark:text-white">Sobre a Logicwise</h2>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                A <strong>Logicwise</strong> desenvolve soluções digitais fiáveis para gestão operacional.
                A GesLogic nasce de operações reais: simplicidade, previsibilidade e controlo end‑to‑end.
              </p>
              <div className="mt-6 flex gap-3">
                <Button asChild variant="outline"><a href="https://logicwise.pt" target="_blank" rel="noreferrer">Visitar logicwise.pt</a></Button>
                <Button asChild><Link to="/register">Criar conta</Link></Button>
              </div>
            </div>
            <div className="justify-self-center">
              <BrandLogo withLink={true} variant="horizontal" className="opacity-90" />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-8 text-sm dark:border-slate-800">
        <div className="w-full px-6 md:px-12 lg:px-20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} GesLogic • Logicwise
          </div>
          <div className="flex items-center gap-6 text-slate-500 dark:text-slate-400">
            <Link to="/privacy" className="hover:text-ink-900 dark:hover:text-white">Privacidade</Link>
            <Link to="/terms" className="hover:text-ink-900 dark:hover:text-white">Termos</Link>
            <a href="mailto:info@logicwise.pt" className="hover:text-ink-900 dark:hover:text-white">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage