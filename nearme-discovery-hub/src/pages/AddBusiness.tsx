import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBusiness } from "@/services/api";
import { toast } from "sonner";
import { categories } from "@/services/mockData";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api_client";
import { ImageUpload } from "@/components/ImageUpload";

const AddBusiness = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [category, setCategory] = useState<string>(categories[0].name);
    const [coverImageUrl, setCoverImageUrl] = useState("");

    // Auth Check
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Redirect if not logged in
    if (!authLoading && !user) {
        return (
            <div className="container flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <h2 className="text-2xl font-bold">Sign in Required</h2>
                <p className="text-muted-foreground">You need to be logged in to add a business.</p>
                <Button asChild>
                    <Link to="/login" state={{ from: "/add-business" }}>Login Now</Link>
                </Button>
            </div>
        );
    }

    // Check Role
    if (!authLoading && user && user.role !== "business" && !showUpgradeModal) {
        setShowUpgradeModal(true);
    }

    const { logout } = useAuth();

    // Restore onSubmit here since it was removed in previous chunk
    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            // Prepare payload
            const payload = {
                ...data,
                category,
                location: {
                    lat: 12.9716, // Default to Bangalore for now
                    lng: 77.5946
                },
                images: coverImageUrl ? [coverImageUrl] : [],
                timings: [] // TODO: Detailed timings
            };

            await createBusiness(payload);
            toast.success("Business added successfully!");
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add business");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBusinessAccount = async () => {
        await logout();
        navigate("/register?role=business");
    };

    if (authLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (showUpgradeModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <Card className="w-full max-w-md mx-4 shadow-lg">
                    <CardHeader>
                        <CardTitle>Business Account Required</CardTitle>
                        <CardDescription>
                            To list your business on NearMe, you need a dedicated Business Owner account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted text-sm border-l-4 border-primary">
                            <p className="font-medium mb-2">Please log in or sign up as a business owner.</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                <li>Separate account for business management</li>
                                <li>Access to business dashboard</li>
                                <li>Post jobs and hire staff</li>
                            </ul>
                        </div>                    </CardContent>
                    <div className="p-6 pt-0 flex flex-col sm:flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => navigate("/")}>Cancel</Button>
                        <Button onClick={handleCreateBusinessAccount}>
                            Login / Signup as Owner
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="container max-w-2xl py-8">
            <Button variant="ghost" className="mb-4 pl-0" asChild>
                <Link to="/dashboard"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Business</CardTitle>
                    <CardDescription>List your business on NearMe for everyone to see.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        <div className="space-y-2">
                            <Label htmlFor="name">Business Name</Label>
                            <Input id="name" {...register("name", { required: true })} placeholder="e.g. Tasty Bites Cafe" />
                            {errors.name && <span className="text-xs text-red-500">Name is required</span>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select onValueChange={setCategory} defaultValue={category}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.name} value={cat.name}>
                                            <span className="flex items-center gap-2">
                                                <span>{cat.icon}</span>
                                                <span>{cat.name}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" {...register("description", { required: true })} placeholder="Tell us about your business..." />
                            {errors.description && <span className="text-xs text-red-500">Description is required</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact_number">Contact Number</Label>
                                <Input id="contact_number" {...register("contact_number", { required: true })} placeholder="+91..." />
                                {errors.contact_number && <span className="text-xs text-red-500">Phone is required</span>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" {...register("city", { required: true })} placeholder="e.g. Bangalore" />
                                {errors.city && <span className="text-xs text-red-500">City is required</span>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Full Address</Label>
                            <Textarea id="address" {...register("address", { required: true })} placeholder="Shop No, Street, Area..." />
                            {errors.address && <span className="text-xs text-red-500">Address is required</span>}
                        </div>

                        <ImageUpload
                            label="Cover Photo (optional)"
                            currentUrl={coverImageUrl}
                            onUpload={(url) => setCoverImageUrl(url)}
                        />

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Creating..." : "Create Business"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AddBusiness;
