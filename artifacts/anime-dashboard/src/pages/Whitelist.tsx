import { useState } from "react";
import {
  useListWhitelist,
  useCreateWhitelistEntry,
  useUpdateWhitelistEntry,
  useDeleteWhitelistEntry,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronUp, ChevronDown, Star } from "lucide-react";

const QUALITY_OPTIONS = ["best", "1080p", "720p", "480p", "worst"];
const QUALITY_LABELS: Record<string, string> = {
  best: "Meilleure",
  "1080p": "1080p",
  "720p": "720p",
  "480p": "480p",
  worst: "La plus basse",
};

const QUALITY_COLORS: Record<string, string> = {
  best: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  "1080p": "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  "720p": "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "480p": "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  worst: "text-muted-foreground bg-black/20 border-border/30",
};

export default function Whitelist() {
  const { data: entries = [], isLoading } = useListWhitelist();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [newQuality, setNewQuality] = useState("best");
  const [newPriority, setNewPriority] = useState(5);
  const [showForm, setShowForm] = useState(false);

  const createMut = useCreateWhitelistEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/whitelist"] });
        toast({ title: `${newName} ajouté à la liste blanche` });
        setNewName("");
        setNewQuality("best");
        setNewPriority(5);
        setShowForm(false);
      },
      onError: () => toast({ title: "Cet anime est déjà dans la liste blanche", variant: "destructive" }),
    },
  });

  const updateMut = useUpdateWhitelistEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/whitelist"] });
      },
    },
  });

  const deleteMut = useDeleteWhitelistEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/whitelist"] });
        toast({ title: "Anime retiré de la liste blanche" });
      },
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMut.mutate({
      animeName: newName.trim(),
      qualityPreference: newQuality as any,
      priority: newPriority,
      enabled: true,
    });
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-b-2 border-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Liste blanche</h2>
          <p className="text-muted-foreground mt-1 tracking-wide">Définissez quels animés doivent être téléchargés et dans quel ordre de priorité.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold px-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un anime
        </Button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 border-primary/30 shadow-[0_0_20px_var(--color-primary)/10]">
          <CardContent className="p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Nom de l'anime</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: Attack on Titan"
                    required
                    className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Qualité vidéo</label>
                  <select
                    value={newQuality}
                    onChange={e => setNewQuality(e.target.value)}
                    className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    {QUALITY_OPTIONS.map(q => (
                      <option key={q} value={q}>{QUALITY_LABELS[q]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Priorité (0–10)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={newPriority}
                    onChange={e => setNewPriority(Number(e.target.value))}
                    className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button type="submit" disabled={createMut.isPending} className="bg-primary/80 hover:bg-primary">
                  {createMut.isPending ? "Ajout..." : "Ajouter"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <Card className="bg-card/40 border-border/30">
            <CardContent className="p-12 text-center">
              <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun anime dans la liste blanche.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Ajoutez des animes pour filtrer les téléchargements.</p>
            </CardContent>
          </Card>
        ) : (
          entries.map((entry, idx) => (
            <Card key={entry.id} className={`bg-card/60 backdrop-blur-xl border-border/50 transition-all ${entry.enabled ? "" : "opacity-50"}`}>
              <CardContent className="p-4 flex items-center gap-4">
                {/* Rang */}
                <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center font-display font-bold text-muted-foreground text-sm shrink-0">
                  #{idx + 1}
                </div>

                {/* Nom */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-lg truncate ${entry.enabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
                    {entry.animeName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">Priorité : {entry.priority}</p>
                </div>

                {/* Qualité */}
                <span className={`px-3 py-1 rounded-full text-xs font-mono border ${QUALITY_COLORS[entry.qualityPreference] ?? QUALITY_COLORS.worst}`}>
                  {QUALITY_LABELS[entry.qualityPreference] ?? entry.qualityPreference}
                </span>

                {/* Priorité */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-primary"
                    onClick={() => updateMut.mutate({ id: entry.id, priority: Math.min(10, entry.priority + 1) } as any)}
                    disabled={entry.priority >= 10}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-primary"
                    onClick={() => updateMut.mutate({ id: entry.id, priority: Math.max(0, entry.priority - 1) } as any)}
                    disabled={entry.priority <= 0}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>

                {/* Actif */}
                <Switch
                  checked={entry.enabled}
                  onCheckedChange={v => updateMut.mutate({ id: entry.id, enabled: v } as any)}
                />

                {/* Supprimer */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMut.mutate({ id: entry.id })}
                  disabled={deleteMut.isPending}
                  className="hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
