

import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingScreen } from "@/components/LoadingScreen";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Lobby from "@/pages/Lobby";
import Salon from "@/pages/Salon";
import { useAuthStore } from "@/store/auth-store";
import { getToken } from "@/lib/api";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/salon" component={Salon}/>
      <Route path="/lobby" component={Lobby}/>
      <Route path="/game" component={Game}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const hydrateToken = useAuthStore((s) => s.hydrateToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    hydrateToken();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => clearAuth();
    // fires when localStorage changes in another tab
    const handleStorage = () => { if (!getToken()) clearAuth(); };
    // catches same-tab token deletion when the user comes back to the tab
    const handleVisibility = () => { if (!document.hidden && !getToken()) clearAuth(); };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [clearAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {/* App content renders underneath so Home is ready the moment the overlay fades */}
        <Router />

        {/* Loading screen overlay — unmounts after assets are ready */}
        <AnimatePresence>
          {!assetsLoaded && (
            <motion.div
              key="loading-overlay"
              className="fixed inset-0 z-[100]"
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
            >
              <LoadingScreen onFinished={() => setAssetsLoaded(true)} />
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
