import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { ME_KEY } from "@/hooks/use-auth";

export const ITEMS_KEY = ["marketplace-items"] as const;

export function useMarketplaceItems() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ITEMS_KEY,
    queryFn: () => itemsApi.list(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

export function usePurchaseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity?: number }) =>
      itemsApi.purchase(itemId, quantity),
    onSuccess: () => {
      // Refresh user profile so coin balance and owned items stay in sync
      queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
