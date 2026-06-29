import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    Plus, Store, CalendarDays, ImagePlus, Loader2,
    Eye, Star, Tag, Trash2, BookOpen, Clock, ChevronRight,
    BadgeCheck, AlertCircle, ShieldCheck, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
    getMyBusinesses, deleteBusiness, createPost,
    fetchBusinessStats, fetchBusinessDeals, createDeal, deleteDeal,
    getBusinessAppointments, getReviewsByBusiness,
} from "@/services/api";
import type { BusinessStats, DealCreateData, ApiBooking } from "@/services/api";
import type { Deal, Review } from "@/types";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Business } from "@/types/api";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDayName(iso: string): string {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short" });
}

function fmtDate(iso: string): string {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

// ── skeleton primitives ───────────────────────────────────────────────────────

function Skel({ className = "" }: { className?: string }) {
    return <div className={`bg-muted animate-pulse rounded ${className}`} />;
}

// ── component ─────────────────────────────────────────────────────────────────

const BusinessDashboard = () => {
    const { user } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [busLoading, setBusLoading] = useState(true);

    const [statsMap, setStatsMap] = useState<Record<string, BusinessStats>>({});
    const [statsLoading, setStatsLoading] = useState(false);

    const [pendingBookings, setPendingBookings] = useState<ApiBooking[]>([]);
    const [recentReviews, setRecentReviews] = useState<Review[]>([]);
    const [rowsLoading, setRowsLoading] = useState(false);

    // ── load businesses ───────────────────────────────────────────────────────
    useEffect(() => {
        getMyBusinesses()
            .then((data) => setBusinesses(data))
            .catch(() => toast.error("Failed to load businesses"))
            .finally(() => setBusLoading(false));
    }, []);

    // ── load stats + appointments + reviews once businesses are ready ─────────
    useEffect(() => {
        if (businesses.length === 0) return;
        setStatsLoading(true);
        setRowsLoading(true);

        Promise.allSettled(
            businesses.map((b) =>
                fetchBusinessStats(b._id!).then((s) => [b._id!, s] as const)
            )
        ).then((results) => {
            const map: Record<string, BusinessStats> = {};
            results.forEach((r) => {
                if (r.status === "fulfilled") {
                    const [id, s] = r.value;
                    map[id] = s;
                }
            });
            setStatsMap(map);
            setStatsLoading(false);
        });

        Promise.allSettled(businesses.map((b) => getBusinessAppointments(b._id!)))
            .then((results) => {
                const all: ApiBooking[] = [];
                results.forEach((r) => {
                    if (r.status === "fulfilled") all.push(...r.value);
                });
                setPendingBookings(
                    all
                        .filter((b) => b.status === "pending")
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .slice(0, 5)
                );
            })
            .finally(() => setRowsLoading(false));

        Promise.allSettled(businesses.map((b) => getReviewsByBusiness(b._id!)))
            .then((results) => {
                const all: Review[] = [];
                results.forEach((r) => {
                    if (r.status === "fulfilled") all.push(...r.value);
                });
                setRecentReviews(all.slice(0, 3));
            });
    }, [businesses]);

    // ── aggregated headline numbers ───────────────────────────────────────────
    const aggregate = useMemo(() => {
        const list = Object.values(statsMap);
        if (list.length === 0) return null;
        return {
            total_views: list.reduce((s, x) => s + x.total_views, 0),
            total_bookings: list.reduce((s, x) => s + x.total_bookings, 0),
            pending_bookings: list.reduce((s, x) => s + x.pending_bookings, 0),
            total_reviews: list.reduce((s, x) => s + x.total_reviews, 0),
            average_rating: +(list.reduce((s, x) => s + x.average_rating, 0) / list.length).toFixed(1),
            bookings_this_week: list.reduce((s, x) => s + x.bookings_this_week, 0),
        };
    }, [statsMap]);

    // ── combined chart data ───────────────────────────────────────────────────
    const chartData = useMemo(() => {
        const list = Object.values(statsMap);
        if (list.length === 0) return [];
        const dayMap: Record<string, number> = {};
        list.forEach((s) =>
            s.bookings_by_day.forEach(({ date, count }) => {
                dayMap[date] = (dayMap[date] ?? 0) + count;
            })
        );
        return Object.entries(dayMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [statsMap]);

    // ── delete handler ────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        try {
            await deleteBusiness(id);
            setBusinesses((prev) => prev.filter((b) => b._id !== id));
            setStatsMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
            toast.success("Business deleted successfully");
        } catch {
            toast.error("Failed to delete business");
        }
    };

    // ── create post dialog ────────────────────────────────────────────────────
    const [postDialogBusiness, setPostDialogBusiness] = useState<Business | null>(null);
    const [postCaption, setPostCaption] = useState("");
    const [postImageUrl, setPostImageUrl] = useState("");
    const [postLoading, setPostLoading] = useState(false);

    const handleCreatePost = async () => {
        if (!postDialogBusiness || !postCaption.trim()) return;
        setPostLoading(true);
        try {
            await createPost(postDialogBusiness._id!, { image: postImageUrl, caption: postCaption.trim() });
            toast.success("Post published!");
            setPostDialogBusiness(null);
            setPostCaption("");
            setPostImageUrl("");
        } catch {
            toast.error("Failed to publish post.");
        } finally {
            setPostLoading(false);
        }
    };

    // ── Manage Deals dialog ───────────────────────────────────────────────────
    const [dealDialogBusiness, setDealDialogBusiness] = useState<Business | null>(null);
    const [dealList, setDealList] = useState<Deal[]>([]);
    const [dealsLoading, setDealsLoading] = useState(false);
    const [newDeal, setNewDeal] = useState({ title: "", description: "", discount_label: "", valid_until: "" });
    const [dealSubmitting, setDealSubmitting] = useState(false);

    const openDealDialog = async (business: Business) => {
        setDealDialogBusiness(business);
        setNewDeal({ title: "", description: "", discount_label: "", valid_until: "" });
        setDealsLoading(true);
        try {
            const deals = await fetchBusinessDeals(business._id!);
            setDealList(deals);
        } catch {
            setDealList([]);
        } finally {
            setDealsLoading(false);
        }
    };

    const handleAddDeal = async () => {
        if (!dealDialogBusiness || !newDeal.title.trim() || !newDeal.discount_label.trim()) return;
        setDealSubmitting(true);
        try {
            const payload: DealCreateData = {
                title: newDeal.title.trim(),
                description: newDeal.description.trim(),
                discount_label: newDeal.discount_label.trim(),
                valid_until: newDeal.valid_until
                    ? new Date(newDeal.valid_until).toISOString()
                    : undefined,
            };
            await createDeal(dealDialogBusiness._id!, payload);
            const updated = await fetchBusinessDeals(dealDialogBusiness._id!);
            setDealList(updated);
            setNewDeal({ title: "", description: "", discount_label: "", valid_until: "" });
            toast.success("Deal added!");
        } catch {
            toast.error("Failed to add deal.");
        } finally {
            setDealSubmitting(false);
        }
    };

    const handleDeleteDeal = async (dealId: string) => {
        try {
            await deleteDeal(dealId);
            setDealList((prev) => prev.filter((d) => d.id !== dealId));
            toast.success("Deal removed.");
        } catch {
            toast.error("Failed to delete deal.");
        }
    };

    if (user && user.role === "user") {
        return (
            <div className="container py-20 text-center space-y-4">
                <Store className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-semibold">Business accounts only</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    The dashboard is for business owners. Register a new account with the Business role to list and manage your business.
                </p>
                <Button asChild variant="outline">
                    <Link to="/explore">Explore businesses</Link>
                </Button>
            </div>
        );
    }

    if (busLoading) return <div className="p-8 text-center">Loading dashboard…</div>;

    // ── Verification gate ─────────────────────────────────────────────────────
    const hasApproved = businesses.some((b) => (b as any).verificationStatus === "approved");
    const allRejected = businesses.length > 0 && businesses.every((b) => (b as any).verificationStatus === "rejected");
    const hasPending  = businesses.some((b) => (b as any).verificationStatus === "pending");

    if (businesses.length > 0 && !hasApproved) {
        return (
            <div className="container py-16 max-w-lg mx-auto text-center space-y-6">
                {allRejected ? (
                    <>
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto">
                            <XCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Verification Not Approved</h2>
                            <p className="text-muted-foreground">
                                Your business listing was not approved. Please contact our support team for more details or submit a new listing.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button asChild variant="outline">
                                <Link to="/add-business">Submit New Listing</Link>
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto">
                            <ShieldCheck className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Verification in Progress</h2>
                            <p className="text-muted-foreground">
                                Your business has been submitted and is currently under review by our team. This usually takes 1–2 business days.
                            </p>
                        </div>

                        {/* Status cards for each pending business */}
                        <div className="space-y-3 text-left">
                            {businesses.map((b) => (
                                <div
                                    key={(b as any)._id}
                                    className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                                        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold truncate">{(b as any).name}</p>
                                        <p className="text-xs text-muted-foreground">{(b as any).city} · {(b as any).category}</p>
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                                        Pending
                                    </Badge>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1.5 text-left">
                            <p className="font-medium text-foreground">What happens next?</p>
                            <p>• Our team will review your business details</p>
                            <p>• You'll receive a notification once verified</p>
                            <p>• Your full dashboard unlocks after approval</p>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="container py-8 space-y-8">

            {/* ── Header ── */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Business Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back{user?.name ? `, ${user.name}` : ""}. Here's how your businesses are performing.
                    </p>
                </div>
                <Button asChild>
                    <Link to="/add-business">
                        <Plus className="mr-2 h-4 w-4" /> Add New Business
                    </Link>
                </Button>
            </div>

            {/* ── Analytics Overview ── */}
            {businesses.length > 0 && (
                <section className="space-y-6">
                    <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide text-xs">
                        Analytics Overview
                        {businesses.length > 1 && <span className="ml-1 normal-case">— across {businesses.length} businesses</span>}
                    </h2>

                    {/* Row 1: stat cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Total Bookings */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <Skel className="h-8 w-20 mb-1" />
                                ) : (
                                    <div className="text-2xl font-bold">{aggregate?.total_bookings ?? 0}</div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                    {statsLoading ? <Skel className="h-3 w-24" /> : (
                                        <>{aggregate?.pending_bookings ?? 0} pending approval</>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* This Week */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <Skel className="h-8 w-16 mb-1" />
                                ) : (
                                    <div className="text-2xl font-bold">{aggregate?.bookings_this_week ?? 0}</div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">bookings in last 7 days</p>
                            </CardContent>
                        </Card>

                        {/* Average Rating */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                                <Star className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <Skel className="h-8 w-16 mb-1" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {aggregate ? `${aggregate.average_rating.toFixed(1)} ★` : "— ★"}
                                    </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                    {statsLoading ? <Skel className="h-3 w-20" /> : (
                                        <>{aggregate?.total_reviews ?? 0} total reviews</>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Profile Views */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <Skel className="h-8 w-20 mb-1" />
                                ) : (
                                    <div className="text-2xl font-bold">{aggregate?.total_views ?? 0}</div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    {businesses.length > 1 ? "across all listings" : "on your listing"}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Row 2: bar chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Bookings — Last 7 Days</CardTitle>
                            <CardDescription>
                                {businesses.length > 1
                                    ? "Combined across all your businesses"
                                    : "For your business"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {statsLoading ? (
                                <Skel className="h-52 w-full" />
                            ) : (
                                <ResponsiveContainer width="100%" height={210}>
                                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={fmtDayName}
                                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={24}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "hsl(var(--popover))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "0.5rem",
                                                fontSize: "12px",
                                            }}
                                            formatter={(v: number) => [v, "Bookings"]}
                                            labelFormatter={fmtDate}
                                        />
                                        <Bar
                                            dataKey="count"
                                            fill="hsl(var(--primary))"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={52}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Row 3: pending bookings + recent reviews */}
                    <div className="grid gap-6 lg:grid-cols-2">

                        {/* Pending bookings */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <div>
                                    <CardTitle className="text-base">Pending Bookings</CardTitle>
                                    <CardDescription>Awaiting your confirmation</CardDescription>
                                </div>
                                {aggregate && aggregate.pending_bookings > 0 && (
                                    <Badge variant="secondary" className="text-orange-600 bg-orange-100 dark:bg-orange-900/30">
                                        {aggregate.pending_bookings} pending
                                    </Badge>
                                )}
                            </CardHeader>
                            <CardContent className="pt-0">
                                {rowsLoading ? (
                                    <div className="space-y-3">
                                        {[0, 1, 2].map((i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <Skel className="h-9 w-9 rounded-full" />
                                                <div className="flex-1 space-y-1.5">
                                                    <Skel className="h-3 w-32" />
                                                    <Skel className="h-3 w-24" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : pendingBookings.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        No pending bookings
                                    </div>
                                ) : (
                                    <ul className="divide-y -mx-1">
                                        {pendingBookings.map((bk) => (
                                            <li key={bk._id} className="flex items-center gap-3 px-1 py-2.5">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                                                    <CalendarDays className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium truncate">{bk.user_name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {bk.business_name} · {fmtDate(bk.date)} at {bk.time_slot}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] shrink-0">pending</Badge>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {pendingBookings.length > 0 && (
                                    <div className="pt-3 border-t mt-1">
                                        {businesses.map((b) => (
                                            <Button key={b._id} variant="ghost" size="sm" className="w-full justify-between text-xs h-8" asChild>
                                                <Link to={`/business/${b._id}/staff`}>
                                                    Manage {b.name} bookings
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent reviews */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Recent Reviews</CardTitle>
                                <CardDescription>Latest customer feedback</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {rowsLoading ? (
                                    <div className="space-y-4">
                                        {[0, 1, 2].map((i) => (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Skel className="h-3 w-20" />
                                                    <Skel className="h-3 w-12" />
                                                </div>
                                                <Skel className="h-3 w-full" />
                                                <Skel className="h-3 w-3/4" />
                                            </div>
                                        ))}
                                    </div>
                                ) : recentReviews.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        No reviews yet
                                    </div>
                                ) : (
                                    <ul className="divide-y -mx-1">
                                        {recentReviews.map((rv) => (
                                            <li key={rv.id} className="px-1 py-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium">{rv.userName}</span>
                                                    <span className="flex items-center gap-0.5 text-amber-500 text-xs font-semibold">
                                                        {rv.rating}
                                                        <Star className="h-3 w-3 fill-amber-500" />
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    "{rv.text}"
                                                </p>
                                                <p className="text-[11px] text-muted-foreground/60 mt-1">{rv.createdAt}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </section>
            )}

            {/* ── My Businesses ── */}
            <div>
                <h2 className="text-xl font-semibold mb-4">My Businesses</h2>
                {businesses.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-muted/20">
                        <Store className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium">No businesses yet</h3>
                        <p className="text-muted-foreground mb-4">Get started by adding your first business listing.</p>
                        <Button asChild variant="outline">
                            <Link to="/add-business">Add Business</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {businesses.map((business) => {
                            const s = statsMap[business._id!];
                            return (
                                <Card key={business._id} className="overflow-hidden">
                                    <div className="aspect-video bg-muted relative">
                                        {business.images?.[0] ? (
                                            <img src={business.images[0]} alt={business.name} className="object-cover w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                                        )}
                                    </div>
                                    {/* Verification status banner */}
                                    {(business as any).verificationStatus === "pending" && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs">
                                            <Clock className="h-3.5 w-3.5 shrink-0" />
                                            <span>Verification pending — awaiting admin review</span>
                                        </div>
                                    )}
                                    {(business as any).verificationStatus === "approved" && (business as any).is_verified && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs">
                                            <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                                            <span>Verified and live</span>
                                        </div>
                                    )}
                                    {(business as any).verificationStatus === "rejected" && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>Not approved — contact support for details</span>
                                        </div>
                                    )}
                                    <CardHeader className="pb-2">
                                        <CardTitle>{business.name}</CardTitle>
                                        <CardDescription>{business.category}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        <p className="text-sm text-muted-foreground line-clamp-2">{business.description}</p>
                                        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                                            {statsLoading && !s ? (
                                                <>
                                                    <Skel className="h-3 w-12" />
                                                    <Skel className="h-3 w-16" />
                                                    <Skel className="h-3 w-14" />
                                                </>
                                            ) : s ? (
                                                <>
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="h-3 w-3" />{s.total_views} views
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <BookOpen className="h-3 w-3" />{s.total_bookings} bookings
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Star className="h-3 w-3" />{s.average_rating.toFixed(1)}
                                                    </span>
                                                </>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex flex-wrap gap-2 pt-0">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link to={`/business/${business._id}`}>View</Link>
                                        </Button>
                                        <Button variant="secondary" size="sm" asChild>
                                            <Link to={`/edit-business/${business._id}`}>Edit</Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link to={`/business/${business._id}/staff`}>Staff</Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link to={`/business/${business._id}/availability`}>
                                                <CalendarDays className="h-3.5 w-3.5 mr-1" />Availability
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => { setPostDialogBusiness(business); setPostCaption(""); setPostImageUrl(""); }}
                                        >
                                            <ImagePlus className="h-3.5 w-3.5 mr-1" />New Post
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openDealDialog(business)}
                                        >
                                            <Tag className="h-3.5 w-3.5 mr-1" />Deals
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">Delete</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete your business listing.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(business._id!)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Manage Deals Dialog ── */}
            <Dialog
                open={!!dealDialogBusiness}
                onOpenChange={(open) => { if (!open) setDealDialogBusiness(null); }}
            >
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Deals — {dealDialogBusiness?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-2">
                        {dealsLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                Loading deals…
                            </div>
                        ) : dealList.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No active deals yet. Add one below.
                            </p>
                        ) : (
                            dealList.map((deal) => (
                                <div key={deal.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{deal.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{deal.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-semibold text-primary">{deal.discount}</span>
                                            <span className="text-xs text-muted-foreground">· {deal.validUntil}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteDeal(deal.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                        <p className="text-sm font-medium">Add a new deal</p>
                        <div className="space-y-2">
                            <Input
                                placeholder="Title (e.g. Weekend Special)"
                                value={newDeal.title}
                                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                            />
                            <Textarea
                                placeholder="Brief description…"
                                value={newDeal.description}
                                onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                                rows={2}
                            />
                            <Input
                                placeholder="Discount label (e.g. 20% off, Buy 1 Get 1)"
                                value={newDeal.discount_label}
                                onChange={(e) => setNewDeal({ ...newDeal, discount_label: e.target.value })}
                            />
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Valid until (optional)</Label>
                                <Input
                                    type="date"
                                    value={newDeal.valid_until}
                                    onChange={(e) => setNewDeal({ ...newDeal, valid_until: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDealDialogBusiness(null)} disabled={dealSubmitting}>
                            Close
                        </Button>
                        <Button
                            onClick={handleAddDeal}
                            disabled={dealSubmitting || !newDeal.title.trim() || !newDeal.discount_label.trim()}
                        >
                            {dealSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dealSubmitting ? "Saving…" : "Add Deal"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Create Post Dialog ── */}
            <Dialog
                open={!!postDialogBusiness}
                onOpenChange={(open) => { if (!open) setPostDialogBusiness(null); }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Post — {postDialogBusiness?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <ImageUpload label="Photo" currentUrl={postImageUrl} onUpload={setPostImageUrl} />
                        <div className="space-y-1.5">
                            <Label htmlFor="post-caption">Caption</Label>
                            <Textarea
                                id="post-caption"
                                placeholder="What's happening at your business?"
                                value={postCaption}
                                onChange={(e) => setPostCaption(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPostDialogBusiness(null)} disabled={postLoading}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreatePost} disabled={postLoading || !postCaption.trim()}>
                            {postLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {postLoading ? "Publishing…" : "Publish"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BusinessDashboard;
