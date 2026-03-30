import { Link, useLocation } from "wouter";
import { LayoutDashboard, Film, Server, ScrollText, Play, Activity } from "lucide-react";
import { useGetPipelineStatus, useRunPipeline } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ManualDownloadModal from "../ManualDownloadModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { data: status } = useGetPipelineStatus({ query: { refetchInterval: 5000 } });
  
  const runMutation = useRunPipeline({
    mutation: {
      onSuccess: () => toast({ title: "Pipeline sequence initiated" }),
      onError: () => toast({ title: "Failed to start pipeline", variant: "destructive" })
    }
  });

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/episodes", label: "Episodes", icon: Film },
    { href: "/sites", label: "Targets", icon: Server },
    { href: "/logs", label: "System Logs", icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans flex">
      {/* Background Image & Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img 
          src={`${import.meta.env.BASE_URL}images/cyber-bg.png`} 
          alt="Background" 
          className="w-full h-full object-cover opacity-15 mix-blend-screen" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-border bg-card/40 backdrop-blur-xl z-20 flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-border/50">
          <h1 className="font-display font-bold text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary flex items-center gap-3 drop-shadow-[0_0_8px_var(--color-primary)]">
            <Activity className="text-primary w-7 h-7" /> NEXUS
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {links.map(link => {
            const Icon = link.icon;
            const active = location === link.href;
            return (
              <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-primary/10 text-primary shadow-[inset_4px_0_0_var(--color-primary)]' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
                <Icon className="w-5 h-5" />
                <span className="font-medium tracking-wide">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="pl-64 relative z-10 flex flex-col flex-1 min-h-screen w-full">
        <header className="h-20 border-b border-border/50 bg-card/20 backdrop-blur-lg flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              {status?.running && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status?.running ? 'bg-primary shadow-[0_0_12px_var(--color-primary)]' : 'bg-muted-foreground'}`}></span>
            </div>
            <span className="font-display tracking-widest text-sm font-semibold text-muted-foreground">
              {status?.running ? 'PIPELINE ACTIVE' : 'PIPELINE STANDBY'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ManualDownloadModal />
            <Button 
              onClick={() => runMutation.mutate()} 
              disabled={runMutation.isPending || status?.running}
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold hover:shadow-[0_0_20px_var(--color-primary)] transition-all duration-300 border-none px-6"
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              {runMutation.isPending ? "INITIATING..." : "RUN PIPELINE"}
            </Button>
          </div>
        </header>
        
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
