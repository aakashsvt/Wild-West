import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, usersApi, setToken, type UserCreate, type UserUpdate } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { STATS_KEY } from "@/hooks/use-user-stats";

export const ME_KEY = ["me"] as const;

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      const user = await usersApi.me();
      setUser(user);
      return user;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const token = await authApi.login(username, password);
      setToken(token.access_token); // store before /me so the header is present
      const user = await usersApi.me();
      return { token, user };
    },
    onSuccess: ({ token, user }) => {
      setAuth(token.access_token, user);
      queryClient.setQueryData(ME_KEY, user);
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UserCreate) => {
      await authApi.register(data);
      const token = await authApi.login(data.username, data.password);
      setToken(token.access_token); // store before /me so the header is present
      const user = await usersApi.me();
      return { token, user };
    },
    onSuccess: ({ token, user }) => {
      setAuth(token.access_token, user);
      queryClient.setQueryData(ME_KEY, user);
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserUpdate) => usersApi.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return () => {
    clearAuth();
    queryClient.removeQueries({ queryKey: ME_KEY });
    queryClient.removeQueries({ queryKey: STATS_KEY });
  };
}
