import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Entities from "@/pages/entities";
import Branches from "@/pages/branches";
import Restaurants from "@/pages/restaurants";
import Orders from "@/pages/orders";
import Analytics from "@/pages/analytics";
import Users from "@/pages/users";
import Feedbacks from "@/pages/feedbacks";
import Reporting from "@/pages/reporting";
import Appearance from "@/pages/appearance";
import Chef from "@/pages/chef";
import Layout from "@/components/layout";
import { useAuth, AuthProvider } from "@/lib/auth";
import React from "react";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

// Role-based router for dashboard and root routes
function RoleBasedDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  React.useEffect(() => {
    console.log("User role:", user?.role);
    if (user?.role === "Chef") {
      navigate("/chef", { replace: true });
    }
  }, [user, navigate]);

  // If user is Chef, show loading while redirect happens
  if (user?.role === "Chef") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return <Dashboard />;
}

// Chef guard to redirect non-chef users away from chef page
function ChefGuard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  React.useEffect(() => {
    console.log("User role:", user?.role);
    if (user?.role !== "Chef") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // If user is not Chef, show loading while redirect happens
  if (user?.role !== "Chef") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return <Chef />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route
        path="/"
        component={() => <ProtectedRoute component={RoleBasedDashboard} />}
      />
      <Route
        path="/dashboard"
        component={() => <ProtectedRoute component={RoleBasedDashboard} />}
      />
      <Route
        path="/entities"
        component={() => <ProtectedRoute component={Entities} />}
      />
      <Route
        path="/branches"
        component={() => <ProtectedRoute component={Branches} />}
      />
      <Route
        path="/restaurants"
        component={() => <ProtectedRoute component={Restaurants} />}
      />
      <Route
        path="/hotel-management"
        component={() => <ProtectedRoute component={Orders} />}
      />
      <Route
        path="/restaurant-management"
        component={() => <ProtectedRoute component={Orders} />}
      />
      <Route
        path="/analytics"
        component={() => <ProtectedRoute component={Analytics} />}
      />
      <Route
        path="/users"
        component={() => <ProtectedRoute component={Users} />}
      />
      <Route
        path="/feedbacks"
        component={() => <ProtectedRoute component={Feedbacks} />}
      />
      <Route
        path="/reporting"
        component={() => <ProtectedRoute component={Reporting} />}
      />
      <Route
        path="/appearance"
        component={() => <ProtectedRoute component={Appearance} />}
      />
      <Route
        path="/chef"
        component={() => <ProtectedRoute component={ChefGuard} />}
      />
      {/* Fallback to dashboard for unknown routes */}
      <Route component={() => <ProtectedRoute component={Dashboard} />} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
