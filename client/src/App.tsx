import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCoupleStore } from '@/stores';
import { AppLayout } from '@/components/layout/AppLayout';
import Welcome from '@/pages/Welcome';
import Home from '@/pages/Home';
import Challenge from '@/pages/Challenge';
import Chat from '@/pages/Chat';
import Memories from '@/pages/Memories';
import Voice from '@/pages/Voice';
import Calls from '@/pages/Calls';
import CalendarPage from '@/pages/Calendar';
import Achievements from '@/pages/Achievements';
import Statistics from '@/pages/Statistics';
import BucketList from '@/pages/BucketList';
import LoveNotes from '@/pages/LoveNotes';
import Surprises from '@/pages/Surprises';
import Settings from '@/pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isJoined = useCoupleStore((s) => s.isJoined);
  if (!isJoined) return <Navigate to="/welcome" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/challenge" element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/memories" element={<ProtectedRoute><Memories /></ProtectedRoute>} />
          <Route path="/voice" element={<ProtectedRoute><Voice /></ProtectedRoute>} />
          <Route path="/calls" element={<ProtectedRoute><Calls /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
          <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
          <Route path="/bucket-list" element={<ProtectedRoute><BucketList /></ProtectedRoute>} />
          <Route path="/love-notes" element={<ProtectedRoute><LoveNotes /></ProtectedRoute>} />
          <Route path="/surprises" element={<ProtectedRoute><Surprises /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
