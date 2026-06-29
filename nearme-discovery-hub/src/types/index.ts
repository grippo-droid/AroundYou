export interface Business {
  _id: string;
  name: string;
  category: BusinessCategory;
  description: string;
  coverImage: string;
  images: string[];
  address: string;
  city: string;
  location?: { lat: number; lng: number };
  distance: string;
  isOpen: boolean;
  isVerified: boolean;
  verificationStatus: "pending" | "approved" | "rejected";
  phone: string;
  whatsapp: string;
  timings: { day: string; hours: string }[];
  services: string[];
  rating: number;
  reviewCount: number;
  followers: number;
  views: number;
  createdAt: string;
  ownerId: string;
}

export type BusinessCategory =
  | "Cafe"
  | "Salon"
  | "Medical"
  | "Restaurant"
  | "Stationery"
  | "Services"
  | "Others";

export interface Post {
  id: string;
  businessId: string;
  businessName: string;
  businessAvatar: string;
  image: string;
  caption: string;
  likes: number;
  comments: Comment[];
  createdAt: string;
  isLiked: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface Job {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  title: string;
  description: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  salary?: string;
  postedAt: string;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: "user" | "business_owner" | "admin";
  followedBusinesses: string[];
  appliedJobs: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatThread {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  text: string;
  createdAt: string;
  ownerReply?: string;
  ownerReplyAt?: string;
}

export interface Deal {
  id: string;
  businessId: string;
  title: string;
  description: string;
  discount: string;
  originalPrice?: string;
  dealPrice?: string;
  validUntil: string;
  tag?: string;
  isActive: boolean;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  businessId: string;
  applicantUserId: string;
  name: string;
  phone: string;
  email: string;
  resumeUrl?: string;
  coverNote?: string;
  status: "pending" | "reviewed" | "rejected" | "accepted";
  createdAt: string;
}
