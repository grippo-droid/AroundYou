export interface User {
    _id: string;
    name: string;
    email?: string;
    phone: string;
    role: "user" | "business" | "admin";
    following?: string[];
    followed_businesses?: string[];
    is_verified: boolean;
    bookmarked_businesses: string[];
    created_at: string;
}

export interface Business {
    _id: string;
    owner_id: string;
    name: string;
    category: string;
    description: string;
    address: string;
    city: string;
    location: { lat: number; lng: number };
    contact_number: string;
    whatsapp?: string;
    timings: { day: string; hours: string }[];
    images: string[];
    services: string[];
    is_verified: boolean;
    is_active: boolean;
    verification_status: "pending" | "approved" | "rejected";
    rating: number;
    review_count: number;
    followers: number;
    created_at: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}
