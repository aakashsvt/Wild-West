

import { useState } from "react";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/lobby" component={Lobby}/>
      <Route path="/game" component={Game}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [assetsLoaded, setAssetsLoaded] = useState(false);

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
