import { useState } from "react";
import { useListEpisodes, useDeleteEpisode, useRetryEpisode, getListEpisodesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const filterLabels: Record<string, string> = {
  all: "Tous",
  pending: "En attente",
  downloading: "Téléchargement",
  downloaded: "Téléchargé",
  sending: "Envoi",
  sent: "Envoyé",
  failed: "Erreur",
};

export default function Episodes() {
  const [statusFilter, setStatusFilter] = useState<any>('all');
  const queryStatus = statusFilter === 'all' ? undefined : statusFilter;
  
  const { data, isLoading } = useListEpisodes(
    { status: queryStatus, limit: 100 },
    { query: { refetchInterval: 10000 } }
  );
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMut = useDeleteEpisode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEpisodesQueryKey() });
        toast({ title: "Épisode supprimé" });
      }
    }
  });

  const retryMut = useRetryEpisode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEpisodesQueryKey() });
        toast({ title: "Épisode remis en file d'attente" });
      }
    }
  });

  const filters = ['all', 'pending', 'downloading', 'downloaded', 'sending', 'sent', 'failed'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Épisodes suivis</h2>
        <p className="text-muted-foreground mt-1 tracking-wide">Gérez les épisodes de la pipeline de distribution.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(s => (
           <Button 
             key={s} 
             variant={statusFilter === s ? 'default' : 'outline'} 
             size="sm"
             onClick={() => setStatusFilter(s)}
             className={`rounded-full px-5 tracking-wider font-mono text-xs uppercase ${statusFilter === s ? 'bg-primary text-primary-foreground shadow-[0_0_10px_var(--color-primary)]' : 'border-border/50 text-muted-foreground hover:text-white'}`}
           >
             {filterLabels[s] ?? s}
           </Button>
        ))}
      </div>

      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-black/40">
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="py-4 font-display text-primary tracking-widest">Anime</TableHead>
              <TableHead className="font-display text-primary tracking-widest">Ép.</TableHead>
              <TableHead className="font-display text-primary tracking-widest">Statut</TableHead>
              <TableHead className="font-display text-primary tracking-widest">Source</TableHead>
              <TableHead className="font-display text-primary tracking-widest">Ajouté</TableHead>
              <TableHead className="text-right font-display text-primary tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground animate-pulse">
                  Chargement des données...
                </TableCell>
              </TableRow>
            ) : !data?.episodes?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Aucun épisode trouvé pour ce filtre.
                </TableCell>
              </TableRow>
            ) : (
              data.episodes.map(ep => (
                <TableRow key={ep.id} className="border-border/30 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium text-foreground py-4">{ep.animeName}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">S{ep.season} E{ep.episode}</TableCell>
                  <TableCell><StatusBadge status={ep.status} /></TableCell>
                  <TableCell>
                    <a href={ep.sourceUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" /> Lien
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {format(new Date(ep.createdAt), "d MMM, HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         title="Réessayer"
                         onClick={() => retryMut.mutate({ id: ep.id })} 
                         disabled={retryMut.isPending || ep.status === 'sent'}
                         className="hover:bg-cyan-500/20 hover:text-cyan-400"
                       >
                          <RefreshCw className={`w-4 h-4 ${retryMut.isPending ? 'animate-spin' : ''}`} />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon"
                         title="Supprimer"
                         onClick={() => deleteMut.mutate({ id: ep.id })} 
                         disabled={deleteMut.isPending}
                         className="hover:bg-red-500/20 hover:text-red-400"
                       >
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
