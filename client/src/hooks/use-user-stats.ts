import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi, type UserStatsUpdate } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export const STATS_KEY = ["user-stats"] as const;

export function useMyStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => usersApi.myStats(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchOnMount: true,
    retry: 1,
  });
}

export function useUpdateMyStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserStatsUpdate) => usersApi.updateMyStats(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(STATS_KEY, updated);
    },
  });
}
