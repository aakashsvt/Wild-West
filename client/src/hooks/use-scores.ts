import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

// Local schema for scores
const scoreSchema = z.object({
  username: z.string().min(2).max(10),
  score: z.number().int().positive(),
  timeTaken: z.number().int().nonnegative(),
  id: z.string(),
  createdAt: z.number(),
});

type Score = z.infer<typeof scoreSchema>;
export type ScoreInput = Omit<Score, "id" | "createdAt">;

const STORAGE_KEY = "wild-west-rider-scores";

function getScoresFromStorage(): Score[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const scores = JSON.parse(data);
    return scores.sort((a: Score, b: Score) => b.score - a.score).slice(0, 10);
  } catch {
    return [];
  }
}

function addScoreToStorage(input: ScoreInput): Score {
  const score: Score = {
    ...input,
    id: Date.now().toString(),
    createdAt: Date.now(),
  };

  const scores = getScoresFromStorage();
  scores.push(score);
  scores.sort((a, b) => b.score - a.score);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  return score;
}

export function useScores() {
  return useQuery({
    queryKey: ["scores"],
    queryFn: async () => {
      // Simulate async operation
      return new Promise<Score[]>((resolve) => {
        setTimeout(() => {
          resolve(getScoresFromStorage());
        }, 100);
      });
    },
  });
}

export function useSubmitScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ScoreInput) => {
      // Simulate async operation
      return new Promise<Score>((resolve) => {
        setTimeout(() => {
          resolve(addScoreToStorage(data));
        }, 100);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
  });
}
