// ============================================================================
// CommandPalette.tsx — Spotlight estilo Apple (⌘K / Ctrl+K)
// ============================================================================

import {
  useEffect, useMemo, useRef, useState, useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, FolderKanban, Clock, Receipt,
  TrendingDown, BarChart3, Settings, Plus, Play, Wand2, Moon, Sun,
  ArrowRight, CornerDownLeft, Command,
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '@/context/ThemeContext';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface CommandItem {
  id:       string;
  label:    string;
  hint?:    string;
  group:    'Navegar' | 'Crear' | 'Acciones';
  icon:     React.ReactNode;
  keywords: string[];
  run:      () => void;
  shortcut?: string;
}

// ---------------------------------------------------------------------------
// Hook global: estado abierto + atajos
// ---------------------------------------------------------------------------

let externalSetOpen: ((v: boolean) => void) | null = null;

export function openCommandPalette() {
  externalSetOpen?.(true);
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function CommandPalette() {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    externalSetOpen = setOpen;
    return () => { externalSetOpen = null; };
  }, []);

  // Atajo global ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === 'k';
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Foco al abrir, reset al cerrar
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Cerrar
  const close = useCallback(() => setOpen(false), []);
  const go    = useCallback((path: string) => { navigate(path); close(); }, [navigate, close]);

  // Navegación hacia formularios con flag para abrir el modal "nuevo ..."
  const goNew = useCallback((path: string, key: string) => {
    try { sessionStorage.setItem('hp_cmd_action', key); } catch { /* no-op */ }
    navigate(path);
    close();
  }, [navigate, close]);

  // ---------------------------------------------------------------------------
  // Catálogo de comandos
  // ---------------------------------------------------------------------------

  const commands: CommandItem[] = useMemo(() => [
    // Navegar
    { id: 'nav-dashboard', label: 'Dashboard',        group: 'Navegar', icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.8} />, keywords: ['inicio', 'home', 'panel'],         run: () => go('/dashboard') },
    { id: 'nav-projects',  label: 'Proyectos',        group: 'Navegar', icon: <FolderKanban    className="w-4 h-4" strokeWidth={1.8} />, keywords: ['clientes', 'trabajos'],            run: () => go('/proyectos') },
    { id: 'nav-hours',     label: 'Horas',            group: 'Navegar', icon: <Clock           className="w-4 h-4" strokeWidth={1.8} />, keywords: ['tiempo', 'timer', 'fichar'],       run: () => go('/horas') },
    { id: 'nav-fixed',     label: 'Costes fijos',     group: 'Navegar', icon: <Receipt         className="w-4 h-4" strokeWidth={1.8} />, keywords: ['gastos', 'mensuales'],             run: () => go('/costes-fijos') },
    { id: 'nav-var',       label: 'Costes variables', group: 'Navegar', icon: <TrendingDown    className="w-4 h-4" strokeWidth={1.8} />, keywords: ['gastos', 'puntuales'],             run: () => go('/costes-variables') },
    { id: 'nav-reports',   label: 'Informes',         group: 'Navegar', icon: <BarChart3       className="w-4 h-4" strokeWidth={1.8} />, keywords: ['reports', 'análisis', 'charts'],   run: () => go('/informes') },
    { id: 'nav-settings',  label: 'Ajustes',          group: 'Navegar', icon: <Settings        className="w-4 h-4" strokeWidth={1.8} />, keywords: ['configuración', 'perfil'],         run: () => go('/ajustes') },

    // Crear
    { id: 'new-project', label: 'Nuevo proyecto',     group: 'Crear', icon: <Plus    className="w-4 h-4" strokeWidth={2} />, keywords: ['añadir', 'cliente'],                    run: () => goNew('/proyectos',      'new-project') },
    { id: 'new-entry',   label: 'Añadir horas',       group: 'Crear', icon: <Plus    className="w-4 h-4" strokeWidth={2} />, keywords: ['manual', 'fichar'],                    run: () => goNew('/horas',          'new-entry') },
    { id: 'new-fixed',   label: 'Nuevo coste fijo',   group: 'Crear', icon: <Plus    className="w-4 h-4" strokeWidth={2} />, keywords: ['gasto mensual'],                       run: () => goNew('/costes-fijos',   'new-fixed') },
    { id: 'new-var',     label: 'Nuevo coste variable',group: 'Crear', icon: <Plus    className="w-4 h-4" strokeWidth={2} />, keywords: ['gasto puntual'],                      run: () => goNew('/costes-variables','new-var') },

    // Acciones
    { id: 'action-timer',     label: 'Iniciar timer',           group: 'Acciones', icon: <Play className="w-4 h-4" strokeWidth={2} />,  keywords: ['start', 'empezar'],      run: () => go('/horas') },
    { id: 'action-simulator', label: 'Simulador "¿y si...?"',   group: 'Acciones', icon: <Wand2 className="w-4 h-4" strokeWidth={1.8} />, keywords: ['tarifa', 'rentabilidad'], run: () => go('/informes') },
    { id: 'action-theme',     label: isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
      group: 'Acciones',
      icon: isDark ? <Sun className="w-4 h-4" strokeWidth={1.8} /> : <Moon className="w-4 h-4" strokeWidth={1.8} />,
      keywords: ['modo', 'dark', 'light', 'apariencia'],
      run: () => { toggleTheme(); close(); },
    },
  ], [go, goNew, toggleTheme, isDark, close]);

  // Filtrado fuzzy simple
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      const hay = `${c.label} ${c.keywords.join(' ')} ${c.group}`.toLowerCase();
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }, [query, commands]);

  // Agrupar
  const grouped = useMemo(() => {
    const map: Record<string, CommandItem[]> = {};
    filtered.forEach((c) => {
      (map[c.group] ??= []).push(c);
    });
    return map;
  }, [filtered]);

  // Lista plana para navegación por teclado
  const flat = useMemo(() => filtered.map((c) => c), [filtered]);

  // Reset active when filtered changes
  useEffect(() => { setActive(0); }, [query]);

  // Scroll activo a la vista
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  // Teclado en el input
  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flat[active]?.run();
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[14vh]"
      style={{
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fadeIn 140ms ease-out both',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full max-w-[560px] rounded-[18px] overflow-hidden border"
        style={{
          background:   'var(--color-surface)',
          borderColor:  'var(--color-border)',
          boxShadow:    'var(--shadow-floating, 0 20px 60px rgba(0,0,0,0.25))',
          animation:    'popIn 180ms cubic-bezier(0.19,1,0.22,1) both',
        }}
      >
        {/* Buscador */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[var(--color-border)]">
          <Search className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" strokeWidth={1.9} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar o navegar..."
            className="flex-1 bg-transparent outline-none text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)]"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-[var(--color-text-tertiary)] px-1.5 py-0.5 rounded-[5px] border"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Resultados */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {flat.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-[var(--color-text-secondary)]">Sin resultados para "{query}"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="py-1">
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                  {group}
                </p>
                {items.map((item) => {
                  const idx = flat.indexOf(item);
                  const isActive = idx === active;
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      onMouseMove={() => setActive(idx)}
                      onClick={() => item.run()}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                        'transition-colors duration-100',
                        isActive
                          ? 'bg-[var(--color-blue-subtle)]'
                          : 'hover:bg-[var(--color-surface-alt)]',
                      )}
                    >
                      <span
                        className={clsx(
                          'w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0',
                          isActive ? 'text-[var(--color-blue)]' : 'text-[var(--color-text-secondary)]',
                        )}
                        style={{
                          background: isActive
                            ? 'rgba(10,132,255,0.10)'
                            : 'var(--color-surface-alt)',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={clsx(
                          'block text-[13.5px] truncate',
                          isActive ? 'font-semibold text-[var(--color-text)]' : 'font-medium text-[var(--color-text)]',
                        )}>
                          {item.label}
                        </span>
                        {item.hint && (
                          <span className="block text-[11px] text-[var(--color-text-tertiary)] truncate">{item.hint}</span>
                        )}
                      </span>
                      {isActive && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-[var(--color-blue)] shrink-0" strokeWidth={2} />
                      )}
                      {!isActive && (
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] shrink-0 opacity-0 group-hover:opacity-100" strokeWidth={1.8} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer de atajos */}
        <div className="flex items-center justify-between px-4 h-10 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]">
          <div className="flex items-center gap-3">
            <FooterKey label="↑↓" hint="navegar" />
            <FooterKey label="↵"   hint="abrir" />
          </div>
          <div className="flex items-center gap-1 text-[10.5px] text-[var(--color-text-tertiary)]">
            <Command className="w-3 h-3" strokeWidth={2} /> K
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterKey({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--color-text-tertiary)]">
      <kbd
        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-[4px] border text-[10px] font-semibold"
        style={{
          borderColor: 'var(--color-border)',
          background:  'var(--color-surface)',
          color:       'var(--color-text-secondary)',
        }}
      >
        {label}
      </kbd>
      {hint}
    </span>
  );
}
