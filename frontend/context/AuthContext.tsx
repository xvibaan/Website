"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { logoutWithAction } from "@/app/logout/actions";

export interface UserWallet {
  balance: number;
}

export interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  wallet?: UserWallet;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.get<{user: User} | User>("/auth/me");
      let currentUser: User | null = null;
      if (data && 'user' in data) {
        currentUser = data.user;
      } else {
        currentUser = data as User;
      }

      if (currentUser) {
        try {
          const walletRes = await api.get<{ wallet: { balance: string | number } }>("/wallet");
          if (walletRes && walletRes.wallet) {
            currentUser.wallet = {
              balance: Number(walletRes.wallet.balance) || 0,
            };
          }
        } catch {
          // If wallet fetch fails (e.g. initial setup), continue without failing user session
        }
      }

      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    try {
      // Call the Server Action to delete the HttpOnly cookie securely
      const result = await logoutWithAction();

      if (result?.success) {
        // Only clear the client-side state if the server confirms cookie deletion
        setUser(null);
      } else {
        console.error("Logout failed on server:", result?.error);
      }
    } catch (error) {
      console.error("Unexpected error during logout:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
