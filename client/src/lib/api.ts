const BASE_URL = "";

const TOKEN_KEY = "wwr_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    form?: Record<string, string>;
    auth?: boolean;
  } = {},
): Promise<T> {
  const { body, form, auth = true } = options;
  const headers: Record<string, string> = {};

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let bodyInit: BodyInit | undefined;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    bodyInit = new URLSearchParams(form).toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    bodyInit = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: bodyInit,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserCreate {
  username: string;
  email: string;
  password: string;
}

export interface UserRead {
  id: number;
  username: string;
  email: string;
  coins: number;
}

export interface UserDetail extends UserRead {
  items: UserItemRead[];
  active_items: ActiveRaceItemRead[];
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserUpdate {
  username?: string | null;
  email?: string | null;
}

export const authApi = {
  register: (data: UserCreate) =>
    request<UserRead>("POST", "/api/v1/auth/register", {
      body: data,
      auth: false,
    }),

  login: (username: string, password: string) =>
    request<Token>("POST", "/api/v1/auth/login", {
      form: { username, password },
      auth: false,
    }),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  me: () => request<UserDetail>("GET", "/api/v1/users/me"),

  updateMe: (data: UserUpdate) =>
    request<UserRead>("PATCH", "/api/v1/users/me", { body: data }),

  myStats: () => request<UserStatsRead>("GET", "/api/v1/users/me/stats"),

  updateMyStats: (data: UserStatsUpdate) =>
    request<UserStatsRead>("PUT", "/api/v1/users/me/stats", { body: data }),
};

// ── Items / Marketplace ───────────────────────────────────────────────────────

export interface ItemTypeRead {
  id: number;
  name: string;
}

export interface ItemRead {
  id: number;
  name: string;
  description: string;
  price: number;
  asset_url: string;
  image_url: string;
  item_type: ItemTypeRead;
}

export interface UserItemRead {
  id: number;
  item: ItemRead;
  quantity: number;
  acquired_at: string;
}

export interface ActiveRaceItemRead {
  id: number;
  user_item: UserItemRead;
  activated_at: string;
}

export interface PaymentRecordRead {
  id: number;
  item: ItemRead;
  amount: number;
  payment_date: string;
}

export interface PurchaseResponse {
  transaction: PaymentRecordRead;
  remaining_coins: number;
  owned_quantity: number;
}

export interface UserStatsRead {
  race_count: number;
  win_count: number;
  loss_count: number;
}

export interface UserStatsUpdate {
  race_count?: number | null;
  win_count?: number | null;
  loss_count?: number | null;
}

export const itemsApi = {
  list: () => request<ItemRead[]>("GET", "/api/v1/items/"),

  purchase: (itemId: number, quantity = 1) =>
    request<PurchaseResponse>("POST", `/api/v1/items/${itemId}/purchase`, {
      body: { quantity },
    }),
};
