"""
Seed script — populates around_you_db with realistic sample data for Bhopal, MP.
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


# ── seed data ─────────────────────────────────────────────────────────────────

def build_users(owner_id: ObjectId) -> list[dict]:
    return [
        {
            "_id": ObjectId("000000000000000000000001"),
            "name": "Arjun Sharma",
            "email": "arjun.sharma@gmail.com",
            "phone": "+919876543210",
            "password_hash": pwd_context.hash("password123"),
            "role": "user",
            "is_verified": True,
            "followers": [],
            "following": [],
            "followed_businesses": [],
            "bookmarked_businesses": [],
            "applied_jobs": [],
            "created_at": now(),
        },
        {
            "_id": ObjectId("000000000000000000000002"),
            "name": "Priya Verma",
            "email": "priya.verma@gmail.com",
            "phone": "+919765432109",
            "password_hash": pwd_context.hash("password123"),
            "role": "user",
            "is_verified": True,
            "followers": [],
            "following": [],
            "followed_businesses": [],
            "bookmarked_businesses": [],
            "applied_jobs": [],
            "created_at": now(),
        },
        {
            "_id": owner_id,
            "name": "Rajesh Patel",
            "email": "rajesh.patel@business.com",
            "phone": "+919654321098",
            "password_hash": pwd_context.hash("business123"),
            "role": "business",
            "is_verified": True,
            "followers": [],
            "following": [],
            "followed_businesses": [],
            "bookmarked_businesses": [],
            "applied_jobs": [],
            "created_at": now(),
        },
    ]


def build_businesses(owner_id: ObjectId) -> list[tuple[ObjectId, dict]]:
    timings = [
        {"day": "Monday",    "hours": "9:00 AM – 9:00 PM"},
        {"day": "Tuesday",   "hours": "9:00 AM – 9:00 PM"},
        {"day": "Wednesday", "hours": "9:00 AM – 9:00 PM"},
        {"day": "Thursday",  "hours": "9:00 AM – 9:00 PM"},
        {"day": "Friday",    "hours": "9:00 AM – 9:00 PM"},
        {"day": "Saturday",  "hours": "9:00 AM – 9:00 PM"},
        {"day": "Sunday",    "hours": "Closed"},
    ]

    raw = [
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
            "rating": 4.5,
            "review_count": 38,
            "followers": 120,
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
            "rating": 4.3,
            "review_count": 61,
            "followers": 87,
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
            "rating": 4.7,
            "review_count": 115,
            "followers": 203,
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
            "rating": 4.1,
            "review_count": 44,
            "followers": 65,
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
            "rating": 4.6,
            "review_count": 79,
            "followers": 142,
        },
    ]

    results = []
    for item in raw:
        bid = oid()
        doc = {
            "_id": bid,
            "owner_id": str(owner_id),
            "staff": [],
            "timings": timings,
            "images": [],
            "is_verified": True,
            "views": 0,
            "created_at": now(),
            **item,
        }
        results.append((bid, doc))
    return results


def build_posts(businesses: list[tuple[ObjectId, dict]]) -> list[dict]:
    posts_data = [
        # Café
        ("Chai & Chatter Café", "Our signature cold brew is back! Stop by for the weekend special — buy one get one free ☕"),
        ("Chai & Chatter Café", "New menu drop 🎉 Try our Tandoori Paneer Sandwich with a Hazelnut Latte. You won't regret it."),
        ("Chai & Chatter Café", "Thank you Bhopal for 1000+ happy customers! Celebrating with free chai on Saturday morning 🙌"),
        # Salon
        ("Glamour Studio", "New keratin treatment in stock — smoother hair in just 90 minutes. Book your slot now!"),
        ("Glamour Studio", "Bridal season is here 💍 Book our complete bridal package and get 15% off on your big day look."),
        # Restaurant
        ("Spice Route Restaurant", "Weekend special: Dal Baati Churma thali for just ₹199. Limited plates — come early!"),
        ("Spice Route Restaurant", "Catering enquiries for weddings and corporate events now open for December. DM us for pricing."),
        ("Spice Route Restaurant", "New dessert alert 🍮 Shahi Tukda with rabdi just added to our menu. Pure bliss."),
        # Gym
        ("FitZone Gym", "New Zumba batch starting Monday evening 6–7 PM. Register at the front desk or DM us 💪"),
        ("FitZone Gym", "Monsoon membership offer — join this week and get 2 months free with annual plan!"),
        # Clinic
        ("HealthFirst Clinic", "We are now offering online video consultations. Book through the app and consult from home."),
        ("HealthFirst Clinic", "Free health checkup camp this Sunday 10 AM–1 PM. No appointment needed. Bring your family! 🏥"),
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
            "created_at": now() - timedelta(days=len(docs) % 7),
        })
    return docs


def build_jobs(businesses: list[tuple[ObjectId, dict]]) -> list[dict]:
    jobs_data = [
        ("Chai & Chatter Café", "Barista", "Prepare coffee and beverages, manage counter, maintain hygiene standards.", "Part-time", "₹8,000–₹12,000/month"),
        ("Chai & Chatter Café", "Delivery Executive", "Handle food delivery orders via Swiggy/Zomato and direct app orders.", "Full-time", "₹10,000/month + tips"),
        ("Glamour Studio", "Hair Stylist", "Perform haircuts, colouring, and treatments for walk-in and booked clients.", "Full-time", "₹15,000–₹20,000/month"),
        ("Glamour Studio", "Receptionist", "Handle bookings, greet clients, manage POS system and daily cash.", "Part-time", "₹9,000/month"),
        ("Spice Route Restaurant", "Junior Chef", "Assist head chef in preparation of Central Indian dishes and kitchen hygiene.", "Full-time", "₹14,000–₹18,000/month"),
        ("Spice Route Restaurant", "Waiter / Waitress", "Take orders, serve food, ensure guest satisfaction during service hours.", "Full-time", "₹9,000/month + tips"),
        ("FitZone Gym", "Fitness Trainer", "Conduct one-on-one PT sessions and group classes; create workout plans.", "Full-time", "₹18,000–₹25,000/month"),
        ("FitZone Gym", "Front Desk Executive", "Manage memberships, handle enquiries, process payments.", "Part-time", "₹8,000/month"),
        ("HealthFirst Clinic", "Receptionist / Billing", "Schedule appointments, manage patient records, handle billing.", "Full-time", "₹12,000/month"),
        ("HealthFirst Clinic", "Lab Technician", "Collect samples, run basic diagnostics, maintain lab equipment.", "Full-time", "₹16,000–₹20,000/month"),
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


def build_deals(businesses: list[tuple[ObjectId, dict]]) -> list[dict]:
    deals_data = [
        ("Chai & Chatter Café", "Buy 1 Get 1 Cold Brew", "Every Saturday morning 9–11 AM", "Buy 1 Get 1 Free"),
        ("Glamour Studio", "Bridal Package Discount", "Book the full bridal package and save ₹500", "15% off"),
        ("Spice Route Restaurant", "Weekday Thali Offer", "Dal Baati Churma thali at a special price on weekdays", "₹199 only"),
        ("FitZone Gym", "Monsoon Membership", "Annual membership with bonus months this monsoon season", "2 Months Free"),
        ("HealthFirst Clinic", "Free Health Checkup", "Basic health checkup camp every last Sunday of the month", "Free"),
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

    owner_id = oid()
    businesses = build_businesses(owner_id)
    users      = build_users(owner_id)
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

    print(
        f"\nSeeded successfully!\n"
        f"  users:      {len(users)} ({len([u for u in users if u['role'] == 'user'])} users, "
        f"1 business owner)\n"
        f"  businesses: {len(businesses)}\n"
        f"  posts:      {len(posts)}\n"
        f"  jobs:       {len(jobs)}\n"
        f"  deals:      {len(deals)}\n"
    )
    print("Demo credentials:")
    print("  User         — phone: +919876543210  password: password123")
    print("  User         — phone: +919765432109  password: password123")
    print("  Biz owner    — phone: +919654321098  password: business123")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
