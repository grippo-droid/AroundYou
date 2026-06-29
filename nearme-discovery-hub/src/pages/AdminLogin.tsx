import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, UserPlus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { adminRegister } from "@/services/api";
import { toast } from "sonner";

const AdminLogin = () => {
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // ── Sign in form ────────────────────────────────────────────────────────────
  const [signIn, setSignIn] = useState({ phone: "", password: "" });
  const [showSignInPw, setShowSignInPw] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(signIn);
      // fetchUser is called inside login; role check happens after redirect
      navigate("/admin", { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Register form ───────────────────────────────────────────────────────────
  const [reg, setReg] = useState({ name: "", phone: "", password: "", admin_secret: "" });
  const [showRegPw, setShowRegPw] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.name.trim() || !reg.phone.trim() || !reg.password || !reg.admin_secret) {
      toast.error("All fields are required");
      return;
    }
    setLoading(true);
    try {
      await adminRegister(reg);
      await refreshUser();
      toast.success("Admin account created. Welcome!");
      navigate("/admin", { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-10">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Portal</h1>
          <p className="text-sm text-muted-foreground">
            Restricted access — AroundYou platform administration
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Administrator Access</CardTitle>
            <CardDescription>Sign in to an existing admin account or create a new one using the admin secret key.</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="signin" className="flex-1 gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1 gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Create Admin
                </TabsTrigger>
              </TabsList>

              {/* ── Sign In ── */}
              <TabsContent value="signin" className="mt-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-phone">Phone Number</Label>
                    <Input
                      id="si-phone"
                      placeholder="+91 98765 43210"
                      value={signIn.phone}
                      onChange={(e) => setSignIn({ ...signIn, phone: e.target.value })}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="si-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="si-password"
                        type={showSignInPw ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signIn.password}
                        onChange={(e) => setSignIn({ ...signIn, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSignInPw((v) => !v)}
                        tabIndex={-1}
                      >
                        {showSignInPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in…" : "Sign In as Admin"}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Create Admin ── */}
              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      placeholder="Admin Name"
                      value={reg.name}
                      onChange={(e) => setReg({ ...reg, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone Number</Label>
                    <Input
                      id="reg-phone"
                      placeholder="+91 98765 43210"
                      value={reg.phone}
                      onChange={(e) => setReg({ ...reg, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showRegPw ? "text" : "password"}
                        placeholder="Choose a strong password"
                        value={reg.password}
                        onChange={(e) => setReg({ ...reg, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowRegPw((v) => !v)}
                        tabIndex={-1}
                      >
                        {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-secret">Admin Secret Key</Label>
                    <div className="relative">
                      <Input
                        id="reg-secret"
                        type={showSecret ? "text" : "password"}
                        placeholder="Enter the platform secret key"
                        value={reg.admin_secret}
                        onChange={(e) => setReg({ ...reg, admin_secret: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSecret((v) => !v)}
                        tabIndex={-1}
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set via <code className="bg-muted px-1 rounded text-[11px]">ADMIN_SECRET_KEY</code> in the backend <code className="bg-muted px-1 rounded text-[11px]">.env</code> file.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account…" : "Create Admin Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Not an admin?{" "}
          <a href="/login" className="text-primary hover:underline">Return to regular login</a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
