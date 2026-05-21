import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Subject from "./pages/Subject.tsx";
import Topic from "./pages/Topic.tsx";
import Games from "./pages/Games.tsx";
import Game from "./pages/Game.tsx";
import Progress from "./pages/Progress.tsx";
import Settings from "./pages/Settings.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "@/hooks/useAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/giris" element={<Auth />} />
            <Route path="/konu/:subjectId" element={<Subject />} />
            <Route path="/konu/:subjectId/:topicId" element={<Topic />} />
            <Route path="/oyunlar" element={<Games />} />
            <Route path="/oyunlar/:gameId" element={<Game />} />
            <Route path="/ilerleme" element={<Progress />} />
            <Route path="/ayarlar" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
