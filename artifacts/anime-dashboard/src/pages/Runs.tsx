import { useListRuns } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Zap, History } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  completed: {
    label: "Terminé",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/30",
  },
  running: {
    label: "En cours",
    icon: <Clock className="w-4 h-4 animate-spin" />,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
  },
  failed: {
    label: "Échoué",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
  },
};

const TRIGGER_CONFIG: Record<string, { label: string; color: string }> = {
  manual: { label: "Manuel", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  scheduler: { label: "Planifié", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  api: { label: "API", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function Runs() {
  const { data: runs = [], isLoading } = useListRuns({ limit: 50 }, { query: { refetchInterval: 15000 } });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-b-2 border-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Historique des runs</h2>
        <p className="text-muted-foreground mt-1 tracking-wide">Chaque exécution de la pipeline avec ses statistiques détaillées.</p>
      </div>

      {runs.length === 0 ? (
        <Card className="bg-card/40 border-border/30">
          <CardContent className="p-12 text-center">
            <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun run enregistré pour l'instant.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Lancez la pipeline pour voir l'historique apparaître ici.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {runs.map(run => {
            const status = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.completed!;
            const trigger = TRIGGER_CONFIG[run.trigger] ?? TRIGGER_CONFIG.manual!;
            const successRate = run.episodesFound > 0
              ? Math.round((run.episodesDownloaded / run.episodesFound) * 100)
              : 100;

            return (
              <Card key={run.id} className="bg-card/60 backdrop-blur-xl border-border/50 hover:border-white/20 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icône statut */}
                    <div className={`p-2 rounded-xl border shrink-0 ${status.bg} ${status.color}`}>
                      {status.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-3 mb-3">
                        {/* Statut */}
                        <span className={`text-sm font-mono font-semibold ${status.color}`}>
                          {status.label}
                        </span>

                        {/* Déclencheur */}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono border ${trigger.color}`}>
                          {trigger.label}
                        </span>

                        {/* Durée */}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono border border-border/30 text-muted-foreground bg-black/30 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {formatDuration(run.durationSeconds ?? null)}
                        </span>
                      </div>

                      {/* Métriques */}
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-3">
                        <Metric label="Détectés" value={run.episodesFound} color="text-foreground" />
                        <Metric label="Téléchargés" value={run.episodesDownloaded} color="text-cyan-400" />
                        <Metric label="Erreurs" value={run.episodesFailed} color={run.episodesFailed > 0 ? "text-red-400" : "text-muted-foreground"} />
                        <Metric label="Taux succès" value={`${successRate}%`} color={successRate === 100 ? "text-green-400" : successRate > 75 ? "text-yellow-400" : "text-red-400"} />
                      </div>

                      {/* Barre de progression */}
                      {run.episodesFound > 0 && (
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-primary rounded-full transition-all"
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                      )}

                      {/* Dates */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-mono">
                        <span>
                          {format(new Date(run.startedAt), "d MMM yyyy, HH:mm:ss", { locale: fr })}
                        </span>
                        <span className="text-muted-foreground/40">
                          {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-display font-bold text-xl ${color}`}>{value}</p>
    </div>
  );
}
