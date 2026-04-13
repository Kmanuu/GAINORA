// ============================================================================
// HorasPage.tsx — Registro de horas con timer en tiempo real (responsive)
// ============================================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Square, Plus, Clock, AlertCircle, RefreshCw, Trash2, Download } from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import type { TimeEntry, Project } from '@/types';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import Modal        from '@/components/ui/Modal';
import Input        from '@/components/ui/Input';
import Select       from '@/components/ui/Select';
import Toggle       from '@/components/ui/Toggle';
import { useToast }    from '@/components/ui/Toast';
import { useConfirm }  from '@/components/ui/ConfirmDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function HorasPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const [entries,  setEntries]  = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Filtros
  const [filterProject, setFilterProject] = useState('');
  const [filterFrom,    setFilterFrom]    = useState('');
  const [filterTo,      setFilterTo]      = useState('');

  // Timer
  const [running,      setRunning]      = useState(false);
  const [elapsed,      setElapsed]      = useState(0);
  const [timerProject, setTimerProject] = useState('');
  const [timerDesc,    setTimerDesc]    = useState('');
  const [timerBill,    setTimerBill]    = useState(true);
  const [timerStart,   setTimerStart]   = useState<Date | null>(null);
  const [savingTimer,  setSavingTimer]  = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal entrada manual
  const [modalOpen,  setModalOpen]  = useState(false);
  const [manualForm, setManualForm] = useState({
    projectId: '', description: '', startedAt: '', endedAt: '', isBillable: true,
  });
  const [savingManual, setSavingManual] = useState(false);
  const [formError,    setFormError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
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

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function startTimer() {
    if (!timerProject) return;
    setRunning(true);
    setElapsed(0);
    setTimerStart(new Date());
  }

  async function stopTimer() {
    if (!timerStart) return;
    setSavingTimer(true);
    try {
      await api.post<TimeEntry>('/v1/time-entries', {
        projectId:   timerProject,
        description: timerDesc.trim() || null,
        startedAt:   timerStart.toISOString(),
        endedAt:     new Date().toISOString(),
        isBillable:  timerBill,
      });
      setRunning(false); setElapsed(0); setTimerProject('');
      setTimerDesc(''); setTimerBill(true); setTimerStart(null);
      toast('success', 'Entrada de tiempo guardada');
      load();
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSavingTimer(false);
    }
  }

  async function handleSaveManual() {
    if (!manualForm.projectId || !manualForm.startedAt || !manualForm.endedAt) {
      setFormError('Proyecto, inicio y fin son obligatorios'); return;
    }
    setSavingManual(true); setFormError('');
    try {
      await api.post<TimeEntry>('/v1/time-entries', {
        projectId:   manualForm.projectId,
        description: manualForm.description.trim() || null,
        startedAt:   new Date(manualForm.startedAt).toISOString(),
        endedAt:     new Date(manualForm.endedAt).toISOString(),
        isBillable:  manualForm.isBillable,
      });
      setModalOpen(false);
      setManualForm({ projectId: '', description: '', startedAt: '', endedAt: '', isBillable: true });
      toast('success', 'Entrada añadida manualmente');
      load();
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
      load();
    } catch {
      toast('error', 'Error al eliminar la entrada');
    }
  }

  // Filtrar entradas
  const filteredEntries = entries.filter((e) => {
    if (filterProject && e.projectId !== filterProject) return false;
    if (filterFrom) {
      const entryDate = e.startedAt.slice(0, 10);
      if (entryDate < filterFrom) return false;
    }
    if (filterTo) {
      const entryDate = e.startedAt.slice(0, 10);
      if (entryDate > filterTo) return false;
    }
    return true;
  });

  // Agrupar por fecha
  const groupedEntries = filteredEntries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const dateKey = entry.startedAt.slice(0, 10);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  // Total horas filtradas
  const totalMinutes = filteredEntries.reduce((sum, e) => sum + e.durationMin, 0);

  function handleExport() {
    exportCsv('horas-horaspro', [
      { header: 'Fecha',       value: (e) => e.startedAt.slice(0, 10) },
      { header: 'Proyecto',    value: (e) => e.project?.name ?? '' },
      { header: 'Descripción', value: (e) => e.description ?? '' },
      { header: 'Duración (min)', value: (e) => e.durationMin },
      { header: 'Facturable',  value: (e) => e.isBillable ? 'Sí' : 'No' },
    ], filteredEntries);
    toast('success', `${filteredEntries.length} entradas exportadas`);
  }

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const allProjectOptions = [
    ...projects,
    ...entries.reduce<Project[]>((acc, e) => {
      if (e.project && !acc.find((p) => p.id === e.project!.id) && !projects.find((p) => p.id === e.project!.id)) {
        acc.push({ id: e.project.id, name: e.project.name } as Project);
      }
      return acc;
    }, []),
  ].map((p) => ({ value: p.id, label: p.name }));

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px] mx-auto">
        <div className="skeleton h-7 w-48 mb-6" />
        <div className="skeleton h-48 sm:h-36 rounded-[16px] mb-6" />
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-16 rounded-[12px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-8 h-8 text-[#FF453A]" strokeWidth={1.5} />
        <p className="text-[15px] font-medium">{error}</p>
        <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px] mx-auto">

      {/* Header */}
      <header className="flex items-start justify-between mb-5 animate-fade-up">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#1D1D1F]">Horas</h1>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">
            {entries.length} entrada{entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filteredEntries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" strokeWidth={2} />}
              onClick={handleExport}
            >
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
            onClick={() => { setModalOpen(true); setFormError(''); }}
          >
            <span className="hidden sm:inline">Añadir manual</span>
            <span className="sm:hidden">Manual</span>
          </Button>
        </div>
      </header>

      {/* ——— Timer Widget ——— */}
      <Card
        padding="none"
        className="mb-5 animate-fade-up p-4 sm:p-5"
        style={{ animationDelay: '60ms', animationFillMode: 'both' } as React.CSSProperties}
      >
        {/* Cabecera del widget */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-[rgba(10,132,255,0.10)] flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#0A84FF]" strokeWidth={2} />
            </div>
            <p className="text-[14px] font-semibold text-[#1D1D1F]">Timer</p>
          </div>
          {running && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF453A] animate-pulse" />
              <span className="text-[12px] font-medium text-[#FF453A]">En curso</span>
            </span>
          )}
        </div>

        {/* Pantalla del tiempo */}
        <div
          className={clsx(
            'text-center py-5 sm:py-6 mb-4 rounded-[12px] transition-all duration-300',
            running
              ? 'bg-[rgba(255,69,58,0.06)] border border-[rgba(255,69,58,0.12)]'
              : 'bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.05)]',
          )}
        >
          <span className={clsx(
            'text-[48px] sm:text-[52px] font-semibold tabular-nums tracking-[-0.02em] leading-none',
            running ? 'text-[#FF453A]' : 'text-[#C7C7CC]',
          )}>
            {fmtTimer(elapsed)}
          </span>
        </div>

        {/* Controles — apilados en móvil, fila en desktop */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Select
              label="Proyecto *"
              value={timerProject}
              onChange={(e) => setTimerProject(e.target.value)}
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

          {/* Facturable + botón — en fila siempre */}
          <div className="flex items-center gap-3 sm:pb-0.5">
            <div className="flex items-center gap-2">
              <Toggle checked={timerBill} onChange={setTimerBill} disabled={running} />
              <span className="text-[13px] text-[#6E6E73] sm:hidden">Facturable</span>
            </div>
            <div className="flex-1 sm:flex-none">
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
                >
                  Iniciar
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ——— Filtros ——— */}
      {entries.length > 0 && (
        <Card
          padding="none"
          className="mb-4 p-3 sm:p-4 animate-fade-up"
          style={{ animationDelay: '90ms', animationFillMode: 'both' } as React.CSSProperties}
        >
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-end">
            <div className="flex-1">
              <Select
                label="Filtrar por proyecto"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                options={[{ value: '', label: 'Todos los proyectos' }, ...allProjectOptions]}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:w-[280px]">
              <Input
                label="Desde"
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
              <Input
                label="Hasta"
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </div>
            {(filterProject || filterFrom || filterTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterProject(''); setFilterFrom(''); setFilterTo(''); }}
              >
                Limpiar
              </Button>
            )}
          </div>
          {/* Resumen del filtro */}
          <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-[rgba(0,0,0,0.05)] text-[12px] text-[#6E6E73]">
            <span>{filteredEntries.length} entrada{filteredEntries.length !== 1 ? 's' : ''}</span>
            <span className="text-[#86868B]">·</span>
            <span className="font-medium text-[#1D1D1F]">{fmtDuration(totalMinutes)}</span>
          </div>
        </Card>
      )}

      {/* ——— Lista de entradas agrupadas por fecha ——— */}
      {entries.length === 0 ? (
        <EmptyEntries />
      ) : sortedDates.length === 0 ? (
        <Card padding="md" className="text-center py-8">
          <p className="text-[14px] text-[#6E6E73]">No hay entradas con los filtros seleccionados</p>
        </Card>
      ) : (
        <div
          className="space-y-4 animate-fade-up"
          style={{ animationDelay: '120ms', animationFillMode: 'both' } as React.CSSProperties}
        >
          {sortedDates.map((date) => {
            const dayEntries = groupedEntries[date];
            const dayTotal = dayEntries.reduce((sum, e) => sum + e.durationMin, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-[0.04em]">
                    {fmtDate(date + 'T00:00:00')}
                  </span>
                  <span className="text-[12px] font-medium text-[#1D1D1F] tabular-nums">
                    {fmtDuration(dayTotal)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayEntries.map((entry, i) => (
                    <EntryRow key={entry.id} entry={entry} index={i} onDelete={() => handleDelete(entry.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal entrada manual */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Añadir entrada"
        subtitle="Registra horas manualmente"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={savingManual} onClick={handleSaveManual}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="Proyecto *"
            value={manualForm.projectId}
            onChange={(e) => setManualForm((p) => ({ ...p, projectId: e.target.value }))}
            options={allProjectOptions}
            placeholder="Selecciona un proyecto"
          />
          <Input
            label="Descripción"
            type="text"
            value={manualForm.description}
            onChange={(e) => setManualForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Inicio *"
              type="datetime-local"
              value={manualForm.startedAt}
              onChange={(e) => setManualForm((p) => ({ ...p, startedAt: e.target.value }))}
            />
            <Input
              label="Fin *"
              type="datetime-local"
              value={manualForm.endedAt}
              onChange={(e) => setManualForm((p) => ({ ...p, endedAt: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-3 px-1">
            <Toggle
              checked={manualForm.isBillable}
              onChange={(v) => setManualForm((p) => ({ ...p, isBillable: v }))}
            />
            <span className="text-[14px] text-[#1D1D1F]">Facturable al cliente</span>
          </div>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[rgba(255,69,58,0.08)] border border-[rgba(255,69,58,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A] shrink-0" />
              <p className="text-[13px] text-[#D93025]">{formError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function EntryRow({ entry, onDelete }: { entry: TimeEntry; index: number; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[rgba(0,0,0,0.06)] rounded-[12px] px-4 py-3 hover:border-[rgba(0,0,0,0.10)] transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium text-[#1D1D1F] truncate">
            {entry.project?.name ?? 'Sin proyecto'}
          </span>
          {entry.isBillable && <Badge variant="blue">Facturable</Badge>}
        </div>
        {entry.description && (
          <p className="text-[12px] text-[#6E6E73] truncate mt-0.5">{entry.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Clock className="w-3.5 h-3.5 text-[#86868B]" strokeWidth={1.8} />
        <span className="text-[13px] font-semibold text-[#1D1D1F] tabular-nums">
          {fmtDuration(entry.durationMin)}
        </span>
      </div>
      <span className="text-[12px] text-[#86868B] shrink-0 hidden sm:block w-24 text-right">
        {fmtDate(entry.startedAt)}
      </span>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-[7px] text-[#C7C7CC] hover:text-[#FF453A] hover:bg-[rgba(255,69,58,0.08)] opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}

function EmptyEntries() {
  return (
    <Card padding="lg" className="flex flex-col items-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-[rgba(10,132,255,0.08)] flex items-center justify-center mb-4">
        <Clock className="w-6 h-6 text-[#0A84FF]" strokeWidth={1.5} />
      </div>
      <p className="text-[16px] font-semibold text-[#1D1D1F]">Sin entradas</p>
      <p className="text-[14px] text-[#6E6E73] mt-1 max-w-[260px]">
        Inicia el timer o añade horas manualmente.
      </p>
    </Card>
  );
}
