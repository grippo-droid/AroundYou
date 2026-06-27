import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import type { Business } from "@/types";

// Fix broken default icon asset paths that Vite/webpack bundlers mangle
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]; // Bangalore fallback
const DEFAULT_ZOOM = 13;

// ── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { color: string; emoji: string }> = {
  Cafe:        { color: "#F97316", emoji: "☕" },
  Restaurant:  { color: "#EF4444", emoji: "🍽️" },
  Salon:       { color: "#EC4899", emoji: "💇" },
  Medical:     { color: "#3B82F6", emoji: "🏥" },
  Stationery:  { color: "#8B5CF6", emoji: "📚" },
  Services:    { color: "#22C55E", emoji: "⚙️" },
  Others:      { color: "#6B7280", emoji: "📍" },
};

// Cache icons per category so L.divIcon is called only once per category
const _iconCache = new Map<string, L.DivIcon>();

function getBusinessIcon(category: string): L.DivIcon {
  const hit = _iconCache.get(category);
  if (hit) return hit;
  const { color, emoji } = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.Others;
  const icon = L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:32px;height:32px;
      border-radius:50%;
      border:2.5px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.28);
      text-align:center;
      line-height:27px;
      font-size:16px;
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
  _iconCache.set(category, icon);
  return icon;
}

const USER_ICON = L.divIcon({
  className: "",
  html: `<div style="
    width:14px;height:14px;
    background:#2563EB;
    border-radius:50%;
    border:2.5px solid #fff;
    box-shadow:0 0 0 5px rgba(37,99,235,.22),0 2px 6px rgba(0,0,0,.25);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

// ── FitBounds — re-fits the map whenever businesses or user location changes ─

interface FitBoundsProps {
  businesses: Business[];
  userLocation: [number, number] | null;
}

function FitBounds({ businesses, userLocation }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    const pts: [number, number][] = [];
    if (userLocation) pts.push(userLocation);
    businesses.forEach((b) => {
      if (b.location?.lat && b.location?.lng && (b.location.lat !== 0 || b.location.lng !== 0)) {
        pts.push([b.location.lat, b.location.lng]);
      }
    });
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], DEFAULT_ZOOM);
    } else {
      map.fitBounds(pts, { padding: [50, 50], maxZoom: 15 });
    }
  }, [businesses, userLocation, map]);

  return null;
}

// ── Stars ────────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: "13px", color: i <= filled ? "#F59E0B" : "#D1D5DB" }}>
          ★
        </span>
      ))}
      <span style={{ fontSize: "11px", color: "#6B7280", marginLeft: "3px" }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

// ── BusinessMap ──────────────────────────────────────────────────────────────

interface BusinessMapProps {
  businesses: Business[];
  userLocation: [number, number] | null;
}

const BusinessMap = ({ businesses, userLocation }: BusinessMapProps) => {
  const navigate = useNavigate();
  const initialCenter = userLocation ?? DEFAULT_CENTER;

  return (
    <MapContainer
      center={initialCenter}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <FitBounds businesses={businesses} userLocation={userLocation} />

      {/* User location */}
      {userLocation && (
        <Marker position={userLocation} icon={USER_ICON}>
          <Popup>
            <div style={{ fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap" }}>
              📍 You are here
            </div>
          </Popup>
        </Marker>
      )}

      {/* Business markers */}
      {businesses.map((business) => {
        const lat = business.location?.lat && business.location.lat !== 0 ? business.location.lat : null;
        const lng = business.location?.lng && business.location.lng !== 0 ? business.location.lng : null;
        if (lat === null || lng === null) return null;

        const cfg = CATEGORY_CONFIG[business.category] ?? CATEGORY_CONFIG.Others;

        return (
          <Marker
            key={business._id}
            position={[lat, lng]}
            icon={getBusinessIcon(business.category)}
          >
            <Popup minWidth={210}>
              <div style={{ fontFamily: "inherit", minWidth: "210px", lineHeight: 1.4 }}>
                {/* Cover image */}
                {business.coverImage && (
                  <img
                    src={business.coverImage}
                    alt={business.name}
                    style={{
                      width: "100%",
                      height: "90px",
                      objectFit: "cover",
                      borderRadius: "6px",
                      marginBottom: "8px",
                      display: "block",
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}

                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "15px" }}>{cfg.emoji}</span>
                  <strong style={{ fontSize: "14px" }}>{business.name}</strong>
                </div>

                {/* Category badge */}
                <span style={{
                  display: "inline-block",
                  fontSize: "11px",
                  background: cfg.color + "22",
                  color: cfg.color,
                  padding: "1px 7px",
                  borderRadius: "999px",
                  border: `1px solid ${cfg.color}44`,
                  marginBottom: "6px",
                }}>
                  {business.category}
                </span>

                {/* Rating */}
                <div style={{ marginBottom: "4px" }}>
                  <Stars rating={business.rating} />
                  <span style={{ fontSize: "11px", color: "#6B7280", marginLeft: "3px" }}>
                    ({business.reviewCount} reviews)
                  </span>
                </div>

                {/* Distance */}
                {business.distance && (
                  <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "8px" }}>
                    🗺 {business.distance} away
                  </div>
                )}

                {/* View button */}
                <button
                  onClick={() => navigate(`/business/${business._id}`)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "7px 0",
                    background: "#2563EB",
                    color: "#fff",
                    border: "none",
                    borderRadius: "7px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  View Business →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default BusinessMap;
