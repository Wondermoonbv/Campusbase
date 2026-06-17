import { useState, useMemo, useCallback, memo, Fragment } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useAmbassadeurs, useAllInschrijvingen } from "@/hooks/useAmbassadeurs";
import { useEvenementen } from "@/hooks/useEvenementen";
import type { Ambassadeur, EventInschrijving } from "@/hooks/useAmbassadeurs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { AmbassadeurFormDialog } from "@/components/ambassadeurs/AmbassadeurFormDialog";
import { ImportDialog, ImportColumn } from "@/components/import/ImportDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Pencil, Trash2, Upload, Users, ChevronDown, ChevronRight, UserCheck, Clock, Mail, CheckCircle2, Link2, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { sendEmail, sendBulkEmails, buildPortalLinkEmail } from "@/lib/email";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AMB_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "full_name", label: "Naam", required: true },
  { key: "email", label: "Email", required: true, validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Ongeldig emailadres" },
  { key: "phone", label: "Telefoon" },
  { key: "department", label: "Afdeling" },
  { key: "notes", label: "Notities" },
];

const STATUS_OPTIONS = ["uitgenodigd", "ingeschreven", "bevestigd", "backup", "afgemeld"] as const;

function tokenValidity(expires: string | null | undefined): {
  label: string;
  variant: "neutral" | "warning" | "expired" | "none";
} {
  if (!expires) return { label: "Geen vervaldatum", variant: "none" };
  const d = new Date(expires);
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff < 0) return { label: "Verlopen", variant: "expired" };
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const dateStr = d.toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
  if (diff < sevenDays) return { label: "Verloopt binnenkort", variant: "warning" };
  return { label: `Geldig tot ${dateStr}`, variant: "neutral" };
}

function TokenValidityBadge({ expires }: { expires: string | null | undefined }) {
  const v = tokenValidity(expires);
  const cls =
    v.variant === "expired"
      ? "bg-red-100 text-red-800 border-red-200"
      : v.variant === "warning"
      ? "bg-orange-100 text-orange-800 border-orange-200"
      : v.variant === "none"
      ? "bg-muted text-muted-foreground border-border"
      : "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={`${cls} text-xs whitespace-nowrap`}>{v.label}</Badge>;
}

function statusColor(status: string) {
  switch (status) {
    case "ingeschreven": return "bg-amber-100 text-amber-800 border-amber-200";
    case "bevestigd": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "backup": return "bg-orange-100 text-orange-800 border-orange-200";
    case "afgemeld": return "bg-muted text-muted-foreground border-border";
    case "uitgenodigd": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

// Stat card component
function StatCard({ label, value, icon: Icon, active, onClick }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  active?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${active ? "ring-2 ring-primary" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AmbassadeursPage() {
  const { canEdit } = useAuth();
  const { ambassadeurs, isLoading, upsertAmbassadeur, deleteAmbassadeur } = useAmbassadeurs();
  const { inschrijvingen } = useAllInschrijvingen();
  const { evenementen } = useEvenementen();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ambassadeur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ambassadeur | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingLinks, setSendingLinks] = useState(false);
  const [rotatingLinks, setRotatingLinks] = useState(false);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  };

  // Rotate a single ambassador token via RPC. Returns the new token, or null on failure.
  const rotateToken = useCallback(async (ambassadorId: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc("rotate_ambassador_token", { p_ambassador_id: ambassadorId });
    if (error) {
      console.error(error);
      return null;
    }
    const res = data as { success?: boolean; new_token?: string } | null;
    return res?.new_token ?? null;
  }, []);

  // Ensure the ambassador has a non-expired token. Rotates if expired (or missing); leaves valid ones untouched.
  const ensureFreshToken = useCallback(async (a: Ambassadeur): Promise<string | null> => {
    const v = tokenValidity(a.token_expires_at);
    if (a.access_token && v.variant !== "expired" && v.variant !== "none") {
      return a.access_token;
    }
    return await rotateToken(a.id);
  }, [rotateToken]);

  const handleRotateOne = useCallback(async (a: Ambassadeur) => {
    const tok = await rotateToken(a.id);
    if (tok) {
      toast.success(`Link vernieuwd voor ${a.full_name}`);
      queryClient.invalidateQueries({ queryKey: ["ambassadeurs"] });
    } else {
      toast.error("Fout bij vernieuwen van link");
    }
  }, [rotateToken, queryClient]);

  const handleRotateBulk = useCallback(async () => {
    const selected = ambassadeurs.filter((a) => selectedIds.has(a.id));
    if (selected.length === 0) {
      toast.warning("Geen ambassadeurs geselecteerd.");
      return;
    }
    setRotatingLinks(true);
    let ok = 0;
    let fail = 0;
    for (const a of selected) {
      const tok = await rotateToken(a.id);
      if (tok) ok++; else fail++;
    }
    queryClient.invalidateQueries({ queryKey: ["ambassadeurs"] });
    if (ok > 0) toast.success(`Link vernieuwd voor ${ok} ambassadeur(s)`);
    if (fail > 0) toast.error(`Vernieuwen mislukt voor ${fail} ambassadeur(s)`);
    setRotatingLinks(false);
  }, [ambassadeurs, selectedIds, rotateToken, queryClient]);

  const handleSendPortalLinks = async () => {
    const selected = ambassadeurs.filter((a) => selectedIds.has(a.id));
    if (selected.length === 0) {
      toast.warning("Geen ambassadeurs geselecteerd.");
      return;
    }
    setSendingLinks(true);
    try {
      const emails: { to: string; subject: string; html: string }[] = [];
      let rotated = 0;
      for (const a of selected) {
        const wasExpired = tokenValidity(a.token_expires_at).variant === "expired" || !a.access_token;
        const token = await ensureFreshToken(a);
        if (!token) {
          toast.error(`Geen portaaltoken voor ${a.full_name}`);
          continue;
        }
        if (wasExpired) rotated++;
        emails.push({
          to: a.email,
          subject: "Elia Campus Events — Ambassadeur Portaal",
          html: buildPortalLinkEmail(a.full_name, `${window.location.origin}/ambassadeur-portaal?token=${token}`),
        });
      }
      if (rotated > 0) queryClient.invalidateQueries({ queryKey: ["ambassadeurs"] });
      if (emails.length === 0) {
        toast.error("Kon geen portaallinks versturen.");
        return;
      }
      const result = await sendBulkEmails(emails);
      if (result.sent > 0) toast.success(`Portaallink verstuurd naar ${result.sent} ambassadeur(s)`);
      if (result.failed.length > 0) {
        result.failed.forEach((f) => toast.error(`Email naar ${f.to} mislukt: ${f.error}`));
      }
      setSelectedIds(new Set());
    } catch {
      toast.error("Fout bij versturen.");
    } finally {
      setSendingLinks(false);
    }
  };

  // Build maps
  const eventMap = useMemo(() => {
    const m: Record<string, { name: string; date: string }> = {};
    evenementen.forEach((e) => { m[e.id] = { name: e.name, date: e.date }; });
    return m;
  }, [evenementen]);

  const inschrijvingenByAmb = useMemo(() => {
    const m: Record<string, EventInschrijving[]> = {};
    inschrijvingen.forEach((i) => {
      if (!m[i.ambassadeur_id]) m[i.ambassadeur_id] = [];
      m[i.ambassadeur_id].push(i);
    });
    return m;
  }, [inschrijvingen]);

  const pendingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    inschrijvingen.forEach((i) => {
      if (i.status === "ingeschreven" || i.status === "uitgenodigd") {
        counts[i.ambassadeur_id] = (counts[i.ambassadeur_id] || 0) + 1;
      }
    });
    return counts;
  }, [inschrijvingen]);

  const confirmedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    inschrijvingen.forEach((i) => {
      if (i.status === "bevestigd") counts[i.ambassadeur_id] = (counts[i.ambassadeur_id] || 0) + 1;
    });
    return counts;
  }, [inschrijvingen]);

  // Stats
  const stats = useMemo(() => {
    const active = ambassadeurs.filter((a) => a.is_active).length;
    const ingeschreven = inschrijvingen.filter((i) => i.status === "ingeschreven").length;
    const uitgenodigd = inschrijvingen.filter((i) => i.status === "uitgenodigd").length;
    const bevestigd = inschrijvingen.filter((i) => i.status === "bevestigd").length;
    return { active, ingeschreven, uitgenodigd, bevestigd };
  }, [ambassadeurs, inschrijvingen]);

  // Filtered list
  const filtered = useMemo(() => {
    return ambassadeurs.filter((a) => {
      const q = search.toLowerCase();
      if (q && !a.full_name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false;
      if (statusFilter === "actief" && !a.is_active) return false;
      if (statusFilter === "inactief" && a.is_active) return false;
      if (statusFilter === "pending") {
        return (pendingCounts[a.id] ?? 0) > 0;
      }
      if (statusFilter === "bevestigd") {
        const pending = pendingCounts[a.id] ?? 0;
        const confirmed = confirmedCounts[a.id] ?? 0;
        return pending === 0 && confirmed > 0;
      }
      return true;
    });
  }, [ambassadeurs, search, statusFilter, pendingCounts, confirmedCounts]);

  const handleSave = useCallback(async (amb: Partial<Ambassadeur> & { full_name: string; email: string }) => {
    try {
      await upsertAmbassadeur.mutateAsync(amb);
      toast.success(amb.id ? "Ambassadeur bijgewerkt" : "Ambassadeur toegevoegd");
      setDialogOpen(false);
      setEditing(null);
    } catch {
      toast.error("Fout bij opslaan");
    }
  }, [upsertAmbassadeur]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteAmbassadeur.mutateAsync({ id: deleteTarget.id, name: deleteTarget.full_name });
      toast.success("Ambassadeur verwijderd");
      setDeleteTarget(null);
    } catch (err: any) {
      if (err?.code === "23503") {
        toast.error("Kan niet verwijderen: ambassadeur heeft nog inschrijvingen");
      } else {
        toast.error("Fout bij verwijderen");
      }
    }
  }, [deleteTarget, deleteAmbassadeur]);

  const handleStatusChange = useCallback(async (inschrijvingId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "bevestigd") updates.bevestigd_op = new Date().toISOString();
      const { error } = await supabase.from("event_inschrijvingen").update(updates).eq("id", inschrijvingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["event_inschrijvingen_all"] });
      toast.success(`Status gewijzigd naar ${newStatus}`);
    } catch {
      toast.error("Fout bij status wijzigen");
    }
  }, [queryClient]);

  const handleEdit = useCallback((a: Ambassadeur) => { setEditing(a); setDialogOpen(true); }, []);
  const handleDeleteClick = useCallback((a: Ambassadeur) => setDeleteTarget(a), []);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Ambassadeurs</h1>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <>
                <Button variant="outline" onClick={handleRotateBulk} disabled={rotatingLinks || sendingLinks}>
                  <RefreshCw className="h-4 w-4 mr-1" /> {rotatingLinks ? "Vernieuwen..." : `Links vernieuwen (${selectedIds.size})`}
                </Button>
                <Button variant="outline" onClick={handleSendPortalLinks} disabled={sendingLinks || rotatingLinks}>
                  <Send className="h-4 w-4 mr-1" /> {sendingLinks ? "Versturen..." : `Portaallinks versturen (${selectedIds.size})`}
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Ambassadeur toevoegen
            </Button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Actieve ambassadeurs"
          value={stats.active}
          icon={Users}
          active={statusFilter === "actief"}
          onClick={() => setStatusFilter(statusFilter === "actief" ? "alle" : "actief")}
        />
        <StatCard
          label="Nieuwe inschrijvingen"
          value={stats.ingeschreven}
          icon={Clock}
          active={statusFilter === "pending"}
          onClick={() => setStatusFilter(statusFilter === "pending" ? "alle" : "pending")}
        />
        <StatCard
          label="Uitgenodigd"
          value={stats.uitgenodigd}
          icon={Mail}
          active={statusFilter === "pending"}
          onClick={() => setStatusFilter(statusFilter === "pending" ? "alle" : "pending")}
        />
        <StatCard
          label="Bevestigd totaal"
          value={stats.bevestigd}
          icon={CheckCircle2}
          active={statusFilter === "bevestigd"}
          onClick={() => setStatusFilter(statusFilter === "bevestigd" ? "alle" : "bevestigd")}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Zoek op naam of email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            <SelectItem value="actief">Actief</SelectItem>
            <SelectItem value="inactief">Inactief</SelectItem>
            <SelectItem value="pending">Pending acties</SelectItem>
            <SelectItem value="bevestigd">Volledig bevestigd</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="surface-card p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : ambassadeurs.length === 0 ? (
        <EmptyState icon={Users} title="Nog geen ambassadeurs toegevoegd" description="Voeg je eerste ambassadeur toe." actionLabel="Ambassadeur toevoegen" onAction={() => { setEditing(null); setDialogOpen(true); }} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {filtered.map((a) => {
              const pending = pendingCounts[a.id] ?? 0;
              const isExpanded = expandedId === a.id;
              const ambInschrijvingen = inschrijvingenByAmb[a.id] ?? [];

              return (
                <div key={a.id} className="surface-card overflow-hidden">
                  <button
                    className="w-full p-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium text-sm">{a.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {pending > 0 && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                            {pending} pending
                          </Badge>
                        )}
                        <StatusBadge status={a.is_active ? "actief" : "inactief"} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">{a.email}</p>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-3">
                      {canEdit && (
                        <div className="flex gap-1 py-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(a)}><Pencil className="h-3.5 w-3.5 mr-1" />Bewerken</Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteClick(a)}><Trash2 className="h-3.5 w-3.5 mr-1" />Verwijderen</Button>
                        </div>
                      )}
                      {ambInschrijvingen.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">Geen event-koppelingen</p>
                      ) : (
                        <div className="space-y-2 pt-2">
                          {ambInschrijvingen.map((ins) => {
                            const ev = eventMap[ins.evenement_id];
                            return (
                              <div key={ins.id} className="flex items-center justify-between gap-2 text-sm">
                                <div className="min-w-0">
                                  <Link to={`/evenementen/${ins.evenement_id}`} className="text-primary hover:underline truncate block text-xs font-medium">
                                    {ev?.name ?? "Onbekend event"}
                                  </Link>
                                  <span className="text-xs text-muted-foreground">{ev?.date ? new Date(ev.date).toLocaleDateString("nl-BE", { day: "numeric", month: "short" }) : ""}</span>
                                </div>
                                {canEdit ? (
                                  <Select value={ins.status} onValueChange={(v) => handleStatusChange(ins.id, v)}>
                                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge className={`${statusColor(ins.status)} text-xs`}>{ins.status}</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block surface-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {canEdit && <th className="px-4 py-3 w-8"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} /></th>}
                  <th className="px-4 py-3 font-medium text-muted-foreground w-8"></th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Naam</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Afdeling</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Events</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Pending</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Portaallink</th>
                  {canEdit && <th className="px-4 py-3 font-medium text-muted-foreground text-right">Acties</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((a) => {
                  const pending = pendingCounts[a.id] ?? 0;
                  const confirmed = confirmedCounts[a.id] ?? 0;
                  const isExpanded = expandedId === a.id;
                  const ambInschrijvingen = inschrijvingenByAmb[a.id] ?? [];

                  return (
                    <Fragment key={a.id}>
                      <tr
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : a.id)}
                      >
                        {canEdit && <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.has(a.id)} onCheckedChange={() => toggleSelected(a.id)} /></td>}
                        <td className="px-4 py-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </td>
                        <td className="px-4 py-3 font-medium">{a.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.department || "—"}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{confirmed}</td>
                        <td className="px-4 py-3">
                          {pending > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {pending} pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={a.is_active ? "actief" : "inactief"} /></td>
                        <td className="px-4 py-3"><TokenValidityBadge expires={a.token_expires_at} /></td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Portaallink ${a.full_name} kopiëren`} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/ambassadeur-portaal?token=${(a as any).access_token}`); toast.success("Persoonlijke portaallink gekopieerd"); }}><Link2 className="h-3.5 w-3.5" /></Button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label={`Portaallink ${a.full_name} vernieuwen`}
                                    onClick={() => handleRotateOne(a)}
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Link vernieuwen</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label={`Portaallink naar ${a.full_name} sturen`}
                                    onClick={async () => {
                                      const token = await ensureFreshToken(a);
                                      if (!token) {
                                        toast.error("Geen portaaltoken beschikbaar");
                                        return;
                                      }
                                      const wasExpired = tokenValidity(a.token_expires_at).variant === "expired" || !a.access_token;
                                      if (wasExpired) queryClient.invalidateQueries({ queryKey: ["ambassadeurs"] });
                                      try {
                                        const result = await sendEmail({
                                          to: a.email,
                                          subject: "Elia Campus Events — Ambassadeur Portaal",
                                          html: buildPortalLinkEmail(a.full_name, `${window.location.origin}/ambassadeur-portaal?token=${token}`),
                                        });
                                        if (result.success) {
                                          toast.success(`Portaallink verzonden naar ${a.full_name}`);
                                        } else {
                                          toast.error(result.error ?? "Fout bij versturen");
                                        }
                                      } catch {
                                        toast.error("Fout bij versturen");
                                      }
                                    }}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Portaallink naar {a.full_name} sturen</TooltipContent>
                              </Tooltip>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${a.full_name} bewerken`} onClick={() => handleEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`${a.full_name} verwijderen`} onClick={() => handleDeleteClick(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={canEdit ? 10 : 8} className="bg-muted/20 px-8 py-3">
                            {ambInschrijvingen.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Geen event-koppelingen</p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs text-muted-foreground">
                                    <th className="pb-2 font-medium">Event</th>
                                    <th className="pb-2 font-medium">Datum</th>
                                    <th className="pb-2 font-medium">Status</th>
                                    {canEdit && <th className="pb-2 font-medium">Wijzig status</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                  {ambInschrijvingen.map((ins) => {
                                    const ev = eventMap[ins.evenement_id];
                                    return (
                                      <tr key={ins.id}>
                                        <td className="py-2">
                                          <Link to={`/evenementen/${ins.evenement_id}`} className="text-primary hover:underline font-medium">
                                            {ev?.name ?? "Onbekend event"}
                                          </Link>
                                        </td>
                                        <td className="py-2 text-muted-foreground">
                                          {ev?.date ? new Date(ev.date).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                                        </td>
                                        <td className="py-2">
                                          <Badge className={`${statusColor(ins.status)} text-xs`}>{ins.status}</Badge>
                                        </td>
                                        {canEdit && (
                                          <td className="py-2">
                                            <Select value={ins.status} onValueChange={(v) => handleStatusChange(ins.id, v)}>
                                              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                              </SelectContent>
                                            </Select>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Geen ambassadeurs gevonden.</p>
            )}
          </div>
        </>
      )}

      <AmbassadeurFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}
        ambassadeur={editing}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={deleteTarget?.full_name ?? ""}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Ambassadeurs importeren"
        columns={AMB_IMPORT_COLUMNS}
        templateFilename="ambassadeurs_template.xlsx"
        duplicateCheck={{ keys: ["email"], existingData: ambassadeurs.map((a) => ({ email: a.email })) }}
        onImport={async (rows) => {
          for (const row of rows) {
            await upsertAmbassadeur.mutateAsync({
              full_name: row.full_name,
              email: row.email,
              phone: row.phone || "",
              department: row.department || "",
              notes: row.notes || "",
              is_active: true,
            });
          }
        }}
      />
    </div>
  );
}
