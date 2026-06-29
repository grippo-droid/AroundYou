"""
Seed script — populates around_you_db with realistic demo data.
Cities: Bhopal · Pune · Mumbai
Run from backend directory:  .\\venv\\Scripts\\python.exe seed.py
"""
import asyncio
import random
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# ── env ───────────────────────────────────────────────────────────────────────

try:
    from dotenv import dotenv_values
    _env = dotenv_values(".env")
except ImportError:
    _env = {}

MONGO_URI = _env.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = _env.get("DB_NAME",   "around_you_db")

# ── helpers ───────────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def oid() -> ObjectId:
    return ObjectId()

def rdt(lo: int, hi: int) -> datetime:
    """Random datetime lo–hi days in the past."""
    return datetime.utcnow() - timedelta(days=random.randint(lo, hi))

def fdt(days: int) -> datetime:
    """Datetime days from now (future)."""
    return datetime.utcnow() + timedelta(days=days)

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def t7(h: str) -> list:
    return [{"day": d, "hours": h} for d in DAYS]

def tms(h: str, sun: str = "Closed") -> list:
    return [{"day": d, "hours": sun if d == "Sunday" else h} for d in DAYS]

def tcs(wkday: str, sat: str, sun: str = "Closed") -> list:
    out = [{"day": d, "hours": wkday} for d in DAYS[:5]]
    out.append({"day": "Saturday", "hours": sat})
    out.append({"day": "Sunday",   "hours": sun})
    return out

# ── fixed IDs ─────────────────────────────────────────────────────────────────

ADMIN_ID        = ObjectId("000000000000000000000099")
USER1_ID        = ObjectId("000000000000000000000001")  # Arjun Sharma
USER2_ID        = ObjectId("000000000000000000000003")  # Sneha Kulkarni
USER3_ID        = ObjectId("000000000000000000000007")  # Priya Sharma
USER4_ID        = ObjectId("000000000000000000000008")  # Rahul Verma
BHOPAL_OWNER_ID = ObjectId("000000000000000000000010")  # Rajesh Patel
PUNE_OWNER_ID   = ObjectId("000000000000000000000011")  # Pooja Joshi

REVIEWER_IDS   = [USER1_ID, USER2_ID, USER3_ID, USER4_ID]
REVIEWER_NAMES = ["Arjun Sharma", "Sneha Kulkarni", "Priya Sharma", "Rahul Verma"]


# ══════════════════════════════════════════════════════════════════════════════
# USERS
# ══════════════════════════════════════════════════════════════════════════════

def build_users() -> list:
    base = {
        "followers": [], "following": [], "followed_businesses": [],
        "bookmarked_businesses": [], "applied_jobs": [],
        "is_verified": True, "created_at": rdt(180, 365),
    }
    return [
        {**base, "_id": USER1_ID,
         "name": "Arjun Sharma",   "email": "arjun.sharma@gmail.com",
         "phone": "+919876543210", "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": USER2_ID,
         "name": "Sneha Kulkarni", "email": "sneha.kulkarni@gmail.com",
         "phone": "+919543210987", "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": USER3_ID,
         "name": "Priya Sharma",   "email": "priya.sharma@gmail.com",
         "phone": "+919111222333", "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": USER4_ID,
         "name": "Rahul Verma",    "email": "rahul.verma@gmail.com",
         "phone": "+919444555666", "password_hash": pwd_context.hash("password123"), "role": "user"},
        {**base, "_id": BHOPAL_OWNER_ID,
         "name": "Rajesh Patel",   "email": "rajesh.patel@business.com",
         "phone": "+919654321098", "password_hash": pwd_context.hash("business123"), "role": "business"},
        {**base, "_id": PUNE_OWNER_ID,
         "name": "Pooja Joshi",    "email": "pooja.joshi@business.com",
         "phone": "+918765432109", "password_hash": pwd_context.hash("business456"), "role": "business"},
        {**base, "_id": ADMIN_ID,
         "name": "Admin",          "email": "admin@aroundyou.in",
         "phone": "+910000000000", "password_hash": pwd_context.hash("admin123"),    "role": "admin"},
    ]


# ══════════════════════════════════════════════════════════════════════════════
# BUSINESSES
# ══════════════════════════════════════════════════════════════════════════════

_BIZ_TEMPLATE = {
    "staff": [], "images": [],
    "verification_status": "approved", "is_verified": True, "is_active": True,
    "rating": 0.0, "review_count": 0,
}

_RAW_BUSINESSES = [
    # ── Bhopal (8) ────────────────────────────────────────────────────────────
    {
        "name": "Café Aroha", "category": "Cafe", "city": "Bhopal",
        "address": "10 MP Nagar Zone 1, Bhopal",
        "location": {"lat": 23.2332, "lng": 77.4341},
        "contact_number": "+917554001122", "whatsapp": "+917554001122",
        "description": "Specialty coffee and all-day breakfast in the heart of MP Nagar. Work-friendly space with fast Wi-Fi and a menu built for coffee lovers.",
        "services": ["Espresso Bar", "Cold Brew", "Waffles", "Sandwiches", "Work-friendly Seating"],
        "timings": tcs("8:00 AM – 10:00 PM", "8:00 AM – 10:00 PM", "9:00 AM – 9:00 PM"),
        "followers": 156, "views": 890, "owner_id": str(BHOPAL_OWNER_ID),
    },
    {
        "name": "Glam Studio", "category": "Salon", "city": "Bhopal",
        "address": "45 Arera Colony, Bhopal",
        "location": {"lat": 23.2195, "lng": 77.4374},
        "contact_number": "+917554002233", "whatsapp": "+917554002233",
        "description": "Premium unisex salon offering hair, skin and nail services. Walk-in or book a slot — our stylists are trained for the latest trends.",
        "services": ["Haircut", "Balayage", "Facial", "Waxing", "Nail Art", "Bridal Makeup"],
        "timings": t7("10:00 AM – 8:00 PM"),
        "followers": 112, "views": 720, "owner_id": str(BHOPAL_OWNER_ID),
    },
    {
        "name": "Dr. Mehta's Clinic", "category": "Medical", "city": "Bhopal",
        "address": "12 Shivaji Nagar, Bhopal",
        "location": {"lat": 23.2512, "lng": 77.4023},
        "contact_number": "+917554003344", "whatsapp": "+917554003344",
        "description": "General physician and family health clinic. Digital prescriptions, prompt appointments, and honest consultations — no unnecessary referrals.",
        "services": ["General Consultation", "Blood Pressure Check", "Diabetes Management", "Health Checkup"],
        "timings": tcs("9:00 AM – 1:00 PM, 5:00 PM – 8:00 PM", "9:00 AM – 1:00 PM, 5:00 PM – 8:00 PM"),
        "followers": 88, "views": 540, "owner_id": str(BHOPAL_OWNER_ID),
    },
    {
        "name": "Iron Paradise Gym", "category": "Gym", "city": "Bhopal",
        "address": "78 Govindpura, Bhopal",
        "location": {"lat": 23.2634, "lng": 77.4589},
        "contact_number": "+917554004455", "whatsapp": "+917554004455",
        "description": "Fully equipped gym with personal trainers and group classes. CrossFit, Zumba, and strength training — all under one roof.",
        "services": ["Weight Training", "Cardio", "Zumba", "CrossFit", "Personal Training", "Yoga"],
        "timings": tcs("5:00 AM – 10:00 PM", "5:00 AM – 10:00 PM", "7:00 AM – 2:00 PM"),
        "followers": 204, "views": 1340, "owner_id": str(BHOPAL_OWNER_ID),
    },
    {
        "name": "Spice Garden Restaurant", "category": "Restaurant", "city": "Bhopal",
        "address": "33 New Market, Bhopal",
        "location": {"lat": 23.2367, "lng": 77.4012},
        "contact_number": "+917554005566", "whatsapp": "+917554005566",
        "description": "Authentic Madhya Pradesh cuisine with modern presentation. Dal Baati Churma, Bhutte ki Kees, and seasonal specials that celebrate local flavours.",
        "services": ["Dine In", "Takeaway", "Catering", "Private Dining"],
        "timings": t7("12:00 PM – 11:00 PM"),
        "followers": 287, "views": 1620, "owner_id": str(BHOPAL_OWNER_ID),
    },
    {
        "name": "TechFix Solutions", "category": "Services", "city": "Bhopal",
        "address": "56 DB Mall Road, Bhopal",
        "location": {"lat": 23.2289, "lng": 77.4298},
        "contact_number": "+917554006677", "whatsapp": "+917554006677",
        "description": "Mobile and laptop repair center with same-day service. Genuine parts, transparent pricing, and a 90-day repair warranty on all jobs.",
        "services": ["Screen Replacement", "Battery Replacement", "Data Recovery", "Laptop Repair", "Software Issues"],
        "timings": tms("10:00 AM – 8:00 PM"),
        "followers": 97, "views": 680, "owner_id": str(BHOPAL_OWNER_ID),
    },
    {
        "name": "The Book Nook", "category": "Stationery", "city": "Bhopal",
        "address": "22 Bittan Market, Bhopal",
        "location": {"lat": 23.2156, "lng": 77.4445},
        "contact_number": "+917554007788", "whatsapp": "+917554007788",
        "description": "Curated bookstore and stationery shop for students and professionals. Custom printing, art supplies, and a staff that loves books as much as you do.",
        "services": ["Books", "Stationery", "Art Supplies", "Gifting", "Custom Printing"],
        "timings": tms("10:00 AM – 7:00 PM"),
        "followers": 78, "views": 450, "owner_id": str(BHOPAL_OWNER_ID),
    },
    {
        "name": "Serenity Spa", "category": "Salon", "city": "Bhopal",
        "address": "89 Kolar Road, Bhopal",
        "location": {"lat": 23.1934, "lng": 77.4612},
        "contact_number": "+917554008899", "whatsapp": "+917554008899",
        "description": "Luxury spa offering therapeutic treatments and relaxation therapies. Swiss massage equipment, aromatic oils, and fully trained therapists.",
        "services": ["Swedish Massage", "Deep Tissue", "Hot Stone", "Aromatherapy", "Facials", "Body Wraps"],
        "timings": t7("10:00 AM – 8:00 PM"),
        "followers": 245, "views": 1490, "owner_id": str(BHOPAL_OWNER_ID),
    },

    # ── Pune (10) ─────────────────────────────────────────────────────────────
    {
        "name": "Third Wave Coffee", "category": "Cafe", "city": "Pune",
        "address": "14 Koregaon Park, Pune",
        "location": {"lat": 18.5362, "lng": 73.8947},
        "contact_number": "+912067001100", "whatsapp": "+912067001100",
        "description": "Specialty single-origin coffee roasters and cafe. Our baristas source, roast, and brew beans that tell a story — from farm to your cup.",
        "services": ["Pour Over", "AeroPress", "Cold Brew", "Pastries", "Coffee Masterclasses"],
        "timings": t7("7:00 AM – 10:00 PM"),
        "followers": 312, "views": 1780, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "Scissors & Style", "category": "Salon", "city": "Pune",
        "address": "67 FC Road, Pune",
        "location": {"lat": 18.5236, "lng": 73.8478},
        "contact_number": "+912067002200", "whatsapp": "+912067002200",
        "description": "Trendy unisex salon popular with Pune's college crowd. Expert stylists for precision cuts, highlights, and skin treatments.",
        "services": ["Haircut", "Highlights", "Keratin Treatment", "Threading", "Pedicure", "Manicure"],
        "timings": t7("9:00 AM – 9:00 PM"),
        "followers": 189, "views": 1120, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "Pune Fitness Hub", "category": "Gym", "city": "Pune",
        "address": "23 Viman Nagar, Pune",
        "location": {"lat": 18.5679, "lng": 73.9143},
        "contact_number": "+912067003300", "whatsapp": "+912067003300",
        "description": "Modern fitness center with state-of-the-art equipment. Swimming pool, yoga studio, pilates classes, and certified personal trainers.",
        "services": ["Weight Training", "Cardio", "Swimming", "Yoga", "Pilates", "Nutrition Counseling"],
        "timings": tcs("5:00 AM – 11:00 PM", "5:00 AM – 11:00 PM", "6:00 AM – 2:00 PM"),
        "followers": 267, "views": 1560, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "Masala Twist", "category": "Restaurant", "city": "Pune",
        "address": "45 Baner Road, Pune",
        "location": {"lat": 18.5590, "lng": 73.7868},
        "contact_number": "+912067004400", "whatsapp": "+912067004400",
        "description": "Modern Indian restaurant with a creative twist on classic recipes. Rajasthani tacos, Kolhapuri pasta, and desserts that redefine mithai.",
        "services": ["Dine In", "Home Delivery", "Catering", "Corporate Lunch"],
        "timings": t7("11:00 AM – 11:00 PM"),
        "followers": 198, "views": 1200, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "HealthFirst Clinic", "category": "Medical", "city": "Pune",
        "address": "8 Aundh, Pune",
        "location": {"lat": 18.5589, "lng": 73.8087},
        "contact_number": "+912067005500", "whatsapp": "+912067005500",
        "description": "Multi-specialty clinic with experienced doctors across departments. Quick appointments, on-site lab, and a dietitian for lifestyle health management.",
        "services": ["General Medicine", "Dermatology", "Orthopedics", "Pediatrics", "Dietitian"],
        "timings": tms("8:00 AM – 8:00 PM"),
        "followers": 145, "views": 870, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "QuickFix Mobile", "category": "Services", "city": "Pune",
        "address": "34 Kothrud, Pune",
        "location": {"lat": 18.5074, "lng": 73.8077},
        "contact_number": "+912067006600", "whatsapp": "+912067006600",
        "description": "Expert mobile and electronics repair with 90-day warranty. Screen, battery, water damage — we fix what others can't.",
        "services": ["Screen Repair", "Battery Replacement", "Water Damage", "Tablet Repair", "Accessories"],
        "timings": tms("10:00 AM – 8:00 PM"),
        "followers": 118, "views": 760, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "PageTurner Books", "category": "Stationery", "city": "Pune",
        "address": "12 Camp Area, Pune",
        "location": {"lat": 18.5185, "lng": 73.8782},
        "contact_number": "+912067007700", "whatsapp": "+912067007700",
        "description": "Pune's favorite independent bookstore since 2010. Over 20,000 titles from UPSC prep to fiction, plus stationery and regular reading events.",
        "services": ["Books", "Magazines", "Stationery", "Book Club", "Reading Events"],
        "timings": tcs("10:00 AM – 8:00 PM", "10:00 AM – 8:00 PM", "11:00 AM – 6:00 PM"),
        "followers": 156, "views": 920, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "Urban Retreat Spa", "category": "Salon", "city": "Pune",
        "address": "78 Kalyani Nagar, Pune",
        "location": {"lat": 18.5461, "lng": 73.9010},
        "contact_number": "+912067008800", "whatsapp": "+912067008800",
        "description": "Boutique spa and wellness center for total relaxation. Couple packages, reflexology, and expert therapists in a calming private setting.",
        "services": ["Massage Therapy", "Reflexology", "Body Scrub", "Couple Spa", "Hair Spa"],
        "timings": t7("10:00 AM – 9:00 PM"),
        "followers": 178, "views": 1080, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "The Breakfast Club", "category": "Cafe", "city": "Pune",
        "address": "56 Wakad, Pune",
        "location": {"lat": 18.5995, "lng": 73.7644},
        "contact_number": "+912067009900", "whatsapp": "+912067009900",
        "description": "All-day breakfast cafe with healthy and indulgent options. Eggs Benedict, smoothie bowls, and the best fresh juices in Wakad.",
        "services": ["Eggs Benedict", "Pancakes", "Smoothie Bowls", "Fresh Juices", "Healthy Bowls"],
        "timings": t7("7:00 AM – 3:00 PM"),
        "followers": 223, "views": 1350, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "AutoCare Garage", "category": "Services", "city": "Pune",
        "address": "90 Hadapsar, Pune",
        "location": {"lat": 18.5089, "lng": 73.9259},
        "contact_number": "+912067010000", "whatsapp": "+912067010000",
        "description": "Trusted multi-brand car service center with certified mechanics. Transparent billing, photo reports, and genuine parts on every job.",
        "services": ["Oil Change", "Tire Service", "AC Repair", "Full Service", "Denting & Painting"],
        "timings": tms("8:00 AM – 7:00 PM"),
        "followers": 134, "views": 810, "owner_id": str(PUNE_OWNER_ID),
    },

    # ── Mumbai (7) ────────────────────────────────────────────────────────────
    {
        "name": "Bombay Brew Co", "category": "Cafe", "city": "Mumbai",
        "address": "23 Bandra West, Mumbai",
        "location": {"lat": 19.0596, "lng": 72.8295},
        "contact_number": "+912267001122", "whatsapp": "+912267001122",
        "description": "Craft beer and specialty coffee by day and night. Work pods for the day crowd, live music on Fridays, and a craft tap list that changes weekly.",
        "services": ["Specialty Coffee", "Craft Beer", "Snacks", "Live Music Fridays", "Work Pods"],
        "timings": t7("9:00 AM – 11:00 PM"),
        "followers": 289, "views": 1740, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "Studio One Salon", "category": "Salon", "city": "Mumbai",
        "address": "45 Andheri West, Mumbai",
        "location": {"lat": 19.1136, "lng": 72.8697},
        "contact_number": "+912267002233", "whatsapp": "+912267002233",
        "description": "Celebrity-favorite salon known for precision cuts and color work. Trained in London and Tokyo — we bring global trends to Andheri.",
        "services": ["Haircut", "Color", "Balayage", "Smoothening", "Bridal", "Makeup"],
        "timings": t7("10:00 AM – 8:00 PM"),
        "followers": 298, "views": 1680, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "FitZone Mumbai", "category": "Gym", "city": "Mumbai",
        "address": "67 Powai, Mumbai",
        "location": {"lat": 19.1176, "lng": 72.9060},
        "contact_number": "+912267003344", "whatsapp": "+912267003344",
        "description": "Premium gym with Olympic lifting platforms and recovery zone. HIIT, boxing, sauna — everything you need for a complete training program.",
        "services": ["Strength Training", "HIIT", "Boxing", "Recovery", "Personal Training", "Sauna"],
        "timings": tcs("5:00 AM – 11:00 PM", "5:00 AM – 11:00 PM", "6:00 AM – 3:00 PM"),
        "followers": 245, "views": 1510, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "Coastal Kitchen", "category": "Restaurant", "city": "Mumbai",
        "address": "12 Juhu, Mumbai",
        "location": {"lat": 19.1075, "lng": 72.8263},
        "contact_number": "+912267004455", "whatsapp": "+912267004455",
        "description": "Fresh coastal seafood and Konkani cuisine by the sea. Live cooking station, weekend brunch, and a menu that changes with the catch.",
        "services": ["Dine In", "Takeaway", "Live Cooking Station", "Weekend Brunch"],
        "timings": t7("12:00 PM – 11:00 PM"),
        "followers": 276, "views": 1590, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "CityDoc Clinic", "category": "Medical", "city": "Mumbai",
        "address": "34 Malad West, Mumbai",
        "location": {"lat": 19.1863, "lng": 72.8484},
        "contact_number": "+912267005566", "whatsapp": "+912267005566",
        "description": "Modern family clinic with online appointment booking. ECG, blood tests, vaccination, and teleconsultation — all under one digital roof.",
        "services": ["General Medicine", "ECG", "Blood Tests", "Vaccination", "Teleconsultation"],
        "timings": tms("9:00 AM – 9:00 PM"),
        "followers": 167, "views": 980, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "Gadget Guru", "category": "Services", "city": "Mumbai",
        "address": "89 Dadar, Mumbai",
        "location": {"lat": 19.0178, "lng": 72.8478},
        "contact_number": "+912267006677", "whatsapp": "+912267006677",
        "description": "Mumbai's most trusted electronics repair and accessories shop. iPhone, Android, laptops, smart home — we fix and install everything.",
        "services": ["iPhone Repair", "Android Repair", "Laptop Service", "CCTV Installation", "Smart Home Setup"],
        "timings": tms("10:00 AM – 9:00 PM"),
        "followers": 178, "views": 1140, "owner_id": str(PUNE_OWNER_ID),
    },
    {
        "name": "Zen Wellness Spa", "category": "Salon", "city": "Mumbai",
        "address": "56 Worli, Mumbai",
        "location": {"lat": 19.0176, "lng": 72.8156},
        "contact_number": "+912267007788", "whatsapp": "+912267007788",
        "description": "Luxury urban spa with Ayurvedic and modern wellness therapies. Trained in Kerala Ayurveda, delivering authentic healing in the heart of Mumbai.",
        "services": ["Ayurvedic Massage", "Shirodhara", "Deep Tissue", "Couples Treatment", "Meditation"],
        "timings": t7("9:00 AM – 9:00 PM"),
        "followers": 234, "views": 1420, "owner_id": str(PUNE_OWNER_ID),
    },
]


def build_businesses() -> list:
    result = []
    for raw in _RAW_BUSINESSES:
        doc = {
            "_id": oid(),
            "created_at": rdt(60, 180),
            **_BIZ_TEMPLATE,
            **raw,
        }
        result.append(doc)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# REVIEWS  (reviewer_idx, rating, text)
# ══════════════════════════════════════════════════════════════════════════════

# 0=Arjun  1=Sneha  2=Priya  3=Rahul

_REVIEW_DATA = {
    "Café Aroha": [
        (0, 5, "Absolutely love this place! The espresso is some of the best I've had outside Bengaluru. Great work-from-cafe vibes. Highly recommend!"),
        (1, 5, "The cold brew here is exceptional — smooth, well-balanced, and not over-iced. Staff is warm and the place is always clean. My go-to in MP Nagar."),
        (2, 4, "Really nice cafe with a solid menu. The waffles and sandwiches pair beautifully with the coffee. Gets a bit crowded in the evenings."),
        (3, 4, "Great ambience and good Wi-Fi. Perfect for remote work. Pricing is slightly high but the quality justifies it."),
        (0, 4, "Consistent quality every single visit. The pour-over on weekends is exceptional. Would love a few more seating options."),
        (1, 3, "Good coffee but parking around MP Nagar is a nightmare. Service is fine once you're inside though — would still come back."),
    ],
    "Glam Studio": [
        (2, 5, "Best salon in Bhopal! The stylist understood exactly what I wanted and delivered perfectly. Walked out feeling completely transformed!"),
        (3, 5, "Came for a bridal trial and was blown away. The makeup artist is incredibly talented — booked the full package on the spot."),
        (0, 4, "Clean, well-equipped salon. The keratin treatment lasted almost 4 months. Reasonably priced for the quality."),
        (1, 4, "Staff is warm and professional. The nail art options are creative and the appointment system works smoothly."),
        (2, 4, "Good service overall. The facial was very relaxing. Could use a slightly longer massage included in the package."),
        (3, 3, "Decent salon but I had to wait 30 minutes despite a confirmed booking. Quality is good when they get to you."),
    ],
    "Dr. Mehta's Clinic": [
        (0, 5, "Dr. Mehta is an outstanding physician — patient, thorough, and explains everything clearly. Digital prescriptions are super convenient!"),
        (1, 5, "Best GP in Shivaji Nagar by far. No unnecessary tests or referrals. Honest, affordable, and genuinely caring. Highly recommended."),
        (2, 4, "Very professional clinic. Clean environment, punctual appointments, and courteous staff. Glad to have found this place."),
        (3, 4, "Good consultation experience. The health checkup package is comprehensive and reasonably priced. Minimal waiting time."),
        (0, 4, "Dr. Mehta actually listens rather than rushing to write prescriptions. That alone puts this clinic above most others in the area."),
        (1, 3, "Good doctor but the clinic space is quite small. Waiting area seating is limited. The consultation itself is excellent though."),
    ],
    "Iron Paradise Gym": [
        (2, 5, "Seriously the best gym I've been to in Bhopal. Fully stocked, always clean, and trainers are genuinely knowledgeable. Worth every rupee!"),
        (3, 5, "Been a member for 8 months and it just keeps improving. New equipment added regularly. The CrossFit classes are absolutely insane!"),
        (0, 4, "Great equipment variety. The Zumba classes are so much fun — Sonal ma'am is amazing! AC could be a bit stronger on peak days."),
        (1, 4, "Good gym with certified trainers who actually care about your progress. Pricing is fair for the facilities available."),
        (2, 4, "Solid facility overall. Morning batches are well-organized. Would appreciate more washroom space on busy days."),
        (3, 3, "Good gym but extremely crowded between 6-8 PM. Equipment is hard to get during peak hours. Off-peak timings are great though."),
    ],
    "Spice Garden Restaurant": [
        (0, 5, "Authentic Madhya Pradesh flavours done right! The Dal Baati Churma is the best I've had in Bhopal — pure nostalgia on a plate. Must visit!"),
        (1, 5, "Came for a family dinner and everyone loved it. The catering service for our event was also excellent. Great value for the quality."),
        (2, 4, "Consistently excellent food. Service is prompt and the private dining setup is lovely. Perfect for celebrations and special occasions."),
        (3, 4, "Great menu variety. The Bhutte ki Kees is perfectly made and very affordable. Their new Shahi Tukda dessert is incredible."),
        (0, 4, "Good restaurant with reliable quality. Takeaway packaging is solid. Staff is friendly even on busy weekend evenings."),
        (1, 3, "Food quality is amazing but waiting time can stretch to 30+ minutes on weekends. Worth it — but come early if you can."),
    ],
    "TechFix Solutions": [
        (2, 5, "Got my iPhone screen replaced in under 2 hours with genuine parts at a fair price. Repair has held perfectly for 3 months. Highly recommended!"),
        (3, 5, "These guys recovered all my data after my laptop crashed. Thought everything was gone. Absolute lifesavers — cannot thank them enough!"),
        (0, 4, "Quick and reliable service. Laptop battery replaced same day. Staff explains the issue clearly before starting any work."),
        (1, 4, "Transparent pricing and good workmanship. Have sent multiple devices here over the years and never been disappointed."),
        (2, 4, "They actually showed me the old parts they replaced — that kind of honesty is rare in repair shops. Very trustworthy."),
        (3, 3, "Good work but the shop is small and the queue can be long. Call ahead to confirm wait time. End result is always quality."),
    ],
    "The Book Nook": [
        (0, 5, "This little gem in Bittan Market has everything — fiction, UPSC prep, art supplies. Staff actually knows the inventory. Total book lover's paradise!"),
        (1, 5, "My daughter loves coming here. Great children's book selection and staff always recommends something new. Very welcoming atmosphere."),
        (2, 4, "Good curated selection. Not a mega-bookstore but quality picks make up for the size. The custom printing service is a real bonus."),
        (3, 4, "Found books here I couldn't find online. Art supply section is fantastic and prices are reasonable for Bittan Market."),
        (0, 4, "Cosy bookstore with a very personal feel. The gifting section has lovely options. Staff is genuinely passionate about reading."),
        (1, 3, "Nice store but the space feels cramped when it gets busy on weekends. Would love more room to browse. Stock is excellent though."),
    ],
    "Serenity Spa": [
        (2, 5, "Hands down the best spa in Bhopal! The hot stone massage was absolutely divine. Already booked my next session before leaving!"),
        (3, 5, "Came for the aromatherapy and left feeling completely renewed. Staff is professionally trained and the ambience is beautifully calming."),
        (0, 4, "Excellent Swedish massage. Therapist was skilled and very attentive to comfort. Very clean facility with premium products used throughout."),
        (1, 4, "Loved the facial treatment — my skin glowed for days after. Prices are on the higher side but totally justified for the quality."),
        (2, 5, "The body wrap treatment is extraordinary. Perfect for a pre-wedding pamper session. Will be recommending this spa to everyone!"),
        (3, 4, "Great overall experience. Booking was easy, they were punctual, and the ambience is very relaxing. Would love more bundle deals for regulars."),
    ],
    "Third Wave Coffee": [
        (0, 5, "Best specialty coffee in Pune! Their Ethiopian single-origin pour-over is phenomenal. Baristas actually know their beans — love the education angle."),
        (1, 5, "I've visited specialty cafes across India and Third Wave holds its own easily. The AeroPress masterclass was fantastic. A must for coffee lovers!"),
        (2, 4, "Fantastic coffee and a beautiful space. The cold brew flight is a great way to explore multiple origins. Slightly pricey but completely worth it."),
        (3, 4, "Lovely cafe in KP. Always a pleasant experience. Pastries complement the coffee perfectly. Slightly slow service on weekends."),
        (0, 4, "Great quality and super knowledgeable baristas. My go-to for a quiet weekend morning. Wish they had a loyalty card programme."),
        (1, 3, "Coffee is excellent but seating can be limited during rush hours. Would be great if they expanded. The visit is always worth it though."),
    ],
    "Scissors & Style": [
        (2, 5, "Best haircut I've had in Pune! The stylist listened to exactly what I wanted and delivered perfectly. Great vibe in the salon too!"),
        (3, 5, "The keratin treatment was life-changing. My hair has never been smoother. Staff is welcoming and very professional from start to finish."),
        (0, 4, "Really trendy salon. The highlights turned out exactly as per the reference I showed. Reasonable pricing for the FC Road location."),
        (1, 4, "Good overall experience. Clean, modern setup. The pedicure was very relaxing. Appointment system runs efficiently."),
        (2, 4, "Consistently good service — been coming here for 2 years. They always handle my curly hair well, which is genuinely rare."),
        (3, 3, "Quality is good but wait times can be long even with appointments on busy weekends. The service is worth the wait."),
    ],
    "Pune Fitness Hub": [
        (0, 5, "State-of-the-art equipment and amazing instructors! Swimming pool is always clean, yoga classes are outstanding. Best gym in Viman Nagar easily!"),
        (1, 5, "The nutrition counseling completely changed my approach to training. Coaches are certified and genuinely invested in member progress."),
        (2, 4, "Excellent facility overall. The pilates classes are top-notch. Would appreciate longer Sunday hours. Otherwise a solid 10/10."),
        (3, 4, "Great gym with wide equipment variety. Cardio section is massive. Locker rooms are spotless. Worth the premium membership fee."),
        (0, 4, "Good facility. Personal trainers are knowledgeable and not pushy. Love the swimming pool — always well-maintained and never overcrowded."),
        (1, 3, "Very good gym but extremely crowded after 7 PM especially in cardio section. Off-peak morning visits are a much better experience."),
    ],
    "Masala Twist": [
        (2, 5, "Modern Indian food done brilliantly! Creative takes on classics without losing authenticity. Perfect for date nights and family dinners!"),
        (3, 5, "The corporate lunch service is excellent — timely, well-packaged, and food is consistently fresh. Our whole office loves it!"),
        (0, 4, "Really enjoyed the inventive menu. The Rajasthani tacos are a fun fusion concept. Desserts are a standout. Service is prompt."),
        (1, 4, "Good food and great ambience. Portion sizes are generous. The chef's special thali is the best way to experience the full menu."),
        (2, 4, "Used the catering for our team event and everyone was impressed. Very professional service and good price points for groups."),
        (3, 3, "Food is creative and genuinely good but the restaurant gets quite noisy on weekends. Better for groups than quiet dinners."),
    ],
    "HealthFirst Clinic": [
        (0, 5, "The dermatology department is outstanding. Dr. Agarwal took time to understand my skin before prescribing anything. Rare and appreciated!"),
        (1, 5, "Multi-specialty under one roof means I sort all family health needs in one visit. Lab results are quick and clearly explained."),
        (2, 4, "Clean, modern clinic. Appointment system works really well — no waiting for hours like so many other clinics. Happy with the consultation."),
        (3, 4, "Great experience with the pediatrics department. Doctor was very gentle with my toddler. Well-equipped and professionally run."),
        (0, 4, "Visited for orthopedics consultation. Diagnosis explained in simple terms and good follow-up care recommended. Impressed overall."),
        (1, 3, "Good clinic but parking outside on busy days is a problem. The consultation quality itself is excellent. Just the logistics need work."),
    ],
    "QuickFix Mobile": [
        (2, 5, "Fixed my water-damaged phone when 3 other shops said it was done for. These guys are genuinely skilled. 90-day warranty gives real confidence!"),
        (3, 5, "Screen and battery replaced same day on my Samsung. Quality of parts is good and pricing is completely transparent. Highly recommend!"),
        (0, 4, "Reliable service. Had my tablet fixed here — they explained the issue clearly before starting. Good value for money in Kothrud."),
        (1, 4, "Fast turnaround. iPhone screen done in under 3 hours. Technician was thorough and professional. Will come back for any future repairs."),
        (2, 4, "Honest shop — they actually told me one repair wasn't worth the cost and helped me find a better alternative. That integrity is rare."),
        (3, 3, "Good service but shop is small and can get crowded. Weekday visits are much smoother than Saturdays. Repair quality is reliable."),
    ],
    "PageTurner Books": [
        (0, 5, "Pune's best independent bookstore! Incredible selection, staff who give genuine recommendations, and the book club events are wonderful!"),
        (1, 5, "Been a loyal customer since they opened. The collection is curated with real taste. Stationery section is also excellent. A Camp Area institution."),
        (2, 4, "Great place for book lovers. Found rare editions here unavailable online. The reading events and author meets are a lovely touch."),
        (3, 4, "Lovely bookstore. Good balance of new and classic titles. Staff remembers your reading preferences — that personal touch is everything."),
        (0, 4, "Excellent stationery and art supplies section. Great for students and artists. Regular weekend discounts are a welcome bonus."),
        (1, 3, "Nice store but gets quite crowded on weekends. Could use more browsing space. The collection itself is absolutely fantastic though."),
    ],
    "Urban Retreat Spa": [
        (2, 5, "The couples spa package was perfect for our anniversary. Every detail was thoughtful — from the welcome drink to the final consultation. Magical!"),
        (3, 5, "The reflexology session released all my tension completely. Extremely professional staff and a beautifully calming environment throughout."),
        (0, 4, "Lovely spa. The hair spa treatment was both relaxing and effective. Good quality products used. Will come back for the deep tissue massage."),
        (1, 4, "Excellent massage therapy. The therapist customized pressure perfectly to my comfort. Easy booking and the facility is immaculately clean."),
        (2, 4, "Had the body scrub treatment done. Skin felt absolutely amazing afterwards. Prices are fair for Kalyani Nagar. Good overall value."),
        (3, 3, "Nice spa but the waiting area is small — had to wait outside briefly. The treatments themselves were excellent once I got in."),
    ],
    "The Breakfast Club": [
        (0, 5, "Best breakfast spot in Wakad without question! The Eggs Benedict is perfect every single time. Smoothie bowls are gorgeous and delicious!"),
        (1, 5, "Healthy yet indulgent — they nail both perfectly! Fresh juices are extraordinary. Staff is cheerful and service is quick. Love this place!"),
        (2, 4, "Great menu variety. Pancakes are fluffy and generous. Love that they have healthy bowl options alongside the comfort food classics."),
        (3, 4, "Wonderful breakfast cafe with consistent quality. Fresh ingredients throughout. Go early on Sundays — worth the wait regardless."),
        (0, 4, "Perfect for weekday breakfast meetings. Quick service, good coffee, fresh food. Clean and pleasant space. A reliable favourite."),
        (1, 3, "Good food but Sunday crowds are overwhelming. Weekday visits are a completely different and much more pleasant experience."),
    ],
    "AutoCare Garage": [
        (2, 5, "Finally found a trustworthy car service center in Pune! Transparent billing, genuine parts, detailed photo reports. Gold standard service!"),
        (3, 5, "AC repair done right the first time without any upselling. These guys explain everything and charge only for what's needed. Excellent!"),
        (0, 4, "Good garage. Full service completed within the day. They send a detailed report with photos of each serviced component. Very professional."),
        (1, 4, "Tire service and wheel alignment done correctly at a fair price. Quick turnaround. Genuinely feel my car is in safe hands here."),
        (2, 4, "Solid car service experience. Denting and painting work came out excellent — color match was absolutely perfect. Very happy customer."),
        (3, 3, "Good work overall but appointment system could be better organized. Walk-ins wait a long time. Quality of work itself is reliable."),
    ],
    "Bombay Brew Co": [
        (0, 5, "This place is incredible! Specialty coffee by day, craft beer by night — the concept works perfectly. Work pods are a brilliant touch. A Bandra gem!"),
        (1, 5, "Friday live music with craft beer is an unforgettable experience. Coffee quality is world-class too. This is now my favorite Mumbai spot!"),
        (2, 4, "Amazing concept executed really well. Coffee is excellent, snacks pair perfectly with the beer. Lively evenings with a great crowd."),
        (3, 4, "Great for remote work during the day. Work pods are genuinely comfortable. Good coffee and the vibe is just right. Worth Bandra prices."),
        (0, 4, "Really enjoyed the rotating craft beer selection — something genuinely different in Bandra. Coffee is standout quality too."),
        (1, 3, "Love the concept but gets very crowded on weekends. Weekday visits are a much better experience. The coffee and beer are both excellent."),
    ],
    "Studio One Salon": [
        (2, 5, "This is the salon everyone in Andheri talks about for good reason. Precision cuts are incredible and color work is absolutely next level!"),
        (3, 5, "Got bridal makeup done here and looked completely stunning. The team is talented and makes you feel genuinely comfortable. Highly recommend!"),
        (0, 4, "Excellent salon. The balayage was done beautifully — exactly as I'd hoped. Staff is very skilled and attentive throughout."),
        (1, 4, "The smoothening treatment was perfect. Hair is so silky and manageable now. Professional and warm service from start to finish."),
        (2, 5, "Best salon in the western suburbs. Every service — haircut, color, treatment — is consistently excellent. Never disappoints."),
        (3, 4, "Very polished salon using premium products. Makeup artists are skilled. On the pricier side but completely justified for Mumbai."),
    ],
    "FitZone Mumbai": [
        (0, 5, "Top-tier gym in Powai! Olympic lifting platforms are a dream. Recovery zone with sauna is exactly what I needed post-training. Love it!"),
        (1, 5, "Best HIIT classes I've experienced anywhere in Mumbai. Trainers push you just the right amount. Facilities are immaculate. Worth every rupee!"),
        (2, 4, "Great gym. Boxing section is very well set up and underrated. Personal training sessions are effective and the trainers are excellent."),
        (3, 4, "Excellent facility. Strength training area is massive. Sauna is a great differentiator. Locker rooms are always clean."),
        (0, 4, "Good gym overall. Morning batches are well-organized. The recovery zone is unique in Powai. Worth the commute for the quality."),
        (1, 3, "Very good gym but gets packed after 6 PM. Morning sessions are the way to go. Facilities are genuinely top class otherwise."),
    ],
    "Coastal Kitchen": [
        (2, 5, "The best coastal seafood in Mumbai! The Konkani thali is extraordinary and the live cooking station adds such a fun dimension. Perfect!"),
        (3, 5, "Weekend brunch was absolutely spectacular. The crab masala and fish curry were out of this world. Incredible setting near Juhu beach!"),
        (0, 4, "Excellent fresh seafood — clearly sourced well daily. Service was attentive without being overbearing. Good drinks selection too."),
        (1, 4, "The butter garlic prawns are outstanding. Great takeaway packaging for something this delicate. Will definitely be back for dine-in."),
        (2, 4, "Great coastal restaurant. The fish Koliwada is the best I've had in Mumbai. Ambience is beautiful and prices are reasonable."),
        (3, 3, "Food is exceptional but Juhu parking on weekends is always a struggle. Go early or take an auto. The cooking itself deserves 5 stars."),
    ],
    "CityDoc Clinic": [
        (0, 5, "Excellent modern clinic! Online booking works perfectly. ECG done within minutes. Dr. Shah is thorough and patient. Highly recommend!"),
        (1, 5, "Teleconsultation is a game changer for Mumbai traffic. Got a proper consultation from home. Blood test results explained clearly and quickly."),
        (2, 4, "Good clinic. Vaccination services are smooth — no long queues. Blood test turnaround is fast. Clean and professional environment."),
        (3, 4, "Very organized clinic. Appointment system is efficient. Doctors take time for consultations rather than rushing. Happy with the experience."),
        (0, 4, "Great for routine checkups and quick consultations. Staff is friendly and the clinic is well-maintained. Fair pricing for Mumbai."),
        (1, 3, "Good clinic but the Malad West location gets very busy in the evenings. Morning appointments are much smoother. Quality of care is great."),
    ],
    "Gadget Guru": [
        (2, 5, "Best electronics repair in Dadar without question. They fixed my MacBook motherboard when Apple said it needed full replacement. Saved ₹40,000!"),
        (3, 5, "Smart home setup done brilliantly. Team was knowledgeable, punctual, and cleaned up perfectly after themselves. Highly recommend!"),
        (0, 4, "Reliable iPhone repair service. Screen and battery done same day with genuine parts. Pricing was very fair. Will be my go-to for any repairs."),
        (1, 4, "CCTV installed for my shop — professional job done efficiently. Good warranty on the installation. Great value for money."),
        (2, 4, "Android repair done well. Technician explained the issue and gave me options before proceeding. That kind of transparency is appreciated."),
        (3, 3, "Good repair shop but Saturday queues are very long. Weekday visits are much smoother. Repair quality is consistently reliable."),
    ],
    "Zen Wellness Spa": [
        (0, 5, "Best luxury spa experience in Mumbai! The Shirodhara transported me completely. Ayurvedic therapists are highly trained. Absolutely worth it!"),
        (1, 5, "The couples treatment package is perfect for anniversaries. Every detail was thoughtful — from welcome drink to the final consultation. Truly luxurious!"),
        (2, 4, "Excellent deep tissue massage. Therapist adjusted perfectly to my feedback. Beautiful calming atmosphere. Will definitely return soon."),
        (3, 4, "The Ayurvedic massage used authentic oils and traditional techniques. A genuine wellness experience unlike typical Mumbai spa massages."),
        (0, 5, "Meditation followed by Ayurvedic massage — I've never felt more at peace. This spa is a true sanctuary in busy Worli. Highly recommended!"),
        (1, 4, "Premium spa with premium quality throughout. All natural products and very skilled therapists. Pricing reflects the quality — worth every rupee."),
    ],
}


def build_reviews(businesses: list) -> list:
    name_to_bid = {b["name"]: str(b["_id"]) for b in businesses}
    docs = []
    for biz_name, entries in _REVIEW_DATA.items():
        bid = name_to_bid.get(biz_name)
        if not bid:
            continue
        for i, (user_idx, rating, text) in enumerate(entries):
            docs.append({
                "_id": oid(),
                "business_id": bid,
                "user_id": str(REVIEWER_IDS[user_idx]),
                "user_name": REVIEWER_NAMES[user_idx],
                "rating": rating,
                "text": text,
                "created_at": rdt(1, 90),
                "owner_reply": None,
                "owner_reply_at": None,
            })
    return docs


# ══════════════════════════════════════════════════════════════════════════════
# POSTS  (business_name, caption)
# ══════════════════════════════════════════════════════════════════════════════

_POST_DATA = [
    # Bhopal
    ("Café Aroha", "☕ Starting your Monday right with our new seasonal oat-milk latte! Come try it before it's gone."),
    ("Café Aroha", "🎉 We just crossed 500 happy customers this month! Thank you Bhopal for all the love ❤️"),
    ("Café Aroha", "New menu alert! 🧇 Our classic waffles now come with salted caramel drizzle — available from this weekend."),
    ("Café Aroha", "Work from Café Aroha this week ☀️ Free Wi-Fi, good coffee, and a quiet corner just for you."),

    ("Glam Studio", "Transform your look this season 💇 Book your appointment today — slots filling up fast!"),
    ("Glam Studio", "Bridal season is here 💍 Complete bridal package with makeup trial now at a special price. DM to know more."),
    ("Glam Studio", "Meet our star stylist Neha! ✂️ With 8 years of experience, she's the one behind the most stunning looks in Arera Colony."),

    ("Dr. Mehta's Clinic", "We're now offering online video consultations 📱 Book through the app and consult from the comfort of home."),
    ("Dr. Mehta's Clinic", "Free health checkup camp this Sunday 10 AM–1 PM 🏥 No appointment needed. Bring your family along!"),
    ("Dr. Mehta's Clinic", "Diabetes awareness week: Get your HbA1c tested at ₹99 this week only. Prevention starts with knowing your numbers."),

    ("Iron Paradise Gym", "New Zumba batch starting this Monday at 6 PM 💃 Register at the front desk or DM us to reserve your spot!"),
    ("Iron Paradise Gym", "Monsoon membership offer 🌧️ Join this week and get 2 months free with any annual plan. Offer ends Sunday!"),
    ("Iron Paradise Gym", "New Olympic barbell set just arrived 🏋️ More weight options, same great coaching. Come lift with us!"),
    ("Iron Paradise Gym", "Early bird offer ☀️ First 10 check-ins before 7 AM get a free protein shake. Rise and grind!"),

    ("Spice Garden Restaurant", "Weekend special: Dal Baati Churma thali for just ₹199 🍛 Limited plates — come early!"),
    ("Spice Garden Restaurant", "Catering enquiries for December weddings and corporate events are now open 📋 DM us for a customized quote."),
    ("Spice Garden Restaurant", "New dessert on the menu 🍮 Shahi Tukda with home-made rabdi — pure Bhopal on a plate."),

    ("TechFix Solutions", "Same-day screen replacement now available for iPhone 14 and 15 series 📱 Genuine parts, 90-day warranty."),
    ("TechFix Solutions", "Lost your data? Our recovery success rate is 94% 💾 Bring your device in — free diagnosis with every repair."),
    ("TechFix Solutions", "Laptop running slow? 🖥️ We'll diagnose, clean, and optimize it same day. Starting at just ₹399."),

    ("The Book Nook", "UPSC Prelims 2025 books have arrived 📚 Complete sets at 10% off. Stock is limited — grab yours today!"),
    ("The Book Nook", "Weekend reading sale 📖 All fiction titles flat 30% off this Saturday and Sunday only!"),
    ("The Book Nook", "New arrival: Chetan Bhagat's latest is in stock! Come pick up your signed copy while they last 🎉"),

    ("Serenity Spa", "✨ Treat yourself this weekend. Our Hot Stone Massage package is now available at a special introductory price."),
    ("Serenity Spa", "Pre-wedding package alert 💆 Book our complete bridal spa day — 4 hours of pure relaxation before the big day."),
    ("Serenity Spa", "Winter is the best time for a deep tissue massage 🍂 Your muscles will thank you. Book your session today."),
    ("Serenity Spa", "New: Aromatherapy add-on now available with any massage. Choose from lavender, eucalyptus, or citrus blends 🌿"),

    # Pune
    ("Third Wave Coffee", "Our new Yirgacheffe pour-over is extraordinary ☕ Single-origin, light roast, and tasting notes of bergamot and stone fruit."),
    ("Third Wave Coffee", "Coffee Masterclass this Saturday — learn the AeroPress method from our head barista 🎓 Limited seats, register now!"),
    ("Third Wave Coffee", "Cold brew batch for the week is ready! Stop by for our signature 18-hour steeping recipe ❄️"),

    ("Scissors & Style", "New season, new look 💇 Book your keratin treatment this month and get a free conditioning treatment worth ₹500."),
    ("Scissors & Style", "Introducing our men's grooming service — haircut + beard sculpting + face cleanup in one session 💈"),
    ("Scissors & Style", "Nail art inspo just dropped ✨ Galaxy nails, chrome tips, and 3D florals now available. DM to book!"),

    ("Pune Fitness Hub", "New batch of 30-day transformation challenge starting next Monday 💪 Limited spots. Register at the front desk."),
    ("Pune Fitness Hub", "The swimming pool is now open for morning lap sessions from 5:30 AM 🏊 Early birds, the lane is yours!"),
    ("Pune Fitness Hub", "Meet our new nutrition coach Riya 🥗 One-on-one consultations now available. Eat right, train better."),

    ("Masala Twist", "New dish alert 🍽️ Our Butter Chicken Lasagna is here — the fusion nobody knew they needed until now!"),
    ("Masala Twist", "Corporate lunch boxes now available for offices in Baner 🏢 Starting at ₹120 per person. Call for bulk orders!"),
    ("Masala Twist", "Our Kolhapuri Chicken won Best Dish at Pune Food Fest 2024 🏆 Come taste the award-winning recipe!"),

    ("HealthFirst Clinic", "Dr. Meghna Kulkarni (Dermatology) is now available Mon/Wed/Fri 🩺 Book your skin consultation today."),
    ("HealthFirst Clinic", "Free senior citizen health screening every 1st Saturday of the month 💙 No appointment needed."),
    ("HealthFirst Clinic", "Now offering dietitian consultations for PCOD, thyroid, and diabetes management. Book through the app."),

    ("QuickFix Mobile", "Water damage repair success stories keep coming in 💧 Don't give up on your phone — bring it to us first!"),
    ("QuickFix Mobile", "New stock of tempered glass and phone covers just arrived 📱 All brands, all models. Stop by!"),
    ("QuickFix Mobile", "Free phone health check this Saturday ✅ We'll check your battery health, screen sensitivity, and software — no charge."),

    ("PageTurner Books", "Book Club meeting this Sunday at 4 PM 📚 We're discussing 'The Covenant of Water' by Abraham Verghese. All welcome!"),
    ("PageTurner Books", "New arrivals shelf updated — 50 new titles this week across fiction, self-help, and Marathi literature 🌟"),
    ("PageTurner Books", "Back to School season 🎒 Complete stationery kits for Classes 5–12 now available. Bulk orders get 15% off."),

    ("Urban Retreat Spa", "Couples spa package is the perfect anniversary gift 💑 3 hours of treatments for two — now at ₹2,999."),
    ("Urban Retreat Spa", "Introducing Sunday Morning Rituals ☀️ A 90-minute wellness session combining yoga, meditation, and a relaxing massage."),
    ("Urban Retreat Spa", "Winter special: Hot oil hair spa + head massage combo now available. Your hair needs the love ❤️"),

    ("The Breakfast Club", "Sunday brunches hit different here 🥞 Join us this weekend for our new seasonal menu — acai bowls and more!"),
    ("The Breakfast Club", "Early bird offer ☀️ First 10 orders before 8 AM get a free cold-pressed juice. Rise early, eat well!"),
    ("The Breakfast Club", "New on the menu: Avocado Toast with Poached Eggs 🥑 Healthy, filling, and absolutely delicious. Try it today!"),

    ("AutoCare Garage", "Monsoon car check package ☔ AC, brakes, wipers, tyres — complete inspection for just ₹499 this week only."),
    ("AutoCare Garage", "Our paint booth is booked solid — but we're taking bookings for next month 🎨 Call us to schedule!"),
    ("AutoCare Garage", "Tyre rotation + wheel alignment + balancing — get all three done together for ₹799 flat 🔧 Limited slots available."),

    # Mumbai
    ("Bombay Brew Co", "New tap this Friday 🍺 Malabar Stout from our friends at Independence Brewing. Come taste it before it runs out!"),
    ("Bombay Brew Co", "Live jazz night this Friday at 8 PM 🎷 Good music, great craft beer, excellent coffee. See you there, Bandra!"),
    ("Bombay Brew Co", "Work Pod Wednesdays ☕ Book a pod for 4 hours and get a free single-origin filter coffee on us. DM to reserve!"),
    ("Bombay Brew Co", "New single-origin arrived — Panama Geisha natural process 🌿 Limited stock. Ask your barista for a taste."),

    ("Studio One Salon", "Bridal booking season is open for December and January 💍 Only 8 bridal slots remaining. Call to secure yours!"),
    ("Studio One Salon", "Introducing Olaplex treatments 💆 The ultimate bond repair system — your hair will feel reborn. Book your session now."),
    ("Studio One Salon", "Summer color refresh 🌈 10% off all highlight and balayage services this month. Look stunning, spend less."),

    ("FitZone Mumbai", "New recovery zone now open 💆 Foam rollers, compression boots, and a fully equipped sauna. Train hard, recover harder."),
    ("FitZone Mumbai", "CrossFit Open is here 🏋️ Join our Powai team — internal WODs every Saturday. All skill levels welcome!"),
    ("FitZone Mumbai", "Boxing batch now open for beginners 🥊 3 classes per week with our certified coach. The best stress release, guaranteed!"),
    ("FitZone Mumbai", "5 AM club strong 💪 Our early morning strength batch now has open spots. First week free for new members."),

    ("Coastal Kitchen", "Fresh catch just in 🦐 Red snapper, pomfret, and tiger prawns on the menu this weekend. Reserve your table now!"),
    ("Coastal Kitchen", "Weekend brunch is LIVE every Saturday and Sunday 🍽️ Unlimited coastal spread from 11 AM–3 PM. ₹799 per person."),
    ("Coastal Kitchen", "Introducing our new Konkani Thali 🌴 7 dishes, 2 sides, papad, pickle, and solkadhi. Pure coastal comfort on a banana leaf."),

    ("CityDoc Clinic", "Now offering free BP and blood sugar check every Saturday morning 💊 Walk in, no appointment needed."),
    ("CityDoc Clinic", "Flu season alert 🤧 Get your influenza vaccination done this week. Available daily 9 AM–7 PM, no booking required."),
    ("CityDoc Clinic", "Teleconsultation is available 24/7 through our app 📱 Skip the traffic — consult your doctor from home."),

    ("Gadget Guru", "iPhone 16 screen replacements now available ✅ Original quality OLED panels with full Face ID functionality preserved."),
    ("Gadget Guru", "Smart home consultation — free of charge this week 🏠 We'll assess your home and give you a setup plan at no cost."),
    ("Gadget Guru", "Laptop SSD upgrade sale ⚡ Speed up your old laptop dramatically. 256GB upgrade starting at ₹2,499 installed."),

    ("Zen Wellness Spa", "Shirodhara experience — a continuous stream of warm oil on your forehead that melts every bit of stress away 🌊 Book now."),
    ("Zen Wellness Spa", "Valentine's special 💕 Couples Ayurvedic ritual — 2 hours for two people, starting at ₹3,999. Book before it fills!"),
    ("Zen Wellness Spa", "Introducing our 7-day Detox & Reset programme — daily Ayurvedic treatments + diet consultation 🌿 Limited spots."),
    ("Zen Wellness Spa", "Our head therapist has 14 years of Kerala Ayurveda training 🙏 You're in truly expert hands here at Zen."),
]


def build_posts(businesses: list) -> list:
    name_to_doc = {b["name"]: b for b in businesses}
    docs = []
    for biz_name, caption in _POST_DATA:
        bdoc = name_to_doc.get(biz_name)
        if not bdoc:
            continue
        docs.append({
            "_id": oid(),
            "business_id": str(bdoc["_id"]),
            "business_name": biz_name,
            "business_avatar": None,
            "image": "",
            "caption": caption,
            "likes": random.randint(3, 87),
            "comments": [],
            "created_at": rdt(1, 60),
        })
    return docs


# ══════════════════════════════════════════════════════════════════════════════
# JOBS  (business_name, title, description, type, salary)
# ══════════════════════════════════════════════════════════════════════════════

_JOB_DATA = [
    ("Café Aroha",          "Barista",               "Full Time",  "₹12,000 – ₹16,000/month",
     "Prepare specialty espresso, filter coffee, and cold brew beverages for our growing customer base. Maintain cleanliness standards and assist with counter operations.",
     "Passion for specialty coffee\nExperience in espresso preparation preferred\nFriendly and team-oriented attitude\nWillingness to learn latte art"),
    ("Café Aroha",          "Café Manager",          "Full Time",  "₹20,000 – ₹28,000/month",
     "Oversee daily cafe operations, manage staff, handle vendor relationships, and ensure consistently excellent customer experience at Café Aroha.",
     "2+ years in food service or cafe management\nStrong leadership and organizational skills\nExperience with POS systems and inventory\nAbility to handle customer feedback professionally"),

    ("Glam Studio",         "Hair Stylist",          "Full Time",  "₹15,000 – ₹22,000/month",
     "Perform precision haircuts, colouring, balayage, and treatments for a diverse client base. Maintain up-to-date knowledge of global hair trends.",
     "Diploma or certification in hair styling\nMinimum 1 year of salon experience\nKnowledge of global colour techniques\nProfessional client-handling skills"),
    ("Glam Studio",         "Nail Technician",       "Part Time",  "₹10,000 – ₹14,000/month",
     "Provide manicure, pedicure, gel nail, and nail art services. Maintain hygienic workstation and give clients a premium experience.",
     "Certification in nail care services\nExperience with gel and acrylic nails\nCreative approach to nail art\nSterilization and hygiene-conscious mindset"),

    ("Dr. Mehta's Clinic",  "Receptionist",          "Full Time",  "₹12,000 – ₹15,000/month",
     "Schedule patient appointments, manage medical records, handle billing, and ensure smooth front-desk operations at the clinic.",
     "Graduate with good communication skills\nBasic computer proficiency (MS Office)\nPatient and empathetic manner\nPrior clinic or hospital experience a plus"),
    ("Dr. Mehta's Clinic",  "Lab Technician",        "Full Time",  "₹16,000 – ₹20,000/month",
     "Collect patient samples, conduct basic diagnostic tests, maintain equipment logs, and report results accurately and on time.",
     "Diploma or degree in Medical Lab Technology\nExperience with blood and urine analysis\nAttention to detail and accuracy\nKnowledge of lab safety protocols"),

    ("Iron Paradise Gym",   "Personal Trainer",      "Full Time",  "₹18,000 – ₹28,000/month",
     "Design and deliver customized fitness programs for members. Conduct one-on-one PT sessions, track progress, and motivate clients to reach their goals.",
     "ACE, ACSM, or NSCA certification preferred\n1+ years of personal training experience\nKnowledge of strength and conditioning principles\nExcellent communication and motivational skills"),
    ("Iron Paradise Gym",   "Front Desk Executive",  "Part Time",  "₹8,000 – ₹11,000/month",
     "Welcome members, process memberships and renewals, answer queries, and maintain front desk operations during assigned shift hours.",
     "Friendly, presentable, and punctual\nBasic computer skills for POS and member management\nAbility to handle cash and digital payments\nKnowledge of gym services and packages"),

    ("Spice Garden Restaurant", "Junior Chef",       "Full Time",  "₹14,000 – ₹20,000/month",
     "Assist the head chef in preparing authentic Madhya Pradesh cuisine. Maintain kitchen hygiene, ingredient prep, and consistent food quality during service hours.",
     "Diploma from a hospitality institute or equivalent\nKnowledge of MP/North Indian cuisine\nAbility to work under pressure in a fast-paced kitchen\nStrong understanding of FSSAI food safety norms"),
    ("Spice Garden Restaurant", "Waiter",            "Full Time",  "₹9,000/month + tips",
     "Take orders accurately, serve food and beverages, ensure guest satisfaction, and maintain a clean dining area throughout service hours.",
     "Good communication skills in Hindi and basic English\nExperience in table service preferred\nPositive attitude and ability to handle busy shifts\nKnowledge of the menu and ability to make recommendations"),

    ("TechFix Solutions",   "Mobile Repair Technician", "Full Time", "₹15,000 – ₹22,000/month",
     "Diagnose and repair smartphones across all major brands. Replace screens, batteries, and charging ports using genuine parts with a professional finish.",
     "ITI or diploma in electronics or equivalent\nHands-on experience with iPhone and Android repairs\nFamiliarity with micro-soldering is a plus\nAbility to handle customer devices with care"),
    ("TechFix Solutions",   "Customer Support Executive", "Part Time", "₹8,000 – ₹10,000/month",
     "Handle customer walk-ins, explain repair timelines and pricing, coordinate device handovers, and follow up with clients after service completion.",
     "Good Hindi and English communication\nBasic technical knowledge of mobile devices\nCustomer-first mindset\nProficient in WhatsApp Business for follow-ups"),

    ("The Book Nook",       "Sales Associate",       "Part Time",  "₹9,000 – ₹11,000/month",
     "Assist customers in finding books, manage shelving and inventory, handle POS billing, and maintain a clean, well-organized store environment.",
     "Genuine love for reading and books\nBasic computer skills for billing software\nOrganized and able to manage shelves by category\nFriendly, helpful, and customer-oriented"),
    ("The Book Nook",       "Social Media Coordinator", "Part Time", "₹8,000 – ₹10,000/month",
     "Create content for Instagram and WhatsApp, post new arrivals, promote events, and grow The Book Nook's online community.",
     "Active social media user with creative flair\nBasic photo editing skills (Canva or similar)\nReading enthusiast who can write engaging captions\nConsistent, reliable, and self-motivated"),

    ("Serenity Spa",        "Massage Therapist",     "Full Time",  "₹18,000 – ₹25,000/month",
     "Deliver Swedish, deep tissue, hot stone, and aromatherapy massages to clients. Maintain a professional, calming environment and uphold the spa's premium standards.",
     "Certified massage therapist (CIDESCO or equivalent)\n2+ years of professional spa experience\nKnowledge of multiple massage modalities\nExcellent hygiene and professional presentation"),
    ("Serenity Spa",        "Spa Receptionist",      "Full Time",  "₹12,000 – ₹15,000/month",
     "Manage spa bookings, welcome clients, process payments, coordinate therapist schedules, and create a warm first impression for every guest.",
     "Well-groomed with excellent interpersonal skills\nExperience in hospitality or beauty services preferred\nProficient with booking software\nAbility to handle multiple requests calmly"),

    ("Third Wave Coffee",   "Specialty Barista",     "Full Time",  "₹14,000 – ₹20,000/month",
     "Craft exceptional pour-overs, AeroPress, and espresso beverages. Engage customers with coffee knowledge and help conduct weekly tastings and masterclasses.",
     "Passion for specialty coffee is non-negotiable\nKnowledge of brewing variables and extraction\nSCA certification or equivalent training preferred\nExcellent customer-facing communication"),
    ("Third Wave Coffee",   "Store Manager",         "Full Time",  "₹22,000 – ₹30,000/month",
     "Lead the daily operations of Third Wave Coffee, manage the team, maintain quality standards, and handle vendor sourcing and inventory.",
     "3+ years in food and beverage management\nStrong coffee knowledge and sensory skills\nAbility to lead and train a small team\nExperience with P&L and cost management"),

    ("Scissors & Style",    "Senior Hair Stylist",   "Full Time",  "₹20,000 – ₹30,000/month",
     "Handle advanced colouring, balayage, keratin treatments, and complex cuts for a high-volume salon clientele on FC Road.",
     "Minimum 3 years in a professional salon\nExpertise in global hair colour techniques\nStrong portfolio of colour and cut work\nAbility to retain and grow personal clientele"),
    ("Scissors & Style",    "Receptionist",          "Full Time",  "₹10,000 – ₹13,000/month",
     "Manage appointment bookings, greet and check in walk-in clients, process payments, and keep the front desk and reception area organized.",
     "Presentable and warm personality\nFamiliarity with salon booking apps\nBasic MS Office or Google Sheets\nAble to handle a fast-paced, busy environment"),

    ("Pune Fitness Hub",    "Fitness Instructor",    "Full Time",  "₹18,000 – ₹24,000/month",
     "Lead group fitness classes including yoga, pilates, and Zumba. Design class plans, ensure member safety, and create an energetic, inclusive atmosphere.",
     "Certification in yoga, pilates, or aerobics\n1+ years of group class instruction experience\nStrong motivational and communication skills\nFlexible with early morning and evening batches"),
    ("Pune Fitness Hub",    "Nutritionist",          "Full Time",  "₹20,000 – ₹28,000/month",
     "Conduct one-on-one nutrition consultations for members. Design personalized meal plans for weight loss, muscle gain, and medical diet requirements.",
     "B.Sc or M.Sc in Nutrition and Dietetics\nRegistered Dietitian certification preferred\nExperience with PCOD, diabetes, and sports nutrition\nEmpathetic, patient consultation style"),

    ("Masala Twist",        "Sous Chef",             "Full Time",  "₹22,000 – ₹30,000/month",
     "Support the head chef in managing the kitchen brigade, maintaining food quality, designing seasonal specials, and training junior kitchen staff.",
     "Diploma from a recognized hospitality institute\n3+ years of kitchen experience ideally in Indian cuisine\nStrong understanding of modern plating techniques\nLeadership skills and ability to manage prep teams"),
    ("Masala Twist",        "Delivery Coordinator",  "Full Time",  "₹12,000 – ₹15,000/month",
     "Coordinate Swiggy, Zomato, and direct delivery orders. Ensure accurate packing, timely dispatch, and handle any delivery-related customer issues.",
     "Familiarity with food delivery platforms\nGood Hindi and basic English communication\nOrganized, fast-paced, and detail-oriented\nPrior restaurant experience preferred"),

    ("HealthFirst Clinic",  "Medical Receptionist",  "Full Time",  "₹13,000 – ₹16,000/month",
     "Manage patient appointments, maintain digital health records, handle insurance paperwork, and ensure a smooth patient flow at the front desk.",
     "Graduate with strong organizational skills\nExperience in a medical or clinical setup preferred\nProficient in basic computer applications\nPatient, empathetic, and professional demeanor"),
    ("HealthFirst Clinic",  "Staff Nurse",           "Full Time",  "₹18,000 – ₹24,000/month",
     "Assist doctors during OPD consultations, manage dressings and injections, record patient vitals, and maintain treatment room hygiene and stock.",
     "GNM or B.Sc Nursing with valid registration\n1+ years of clinical experience\nProficient in ECG and basic diagnostics\nCalm and professional in a fast-paced clinic environment"),

    ("QuickFix Mobile",     "Lead Repair Technician","Full Time",  "₹18,000 – ₹26,000/month",
     "Lead complex phone and tablet repairs. Mentor junior technicians, maintain quality control, and handle advanced cases like water damage and data recovery.",
     "3+ years of mobile repair experience\nProficiency in micro-soldering is a strong plus\nExperience with data recovery tools\nStrong diagnostic and problem-solving skills"),
    ("QuickFix Mobile",     "Store Assistant",       "Part Time",  "₹8,000 – ₹10,000/month",
     "Assist customers with repair intake, manage device tracking, update clients on repair status, and handle accessory sales at the counter.",
     "Good communication skills in Marathi, Hindi, English\nBasic understanding of mobile devices\nCustomer-first approach\nEagerness to learn about tech repair"),

    ("PageTurner Books",    "Bookseller",            "Full Time",  "₹11,000 – ₹14,000/month",
     "Help customers discover the right books, manage the new arrivals and recommendations display, and represent PageTurner's love of reading in every interaction.",
     "Passionate reader with broad genre knowledge\nStrong communication and recommendation skills\nExperience in retail or customer service preferred\nKnowledge of current publishing trends"),
    ("PageTurner Books",    "Events Coordinator",    "Part Time",  "₹9,000 – ₹11,000/month",
     "Organize and host book club sessions, author events, and school reading programmes. Manage event registrations, logistics, and post-event feedback.",
     "Organized, proactive, and detail-oriented\nExperience in event management or community organizing\nPassion for books and reading culture\nSocial media and communication skills"),

    ("Urban Retreat Spa",   "Massage Therapist",     "Full Time",  "₹18,000 – ₹24,000/month",
     "Provide massage, reflexology, and body treatment services to spa clients. Maintain a tranquil environment and uphold the highest standards of client care.",
     "Certified in massage therapy (CIDESCO or equivalent)\nExperience in aromatherapy and reflexology\nProfessional, presentable, and discreet\nAbility to customize treatments to client needs"),
    ("Urban Retreat Spa",   "Spa Coordinator",       "Full Time",  "₹12,000 – ₹15,000/month",
     "Handle all spa bookings, coordinate therapist schedules, welcome clients, manage retail sales, and ensure a seamless guest experience from arrival to departure.",
     "Experience in hospitality or wellness industry\nExcellent interpersonal and organizational skills\nProficient with booking and POS software\nCalm, professional, and highly presentable"),

    ("The Breakfast Club",  "Kitchen Chef",          "Full Time",  "₹16,000 – ₹22,000/month",
     "Prepare the full breakfast menu including eggs, pancakes, smoothie bowls, and healthy bowls. Ensure consistent quality, hygiene, and timely service.",
     "Diploma in culinary arts or equivalent\nExperience in all-day breakfast or cafe kitchen\nAbility to manage high-volume service efficiently\nKnowledge of healthy cooking and dietary options"),
    ("The Breakfast Club",  "Cafe Server",           "Part Time",  "₹8,000 – ₹10,000/month",
     "Serve customers efficiently during breakfast service hours, manage order accuracy, handle payments, and keep the dining area clean and welcoming.",
     "Friendly, energetic, and reliable\nExperience in food service preferred\nAble to work early morning shifts from 7 AM\nGood spoken Hindi and English"),

    ("AutoCare Garage",     "Automobile Technician", "Full Time",  "₹18,000 – ₹26,000/month",
     "Service and repair multi-brand vehicles — oil changes, brake servicing, AC repair, and diagnostics. Work with modern tools and adhere to quality standards.",
     "ITI certificate in automobile mechanics or equivalent\n2+ years of experience in a multi-brand garage\nFamiliarity with OBD2 diagnostic tools\nAbility to write service reports and interact with clients"),
    ("AutoCare Garage",     "Workshop Manager",      "Full Time",  "₹22,000 – ₹30,000/month",
     "Oversee all service bay operations, allocate jobs to technicians, manage parts inventory, handle customer billing, and maintain the garage's reputation for quality.",
     "5+ years in automotive service with 2 years in a supervisory role\nKnowledge of multi-brand car systems\nStrong customer-handling and team management skills\nExperience with garage management software"),

    ("Bombay Brew Co",      "Head Barista",          "Full Time",  "₹18,000 – ₹26,000/month",
     "Lead the coffee bar at Bombay Brew Co — manage single-origin offerings, train junior baristas, and deliver an exceptional specialty coffee experience daily.",
     "SCA certification or equivalent professional training\n3+ years of specialty coffee experience\nPassion for coffee sourcing and brewing science\nAble to conduct customer tastings and workshops"),
    ("Bombay Brew Co",      "Bar & Events Manager",  "Full Time",  "₹22,000 – ₹32,000/month",
     "Manage the craft beer tap list, coordinate with brewery partners, run weekly events including live music nights, and ensure the evening bar experience is seamless.",
     "Experience in craft beer or hospitality\nPassion for the F&B events scene in Mumbai\nStrong vendor and artist management skills\nAble to work Friday-Sunday evenings reliably"),

    ("Studio One Salon",    "Color Specialist",      "Full Time",  "₹25,000 – ₹40,000/month",
     "Handle advanced hair color work — balayage, highlights, toning, Olaplex treatments — for a discerning clientele in Andheri West.",
     "Minimum 3 years of professional color experience\nTraining in international color techniques (L'Oreal, Wella, Schwarzkopf)\nStrong portfolio of before-and-after color work\nAbility to grow and retain a personal book of clients"),
    ("Studio One Salon",    "Bridal Makeup Artist",  "Full Time",  "₹22,000 – ₹35,000/month",
     "Create stunning bridal looks for wedding clients across Mumbai. Work alongside the styling team to deliver a complete wedding look from consultation to the big day.",
     "Professional makeup artistry certification\n3+ years of bridal makeup experience\nStrong portfolio including traditional and contemporary bridal styles\nExcellent client relationship management"),

    ("FitZone Mumbai",      "Head Strength Coach",   "Full Time",  "₹28,000 – ₹40,000/month",
     "Design and run evidence-based strength and conditioning programs for members ranging from beginners to competitive athletes. Lead the Olympic lifting platform.",
     "NSCA CSCS or equivalent certification\n4+ years of strength and conditioning experience\nExperience with powerlifting or Olympic lifting\nAble to create periodic programming and track member progress"),
    ("FitZone Mumbai",      "Boxing Coach",          "Part Time",  "₹15,000 – ₹20,000/month",
     "Run beginner and intermediate boxing classes, teach fundamental technique, create punch combinations, and develop the gym's boxing programme.",
     "Amateur or professional boxing experience\nCoaching or teaching certification preferred\nHigh energy, motivational coaching style\nAble to conduct 3 evening sessions per week"),

    ("Coastal Kitchen",     "Seafood Chef",          "Full Time",  "₹22,000 – ₹32,000/month",
     "Lead the seafood kitchen at Coastal Kitchen. Source fresh catch, design the weekly menu, and execute Konkani and coastal dishes to the highest standard.",
     "Culinary degree or equivalent experience\n3+ years in seafood or coastal cuisine kitchen\nKnowledge of Konkani, Malvani, and Goan recipes\nAble to manage the live cooking station during service"),
    ("Coastal Kitchen",     "Floor Supervisor",      "Full Time",  "₹15,000 – ₹20,000/month",
     "Supervise the dining floor, manage service staff, ensure excellent guest experience, handle table reservations, and coordinate with the kitchen during brunch service.",
     "2+ years in a restaurant supervisory role\nStrong guest relations and complaint handling skills\nKnowledge of seafood menu to assist customers\nAble to work weekend brunch service"),

    ("CityDoc Clinic",      "General Physician",     "Full Time",  "₹45,000 – ₹70,000/month",
     "Conduct OPD consultations, diagnose and treat common ailments, manage chronic conditions, and provide compassionate family medicine to patients in Malad.",
     "MBBS with valid Maharashtra Medical Council registration\n2+ years of clinical practice post-internship\nFluent in Hindi, Marathi, and English\nComfort with digital prescriptions and EMR software"),
    ("CityDoc Clinic",      "Lab & Phlebotomy Technician", "Full Time", "₹16,000 – ₹20,000/month",
     "Collect blood and urine samples, perform basic lab tests including CBC and blood sugar, maintain accurate records, and process reports on time.",
     "DMLT or BMLT qualification\n1+ years of clinical lab experience\nAccurate, detail-oriented, and gentle with patients\nKnowledge of bio-safety and sample handling protocols"),

    ("Gadget Guru",         "Senior Electronics Technician", "Full Time", "₹20,000 – ₹30,000/month",
     "Handle advanced electronics repair including laptop motherboards, iPhone logic boards, and smart home installation projects across client locations in Mumbai.",
     "3+ years in electronics or IT hardware repair\nExperience with micro-soldering and board-level diagnostics\nKnowledge of home automation and CCTV systems\nValid driving license for site visits preferred"),
    ("Gadget Guru",         "Smart Home Installer",  "Full Time",  "₹18,000 – ₹24,000/month",
     "Install and configure smart home systems — CCTV, door access, smart lights, and automation hubs — for residential and commercial clients across Mumbai.",
     "Experience with smart home brands (Xiaomi, Google, Philips Hue, etc.)\nBasic electrical knowledge and IT networking skills\nAble to communicate technical concepts to non-technical clients\nComfortable with site visits and travel across Mumbai"),

    ("Zen Wellness Spa",    "Ayurvedic Therapist",   "Full Time",  "₹22,000 – ₹32,000/month",
     "Deliver authentic Ayurvedic treatments including Abhyanga, Shirodhara, Panchakarma prep, and Udvartana at Zen Wellness Spa in Worli.",
     "Kerala Ayurvedic Massage certification\n3+ years of professional spa or Panchakarma center experience\nDeep knowledge of Ayurvedic principles and marma points\nCalm, spiritual, and professional in all client interactions"),
    ("Zen Wellness Spa",    "Wellness Concierge",    "Full Time",  "₹14,000 – ₹18,000/month",
     "Create a seamless arrival and departure experience for guests. Manage bookings, coordinate therapist assignments, handle retail sales, and maintain the premium spa environment.",
     "Background in luxury hospitality or wellness\nImpeccable grooming and communication skills\nProficient with spa booking software\nAble to work weekends and maintain a calm, composed presence"),
]


def build_jobs(businesses: list) -> list:
    name_to_doc = {b["name"]: b for b in businesses}
    docs = []
    for biz_name, title, jtype, salary, description, requirements in _JOB_DATA:
        bdoc = name_to_doc.get(biz_name)
        if not bdoc:
            continue
        docs.append({
            "_id": oid(),
            "business_id": str(bdoc["_id"]),
            "business_name": biz_name,
            "business_logo": None,
            "title": title,
            "description": f"{description}\n\nRequirements:\n{requirements}",
            "location": bdoc["address"],
            "type": jtype,
            "salary": salary,
            "posted_at": rdt(1, 30),
            "is_active": True,
            "applicants": [],
        })
    return docs


# ══════════════════════════════════════════════════════════════════════════════
# DEALS  (business_name, title, description, discount_label, days_valid)
# ══════════════════════════════════════════════════════════════════════════════

_DEAL_DATA = [
    ("Café Aroha",      "Buy 2 Get 1 Free on Cold Brews",        "Order any two cold brew beverages and the third one is completely on us. Valid every day.",                          "Buy 2 Get 1 Free",  30),
    ("Café Aroha",      "20% Off on Weekday Mornings",           "Enjoy 20% off your entire order Monday to Friday before 11 AM. Perfect for early birds!",                          "20% Off",           45),
    ("Glam Studio",     "Flat ₹300 Off Your First Visit",        "New customers get ₹300 off on any service above ₹800 on their very first appointment.",                             "₹300 Off First Visit", 60),
    ("Glam Studio",     "Haircut + Facial Combo at ₹999",        "Book our popular combo — haircut + express facial — at just ₹999 for a complete refresh.",                          "₹999 Combo",        30),
    ("Dr. Mehta's Clinic", "Free BP Check with Any Consultation", "Get your blood pressure checked completely free with any paid doctor consultation. No extra booking needed.",      "Free BP Check",     90),
    ("Dr. Mehta's Clinic", "Health Checkup Package at ₹499",    "Complete basic health package: CBC + blood sugar + BP check + consultation for just ₹499.",                         "₹499 Package",      45),
    ("Iron Paradise Gym",  "First Month at ₹999",               "New members get their first month of unlimited access to all facilities and classes for just ₹999.",                "₹999 First Month",  30),
    ("Iron Paradise Gym",  "Annual Membership at 30% Off",      "Lock in 12 months of unlimited access at 30% below the standard annual rate. Limited memberships available.",       "30% Off Annual",    21),
    ("Spice Garden Restaurant", "Weekend Family Thali at ₹599",  "Feed a family of two with our generous weekend thali — Dal Baati, sides, salad, papad, and dessert.",              "₹599 For Two",      30),
    ("Spice Garden Restaurant", "Free Dessert on Orders Above ₹500", "Order any dine-in meal above ₹500 and get our Shahi Tukda dessert absolutely free.",                          "Free Dessert",      60),
    ("TechFix Solutions",  "Free Diagnosis on Any Device",       "Bring any device for diagnosis — smartphone, laptop, or tablet — and we'll assess it with no charges.",            "Free Diagnosis",    90),
    ("TechFix Solutions",  "Screen Replacement Starting ₹799",  "Get your cracked screen replaced starting at just ₹799 with genuine parts and a 90-day warranty.",                 "From ₹799",         30),
    ("The Book Nook",      "30% Off All Fiction Titles",         "Every fiction title in the store is 30% off this month. Perfect time to grow your reading list!",                  "30% Off Fiction",   30),
    ("The Book Nook",      "Buy 3 Books Get 1 Free",             "Add any 4 books to your cart and the cheapest one is on us. Mix and match any genre.",                             "Buy 3 Get 1 Free",  45),
    ("Serenity Spa",       "Swedish Massage at ₹1,499",          "Experience our signature 60-minute Swedish massage at an introductory price of ₹1,499 (regular ₹1,999).",         "₹1,499 Offer",      30),
    ("Serenity Spa",       "Couple Spa Package at ₹3,499",       "Book our 90-minute couples package — includes full body massage for two with aromatherapy and herbal tea.",         "₹3,499 Couple Pkg", 45),
    ("Third Wave Coffee",  "Coffee Masterclass at 50% Off",      "Attend our weekend pour-over or AeroPress masterclass at 50% off the regular price. Seats limited.",               "50% Off",           30),
    ("Third Wave Coffee",  "Free Pastry with Any Filter Coffee", "Order any single-origin filter coffee and get a complimentary freshly baked pastry of your choice.",               "Free Pastry",       21),
    ("Scissors & Style",   "Flat ₹200 Off First Visit",         "New to Scissors & Style? Get ₹200 off on any service above ₹600 on your first appointment.",                       "₹200 Off First Visit", 60),
    ("Scissors & Style",   "Keratin + Haircut Combo at ₹2,499", "Our popular combo — keratin treatment and precision haircut — at a special bundled price of ₹2,499.",              "₹2,499 Combo",      30),
    ("Pune Fitness Hub",   "3-Month Membership at ₹2,499",      "Get full access to all gym facilities, classes, and the swimming pool for 3 months at just ₹2,499.",               "₹2,499 for 3 Months", 30),
    ("Pune Fitness Hub",   "Free Personal Training Trial",       "New members get a complimentary 45-minute one-on-one session with a certified personal trainer.",                  "Free PT Session",   45),
    ("Masala Twist",       "Lunch For Two at ₹599",              "Enjoy our 2-person lunch combo — main course, naan, rice, and a shared dessert — for just ₹599.",                 "₹599 Lunch For Two", 30),
    ("Masala Twist",       "20% Off on Corporate Lunch Orders",  "Order 10 or more corporate lunch boxes and get 20% off the total. Call us to place bulk orders.",                 "20% Off Bulk",      60),
    ("HealthFirst Clinic", "Free Senior Citizen Checkup",        "Patients above 60 years get a free basic health screening every 1st Saturday of the month.",                      "Free Checkup",      90),
    ("HealthFirst Clinic", "Dietitian Consultation at ₹299",    "Book a 45-minute consultation with our certified dietitian for just ₹299 (regular ₹599). Limited slots.",         "₹299 Consultation", 30),
    ("QuickFix Mobile",    "Free Diagnosis with Any Repair",     "Bring any device for repair and the diagnosis is completely free — no charges until you approve the work.",        "Free Diagnosis",    90),
    ("QuickFix Mobile",    "Screen Replacement at ₹799",        "Get cracked screens replaced starting at ₹799 with quality parts and a 90-day warranty included.",                 "From ₹799",         30),
    ("PageTurner Books",   "Book Club Members Get 15% Off",      "Join our free monthly Book Club and get 15% off all purchases every time you shop with us.",                       "15% Off for Members", 90),
    ("PageTurner Books",   "Stationery Combo at ₹199",          "Back-to-school combo: notebook + pen set + geometry box + highlighters — all for just ₹199.",                      "₹199 School Kit",   30),
    ("Urban Retreat Spa",  "First Visit Flat ₹500 Off",         "New clients get ₹500 off any treatment above ₹1,500 on their very first appointment.",                             "₹500 Off",          60),
    ("Urban Retreat Spa",  "Couples Package at ₹2,999",         "Book our 90-minute couple spa experience including massage and reflexology for two at just ₹2,999.",               "₹2,999 Couples",    30),
    ("The Breakfast Club", "Early Bird 20% Off Before 8 AM",    "Place your order before 8 AM Monday to Friday and get 20% off your entire bill. Rise and win!",                   "20% Off Early Bird", 30),
    ("The Breakfast Club", "Healthy Bowl + Juice Combo at ₹299","Our most popular healthy combo — signature smoothie bowl plus a cold-pressed juice — at ₹299.",                   "₹299 Combo",        45),
    ("AutoCare Garage",    "Monsoon Car Check at ₹499",          "Complete 10-point monsoon check: AC, wipers, brakes, tyres, battery, and lights — all for ₹499.",                 "₹499 Check",        30),
    ("AutoCare Garage",    "Free AC Gas Check with Full Service","Book a full car service and get your AC refrigerant level checked completely free of charge.",                     "Free AC Check",     45),
    ("Bombay Brew Co",     "Happy Hour: 2 Craft Beers for ₹499","Every day from 3–6 PM, get two pints of our house craft beer for just ₹499. Bandra's best happy hour!",           "₹499 Happy Hour",   30),
    ("Bombay Brew Co",     "Work Pod + Coffee Offer",            "Book a work pod for 4 hours and get a complimentary single-origin filter coffee on us.",                           "Free Coffee with Pod", 45),
    ("Studio One Salon",   "10% Off All Color Services",        "Book any highlight, balayage, or full color treatment and get 10% off — valid all month.",                         "10% Off Color",     30),
    ("Studio One Salon",   "Bridal Trial at ₹1,999",            "Book a bridal makeup trial session with our lead artist for just ₹1,999 — deducted from the final package.",      "₹1,999 Trial",      45),
    ("FitZone Mumbai",     "First Month at ₹1,499",             "New members join for just ₹1,499 for the first month — full access to all facilities, classes, and the sauna.",    "₹1,499 First Month", 30),
    ("FitZone Mumbai",     "Annual Membership + Free PT",       "Sign up for a full-year membership and get 3 complimentary personal training sessions worth ₹3,000.",              "3 Free PT Sessions", 21),
    ("Coastal Kitchen",    "Weekend Brunch at ₹799",            "Unlimited Konkani coastal spread every Saturday and Sunday from 11 AM–3 PM for just ₹799 per person.",             "₹799 Unlimited Brunch", 30),
    ("Coastal Kitchen",    "Free Solkadhi with Any Main",       "Order any coastal main course and get a complimentary glass of house-made kokum solkadhi.",                        "Free Solkadhi",     60),
    ("CityDoc Clinic",     "Free BP & Sugar Check",             "Walk in any day for a free blood pressure and random blood sugar check — no booking, no charges.",                 "Free Health Check", 90),
    ("CityDoc Clinic",     "Teleconsultation at ₹199",          "Consult our doctor from home via video call for just ₹199. Available 7 days, 9 AM to 9 PM.",                      "₹199 Teleconsult",  30),
    ("Gadget Guru",        "Free Diagnosis on Any Device",       "Bring any broken gadget and we'll diagnose it for free. No obligation to repair — just honest advice.",           "Free Diagnosis",    90),
    ("Gadget Guru",        "iPhone Screen from ₹1,999",         "Original-quality iPhone screen replacement starting at ₹1,999 with full Face ID preservation.",                   "From ₹1,999",       30),
    ("Zen Wellness Spa",   "Shirodhara at ₹2,499",              "Experience the ultimate Ayurvedic stress relief — 45-minute Shirodhara session at just ₹2,499 (regular ₹3,499).", "₹2,499 Offer",      30),
    ("Zen Wellness Spa",   "Couples Ayurvedic Ritual at ₹3,999","Two-hour couples Ayurvedic session including Abhyanga massage and herbal steam therapy for both.",                 "₹3,999 Couples",    45),
]


def build_deals(businesses: list) -> list:
    name_to_doc = {b["name"]: b for b in businesses}
    docs = []
    for biz_name, title, description, discount_label, days_valid in _DEAL_DATA:
        bdoc = name_to_doc.get(biz_name)
        if not bdoc:
            continue
        docs.append({
            "_id": oid(),
            "business_id": str(bdoc["_id"]),
            "business_name": biz_name,
            "title": title,
            "description": description,
            "discount_label": discount_label,
            "discount_percentage": None,
            "original_price": None,
            "deal_price": None,
            "valid_until": fdt(random.randint(15, days_valid)),
            "is_active": True,
            "created_at": rdt(1, 14),
        })
    return docs


# ══════════════════════════════════════════════════════════════════════════════
# RUNNER
# ══════════════════════════════════════════════════════════════════════════════

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    print(f"Connecting to {MONGO_URI}/{DB_NAME} …")

    # Build all data
    print("Building users …")
    users = build_users()

    print("Building businesses …")
    businesses = build_businesses()

    print("Building reviews …")
    reviews = build_reviews(businesses)

    print("Building posts …")
    posts = build_posts(businesses)

    print("Building jobs …")
    jobs = build_jobs(businesses)

    print("Building deals …")
    deals = build_deals(businesses)

    # Drop and recreate collections
    DROP_COLS = ["users", "businesses", "reviews", "posts", "jobs", "deals",
                 "bookings", "applications", "notifications"]
    print(f"Dropping collections: {', '.join(DROP_COLS)} …")
    for col in DROP_COLS:
        await db[col].drop()

    # Insert users
    print("Inserting users …")
    await db.users.insert_many(users)

    # Insert businesses
    print("Inserting businesses …")
    await db.businesses.insert_many(businesses)

    # Insert reviews
    print("Inserting reviews …")
    await db.reviews.insert_many(reviews)

    # Recalculate ratings from reviews
    print("Recalculating business ratings …")
    for biz in businesses:
        bid_str = str(biz["_id"])
        biz_reviews = [r for r in reviews if r["business_id"] == bid_str]
        count = len(biz_reviews)
        avg = round(sum(r["rating"] for r in biz_reviews) / count, 1) if count else 0.0
        await db.businesses.update_one(
            {"_id": biz["_id"]},
            {"$set": {"rating": avg, "review_count": count}},
        )

    # Insert posts
    print("Inserting posts …")
    await db.posts.insert_many(posts)

    # Insert jobs
    print("Inserting jobs …")
    await db.jobs.insert_many(jobs)

    # Insert deals
    print("Inserting deals …")
    await db.deals.insert_many(deals)

    client.close()

    # ── Summary ───────────────────────────────────────────────────────────────

    bhopal = [b for b in businesses if b["city"] == "Bhopal"]
    pune   = [b for b in businesses if b["city"] == "Pune"]
    mumbai = [b for b in businesses if b["city"] == "Mumbai"]

    print("\n" + "═" * 58)
    print("  ✅  Seed complete!")
    print("═" * 58)
    print(f"  Users        : {len(users)}")
    print(f"  Businesses   : {len(businesses)}  "
          f"(Bhopal {len(bhopal)} · Pune {len(pune)} · Mumbai {len(mumbai)})")
    print(f"  Reviews      : {len(reviews)}")
    print(f"  Posts        : {len(posts)}")
    print(f"  Jobs         : {len(jobs)}")
    print(f"  Deals        : {len(deals)}")
    print("═" * 58)
    print("\n  Demo Credentials\n")
    rows = [
        ("Regular User",       "+919876543210", "password123"),
        ("Regular User",       "+919543210987", "password123"),
        ("Regular User",       "+919111222333", "password123"),
        ("Regular User",       "+919444555666", "password123"),
        ("Business Owner (BPL)","+919654321098","business123"),
        ("Business Owner (Pune)","+918765432109","business456"),
        ("Admin",              "+910000000000", "admin123"),
    ]
    col_w = [24, 16, 12]
    header = f"  {'Role':<{col_w[0]}}{'Phone':<{col_w[1]}}{'Password':<{col_w[2]}}"
    print(header)
    print("  " + "-" * (sum(col_w)))
    for role, phone, pw in rows:
        print(f"  {role:<{col_w[0]}}{phone:<{col_w[1]}}{pw:<{col_w[2]}}")
    print()


if __name__ == "__main__":
    asyncio.run(main())
