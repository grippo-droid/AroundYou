import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, CheckCircle2, Store, User } from "lucide-react";

const ACCOUNT_TYPES = [
    {
        value: "user",
        label: "Personal",
        Icon: User,
        desc: "Discover & follow local businesses",
    },
    {
        value: "business",
        label: "Business",
        Icon: Store,
        desc: "List & manage your business",
    },
] as const;

const Register = () => {
    const [searchParams] = useSearchParams();
    const { sendOtp, registerWithOtp } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Step 1 state
    const [step, setStep] = useState<"details" | "otp">("details");
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        role: searchParams.get("role") === "business" ? "business" : "user",
    });

    // Step 2 state
    const [otpCode, setOtpCode] = useState("");
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // ── Step 1: send OTP ──────────────────────────────────────────────────────
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await sendOtp(formData.phone.trim(), "register");
            setStep("otp");
            setCountdown(60);
        } catch {
            // toast shown by AuthContext
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: verify + create account ──────────────────────────────────────
    const handleRegister = async () => {
        if (otpCode.length !== 6) return;
        setLoading(true);
        try {
            await registerWithOtp({ ...formData, phone: formData.phone.trim() }, otpCode);
            navigate("/");
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
            await sendOtp(formData.phone.trim(), "register");
            setOtpCode("");
            setCountdown(60);
        } catch {
            // toast shown by AuthContext
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    {step === "otp" && (
                        <button
                            type="button"
                            onClick={() => { setStep("details"); setOtpCode(""); }}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 -mt-1 w-fit"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </button>
                    )}
                    <CardTitle>
                        {step === "details" ? "Create an Account" : "Verify Your Number"}
                    </CardTitle>
                    <CardDescription>
                        {step === "details"
                            ? "Join NearMe — discover businesses near you."
                            : `Enter the 6-digit OTP sent to ${formData.phone}`}
                    </CardDescription>
                </CardHeader>

                {/* ── Step 1: Details ── */}
                {step === "details" ? (
                    <form onSubmit={handleSendOtp}>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    placeholder="+91 98765 43210"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    We'll send a one-time code to verify your number.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Account Type</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {ACCOUNT_TYPES.map(({ value, label, Icon, desc }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: value })}
                                            className={`relative flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all ${
                                                formData.role === value
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                                            }`}
                                        >
                                            {formData.role === value && (
                                                <CheckCircle2 className="absolute top-2.5 right-2.5 h-4 w-4 text-primary" />
                                            )}
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                            <span className="font-medium text-sm">{label}</span>
                                            <span className="text-xs text-muted-foreground leading-snug">{desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || !formData.name.trim() || !formData.phone.trim()}
                            >
                                {loading ? "Sending OTP…" : "Send OTP →"}
                            </Button>
                            <p className="text-sm text-center text-muted-foreground">
                                Already have an account?{" "}
                                <Link to="/login" className="text-primary hover:underline font-medium">
                                    Login
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                ) : (
                    /* ── Step 2: OTP ── */
                    <CardContent className="space-y-5">
                        <div className="flex justify-center py-3">
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
                            onClick={handleRegister}
                            disabled={loading || otpCode.length !== 6}
                        >
                            {loading ? "Creating account…" : "Create Account"}
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
                    </CardContent>
                )}
            </Card>
        </div>
    );
};

export default Register;
