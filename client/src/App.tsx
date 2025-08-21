import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Redirect } from "wouter";

// Lazy load components for better performance
import { lazy, Suspense } from "react";

// Critical components that should be loaded immediately
import SplashPage from "./pages/splash";
import OnboardingPage from "./pages/onboarding";
import RoleSelectionPage from "./pages/role-selection";
import SignUpPage from "./pages/signup";
import SignInPage from "./pages/signin";
import ForgotPasswordPage from "./pages/forgot-password";
import OtpVerificationPage from "./pages/otp-verification";

// Lazy load non-critical components
const DashboardPage = lazy(() => import("./pages/dashboard"));
const ConsumerHomePage = lazy(() => import("./pages/consumer-home"));
const MerchantDashboardPage = lazy(() => import("./pages/merchant-dashboard"));
const DriverDashboardPage = lazy(() => import("./pages/driver-dashboard"));
const NotFoundPage = lazy(() => import("./pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // In a real application, you would check authentication status from context or state management
  // For demonstration, we are checking localStorage.
  const user = localStorage.getItem("user");

  if (!user) {
    // Redirect to sign-in if not authenticated
    return <Redirect to="/signin" />;
  }

  // Render children if authenticated
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          {/* Authentication Flow - Public Routes */}
          <Route path="/" component={SplashPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/role-selection" component={RoleSelectionPage} />
          <Route path="/signup" component={SignUpPage} />
          <Route path="/signin" component={SignInPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/otp-verification" component={OtpVerificationPage} />

          {/* Dashboard Routes - Protected */}
          <Route path="/dashboard">
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          </Route>

          <Route path="/consumer-home">
            <ProtectedRoute>
              <ConsumerHomePage />
            </ProtectedRoute>
          </Route>

          <Route path="/merchant-dashboard">
            <ProtectedRoute>
              <MerchantDashboardPage />
            </ProtectedRoute>
          </Route>

          <Route path="/driver-dashboard">
            <ProtectedRoute>
              <DriverDashboardPage />
            </ProtectedRoute>
          </Route>

          {/* Fallback */}
          <Route component={NotFoundPage} />
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;