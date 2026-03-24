import { useState, useMemo } from "react";
import { useActivity, ActivityAction, ActivityEntityType } from "@/contexts/ActivityContext";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, GraduationCap, CalendarDays, FileText, BookOpen, CheckSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const entityIcons: Record<ActivityEntityType, React.ElementType> = {
  school: GraduationCap,
  evenement: CalendarDays,
  contract: FileText,
  opleiding: BookOpen,
  taak: CheckSquare,
};

const actionIcons: Record<ActivityAction, React.ElementType> = {
  aangemaakt: Plus,
  bewerkt: Pencil,
  verwijderd: Trash2,
};

const actionColors: Record<ActivityAction, string> = {
  aangemaakt: "text-success",
  bewerkt: "text-primary",
  verwijderd: "text-destructive",
};

export default function ActiviteitenPage() {
  const { activities } = useActivity();
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("alle");
  const [filterAction, setFilterAction] = useState("alle");
  const [filterPeriod, setFilterPeriod] = useState("alle");

  const users = useMemo(() =>
    [...new Map(activities.map((a) => [a.userId, a.userName])).values()].sort(),
    [activities]
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    return activities.filter((a) => {
      if (search && !a.entityName.toLowerCase().includes(search.toLowerCase()) && !a.userName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterUser !== "alle" && a.userName !== filterUser) return false;
      if (filterAction !== "alle" && a.action !== filterAction) return false;
      if (filterPeriod !== "alle") {
        const age = now - new Date(a.timestamp).getTime();
        if (filterPeriod === "vandaag" && age > 86400000) return false;
        if (filterPeriod === "week" && age > 7 * 86400000) return false;
        if (filterPeriod === "maand" && age > 30 * 86400000) return false;
      }
      return true;
    });
  }, [activities, search, filterUser, filterAction, filterPeriod]);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1>Activiteit</h1>
      </div>

      <div className="surface-card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Gebruiker" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle gebruikers</SelectItem>
              {users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Actie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle acties</SelectItem>
              <SelectItem value="aangemaakt">Aangemaakt</SelectItem>
              <SelectItem value="bewerkt">Bewerkt</SelectItem>
              <SelectItem value="verwijderd">Verwijderd</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Periode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle tijd</SelectItem>
              <SelectItem value="vandaag">Vandaag</SelectItem>
              <SelectItem value="week">Afgelopen week</SelectItem>
              <SelectItem value="maand">Afgelopen maand</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="surface-card overflow-hidden divide-y divide-border">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Geen activiteiten gevonden.</p>
        ) : (
          filtered.map((a) => <ActivityRow key={a.id} activity={a} />)
        )}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        {filtered.length} activiteit{filtered.length !== 1 ? "en" : ""}
      </div>
    </div>
  );
}

function ActivityRow({ activity: a }: { activity: ReturnType<typeof useActivity>["activities"][0] }) {
  const ActionIcon = actionIcons[a.action];
  const EntityIcon = entityIcons[a.entityType];

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <UserAvatar name={a.userName} avatarUrl={a.userAvatarUrl} className="h-8 w-8 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{a.userName}</span>
          {" "}
          <span className="text-muted-foreground">heeft</span>
          {" "}
          <span className={`inline-flex items-center gap-1 font-medium ${actionColors[a.action]}`}>
            <ActionIcon className="h-3 w-3" />
            {a.action}
          </span>
          {": "}
          <span className="inline-flex items-center gap-1">
            <EntityIcon className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{a.entityName}</span>
          </span>
        </p>
      </div>
      <time className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
        {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true, locale: nl })}
      </time>
    </div>
  );
}
