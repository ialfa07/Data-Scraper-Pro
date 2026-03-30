import { useState } from "react";
import { useTriggerDownload, getGetPipelineStatsQueryKey, getListEpisodesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DownloadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  animeName: z.string().min(1, "Nom requis"),
  season: z.coerce.number().min(1, "Minimum 1"),
  episode: z.coerce.number().min(0, "Minimum 0"),
  sourceUrl: z.string().url("URL invalide"),
});

export default function ManualDownloadModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { animeName: "", season: 1, episode: 1, sourceUrl: "" }
  });

  const triggerMut = useTriggerDownload({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPipelineStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListEpisodesQueryKey() });
        toast({ title: "Épisode ajouté à la file de téléchargement" });
        setOpen(false);
        reset();
      },
      onError: (err: any) => {
        toast({ title: "Échec du déclenchement", description: err?.data?.error || "Erreur inconnue", variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: any) => {
    triggerMut.mutate({ data });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300">
          <DownloadCloud className="w-4 h-4 mr-2" />
          Téléchargement manuel
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">Ajouter un épisode manuellement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Nom de l'anime</label>
            <Input {...register("animeName")} className="bg-background/50 border-border/50 focus:border-primary" placeholder="Attack on Titan" />
            {errors.animeName && <p className="text-xs text-destructive">{errors.animeName.message as string}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Saison</label>
              <Input type="number" {...register("season")} className="bg-background/50 border-border/50 focus:border-primary" />
              {errors.season && <p className="text-xs text-destructive">{errors.season.message as string}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Épisode</label>
              <Input type="number" {...register("episode")} className="bg-background/50 border-border/50 focus:border-primary" />
              {errors.episode && <p className="text-xs text-destructive">{errors.episode.message as string}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">URL source</label>
            <Input {...register("sourceUrl")} className="bg-background/50 border-border/50 focus:border-primary" placeholder="https://..." />
            {errors.sourceUrl && <p className="text-xs text-destructive">{errors.sourceUrl.message as string}</p>}
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={triggerMut.isPending} className="bg-primary text-primary-foreground hover:shadow-[0_0_15px_var(--color-primary)]">
              {triggerMut.isPending ? "Ajout en cours..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
