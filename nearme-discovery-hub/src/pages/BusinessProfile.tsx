import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getBusinessById, getReviewsByBusiness, getBusinessJobs, createReview, replyToReview, fetchBusinessDeals, submitApplication, getMyAppliedJobIds, followBusiness, submitReport } from "@/services/api";
import type { ApplicationCreateData, ReportReason } from "@/services/api";
import { Phone, MessageCircle, Navigation, BadgeCheck, MapPin, Heart, Flag, Clock, Star, Briefcase, Bookmark, Tag, CalendarDays, Loader2, Send, CornerDownRight } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineDistance, formatDistance } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Business, Review, Job, Deal } from "@/types";
import { useBookmarks } from "@/hooks/useBookmarks";
import { BookingTab } from "@/components/BookingTab";
import { toast } from "sonner";

const BusinessProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const geo = useGeolocation();
  const { user, followingIds, setFollowingIds } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [businessJobs, setBusinessJobs] = useState<Job[]>([]);
  const [businessDeals, setBusinessDeals] = useState<Deal[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const { isBookmarked, toggle } = useBookmarks();
  const [activeImage, setActiveImage] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // ── Owner reply state ─────────────────────────────────────────────────────
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  // ── Report state ──────────────────────────────────────────────────────────
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("incorrect_info");
  const [reportNote, setReportNote] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // ── Job application state ─────────────────────────────────────────────────
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyDialogJob, setApplyDialogJob] = useState<Job | null>(null);
  const [applyForm, setApplyForm] = useState<ApplicationCreateData>({ name: "", phone: "", email: "" });
  const [applySubmitting, setApplySubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getBusinessById(id).then((b) => {
      if (b) {
        setBusiness(b);
        setFollowerCount(b.followers ?? 0);
      }
    });
    getReviewsByBusiness(id).then(setReviews).catch(() => {});
    getBusinessJobs(id).then(setBusinessJobs).catch(() => {});
    fetchBusinessDeals(id).then(setBusinessDeals).catch((e) => console.error("Deals fetch failed:", e));
    if (user) {
      getMyAppliedJobIds().then((ids) => setAppliedJobIds(new Set(ids))).catch(() => {});
    }
  }, [id, user]);

  // Sync follow state from AuthContext whenever followingIds or id changes
  useEffect(() => {
    if (id) setIsFollowing(followingIds.has(id));
  }, [id, followingIds]);

  const handleFollow = async () => {
    if (!user) { navigate("/login"); return; }
    setFollowLoading(true);
    try {
      const result = await followBusiness(id!);
      setIsFollowing(result.following);
      setFollowerCount(result.follower_count);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (result.following) next.add(id!); else next.delete(id!);
        return next;
      });
      toast.success(result.following ? "Following!" : "Unfollowed");
    } catch {
      toast.error("Failed to update follow");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!id) return;
    if (reviewRating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    if (reviewText.trim().length < 10) {
      toast.error("Review must be at least 10 characters");
      return;
    }
    setSubmittingReview(true);
    try {
      const newReview = await createReview(id, { rating: reviewRating, text: reviewText.trim() });
      setReviews((prev) => [newReview, ...prev]);
      setReviewRating(0);
      setReviewText("");
      toast.success("Review submitted!");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(detail || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    try {
      const updated = await replyToReview(reviewId, replyText.trim());
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setReplyingToId(null);
      setReplyText("");
      toast.success("Reply posted!");
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setReplySubmitting(false);
    }
  };

  const openApplyDialog = (job: Job) => {
    setApplyDialogJob(job);
    setApplyForm({
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      email: user?.email ?? "",
    });
  };

  const handleSubmitApplication = async () => {
    if (!applyDialogJob) return;
    setApplySubmitting(true);
    try {
      await submitApplication(applyDialogJob.id, applyForm);
      setAppliedJobIds((prev) => new Set([...prev, applyDialogJob.id]));
      setApplyDialogJob(null);
      toast.success("Application submitted!");
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 409) {
        toast.error("You've already applied for this job");
        setAppliedJobIds((prev) => new Set([...prev, applyDialogJob.id]));
        setApplyDialogJob(null);
      } else {
        toast.error(detail || "Failed to submit application");
      }
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!id) return;
    setReportSubmitting(true);
    try {
      await submitReport(id, reportReason, reportNote.trim() || undefined);
      toast.success("Report submitted. Thank you for helping keep our platform safe.");
      setReportOpen(false);
      setReportNote("");
      setReportReason("incorrect_info");
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  // Setup map once business data is loaded
  useEffect(() => {
    if (!business || !mapContainerRef.current || mapRef.current) return;

    // Fix broken icon paths from bundler
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    const lat = business.location?.lat && business.location.lat !== 0 ? business.location.lat : 12.9716;
    const lng = business.location?.lng && business.location.lng !== 0 ? business.location.lng : 77.5946;

    const map = L.map(mapContainerRef.current, { center: [lat, lng], zoom: 15, zoomControl: true });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`<strong>${business.name}</strong><br/>${business.address}`)
      .openPopup();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [business]);

  if (!business) {
    return <div className="container py-20 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <main className="pb-16">
      {/* Image carousel */}
      <div className="relative aspect-[16/9] md:aspect-[21/9] bg-muted overflow-hidden">
        {(business.images?.length ?? 0) > 0 ? (
          <img
            src={business.images[activeImage]}
            alt={business.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = business.coverImage ||
                `https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&h=500&fit=crop`;
            }}
          />
        ) : (
          <img
            src={business.coverImage ||
              `https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&h=500&fit=crop`}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        )}
        {business.images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {business.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`h-2 rounded-full transition-all ${i === activeImage ? "w-6 bg-primary-foreground" : "w-2 bg-primary-foreground/50"}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="container mt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold">{business.name}</h1>
              {business.isVerified && (
                <Badge className="bg-primary text-primary-foreground">
                  <BadgeCheck className="h-3 w-3 mr-1" />Verified
                </Badge>
              )}
              {!business.isVerified && business.verificationStatus === "pending" && (
                <Badge className="bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400">
                  <Clock className="h-3 w-3 mr-1" />Verification Pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline">{business.category}</Badge>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{business.address}</span>
              <Badge variant={business.isOpen ? "default" : "secondary"}>
                <Clock className="h-3 w-3 mr-1" />{business.isOpen ? "Open" : "Closed"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{business.rating} ({business.reviewCount})</span>
              <span>{followerCount} followers</span>
              <span>
                {geo.lat !== null && geo.lng !== null && business.location?.lat
                  ? formatDistance(haversineDistance(geo.lat, geo.lng, business.location.lat, business.location.lng))
                  : business.distance} away
              </span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${business.phone}`}><Phone className="h-4 w-4 mr-1" />Call</a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`https://wa.me/${business.whatsapp.replace(/\s/g, "")}`} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 mr-1" />WhatsApp
              </a>
            </Button>
            <Button size="sm" variant="outline">
              <Navigation className="h-4 w-4 mr-1" />Directions
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={isFollowing ? "secondary" : "default"}
            onClick={handleFollow}
            disabled={followLoading}
          >
            <Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />
            {isFollowing ? "Following" : "Follow"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (business) {
                toggle(business);
                toast.success(isBookmarked(business._id) ? "Removed from saved" : "Saved!");
              }
            }}
          >
            <Bookmark className={`h-4 w-4 mr-1 ${business && isBookmarked(business._id) ? "fill-primary text-primary" : ""}`} />
            {business && isBookmarked(business._id) ? "Saved" : "Save"}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setReportOpen(true)}>
            <Flag className="h-4 w-4 mr-1" />Report
          </Button>
          {!business.isVerified && (
            <Button variant="ghost" size="sm" className="text-primary ml-auto">
              Is this your business? Claim it
            </Button>
          )}
        </div>

        {/* Inline Map */}
        <div className="rounded-xl overflow-hidden border mb-8" style={{ height: "220px", position: "relative", zIndex: 0, isolation: "isolate" }}>
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="about">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="timings">Timings</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="deals" className="gap-1">
              <Tag className="h-3.5 w-3.5" />
              Deals
              {businessDeals.length > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {businessDeals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="book">
              <CalendarDays className="h-3.5 w-3.5 mr-1" />Book
            </TabsTrigger>
            <TabsTrigger value="jobs">
              Jobs
              {businessJobs.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {businessJobs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6">
            <p className="text-muted-foreground leading-relaxed">{business.description}</p>
          </TabsContent>

          <TabsContent value="timings" className="mt-6">
            <div className="space-y-2">
              {business.timings.map((t, i) => (
                <div key={i} className="flex justify-between text-sm py-2 border-b last:border-0">
                  <span className="font-medium">{t.day}</span>
                  <span className="text-muted-foreground">{t.hours}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <div className="flex flex-wrap gap-2">
              {business.services.map((s) => (
                <Badge key={s} variant="secondary" className="text-sm py-1 px-3">{s}</Badge>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="deals" className="mt-6">
            {businessDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Tag className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No active deals right now</p>
                <p className="text-sm mt-1">Check back later for offers and promotions.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {businessDeals.map((deal) => (
                  <div key={deal.id} className="relative border rounded-xl p-4 overflow-hidden bg-card">
                    {deal.tag && (
                      <span className="absolute top-4 right-4 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {deal.tag}
                      </span>
                    )}
                    <p className="font-semibold text-base pr-24 leading-snug">{deal.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 pr-4">{deal.description}</p>
                    <div className="flex items-end justify-between mt-4 gap-2">
                      <div>
                        <span className="text-2xl font-bold text-primary">{deal.discount}</span>
                        {deal.originalPrice && deal.dealPrice && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="line-through">{deal.originalPrice}</span>
                            <span className="ml-1.5 font-semibold text-foreground">{deal.dealPrice}</span>
                          </p>
                        )}
                      </div>
                      <Button size="sm" className="shrink-0">Claim Deal</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Valid until {deal.validUntil}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gallery" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {business.images.map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6 space-y-6">
            {/* Submit review form */}
            {user ? (
              <div className="border rounded-xl p-4 bg-card space-y-3">
                <p className="text-sm font-semibold">Write a Review</p>
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(i + 1)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            i < reviewRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                    {reviewRating > 0 ? (
                      <span className="ml-2 text-xs text-muted-foreground">{reviewRating}/5</span>
                    ) : (
                      <span className="ml-2 text-xs text-muted-foreground">Tap a star to rate</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Textarea
                    placeholder="Share your experience…"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                  <p className={`text-xs text-right ${reviewText.trim().length > 0 && reviewText.trim().length < 10 ? "text-destructive" : "text-muted-foreground"}`}>
                    {reviewText.trim().length} / 10 min characters
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? "Submitting…" : "Submit Review"}
                </Button>
              </div>
            ) : (
              <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>{" "}
                to leave a review
              </div>
            )}

            {/* Review list */}
            {(() => {
              const isOwner = !!user && !!business && user._id === business.ownerId;
              return (
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No reviews yet. Be the first!</p>
                  ) : (
                    reviews.map((r) => (
                      <div key={r.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {r.userName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{r.userName}</p>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < r.rating ? "text-amber-500 fill-amber-500" : "text-muted"}`} />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground ml-auto">{r.createdAt}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{r.text}</p>

                        {/* Owner reply */}
                        {r.ownerReply && (
                          <div className="mt-3 ml-3 pl-3 border-l-2 border-primary/40 bg-muted/50 rounded-r-lg p-3">
                            <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                              <CornerDownRight className="h-3 w-3" />
                              Owner Response
                              {r.ownerReplyAt && (
                                <span className="font-normal text-muted-foreground ml-1">· {r.ownerReplyAt}</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{r.ownerReply}</p>
                          </div>
                        )}

                        {/* Reply button / inline form for business owner */}
                        {isOwner && !r.ownerReply && (
                          replyingToId === r.id ? (
                            <div className="mt-3 space-y-2">
                              <Textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a response to this review…"
                                rows={2}
                                className="resize-none text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitReply(r.id)}
                                  disabled={replySubmitting || !replyText.trim()}
                                >
                                  {replySubmitting && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                                  {replySubmitting ? "Posting…" : "Post Reply"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setReplyingToId(null); setReplyText(""); }}
                                  disabled={replySubmitting}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => { setReplyingToId(r.id); setReplyText(""); }}
                            >
                              <CornerDownRight className="h-3 w-3" />
                              Reply
                            </button>
                          )
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="book" className="mt-6">
            <BookingTab business={business} />
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            {businessJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Briefcase className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No open positions right now</p>
                <p className="text-sm mt-1">Check back later for new job openings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {businessJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{job.title}</p>
                        <Badge variant="secondary">{job.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{job.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                        {job.salary && <span className="font-medium text-foreground">{job.salary}</span>}
                        <span>Posted {job.postedAt}</span>
                      </div>
                    </div>
                    {appliedJobIds.has(job.id) ? (
                      <Badge variant="secondary" className="shrink-0 py-1.5 px-3">Applied</Badge>
                    ) : user ? (
                      <Button size="sm" className="shrink-0" onClick={() => openApplyDialog(job)}>
                        Apply Now
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="shrink-0" asChild>
                        <Link to="/login">Sign in to Apply</Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Apply for Job Dialog ── */}
      <Dialog open={!!applyDialogJob} onOpenChange={(open) => { if (!open) setApplyDialogJob(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Apply — {applyDialogJob?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="apply-name">Full Name</Label>
              <Input
                id="apply-name"
                value={applyForm.name}
                onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="apply-phone">Phone</Label>
              <Input
                id="apply-phone"
                value={applyForm.phone}
                onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                placeholder="Your phone number"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="apply-email">Email</Label>
              <Input
                id="apply-email"
                type="email"
                value={applyForm.email}
                onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                placeholder="Your email address"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="apply-resume" className="flex items-center gap-1">
                Resume Link <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="apply-resume"
                value={applyForm.resume_url ?? ""}
                onChange={(e) => setApplyForm({ ...applyForm, resume_url: e.target.value || undefined })}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="apply-cover" className="flex items-center gap-1">
                Cover Note <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="apply-cover"
                rows={3}
                value={applyForm.cover_note ?? ""}
                onChange={(e) => setApplyForm({ ...applyForm, cover_note: e.target.value || undefined })}
                placeholder="Briefly tell the employer why you're a great fit…"
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogJob(null)} disabled={applySubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitApplication}
              disabled={applySubmitting || !applyForm.name.trim() || !applyForm.phone.trim() || !applyForm.email.trim()}
            >
              {applySubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {applySubmitting ? "Submitting…" : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Report Dialog ── */}
      <Dialog open={reportOpen} onOpenChange={(open) => { if (!open) setReportOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-destructive" />
              Report Business
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason</Label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as ReportReason)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="incorrect_info">Incorrect information</option>
                <option value="closed_permanently">Permanently closed</option>
                <option value="spam_or_fake">Spam or fake listing</option>
                <option value="inappropriate_content">Inappropriate content</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Additional details <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Describe the issue…"
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reportSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmitReport} disabled={reportSubmitting}>
              {reportSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default BusinessProfile;
