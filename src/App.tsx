import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Index from "./routes/Index";
import Auth from "./routes/Auth";
import DashboardLayout from "./routes/dashboard";
import Assistant from "./routes/dashboard/assistant";
import Tools from "./routes/dashboard/tools";
import CallLogs from "./routes/dashboard/call-logs";
import ApiKeys from "./routes/dashboard/api-keys";
import PhoneNumber from "./routes/dashboard/phone-number";
import Inbound from "./routes/dashboard/inbound";
import InboundContext from "./routes/dashboard/inbound-context";
import Integrations from "./routes/dashboard/integrations";
import Analytics from "./routes/dashboard/analytics";
import MakeCall from "./routes/dashboard/make-call";
import PassthroughCallRecords from "./routes/dashboard/passthrough-call-records";
import AudioLibrary from "./routes/dashboard/audio-library";
import NotFound from "./routes/NotFound";

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
              <Route path="audio-library" element={<AudioLibrary />} /> {/* <-- 2. Add Route */}
              <Route path="call-logs" element={<CallLogs />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="phone-number" element={<PhoneNumber />} />
              <Route path="inbound" element={<Inbound />} />
              <Route path="inbound-context" element={<InboundContext />} /> {/* <-- Add Route */}
              <Route path="make-call" element={<MakeCall />} />
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
