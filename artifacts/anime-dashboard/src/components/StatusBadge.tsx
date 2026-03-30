import { Badge } from "@/components/ui/badge";
import type { EpisodeStatus } from "@workspace/api-client-react";

const variants: Record<EpisodeStatus, string> = {
  pending: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  downloading: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.2)]",
  downloaded: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  sending: "bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.2)]",
  sent: "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]",
  failed: "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
};

export function StatusBadge({ status }: { status: EpisodeStatus }) {
  return (
    <Badge variant="outline" className={`px-3 py-1 font-mono uppercase tracking-wider text-[10px] ${variants[status] || variants.pending}`}>
      {status}
    </Badge>
  );
}
