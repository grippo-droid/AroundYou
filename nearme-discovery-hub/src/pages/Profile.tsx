import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api_client";
import { getUserBusinesses } from "@/services/api";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Briefcase, UserPlus, UserMinus, Settings, Store, Bookmark, Loader2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import BusinessCard from "@/components/BusinessCard";
import type { Post } from "@/types";

const SAVED_POSTS_KEY = "nearme_saved_posts";
const readSavedPosts = (): Post[] => {
  try { return Object.values(JSON.parse(localStorage.getItem(SAVED_POSTS_KEY) || "{}")); }
  catch { return []; }
};

interface UserProfile {
    _id: string;
    name: string;
    role: string;
    created_at: string;
    followers_count: number;
    following_count: number;
    businesses_count: number;
    following: string[]; // List of IDs the user follows
}

interface Business {
    _id: string;
    name: string;
    category: string;
    location: {
        city?: string;
    };
    images: string[];
}

const Profile = () => {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const { bookmarkedList } = useBookmarks();
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);

    // Load saved posts from localStorage on mount
    useEffect(() => { if (isOwnProfile) setSavedPosts(readSavedPosts()); }, []);

    // Determine if viewing own profile
    const isOwnProfile = !id || (currentUser && currentUser._id === id);
    const profileId = id || currentUser?._id;

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!profileId) return;
            setLoading(true);
            try {
                // Fetch profile
                const { data: profileData } = await apiClient.get(`/users/${profileId}`);
                setProfile(profileData.data);

                // Fetch businesses if business owner
                if (profileData.data.role === 'business') {
                    const mapped = await getUserBusinesses(profileId);
                    setBusinesses(mapped);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
                toast.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [profileId, isOwnProfile]);

    const handleFollowToggle = async () => {
        if (!currentUser || !profile) return;
        setFollowLoading(true);
        try {
            // Check current follow status from user context
            const currentlyFollowing = currentUser.following?.includes(profile._id);

            if (currentlyFollowing) {
                await apiClient.delete(`/users/${profile._id}/follow`);
                toast.success("Unfollowed user");
            } else {
                await apiClient.post(`/users/${profile._id}/follow`);
                toast.success("Followed user");
            }
            // Refresh window or re-fetch profile to update counts
            window.location.reload();
        } catch (error) {
            console.error("Follow action failed:", error);
            toast.error("Action failed");
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!profile) return <div className="flex h-screen items-center justify-center">User not found</div>;

    const isFollowing = currentUser?.following?.includes(profile._id);

    return (
        <div className="container py-8 max-w-4xl">
            {/* Header Card */}
            <Card className="mb-8">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`} />
                            <AvatarFallback>{profile.name[0]}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 text-center md:text-left space-y-2">
                            <div className="flex flex-col md:flex-row items-center gap-2">
                                <h1 className="text-3xl font-bold">{profile.name}</h1>
                                <Badge variant={profile.role === 'business' ? 'default' : 'secondary'} className="uppercase text-xs">
                                    {profile.role}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                                </div>
                            </div>

                            <div className="flex justify-center md:justify-start gap-6 pt-2">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{profile.followers_count}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Followers</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{profile.following_count}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Following</div>
                                </div>
                                {profile.role === 'business' && (
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{profile.businesses_count}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Businesses</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {isOwnProfile ? (
                                <Button variant="outline" onClick={() => navigate('/settings')}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Edit Profile
                                </Button>
                            ) : (
                                <Button
                                    variant={isFollowing ? "outline" : "default"}
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                >
                                    {isFollowing ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                    {isFollowing ? "Unfollow" : "Follow"}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs for content section */}
            <Tabs defaultValue={profile.role === 'business' ? "owned" : "saved"} className="w-full">
                <TabsList className="mb-6">
                    {profile.role === 'business' && (
                        <TabsTrigger value="owned" className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            Owned Businesses
                        </TabsTrigger>
                    )}
                    {isOwnProfile && (
                        <TabsTrigger value="saved" className="flex items-center gap-2">
                            <Bookmark className="h-4 w-4" />
                            Saved Businesses
                        </TabsTrigger>
                    )}
                    {isOwnProfile && (
                        <TabsTrigger value="saved-posts" className="flex items-center gap-2">
                            <ImageOff className="h-4 w-4" />
                            Saved Posts
                            {savedPosts.length > 0 && (
                                <span className="ml-0.5 rounded-full bg-primary/15 text-primary px-1.5 text-[10px] font-semibold">
                                    {savedPosts.length}
                                </span>
                            )}
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Owned Businesses Content */}
                {profile.role === 'business' && (
                    <TabsContent value="owned">
                        {businesses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {businesses.map((business) => (
                                    <BusinessCard key={business._id} business={business} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No businesses listed yet.</p>
                            </div>
                        )}
                    </TabsContent>
                )}

                {/* Saved Businesses Content */}
                {isOwnProfile && (
                    <TabsContent value="saved">
                        {bookmarkedList.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {bookmarkedList.map((business) => (
                                    <BusinessCard key={business._id} business={business} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No saved businesses yet.</p>
                                <Button variant="link" onClick={() => navigate('/explore')} className="mt-2 text-primary">
                                    Explore and save some!
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                )}

                {/* Saved Posts Content */}
                {isOwnProfile && (
                    <TabsContent value="saved-posts">
                        {savedPosts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {savedPosts.map((post) => (
                                    <Link
                                        key={post.id}
                                        to={`/business/${post.businessId}`}
                                        className="group rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        {post.image ? (
                                            <div className="aspect-square overflow-hidden bg-muted">
                                                <img
                                                    src={post.image}
                                                    alt={post.caption}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    loading="lazy"
                                                />
                                            </div>
                                        ) : (
                                            <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground">
                                                <ImageOff className="h-8 w-8 opacity-30" />
                                            </div>
                                        )}
                                        <div className="p-3">
                                            <p className="text-xs font-semibold text-primary truncate">{post.businessName}</p>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{post.caption}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{post.createdAt}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No saved posts yet.</p>
                                <Button variant="link" onClick={() => navigate('/feed')} className="mt-2 text-primary">
                                    Browse the feed and save some!
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

export default Profile;
