import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import {
  getBusinessAvailability,
  getAvailableSlots,
  createBooking,
} from "@/services/api";
import type { ApiAvailability } from "@/services/api";
import type { Business } from "@/types";
import { toast } from "sonner";

interface Props {
  business: Business;
}

// JS getDay() returns 0=Sun…6=Sat; backend uses Python weekday() 0=Mon…6=Sun
function jsToBackendDay(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

export const BookingTab: React.FC<Props> = ({ business }) => {
  const { user } = useAuth();

  const [availability, setAvailability] = useState<ApiAvailability | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [selectedService, setSelectedService] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<{ date: Date; slot: string } | null>(null);

  useEffect(() => {
    getBusinessAvailability(business._id)
      .then(setAvailability)
      .catch(() => setAvailability(null))
      .finally(() => setLoadingAvail(false));
  }, [business._id]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    getAvailableSlots(business._id, format(selectedDate, "yyyy-MM-dd"))
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, business._id]);

  const activeDays = new Set<number>(
    (availability?.schedules ?? []).filter((s) => s.is_active).map((s) => s.day)
  );

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot) return;
    setBooking(true);
    try {
      await createBooking(business._id, {
        service: selectedService || undefined,
        date: format(selectedDate, "yyyy-MM-dd"),
        time_slot: selectedSlot,
        notes: notes.trim() || undefined,
      });
      setConfirmed({ date: selectedDate, slot: selectedSlot });
      toast.success("Appointment booked!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Booking failed — slot may have been taken");
    } finally {
      setBooking(false);
    }
  };

  // ── Confirmed screen ──────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Booking Confirmed!</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Your appointment at <span className="font-medium text-foreground">{business.name}</span> on{" "}
          {format(confirmed.date, "MMMM d, yyyy")} at {confirmed.slot} has been requested.
          The business will confirm shortly.
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            onClick={() => {
              setConfirmed(null);
              setSelectedDate(undefined);
              setSelectedSlot(null);
              setNotes("");
              setSelectedService("");
            }}
          >
            Book Another
          </Button>
          <Button asChild>
            <Link to="/bookings">My Bookings</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading / no availability ─────────────────────────────────────────────
  if (loadingAvail) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
      </div>
    );
  }

  const hasSchedules = (availability?.schedules ?? []).some((s) => s.is_active);
  if (!availability || !availability.is_active || !hasSchedules) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <CalendarDays className="h-10 w-10 mb-3 opacity-30" />
        <p className="font-medium text-foreground">Bookings not available</p>
        <p className="text-sm mt-1">This business hasn't set up online booking yet.</p>
      </div>
    );
  }

  // ── Booking form ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-7 max-w-lg">
      {/* 1. Service */}
      {business.services.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2.5">
            Service{" "}
            <span className="font-normal text-muted-foreground text-xs">(optional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {business.services.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedService(s === selectedService ? "" : s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedService === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Date */}
      <div>
        <p className="text-sm font-semibold mb-2.5 flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" /> Pick a Date
        </p>
        <div className="border rounded-xl overflow-hidden w-fit bg-card">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (date < today) return true;
              return !activeDays.has(jsToBackendDay(date));
            }}
            className="rounded-xl"
          />
        </div>
      </div>

      {/* 3. Time slots */}
      {selectedDate && (
        <div>
          <p className="text-sm font-semibold mb-2.5 flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Available Times —{" "}
            <span className="font-normal text-muted-foreground">
              {format(selectedDate, "EEE, MMM d")}
            </span>
          </p>
          {loadingSlots ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading slots…
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              No available slots on this day — try another date.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    selectedSlot === slot
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Notes */}
      {selectedSlot && (
        <div>
          <p className="text-sm font-semibold mb-2">
            Notes{" "}
            <span className="font-normal text-muted-foreground text-xs">(optional)</span>
          </p>
          <Textarea
            placeholder="Any special requests or information for the business…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      )}

      {/* 5. CTA */}
      {!user ? (
        <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground bg-muted/30">
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>{" "}
          to book an appointment
        </div>
      ) : (
        selectedDate && (
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={!selectedSlot || booking}
            onClick={handleBook}
          >
            {booking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Booking…
              </>
            ) : selectedSlot ? (
              `Book ${format(selectedDate, "MMM d")} at ${selectedSlot}`
            ) : (
              "Select a time slot"
            )}
          </Button>
        )
      )}
    </div>
  );
};
