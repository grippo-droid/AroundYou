import { apiClient } from "@/lib/api_client";
import type { Business, BusinessCategory, Review, Post, Job, ChatThread, Deal } from "@/types";
import type { Business as ApiBusiness, ApiResponse } from "@/types/api";
import { isBusinessOpen } from "@/lib/utils";

// ─── Request body shapes ────────────────────────────────────────────────────

export interface BusinessCreateData {
  name: string;
  category: string;
  description: string;
  address: string;
  city: string;
  location: { lat: number; lng: number };
  contact_number: string;
  whatsapp?: string;
  timings: { day: string; hours: string }[];
  images?: string[];
  services?: string[];
}

export interface BusinessUpdateData {
  name?: string;
  category?: string;
  description?: string;
  address?: string;
  contact_number?: string;
  timings?: { day: string; hours: string }[];
  images?: string[];
  services?: string[];
}

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  designation: string;
  joined_at: string;
}

export interface CreateJobData {
  title: string;
  description: string;
  location: string;
  type: string;
  salary?: string;
}

export interface ApiJob {
  _id: string;
  business_id: string;
  business_name?: string;
  title: string;
  description: string;
  location: string;
  type: string;
  salary?: string;
  posted_at: string;
  is_active: boolean;
}

export interface ApiPost {
  _id: string;
  business_id: string;
  business_name: string;
  business_avatar?: string;
  image?: string;
  caption: string;
  likes: number;
  created_at: string;
}

export interface ApiReview {
  _id: string;
  business_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  text: string;
  created_at: string;
}

export interface ReviewCreateData {
  rating: number;
  text: string;
}

export interface SearchUser {
  _id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface DashboardStats {
  views: number;
  leads: number;
  rating: number;
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

// apiBus may return either _id or id depending on Pydantic serialization config
type ApiBusRaw = ApiBusiness & { id?: string };

function mapApiBusinessToBusiness(apiBus: ApiBusRaw): Business {
  return {
    _id: apiBus._id || apiBus.id || "",
    name: apiBus.name,
    category: apiBus.category as BusinessCategory,
    description: apiBus.description,
    coverImage: apiBus.images[0] || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop",
    images: apiBus.images,
    address: apiBus.address,
    city: apiBus.city,
    distance: "1.2 km",
    isVerified: apiBus.is_verified,
    phone: apiBus.contact_number,
    whatsapp: apiBus.whatsapp || "",
    timings: apiBus.timings,
    isOpen: isBusinessOpen(apiBus.timings),
    services: apiBus.services || [],
    rating: apiBus.rating,
    reviewCount: apiBus.review_count,
    followers: apiBus.followers,
    views: 0,
    createdAt: apiBus.created_at,
    ownerId: apiBus.owner_id,
    location: apiBus.location,
  };
}

function mapApiJobToJob(j: ApiJob): Job {
  return {
    id: j._id,
    businessId: j.business_id,
    businessName: j.business_name || "",
    businessLogo: "",
    title: j.title,
    description: j.description,
    location: j.location,
    type: j.type as Job["type"],
    salary: j.salary,
    postedAt: new Date(j.posted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    isActive: j.is_active,
  };
}

function mapApiPostToPost(p: ApiPost): Post {
  return {
    id: p._id,
    businessId: p.business_id,
    businessName: p.business_name,
    businessAvatar: p.business_avatar || "",
    image: p.image || "",
    caption: p.caption,
    likes: p.likes,
    comments: [],
    createdAt: new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    isLiked: false,
  };
}

function mapApiReviewToReview(r: ApiReview): Review {
  return {
    id: r._id,
    userId: r.user_id,
    userName: r.user_name,
    userAvatar: "",
    rating: r.rating,
    text: r.text,
    createdAt: new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  };
}

// ─── Businesses ─────────────────────────────────────────────────────────────

export async function getBusinesses(params?: {
  category?: string;
  sort?: "nearby" | "new" | "popular";
  search?: string;
  skip?: number;
  limit?: number;
}): Promise<Business[]> {
  const response = await apiClient.get<ApiResponse<ApiBusRaw[]>>("/businesses/", { params });
  return (response.data.data || []).map(mapApiBusinessToBusiness);
}

export async function getBusinessById(id: string): Promise<Business | undefined> {
  try {
    const response = await apiClient.get<ApiResponse<ApiBusRaw>>(`/businesses/${id}`);
    return mapApiBusinessToBusiness(response.data.data);
  } catch {
    return undefined;
  }
}

export async function getMyBusinesses(): Promise<Business[]> {
  const response = await apiClient.get<ApiResponse<ApiBusRaw[]>>("/businesses/my-businesses");
  return (response.data.data || []).map(mapApiBusinessToBusiness);
}

export async function createBusiness(data: BusinessCreateData): Promise<Business> {
  const response = await apiClient.post<ApiResponse<ApiBusRaw>>("/businesses/", data);
  return mapApiBusinessToBusiness(response.data.data);
}

export async function updateBusiness(id: string, data: BusinessUpdateData): Promise<Business> {
  const response = await apiClient.put<ApiResponse<ApiBusRaw>>(`/businesses/${id}`, data);
  return mapApiBusinessToBusiness(response.data.data);
}

export async function deleteBusiness(id: string): Promise<void> {
  await apiClient.delete(`/businesses/${id}`);
}

// ─── Staff ──────────────────────────────────────────────────────────────────

export async function getBusinessStaff(businessId: string): Promise<StaffMember[]> {
  const response = await apiClient.get<ApiResponse<StaffMember[]>>(`/businesses/${businessId}/staff`);
  return response.data.data;
}

export async function addBusinessStaff(
  businessId: string,
  staffData: { name: string; phone: string; designation: string }
): Promise<void> {
  await apiClient.post<ApiResponse<StaffMember>>(`/businesses/${businessId}/staff`, staffData);
}

export async function removeBusinessStaff(businessId: string, staffId: string): Promise<void> {
  await apiClient.delete(`/businesses/${businessId}/staff/${staffId}`);
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export async function createJob(businessId: string, jobData: CreateJobData): Promise<ApiJob> {
  const response = await apiClient.post<ApiResponse<ApiJob>>(`/jobs/business/${businessId}`, jobData);
  return response.data.data;
}

export async function getBusinessJobs(businessId: string): Promise<Job[]> {
  const response = await apiClient.get<ApiResponse<ApiJob[]>>(`/jobs/business/${businessId}`);
  return (response.data.data || []).map(mapApiJobToJob);
}

export async function getJobs(): Promise<ApiJob[]> {
  const response = await apiClient.get<ApiResponse<ApiJob[]>>("/jobs/");
  return response.data.data;
}

export async function getJobById(id: string): Promise<ApiJob | undefined> {
  const jobs = await getJobs();
  return jobs.find((j) => j._id === id);
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export async function getPostsByBusiness(businessId: string): Promise<Post[]> {
  const response = await apiClient.get<ApiResponse<ApiPost[]>>(`/posts/business/${businessId}`);
  return (response.data.data || []).map(mapApiPostToPost);
}

export async function getAllPosts(): Promise<Post[]> {
  const response = await apiClient.get<ApiResponse<ApiPost[]>>("/posts/");
  return (response.data.data || []).map(mapApiPostToPost);
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface DayScheduleInput {
  day: number;        // 0=Mon … 6=Sun
  start_time: string; // "09:00"
  end_time: string;   // "18:00"
  is_active: boolean;
}

export interface ApiAvailability {
  _id?: string;
  business_id: string;
  schedules: DayScheduleInput[];
  slot_duration: number;
  is_active: boolean;
}

export interface BookingCreateData {
  service?: string;
  date: string;       // "YYYY-MM-DD"
  time_slot: string;  // "HH:MM"
  notes?: string;
}

export interface ApiBooking {
  _id: string;
  business_id: string;
  business_name: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  service?: string;
  date: string;
  time_slot: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string;
  created_at: string;
}

export async function getBusinessAvailability(businessId: string): Promise<ApiAvailability | null> {
  try {
    const response = await apiClient.get<ApiResponse<ApiAvailability>>(`/bookings/business/${businessId}/availability`);
    return response.data.data ?? null;
  } catch {
    return null;
  }
}

export async function setBusinessAvailability(
  businessId: string,
  data: { schedules: DayScheduleInput[]; slot_duration: number; is_active: boolean }
): Promise<ApiAvailability> {
  const response = await apiClient.post<ApiResponse<ApiAvailability>>(
    `/bookings/business/${businessId}/availability`,
    data
  );
  return response.data.data;
}

export async function getAvailableSlots(businessId: string, date: string): Promise<string[]> {
  const response = await apiClient.get<ApiResponse<string[]>>(
    `/bookings/business/${businessId}/slots`,
    { params: { date } }
  );
  return response.data.data || [];
}

export async function createBooking(businessId: string, data: BookingCreateData): Promise<ApiBooking> {
  const response = await apiClient.post<ApiResponse<ApiBooking>>(
    `/bookings/business/${businessId}/book`,
    data
  );
  return response.data.data;
}

export async function getMyBookings(): Promise<ApiBooking[]> {
  const response = await apiClient.get<ApiResponse<ApiBooking[]>>("/bookings/my");
  return response.data.data || [];
}

export async function cancelBooking(bookingId: string): Promise<void> {
  await apiClient.put(`/bookings/${bookingId}/cancel`);
}

export async function getBusinessAppointments(businessId: string): Promise<ApiBooking[]> {
  const response = await apiClient.get<ApiResponse<ApiBooking[]>>(
    `/bookings/business/${businessId}/appointments`
  );
  return response.data.data || [];
}

export async function updateBookingStatus(bookingId: string, newStatus: string): Promise<void> {
  await apiClient.put(`/bookings/${bookingId}/status`, { status: newStatus });
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function getReviewsByBusiness(businessId: string): Promise<Review[]> {
  const response = await apiClient.get<ApiResponse<ApiReview[]>>(`/reviews/business/${businessId}`);
  return (response.data.data || []).map(mapApiReviewToReview);
}

export async function createReview(businessId: string, data: ReviewCreateData): Promise<Review> {
  const response = await apiClient.post<ApiResponse<ApiReview>>(`/reviews/business/${businessId}`, data);
  return mapApiReviewToReview(response.data.data);
}

export async function getChatThreads(): Promise<ChatThread[]> {
  return [];
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export interface ApiDeal {
  _id: string;
  business_id: string;
  business_name: string;
  title: string;
  description: string;
  discount_label: string;
  discount_percentage?: number;
  original_price?: string;
  deal_price?: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
}

export interface DealCreateData {
  title: string;
  description: string;
  discount_label: string;
  discount_percentage?: number;
  original_price?: string;
  deal_price?: string;
  valid_until?: string;
}

function mapApiDealToDeal(d: ApiDeal): Deal {
  return {
    id: d._id,
    businessId: d.business_id,
    title: d.title,
    description: d.description,
    discount: d.discount_label,
    originalPrice: d.original_price,
    dealPrice: d.deal_price,
    validUntil: d.valid_until
      ? new Date(d.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "Ongoing",
    isActive: d.is_active,
  };
}

export async function fetchBusinessDeals(businessId: string): Promise<Deal[]> {
  const response = await apiClient.get<ApiResponse<ApiDeal[]>>(`/deals/business/${businessId}`);
  return (response.data.data || []).map(mapApiDealToDeal);
}

export async function fetchDeals(): Promise<Deal[]> {
  const response = await apiClient.get<ApiResponse<ApiDeal[]>>("/deals/");
  return (response.data.data || []).map(mapApiDealToDeal);
}

export async function createDeal(businessId: string, data: DealCreateData): Promise<ApiDeal> {
  const response = await apiClient.post<ApiResponse<ApiDeal>>(`/deals/business/${businessId}`, data);
  return response.data.data;
}

export async function deleteDeal(dealId: string): Promise<void> {
  await apiClient.delete(`/deals/${dealId}`);
}

// ─── Applications ─────────────────────────────────────────────────────────────

export interface ApiApplication {
  _id: string;
  job_id: string;
  job_title: string;
  business_id: string;
  applicant_user_id: string;
  name: string;
  phone: string;
  email: string;
  resume_url?: string;
  cover_note?: string;
  status: "pending" | "reviewed" | "rejected" | "accepted";
  created_at: string;
}

export interface ApplicationCreateData {
  name: string;
  phone: string;
  email: string;
  resume_url?: string;
  cover_note?: string;
}

export async function submitApplication(jobId: string, data: ApplicationCreateData): Promise<ApiApplication> {
  const response = await apiClient.post<ApiResponse<ApiApplication>>(`/applications/jobs/${jobId}/apply`, data);
  return response.data.data;
}

export async function getMyAppliedJobIds(): Promise<string[]> {
  const response = await apiClient.get<ApiResponse<string[]>>("/applications/my-job-ids");
  return response.data.data || [];
}

export async function getJobApplications(jobId: string): Promise<ApiApplication[]> {
  const response = await apiClient.get<ApiResponse<ApiApplication[]>>(`/applications/jobs/${jobId}`);
  return response.data.data || [];
}

export async function getBusinessApplications(businessId: string): Promise<ApiApplication[]> {
  const response = await apiClient.get<ApiResponse<ApiApplication[]>>(`/applications/business/${businessId}`);
  return response.data.data || [];
}

export async function updateApplicationStatus(applicationId: string, status: string): Promise<void> {
  await apiClient.put(`/applications/${applicationId}/status`, { status });
}

export async function deleteApplication(applicationId: string): Promise<void> {
  await apiClient.delete(`/applications/${applicationId}`);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface ApiNotification {
  _id: string;
  user_id: string;
  type: "booking_confirmed" | "booking_cancelled" | "booking_completed" | "new_review" | "application_status";
  title: string;
  body: string;
  is_read: boolean;
  related_id?: string;
  created_at: string;
}

export async function getNotifications(): Promise<ApiNotification[]> {
  const response = await apiClient.get<ApiResponse<ApiNotification[]>>("/notifications/");
  return response.data.data || [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get<ApiResponse<{ count: number }>>("/notifications/unread-count");
  return response.data.data.count;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiClient.put(`/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.put("/notifications/read-all");
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  // Do NOT set Content-Type manually — Axios must let the browser set it so the
  // multipart boundary is included (e.g. "multipart/form-data; boundary=----...").
  // Setting Content-Type: undefined removes the instance-level "application/json" default.
  const response = await apiClient.post<ApiResponse<{ url: string }>>("/uploads/image", form, {
    headers: { "Content-Type": undefined },
  });
  return response.data.data.url;
}

// ─── Posts (create) ───────────────────────────────────────────────────────────

export interface PostCreateData {
  image: string;
  caption: string;
}

export async function createPost(businessId: string, data: PostCreateData): Promise<ApiPost> {
  const response = await apiClient.post<ApiResponse<ApiPost>>(`/posts/${businessId}`, data);
  return response.data.data;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  return { views: 0, leads: 0, rating: 4.8 };
}

// ─── Business Stats ───────────────────────────────────────────────────────────

export interface BusinessStats {
  total_bookings: number;
  pending_bookings: number;
  total_reviews: number;
  average_rating: number;
  total_views: number;
  bookings_this_week: number;
  bookings_by_day: { date: string; count: number }[];
}

export async function fetchBusinessStats(businessId: string): Promise<BusinessStats> {
  const response = await apiClient.get<ApiResponse<BusinessStats>>(`/businesses/${businessId}/stats`);
  return response.data.data;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function searchUsers(query: string): Promise<SearchUser[]> {
  const response = await apiClient.get<ApiResponse<SearchUser[]>>("/users/search", { params: { query } });
  return response.data.data;
}

// ─── Bookmarks ───────────────────────────────────────────────────────────────

export async function toggleBookmark(businessId: string): Promise<void> {
  await apiClient.post(`/users/bookmarks/${businessId}`);
}

export async function getBookmarkedBusinesses(): Promise<Business[]> {
  const response = await apiClient.get<ApiResponse<ApiBusRaw[]>>("/users/me/bookmarks");
  return (response.data.data || []).map(mapApiBusinessToBusiness);
}
