import { useState } from "react";
import { useGetScheduler, useUpdateScheduler } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock, Bell, Tv2, List, Save, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const QUALITY_OPTIONS = [
  { value: "best", label: "Meilleure disponible" },
  { value: "1080p", label: "1080p (Full HD)" },
  { value: "720p", label: "720p (HD)" },
  { value: "480p", label: "480p (SD)" },
  { value: "worst", label: "La plus basse" },
];

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 heure" },
  { value: 120, label: "2 heures" },
  { value: 360, label: "6 heures" },
  { value: 720, label: "12 heures" },
  { value: 1440, label: "24 heures" },
];

export default function Scheduler() {
  const { data: config, isLoading } = useGetScheduler();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number | null>(null);
  const [quality, setQuality] = useState<string | null>(null);
  const [useWhitelist, setUseWhitelist] = useState<boolean | null>(null);
  const [notifyOnError, setNotifyOnError] = useState<boolean | null>(null);
  const [discordUrl, setDiscordUrl] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const updateMut = useUpdateScheduler({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/scheduler"] });
        toast({ title: "Configuration sauvegardée" });
        setDirty(false);
      },
      onError: () => toast({ title: "Échec de la sauvegarde", variant: "destructive" }),
    },
  });

  if (isLoading || !config) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-b-2 border-primary animate-spin" />
      </div>
    );
  }

  const currentEnabled = enabled ?? config.enabled;
  const currentInterval = intervalMinutes ?? config.intervalMinutes;
  const currentQuality = quality ?? config.defaultQuality;
  const currentWhitelist = useWhitelist ?? config.useWhitelist;
  const currentNotify = notifyOnError ?? config.notifyOnError;
  const currentDiscord = discordUrl ?? config.discordWebhookUrl ?? "";

  function mark(fn: () => void) {
    fn();
    setDirty(true);
  }

  function save() {
    updateMut.mutate({
      enabled: currentEnabled,
      intervalMinutes: currentInterval,
      defaultQuality: currentQuality as any,
      useWhitelist: currentWhitelist,
      notifyOnError: currentNotify,
      discordWebhookUrl: currentDiscord || null,
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Planificateur</h2>
          <p className="text-muted-foreground mt-1 tracking-wide">Configurez l'exécution automatique de la pipeline.</p>
        </div>
        <Button
          onClick={save}
          disabled={!dirty || updateMut.isPending}
          className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold px-6"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMut.isPending ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activation */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-display text-lg tracking-wide">
              <Clock className="text-primary w-5 h-5" /> Planification automatique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Activer le planificateur</p>
                <p className="text-sm text-muted-foreground">La pipeline se déclenchera automatiquement</p>
              </div>
              <Switch
                checked={currentEnabled}
                onCheckedChange={(v) => mark(() => setEnabled(v))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Intervalle d'exécution</label>
              <div className="grid grid-cols-2 gap-2">
                {INTERVAL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => mark(() => setIntervalMinutes(opt.value))}
                    className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${
                      currentInterval === opt.value
                        ? "bg-primary/20 text-primary border border-primary/50 shadow-[0_0_10px_var(--color-primary)/20]"
                        : "bg-black/30 border border-border/30 text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {config.nextRunAt && (
              <div className="bg-black/30 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Prochain run</p>
                <p className="font-mono text-primary">
                  {format(new Date(config.nextRunAt), "d MMM yyyy, HH:mm", { locale: fr })}
                </p>
              </div>
            )}
            {config.lastRunAt && (
              <div className="bg-black/30 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dernier run</p>
                <p className="font-mono text-muted-foreground">
                  {format(new Date(config.lastRunAt), "d MMM yyyy, HH:mm", { locale: fr })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Qualité vidéo */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-display text-lg tracking-wide">
              <Tv2 className="text-cyan-400 w-5 h-5" /> Qualité vidéo par défaut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Qualité appliquée à tous les téléchargements, sauf si la liste blanche la surcharge.</p>
            <div className="space-y-2">
              {QUALITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => mark(() => setQuality(opt.value))}
                  className={`w-full px-4 py-3 rounded-xl text-left font-mono text-sm transition-all flex items-center justify-between ${
                    currentQuality === opt.value
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/40"
                      : "bg-black/20 border border-border/30 text-muted-foreground hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span>{opt.label}</span>
                  {currentQuality === opt.value && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">Actif</span>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Liste blanche */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-display text-lg tracking-wide">
              <List className="text-green-400 w-5 h-5" /> Filtre par liste blanche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Utiliser la liste blanche</p>
                <p className="text-sm text-muted-foreground">Ne traite que les animes présents dans la liste blanche</p>
              </div>
              <Switch
                checked={currentWhitelist}
                onCheckedChange={(v) => mark(() => setUseWhitelist(v))}
              />
            </div>
            <div className={`rounded-xl p-4 border transition-all ${currentWhitelist ? "bg-green-500/5 border-green-500/30" : "bg-black/20 border-border/30"}`}>
              <p className="text-sm text-muted-foreground">
                {currentWhitelist
                  ? "✅ Seuls les animes de la liste blanche seront téléchargés, dans l'ordre de priorité."
                  : "⚠️ Tous les épisodes détectés sur les sites seront téléchargés sans filtre."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-display text-lg tracking-wide">
              <Bell className="text-yellow-400 w-5 h-5" /> Notifications d'erreur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Alerte Telegram sur erreur</p>
                <p className="text-sm text-muted-foreground">Envoie un message Telegram à chaque échec</p>
              </div>
              <Switch
                checked={currentNotify}
                onCheckedChange={(v) => mark(() => setNotifyOnError(v))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ExternalLink className="w-3 h-3" /> Webhook Discord (optionnel)
              </label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={currentDiscord}
                onChange={e => mark(() => setDiscordUrl(e.target.value))}
                className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
              <p className="text-xs text-muted-foreground">Les résumés de pipeline et les erreurs seront envoyés sur Discord.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
