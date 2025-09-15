import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { mockLogin, mockSignup, getCurrentUser, logout as logoutUser } from "./queryClient";
import { signalRService } from "../services/signalRService";
import { apiRepository } from "./apiRepository";

interface AuthContextType {
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();
  
  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthState() {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // Connect to SignalR if user is already logged in
        if (currentUser) {
          const accessToken = apiRepository.getAccessToken();
          if (accessToken) {
            try {
              await signalRService.connect(accessToken);
            } catch (signalRError) {
              console.error("SignalR connection failed during user load:", signalRError);
            }
          }
        }
      } catch (error) {
        console.error("Error loading current user:", error);
      }
      setIsLoading(false);
    };
    
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const loggedInUser = await mockLogin(email, password);
      setUser(loggedInUser);
      
      // Connect to SignalR after successful login
      const accessToken = apiRepository.getAccessToken();
      if (accessToken) {
        try {
          await signalRService.connect(accessToken);
        } catch (signalRError) {
          console.error("SignalR connection failed:", signalRError);
          // Don't throw error here - login was successful, SignalR failure shouldn't block it
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: any) => {
    setIsLoading(true);
    try {
      const newUser = await mockSignup(userData);
      setUser(newUser);
      
      // Connect to SignalR after successful signup
      const accessToken = apiRepository.getAccessToken();
      if (accessToken) {
        try {
          await signalRService.connect(accessToken);
        } catch (signalRError) {
          console.error("SignalR connection failed:", signalRError);
          // Don't throw error here - signup was successful, SignalR failure shouldn't block it
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Disconnect from SignalR before logout
    signalRService.disconnect().catch((error) => {
      console.error("Error disconnecting SignalR:", error);
    });
    
    logoutUser();
    setUser(null);
  };

  return {
    user,
    login,
    signup,
    logout,
    isLoading,
  };
}