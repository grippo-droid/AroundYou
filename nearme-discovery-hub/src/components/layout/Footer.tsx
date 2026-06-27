import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t bg-card mt-auto">
    <div className="container py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
              N
            </div>
            <span className="font-display text-lg font-bold">NearMe</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Discover & support local businesses around you.
          </p>
        </div>

        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/explore" className="hover:text-foreground transition-colors">All Businesses</Link></li>
            <li><Link to="/jobs" className="hover:text-foreground transition-colors">Job Board</Link></li>
            <li><Link to="/explore?category=Cafe" className="hover:text-foreground transition-colors">Cafes</Link></li>
            <li><Link to="/explore?category=Restaurant" className="hover:text-foreground transition-colors">Restaurants</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">For Business</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Add Your Business</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Business Dashboard</Link></li>
            <li><span className="cursor-default">Advertise</span></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="cursor-default">About</span></li>
            <li><span className="cursor-default">Privacy Policy</span></li>
            <li><span className="cursor-default">Terms of Service</span></li>
            <li><span className="cursor-default">Contact</span></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NearMe. Built for portfolio showcase.
      </div>
    </div>
  </footer>
);

export default Footer;
