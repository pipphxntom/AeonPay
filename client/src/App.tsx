import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./lib/auth";

import Home from "@/pages/Home";
import Pay from "@/pages/Pay";
import Plans from "@/pages/Plans";
import Swap from "@/pages/Swap";
import Me from "@/pages/Me";
import Privacy from "@/pages/Privacy";
import Login from "@/pages/Login";
import KycUpgrade from "@/pages/KycUpgrade";
import Reconciliation from "@/pages/Reconciliation";
import NotFound from "@/pages/not-found";

import AppShell from "@/components/AppShell";
import CreatePlanModal from "@/components/CreatePlanModal";
import ReserveCapsSheet from "@/components/ReserveCapsSheet";
import PaymentIntentSheet from "@/components/PaymentIntentSheet";
import GuardrailDialog from "@/components/GuardrailDialog";
import { CoachDrawer } from "@/components/CoachDrawer";

function AuthenticatedApp() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/pay" component={Pay} />
        <Route path="/plans" component={Plans} />
        <Route path="/swap" component={Swap} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/me" component={Me} />
        <Route path="/kyc-upgrade" component={KycUpgrade} />
        <Route path="/reconciliation" component={Reconciliation} />
        <Route component={NotFound} />
      </Switch>
      
      <CreatePlanModal />
      <ReserveCapsSheet />
      <PaymentIntentSheet />
      <GuardrailDialog />
      <CoachDrawer />
    </AppShell>
  );
}

function Router() {
  const { data: user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8">
          <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto"></div>
          <p className="text-white text-center mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
