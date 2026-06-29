import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getJobById, submitApplication, getMyAppliedJobIds, type ApiJob, type ApplicationCreateData } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Clock, Banknote, Briefcase, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const JobDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [job, setJob] = useState<ApiJob | null>(null);
    const [loading, setLoading] = useState(true);
    const [alreadyApplied, setAlreadyApplied] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [applying, setApplying] = useState(false);
    const [form, setForm] = useState<ApplicationCreateData>({
        name: "",
        phone: "",
        email: "",
        cover_note: "",
        resume_url: "",
    });

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                const data = await getJobById(id);
                setJob(data);
            } catch {
                toast.error("Job not found");
                navigate("/jobs");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    useEffect(() => {
        if (!user) return;
        getMyAppliedJobIds()
            .then((ids) => setAlreadyApplied(ids.includes(id!)))
            .catch(() => {});
    }, [user, id]);

    // Pre-fill form from logged-in user
    useEffect(() => {
        if (user) {
            setForm((prev) => ({
                ...prev,
                name: user.name || "",
                phone: user.phone || "",
            }));
        }
    }, [user]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            navigate("/login", { state: { from: `/jobs/${id}` } });
            return;
        }
        setApplying(true);
        try {
            await submitApplication(id!, form);
            toast.success("Application submitted!");
            setAlreadyApplied(true);
            setDialogOpen(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "Failed to submit application");
        } finally {
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!job) return null;

    const descriptionLines = job.description.split("\n");

    return (
        <div className="container max-w-3xl py-8">
            <button
                onClick={() => navigate("/jobs")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Jobs
            </button>

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <CardTitle className="text-2xl mb-1">{job.title}</CardTitle>
                            <Link
                                to={`/business/${job.business_id}`}
                                className="text-primary hover:underline font-medium text-sm"
                            >
                                {job.business_name}
                            </Link>
                        </div>
                        <Badge variant={job.type === "Full Time" || job.type === "Full-time" ? "default" : "secondary"}>
                            {job.type}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Meta row */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 shrink-0" />
                            {job.location}
                        </div>
                        {job.salary && (
                            <div className="flex items-center gap-1.5">
                                <Banknote className="h-4 w-4 shrink-0" />
                                {job.salary}
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 shrink-0" />
                            Posted {formatDistanceToNow(new Date(job.posted_at))} ago
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="font-semibold mb-3">About this role</h3>
                        <div className="text-sm text-muted-foreground space-y-1 whitespace-pre-line leading-relaxed">
                            {descriptionLines.map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="pt-2">
                        {alreadyApplied ? (
                            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                You've already applied for this position
                            </div>
                        ) : (
                            <Button
                                size="lg"
                                onClick={() => {
                                    if (!user) {
                                        navigate("/login", { state: { from: `/jobs/${id}` } });
                                    } else {
                                        setDialogOpen(true);
                                    }
                                }}
                            >
                                <Briefcase className="h-4 w-4 mr-2" />
                                Apply Now
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Application Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Apply for {job.title}</DialogTitle>
                        <DialogDescription>{job.business_name}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleApply} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="app-name">Full Name</Label>
                            <Input
                                id="app-name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="app-phone">Phone</Label>
                            <Input
                                id="app-phone"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="app-email">Email</Label>
                            <Input
                                id="app-email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="app-resume">Resume URL <span className="text-muted-foreground">(optional)</span></Label>
                            <Input
                                id="app-resume"
                                placeholder="https://drive.google.com/..."
                                value={form.resume_url}
                                onChange={(e) => setForm({ ...form, resume_url: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="app-cover">Cover Note <span className="text-muted-foreground">(optional)</span></Label>
                            <Textarea
                                id="app-cover"
                                placeholder="Tell the employer why you're a great fit..."
                                value={form.cover_note}
                                onChange={(e) => setForm({ ...form, cover_note: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={applying}>
                                {applying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit Application"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default JobDetail;
