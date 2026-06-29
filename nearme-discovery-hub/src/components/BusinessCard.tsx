import { Link } from "react-router-dom";
import { MapPin, BadgeCheck, Clock, Bookmark, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBookmarks } from "@/hooks/useBookmarks";
import type { Business } from "@/types";

interface BusinessCardProps {
  business: Business;
}

const BusinessCard = ({ business }: BusinessCardProps) => {
  const { isBookmarked, toggle } = useBookmarks();
  const bookmarked = isBookmarked(business._id);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    toggle(business);
    toast.success(bookmarked ? "Removed from saved" : "Saved!");
  };

  return (
    <Link
      to={`/business/${business._id}`}
      className="group block rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 relative"
    >
      {/* Cover image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={business.coverImage}
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Bottom gradient for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

        {/* Top-left: open/closed + pending badge */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge
            variant={business.isOpen ? "default" : "secondary"}
            className="text-xs shadow-sm"
          >
            <Clock className="h-3 w-3 mr-1" />
            {business.isOpen ? "Open" : "Closed"}
          </Badge>
          {!business.isVerified && business.verificationStatus === "pending" && (
            <Badge className="bg-amber-500/90 text-white text-xs shadow-md">
              Pending
            </Badge>
          )}
        </div>

        {/* Top-right: verified + bookmark */}
        <div className="absolute top-3 right-3 flex gap-2 items-center">
          {business.isVerified && (
            <Badge className="bg-primary/90 text-primary-foreground text-xs shadow-md">
              <BadgeCheck className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-md shadow-md hover:bg-white dark:bg-black/50 dark:hover:bg-black/70"
            onClick={handleBookmark}
          >
            <Bookmark
              className={`h-4 w-4 transition-colors ${bookmarked ? "fill-primary text-primary" : "text-foreground"}`}
            />
          </Button>
        </div>

        {/* Bottom-left: distance pill overlaid on image */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white">
            <MapPin className="h-2.5 w-2.5" />
            {business.distance}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-semibold text-base leading-tight group-hover:text-primary transition-colors flex items-center gap-1">
            {business.name}
            {business.isVerified && (
              <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
            )}
          </h3>
          <Badge variant="outline" className="text-xs font-normal shrink-0">
            {business.category}
          </Badge>
        </div>

        <div className="flex items-center gap-1 mb-3 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{business.city}</span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {business.description}
        </p>

        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground border-t border-border/60 pt-3">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {business.rating}
          </span>
          <span>{business.reviewCount} reviews</span>
          <span className="ml-auto">{business.followers} followers</span>
        </div>
      </div>
    </Link>
  );
};

export default BusinessCard;
