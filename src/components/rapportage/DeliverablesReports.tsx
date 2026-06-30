import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

interface ContractWithOrg {
  id: string;
  value: number | null;
  organisatie_id: string | null;
  start_date: string;
  end_date: string;
  organisaties: { name: string; type: string; parent_id: string | null; parent: { name: string } | null } | null;
}

function useContractsWithOrg() {
  return useQuery({
    queryKey: ["rapportage_contracts_with_org"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracten")
        .select("id, value, organisatie_id, start_date, end_date, organisaties:organisatie_id (name, type, parent_id, parent:parent_id (name))")
        .range(0, 9999);
      if (error) throw error;
      return (data ?? []) as unknown as ContractWithOrg[];
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

function OrgRef({ contract, contractId }: { contract: ContractWithOrg | undefined; contractId: string }) {
  const org = contract?.organisaties ?? null;
  const name = org?.name ?? "Onbekende organisatie";
  return (
    <Link to={`/contracten/${contractId}`} className="hover:underline">
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <span className="font-medium">{name}</span>
        {org?.parent_id && <Badge variant="secondary" className="text-[10px]">Campus</Badge>}
        {org && <Badge variant="outline" className="text-[10px]">{ORGANISATIE_TYPE_LABELS[org.type] || org.type}</Badge>}
      </span>
      {org?.parent?.name && (
        <span className="text-xs text-muted-foreground block mt-0.5">onder {org.parent.name}</span>
      )}
    </Link>
  );
}

// ===== Kaart: Open tegenprestaties — gegroepeerd per partner (organisatie) =====
export function OpenDeliverablesCard() {
  const { data: all = [], isLoading } = useAllDeliverables();
  const { data: contracten = [] } = useContractsWithOrg();
  const contractById = useMemo(() => new Map(contracten.map((c) => [c.id, c])), [contracten]);

  const open = useMemo(() => all.filter((d) => d.status === "te leveren"), [all]);
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = open.filter((d) => d.deadline && d.deadline < today).length;

  const grouped = useMemo(() => {
    const groups = new Map<string, { key: string; name: string; type: string | null; parentName: string | null; isCampus: boolean; contractId: string; rows: DeliverableRow[] }>();
    open.forEach((d) => {
      const c = contractById.get(d.contract_id);
      const org = c?.organisaties ?? null;
      const key = c?.organisatie_id ?? `__unknown_${d.contract_id}`;
      const name = org?.name ?? "Onbekende organisatie";
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name,
          type: org?.type ?? null,
          parentName: org?.parent?.name ?? null,
          isCampus: !!org?.parent_id,
          contractId: d.contract_id,
          rows: [],
        });
      }
      groups.get(key)!.rows.push(d);
    });
    const arr = Array.from(groups.values());
    arr.forEach((g) =>
      g.rows.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      })
    );
    arr.sort((a, b) => (b.rows.length - a.rows.length) || a.name.localeCompare(b.name));
    return arr;
  }, [open, contractById]);

  const onExport = () => {
    const rows = open.map((d) => {
      const c = contractById.get(d.contract_id);
      const org = c?.organisaties ?? null;
      return {
        organisatie: org?.name ?? "Onbekende organisatie",
        organisatie_type: org?.type ? (ORGANISATIE_TYPE_LABELS[org.type] || org.type) : "",
        type: d.deliverable_types?.label ?? d.type,
        omschrijving: d.omschrijving ?? "",
        deadline: d.deadline ?? "",
        over_datum: d.deadline && d.deadline < today ? "ja" : "nee",
      };
    });
    exportCsv("open-tegenprestaties", rows);
  };

  return (
    <CardShell title={`Open tegenprestaties (${open.length}${overdueCount > 0 ? `, ${overdueCount} over datum` : ""})`} onExport={onExport}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Geen open tegenprestaties.</p>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {grouped.map((g) => (
            <div key={g.key}>
              <Link to={`/contracten/${g.contractId}`} className="hover:underline">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold">{g.name}</span>
                  {g.isCampus && <Badge variant="secondary" className="text-[10px]">Campus</Badge>}
                  {g.type && <Badge variant="outline" className="text-[10px]">{ORGANISATIE_TYPE_LABELS[g.type] || g.type}</Badge>}
                  <span className="text-xs text-muted-foreground ml-1">{g.rows.length}</span>
                </div>
                {g.parentName && (
                  <span className="text-[11px] text-muted-foreground block">onder {g.parentName}</span>
                )}
              </Link>
              <ul className="mt-1 divide-y divide-border/60 border-l border-border/60 pl-3 ml-0.5">
                {g.rows.map((d) => {
                  const overdue = d.deadline && d.deadline < today;
                  const label = d.deliverable_types?.label ?? d.type;
                  return (
                    <li key={d.id} className="py-1.5 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 text-sm leading-snug">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1.5">{label}</span>
                        {d.omschrijving && <span>{d.omschrijving}</span>}
                      </div>
                      {d.deadline && (
                        <span className={`text-[11px] shrink-0 tabular-nums ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                          {fmtDate(d.deadline)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

// ===== Kaart: Budget vs geleverde waarde (periode op contract-looptijd) =====
export function BudgetVsValueCard({ rangeStart, rangeEnd }: { rangeStart: Date; rangeEnd: Date }) {
  const { data: all = [] } = useAllDeliverables();
  const { data: contracten = [] } = useContractsWithOrg();

  const byContract = useMemo(() => {
    const map = new Map<string, DeliverableRow[]>();
    all.forEach((d) => {
      const arr = map.get(d.contract_id) ?? [];
      arr.push(d);
      map.set(d.contract_id, arr);
    });
    return map;
  }, [all]);

  const rows = useMemo(() => {
    return contracten
      .filter((c) => {
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

  const onExport = () => {
    exportCsv(
      "budget-vs-geleverde-waarde",
      rows.map((r) => ({
        organisatie: r.contract.organisaties?.name ?? "Onbekende organisatie",
        contractwaarde: r.contract.value ?? "",
        geleverde_waarde: r.sumValue ?? "",
        dekking: `${r.withValue}/${r.total}`,
      })),
    );
  };

  return (
    <CardShell title="Budget vs geleverde waarde" onExport={onExport}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Geen contracten in deze periode.</p>
      ) : (
        <ul className="divide-y divide-border max-h-[420px] overflow-y-auto pr-1">
          {rows.map((r) => (
            <li key={r.contract.id} className="py-2.5">
              <OrgRef contract={r.contract} contractId={r.contract.id} />
              <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums">
                <span>Contractwaarde: <span className="text-foreground font-medium">{r.contract.value != null ? `€${r.contract.value.toLocaleString("nl-BE")}` : "—"}</span></span>
                <span>
                  Geleverde waarde:{" "}
                  {r.sumValue == null ? (
                    <span className="italic">nog geen waarde toegekend</span>
                  ) : (
                    <span className="text-foreground font-medium">€{r.sumValue.toLocaleString("nl-BE")}</span>
                  )}
                </span>
                {r.total > 0 && (
                  <span>{r.withValue}/{r.total} tegenprestaties met waarde ingevuld</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

// ===== Kaart: Waardering per type =====
export function RatingByTypeCard({ rangeStart, rangeEnd }: { rangeStart: Date; rangeEnd: Date }) {
  const { data: all = [] } = useAllDeliverables();
  const { data: contracten = [] } = useContractsWithOrg();
  const contractById = useMemo(() => new Map(contracten.map((c) => [c.id, c])), [contracten]);

  const scored = useMemo(() => {
    return all.filter((d) => {
      if (d.waarde_score == null) return false;
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

  const rows = useMemo(() => {
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

  const onExport = () => exportCsv("waardering-per-type", rows.map((r) => ({ type: r.label, gemiddelde: r.avg.toFixed(1), aantal: r.n })));

  return (
    <CardShell title="Waardering per type" onExport={rows.length > 0 ? onExport : undefined}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nog geen beoordeelde tegenprestaties in deze periode.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
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
  );
}

// Backwards-compatible export: rendert alle drie kaarten.
export function DeliverablesReportCards({ rangeStart, rangeEnd }: { rangeStart: Date; rangeEnd: Date }) {
  return (
    <>
      <OpenDeliverablesCard />
      <BudgetVsValueCard rangeStart={rangeStart} rangeEnd={rangeEnd} />
      <RatingByTypeCard rangeStart={rangeStart} rangeEnd={rangeEnd} />
    </>
  );
}