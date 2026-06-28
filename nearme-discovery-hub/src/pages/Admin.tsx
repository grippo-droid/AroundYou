import { useEffect, useState, useCallback } from "react";
import {
  Users, Store, Star, CalendarCheck, TrendingUp, ShieldAlert,
  Search, Trash2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminStats, getAdminUsers, updateAdminUserRole,
  getAdminBusinesses, updateAdminBusinessStatus,
  getAdminReviews, deleteAdminReview,
  type AdminStats, type AdminUser, type AdminBusiness, type AdminReview,
} from "@/services/api";

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  accent?: string;
}

function StatCard({ title, value, sub, icon, accent }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={accent ?? "text-muted-foreground"}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Role badge ──────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  if (role === "admin")
    return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Admin</Badge>;
  if (role === "business")
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Business</Badge>;
  return <Badge variant="secondary">User</Badge>;
}

// ─── Stars ───────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-500">
      <Star className="h-3.5 w-3.5 fill-current" />
      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── Page limit ───────────────────────────────────────────────────────────────

const PAGE = 15;

// ─── Component ───────────────────────────────────────────────────────────────

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── stats
  const [stats, setStats] = useState<AdminStats | null>(null);

  // ── users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersSkip, setUsersSkip] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);

  // ── businesses
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [bizTotal, setBizTotal] = useState(0);
  const [bizSearch, setBizSearch] = useState("");
  const [bizSkip, setBizSkip] = useState(0);
  const [bizLoading, setBizLoading] = useState(false);

  // ── reviews
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsSkip, setReviewsSkip] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // ── delete dialog
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── access guard
  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-sm">
          This page is restricted to platform administrators. Your current role is{" "}
          <strong>{user?.role ?? "guest"}</strong>.
        </p>
      </div>
    );
  }

  // ── data loaders

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadStats = useCallback(async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch {
      toast({ title: "Failed to load stats", variant: "destructive" });
    }
  }, [toast]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadUsers = useCallback(async (skip: number, search: string) => {
    setUsersLoading(true);
    try {
      const data = await getAdminUsers({ skip, limit: PAGE, search: search || undefined });
      setUsers((prev) => skip === 0 ? data.users : [...prev, ...data.users]);
      setUsersTotal(data.total);
      setUsersSkip(skip + data.users.length);
    } catch {
      toast({ title: "Failed to load users", variant: "destructive" });
    } finally {
      setUsersLoading(false);
    }
  }, [toast]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadBusinesses = useCallback(async (skip: number, search: string) => {
    setBizLoading(true);
    try {
      const data = await getAdminBusinesses({ skip, limit: PAGE, search: search || undefined });
      setBusinesses((prev) => skip === 0 ? data.businesses : [...prev, ...data.businesses]);
      setBizTotal(data.total);
      setBizSkip(skip + data.businesses.length);
    } catch {
      toast({ title: "Failed to load businesses", variant: "destructive" });
    } finally {
      setBizLoading(false);
    }
  }, [toast]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadReviews = useCallback(async (skip: number) => {
    setReviewsLoading(true);
    try {
      const data = await getAdminReviews({ skip, limit: PAGE });
      setReviews((prev) => skip === 0 ? data.reviews : [...prev, ...data.reviews]);
      setReviewsTotal(data.total);
      setReviewsSkip(skip + data.reviews.length);
    } catch {
      toast({ title: "Failed to load reviews", variant: "destructive" });
    } finally {
      setReviewsLoading(false);
    }
  }, [toast]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { loadStats(); }, [loadStats]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { loadUsers(0, ""); }, [loadUsers]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { loadBusinesses(0, ""); }, [loadBusinesses]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { loadReviews(0); }, [loadReviews]);

  // ── search debounce
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const t = setTimeout(() => { setUsersSkip(0); loadUsers(0, usersSearch); }, 350);
    return () => clearTimeout(t);
  }, [usersSearch, loadUsers]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const t = setTimeout(() => { setBizSkip(0); loadBusinesses(0, bizSearch); }, 350);
    return () => clearTimeout(t);
  }, [bizSearch, loadBusinesses]);

  // ── role change
  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateAdminUserRole(userId, role);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role } : u));
      toast({ title: "Role updated" });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  // ── business status toggle
  const handleStatusToggle = async (bizId: string, current: boolean) => {
    const next = !current;
    setBusinesses((prev) => prev.map((b) => b._id === bizId ? { ...b, is_active: next } : b));
    try {
      await updateAdminBusinessStatus(bizId, next);
      toast({ title: next ? "Business activated" : "Business deactivated" });
    } catch {
      setBusinesses((prev) => prev.map((b) => b._id === bizId ? { ...b, is_active: current } : b));
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  // ── review delete
  const handleDeleteReview = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminReview(deleteTarget);
      setReviews((prev) => prev.filter((r) => r._id !== deleteTarget));
      setReviewsTotal((t) => t - 1);
      toast({ title: "Review deleted" });
    } catch {
      toast({ title: "Failed to delete review", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">Platform management and content moderation</p>
      </div>

      {/* ── Overview cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Users"               value={stats?.total_users ?? "—"}               sub="All registered accounts"  icon={<Users className="h-4 w-4" />} />
        <StatCard title="Total Businesses"          value={stats?.total_businesses ?? "—"}          sub="Listed on platform"       icon={<Store className="h-4 w-4" />} />
        <StatCard title="Total Reviews"             value={stats?.total_reviews ?? "—"}             sub="Submitted by users"       icon={<Star className="h-4 w-4" />} />
        <StatCard title="Total Bookings"            value={stats?.total_bookings ?? "—"}            sub="Across all businesses"    icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard title="New Users This Week"       value={stats?.new_users_this_week ?? "—"}       sub="Last 7 days"              icon={<TrendingUp className="h-4 w-4" />} accent="text-emerald-600" />
        <StatCard title="New Businesses This Week"  value={stats?.new_businesses_this_week ?? "—"}  sub="Last 7 days"              icon={<TrendingUp className="h-4 w-4" />} accent="text-emerald-600" />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* ── Users tab ── */}
        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone…"
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">{usersTotal} users</span>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.phone}</TableCell>
                      <TableCell><RoleBadge role={u.role} /></TableCell>
                      <TableCell className="text-muted-foreground">{fmt(u.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              {u.role} <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["user", "business", "admin"] as const).map((r) => (
                              <DropdownMenuItem
                                key={r}
                                onClick={() => handleRoleChange(u._id, r)}
                                className={u.role === r ? "font-semibold" : ""}
                              >
                                {r}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && !usersLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {usersSkip < usersTotal && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={usersLoading}
                onClick={() => loadUsers(usersSkip, usersSearch)}
              >
                {usersLoading ? "Loading…" : `Load more (${usersTotal - usersSkip} left)`}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Businesses tab ── */}
        <TabsContent value="businesses" className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city or category…"
                value={bizSearch}
                onChange={(e) => setBizSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">{bizTotal} businesses</span>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((b) => (
                    <TableRow key={b._id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{b.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{b.city}</TableCell>
                      <TableCell><Stars rating={b.rating} /></TableCell>
                      <TableCell>
                        <Switch
                          checked={b.is_active}
                          onCheckedChange={() => handleStatusToggle(b._id, b.is_active)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {businesses.length === 0 && !bizLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No businesses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {bizSkip < bizTotal && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={bizLoading}
                onClick={() => loadBusinesses(bizSkip, bizSearch)}
              >
                {bizLoading ? "Loading…" : `Load more (${bizTotal - bizSkip} left)`}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Reviews tab ── */}
        <TabsContent value="reviews" className="mt-6 space-y-4">
          <span className="text-sm text-muted-foreground">{reviewsTotal} reviews total</span>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.user_name}</TableCell>
                      <TableCell><Stars rating={r.rating} /></TableCell>
                      <TableCell
                        className="text-muted-foreground max-w-[300px] truncate"
                        title={r.text}
                      >
                        {r.text}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {fmt(r.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(r._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reviews.length === 0 && !reviewsLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No reviews found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {reviewsSkip < reviewsTotal && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={reviewsLoading}
                onClick={() => loadReviews(reviewsSkip)}
              >
                {reviewsLoading ? "Loading…" : `Load more (${reviewsTotal - reviewsSkip} left)`}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete review?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The review will be permanently removed and the
              business rating will be recalculated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDeleteReview}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
