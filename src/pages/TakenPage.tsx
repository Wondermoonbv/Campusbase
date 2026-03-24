import { useState, useMemo } from "react";
import { mockTasks, mockSchools, mockEvents } from "@/data/mockData";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, AlertTriangle, ArrowUp, Minus } from "lucide-react";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { Link } from "react-router-dom";
import type { Task, TaskStatus } from "@/types/crm";

const priorityIcon: Record<string, React.ReactNode> = {
  hoog: <ArrowUp className="h-3.5 w-3.5 text-destructive" />,
  normaal: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
  laag: <ArrowUp className="h-3.5 w-3.5 text-info rotate-180" />,
};

export default function TakenPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("alle");
  const [filterAssigned, setFilterAssigned] = useState("alle");

  const teamMembers = useMemo(() =>
    [...new Set(mockTasks.map((t) => t.assigned_to))].sort(),
    []
  );

  const filterTasks = (status: TaskStatus | "active") => {
    return mockTasks.filter((t) => {
      if (status === "active") {
        if (t.status === "afgerond") return false;
      } else if (t.status !== status) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPriority !== "alle" && t.priority !== filterPriority) return false;
      if (filterAssigned !== "alle" && t.assigned_to !== filterAssigned) return false;
      return true;
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  };

  const activeTasks = filterTasks("active");
  const doneTasks = filterTasks("afgerond");

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1>Taken</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nieuwe taak
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek taken..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioriteit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle prioriteiten</SelectItem>
            <SelectItem value="hoog">Hoog</SelectItem>
            <SelectItem value="normaal">Normaal</SelectItem>
            <SelectItem value="laag">Laag</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAssigned} onValueChange={setFilterAssigned}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Teamlid" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle teamleden</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Openstaand ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="done">Afgerond ({doneTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <TaskTable tasks={activeTasks} />
        </TabsContent>

        <TabsContent value="done" className="mt-4">
          <TaskTable tasks={doneTasks} done />
        </TabsContent>
      </Tabs>

      <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function TaskTable({ tasks, done = false }: { tasks: Task[]; done?: boolean }) {
  const now = new Date();

  return (
    <div className="surface-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Taak</TableHead>
            <TableHead>Prioriteit</TableHead>
            <TableHead>Toegewezen aan</TableHead>
            <TableHead>Vervaldatum</TableHead>
            <TableHead>Gekoppeld</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Geen taken gevonden.
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => {
              const school = task.school_id ? mockSchools.find((s) => s.id === task.school_id) : null;
              const event = task.event_id ? mockEvents.find((e) => e.id === task.event_id) : null;
              const overdue = !done && new Date(task.due_date) < now;

              return (
                <TableRow key={task.id} className={done ? "opacity-60" : ""}>
                  <TableCell>
                    <Checkbox checked={done} disabled={done} />
                  </TableCell>
                  <TableCell>
                    <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs capitalize">
                      {priorityIcon[task.priority]} {task.priority}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{task.assigned_to}</TableCell>
                  <TableCell>
                    <span className={`text-sm tabular-nums ${overdue ? "text-destructive font-medium" : ""}`}>
                      {new Date(task.due_date).toLocaleDateString("nl-BE")}
                      {overdue && <AlertTriangle className="inline h-3 w-3 ml-1 -mt-0.5" />}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {school && (
                        <Link to={`/scholen/${school.id}`} className="text-xs text-primary hover:underline">
                          {school.name}
                        </Link>
                      )}
                      {event && (
                        <Link to={`/evenementen/${event.id}`} className="text-xs text-primary hover:underline">
                          {event.name}
                        </Link>
                      )}
                      {!school && !event && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={task.status} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
