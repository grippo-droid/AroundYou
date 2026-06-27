import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories } from "@/services/mockData";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-background py-24 md:py-36">
        {/* Mesh gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/70 via-background to-accent/15 pointer-events-none" />

        {/* Ambient glow blobs */}
        <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-primary/12 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full bg-orange-400/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-primary/6 blur-[100px] pointer-events-none" />

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="max-w-2xl mx-auto text-center"
          >
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-1.5 text-sm font-medium text-primary mb-7 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Hyper-local discovery
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
              Discover new & nearby{" "}
              <span className="gradient-text">businesses</span>{" "}
              around you
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
              Find cafes, salons, clinics, and more — verified and just around the corner.
            </p>

            {/* Search bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (search.trim()) navigate(`/explore?search=${encodeURIComponent(search)}`);
              }}
              className="flex gap-2 max-w-lg mx-auto"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cafes, salons, medicals near you"
                  className="pl-10 h-12 bg-card border shadow-md text-base rounded-xl focus-visible:ring-primary/40"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6 rounded-xl shadow-md glow-sm">
                Search
              </Button>
            </form>

            <div className="flex items-center justify-center gap-1.5 mt-5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Showing results for <strong className="text-foreground">Bangalore</strong></span>
            </div>
          </motion.div>

          {/* Floating stat pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-12"
          >
            {[
              { label: "Businesses listed", value: "2,400+" },
              { label: "Cities covered", value: "12" },
              { label: "Verified listings", value: "890+" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2.5 rounded-full border border-border bg-card/80 backdrop-blur px-4 py-2 text-sm shadow-sm"
              >
                <span className="font-display font-bold text-primary">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <h2 className="font-display text-2xl font-bold text-center mb-2">Browse by Category</h2>
            <p className="text-center text-muted-foreground mb-10">Find exactly what you need</p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3 max-w-3xl mx-auto">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  to={`/explore?category=${cat.name}`}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border bg-card hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/35 transition-all duration-200 group"
                >
                  <span className="text-3xl transition-transform duration-200 group-hover:scale-110">{cat.icon}</span>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 via-background to-accent/10 pointer-events-none" />
        <div className="absolute -top-32 right-0 w-80 h-80 rounded-full bg-primary/8 blur-[80px] pointer-events-none" />

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="max-w-xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 mb-5">
              For business owners
            </div>
            <h2 className="font-display text-3xl font-bold mb-3">Own a local business?</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              List your business on NearMe and reach thousands of customers in your neighbourhood — free to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="shadow-md glow-sm" asChild>
                <Link to="/explore">
                  Explore Nearby <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary/30 hover:bg-secondary" asChild>
                <Link to="/dashboard">Add Your Business</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default Index;
