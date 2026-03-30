import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Episodes from "@/pages/Episodes";
import Sites from "@/pages/Sites";
import Logs from "@/pages/Logs";
import Scheduler from "@/pages/Scheduler";
import Whitelist from "@/pages/Whitelist";
import Runs from "@/pages/Runs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/episodes" component={Episodes} />
              <Route path="/whitelist" component={Whitelist} />
              <Route path="/scheduler" component={Scheduler} />
              <Route path="/runs" component={Runs} />
              <Route path="/sites" component={Sites} />
              <Route path="/logs" component={Logs} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
