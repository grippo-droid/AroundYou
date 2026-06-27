

# NearMe – Hyper-Local Business Discovery Platform

## Overview
A portfolio-grade, mobile-first web app for discovering nearby businesses, with social features, jobs, messaging, and admin moderation — all with mocked data and clean architecture.

---

## Phase 1: Foundation & Layout

### Design System
- Premium neutral color palette with teal/emerald accent for brand identity
- Mobile-first responsive design with card-based layouts
- Consistent spacing, typography, and component styling

### Global Layout Components
- **Navbar** – Logo, search bar, location selector, auth buttons
- **Footer** – Links, branding, social icons
- **Sidebar** – For dashboard/admin views
- Reusable components: Badge, Modal, ImageCarousel, MapPreview placeholder

### Mock API Layer
- Service files with mock data for businesses, posts, jobs, messages, users
- Simulated async responses for realistic feel

---

## Phase 2: Core Discovery Experience

### Landing Page
- Hero section with tagline: *"Discover new & nearby businesses around you"*
- Location detection UI with city fallback selector
- Search bar with placeholder suggestions
- Category grid (Cafe, Salon, Medical, Restaurant, Stationery, Services, Others)
- CTA buttons: Explore Nearby, Add Your Business

### Home Feed (Discovery)
- Scrollable business card feed with cover image, name, category, distance, open/closed badge, verification badge, description
- Sorting tabs: Nearby / New / Popular
- Category filter chips
- Search integration

### Business Profile Page
- Image carousel header
- Business info: name, category, verification, address, map placeholder
- Action buttons: Call, WhatsApp, Get Directions
- Tabbed sections: About, Timings, Services, Gallery, Jobs, Reviews
- CTAs: Follow, Report, "Claim this business"

---

## Phase 3: Social & Engagement Features

### Business Posts (Social Feed)
- Instagram-style post cards within business profiles
- Image, caption, like/comment UI with frontend-only interactions
- Mocked comments section

### Jobs Section
- Job listing feed with business name, role, location, apply button
- Job detail page
- Apply modal with resume upload UI (no real upload)

### Messaging (UI Only)
- WhatsApp-style chat interface
- Chat list sidebar + conversation view
- Message bubbles with timestamps
- Online/offline indicators (mocked)

---

## Phase 4: User & Business Owner Features

### Authentication
- Login/Signup modal with phone+OTP and Google login (UI only)
- Role selection: Normal User / Business Owner
- Auth state managed in frontend context

### User Profile
- User details display
- Followed businesses list
- Applied jobs history
- Account settings

### Business Owner Dashboard
- Create/edit business profile form with validation
- Photo upload UI
- Create posts interface
- Add job openings
- Basic analytics cards (views, likes – mock data)

---

## Phase 5: Admin & Trust

### Admin Panel (UI Only)
- Dashboard with pending business verifications
- Reported businesses/posts list
- User management table
- Approve/Reject/Block actions (mocked)

### Trust & Moderation UX
- Verified/Unverified badge system throughout the app
- Report buttons on businesses, posts, and users
- Block user UI
- Content guidelines modal

---

## Architecture Notes
- ~15+ pages with clean routing
- Reusable component library (BusinessCard, PostCard, JobCard, MessageBubble, etc.)
- Mock API service layer simulating REST endpoints
- Role-based UI rendering (User / Business Owner / Admin)
- All interactions are frontend-state only with realistic UX polish

