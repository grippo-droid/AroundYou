import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api_client";
import type { AxiosError } from "axios";
import { User } from "@/types/api";
import { toast } from "sonner";
import { getFollowingList } from "@/services/api";

interface LoginCredentials {
    phone: string;
    password: string;
}

interface RegisterData {
    name: string;
    email?: string;
    phone: string | number;
    password: string;
    role?: "user" | "business" | "admin";
}

interface ApiErrorData {
    message?: string;
    detail?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    followingIds: Set<string>;
    setFollowingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    sendOtp: (phone: string, purpose: "login" | "register") => Promise<void>;
    loginWithOtp: (phone: string, code: string) => Promise<void>;
    registerWithOtp: (data: { name: string; phone: string; role: string }, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

    const loadFollowing = async (userData: User) => {
        // Prefer the list already embedded in the user doc to save a round-trip
        const ids = userData.followed_businesses ?? [];
        if (ids.length > 0) {
            setFollowingIds(new Set(ids));
        } else {
            try {
                const list = await getFollowingList();
                setFollowingIds(new Set(list));
            } catch {
                // silently ignore — non-critical
            }
        }
    };

    const checkUser = async () => {
        try {
            const { data } = await apiClient.get("/auth/me");
            if (data.success) {
                setUser(data.data);
                await loadFollowing(data.data);
            }
        } catch {
            localStorage.removeItem("access_token");
            setUser(null);
            setFollowingIds(new Set());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUser();
    }, []);

    const refreshUser = async () => {
        await checkUser();
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            const { data } = await apiClient.post("/auth/login", credentials);
            if (data.success) {
                const { access_token } = data.data;
                localStorage.setItem("access_token", access_token);
                toast.success("Welcome back!");
                const me = await apiClient.get("/auth/me");
                setUser(me.data.data);
                await loadFollowing(me.data.data);
            }
        } catch (err) {
            const error = err as AxiosError<ApiErrorData>;
            toast.error(error.response?.data?.detail || error.response?.data?.message || "Login failed");
            throw err;
        }
    };

    const register = async (userData: RegisterData) => {
        try {
            const { data } = await apiClient.post("/auth/register", { ...userData, phone: String(userData.phone) });
            if (data.success) {
                toast.success("Account created! Please login.");
            }
        } catch (err) {
            const error = err as AxiosError<ApiErrorData>;
            toast.error(error.response?.data?.message || error.response?.data?.detail || "Registration failed");
            throw err;
        }
    };

    const logout = async () => {
        try {
            await apiClient.post("/auth/logout");
            localStorage.removeItem("access_token");
            setUser(null);
            setFollowingIds(new Set());
            toast.success("Logged out");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const sendOtp = async (phone: string, purpose: "login" | "register") => {
        try {
            await apiClient.post("/auth/send-otp", { phone, purpose });
            toast.success(`OTP sent to ${phone}`);
        } catch (err) {
            const error = err as AxiosError<ApiErrorData>;
            toast.error(error.response?.data?.detail || error.response?.data?.message || "Failed to send OTP");
            throw err;
        }
    };

    const loginWithOtp = async (phone: string, code: string) => {
        try {
            const { data } = await apiClient.post("/auth/login-otp", { phone, code });
            if (data.success) {
                localStorage.setItem("access_token", data.data.access_token);
                toast.success("Welcome back!");
                const me = await apiClient.get("/auth/me");
                setUser(me.data.data);
                await loadFollowing(me.data.data);
            }
        } catch (err) {
            const error = err as AxiosError<ApiErrorData>;
            toast.error(error.response?.data?.detail || "OTP verification failed");
            throw err;
        }
    };

    const registerWithOtp = async (
        userData: { name: string; phone: string; role: string },
        code: string
    ) => {
        try {
            const { data } = await apiClient.post("/auth/register-otp", { ...userData, code });
            if (data.success) {
                localStorage.setItem("access_token", data.data.access_token);
                toast.success("Account created! Welcome to NearMe!");
                const me = await apiClient.get("/auth/me");
                setUser(me.data.data);
                await loadFollowing(me.data.data);
            }
        } catch (err) {
            const error = err as AxiosError<ApiErrorData>;
            toast.error(error.response?.data?.detail || error.response?.data?.message || "Registration failed");
            throw err;
        }
    };

    return (
        <AuthContext.Provider value={{
            user, loading, followingIds, setFollowingIds,
            login, register, logout, refreshUser,
            sendOtp, loginWithOtp, registerWithOtp,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
