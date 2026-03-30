import { useGetPipelineStats, useGetPipelineActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Download, Send, AlertTriangle, Clock, BarChart2, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS: Record<string, string> = {
  sent: "#22c55e",
  downloaded: "#06b6d4",
  pending: "#a855f7",
  failed: "#ef4444",
  downloading: "#f59e0b",
  sending: "#3b82f6",
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetPipelineStats({ query: { refetchInterval: 10000 } });
  const { data: activity = [] } = useGetPipelineActivity({ days: 14 }, { query: { refetchInterval: 60000 } });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-b-2 border-primary animate-spin" />
      </div>
    );
  }
  if (!stats) return null;

  const pieData = [
    { name: "Envoyés", value: stats.sent, key: "sent" },
    { name: "Téléchargés", value: stats.downloaded, key: "downloaded" },
    { name: "En attente", value: stats.pending, key: "pending" },
    { name: "Erreurs", value: stats.failed, key: "failed" },
  ].filter(d => d.value > 0);

  const activityShort = activity.map(d => ({
    ...d,
    date: format(new Date(d.date), "d MMM", { locale: fr }),
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Vue d'ensemble</h2>
        <p className="text-muted-foreground mt-1 tracking-wide">Métriques en temps réel du système de distribution automatisée.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total suivi" value={stats.total} icon={<Film />} />
        <StatCard title="Téléchargés" value={stats.downloaded} icon={<Download />} color="text-cyan-400" glow="shadow-[0_0_20px_rgba(0,255,255,0.05)]" />
        <StatCard title="Envoyés" value={stats.sent} icon={<Send />} color="text-green-400" glow="shadow-[0_0_20px_rgba(34,197,94,0.05)]" />
        <StatCard title="Erreurs" value={stats.failed} icon={<AlertTriangle />} color="text-red-400" glow="shadow-[0_0_20px_rgba(239,68,68,0.05)]" />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activité 14 jours */}
        <Card className="lg:col-span-2 bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 font-display text-lg tracking-wide">
              <TrendingUp className="text-primary w-5 h-5" /> Activité — 14 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={activityShort} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: 12 }}
                  labelStyle={{ color: "#fff", fontWeight: "bold", marginBottom: 4 }}
                />
                <Area type="monotone" dataKey="sent" name="Envoyés" stroke="#22c55e" fill="url(#gradSent)" strokeWidth={2} />
                <Area type="monotone" dataKey="downloaded" name="Téléchargés" stroke="#06b6d4" fill="url(#gradDl)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" name="Erreurs" stroke="#ef4444" fill="url(#gradFail)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par statut */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 font-display text-lg tracking-wide">
              <BarChart2 className="text-secondary w-5 h-5" /> Répartition
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={PIE_COLORS[entry.key] ?? "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: 12 }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histogramme par jour */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 font-display text-lg tracking-wide">
            <BarChart2 className="text-cyan-400 w-5 h-5" /> Téléchargements par jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={activityShort} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: 12 }}
              />
              <Bar dataKey="sent" name="Envoyés" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="downloaded" name="Téléchargés" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" name="Erreurs" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Activité récente */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-display font-semibold flex items-center gap-3">
            <Clock className="text-primary w-5 h-5" /> Activité récente
          </h3>
        </div>
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl">
          <CardContent className="p-0">
            {stats.recentActivity.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">Aucune activité récente détectée.</div>
            ) : (
              <div className="divide-y divide-border/30">
                {stats.recentActivity.map(ep => (
                  <div key={ep.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center font-display font-bold text-muted-foreground group-hover:text-primary transition-colors">
                        S{ep.season}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-lg">{ep.animeName}</div>
                        <div className="text-sm text-muted-foreground">Épisode {ep.episode}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <StatusBadge status={ep.status} />
                      <span className="text-xs text-muted-foreground font-mono bg-black/40 px-2 py-1 rounded">
                        {format(new Date(ep.createdAt), "HH:mm:ss", { locale: fr })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = "text-primary", glow = "" }: { title: string; value: number; icon: React.ReactNode; color?: string; glow?: string }) {
  return (
    <Card className={`bg-card/60 backdrop-blur-xl border-border/50 hover:border-white/20 transition-all duration-300 ${glow}`}>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">{title}</p>
          <p className={`text-4xl font-display font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-4 rounded-2xl bg-black/40 border border-white/5 ${color}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
