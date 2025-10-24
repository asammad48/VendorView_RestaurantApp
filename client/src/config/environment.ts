// Environment Configuration
export type Environment = "development" | "qa" | "production";

export interface EnvironmentConfig {
  apiBaseUrl: string;
  signalRBaseUrl: string;
  environment: Environment;
}

// Development URLs
const DEVELOPMENT_API_URL = "https://5dtrtpzg-44336.inc1.devtunnels.ms";
const QA_API_URL =
  "https://restaurant-app-web-qa-001-eecdfsadcfgxevc9.centralindia-01.azurewebsites.net";

// Get API base URL from environment variables or fallback logic
const getApiBaseUrl = (): string => {
  // First priority: explicit environment variable
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  // Second priority: detect from hostname patterns
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // QA environment detection
    if (hostname.includes("qa") || hostname.includes("azurewebsites.net")) {
      return QA_API_URL;
    }

    // Replit development environment
    if (
      hostname.includes("replit") ||
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1")
    ) {
      return DEVELOPMENT_API_URL;
    }

    // For other production-like domains, use current origin as fallback
    if (hostname !== "localhost" && !hostname.includes("dev")) {
      return window.location.origin;
    }
  }

  // Default fallback for development
  return DEVELOPMENT_API_URL;
};

// Get environment name for debugging/analytics
const getEnvironmentName = (): Environment => {
  const envVar = import.meta.env.VITE_ENVIRONMENT as Environment;
  if (envVar && ["development", "qa", "production"].includes(envVar)) {
    return envVar;
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (hostname.includes("qa") || hostname.includes("azurewebsites.net")) {
      return "qa";
    }

    if (
      hostname.includes("replit") ||
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1")
    ) {
      return "development";
    }

    return "production";
  }

  return "development";
};

// Create SignalR hub URL from API base URL
const createSignalRUrl = (apiBaseUrl: string): string => {
  return `${apiBaseUrl}/orderHub`;
};

// Get configuration for current environment
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const apiBaseUrl = getApiBaseUrl();
  const environment = getEnvironmentName();
  const signalRBaseUrl = createSignalRUrl(apiBaseUrl);

  // Only log in development or when DEBUG flag is set
  const shouldLog =
    environment === "development" || import.meta.env.VITE_DEBUG === "true";
  if (shouldLog) {
    console.log(`Environment: ${environment}, API: ${apiBaseUrl}`);
  }

  return {
    apiBaseUrl,
    signalRBaseUrl,
    environment,
  };
};

// Export individual config values for easy access
export const { apiBaseUrl, signalRBaseUrl, environment } =
  getEnvironmentConfig();

// Validation: warn if configuration seems incorrect
if (typeof window !== "undefined" && environment === "production") {
  const hostname = window.location.hostname;
  if (
    apiBaseUrl.includes("devtunnels.ms") ||
    apiBaseUrl.includes("localhost")
  ) {
    console.warn(
      "WARNING: Production environment detected but API URL points to development. Please set VITE_API_BASE_URL environment variable.",
    );
  }
}
