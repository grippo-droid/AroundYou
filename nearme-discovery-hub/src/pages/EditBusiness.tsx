import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBusinessById, updateBusiness } from "@/services/api";
import { toast } from "sonner";
import { categories } from "@/services/mockData";
import { ImageUpload } from "@/components/ImageUpload";

const EditBusiness = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const { register, handleSubmit, setValue, formState: { errors } } = useForm();
    const [category, setCategory] = useState<string>(categories[0].name);
    const [coverImageUrl, setCoverImageUrl] = useState("");

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                if (!id) return;
                const data = await getBusinessById(id);
                if (data) {
                    setValue("name", data.name);
                    setValue("description", data.description);
                    setValue("contact_number", data.contact_number);
                    setValue("city", data.city);
                    setValue("address", data.address);
                    setCategory(data.category);
                    setCoverImageUrl(data.images?.[0] ?? "");
                } else {
                    toast.error("Business not found");
                    navigate("/dashboard");
                }
            } catch (error) {
                console.error("Failed to fetch business", error);
                toast.error("Failed to load business details");
            } finally {
                setFetching(false);
            }
        };
        fetchBusiness();
    }, [id, setValue, navigate]);

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            if (!id) return;
            const payload = {
                ...data,
                category,
                images: coverImageUrl ? [coverImageUrl] : [],
            };

            await updateBusiness(id, payload);
            toast.success("Business updated successfully!");
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update business");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-8 text-center">Loading business details...</div>;

    return (
        <div className="container max-w-2xl py-8">
            <Button variant="ghost" className="mb-4 pl-0" asChild>
                <Link to="/dashboard"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Edit Business</CardTitle>
                    <CardDescription>Update your business listing details.</CardDescription>
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
                            <Select onValueChange={setCategory} value={category}>
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
                            label="Cover Photo"
                            currentUrl={coverImageUrl}
                            onUpload={(url) => setCoverImageUrl(url)}
                        />

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default EditBusiness;
