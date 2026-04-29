// ============================================================================
// HorasPage.tsx — Registro de horas con timer en tiempo real
// ============================================================================

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Play, Square, Plus, Clock, AlertCircle, RefreshCw,
  Trash2, Download, Pencil, Copy, Filter, X,
} from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { fmt, fmtDuration, fmtTimer, fmtDate, toNum } from '@/lib/format';
import type { TimeEntry, Project } from '@/types';
import Card             from '@/components/ui/Card';
import Badge            from '@/components/ui/Badge';
import Button           from '@/components/ui/Button';
import Modal            from '@/components/ui/Modal';
import Input            from '@/components/ui/Input';
import Select           from '@/components/ui/Select';
import Toggle           from '@/components/ui/Toggle';
import DatePicker       from '@/components/ui/DatePicker';
import TimeInput        from '@/components/ui/TimeInput';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useToast }    from '@/components/ui/Toast';
import { useConfirm }  from '@/components/ui/ConfirmDialog';
import { useCan }      from '@/hooks/useCan';
import ContractIssueFields from '@/components/contracts/ContractIssueFields';

// ---------------------------------------------------------------------------
// Helpers locales de combinación fecha+hora
// ---------------------------------------------------------------------------

function combineDT(date: string, time: string): string {
  if (!date) return '';
  const t = time || '00:00';
  return `${date}T${t}`;
}

function splitISO(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const yy = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return { date: `${yy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

type EntryMode = 'range' | 'duration';

interface ManualForm {
  projectId:   string;
  contractId:  string;
  issueId:     string;
  description: string;
  startDate:   string;
  startTime:   string;
  endDate:     string;
  endTime:     string;
  isBillable:  boolean;
  mode:        EntryMode;
  durationH:   string;
  durationM:   string;
}

const EMPTY_MANUAL: ManualForm = {
  projectId: '', contractId: '', issueId: '', description: '',
  startDate: '', startTime: '',
  endDate: '',   endTime: '',
  isBillable: true,
  mode: 'range',
  durationH: '', durationM: '',
};

export default function HorasPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const canWrite    = useCan('timeentry:write:own');
  const [entries,  setEntries]  = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Filtros
  const [filterProject, setFilterProject] = useState('');
  const [filterFrom,    setFilterFrom]    = useState('');
  const [filterTo,      setFilterTo]      = useState('');
  const [filtersOpen,   setFiltersOpen]   = useState(false);

  // Timer
  const [running, setRunning] = useState(() => !!localStorage.getItem('hp_timer_start'));
  const [elapsed, setElapsed] = useState(() => {
    const saved = localStorage.getItem('hp_timer_start');
    return saved ? Math.floor((Date.now() - new Date(saved).getTime()) / 1000) : 0;
  });
  const [timerProject,  setTimerProject]  = useState(() => localStorage.getItem('hp_timer_project') ?? '');
  const [timerContract, setTimerContract] = useState(() => localStorage.getItem('hp_timer_contract') ?? '');
  const [timerIssue,    setTimerIssue]    = useState(() => localStorage.getItem('hp_timer_issue') ?? '');
  const [timerDesc,     setTimerDesc]     = useState(() => localStorage.getItem('hp_timer_desc') ?? '');
  const [timerBill,     setTimerBill]     = useState(() => localStorage.getItem('hp_timer_bill') !== 'false');
  const [timerStart,    setTimerStart]    = useState<Date | null>(() => {
    const saved = localStorage.getItem('hp_timer_start');
    return saved ? new Date(saved) : null;
  });
  const [savingTimer,  setSavingTimer]  = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<TimeEntry | null>(null);
  const [manualForm,   setManualForm]   = useState<ManualForm>(EMPTY_MANUAL);
  const [savingManual, setSavingManual] = useState(false);
  const [formError,    setFormError]    = useState('');

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      api.get<TimeEntry[]>('/v1/time-entries'),
      api.get<Project[]>('/v1/projects'),
    ])
      .then(([e, p]) => {
        setEntries(e);
        setProjects(p.filter((pr) => pr.status === 'ACTIVE'));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sincronización del timer entre pestañas
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'hp_timer_start') {
        if (e.newValue) {
          setRunning(true);
          const start = new Date(e.newValue);
          setTimerStart(start);
          setElapsed(Math.floor((Date.now() - start.getTime()) / 1000));
        } else {
          setRunning(false);
          setElapsed(0);
          setTimerStart(null);
        }
      }
      if (e.key === 'hp_timer_project')  setTimerProject(e.newValue ?? '');
      if (e.key === 'hp_timer_contract') setTimerContract(e.newValue ?? '');
      if (e.key === 'hp_timer_issue')    setTimerIssue(e.newValue ?? '');
      if (e.key === 'hp_timer_desc')     setTimerDesc(e.newValue ?? '');
      if (e.key === 'hp_timer_bill')     setTimerBill(e.newValue !== 'false');
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Apertura automática desde Command Palette (⌘K → "Añadir horas")
  useEffect(() => {
    if (sessionStorage.getItem('hp_cmd_action') === 'new-entry') {
      sessionStorage.removeItem('hp_cmd_action');
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!running || !timerStart) return;
    const tick = () => setElapsed(Math.floor((Date.now() - timerStart.getTime()) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, timerStart]);

  function startTimer() {
    if (!timerProject) return;
    const now = new Date();
    setRunning(true);
    setElapsed(0);
    setTimerStart(now);
    localStorage.setItem('hp_timer_start',    now.toISOString());
    localStorage.setItem('hp_timer_project',  timerProject);
    localStorage.setItem('hp_timer_contract', timerContract);
    localStorage.setItem('hp_timer_issue',    timerIssue);
    localStorage.setItem('hp_timer_desc',     timerDesc);
    localStorage.setItem('hp_timer_bill',     String(timerBill));
  }

  function clearTimerState() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false); setElapsed(0); setTimerStart(null);
    setTimerProject(''); setTimerContract(''); setTimerIssue('');
    setTimerDesc(''); setTimerBill(true);
    [
      'hp_timer_start','hp_timer_project','hp_timer_contract',
      'hp_timer_issue','hp_timer_desc','hp_timer_bill',
    ].forEach((k) => localStorage.removeItem(k));
  }

  async function stopTimer() {
    if (!timerStart) return;
    const startedAt = timerStart.toISOString();
    const endedAt   = new Date().toISOString();
    const project   = timerProject;
    const contract  = timerContract;
    const issue     = timerIssue;
    const desc      = timerDesc.trim() || null;
    const billable  = timerBill;
    const elapsedSec = Math.max(1, Math.floor((Date.now() - timerStart.getTime()) / 1000));

    if (elapsedSec < 5) {
      const keep = await confirm({
        title:       'Timer demasiado corto',
        message:     `Solo han pasado ${elapsedSec}s. ¿Seguro que quieres guardarlo como entrada?`,
        confirmText: 'Guardar igualmente',
        variant:     'danger',
      });
      if (!keep) {
        clearTimerState();
        toast('info', 'Timer descartado');
        return;
      }
    }

    clearTimerState();
    setSavingTimer(true);
    try {
      await api.post<TimeEntry>('/v1/time-entries', {
        projectId:   project,
        contractId:  contract || null,
        issueId:     issue    || null,
        description: desc,
        startedAt,
        endedAt,
        isBillable:  billable,
      });
      const mins = Math.max(1, Math.round(elapsedSec / 60));
      toast('success', `Entrada guardada · ${mins} min`);
      load(true);
    } catch (e: unknown) {
      toast('error', (e instanceof Error ? e.message : 'Error al guardar') + ' — añade la entrada manualmente');
    } finally {
      setSavingTimer(false);
    }
  }

  function discardTimer() {
    clearTimerState();
    toast('info', 'Timer descartado');
  }

  function openCreate() {
    const { date, time } = splitISO(new Date().toISOString());
    setEditTarget(null);
    setManualForm({ ...EMPTY_MANUAL, startDate: date, startTime: time, endDate: date });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(entry: TimeEntry) {
    const start = splitISO(entry.startedAt);
    const end   = splitISO(entry.endedAt);
    setEditTarget(entry);
    setManualForm({
      projectId:   entry.projectId,
      contractId:  entry.contractId ?? '',
      issueId:     entry.issueId    ?? '',
      description: entry.description ?? '',
      startDate:   start.date, startTime: start.time,
      endDate:     end.date,   endTime:   end.time,
      isBillable:  entry.isBillable,
      mode:        'range',
      durationH:   '',
      durationM:   '',
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSaveManual() {
    const { projectId, contractId, issueId, mode, startDate, startTime, endDate, endTime, durationH, durationM } = manualForm;
    if (!projectId) { setFormError('Selecciona un proyecto'); return; }

    let payload: Record<string, unknown>;

    if (mode === 'duration') {
      const h = parseInt(durationH || '0', 10);
      const m = parseInt(durationM || '0', 10);
      const totalMin = h * 60 + m;
      if (totalMin <= 0) { setFormError('Introduce al menos 1 minuto de duración'); return; }
      const endedAt   = new Date();
      const startedAt = new Date(endedAt.getTime() - totalMin * 60 * 1000);
      payload = {
        projectId,
        contractId:  contractId || null,
        issueId:     issueId    || null,
        description: manualForm.description.trim() || null,
        startedAt:   startedAt.toISOString(),
        endedAt:     endedAt.toISOString(),
        durationMin: totalMin,
        isBillable:  manualForm.isBillable,
      };
    } else {
      if (!startDate || !startTime || !endDate || !endTime) {
        setFormError('Proyecto, inicio y fin son obligatorios'); return;
      }
      const startISO = combineDT(startDate, startTime);
      const endISO   = combineDT(endDate, endTime);
      if (new Date(endISO) <= new Date(startISO)) {
        setFormError('La hora de fin debe ser posterior al inicio'); return;
      }
      payload = {
        projectId,
        contractId:  contractId || null,
        issueId:     issueId    || null,
        description: manualForm.description.trim() || null,
        startedAt:   new Date(startISO).toISOString(),
        endedAt:     new Date(endISO).toISOString(),
        isBillable:  manualForm.isBillable,
      };
    }

    setSavingManual(true); setFormError('');
    try {
      if (editTarget) {
        await api.patch<TimeEntry>(`/v1/time-entries/${editTarget.id}`, payload);
        toast('success', 'Entrada actualizada');
      } else {
        await api.post<TimeEntry>('/v1/time-entries', payload);
        toast('success', 'Entrada añadida');
      }
      setModalOpen(false);
      setManualForm(EMPTY_MANUAL);
      setEditTarget(null);
      load(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSavingManual(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title:       'Eliminar entrada',
      message:     'Esta entrada de tiempo se eliminará permanentemente.',
      confirmText: 'Eliminar',
      variant:     'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/time-entries/${id}`);
      toast('success', 'Entrada eliminada');
      load(true);
    } catch {
      toast('error', 'Error al eliminar la entrada');
    }
  }

  async function handleDuplicate(entry: TimeEntry) {
    try {
      await api.post<TimeEntry>('/v1/time-entries', {
        projectId:   entry.projectId,
        contractId:  entry.contractId ?? null,
        issueId:     entry.issueId    ?? null,
        description: entry.description || null,
        startedAt:   entry.startedAt,
        endedAt:     entry.endedAt,
        isBillable:  entry.isBillable,
      });
      toast('success', 'Entrada duplicada');
      load(true);
    } catch {
      toast('error', 'Error al duplicar la entrada');
    }
  }

  const filteredEntries = entries.filter((e) => {
    if (filterProject && e.projectId !== filterProject) return false;
    const entryDate = e.startedAt.slice(0, 10);
    if (filterFrom && entryDate < filterFrom) return false;
    if (filterTo   && entryDate > filterTo)   return false;
    return true;
  });

  const groupedEntries = filteredEntries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const k = entry.startedAt.slice(0, 10);
    (acc[k] ||= []).push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));
  const totalMinutes = filteredEntries.reduce((sum, e) => sum + toNum(e.durationMin), 0);
  const activeFilterCount = [filterProject, filterFrom, filterTo].filter(Boolean).length;

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const allProjectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    projects.forEach((p) => seen.set(p.id, p.name));
    entries.forEach((e) => { if (e.project && !seen.has(e.project.id)) seen.set(e.project.id, e.project.name); });
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [projects, entries]);

  function handleExport() {
    exportCsv('horas-gainora', [
      { header: 'Fecha',         value: (e) => e.startedAt.slice(0, 10) },
      { header: 'Proyecto',      value: (e) => e.project?.name ?? '' },
      { header: 'Descripción',   value: (e) => e.description ?? '' },
      { header: 'Duración (min)', value: (e) => e.durationMin },
      { header: 'Facturable',    value: (e) => e.isBillable ? 'Sí' : 'No' },
    ], filteredEntries);
    toast('success', `${filteredEntries.length} entradas exportadas`);
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[920px] mx-auto">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-48 sm:h-40 rounded-[16px] mb-6" />
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-16 rounded-[12px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-8 h-8 text-[var(--color-red)]" strokeWidth={1.5} />
        <p className="text-[15px] font-medium text-[var(--color-text)]">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => load()} icon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[920px] mx-auto">
      {/* Header */}
      <header className="flex items-start justify-between mb-5 animate-fade-up">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--color-text)] tracking-tight">Horas</h1>
          <p className="text-[13.5px] text-[var(--color-text-secondary)] mt-0.5">
            {entries.length} entrada{entries.length !== 1 ? 's' : ''} · {fmt(totalMinutes / 60, 1)}h totales
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filteredEntries.length > 0 && (
            <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
          {canWrite && (
            <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" strokeWidth={2.4} />} onClick={openCreate}>
              <span className="hidden sm:inline">Añadir manual</span>
              <span className="sm:hidden">Manual</span>
            </Button>
          )}
        </div>
      </header>

      {/* ═══ Timer ═══ — sólo visible si el rol puede fichar horas. */}
      {canWrite && (
      <Card padding="none" className="mb-5 animate-fade-up stagger-1 p-5 sm:p-6 relative overflow-hidden">
        {running && (
          <>
            <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,69,58,0.12) 0%, transparent 50%)' }} />
            <div className="absolute inset-0 pointer-events-none border-2 border-[rgba(255,69,58,0.14)] rounded-[16px]" />
          </>
        )}

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={clsx(
                'w-8 h-8 rounded-[10px] flex items-center justify-center',
                running ? 'bg-[rgba(255,69,58,0.12)]' : 'bg-[var(--color-blue-subtle)]',
              )}>
                <Clock className={clsx('w-4 h-4', running ? 'text-[var(--color-red)]' : 'text-[var(--color-blue)]')} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[var(--color-text)] tracking-tight">Timer</p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)]">
                  {running ? 'Contando horas en tiempo real' : 'Listo para empezar'}
                </p>
              </div>
            </div>
            {running && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--color-red-subtle)]">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-[var(--color-red)] opacity-75 animate-ping" />
                  <span className="relative w-2 h-2 rounded-full bg-[var(--color-red)]" />
                </span>
                <span className="text-[11.5px] font-semibold text-[var(--color-red)]">En curso</span>
              </div>
            )}
          </div>

          <div
            className={clsx(
              'text-center py-6 sm:py-7 mb-4 rounded-[14px] transition-all duration-300',
              running
                ? 'bg-[rgba(255,69,58,0.04)] border border-[rgba(255,69,58,0.10)]'
                : 'bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)]',
            )}
          >
            <span className={clsx(
              'text-[52px] sm:text-[64px] font-semibold tabular-nums tracking-[-0.035em] leading-none',
              running ? 'text-[var(--color-red)]' : 'text-[var(--color-text-tertiary)]',
            )}>
              {fmtTimer(elapsed)}
            </span>
            {running && elapsed > 0 && (
              <p className="text-[12px] text-[var(--color-text-secondary)] mt-2 tabular-nums">
                {fmtDuration(elapsed / 60)} trabajados
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <Select
                label="Proyecto *"
                value={timerProject}
                onChange={(e) => { setTimerProject(e.target.value); setTimerContract(''); setTimerIssue(''); }}
                options={projectOptions}
                placeholder="Selecciona un proyecto"
                disabled={running}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Descripción"
                type="text"
                value={timerDesc}
                onChange={(e) => setTimerDesc(e.target.value)}
                disabled={running}
              />
            </div>

            <div className="flex items-center gap-3 sm:pb-0.5">
              <div className="flex items-center gap-2">
                <Toggle checked={timerBill} onChange={setTimerBill} disabled={running} />
                <span className="text-[13px] text-[var(--color-text-secondary)] sm:hidden">Facturable</span>
              </div>
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                {running && !savingTimer && (
                  <button
                    onClick={discardTimer}
                    className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-red)] transition-colors underline underline-offset-2 whitespace-nowrap"
                    title="Descartar el timer sin guardar"
                  >
                    Descartar
                  </button>
                )}
                {running ? (
                  <Button
                    variant="danger" size="md" loading={savingTimer} fullWidth
                    icon={<Square className="w-4 h-4" fill="currentColor" />}
                    onClick={stopTimer}
                  >
                    Parar y guardar
                  </Button>
                ) : (
                  <Button
                    variant="primary" size="md" disabled={!timerProject} fullWidth
                    icon={<Play className="w-4 h-4" fill="currentColor" />}
                    onClick={startTimer}
                    glow={!!timerProject}
                  >
                    Iniciar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Selectores opcionales contrato/issue del timer */}
          <div className="mt-3">
            <ContractIssueFields
              projectId={timerProject}
              contractId={timerContract}
              issueId={timerIssue}
              disabled={running}
              onChange={({ contractId, issueId }) => {
                setTimerContract(contractId);
                setTimerIssue(issueId);
              }}
            />
          </div>
        </div>
      </Card>
      )}

      {/* ═══ Filtros (colapsables) ═══ */}
      {entries.length > 0 && (
        <div className="mb-4 animate-fade-up stagger-2">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
              <Filter className="w-4 h-4" strokeWidth={2} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-blue)] text-white text-[10.5px] font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-3 text-[12.5px]">
              <span className="text-[var(--color-text-tertiary)]">
                {filteredEntries.length} entrada{filteredEntries.length !== 1 ? 's' : ''}
              </span>
              <span className="font-semibold text-[var(--color-text)] tabular-nums">
                {fmtDuration(totalMinutes)}
              </span>
            </div>
          </div>

          {filtersOpen && (
            <Card padding="md" className="animate-fade-down">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <Select
                    label="Filtrar por proyecto"
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                    options={[{ value: '', label: 'Todos los proyectos' }, ...allProjectOptions]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:w-[340px]">
                  <DatePicker label="Desde" value={filterFrom} onChange={setFilterFrom} />
                  <DatePicker label="Hasta" value={filterTo}   onChange={setFilterTo}  min={filterFrom || undefined} />
                </div>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost" size="sm" icon={<X className="w-4 h-4" />}
                    onClick={() => { setFilterProject(''); setFilterFrom(''); setFilterTo(''); }}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ═══ Lista ═══ */}
      {entries.length === 0 ? (
        <EmptyEntries />
      ) : sortedDates.length === 0 ? (
        <Card padding="md" className="text-center py-8">
          <p className="text-[14px] text-[var(--color-text-secondary)]">No hay entradas con los filtros seleccionados</p>
        </Card>
      ) : (
        <div className="space-y-5 animate-fade-up stagger-3">
          {sortedDates.map((date) => {
            const dayEntries = groupedEntries[date];
            const dayTotal = dayEntries.reduce((sum, e) => sum + toNum(e.durationMin), 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {fmtDate(date + 'T00:00:00')}
                  </span>
                  <span className="text-[12px] font-semibold text-[var(--color-text)] tabular-nums">
                    {fmtDuration(dayTotal)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayEntries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onEdit={() => openEdit(entry)}
                      onDuplicate={() => handleDuplicate(entry)}
                      onDelete={() => handleDelete(entry.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Modal manual ═══ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar entrada' : 'Añadir horas'}
        subtitle={editTarget ? 'Modifica los datos de la entrada' : 'Elige cómo quieres registrar el tiempo'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={savingManual} onClick={handleSaveManual}>
              {editTarget ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="Proyecto *"
            value={manualForm.projectId}
            onChange={(e) => setManualForm((p) => ({ ...p, projectId: e.target.value, contractId: '', issueId: '' }))}
            options={allProjectOptions}
            placeholder="Selecciona un proyecto"
          />

          <ContractIssueFields
            projectId={manualForm.projectId}
            contractId={manualForm.contractId}
            issueId={manualForm.issueId}
            onChange={({ contractId, issueId }) =>
              setManualForm((p) => ({ ...p, contractId, issueId }))
            }
          />

          <Input
            label="Descripción"
            type="text"
            value={manualForm.description}
            onChange={(e) => setManualForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Ej: cambio de turbo, revisión..."
          />

          {!editTarget && (
            <SegmentedControl<EntryMode>
              value={manualForm.mode}
              onChange={(m) => setManualForm((p) => ({ ...p, mode: m }))}
              options={[
                { value: 'range',    label: 'Hora de inicio y fin' },
                { value: 'duration', label: 'Solo la duración' },
              ]}
            />
          )}

          {manualForm.mode === 'duration' && !editTarget ? (
            <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] p-4 space-y-3">
              <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                Escribe cuánto tiempo has trabajado. La entrada se guardará con la hora actual como fin.
              </p>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => setManualForm((p) => ({ ...p, durationH: '0', durationM: '15' }))}>+15m</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setManualForm((p) => ({ ...p, durationH: '0', durationM: '30' }))}>+30m</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setManualForm((p) => ({ ...p, durationH: '1', durationM: '0' }))}>+1h</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setManualForm((p) => ({ ...p, durationH: '2', durationM: '0' }))}>+2h</Button>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  label="Horas" type="number"
                  value={manualForm.durationH}
                  onChange={(e) => setManualForm((p) => ({ ...p, durationH: e.target.value }))}
                  min="0" step="1" placeholder="0" suffix="h"
                />
                <Input
                  label="Minutos" type="number"
                  value={manualForm.durationM}
                  onChange={(e) => setManualForm((p) => ({ ...p, durationM: e.target.value }))}
                  min="0" max="59" step="5" placeholder="0" suffix="min"
                />
              </div>
              {(manualForm.durationH || manualForm.durationM) && (
                <p className="text-[12px] text-[var(--color-blue)] font-medium tabular-nums">
                  Total: {Math.floor((parseInt(manualForm.durationH||'0')*60 + parseInt(manualForm.durationM||'0')) / 60)}h {(parseInt(manualForm.durationH||'0')*60 + parseInt(manualForm.durationM||'0')) % 60}min
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] p-3 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Inicio</p>
                <div className="grid grid-cols-2 gap-3">
                  <DatePicker
                    label="Fecha"
                    value={manualForm.startDate}
                    onChange={(v) => setManualForm((p) => ({ ...p, startDate: v, endDate: p.endDate || v }))}
                  />
                  <TimeInput
                    label="Hora"
                    value={manualForm.startTime}
                    onChange={(e) => setManualForm((p) => ({ ...p, startTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] p-3 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Fin</p>
                <div className="grid grid-cols-2 gap-3">
                  <DatePicker
                    label="Fecha"
                    value={manualForm.endDate}
                    onChange={(v) => setManualForm((p) => ({ ...p, endDate: v }))}
                    min={manualForm.startDate || undefined}
                  />
                  <TimeInput
                    label="Hora"
                    value={manualForm.endTime}
                    onChange={(e) => setManualForm((p) => ({ ...p, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3 px-1">
            <Toggle
              checked={manualForm.isBillable}
              onChange={(v) => setManualForm((p) => ({ ...p, isBillable: v }))}
              label="Facturable al cliente"
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
              <p className="text-[13px] text-[#D93025] dark:text-[#FF6961]">{formError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EntryRow
// ---------------------------------------------------------------------------

function EntryRow({ entry, onEdit, onDuplicate, onDelete }: {
  entry: TimeEntry; onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const canWrite = useCan('timeentry:write:own');
  return (
    <div className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] px-4 py-3 hover:border-[var(--color-border-medium)] hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium text-[var(--color-text)] truncate">
            {entry.project?.name ?? 'Sin proyecto'}
          </span>
          {entry.isBillable && <Badge variant="blue">Facturable</Badge>}
          {entry.issueId    && <Badge variant="orange" size="sm">Inconveniente</Badge>}
        </div>
        {entry.description && (
          <p className="text-[12px] text-[var(--color-text-secondary)] truncate mt-0.5">{entry.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Clock className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" strokeWidth={2} />
        <span className="text-[13.5px] font-semibold text-[var(--color-text)] tabular-nums">
          {fmtDuration(toNum(entry.durationMin))}
        </span>
      </div>
      <span className="text-[12px] text-[var(--color-text-tertiary)] shrink-0 hidden sm:block w-24 text-right tabular-nums">
        {new Date(entry.startedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      </span>
      {canWrite && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconBtn onClick={onEdit}      title="Editar"    icon={<Pencil className="w-3.5 h-3.5" />} color="blue" />
          <IconBtn onClick={onDuplicate} title="Duplicar"  icon={<Copy   className="w-3.5 h-3.5" />} color="green" />
          <IconBtn onClick={onDelete}    title="Eliminar"  icon={<Trash2 className="w-3.5 h-3.5" />} color="red" />
        </div>
      )}
    </div>
  );
}

function IconBtn({ onClick, title, icon, color }: {
  onClick: () => void; title: string; icon: React.ReactNode; color: 'blue' | 'green' | 'red';
}) {
  const colors = {
    blue:  'hover:text-[var(--color-blue)]  hover:bg-[var(--color-blue-subtle)]',
    green: 'hover:text-[#25A244] hover:bg-[var(--color-green-subtle)]',
    red:   'hover:text-[var(--color-red)]   hover:bg-[var(--color-red-subtle)]',
  } as const;
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        'p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] transition-colors',
        colors[color],
      )}
    >
      {icon}
    </button>
  );
}

function EmptyEntries() {
  return (
    <Card padding="lg" className="flex flex-col items-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--color-blue-subtle)] flex items-center justify-center mb-4 animate-float">
        <Clock className="w-7 h-7 text-[var(--color-blue)]" strokeWidth={1.6} />
      </div>
      <p className="text-[18px] font-semibold text-[var(--color-text)] tracking-tight">
        Aún no has fichado ninguna hora
      </p>
      <p className="text-[14px] text-[var(--color-text-secondary)] mt-1.5 max-w-[420px] leading-relaxed">
        Tienes dos formas de hacerlo. La que mejor te funcione es la correcta.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 max-w-[460px] w-full">
        <div className="rounded-[12px] border border-[var(--color-border)] p-3.5 text-left">
          <p className="text-[13.5px] font-semibold text-[var(--color-text)]">⏱️ Modo timer</p>
          <p className="text-[12px] text-[var(--color-text-secondary)] mt-1 leading-relaxed">
            Pulsa "Iniciar timer" arriba cuando empieces a trabajar. Gainora cuenta solo.
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--color-border)] p-3.5 text-left">
          <p className="text-[13.5px] font-semibold text-[var(--color-text)]">📝 Modo manual</p>
          <p className="text-[12px] text-[var(--color-text-secondary)] mt-1 leading-relaxed">
            Pulsa "Añadir horas" si te has olvidado de fichar y prefieres anotar al final del día.
          </p>
        </div>
      </div>

      <a
        href="/ayuda?a=fichar-horas"
        className="text-[12.5px] font-semibold text-[var(--color-blue)] hover:underline mt-5"
      >
        Más sobre cómo fichar horas →
      </a>
    </Card>
  );
}
