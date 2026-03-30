import { useGetPipelineStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Film, Download, Send, AlertTriangle, Clock } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetPipelineStats({ query: { refetchInterval: 10000 } });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-b-2 border-primary animate-spin" />
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">System Overview</h2>
        <p className="text-muted-foreground mt-1 tracking-wide">Real-time metrics from the Nexus automated distribution matrix.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Tracked" value={stats.total} icon={<Film />} />
        <StatCard title="Downloaded" value={stats.downloaded} icon={<Download />} color="text-cyan-400" glow="shadow-[0_0_20px_rgba(0,255,255,0.05)]" />
        <StatCard title="Distributed" value={stats.sent} icon={<Send />} color="text-green-400" glow="shadow-[0_0_20px_rgba(34,197,94,0.05)]" />
        <StatCard title="Anomalies" value={stats.failed} icon={<AlertTriangle />} color="text-red-400" glow="shadow-[0_0_20px_rgba(239,68,68,0.05)]" />
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-display font-semibold flex items-center gap-3">
            <Clock className="text-primary w-5 h-5" /> Recent Matrix Activity
          </h3>
        </div>
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl">
          <CardContent className="p-0">
            {stats.recentActivity.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No recent activity detected.</div>
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
                        <div className="text-sm text-muted-foreground">Episode {ep.episode}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <StatusBadge status={ep.status} />
                      <span className="text-xs text-muted-foreground font-mono bg-black/40 px-2 py-1 rounded">
                        {format(new Date(ep.createdAt), "HH:mm:ss")}
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

function StatCard({ title, value, icon, color = "text-primary", glow = "" }: any) {
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
