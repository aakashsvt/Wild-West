import { useGameStore } from "@/hooks/use-game-store";
import { useSubmitScore } from "@/hooks/use-scores";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trophy, RotateCcw } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(2, "Name too short").max(10, "Name too long"),
});

export function GameOverModal() {
  const { isGameOver, score, timeElapsed, resetGame, startGame } = useGameStore();
  const { mutate: submitScore, isPending } = useSubmitScore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "" },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    submitScore(
      { 
        username: data.username, 
        score, 
        timeTaken: timeElapsed 
      }, 
      {
        onSuccess: () => {
          resetGame();
          // Ideally navigate to menu, but reset works for now
        }
      }
    );
  };

  return (
    <AnimatePresence>
      {isGameOver && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-md bg-zinc-900 border-2 border-primary rounded-2xl p-8 shadow-[0_0_50px_rgba(236,72,153,0.3)] relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-secondary" />

            <div className="text-center mb-8">
              <h2 className="text-4xl font-display uppercase font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-sm">
                Race Finished
              </h2>
              <p className="text-muted-foreground mt-2 font-display tracking-widest uppercase text-sm">
                Distance Traveled
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black/40 p-4 rounded-xl border border-white/10 text-center">
                <div className="text-primary text-3xl font-display font-bold">{score}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Score</div>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-white/10 text-center">
                <div className="text-secondary text-3xl font-display font-bold">
                  {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Time</div>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 uppercase tracking-wide">Enter Pilot Name</label>
                <input 
                  {...form.register("username")}
                  className="w-full bg-black/50 border-2 border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-display tracking-wider"
                  placeholder="PLAYER 1"
                  autoFocus
                  autoComplete="off"
                />
                {form.formState.errors.username && (
                  <p className="text-destructive text-xs">{form.formState.errors.username.message}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetGame}
                  className="flex-1 px-6 py-3 rounded-xl font-bold uppercase tracking-wider bg-zinc-800 text-white hover:bg-zinc-700 transition-colors border border-white/10 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Menu
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-[2] px-6 py-3 rounded-xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-pink-600 text-white hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      Submit Record
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
