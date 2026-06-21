import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserRound, Lock, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useRegister } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

// ── Western colour tokens (mirrored from Home) ────────────────────────────────
const W = {
  bg:         "#0a0603",
  panelDark:  "#130a04",
  panelMid:   "#1e0f06",
  borderDim:  "#3d1e0a",
  borderWarm: "#6b3820",
  borderGold: "#a07030",
  gold:       "#c8922a",
  goldBright: "#d4a853",
  goldPale:   "#e8c87a",
  cream:      "#e8d5b0",
  creamMuted: "#b89a72",
  rust:       "#8b3d1f",
} as const;

// ── Schemas ───────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  username: z.string().min(3, "At least 3 characters"),
  password: z.string().min(8, "At least 8 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "At least 3 characters").max(150),
  email:    z.string().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters").max(128),
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ["confirm"],
});

type LoginForm    = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

// ── Styled input wrapper ──────────────────────────────────────────────────────
function WField({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        className="text-xs tracking-widest uppercase font-mono"
        style={{ color: W.creamMuted }}
      >
        <span className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color: W.gold }} />
          {label}
        </span>
      </Label>
      {children}
      {error && (
        <p className="text-xs" style={{ color: "#e05c3a" }}>
          {error}
        </p>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background:   `${W.panelDark}`,
  border:       `1px solid ${W.borderWarm}80`,
  color:        W.cream,
  fontFamily:   "var(--font-mono, monospace)",
  fontSize:     "0.875rem",
  outline:      "none",
};

// ── Sign-In tab ───────────────────────────────────────────────────────────────
function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login.mutateAsync({ username: data.username, password: data.password });
      toast({ title: "Welcome back, partner!", description: "Ride on." });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast({ title: "Sign in failed", description: msg, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
      <WField label="Username" icon={UserRound} error={errors.username?.message}>
        <Input
          {...register("username")}
          placeholder="your_handle"
          autoComplete="username"
          style={inputStyle}
          className="placeholder:text-[#5a3a20] focus-visible:ring-0 focus-visible:border-[#c8922a]"
        />
      </WField>

      <WField label="Password" icon={Lock} error={errors.password?.message}>
        <Input
          {...register("password")}
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          style={inputStyle}
          className="placeholder:text-[#5a3a20] focus-visible:ring-0 focus-visible:border-[#c8922a]"
        />
      </WField>

      <button
        type="submit"
        disabled={login.isPending}
        className="mt-2 flex items-center justify-center gap-2 rounded py-3 font-western tracking-widest text-sm transition-opacity disabled:opacity-60"
        style={{
          background: `linear-gradient(175deg, ${W.goldBright} 0%, ${W.gold} 50%, #8b5e18 100%)`,
          border:     `1px solid ${W.goldBright}80`,
          color:      W.bg,
        }}
      >
        {login.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        RIDE IN
      </button>
    </form>
  );
}

// ── Sign-Up tab ───────────────────────────────────────────────────────────────
function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const register_ = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await register_.mutateAsync({
        username: data.username,
        email:    data.email,
        password: data.password,
      });
      toast({ title: "Yeehaw! Account created", description: "Welcome to the frontier." });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast({ title: "Sign up failed", description: msg, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
      <WField label="Username" icon={UserRound} error={errors.username?.message}>
        <Input
          {...register("username")}
          placeholder="your_handle"
          autoComplete="username"
          style={inputStyle}
          className="placeholder:text-[#5a3a20] focus-visible:ring-0 focus-visible:border-[#c8922a]"
        />
      </WField>

      <WField label="Email" icon={Mail} error={errors.email?.message}>
        <Input
          {...register("email")}
          type="email"
          placeholder="you@frontier.com"
          autoComplete="email"
          style={inputStyle}
          className="placeholder:text-[#5a3a20] focus-visible:ring-0 focus-visible:border-[#c8922a]"
        />
      </WField>

      <WField label="Password" icon={Lock} error={errors.password?.message}>
        <Input
          {...register("password")}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          style={inputStyle}
          className="placeholder:text-[#5a3a20] focus-visible:ring-0 focus-visible:border-[#c8922a]"
        />
      </WField>

      <WField label="Confirm Password" icon={Lock} error={errors.confirm?.message}>
        <Input
          {...register("confirm")}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          style={inputStyle}
          className="placeholder:text-[#5a3a20] focus-visible:ring-0 focus-visible:border-[#c8922a]"
        />
      </WField>

      <button
        type="submit"
        disabled={register_.isPending}
        className="mt-2 flex items-center justify-center gap-2 rounded py-3 font-western tracking-widest text-sm transition-opacity disabled:opacity-60"
        style={{
          background: `linear-gradient(175deg, ${W.goldBright} 0%, ${W.gold} 50%, #8b5e18 100%)`,
          border:     `1px solid ${W.goldBright}80`,
          color:      W.bg,
        }}
      >
        {register_.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        STAKE YOUR CLAIM
      </button>
    </form>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "signin" | "signup";
}

export function AuthModal({ open, onOpenChange, defaultTab = "signin" }: AuthModalProps) {
  const [tab, setTab] = useState<string>(defaultTab);

  const handleSuccess = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm border-0 p-0 overflow-hidden"
        style={{
          background:   W.panelDark,
          border:       `1px solid ${W.borderGold}80`,
          boxShadow:    `0 0 60px rgba(0,0,0,0.8), 0 0 30px ${W.gold}20`,
        }}
      >
        {/* Header ornament */}
        <div
          className="px-6 pt-6 pb-4 pr-12"
          style={{ borderBottom: `1px solid ${W.borderDim}` }}
        >
          <div className="flex items-center gap-2 justify-center mb-3">
            <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${W.gold})` }} />
            <span className="text-xs tracking-[0.3em] font-mono" style={{ color: W.gold }}>✦ FRONTIER PASS ✦</span>
            <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${W.gold})` }} />
          </div>
          <DialogHeader>
            <DialogTitle
              className="text-center font-western tracking-wider"
              style={{ color: W.cream, fontSize: "1.4rem" }}
            >
              {tab === "signin" ? "Welcome Back, Rider" : "Join the Frontier"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="px-6 pb-6">
          <TabsList
            className="w-full mb-4 rounded h-9"
            style={{ background: `${W.bg}cc`, border: `1px solid ${W.borderWarm}50` }}
          >
            <TabsTrigger
              value="signin"
              className="flex-1 text-xs font-western tracking-wide data-[state=active]:text-[#0a0603]"
              style={
                tab === "signin"
                  ? { background: W.gold, color: W.bg }
                  : { color: W.creamMuted }
              }
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="flex-1 text-xs font-western tracking-wide data-[state=active]:text-[#0a0603]"
              style={
                tab === "signup"
                  ? { background: W.gold, color: W.bg }
                  : { color: W.creamMuted }
              }
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-0">
            <SignInForm onSuccess={handleSuccess} />
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            <SignUpForm onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
