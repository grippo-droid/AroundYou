import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Briefcase,
  CheckCircle2,
  XCircle,
  Timer,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyBookings, cancelBooking } from "@/services/api";
import type { ApiBooking } from "@/services/api";
import { toast } from "sonner";

type Filter = "upcoming" | "past" | "all";
type BookingStatus = ApiBooking["status"];

const STATUS: Record<
  BookingStatus,
  { label: string; bg: string; text: string; Icon: React.ElementType }
> = {
  pending:   { label: "Pending",   bg: "bg-amber-100",  text: "text-amber-700",  Icon: Timer },
  confirmed: { label: "Confirmed", bg: "bg-green-100",  text: "text-green-700",  Icon: CheckCircle2 },
  cancelled: { label: "Cancelled", bg: "bg-red-100",    text: "text-red-700",    Icon: XCircle },
  completed: { label: "Completed", bg: "bg-blue-100",   text: "text-blue-700",   Icon: Star },
};

const Bookings = () => {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    getMyBookings()
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await cancelBooking(id);
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: "cancelled" } : b))
      );
      toast.success("Appointment cancelled");
    } catch {
      toast.error("Could not cancel — please try again");
    } finally {
      setCancelling(null);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = bookings.filter((b) => {
    const bDate = new Date(b.date + "T00:00:00");
    const isUpcoming = bDate >= today && b.status !== "cancelled" && b.status !== "completed";
    if (filter === "upcoming") return isUpcoming;
    if (filter === "past") return !isUpcoming;
    return true;
  });

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container py-10 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 animate-pulse space-y-2.5">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-3 w-56 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="container py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">My Bookings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All your appointments in one place</p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6">
        {(["upcoming", "past", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground self-center">
          {filtered.length} {filtered.length === 1 ? "booking" : "bookings"}
        </span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <CalendarDays className="h-12 w-12 mb-4 opacity-25" />
          <p className="font-medium text-foreground text-lg">
            No {filter === "all" ? "" : filter} bookings
          </p>
          {filter === "upcoming" && (
            <>
              <p className="text-sm mt-1">Book an appointment at any business near you.</p>
              <Button asChild className="mt-5">
                <Link to="/explore">Explore Businesses</Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const cfg = STATUS[b.status] ?? STATUS.pending;
            const StatusIcon = cfg.Icon;
            const bDate = new Date(b.date + "T00:00:00");
            const isUpcoming = bDate >= today && b.status !== "cancelled" && b.status !== "completed";
            const canCancel = isUpcoming && (b.status === "pending" || b.status === "confirmed");

            return (
              <div
                key={b._id}
                className={`border rounded-xl p-5 bg-card transition-opacity ${
                  !isUpcoming ? "opacity-65" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Business name + status */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Link
                        to={`/business/${b.business_id}`}
                        className="font-semibold hover:underline truncate"
                      >
                        {b.business_name}
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Date + time + service */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {bDate.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {b.time_slot}
                      </span>
                      {b.service && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          {b.service}
                        </span>
                      )}
                    </div>

                    {b.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        "{b.notes}"
                      </p>
                    )}
                  </div>

                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={cancelling === b._id}
                      onClick={() => handleCancel(b._id)}
                    >
                      {cancelling === b._id ? "Cancelling…" : "Cancel"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default Bookings;
