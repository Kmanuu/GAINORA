// ============================================================================
// HelpPage.tsx — Centro de ayuda con artículos navegables
// ============================================================================
// Diseño Apple-style: lista de categorías + buscador + artículo abierto.
// Pensado para que un autónomo no técnico encuentre la respuesta en <30s.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, BookOpen, ChevronRight, Clock, ArrowLeft,
  Lightbulb, AlertTriangle, FileText, Mail, PlayCircle,
} from 'lucide-react';
import clsx from 'clsx';
import Card             from '@/components/ui/Card';
import Input            from '@/components/ui/Input';
import { useOnboarding } from '@/context/OnboardingContext';
import {
  HELP_CATEGORIES, HELP_ARTICLES,
  type HelpArticle, type HelpBlock, type HelpCategory,
} from '@/lib/helpArticles';

// ---------------------------------------------------------------------------
// Render de bloques
// ---------------------------------------------------------------------------

function Block({ block }: { block: HelpBlock }) {
  if (block.type === 'h3') {
    return (
      <h3 className="text-[15px] font-semibold text-[var(--color-text)] mt-5 mb-2 tracking-[-0.01em]">
        {block.content as string}
      </h3>
    );
  }
  if (block.type === 'p') {
    return (
      <p className="text-[14px] leading-[1.65] text-[var(--color-text-secondary)] mb-3">
        {block.content as string}
      </p>
    );
  }
  if (block.type === 'list') {
    return (
      <ul className="space-y-1.5 mb-3 pl-1">
        {(block.content as string[]).map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">
            <span className="w-1 h-1 rounded-full bg-[var(--color-text-tertiary)] mt-[10px] shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === 'note') {
    return (
      <div className="my-3 px-4 py-3 rounded-[12px] bg-[var(--color-blue-subtle)] border border-[rgba(10,132,255,0.16)] flex gap-2.5">
        <Lightbulb className="w-4 h-4 text-[var(--color-blue)] shrink-0 mt-[2px]" strokeWidth={1.9} />
        <p className="text-[13.5px] leading-relaxed text-[var(--color-text)]">
          {block.content as string}
        </p>
      </div>
    );
  }
  if (block.type === 'tip') {
    return (
      <div className="my-3 px-4 py-3 rounded-[12px] bg-[var(--color-green-subtle)] border border-[rgba(48,209,88,0.16)] flex gap-2.5">
        <span className="text-[14px] leading-none mt-[2px]">💡</span>
        <p className="text-[13.5px] leading-relaxed text-[var(--color-text)]">
          {block.content as string}
        </p>
      </div>
    );
  }
  if (block.type === 'warn') {
    return (
      <div className="my-3 px-4 py-3 rounded-[12px] bg-[var(--color-orange-subtle)] border border-[rgba(255,159,10,0.20)] flex gap-2.5">
        <AlertTriangle className="w-4 h-4 text-[var(--color-orange)] shrink-0 mt-[2px]" strokeWidth={1.9} />
        <p className="text-[13.5px] leading-relaxed text-[var(--color-text)]">
          {block.content as string}
        </p>
      </div>
    );
  }
  if (block.type === 'example') {
    return (
      <div className="my-3 px-4 py-3 rounded-[12px] bg-[var(--color-surface-alt)] border border-[var(--color-border-subtle)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-1">
          Ejemplo
        </p>
        <p className="text-[13.5px] leading-relaxed text-[var(--color-text)] font-medium">
          {block.content as string}
        </p>
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function HelpPage() {
  const [params, setParams]      = useSearchParams();
  const navigate                 = useNavigate();
  const { open: openOnboarding } = useOnboarding();
  const [query, setQuery]        = useState('');
  const [activeCat, setActiveCat] = useState<HelpCategory | 'todos'>('todos');

  const articleId = params.get('a');
  const article   = articleId ? HELP_ARTICLES.find((a) => a.id === articleId) : null;

  // Filtrado por categoría + búsqueda
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HELP_ARTICLES.filter((a) => {
      if (activeCat !== 'todos' && a.category !== activeCat) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.blocks.some((b) =>
          typeof b.content === 'string'
            ? b.content.toLowerCase().includes(q)
            : (b.content as string[]).some((x) => x.toLowerCase().includes(q)),
        )
      );
    });
  }, [query, activeCat]);

  // Scroll arriba al cambiar de artículo
  useEffect(() => {
    if (article) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [articleId, article]);

  function openArticle(id: string) {
    setParams({ a: id });
  }

  function backToList() {
    setParams({});
  }

  // ─── VISTA ARTÍCULO ─────────────────────────────────────────────────────
  if (article) {
    const cat = HELP_CATEGORIES.find((c) => c.id === article.category)!;
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[760px] mx-auto">
        <button
          onClick={backToList}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-blue)] mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Volver al centro de ayuda
        </button>

        <Card padding="lg" className="animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
              style={{ background: `${cat.color}18`, color: cat.color }}
            >
              <span className="text-[11px] leading-none">{cat.emoji}</span>
              {cat.label}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-[var(--color-text-tertiary)]">
              <Clock className="w-3 h-3" strokeWidth={1.8} />
              {article.readingTime}
            </span>
          </div>

          <h1 className="text-[26px] sm:text-[30px] font-semibold text-[var(--color-text)] tracking-[-0.02em] leading-tight">
            {article.title}
          </h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] mt-2 mb-6 leading-relaxed">
            {article.summary}
          </p>

          <div className="border-t border-[var(--color-border)] pt-5">
            {article.blocks.map((b, i) => <Block key={i} block={b} />)}
          </div>

          {article.related && article.related.length > 0 && (
            <div className="border-t border-[var(--color-border)] mt-6 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-3">
                Sigue leyendo
              </p>
              <div className="space-y-2">
                {article.related
                  .map((id) => HELP_ARTICLES.find((a) => a.id === id))
                  .filter((a): a is HelpArticle => Boolean(a))
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() => openArticle(a.id)}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-[12px] border border-[var(--color-border)] hover:border-[var(--color-blue)] hover:bg-[var(--color-blue-subtle)] transition-all text-left group"
                    >
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--color-text)]">{a.title}</p>
                        <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5">{a.summary}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-blue)] shrink-0" strokeWidth={2} />
                    </button>
                  ))}
              </div>
            </div>
          )}
        </Card>

        {/* CTAs finales */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card padding="md" hover onClick={() => openOnboarding('main')} className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[var(--color-blue-subtle)] text-[var(--color-blue)] flex items-center justify-center shrink-0">
                <PlayCircle className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[var(--color-text)]">Repetir tutorial inicial</p>
                <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">4 pantallas, menos de 1 minuto</p>
              </div>
            </div>
          </Card>
          <a href="mailto:soporte@gainora.app" className="block">
            <Card padding="md" hover>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[var(--color-purple-subtle)] text-[var(--color-purple)] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-text)]">¿No has encontrado tu respuesta?</p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Escríbenos y respondemos en 24h</p>
                </div>
              </div>
            </Card>
          </a>
        </div>
      </div>
    );
  }

  // ─── VISTA LISTA ─────────────────────────────────────────────────────────
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[960px] mx-auto">
      {/* Hero */}
      <header className="mb-6 animate-fade-up">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-[10px] bg-[var(--color-purple-subtle)] text-[var(--color-purple)] flex items-center justify-center">
            <BookOpen className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-[var(--color-text)] tracking-[-0.02em]">
            Centro de ayuda
          </h1>
        </div>
        <p className="text-[14px] text-[var(--color-text-secondary)] max-w-[600px] leading-relaxed">
          Guías sin tecnicismos para sacarle todo el partido a Gainora. Lee
          solo lo que necesites cuando lo necesites.
        </p>
      </header>

      {/* Buscador */}
      <div className="mb-5 animate-fade-up" style={{ animationDelay: '40ms', animationFillMode: 'both' }}>
        <Input
          label="Buscar en la ayuda"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon={<Search className="w-4 h-4" strokeWidth={1.9} />}
          placeholder="ej. IRPF, suscripción, factura, tarifa…"
        />
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 animate-fade-up" style={{ animationDelay: '80ms', animationFillMode: 'both' }}>
        <CatPill active={activeCat === 'todos'} onClick={() => setActiveCat('todos')}>
          Todos
        </CatPill>
        {HELP_CATEGORIES.map((c) => (
          <CatPill
            key={c.id}
            active={activeCat === c.id}
            onClick={() => setActiveCat(c.id)}
            color={c.color}
          >
            <span className="text-[12px] mr-1">{c.emoji}</span>
            {c.label}
          </CatPill>
        ))}
      </div>

      {/* Lista de artículos */}
      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center py-12">
          <Search className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[15px] font-semibold text-[var(--color-text)]">Nada por aquí</p>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
            Prueba otra palabra o cambia de categoría.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
          {filtered.map((a) => {
            const cat = HELP_CATEGORIES.find((c) => c.id === a.category)!;
            return (
              <button
                key={a.id}
                onClick={() => openArticle(a.id)}
                className="text-left rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-blue)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] transition-all duration-200 group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold flex items-center gap-1"
                    style={{ background: `${cat.color}18`, color: cat.color }}
                  >
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="ml-auto text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={1.8} /> {a.readingTime}
                  </span>
                </div>
                <p className="text-[14.5px] font-semibold text-[var(--color-text)] leading-snug">
                  {a.title}
                </p>
                <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-1 leading-relaxed line-clamp-2">
                  {a.summary}
                </p>
                <div className="mt-3 flex items-center text-[12px] font-semibold text-[var(--color-blue)] group-hover:gap-1.5 gap-1 transition-all">
                  Leer artículo
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer cards */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card padding="md" hover onClick={() => openOnboarding('main')} className="cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--color-blue-subtle)] text-[var(--color-blue)] flex items-center justify-center shrink-0">
              <PlayCircle className="w-4.5 h-4.5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-[var(--color-text)]">Tour interactivo</p>
              <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Repite el tutorial inicial</p>
            </div>
          </div>
        </Card>
        <Card padding="md" hover onClick={() => navigate('/ajustes')} className="cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--color-orange-subtle)] text-[var(--color-orange)] flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-[var(--color-text)]">Configura tus datos fiscales</p>
              <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">NIF, dirección, IBAN para tus PDFs</p>
            </div>
          </div>
        </Card>
        <a href="mailto:soporte@gainora.app" className="block">
          <Card padding="md" hover>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-[var(--color-purple-subtle)] text-[var(--color-purple)] flex items-center justify-center shrink-0">
                <Mail className="w-4.5 h-4.5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-[var(--color-text)]">Contactar con soporte</p>
                <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Respuesta en menos de 24 h</p>
              </div>
            </div>
          </Card>
        </a>
      </div>
    </div>
  );
}

function CatPill({
  active, onClick, color, children,
}: {
  active: boolean; onClick: () => void; color?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap shrink-0',
        'border transition-all duration-150',
        active
          ? 'bg-[var(--color-text)] text-[var(--color-bg)] border-[var(--color-text)]'
          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-medium)]',
      )}
      style={active && color ? { background: color, borderColor: color, color: '#fff' } : undefined}
    >
      {children}
    </button>
  );
}
