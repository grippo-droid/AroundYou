import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    Plus, Store, CalendarDays, ImagePlus, Loader2,
    Eye, Star, CalendarCheck, TrendingUp, Tag, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getMyBusinesses, deleteBusiness, createPost, fetchBusinessStats, fetchBusinessDeals, createDeal, deleteDeal } from "@/services/api";
import type { BusinessStats, DealCreateData } from "@/services/api";
import type { Deal } from "@/types";
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Business } from "@/types/api";

// ── helpers ──────────────────────────────────────────────────────────────────

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

    // Per-business stats keyed by business _id
    const [statsMap, setStatsMap] = useState<Record<string, BusinessStats>>({});
    const [statsLoading, setStatsLoading] = useState(false);

    // ── load businesses ───────────────────────────────────────────────────────
    useEffect(() => {
        getMyBusinesses()
            .then((data) => setBusinesses(data))
            .catch(() => toast.error("Failed to load businesses"))
            .finally(() => setBusLoading(false));
    }, []);

    // ── load stats for every business once the list is ready ─────────────────
    useEffect(() => {
        if (businesses.length === 0) return;
        setStatsLoading(true);

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
        }).finally(() => setStatsLoading(false));
    }, [businesses]);

    // ── aggregate stats across all businesses ─────────────────────────────────
    const aggregate = useMemo(() => {
        const list = Object.values(statsMap);
        if (list.length === 0) return null;
        return {
            total_views:    list.reduce((s, x) => s + x.total_views, 0),
            total_bookings: list.reduce((s, x) => s + x.total_bookings, 0),
            pending_bookings: list.reduce((s, x) => s + x.pending_bookings, 0),
            total_reviews:  list.reduce((s, x) => s + x.total_reviews, 0),
            average_rating: +(list.reduce((s, x) => s + x.average_rating, 0) / list.length).toFixed(1),
        };
    }, [statsMap]);

    // ── aggregate chart data: sum all businesses' day counts ─────────────────
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
            // Re-fetch so the new deal appears with correct id + formatting
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

    if (busLoading) return <div className="p-8 text-center">Loading dashboard…</div>;

    return (
        <div className="container py-8 space-y-8">

            {/* ── Header ── */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Business Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Manage your listings and view performance.</p>
                </div>
                <Button asChild>
                    <Link to="/add-business">
                        <Plus className="mr-2 h-4 w-4" /> Add New Business
                    </Link>
                </Button>
            </div>

            {/* ── Stats overview (4 cards) ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Views */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
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

                {/* Total Bookings */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skel className="h-8 w-20 mb-1" />
                        ) : (
                            <div className="text-2xl font-bold">{aggregate?.total_bookings ?? 0}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                            {statsLoading ? <Skel className="h-3 w-24" /> : (
                                <>{aggregate?.pending_bookings ?? 0} pending</>
                            )}
                        </div>
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
                                {aggregate ? aggregate.average_rating.toFixed(1) : "—"}
                            </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                            {statsLoading ? <Skel className="h-3 w-24" /> : (
                                <>{aggregate?.total_reviews ?? 0} reviews</>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* This week */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Week</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skel className="h-8 w-16 mb-1" />
                        ) : (
                            <div className="text-2xl font-bold">
                                {Object.values(statsMap).reduce((s, x) => s + x.bookings_this_week, 0)}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">bookings in last 7 days</p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Bookings chart ── */}
            {businesses.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Bookings — Last 7 Days</CardTitle>
                        <CardDescription>
                            {businesses.length > 1 ? "Combined across all your businesses" : "For your business"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skel className="h-48 w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={fmtDate}
                                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                                        maxBarSize={48}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
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
                                    <CardHeader className="pb-2">
                                        <CardTitle>{business.name}</CardTitle>
                                        <CardDescription>{business.category}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        <p className="text-sm text-muted-foreground line-clamp-2">{business.description}</p>
                                        {/* Inline mini stats */}
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
                                                        <CalendarCheck className="h-3 w-3" />{s.total_bookings} bookings
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

                    {/* Existing deals */}
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
                                <div
                                    key={deal.id}
                                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                                >
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

                    {/* Add new deal form */}
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
