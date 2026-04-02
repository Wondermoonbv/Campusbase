import { useState, useMemo, useCallback, memo } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTaken } from "@/hooks/useTaken";
import { useScholen } from "@/hooks/useScholen";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useAuth } from "@/contexts/AuthContext";
import { useActivity } from "@/contexts/ActivityContext";
import { useProfiles } from "@/hooks/useProfiles";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, AlertTriangle, ArrowUp, Minus, Pencil, Trash2, ListTodo } from "lucide-react";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/types/crm";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";

const priorityIcon: Record<string, React.ReactNode> = {
  hoog: <ArrowUp className="h-3.5 w-3.5 text-destructive" />,
  normaal: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
  laag: <ArrowUp className="h-3.5 w-3.5 text-info rotate-180" />,
};

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="surface-card p-4 flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function TakenPage() {
  const { taken, isLoading, upsertTask, deleteTask: deleteTaskMutation, toggleTaskStatus: toggleMutation, lastSynced } = useTaken();
  const { scholen } = useScholen();
  const { evenementen } = useEvenementen();
  const { user } = useAuth();
  const { logActivity } = useActivity();
  const { profiles, resolveAssignee } = useProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("alle");
  const [filterAssigned, setFilterAssigned] = useState("alle");

  const teamMembers = useMemo(() => {
    const assignedIds = [...new Set(taken.map((t) => t.assigned_to).filter(Boolean))];
    return assignedIds.map((id) => ({ id, name: resolveAssignee(id) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [taken, resolveAssignee]);

  const toggleTaskStatus = useCallback(async (taskId: string) => {
    const task = taken.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "afgerond" ? "open" : "afgerond";
    try {
      await upsertTask.mutateAsync({ ...task, status: newStatus as TaskStatus });
      logActivity({ userId: user?.id ?? "", userName: user?.name ?? "", action: "bewerkt", entityType: "taak", entityName: task.title });
    } catch { toast.error("Fout."); }
  }, [taken, upsertTask, logActivity, user]);

  const handleSave = useCallback(async (saved: Task) => {
    const isNew = !taken.find((t) => t.id === saved.id);
    try {
      await upsertTask.mutateAsync(saved);
      logActivity({ userId: user?.id ?? "", userName: user?.name ?? "", action: isNew ? "aangemaakt" : "bewerkt", entityType: "taak", entityName: saved.title });
    } catch { toast.error("Fout bij opslaan."); }
  }, [taken, upsertTask, logActivity, user]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteTaskMutation.mutateAsync({ id: deleteTarget.id, title: deleteTarget.title });
      logActivity({ userId: user?.id ?? "", userName: user?.name ?? "", action: "verwijderd", entityType: "taak", entityName: deleteTarget.title });
      toast.success("Taak verwijderd.");
    } catch (error) {
      handleDeleteError(error, "taak");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteTaskMutation, logActivity, user]);

  const handleEdit = useCallback((t: Task) => { setEditTask(t); setDialogOpen(true); }, []);

  const activeTasks = useMemo(() => taken.filter((t) => {
    if (t.status === "afgerond") return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== "alle" && t.priority !== filterPriority) return false;
    if (filterAssigned !== "alle" && t.assigned_to !== filterAssigned) return false;
    return true;
  }), [taken, search, filterPriority, filterAssigned]);

  const doneTasks = useMemo(() => taken.filter((t) => {
    if (t.status !== "afgerond") return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== "alle" && t.priority !== filterPriority) return false;
    if (filterAssigned !== "alle" && t.assigned_to !== filterAssigned) return false;
    return true;
  }), [taken, search, filterPriority, filterAssigned]);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Taken</h1>
        <Button size="sm" className="h-10 sm:h-8" onClick={() => { setEditTask(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nieuwe taak</Button>
      </div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1 min-w-0 sm:max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Zoek taken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9" /></div>
        <div className="flex gap-2">
          <Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger className="w-full sm:w-[140px] h-10 sm:h-9"><SelectValue placeholder="Prioriteit" /></SelectTrigger><SelectContent><SelectItem value="alle">Alle prioriteiten</SelectItem><SelectItem value="hoog">Hoog</SelectItem><SelectItem value="normaal">Normaal</SelectItem><SelectItem value="laag">Laag</SelectItem></SelectContent></Select>
          <Select value={filterAssigned} onValueChange={setFilterAssigned}><SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9"><SelectValue placeholder="Teamlid" /></SelectTrigger><SelectContent><SelectItem value="alle">Alle teamleden</SelectItem>{teamMembers.map((m) => <SelectItem key={m.id} value={m.id!}>{m.name}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>

      {isLoading ? <TableSkeleton /> : taken.length === 0 ? (
        <EmptyState icon={ListTodo} title="Nog geen taken aangemaakt" description="Maak je eerste taak aan om aan de slag te gaan." actionLabel="Nieuwe taak" onAction={() => { setEditTask(null); setDialogOpen(true); }} />
      ) : (
        <Tabs defaultValue="active">
          <TabsList><TabsTrigger value="active">Openstaand ({activeTasks.length})</TabsTrigger><TabsTrigger value="done">Afgerond ({doneTasks.length})</TabsTrigger></TabsList>
          <TabsContent value="active" className="mt-4"><TaskTable tasks={activeTasks} scholen={scholen} evenementen={evenementen} resolveAssignee={resolveAssignee} onToggle={toggleTaskStatus} onEdit={handleEdit} onDelete={setDeleteTarget} /></TabsContent>
          <TabsContent value="done" className="mt-4"><TaskTable tasks={doneTasks} scholen={scholen} evenementen={evenementen} resolveAssignee={resolveAssignee} done onToggle={toggleTaskStatus} onEdit={handleEdit} onDelete={setDeleteTarget} /></TabsContent>
        </Tabs>
      )}

      <TaskFormDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTask(null); }} task={editTask} onSave={handleSave} />
      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} itemName={deleteTarget?.title ?? ""} isLoading={deleteTaskMutation.isPending} />
    </div>
  );
}

const TaskTable = memo(function TaskTable({ tasks, scholen, evenementen, resolveAssignee, done = false, onToggle, onEdit, onDelete }: { tasks: Task[]; scholen: any[]; evenementen: any[]; resolveAssignee: (id: string | null | undefined) => string; done?: boolean; onToggle: (id: string) => void; onEdit: (task: Task) => void; onDelete: (task: Task) => void; }) {
  const now = new Date();
  const { sort, toggleSort } = useSort("title");
  const priorityOrder: Record<string, number> = { hoog: 0, normaal: 1, laag: 2 };
  const sorted = useMemo(() => sortItems(tasks, sort, (t, key) => {
    switch (key) { case "title": return t.title; case "priority": return priorityOrder[t.priority] ?? 1; case "assigned": return t.assigned_to; case "due": return new Date(t.due_date).getTime(); case "status": return t.status; default: return t.title; }
  }), [tasks, sort]);

  return (
    <>
      <div className="block md:hidden space-y-2">
        {sorted.length === 0 ? <div className="surface-card p-6 text-center text-sm text-muted-foreground">Geen taken gevonden.</div> : sorted.map((task) => {
          const school = task.school_id ? scholen.find((s) => s.id === task.school_id) : null;
          const event = task.event_id ? evenementen.find((e) => e.id === task.event_id) : null;
          const overdue = !done && new Date(task.due_date) < now;
          return (
            <div key={task.id} className={`surface-card p-4 ${done ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <Checkbox checked={task.status === "afgerond"} onCheckedChange={() => onToggle(task.id)} className="mt-0.5 h-5 w-5" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === "afgerond" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs capitalize">{priorityIcon[task.priority]} {task.priority}</span>
                    <span className="text-xs text-muted-foreground">{resolveAssignee(task.assigned_to)}</span>
                    <span className={`text-xs tabular-nums ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>{new Date(task.due_date).toLocaleDateString("nl-BE")}{overdue && " ⚠"}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1">{school && <Link to={`/scholen/${school.id}`} className="text-xs text-primary hover:underline">{school.name}</Link>}{event && <Link to={`/evenementen/${event.id}`} className="text-xs text-primary hover:underline">{event.name}</Link>}</div>
                    <div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${task.title} bewerken`} onClick={() => onEdit(task)}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${task.title} verwijderen`} onClick={() => onDelete(task)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="surface-card overflow-hidden hidden md:block">
        <Table><TableHeader><TableRow>
          <TableHead className="w-8"></TableHead>
          <SortableTableHead sortKey="title" currentSort={sort} onSort={toggleSort}>Taak</SortableTableHead>
          <SortableTableHead sortKey="priority" currentSort={sort} onSort={toggleSort}>Prioriteit</SortableTableHead>
          <SortableTableHead sortKey="assigned" currentSort={sort} onSort={toggleSort}>Toegewezen aan</SortableTableHead>
          <SortableTableHead sortKey="due" currentSort={sort} onSort={toggleSort}>Vervaldatum</SortableTableHead>
          <TableHead className="hidden lg:table-cell">Gekoppeld</TableHead>
          <SortableTableHead sortKey="status" currentSort={sort} onSort={toggleSort}>Status</SortableTableHead>
          <TableHead className="w-20" />
        </TableRow></TableHeader>
          <TableBody>{sorted.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen taken gevonden.</TableCell></TableRow> : sorted.map((task) => {
            const school = task.school_id ? scholen.find((s) => s.id === task.school_id) : null;
            const event = task.event_id ? evenementen.find((e) => e.id === task.event_id) : null;
            const overdue = !done && new Date(task.due_date) < now;
            return (
              <TableRow key={task.id} className={done ? "opacity-60" : ""}>
                <TableCell><Checkbox checked={task.status === "afgerond"} onCheckedChange={() => onToggle(task.id)} /></TableCell>
                <TableCell><p className={`text-sm font-medium ${task.status === "afgerond" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>{task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}</TableCell>
                <TableCell><span className="inline-flex items-center gap-1 text-xs capitalize">{priorityIcon[task.priority]} {task.priority}</span></TableCell>
                <TableCell className="text-sm">{resolveAssignee(task.assigned_to)}</TableCell>
                <TableCell><span className={`text-sm tabular-nums ${overdue ? "text-destructive font-medium" : ""}`}>{new Date(task.due_date).toLocaleDateString("nl-BE")}{overdue && <AlertTriangle className="inline h-3 w-3 ml-1 -mt-0.5" />}</span></TableCell>
                <TableCell className="hidden lg:table-cell"><div className="flex flex-col gap-0.5">{school && <Link to={`/scholen/${school.id}`} className="text-xs text-primary hover:underline">{school.name}</Link>}{event && <Link to={`/evenementen/${event.id}`} className="text-xs text-primary hover:underline">{event.name}</Link>}{!school && !event && <span className="text-xs text-muted-foreground">—</span>}</div></TableCell>
                <TableCell><StatusBadge status={task.status} /></TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${task.title} bewerken`} onClick={() => onEdit(task)}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${task.title} verwijderen`} onClick={() => onDelete(task)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></TableCell>
              </TableRow>
            );
          })}</TableBody></Table>
      </div>
    </>
  );
});
