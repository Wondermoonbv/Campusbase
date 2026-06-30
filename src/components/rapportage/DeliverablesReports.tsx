import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { OrganisatieLabel } from "@/components/organisaties/OrganisatieLabel";
import { useScholen } from "@/hooks/useScholen";
import { useContracten } from "@/hooks/useContracten";
import { writeAuditLog } from "@/lib/audit";
import { ORGANISATIE_TYPE_LABELS } from "@/lib/event-labels";
import { Badge } from "@/components/ui/badge";

interface DeliverableRow {
  id: string;
  contract_id: string;
  type: string;
  status: "te leveren" | "geleverd" | "n.v.t.";
  omschrijving: string | null;
  aantal: number | null;
  kanaal: string | null;
  deadline: string | null;
  geleverd_op: string | null;
  geschatte_waarde: number | null;
  waarde_score: number | null;
  deliverable_types: { label: string; volgorde: number } | null;
}

function useAllDeliverables() {
  return useQuery({
    queryKey: ["all_contract_deliverables"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_deliverables")
        .select("*, deliverable_types(label, volgorde)")
        .range(0, 9999);
      if (error) throw error;
      return (data ?? []) as unknown as DeliverableRow[];
    },
  });
}

function exportCsv(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return s.includes(";") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = headers.join(";") + "\n" + rows.map((r) => headers.map((h) => esc(r[h])).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
  writeAuditLog({ action: "export", entity_type: "export", entity_id: filename, entity_name: `Rapportage: ${filename}`, changes: { row_count: rows.length, format: "csv" } });
}

function CardShell({ title, onExport, children }: { title: string; onExport?: () => void; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-sm sm:text-base font-semibold">{title}</h2>
        {onExport && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExport} title="Export CSV">
            <span className="text-[10px] font-bold">CSV</span>
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
}

function OrgRef({ organisatieId, contractId }: { organisatieId: string | null | undefined; contractId: string }) {
  const { scholen } = useScholen();
  const org = organisatieId ? scholen.find((s) => s.id === organisatieId) : null;
  return (
    <Link to={`/contracten/${contractId}`} className="hover:underline">
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <span className="font-medium">{org?.name ?? "—"}</span>
        {org?.parent_id && <Badge variant="secondary" className="text-[10px]">Campus</Badge>}
        {org && <Badge variant="outline" className="text-[10px]">{ORGANISATIE_TYPE_LABELS[org.type] || org.type}</Badge>}
      </span>
      <OrganisatieLabel organisatie={org ?? null} />
    </Link>
  );
}

export function DeliverablesReportCards({ rangeStart, rangeEnd }: { rangeStart: Date; rangeEnd: Date }) {
  const { data: all = [], isLoading } = useAllDeliverables();
  const { contracten } = useContracten();
  const { scholen } = useScholen();

  const contractById = useMemo(() => new Map(contracten.map((c) => [c.id, c])), [contracten]);
  const orgById = useMemo(() => new Map(scholen.map((s) => [s.id, s])), [scholen]);

  // ===== Kaart A — Open tegenprestaties (globaal, geen periode-filter) =====
  const open = useMemo(() => all.filter((d) => d.status === "te leveren"), [all]);
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = open.filter((d) => d.deadline && d.deadline < today).length;

  const openGrouped = useMemo(() => {
    const groups = new Map<string, { label: string; volgorde: number; rows: DeliverableRow[] }>();
    open.forEach((d) => {
      const label = d.deliverable_types?.label ?? d.type;
      const volgorde = d.deliverable_types?.volgorde ?? 999;
      const key = d.type;
      if (!groups.has(key)) groups.set(key, { label, volgorde, rows: [] });
      groups.get(key)!.rows.push(d);
    });
    const arr = Array.from(groups.values()).sort((a, b) => a.volgorde - b.volgorde);
    arr.forEach((g) =>
      g.rows.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      })
    );
    return arr;
  }, [open]);

  const exportOpen = () => {
    const rows = open.map((d) => {
      const c = contractById.get(d.contract_id);
      const org = c ? orgById.get(c.organisatie_id) : null;
      return {
        type: d.deliverable_types?.label ?? d.type,
        omschrijving: d.omschrijving ?? "",
        organisatie: org?.name ?? "",
        deadline: d.deadline ?? "",
        over_datum: d.deadline && d.deadline < today ? "ja" : "nee",
      };
    });
    exportCsv("open-tegenprestaties", rows);
  };

  // ===== Kaart B — Budget vs geleverde waarde (periode op contract-looptijd) =====
  const byContract = useMemo(() => {
    const map = new Map<string, DeliverableRow[]>();
    all.forEach((d) => {
      const arr = map.get(d.contract_id) ?? [];
      arr.push(d);
      map.set(d.contract_id, arr);
    });
    return map;
  }, [all]);

  const budgetRows = useMemo(() => {
    return contracten
      .filter((c) => {
        const ds = byContract.get(c.id);
        if (!ds || ds.length === 0) return false;
        const start = new Date(c.start_date);
        const end = new Date(c.end_date);
        return start <= rangeEnd && end >= rangeStart;
      })
      .map((c) => {
        const ds = byContract.get(c.id) ?? [];
        const withValue = ds.filter((d) => d.geschatte_waarde != null);
        const sum = withValue.reduce((s, d) => s + (d.geschatte_waarde ?? 0), 0);
        return {
          contract: c,
          total: ds.length,
          withValue: withValue.length,
          sumValue: withValue.length > 0 ? sum : null,
        };
      })
      .sort((a, b) => (b.sumValue ?? -1) - (a.sumValue ?? -1));
  }, [contracten, byContract, rangeStart, rangeEnd]);

  const exportBudget = () => {
    const rows = budgetRows.map((r) => {
      const org = orgById.get(r.contract.organisatie_id);
      return {
        organisatie: org?.name ?? "",
        contractwaarde: r.contract.value ?? "",
        geleverde_waarde: r.sumValue ?? "",
        dekking: `${r.withValue}/${r.total}`,
      };
    });
    exportCsv("budget-vs-geleverde-waarde", rows);
  };

  // ===== Kaart C — Waardering per type (periode op geleverd_op of contract-looptijd) =====
  const scored = useMemo(() => {
    return all.filter((d) => {
      if (d.waarde_score == null) return null;
      if (d.geleverd_op) {
        const dd = new Date(d.geleverd_op);
        return dd >= rangeStart && dd <= rangeEnd;
      }
      const c = contractById.get(d.contract_id);
      if (!c) return false;
      const start = new Date(c.start_date);
      const end = new Date(c.end_date);
      return start <= rangeEnd && end >= rangeStart;
    });
  }, [all, contractById, rangeStart, rangeEnd]);

  const ratingRows = useMemo(() => {
    const map = new Map<string, { label: string; volgorde: number; sum: number; n: number }>();
    scored.forEach((d) => {
      const label = d.deliverable_types?.label ?? d.type;
      const volgorde = d.deliverable_types?.volgorde ?? 999;
      const cur = map.get(d.type) ?? { label, volgorde, sum: 0, n: 0 };
      cur.sum += d.waarde_score ?? 0;
      cur.n += 1;
      map.set(d.type, cur);
    });
    return Array.from(map.values())
      .map((r) => ({ ...r, avg: r.sum / r.n }))
      .sort((a, b) => b.avg - a.avg);
  }, [scored]);

  const exportRating = () => {
    exportCsv("waardering-per-type", ratingRows.map((r) => ({ type: r.label, gemiddelde: r.avg.toFixed(1), aantal: r.n })));
  };

  return (
    <>
      <CardShell title={`Open tegenprestaties (${open.length}, waarvan ${overdueCount} over datum)`} onExport={exportOpen}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laden...</p>
        ) : openGrouped.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Geen open tegenprestaties.</p>
        ) : (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {openGrouped.map((g) => (
              <div key={g.label}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{g.label} ({g.rows.length})</h3>
                <ul className="divide-y divide-border">
                  {g.rows.map((d) => {
                    const overdue = d.deadline && d.deadline < today;
                    const c = contractById.get(d.contract_id);
                    return (
                      <li key={d.id} className="py-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          {d.omschrijving && <p className="text-sm">{d.omschrijving}</p>}
                          {c && <OrgRef organisatieId={c.organisatie_id} contractId={c.id} />}
                        </div>
                        <div className={`text-xs shrink-0 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {d.deadline ? fmtDate(d.deadline) : <span className="opacity-60">Geen deadline</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardShell>

      <CardShell title="Budget vs geleverde waarde" onExport={exportBudget}>
        {budgetRows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Geen contracten met tegenprestaties in deze periode.</p>
        ) : (
          <ul className="divide-y divide-border max-h-[420px] overflow-y-auto pr-1">
            {budgetRows.map((r) => (
              <li key={r.contract.id} className="py-2.5">
                <OrgRef organisatieId={r.contract.organisatie_id} contractId={r.contract.id} />
                <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums">
                  <span>Contractwaarde: <span className="text-foreground font-medium">{r.contract.value != null ? `€${r.contract.value.toLocaleString("nl-BE")}` : "—"}</span></span>
                  <span>Geleverde waarde: {r.sumValue == null ? <span className="italic">geen waarde toegekend</span> : <span className="text-foreground font-medium">€{r.sumValue.toLocaleString("nl-BE")}</span>}</span>
                  <span>{r.withValue}/{r.total} tegenprestaties met waarde ingevuld</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardShell>

      <CardShell title="Waardering per type" onExport={exportRating}>
        {ratingRows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nog geen beoordeelde tegenprestaties in deze periode.</p>
        ) : (
          <ul className="divide-y divide-border">
            {ratingRows.map((r) => (
              <li key={r.label} className="py-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  <span className="text-foreground font-semibold">{r.avg.toFixed(1)}</span> / 5 · {r.n} beoordeeld
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardShell>
    </>
  );
}