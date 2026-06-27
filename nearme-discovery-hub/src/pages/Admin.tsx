import { useState } from "react";
import { CheckCircle, XCircle, Flag, Store, Users, BarChart3, ShieldAlert, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type VerificationStatus = "pending" | "approved" | "rejected";
type ReportStatus = "open" | "reviewed" | "dismissed";

interface PendingBusiness {
  id: string;
  name: string;
  category: string;
  owner: string;
  city: string;
  submittedAt: string;
  status: VerificationStatus;
}

interface Report {
  id: string;
  type: "business" | "post";
  target: string;
  reason: string;
  reporter: string;
  date: string;
  status: ReportStatus;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_VERIFICATIONS: PendingBusiness[] = [
  { id: "v1", name: "The Chai Corner",   category: "Cafe",     owner: "Rohan Verma",   city: "Pune",      submittedAt: "2025-01-20", status: "pending" },
  { id: "v2", name: "FitLife Gym",        category: "Fitness",  owner: "Ananya Singh",  city: "Bangalore", submittedAt: "2025-01-19", status: "pending" },
  { id: "v3", name: "Tech Repair Hub",    category: "Services", owner: "Kiran Patel",   city: "Mumbai",    submittedAt: "2025-01-18", status: "pending" },
  { id: "v4", name: "Green Grocer",       category: "Grocery",  owner: "Meera Iyer",    city: "Chennai",   submittedAt: "2025-01-17", status: "pending" },
  { id: "v5", name: "Bliss Spa",          category: "Salon",    owner: "Priya Nair",    city: "Hyderabad", submittedAt: "2025-01-16", status: "pending" },
  { id: "v6", name: "CloudBite Delivery", category: "Restaurant", owner: "Amir Khan",  city: "Delhi",     submittedAt: "2025-01-15", status: "approved" },
  { id: "v7", name: "BookNook",           category: "Stationery", owner: "Sita Raman", city: "Bangalore", submittedAt: "2025-01-14", status: "rejected" },
];

const INITIAL_REPORTS: Report[] = [
  { id: "r1", type: "business", target: "Quick Fix Repairs",       reason: "Fake listing — phone doesn't exist",      reporter: "Rahul M.",   date: "2025-01-21", status: "open" },
  { id: "r2", type: "post",     target: "Coffee & Co. — Jan post", reason: "Spam / misleading promotion",             reporter: "Priya S.",   date: "2025-01-20", status: "open" },
  { id: "r3", type: "business", target: "Unnamed Salon #2",        reason: "Duplicate listing already exists",        reporter: "Admin Bot",  date: "2025-01-19", status: "open" },
  { id: "r4", type: "post",     target: "Style Studio — Dec post", reason: "Inappropriate content",                   reporter: "Vikram P.",  date: "2025-01-18", status: "open" },
  { id: "r5", type: "business", target: "City Health Clinic",      reason: "Wrong category and address listed",       reporter: "Sneha R.",   date: "2025-01-17", status: "open" },
  { id: "r6", type: "business", target: "FitLife Gym",             reason: "Operating without valid licence",         reporter: "Ravi T.",    date: "2025-01-13", status: "open" },
  { id: "r7", type: "business", target: "Paper & Pen",             reason: "Permanently closed but still listed",     reporter: "Arjun K.",   date: "2025-01-15", status: "reviewed" },
  { id: "r8", type: "post",     target: "Spice Route — promo",     reason: "Copyright violation on image",            reporter: "Deepa V.",   date: "2025-01-14", status: "dismissed" },
];

// ─── Status badge helpers ─────────────────────────────────────────────────────

function VerifBadge({ status }: { status: VerificationStatus }) {
  if (status === "approved")
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Approved</Badge>;
  if (status === "rejected")
    return <Badge variant="secondary">Rejected</Badge>;
  return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>;
}

function ReportBadge({ status }: { status: ReportStatus }) {
  if (status === "reviewed")
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Reviewed</Badge>;
  if (status === "dismissed")
    return <Badge variant="secondary">Dismissed</Badge>;
  return <Badge variant="destructive">Open</Badge>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Admin = () => {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState<PendingBusiness[]>(INITIAL_VERIFICATIONS);
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);

  // Role guard — show 403 instead of redirecting so admins can debug easily
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

  const pendingCount  = verifications.filter((v) => v.status === "pending").length;
  const openCount     = reports.filter((r) => r.status === "open").length;

  const setVerifStatus = (id: string, status: VerificationStatus) =>
    setVerifications((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));

  const setReportStatus = (id: string, status: ReportStatus) =>
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">Platform management and content moderation</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Reports</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">9</div>
            <p className="text-xs text-muted-foreground mt-1">Active listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">All roles</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <Tabs defaultValue="verifications">
        <TabsList>
          <TabsTrigger value="verifications" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Verification Queue
            {pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Flag className="h-4 w-4" />
            Reported Content
            {openCount > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                {openCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Verification Queue ── */}
        <TabsContent value="verifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Verification Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{v.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{v.owner}</TableCell>
                      <TableCell className="text-muted-foreground">{v.city}</TableCell>
                      <TableCell className="text-muted-foreground">{v.submittedAt}</TableCell>
                      <TableCell><VerifBadge status={v.status} /></TableCell>
                      <TableCell className="text-right">
                        {v.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setVerifStatus(v.id, "approved")}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/5"
                              onClick={() => setVerifStatus(v.id, "rejected")}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reported Content ── */}
        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User-Submitted Reports</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge
                          variant={r.type === "business" ? "secondary" : "outline"}
                          className="capitalize font-normal"
                        >
                          {r.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[160px] truncate">{r.target}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={r.reason}>
                        {r.reason}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.reporter}</TableCell>
                      <TableCell className="text-muted-foreground">{r.date}</TableCell>
                      <TableCell><ReportBadge status={r.status} /></TableCell>
                      <TableCell className="text-right">
                        {r.status === "open" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setReportStatus(r.id, "reviewed")}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Review
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => setReportStatus(r.id, "dismissed")}
                            >
                              Dismiss
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
