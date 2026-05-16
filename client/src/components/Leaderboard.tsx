import { useScores } from "@/hooks/use-scores";
import { Loader2 } from "lucide-react";

export function Leaderboard() {
  const { data: scores, isLoading } = useScores();

  return (
    <div className="w-full max-w-md bg-black/80 backdrop-blur-xl border border-primary/30 rounded-xl p-6 shadow-2xl shadow-primary/10">
      <h3 className="text-2xl font-display text-primary uppercase mb-6 text-center text-shadow-neon">
        Top Racers
      </h3>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : scores?.length === 0 ? (
        <div className="text-center text-muted-foreground p-4">
          No records yet. Be the first!
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {scores?.map((entry, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between p-3 rounded bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-primary/50"
            >
              <div className="flex items-center gap-4">
                <span className={`
                  font-bold font-display w-6 text-center
                  ${i === 0 ? 'text-yellow-400 text-lg' : 
                    i === 1 ? 'text-gray-300' : 
                    i === 2 ? 'text-amber-600' : 'text-muted-foreground'}
                `}>
                  {i + 1}
                </span>
                <span className="font-bold text-white tracking-wide truncate max-w-[120px]">
                  {entry.username}
                </span>
              </div>
              <div className="text-right">
                <div className="text-primary font-display font-bold">{entry.score} pts</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {Math.floor(entry.timeTaken / 60)}:{(entry.timeTaken % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
