import { useState } from "react";
import { useListLogs } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Terminal } from "lucide-react";

const levelColors: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function Logs() {
  const [levelFilter, setLevelFilter] = useState<any>('all');
  const queryLevel = levelFilter === 'all' ? undefined : levelFilter;

  const { data: logs, isLoading } = useListLogs(
    { level: queryLevel, limit: 200 },
    { query: { refetchInterval: 5000 } }
  );

  const filters = ['all', 'info', 'warning', 'error', 'success'];

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">System Logs</h2>
        <p className="text-muted-foreground mt-1 tracking-wide">Real-time matrix terminal outputs.</p>
      </div>

      <div className="flex gap-2">
        {filters.map(s => (
           <Button 
             key={s} 
             variant={levelFilter === s ? 'default' : 'outline'} 
             size="sm"
             onClick={() => setLevelFilter(s)}
             className={`rounded-full px-5 tracking-wider font-mono text-xs uppercase ${levelFilter === s ? 'bg-primary text-primary-foreground shadow-[0_0_10px_var(--color-primary)]' : 'border-border/50 text-muted-foreground hover:text-white'}`}
           >
             {s}
           </Button>
        ))}
      </div>

      <div className="flex-1 min-h-[500px] bg-[#0a0d14]/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
          <Terminal className="w-5 h-5 text-primary" />
          <span className="font-mono text-sm text-muted-foreground tracking-widest uppercase">Nexus Terminal Interface /dev/tty1</span>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-2 font-mono text-sm">
          {isLoading ? (
            <div className="text-muted-foreground animate-pulse">Establishing secure connection...</div>
          ) : !logs?.length ? (
            <div className="text-muted-foreground">Terminal buffer empty.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex gap-4 p-2 rounded-lg hover:bg-white/5 transition-colors items-start">
                 <span className="text-gray-500 w-32 shrink-0">{format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}</span>
                 <Badge variant="outline" className={`w-20 justify-center uppercase text-[10px] tracking-widest shrink-0 ${levelColors[log.level]}`}>
                   {log.level}
                 </Badge>
                 <span className={`flex-1 break-words ${log.level === 'error' ? 'text-red-200' : 'text-gray-300'}`}>
                   {log.message}
                   {log.details && (
                     <pre className="mt-2 p-2 bg-black/50 rounded border border-white/5 text-xs text-muted-foreground whitespace-pre-wrap">
                       {log.details}
                     </pre>
                   )}
                 </span>
                 {log.episodeId && (
                   <span className="text-primary/60 shrink-0 border border-primary/20 px-2 py-0.5 rounded text-xs bg-primary/5">
                     Ep #{log.episodeId}
                   </span>
                 )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
