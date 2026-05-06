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
import CallLogs from "./pages/CallLogs";
import ApiKeys from "./pages/ApiKeys";
import PhoneNumber from "./pages/PhoneNumber";
import Inbound from "./pages/Inbound";
import InboundContext from "./pages/InboundContext"; // <-- Import new page
import Integrations from "./pages/Integrations";
import Analytics from "./pages/Analytics";
import PassthroughCalls from "./pages/PassthroughCalls";
import PassthroughCallRecords from "./pages/PassthroughCallRecords";
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
              <Route path="call-logs" element={<CallLogs />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="phone-number" element={<PhoneNumber />} />
              <Route path="inbound" element={<Inbound />} />
              <Route path="inbound-context" element={<InboundContext />} /> {/* <-- Add Route */}
              <Route path="passthrough-calls" element={<PassthroughCalls />} />
              <Route path="passthrough-call-records" element={<PassthroughCallRecords />} />
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
