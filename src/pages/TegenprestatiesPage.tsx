import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AsyncOrganisatieSelect } from "@/components/organisaties/AsyncOrganisatieSelect";
import { useDeliverableTypes } from "@/hooks/useContractDeliverables";
import { ORGANISATIE_TYPE_LABELS } from "@/lib/event-labels";
import { ClipboardCheck, ChevronLeft, ChevronRight } from "lucide-react";

type StatusOpt = "alle" | "te leveren" | "geleverd" | "n.v.t.";
const STATUS_OPTS: StatusOpt[] = ["alle", "te leveren", "geleverd", "n.v.t."];
const PAGE_SIZE = 50;

interface Row {
  id: string;
  contract_id: string;
  type: string;
  omschrijving: string | null;
  status: "te leveren" | "geleverd" | "n.v.t.";
  deadline: string | null;
  deliverable_types: { label: string } | null;
  contracten: {
    id: string;
    organisatie_id: string | null;
    organisaties: {
      name: string;
      type: string;
      parent: { name: string } | null;
    } | null;
  } | null;
}

function formatDate(d: string | null): string {
  if (!d) return "";
  return d;
}

export default function TegenprestatiesPage() {
  const qc = useQueryClient();
  const { data: types = [] } = useDeliverableTypes();

  const [statusFilter, setStatusFilter] = useState<StatusOpt>("alle");
  const [typeFilter, setTypeFilter] = useState<string>("alle");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  // Reset paging when filters change
  useEffect(() => {
    setPage(0);
  }, [statusFilter, typeFilter, orgFilter]);

  const query = useQuery({
    queryKey: ["tegenprestaties_all", statusFilter, typeFilter, orgFilter, page],
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = (supabase as any)
        .from("contract_deliverables")
        .select(
          `id, contract_id, type, omschrijving, status, deadline,
           deliverable_types(label),
           contracten!inner(id, organisatie_id, organisaties:organisatie_id(name, type, parent:parent_id(name)))`,
          { count: "exact" }
        );

      if (statusFilter !== "alle") q = q.eq("status", statusFilter);
      if (typeFilter !== "alle") q = q.eq("type", typeFilter);
      if (orgFilter && orgFilter !== "all") {
        q = q.eq("contracten.organisatie_id", orgFilter);
      }

      q = q
        .order("deadline", { ascending: true, nullsFirst: false })
        .range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Row[], count: count ?? 0 };
    },
  });

  const rows = query.data?.rows ?? [];
  const total = query.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function updateRow(id: string, patch: Partial<Row>) {
    const { error } = await (supabase as any)
      .from("contract_deliverables")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error("Opslaan mislukt");
      return;
    }
    toast.success("Opgeslagen");
    // Optimistic patch of cache
    qc.setQueryData(
      ["tegenprestaties_all", statusFilter, typeFilter, orgFilter, page],
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          rows: old.rows.map((r: Row) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        };
      }
    );
    qc.invalidateQueries({ queryKey: ["tegenprestaties_all"] });
  }

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Tegenprestaties</h1>
        <p className="text-sm text-muted-foreground">
          Werklijst van alle tegenprestaties over alle contracten heen. Wijzig
          status en deadline direct in de rij.
        </p>
      </header>

      {/* Filters */}
      <div className="surface-card p-4 flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Status
          </label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusOpt)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "alle" ? "Alle" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Type
          </label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.slug} value={t.slug}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Partner / organisatie
          </label>
          <AsyncOrganisatieSelect
            value={orgFilter}
            onValueChange={setOrgFilter}
            allOption
            allLabel="Alle organisaties"
            allValue="all"
          />
        </div>
        {(statusFilter !== "alle" || typeFilter !== "alle" || orgFilter !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setStatusFilter("alle");
              setTypeFilter("alle");
              setOrgFilter("all");
            }}
          >
            Wis filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {query.isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Geen tegenprestaties gevonden"
            description="Pas de filters aan om meer resultaten te tonen."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Omschrijving</TableHead>
                <TableHead className="w-[180px]">Status</TableHead>
                <TableHead className="w-[170px]">Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // Group rows by organisation (server-side name via relation)
                const groups = new Map<string, { name: string; type: string | null; parentName: string | null; contractId: string | null; rows: Row[] }>();
                for (const r of rows) {
                  const org = r.contracten?.organisaties;
                  const key = r.contracten?.organisatie_id ?? `__unknown_${r.id}`;
                  const name = org?.name ?? "Onbekende organisatie";
                  if (!groups.has(key)) {
                    groups.set(key, {
                      name,
                      type: org?.type ?? null,
                      parentName: org?.parent?.name ?? null,
                      contractId: r.contracten?.id ?? null,
                      rows: [],
                    });
                  }
                  groups.get(key)!.rows.push(r);
                }
                const sorted = Array.from(groups.values()).sort((a, b) =>
                  a.name.localeCompare(b.name, "nl", { sensitivity: "base" })
                );
                return sorted.flatMap((g) => [
                  <TableRow key={`h-${g.name}-${g.contractId ?? "x"}`} className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={4} className="py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {g.contractId ? (
                          <Link to={`/contracten/${g.contractId}`} className="font-semibold hover:underline">
                            {g.name}
                          </Link>
                        ) : (
                          <span className="font-semibold">{g.name}</span>
                        )}
                        {g.type && (
                          <Badge variant="secondary" className="text-[10px]">
                            {ORGANISATIE_TYPE_LABELS[g.type] ?? g.type}
                          </Badge>
                        )}
                        {g.parentName && (
                          <span className="text-xs text-muted-foreground">onder {g.parentName}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>,
                  ...g.rows.map((r) => {
                    const typeLabel = r.deliverable_types?.label ?? r.type;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{typeLabel}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[280px] truncate">
                      {r.omschrijving || "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.status}
                        onValueChange={(v) => updateRow(r.id, { status: v as Row["status"] })}
                      >
                        <SelectTrigger className="h-8 w-[160px]">
                          <SelectValue>
                            <StatusBadge status={r.status} />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="te leveren">te leveren</SelectItem>
                          <SelectItem value="geleverd">geleverd</SelectItem>
                          <SelectItem value="n.v.t.">n.v.t.</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={formatDate(r.deadline)}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, { deadline: v === "" ? null : v });
                        }}
                        className="h-8 w-[150px]"
                      />
                    </TableCell>
                      </TableRow>
                    );
                  }),
                ]);
              })()}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} tegenprestaties · pagina {page + 1} van {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Vorige
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Volgende <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}