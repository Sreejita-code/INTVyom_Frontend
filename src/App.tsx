import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/DashboardLayout";
import Assistant from "./pages/Assistant";
import Tools from "./pages/Tools";
import CallLogs from "./pages/CallLogs"; // <-- Import CallLogs
import ApiKeys from "./pages/ApiKeys";
import PhoneNumber from "./pages/PhoneNumber";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Navigate to="assistant" replace />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="tools" element={<Tools />} />
              <Route path="call-logs" element={<CallLogs />} /> {/* <-- Add Call Logs Route */}
              <Route path="phone-number" element={<PhoneNumber />} />
              <Route path="api-keys" element={<ApiKeys />} />
              <Route path="integration" element={<Integrations />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;