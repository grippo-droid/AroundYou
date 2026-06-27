import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, Trash2, UserPlus, Users, Briefcase, MapPin, DollarSign, Clock, FileText, X, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    getBusinessById, getBusinessStaff, addBusinessStaff,
    removeBusinessStaff, getBusinessJobs, getBusinessApplications,
    updateApplicationStatus, deleteApplication,
} from "@/services/api";
import type { ApiApplication } from "@/services/api";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateJobDialog } from "@/components/CreateJobDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";

const STATUS_OPTIONS = ["pending", "reviewed", "accepted", "rejected"] as const;
const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    reviewed: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
};

const BusinessStaff = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [businessName, setBusinessName] = useState("");
    const [staff, setStaff] = useState<any[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [applications, setApplications] = useState<ApiApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: "", phone: "", designation: "" });
    const [openStaffDialog, setOpenStaffDialog] = useState(false);
    const [activeTab, setActiveTab] = useState("staff");
    const [filterJobId, setFilterJobId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            if (!id) return;
            const [businessData, staffData, jobsData, appsData] = await Promise.all([
                getBusinessById(id),
                getBusinessStaff(id),
                getBusinessJobs(id).catch(() => []),
                getBusinessApplications(id).catch(() => []),
            ]);

            if (businessData) {
                setBusinessName(businessData.name);
                setStaff(staffData);
                setJobs(jobsData || []);
                setApplications(appsData || []);
            } else {
                toast.error("Business not found");
                navigate("/dashboard");
            }
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Failed to load details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, navigate]);

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStaff.name || !newStaff.phone || !newStaff.designation) {
            toast.error("Please fill in all fields");
            return;
        }
        setAdding(true);
        try {
            await addBusinessStaff(id!, newStaff);
            toast.success("Staff member added successfully!");
            setNewStaff({ name: "", phone: "", designation: "" });
            setOpenStaffDialog(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to add staff member");
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveStaff = async (staffId: string) => {
        try {
            await removeBusinessStaff(id!, staffId);
            setStaff(staff.filter(s => s.id !== staffId));
            toast.success("Staff member removed");
        } catch {
            toast.error("Failed to remove staff member");
        }
    };

    const handleStatusChange = async (applicationId: string, newStatus: string) => {
        try {
            await updateApplicationStatus(applicationId, newStatus);
            setApplications(prev =>
                prev.map(a => a._id === applicationId ? { ...a, status: newStatus as ApiApplication["status"] } : a)
            );
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleDeleteApplication = async (applicationId: string) => {
        try {
            await deleteApplication(applicationId);
            setApplications(prev => prev.filter(a => a._id !== applicationId));
            toast.success("Application deleted");
        } catch {
            toast.error("Failed to delete application");
        }
    };

    const handleViewApplicants = (jobId: string) => {
        setFilterJobId(jobId);
        setActiveTab("applicants");
    };

    // Group all applications by job_id
    const groupedApplications = useMemo(() => {
        const map = new Map<string, { title: string; apps: ApiApplication[] }>();
        applications.forEach((app) => {
            if (!map.has(app.job_id)) {
                map.set(app.job_id, { title: app.job_title, apps: [] });
            }
            map.get(app.job_id)!.apps.push(app);
        });
        return map;
    }, [applications]);

    // Apply optional job filter
    const visibleGroups = useMemo(() => {
        if (filterJobId) {
            const group = groupedApplications.get(filterJobId);
            return group ? [group] : [];
        }
        return [...groupedApplications.values()];
    }, [groupedApplications, filterJobId]);

    if (loading) return <div className="p-8 text-center">Loading details...</div>;

    return (
        <div className="container max-w-4xl py-8">
            <div className="mb-8">
                <Button variant="ghost" className="mb-2 pl-0" asChild>
                    <Link to="/dashboard"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Workforce Management</h1>
                <p className="text-muted-foreground text-lg">{businessName}</p>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(v) => {
                    setActiveTab(v);
                    if (v !== "applicants") setFilterJobId(null);
                }}
                className="w-full"
            >
                <TabsList className="mb-6">
                    <TabsTrigger value="staff">Current Staff</TabsTrigger>
                    <TabsTrigger value="jobs">Job Postings</TabsTrigger>
                    <TabsTrigger value="applicants" className="gap-1.5">
                        Applicants
                        {applications.length > 0 && (
                            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                {applications.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ── Staff tab ── */}
                <TabsContent value="staff">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Staff Members ({staff.length})
                        </h2>
                        <Dialog open={openStaffDialog} onOpenChange={setOpenStaffDialog}>
                            <DialogTrigger asChild>
                                <Button>
                                    <UserPlus className="mr-2 h-4 w-4" /> Add Staff
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Staff Member</DialogTitle>
                                    <DialogDescription>
                                        Enter the details of the staff member you want to add.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddStaff} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="John Doe"
                                            value={newStaff.name}
                                            onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            placeholder="+91..."
                                            value={newStaff.phone}
                                            onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="designation">Designation</Label>
                                        <Input
                                            id="designation"
                                            placeholder="Manager, Server, etc."
                                            value={newStaff.designation}
                                            onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" disabled={adding} className="w-full">
                                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                        Add Staff Member
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {staff.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20 border-dashed">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                            <h3 className="text-lg font-medium">No staff members yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">Add your first staff member to get started.</p>
                            <Button variant="outline" onClick={() => setOpenStaffDialog(true)}>
                                Add Staff Member
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {staff.map((member) => (
                                <Card key={member.id} className="relative group">
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12 border">
                                                    <AvatarFallback className="bg-primary/5 text-primary text-lg font-semibold">
                                                        {member.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold text-lg">{member.name}</div>
                                                    <div className="text-sm text-muted-foreground">{member.designation}</div>
                                                    <div className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded-full inline-block">
                                                        {member.phone}
                                                    </div>
                                                </div>
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to remove <strong>{member.name}</strong>? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveStaff(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                            Remove Staff
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── Jobs tab ── */}
                <TabsContent value="jobs">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            Job Postings ({jobs.length})
                        </h2>
                        <CreateJobDialog businessId={id!} onJobCreated={fetchData} />
                    </div>

                    {jobs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20 border-dashed">
                            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                            <h3 className="text-lg font-medium">No jobs posted yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">Create a job posting to hire new staff.</p>
                            <CreateJobDialog
                                businessId={id!}
                                onJobCreated={fetchData}
                                trigger={<Button variant="outline">Post a Job</Button>}
                            />
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {jobs.map((job) => {
                                const jobId = job.id || job._id;
                                const appCount = groupedApplications.get(jobId)?.apps.length ?? 0;
                                return (
                                    <Card key={jobId} className="overflow-hidden">
                                        <div className="flex items-center justify-between p-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-xl">{job.title}</h3>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${job.is_active || job.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {job.is_active || job.isActive ? 'Active' : 'Closed'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" /> {job.type}
                                                    </div>
                                                    {(job.salary || job.salary !== "") && (
                                                        <div className="flex items-center gap-1">
                                                            <DollarSign className="h-3.5 w-3.5" /> {job.salary}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <div className="text-sm text-muted-foreground mb-2">
                                                    Posted {(job.posted_at || job.postedAt) ? formatDistanceToNow(new Date(job.posted_at || job.postedAt)) : "recently"} ago
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewApplicants(jobId)}
                                                >
                                                    Applicants
                                                    {appCount > 0 && (
                                                        <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                                            {appCount}
                                                        </span>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="bg-muted/30 px-6 py-3 text-sm border-t">
                                            <p className="line-clamp-2 text-muted-foreground">{job.description}</p>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ── Applicants tab ── */}
                <TabsContent value="applicants">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Applicants ({applications.length})
                        </h2>
                        {filterJobId && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFilterJobId(null)}
                                className="gap-1.5"
                            >
                                <X className="h-3.5 w-3.5" />
                                Show all jobs
                            </Button>
                        )}
                    </div>

                    {filterJobId && groupedApplications.get(filterJobId) && (
                        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/50">
                            <span className="text-sm text-muted-foreground">Filtered by:</span>
                            <Badge variant="secondary">{groupedApplications.get(filterJobId)!.title}</Badge>
                        </div>
                    )}

                    {visibleGroups.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20 border-dashed">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">
                                {filterJobId ? "No applicants for this job yet" : "No applications received yet"}
                            </p>
                            <p className="text-sm mt-1">Applications will appear here once candidates apply.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {visibleGroups.map(({ title, apps }) => (
                                <div key={title}>
                                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                        {title}
                                        <span className="text-sm font-normal text-muted-foreground">({apps.length})</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {apps.map((app) => (
                                            <Card key={app._id}>
                                                <CardContent className="pt-4 pb-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <Avatar className="h-9 w-9 shrink-0 border">
                                                                <AvatarFallback className="text-sm font-semibold bg-primary/5 text-primary">
                                                                    {app.name.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-sm">{app.name}</p>
                                                                <p className="text-xs text-muted-foreground">{app.phone} · {app.email}</p>
                                                                {app.resume_url && (
                                                                    <a
                                                                        href={app.resume_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-xs text-primary hover:underline mt-0.5 inline-block"
                                                                    >
                                                                        View Resume ↗
                                                                    </a>
                                                                )}
                                                                {app.cover_note && (
                                                                    <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2 border-l-2 pl-2">
                                                                        {app.cover_note}
                                                                    </p>
                                                                )}
                                                                <p className="text-[11px] text-muted-foreground mt-1.5">
                                                                    Applied {app.created_at
                                                                        ? formatDistanceToNow(new Date(app.created_at)) + " ago"
                                                                        : "recently"
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 flex flex-col items-end gap-2">
                                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[app.status]}`}>
                                                                {app.status}
                                                            </span>
                                                            <select
                                                                value={app.status}
                                                                onChange={(e) => handleStatusChange(app._id, e.target.value)}
                                                                className="text-xs border rounded px-2 py-1 bg-background cursor-pointer"
                                                            >
                                                                {STATUS_OPTIONS.map(s => (
                                                                    <option key={s} value={s}>
                                                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                                        <Trash className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete application?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will permanently delete <strong>{app.name}</strong>'s application. This cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDeleteApplication(app._id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default BusinessStaff;
