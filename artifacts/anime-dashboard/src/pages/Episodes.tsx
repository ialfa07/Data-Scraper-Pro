import { useState, useCallback } from "react";
import {
  useListEpisodes,
  useDeleteEpisode,
  useRetryEpisode,
  useExportEpisodes,
  getListEpisodesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, ExternalLink, Search, Download, ChevronLeft, ChevronRight, X } from "lucide-react";
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

const PAGE_SIZE = 20;

function exportToCSV(episodes: any[]) {
  const headers = ["ID", "Anime", "Saison", "Épisode", "Statut", "Qualité", "Priorité", "URL source", "Créé le"];
  const rows = episodes.map(ep => [
    ep.id,
    ep.animeName,
    ep.season,
    ep.episode,
    ep.status,
    ep.quality ?? "",
    ep.priority,
    ep.sourceUrl,
    format(new Date(ep.createdAt), "yyyy-MM-dd HH:mm", { locale: fr }),
  ]);

  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `episodes_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Episodes() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryStatus = statusFilter === "all" ? undefined : statusFilter;

  const { data, isLoading } = useListEpisodes(
    {
      status: queryStatus as any,
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { query: { refetchInterval: 10000 } }
  );

  const { refetch: fetchExport, isFetching: isExporting } = useExportEpisodes({
    query: { enabled: false },
  });

  const debounce = useCallback((val: string) => {
    setSearch(val);
    clearTimeout((window as any).__searchTimer);
    (window as any).__searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, 350);
  }, []);

  const deleteMut = useDeleteEpisode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEpisodesQueryKey() });
        toast({ title: "Épisode supprimé" });
      },
    },
  });

  const retryMut = useRetryEpisode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEpisodesQueryKey() });
        toast({ title: "Épisode remis en file d'attente" });
      },
    },
  });

  async function handleExport() {
    const result = await fetchExport();
    if (result.data) {
      exportToCSV(result.data);
      toast({ title: `${result.data.length} épisodes exportés en CSV` });
    }
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters = ["all", "pending", "downloading", "downloaded", "sending", "sent", "failed"];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Épisodes suivis</h2>
          <p className="text-muted-foreground mt-1 tracking-wide">Gérez les épisodes de la pipeline de distribution.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting}
          className="border-border/50 text-muted-foreground hover:text-white hover:border-white/30"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Export..." : "Exporter CSV"}
        </Button>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => debounce(e.target.value)}
          placeholder="Rechercher un anime..."
          className="w-full bg-card/40 border border-border/50 rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 backdrop-blur-xl transition-colors"
        />
        {search && (
          <button
            onClick={() => debounce("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-2">
        {filters.map(s => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(s); setPage(0); }}
            className={`rounded-full px-5 tracking-wider font-mono text-xs uppercase ${
              statusFilter === s
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_var(--color-primary)]"
                : "border-border/50 text-muted-foreground hover:text-white"
            }`}
          >
            {filterLabels[s] ?? s}
          </Button>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-black/40">
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="py-4 font-display text-primary tracking-widest">Anime</TableHead>
              <TableHead className="font-display text-primary tracking-widest">Ép.</TableHead>
              <TableHead className="font-display text-primary tracking-widest">Statut</TableHead>
              <TableHead className="font-display text-primary tracking-widest">Qualité</TableHead>
              <TableHead className="font-display text-primary tracking-widest">Source</TableHead>
              <TableHead className="font-display text-primary tracking-widest">Ajouté</TableHead>
              <TableHead className="text-right font-display text-primary tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground animate-pulse">
                  Chargement des données...
                </TableCell>
              </TableRow>
            ) : !data?.episodes?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Aucun épisode trouvé.
                </TableCell>
              </TableRow>
            ) : (
              data.episodes.map(ep => (
                <TableRow key={ep.id} className="border-border/30 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium text-foreground py-4">{ep.animeName}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">S{ep.season}E{ep.episode}</TableCell>
                  <TableCell><StatusBadge status={ep.status} /></TableCell>
                  <TableCell>
                    {ep.quality ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono border border-border/30 text-muted-foreground bg-black/30">
                        {ep.quality}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
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
                        disabled={retryMut.isPending || ep.status === "sent"}
                        className="hover:bg-cyan-500/20 hover:text-cyan-400"
                      >
                        <RefreshCw className={`w-4 h-4 ${retryMut.isPending ? "animate-spin" : ""}`} />
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-mono">
          {total > 0 ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} sur ${total}` : "0 épisode"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border-border/50 text-muted-foreground hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-mono text-muted-foreground px-3">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="border-border/50 text-muted-foreground hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
