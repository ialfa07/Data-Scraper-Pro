import { useState } from "react";
import { useListSites, useCreateSite, useUpdateSite, useDeleteSite, getListSitesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const siteSchema = z.object({
  name: z.string().min(1, "Required"),
  baseUrl: z.string().url("Must be valid URL"),
  scraperType: z.string().min(1, "Required"),
  enabled: z.boolean().default(true),
  requiresJs: z.boolean().default(false),
});

export default function Sites() {
  const { data: sites, isLoading } = useListSites();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(siteSchema),
    defaultValues: { name: "", baseUrl: "", scraperType: "", enabled: true, requiresJs: false }
  });

  const createMut = useCreateSite({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() });
        toast({ title: "Target sector established" });
        setOpen(false);
        reset();
      }
    }
  });

  const updateMut = useUpdateSite({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() })
    }
  });

  const deleteMut = useDeleteSite({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() });
        toast({ title: "Sector eradicated" });
      }
    }
  });

  const onSubmit = (data: any) => createMut.mutate({ data });

  if (isLoading) return <div className="animate-pulse">Loading sectors...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Target Sectors</h2>
          <p className="text-muted-foreground mt-1 tracking-wide">Configured anime sources for automated extraction.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-bold hover:shadow-[0_0_15px_var(--color-primary)] transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Sector
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-primary">Establish New Sector</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Sector Name</label>
                <Input {...register("name")} className="bg-background/50 border-border/50 focus:border-primary" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Base URL</label>
                <Input {...register("baseUrl")} className="bg-background/50 border-border/50 focus:border-primary" />
                {errors.baseUrl && <p className="text-xs text-destructive">{errors.baseUrl.message as string}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Scraper Type</label>
                <Input {...register("scraperType")} placeholder="cheerio | puppeteer" className="bg-background/50 border-border/50 focus:border-primary" />
                {errors.scraperType && <p className="text-xs text-destructive">{errors.scraperType.message as string}</p>}
              </div>
              <div className="flex gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="enabled" {...register("enabled")} className="rounded border-border/50 bg-black/50 text-primary focus:ring-primary/20" />
                  <label htmlFor="enabled" className="text-sm text-foreground">Enabled</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="requiresJs" {...register("requiresJs")} className="rounded border-border/50 bg-black/50 text-primary focus:ring-primary/20" />
                  <label htmlFor="requiresJs" className="text-sm text-foreground">Requires JS rendering</label>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending} className="bg-primary text-primary-foreground hover:shadow-[0_0_15px_var(--color-primary)]">
                  {createMut.isPending ? "Establishing..." : "Save Sector"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites?.map(site => (
          <Card key={site.id} className="bg-card/60 backdrop-blur-xl border-border/50 hover:border-white/20 transition-all duration-300 group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="font-display text-xl text-foreground flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  {site.name}
                </CardTitle>
                <Switch 
                  checked={site.enabled} 
                  onCheckedChange={(v) => updateMut.mutate({ id: site.id, data: { enabled: v } })} 
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono text-muted-foreground mb-4 truncate" title={site.baseUrl}>{site.baseUrl}</p>
              <div className="flex gap-2">
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 uppercase font-mono text-[10px] tracking-wider">
                  {site.scraperType}
                </Badge>
                {site.requiresJs && (
                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10 uppercase font-mono text-[10px] tracking-wider">
                    JS REQ
                  </Badge>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-border/30 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => deleteMut.mutate({ id: site.id })}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Eradicate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!sites?.length && (
          <div className="col-span-full p-12 text-center text-muted-foreground border border-dashed border-border/50 rounded-2xl bg-card/20 backdrop-blur-md">
            No active sectors. Establish a new target sector to begin extraction.
          </div>
        )}
      </div>
    </div>
  );
}
