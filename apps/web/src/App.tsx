import { useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { AuthProvider, useAuth } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { JoinPage } from "./pages/JoinPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "./pages/PasswordPages";
import { ClassPage } from "./pages/ClassPage";
import { ClassJoinPage } from "./pages/ClassJoinPage";
import { LandingPage } from "./pages/LandingPage";
import { GithubCallbackPage } from "./pages/GithubSignIn";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectPage } from "./pages/ProjectPage";
import { FileEditorPage } from "./pages/FileEditorPage";
import { EmptyProjectView } from "./pages/EmptyProjectView";
import { DesignSystemPage } from "./pages/DesignSystemPage";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      gcTime: WEEK_MS,
      networkMode: "offlineFirst",
    },
  },
});

function Home() {
  const { isAuthenticated } = useAuth();
  const wasSignedIn = useRef(isAuthenticated);
  if (isAuthenticated) {
    wasSignedIn.current = true;
    return <ProjectsPage />;
  }
  return wasSignedIn.current ? <Navigate to="/login" replace /> : <LandingPage />;
}

export const QUERY_CACHE_KEY = "collab.query-cache";

const persister = createSyncStoragePersister({ storage: window.localStorage, key: QUERY_CACHE_KEY });

export function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: WEEK_MS }}
    >
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/join/:code" element={<JoinPage />} />
              <Route path="/class/:code" element={<ClassJoinPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/design-system" element={<DesignSystemPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/github" element={<GithubCallbackPage />} />
              <Route path="/" element={<Home />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/classes/:classId" element={<ClassPage />} />
                <Route path="/projects/:projectId" element={<ProjectPage />}>
                  <Route index element={<EmptyProjectView />} />
                  <Route path="files/:fileId" element={<FileEditorPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
