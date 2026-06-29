import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Store, User } from "lucide-react";

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
    const { register } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        password: "",
        role: searchParams.get("role") === "business" ? "business" : "user",
    });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(formData);
            navigate("/login");
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
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Join NearMe — discover businesses near you.</CardDescription>
                </CardHeader>

                <form onSubmit={handleRegister}>
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
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Min. 6 characters"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={6}
                            />
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
                            disabled={loading || !formData.name.trim() || !formData.phone.trim() || !formData.password.trim()}
                        >
                            {loading ? "Creating account…" : "Create Account →"}
                        </Button>
                        <p className="text-sm text-center text-muted-foreground">
                            Already have an account?{" "}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Login
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default Register;
