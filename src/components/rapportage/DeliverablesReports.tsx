import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { writeAuditLog } from "@/lib/audit";
import { ORGANISATIE_TYPE_LABELS } from "@/lib/event-labels";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

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

// ===== Kaart: Open tegenprestaties — compact overzicht open vs totaal =====
export function OpenDeliverablesCard({ rangeStart, rangeEnd }: { rangeStart: Date; rangeEnd: Date }) {
  const { data: all = [], isLoading } = useQuery({
    queryKey: ["rapportage_deliverables_with_contract"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_deliverables")
        .select("id, status, contracten!inner(start_date, end_date)")
        .range(0, 9999);
      if (error) { console.error(error); return [] as any[]; }
      return (data ?? []) as any[];
    },
  });

  const inScope = useMemo(() => {
    return (all as any[]).filter((d) => {
      const c = d.contracten;
      if (!c?.start_date || !c?.end_date) return false;
      const start = new Date(c.start_date);
      const end = new Date(c.end_date);
      return start <= rangeEnd && end >= rangeStart;
    });
  }, [all, rangeStart, rangeEnd]);

  const total = inScope.length;
  const open = inScope.filter((d) => d.status === "te leveren").length;
  const delivered = inScope.filter((d) => d.status === "geleverd").length;
  const deliveredPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const openPct = total > 0 ? Math.round((open / total) * 100) : 0;

  return (
    <Link to="/tegenprestaties" className="block">
      <div className="surface-card p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-semibold">Open tegenprestaties</h2>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laden...</p>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground italic">Geen tegenprestaties in deze periode.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-semibold tabular-nums">{open}</span>
              <span className="text-base text-muted-foreground">van {total}</span>
              <span className="text-sm text-muted-foreground">openstaand</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${deliveredPct}%` }}
                title={`Geleverd: ${deliveredPct}%`}
              />
              <div
                className="h-full bg-muted-foreground/30 transition-all"
                style={{ width: `${openPct}%` }}
                title={`Openstaand: ${openPct}%`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {open} openstaand · {delivered} geleverd
              {total - open - delivered > 0 && ` · ${total - open - delivered} overig`}
            </p>
          </div>
        )}
      </div>
    </Link>
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