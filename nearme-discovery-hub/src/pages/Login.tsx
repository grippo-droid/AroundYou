import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Phone, Lock } from "lucide-react";

const Login = () => {
    const [searchParams] = useSearchParams();
    const { login, sendOtp, loginWithOtp } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    const from = (location.state as { from?: string } | null)?.from || "/";

    // ── Password tab ──────────────────────────────────────────────────────────
    const [pwForm, setPwForm] = useState({ phone: "", password: "" });

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(pwForm);
            navigate(from, { replace: true });
        } catch {
            // toast shown by AuthContext
        } finally {
            setLoading(false);
        }
    };

    // ── OTP tab ───────────────────────────────────────────────────────────────
    const [otpPhone, setOtpPhone] = useState("");
    const [otpStep, setOtpStep] = useState<"phone" | "code">("phone");
    const [otpCode, setOtpCode] = useState("");
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const handleSendOtp = async () => {
        if (!otpPhone.trim()) return;
        setLoading(true);
        try {
            await sendOtp(otpPhone.trim(), "login");
            setOtpStep("code");
            setCountdown(60);
        } catch {
            // toast shown by AuthContext
        } finally {
            setLoading(false);
        }
    };

    const handleOtpLogin = async () => {
        if (otpCode.length !== 6) return;
        setLoading(true);
        try {
            await loginWithOtp(otpPhone.trim(), otpCode);
            navigate(from, { replace: true });
        } catch {
            // toast shown by AuthContext
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0 || loading) return;
        setLoading(true);
        try {
            await sendOtp(otpPhone.trim(), "login");
            setOtpCode("");
            setCountdown(60);
        } catch {
            // toast shown by AuthContext
        } finally {
            setLoading(false);
        }
    };

    const registerPath = `/register${searchParams.get("role") ? "?role=" + searchParams.get("role") : ""}`;

    return (
        <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription>Sign in to your NearMe account</CardDescription>
                </CardHeader>

                <CardContent>
                    <Tabs defaultValue="otp">
                        <TabsList className="w-full mb-6">
                            <TabsTrigger value="otp" className="flex-1">
                                <Phone className="h-3.5 w-3.5 mr-1.5" />OTP
                            </TabsTrigger>
                            <TabsTrigger value="password" className="flex-1">
                                <Lock className="h-3.5 w-3.5 mr-1.5" />Password
                            </TabsTrigger>
                        </TabsList>

                        {/* ── OTP ── */}
                        <TabsContent value="otp" className="space-y-4 mt-0">
                            {otpStep === "phone" ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Phone Number</Label>
                                        <Input
                                            placeholder="+91 98765 43210"
                                            value={otpPhone}
                                            onChange={(e) => setOtpPhone(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                                            autoFocus
                                        />
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handleSendOtp}
                                        disabled={loading || !otpPhone.trim()}
                                    >
                                        {loading ? "Sending…" : "Send OTP"}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="text-center space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            OTP sent to{" "}
                                            <span className="font-medium text-foreground">{otpPhone}</span>
                                        </p>
                                        <button
                                            type="button"
                                            className="text-xs text-primary hover:underline"
                                            onClick={() => { setOtpStep("phone"); setOtpCode(""); }}
                                        >
                                            Change number
                                        </button>
                                    </div>

                                    <div className="flex justify-center py-2">
                                        <InputOTP
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={setOtpCode}
                                        >
                                            <InputOTPGroup>
                                                <InputOTPSlot index={0} />
                                                <InputOTPSlot index={1} />
                                                <InputOTPSlot index={2} />
                                                <InputOTPSlot index={3} />
                                                <InputOTPSlot index={4} />
                                                <InputOTPSlot index={5} />
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>

                                    <Button
                                        className="w-full"
                                        onClick={handleOtpLogin}
                                        disabled={loading || otpCode.length !== 6}
                                    >
                                        {loading ? "Verifying…" : "Verify & Login"}
                                    </Button>

                                    <p className="text-center text-xs text-muted-foreground">
                                        {countdown > 0 ? (
                                            <>
                                                Resend in{" "}
                                                <span className="font-medium text-foreground tabular-nums">
                                                    {countdown}s
                                                </span>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                className="text-primary hover:underline disabled:opacity-50"
                                                onClick={handleResend}
                                                disabled={loading}
                                            >
                                                Resend OTP
                                            </button>
                                        )}
                                    </p>
                                </>
                            )}
                        </TabsContent>

                        {/* ── Password ── */}
                        <TabsContent value="password" className="mt-0">
                            <form onSubmit={handlePasswordLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        placeholder="+91 98765 43210"
                                        value={pwForm.phone}
                                        onChange={(e) => setPwForm({ ...pwForm, phone: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={pwForm.password}
                                        onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Logging in…" : "Login"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>

                <CardFooter>
                    <p className="text-sm text-center text-muted-foreground w-full">
                        Don't have an account?{" "}
                        <Link to={registerPath} className="text-primary hover:underline font-medium">
                            Register
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
