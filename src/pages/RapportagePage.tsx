import { useMemo } from "react";
import { mockSchools, mockEvents, mockContracts, mockParticipations } from "@/data/mockData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const CHART_COLORS = ["#0E6575", "#ef7c14", "#007BAF", "#0C8129", "#CD2E15", "#434f54"];

export default function RapportagePage() {
  // Events per type
  const eventsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    mockEvents.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  // Schools by type
  const schoolsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    mockSchools.forEach((s) => {
      counts[s.type] = (counts[s.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  // Schools by province
  const schoolsByProvince = useMemo(() => {
    const counts: Record<string, number> = {};
    mockSchools.forEach((s) => {
      counts[s.province] = (counts[s.province] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  // Contracts by status
  const contractsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    mockContracts.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  // Top schools by event participation
  const topSchools = useMemo(() => {
    const counts: Record<string, number> = {};
    mockParticipations.forEach((p) => {
      counts[p.school_id] = (counts[p.school_id] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([id, count]) => ({
        name: mockSchools.find((s) => s.id === id)?.name ?? id,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, []);

  return (
    <div className="page-container animate-fade-in-up">
      <h1 className="mb-6">Rapportage</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by type */}
        <div className="surface-card p-5">
          <h2 className="mb-4">Evenementen per type</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={eventsByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(195 14% 84%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0E6575" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Schools by type */}
        <div className="surface-card p-5">
          <h2 className="mb-4">Scholen per type</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={schoolsByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label>
                {schoolsByType.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Schools by province */}
        <div className="surface-card p-5">
          <h2 className="mb-4">Scholen per provincie</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={schoolsByProvince} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(195 14% 84%)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0E6575" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Contracts by status */}
        <div className="surface-card p-5">
          <h2 className="mb-4">Contracten per status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={contractsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label>
                {contractsByStatus.map((entry, i) => {
                  const colorMap: Record<string, string> = { actief: "#0C8129", verlopen: "#CD2E15", "in onderhandeling": "#ef7c14" };
                  return <Cell key={i} fill={colorMap[entry.name] ?? CHART_COLORS[i]} />;
                })}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top schools by participation */}
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="mb-4">Top scholen per evenementdeelname</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topSchools}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(195 14% 84%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#ef7c14" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
