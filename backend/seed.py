"""
Seed script — populates around_you_db with realistic sample data.
Cities: Bhopal (MP) + Pune (MH)
Run from the backend directory:  python seed.py
"""
import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# ── connection ────────────────────────────────────────────────────────────────

MONGO_URI = "mongodb://localhost:27017"
DB_NAME   = "around_you_db"

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def oid() -> ObjectId:
    return ObjectId()


def now() -> datetime:
    return datetime.utcnow()


# ── users ─────────────────────────────────────────────────────────────────────

ADMIN_ID = ObjectId("000000000000000000000099")


def build_users(bhopal_owner_id: ObjectId, pune_owner_id: ObjectId) -> list[dict]:
    base = {
        "followers": [],
        "following": [],
        "followed_businesses": [],
        "bookmarked_businesses": [],
        "applied_jobs": [],
        "is_verified": True,
        "created_at": now(),
    }
    return [
        # ── Bhopal users ──
        {**base, "_id": ObjectId("000000000000000000000001"),
         "name": "Arjun Sharma",    "email": "arjun.sharma@gmail.com",
         "phone": "+919876543210",  "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": ObjectId("000000000000000000000002"),
         "name": "Priya Verma",     "email": "priya.verma@gmail.com",
         "phone": "+919765432109",  "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": bhopal_owner_id,
         "name": "Rajesh Patel",    "email": "rajesh.patel@business.com",
         "phone": "+919654321098",  "password_hash": pwd_context.hash("business123"), "role": "business"},
        # ── Pune users ──
        {**base, "_id": ObjectId("000000000000000000000003"),
         "name": "Sneha Kulkarni",  "email": "sneha.kulkarni@gmail.com",
         "phone": "+919543210987",  "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": ObjectId("000000000000000000000004"),
         "name": "Vikram Desai",    "email": "vikram.desai@gmail.com",
         "phone": "+919432109876",  "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": ObjectId("000000000000000000000005"),
         "name": "Rahul Nair",      "email": "rahul.nair@gmail.com",
         "phone": "+919321098765",  "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": ObjectId("000000000000000000000006"),
         "name": "Ananya Patil",    "email": "ananya.patil@gmail.com",
         "phone": "+919210987654",  "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": pune_owner_id,
         "name": "Pooja Joshi",     "email": "pooja.joshi@business.com",
         "phone": "+918765432109",  "password_hash": pwd_context.hash("business456"), "role": "business"},
        # ── Admin ──
        {**base, "_id": ADMIN_ID,
         "name": "Admin",           "email": "admin@aroundyou.in",
         "phone": "+910000000000",  "password_hash": pwd_context.hash("admin123"),    "role": "admin"},
    ]


# ── businesses ────────────────────────────────────────────────────────────────

def _timings(closed_day: str = "Sunday") -> list[dict]:
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return [
        {"day": d, "hours": "Closed" if d == closed_day else "9:00 AM – 9:00 PM"}
        for d in days
    ]


def build_businesses(bhopal_owner_id: ObjectId, pune_owner_id: ObjectId) -> list[tuple[ObjectId, dict]]:
    raw_bhopal = [
        {
            "name": "Chai & Chatter Café",
            "category": "Cafe",
            "description": (
                "A cosy corner café in the heart of MP Nagar serving artisan coffee, "
                "masala chai, and freshly baked snacks. Perfect for work or catching up with friends."
            ),
            "address": "42, Zone-II, MP Nagar, Bhopal",
            "city": "Bhopal",
            "location": {"lat": 23.2296, "lng": 77.4354},
            "contact_number": "+917554001122",
            "whatsapp": "+917554001122",
            "services": ["Espresso & Cappuccino", "Masala Chai", "Cold Brews", "Sandwiches & Wraps", "Free Wi-Fi"],
            "rating": 4.5, "review_count": 38, "followers": 120,
            "owner_id": str(bhopal_owner_id),
        },
        {
            "name": "Glamour Studio",
            "category": "Salon",
            "description": (
                "Bhopal's premium unisex salon offering hair styling, keratin treatments, "
                "threading, and bridal packages. Walk-in or book a slot online."
            ),
            "address": "Shop 7, Arera Colony, E-5, Bhopal",
            "city": "Bhopal",
            "location": {"lat": 23.2156, "lng": 77.4559},
            "contact_number": "+917554002233",
            "whatsapp": "+917554002233",
            "services": ["Hair Cut & Styling", "Keratin Treatment", "Facial & Cleanup", "Bridal Makeup", "Waxing & Threading"],
            "rating": 4.3, "review_count": 61, "followers": 87,
            "owner_id": str(bhopal_owner_id),
        },
        {
            "name": "Spice Route Restaurant",
            "category": "Restaurant",
            "description": (
                "Authentic Central Indian cuisine with a modern twist. Signature dishes include "
                "Dal Baati Churma, Bhutte ki Kees, and Rogan Josh. Dine-in, takeaway, and catering available."
            ),
            "address": "15, Shivaji Nagar, Near DB Mall, Bhopal",
            "city": "Bhopal",
            "location": {"lat": 23.2434, "lng": 77.4307},
            "contact_number": "+917554003344",
            "whatsapp": "+917554003344",
            "services": ["Dine-in", "Takeaway", "Catering", "Private Dining", "Home Delivery"],
            "rating": 4.7, "review_count": 115, "followers": 203,
            "owner_id": str(bhopal_owner_id),
        },
        {
            "name": "FitZone Gym",
            "category": "Services",
            "description": (
                "A fully equipped gym with cardio zone, free weights, machines, and group fitness "
                "classes. Certified trainers available for personal training sessions."
            ),
            "address": "Plot 22, Kolar Road, Bhopal",
            "city": "Bhopal",
            "location": {"lat": 23.1926, "lng": 77.4812},
            "contact_number": "+917554004455",
            "whatsapp": "+917554004455",
            "services": ["Cardio Zone", "Free Weights", "Zumba Classes", "Personal Training", "Steam Room"],
            "rating": 4.1, "review_count": 44, "followers": 65,
            "owner_id": str(bhopal_owner_id),
        },
        {
            "name": "HealthFirst Clinic",
            "category": "Medical",
            "description": (
                "A multi-specialty outpatient clinic providing general medicine, paediatrics, "
                "and gynaecology consultations. Digital prescriptions and online appointment booking."
            ),
            "address": "3, Habibganj Road, Bhopal",
            "city": "Bhopal",
            "location": {"lat": 23.2311, "lng": 77.4388},
            "contact_number": "+917554005566",
            "whatsapp": "+917554005566",
            "services": ["General Medicine", "Paediatrics", "Gynaecology", "Lab Tests", "Home Visits"],
            "rating": 4.6, "review_count": 79, "followers": 142,
            "owner_id": str(bhopal_owner_id),
        },
    ]

    raw_pune = [
        {
            "name": "Irani Chai Corner",
            "category": "Cafe",
            "description": (
                "Pune's beloved Irani café tucked in Koregaon Park, famous for thick Irani chai, "
                "fresh bun maska, mawa cake, and Osmania biscuits. Open since 1978."
            ),
            "address": "Lane 5, North Main Road, Koregaon Park, Pune",
            "city": "Pune",
            "location": {"lat": 18.5362, "lng": 73.8945},
            "contact_number": "+912067001100",
            "whatsapp": "+912067001100",
            "services": ["Irani Chai", "Bun Maska", "Mawa Cake", "Osmania Biscuits", "Akuri on Toast"],
            "rating": 4.8, "review_count": 214, "followers": 312,
            "owner_id": str(pune_owner_id),
        },
        {
            "name": "Misal House",
            "category": "Restaurant",
            "description": (
                "The go-to spot for authentic Pune-style misal pav, thalipeeth, and sabudana khichdi. "
                "A no-frills, vegetarian-only eatery that Punekars have loved for decades."
            ),
            "address": "Near Tambdi Jogeshwari Temple, Sadashiv Peth, Pune",
            "city": "Pune",
            "location": {"lat": 18.5076, "lng": 73.8492},
            "contact_number": "+912067002200",
            "whatsapp": "+912067002200",
            "services": ["Misal Pav", "Thalipeeth", "Sabudana Khichdi", "Poha", "Usal"],
            "rating": 4.9, "review_count": 387, "followers": 521,
            "owner_id": str(pune_owner_id),
        },
        {
            "name": "The Pune Kitchen",
            "category": "Restaurant",
            "description": (
                "Modern Maharashtrian cuisine meets contemporary plating. "
                "From Kolhapuri chicken to sweet puran poli, every dish celebrates Maharashtra's diverse flavours."
            ),
            "address": "Shop 12, Phoenix Marketcity, Viman Nagar, Pune",
            "city": "Pune",
            "location": {"lat": 18.5679, "lng": 73.9143},
            "contact_number": "+912067003300",
            "whatsapp": "+912067003300",
            "services": ["Dine-in", "Takeaway", "Corporate Lunch Boxes", "Weekend Brunch", "Private Events"],
            "rating": 4.6, "review_count": 163, "followers": 248,
            "owner_id": str(pune_owner_id),
        },
        {
            "name": "Glam Republic",
            "category": "Salon",
            "description": (
                "Baner's trendiest unisex salon offering global hair colour, balayage, "
                "skin treatments, nail art, and spa packages. Appointment and walk-in both welcome."
            ),
            "address": "G-4, Baner Rd, opp. Balewadi Stadium, Baner, Pune",
            "city": "Pune",
            "location": {"lat": 18.5590, "lng": 73.7869},
            "contact_number": "+912067004400",
            "whatsapp": "+912067004400",
            "services": ["Global Hair Colour", "Balayage", "Keratin Smoothing", "Nail Art", "Face Spa"],
            "rating": 4.4, "review_count": 97, "followers": 174,
            "owner_id": str(pune_owner_id),
        },
        {
            "name": "Peak Performance Gym",
            "category": "Services",
            "description": (
                "A serious training facility in Kothrud with Olympic lifting platforms, "
                "battle ropes, and certified strength & conditioning coaches. Open 5 AM–10 PM, 7 days."
            ),
            "address": "Plot 8, Karve Road, Kothrud, Pune",
            "city": "Pune",
            "location": {"lat": 18.5074, "lng": 73.8143},
            "contact_number": "+912067005500",
            "whatsapp": "+912067005500",
            "services": ["Strength Training", "CrossFit Classes", "Personal Training", "Nutrition Counselling", "Sauna"],
            "rating": 4.7, "review_count": 131, "followers": 209,
            "owner_id": str(pune_owner_id),
        },
        {
            "name": "CureWell Clinic",
            "category": "Medical",
            "description": (
                "A well-equipped multi-specialty OPD clinic near Deccan Gymkhana with experienced "
                "physicians in general medicine, orthopaedics, and dermatology. Pathology lab on-site."
            ),
            "address": "23, Karve Rd, Deccan Gymkhana, Pune",
            "city": "Pune",
            "location": {"lat": 18.5195, "lng": 73.8409},
            "contact_number": "+912067006600",
            "whatsapp": "+912067006600",
            "services": ["General Medicine", "Orthopaedics", "Dermatology", "Pathology Lab", "ECG & Diagnostics"],
            "rating": 4.5, "review_count": 88, "followers": 156,
            "owner_id": str(pune_owner_id),
        },
        {
            "name": "BookNest",
            "category": "Stationery",
            "description": (
                "Pune's favourite academic and leisure bookstore on FC Road, stocking over 20,000 titles "
                "— from UPSC prep to fiction to art supplies. Friendly staff, great discounts on bulk orders."
            ),
            "address": "35, Fergusson College Rd, Shivajinagar, Pune",
            "city": "Pune",
            "location": {"lat": 18.5218, "lng": 73.8408},
            "contact_number": "+912067007700",
            "whatsapp": "+912067007700",
            "services": ["New Books", "Second-Hand Books", "Stationery & Art Supplies", "Competitive Exam Books", "Gift Wrapping"],
            "rating": 4.6, "review_count": 72, "followers": 143,
            "owner_id": str(pune_owner_id),
        },
        {
            "name": "TechFix Hub",
            "category": "Services",
            "description": (
                "Wakad's trusted electronics repair workshop. Smartphones, laptops, tablets, and smart TVs "
                "repaired with genuine parts. Same-day repair for most screen and battery jobs."
            ),
            "address": "Shop 3, Datta Mandir Rd, Wakad, Pune",
            "city": "Pune",
            "location": {"lat": 18.5975, "lng": 73.7680},
            "contact_number": "+912067008800",
            "whatsapp": "+912067008800",
            "services": ["Screen Replacement", "Battery Replacement", "Laptop Repair", "Data Recovery", "Smart TV Repair"],
            "rating": 4.3, "review_count": 54, "followers": 89,
            "owner_id": str(pune_owner_id),
        },
    ]

    results = []
    for item in raw_bhopal + raw_pune:
        bid = oid()
        owner = item.pop("owner_id")
        doc = {
            "_id": bid,
            "owner_id": owner,
            "staff": [],
            "timings": _timings(),
            "images": [],
            "is_verified": True,
            "views": 0,
            "created_at": now(),
            **item,
        }
        results.append((bid, doc))
    return results


# ── posts ─────────────────────────────────────────────────────────────────────

def build_posts(businesses: list[tuple[ObjectId, dict]]) -> list[dict]:
    posts_data = [
        # Bhopal — Chai & Chatter
        ("Chai & Chatter Café", "Our signature cold brew is back! Stop by for the weekend special — buy one get one free ☕"),
        ("Chai & Chatter Café", "New menu drop 🎉 Try our Tandoori Paneer Sandwich with a Hazelnut Latte. You won't regret it."),
        ("Chai & Chatter Café", "Thank you Bhopal for 1000+ happy customers! Celebrating with free chai on Saturday morning 🙌"),
        # Bhopal — Glamour Studio
        ("Glamour Studio", "New keratin treatment in stock — smoother hair in just 90 minutes. Book your slot now!"),
        ("Glamour Studio", "Bridal season is here 💍 Book our complete bridal package and get 15% off on your big day look."),
        # Bhopal — Spice Route
        ("Spice Route Restaurant", "Weekend special: Dal Baati Churma thali for just ₹199. Limited plates — come early!"),
        ("Spice Route Restaurant", "Catering enquiries for weddings and corporate events now open for December. DM us for pricing."),
        ("Spice Route Restaurant", "New dessert alert 🍮 Shahi Tukda with rabdi just added to our menu. Pure bliss."),
        # Bhopal — FitZone
        ("FitZone Gym", "New Zumba batch starting Monday evening 6–7 PM. Register at the front desk or DM us 💪"),
        ("FitZone Gym", "Monsoon membership offer — join this week and get 2 months free with annual plan!"),
        # Bhopal — HealthFirst
        ("HealthFirst Clinic", "We are now offering online video consultations. Book through the app and consult from home."),
        ("HealthFirst Clinic", "Free health checkup camp this Sunday 10 AM–1 PM. No appointment needed. Bring your family! 🏥"),
        # Pune — Irani Chai Corner
        ("Irani Chai Corner", "46 years of pouring love into every glass. Thank you Pune for making us a landmark ❤️ Tea is on us this Sunday!"),
        ("Irani Chai Corner", "Fresh mawa cake batch just out of the oven 🧁 First 20 orders get a free chai. Come fast!"),
        ("Irani Chai Corner", "Winter is here — warm up with our special Kesar Irani Chai, now available every morning till 11 AM ☕"),
        # Pune — Misal House
        ("Misal House", "Punekars know — real misal is usal + tarri + farsan + pav. No shortcuts here since 1989 🌶️"),
        ("Misal House", "Sunday special: Kolhapuri-style extra spicy misal for the brave ones 🔥 Limited bowls, come early!"),
        ("Misal House", "Sabudana khichdi is back on the menu every Tuesday & Friday morning. Pure ghee, fresh peanuts 😍"),
        # Pune — The Pune Kitchen
        ("The Pune Kitchen", "Weekend brunch is LIVE 🍽️ Puran poli, kothimbir vadi, and more — every Saturday & Sunday 11 AM–3 PM"),
        ("The Pune Kitchen", "We cater! Corporate lunch boxes starting at ₹120 per person. Call us for bulk orders of 20+"),
        ("The Pune Kitchen", "Our Kolhapuri Chicken just won Best Dish at Pune Food Fest 2024 🏆 Come try the winner!"),
        # Pune — Glam Republic
        ("Glam Republic", "Balayage season 🌟 Get that sun-kissed look before summer ends. Book this week for 20% off on all colour services."),
        ("Glam Republic", "Nail art inspo just dropped — galaxy nails, chrome tips, and 3D floral designs now available. DM to book!"),
        ("Glam Republic", "Introducing our new Men's Grooming Package — haircut + beard shaping + face cleanup for just ₹499 💈"),
        # Pune — Peak Performance
        ("Peak Performance Gym", "New Olympic lifting platform installed! Drop-in sessions available for competitive lifters 🏋️"),
        ("Peak Performance Gym", "CrossFit Open registration is live! Join our in-house team and compete this season 💪 DM for details."),
        ("Peak Performance Gym", "Morning strength batch at 5:30 AM now has 3 open slots. Early birds — this is your sign!"),
        # Pune — CureWell
        ("CureWell Clinic", "Dr Meghna Kulkarni (Dermatology) is now available Mon/Wed/Fri. Book your skin consultation today."),
        ("CureWell Clinic", "Free senior citizen health screening every 1st Saturday of the month. No appointment needed 🏥"),
        # Pune — BookNest
        ("BookNest", "UPSC Prelims 2025 books have arrived 📚 Get your complete set at 10% off. Stock limited — grab yours!"),
        ("BookNest", "Weekend reading sale — all fiction titles flat 30% off this Saturday and Sunday only 📖"),
        ("BookNest", "We now carry a curated selection of Marathi literature and comics. Come explore this Sunday!"),
        # Pune — TechFix Hub
        ("TechFix Hub", "Same-day screen replacement now available for iPhone 14 & 15 series. Genuine parts, 90-day warranty 📱"),
        ("TechFix Hub", "Lost your data? Our recovery success rate is 94%. Bring your device in and we'll run a free diagnosis first."),
    ]

    name_to_bid = {doc["name"]: (bid, doc) for bid, doc in businesses}
    docs = []
    for biz_name, caption in posts_data:
        bid, bdoc = name_to_bid[biz_name]
        docs.append({
            "_id": oid(),
            "business_id": str(bid),
            "business_name": biz_name,
            "business_avatar": None,
            "image": "",
            "caption": caption,
            "likes": 0,
            "comments": [],
            "created_at": now() - timedelta(days=len(docs) % 10),
        })
    return docs


# ── jobs ──────────────────────────────────────────────────────────────────────

def build_jobs(businesses: list[tuple[ObjectId, dict]]) -> list[dict]:
    jobs_data = [
        # Bhopal
        ("Chai & Chatter Café",   "Barista",               "Prepare coffee and beverages, manage counter, maintain hygiene standards.",                  "Part-time",  "₹8,000–₹12,000/month"),
        ("Chai & Chatter Café",   "Delivery Executive",    "Handle food delivery orders via Swiggy/Zomato and direct app orders.",                       "Full-time",  "₹10,000/month + tips"),
        ("Glamour Studio",         "Hair Stylist",          "Perform haircuts, colouring, and treatments for walk-in and booked clients.",                 "Full-time",  "₹15,000–₹20,000/month"),
        ("Glamour Studio",         "Receptionist",          "Handle bookings, greet clients, manage POS system and daily cash.",                           "Part-time",  "₹9,000/month"),
        ("Spice Route Restaurant", "Junior Chef",           "Assist head chef in preparation of Central Indian dishes and kitchen hygiene.",               "Full-time",  "₹14,000–₹18,000/month"),
        ("Spice Route Restaurant", "Waiter / Waitress",     "Take orders, serve food, ensure guest satisfaction during service hours.",                    "Full-time",  "₹9,000/month + tips"),
        ("FitZone Gym",            "Fitness Trainer",       "Conduct one-on-one PT sessions and group classes; create workout plans.",                     "Full-time",  "₹18,000–₹25,000/month"),
        ("FitZone Gym",            "Front Desk Executive",  "Manage memberships, handle enquiries, process payments.",                                     "Part-time",  "₹8,000/month"),
        ("HealthFirst Clinic",     "Receptionist / Billing","Schedule appointments, manage patient records, handle billing.",                              "Full-time",  "₹12,000/month"),
        ("HealthFirst Clinic",     "Lab Technician",        "Collect samples, run basic diagnostics, maintain lab equipment.",                             "Full-time",  "₹16,000–₹20,000/month"),
        # Pune
        ("Irani Chai Corner",      "Café Assistant",        "Serve customers, prepare chai and snacks, maintain counter cleanliness.",                     "Full-time",  "₹9,000–₹11,000/month"),
        ("Irani Chai Corner",      "Baker / Confectioner",  "Bake mawa cakes, biscuits, and bread daily. Prior bakery experience preferred.",             "Full-time",  "₹14,000–₹18,000/month"),
        ("Misal House",            "Cook",                  "Prepare authentic Pune-style misal, usal, thalipeeth. Must know Maharashtrian cuisine.",     "Full-time",  "₹15,000–₹20,000/month"),
        ("Misal House",            "Helper / Cleaner",      "Assist in kitchen, serve food, maintain cleanliness during service hours.",                   "Part-time",  "₹7,000/month"),
        ("The Pune Kitchen",       "Sous Chef",             "Support head chef, manage prep team, ensure food quality and kitchen standards.",             "Full-time",  "₹22,000–₹28,000/month"),
        ("The Pune Kitchen",       "Service Captain",       "Lead floor team during service, handle guest relations, manage billing.",                     "Full-time",  "₹14,000/month + tips"),
        ("Glam Republic",          "Senior Stylist",        "Colour, cut, and treat hair for high-end clientele. Minimum 3 years experience required.",   "Full-time",  "₹20,000–₹30,000/month"),
        ("Glam Republic",          "Nail Technician",       "Perform manicure, pedicure, gel nails, and nail art for clients.",                           "Part-time",  "₹12,000/month"),
        ("Peak Performance Gym",   "Strength Coach",        "Design and run strength & conditioning programs; hold a relevant certification.",             "Full-time",  "₹25,000–₹35,000/month"),
        ("Peak Performance Gym",   "Membership Executive",  "Handle new sign-ups, renewals, follow-ups, and payment collection.",                         "Full-time",  "₹12,000/month + incentives"),
        ("CureWell Clinic",        "Staff Nurse",           "Assist doctors during consultations, manage dressings, and patient vitals.",                  "Full-time",  "₹18,000–₹22,000/month"),
        ("BookNest",               "Sales Associate",       "Assist customers in finding books, manage shelves, handle POS billing.",                     "Part-time",  "₹9,000/month"),
        ("TechFix Hub",            "Mobile Repair Technician","Diagnose and repair smartphones, replace screens and batteries with genuine parts.",        "Full-time",  "₹15,000–₹22,000/month"),
        ("TechFix Hub",            "Laptop Repair Engineer","Repair laptops — motherboard, display, keyboard, and software issues.",                      "Full-time",  "₹18,000–₹25,000/month"),
    ]

    name_to_bid = {doc["name"]: (bid, doc) for bid, doc in businesses}
    docs = []
    for biz_name, title, description, jtype, salary in jobs_data:
        bid, bdoc = name_to_bid[biz_name]
        docs.append({
            "_id": oid(),
            "business_id": str(bid),
            "business_name": biz_name,
            "business_logo": None,
            "title": title,
            "description": description,
            "location": bdoc["address"],
            "type": jtype,
            "salary": salary,
            "posted_at": now() - timedelta(days=len(docs) % 14),
            "is_active": True,
            "applicants": [],
        })
    return docs


# ── deals ─────────────────────────────────────────────────────────────────────

def build_deals(businesses: list[tuple[ObjectId, dict]]) -> list[dict]:
    deals_data = [
        # Bhopal
        ("Chai & Chatter Café",   "Buy 1 Get 1 Cold Brew",       "Every Saturday morning 9–11 AM",                                      "Buy 1 Get 1 Free"),
        ("Glamour Studio",         "Bridal Package Discount",      "Book the full bridal package and save ₹500",                          "15% off"),
        ("Spice Route Restaurant", "Weekday Thali Offer",          "Dal Baati Churma thali at a special price on weekdays",               "₹199 only"),
        ("FitZone Gym",            "Monsoon Membership",           "Annual membership with bonus months this monsoon season",             "2 Months Free"),
        ("HealthFirst Clinic",     "Free Health Checkup",          "Basic health checkup camp every last Sunday of the month",            "Free"),
        # Pune
        ("Irani Chai Corner",      "Chai + Bun Maska Combo",       "Get a classic combo — glass of Irani chai with fresh bun maska",     "₹49 only"),
        ("Misal House",            "Sunday Spice Challenge",        "Finish our extra spicy Kolhapuri misal and your next bowl is free",   "Win a Free Bowl"),
        ("The Pune Kitchen",       "Weekend Brunch Special",        "Unlimited brunch spread every Sat & Sun — poha, poli, kothimbir vadi","₹299/person"),
        ("Glam Republic",          "Men's Grooming Combo",         "Haircut + beard shaping + face cleanup at one flat price",            "₹499 combo"),
        ("Peak Performance Gym",   "First Month Free",             "New members get their first month free with a 6-month registration",  "1st Month Free"),
        ("CureWell Clinic",        "Senior Citizen Checkup",       "Free basic health screening for patients above 60 every 1st Saturday","Free"),
        ("BookNest",               "Fiction Sale",                 "All fiction titles flat 30% off every weekend",                       "30% off"),
        ("TechFix Hub",            "Free Diagnosis",               "Bring any device — we'll diagnose the issue at no charge",           "Free"),
    ]

    name_to_bid = {doc["name"]: (bid, doc) for bid, doc in businesses}
    docs = []
    for biz_name, title, description, discount_label in deals_data:
        bid, bdoc = name_to_bid[biz_name]
        docs.append({
            "_id": oid(),
            "business_id": str(bid),
            "business_name": biz_name,
            "title": title,
            "description": description,
            "discount_label": discount_label,
            "discount_percentage": None,
            "original_price": None,
            "deal_price": None,
            "valid_until": now() + timedelta(days=30),
            "is_active": True,
            "created_at": now(),
        })
    return docs


# ── runner ────────────────────────────────────────────────────────────────────

async def seed():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    print("Connecting to MongoDB …")

    bhopal_owner_id = oid()
    pune_owner_id   = oid()

    businesses = build_businesses(bhopal_owner_id, pune_owner_id)
    users      = build_users(bhopal_owner_id, pune_owner_id)
    posts      = build_posts(businesses)
    jobs       = build_jobs(businesses)
    deals      = build_deals(businesses)

    # Clear existing data
    for col in ("users", "businesses", "posts", "jobs", "deals"):
        await db[col].delete_many({})
    print("Cleared existing seed collections.")

    # Insert
    await db.users.insert_many(users)
    await db.businesses.insert_many([doc for _, doc in businesses])
    await db.posts.insert_many(posts)
    await db.jobs.insert_many(jobs)
    await db.deals.insert_many(deals)

    bhopal_biz = [b for _, b in businesses if b["city"] == "Bhopal"]
    pune_biz   = [b for _, b in businesses if b["city"] == "Pune"]

    print(
        f"\nSeeded successfully!\n"
        f"  users:      {len(users)} ({len([u for u in users if u['role'] == 'user'])} regular, "
        f"2 business owners)\n"
        f"  businesses: {len(businesses)} ({len(bhopal_biz)} Bhopal, {len(pune_biz)} Pune)\n"
        f"  posts:      {len(posts)}\n"
        f"  jobs:       {len(jobs)}\n"
        f"  deals:      {len(deals)}\n"
    )
    print("Demo credentials:")
    print("  User (Bhopal) — phone: +919876543210  password: password123")
    print("  User (Bhopal) — phone: +919765432109  password: password123")
    print("  User (Pune)   — phone: +919543210987  password: password123")
    print("  User (Pune)   — phone: +919432109876  password: password123")
    print("  User (Pune)   — phone: +919321098765  password: password123")
    print("  User (Pune)   — phone: +919210987654  password: password123")
    print("  Biz (Bhopal)  — phone: +919654321098  password: business123")
    print("  Biz (Pune)    — phone: +918765432109  password: business456")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
