import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, Users, Globe, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { getFeedPosts, addComment } from "@/services/api";
import type { ApiComment } from "@/services/api";
import { posts as mockPosts } from "@/services/mockData";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Post, Comment } from "@/types";

type FeedMode = "all" | "following";

const Feed = () => {
  const { user, followingIds } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedMode, setFeedMode] = useState<FeedMode>("all");
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await getFeedPosts(feedMode === "following");
      if (feedMode === "all") {
        setPosts(fetched.length > 0 ? fetched : mockPosts);
      } else {
        setPosts(fetched);
      }
    } catch {
      setPosts(feedMode === "all" ? mockPosts : []);
    } finally {
      setLoading(false);
    }
  }, [feedMode]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Sync liked state once posts load
  useEffect(() => {
    if (posts.length > 0) {
      setLiked(Object.fromEntries(posts.map((p) => [p.id, p.isLiked])));
    }
  }, [posts]);

  // ── per-post comment state ────────────────────────────────────────────────
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  // local comment lists (merged with data from server)
  const [localComments, setLocalComments] = useState<Record<string, Comment[]>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleComments = (postId: string, baseComments: Comment[]) => {
    setOpenComments((prev) => {
      const next = { ...prev, [postId]: !prev[postId] };
      if (next[postId]) {
        // seed local comments from post data on first open
        setLocalComments((lc) => lc[postId] ? lc : { ...lc, [postId]: baseComments });
        setTimeout(() => inputRefs.current[postId]?.focus(), 50);
      }
      return next;
    });
  };

  const handleAddComment = async (postId: string) => {
    const text = (commentText[postId] ?? "").trim();
    if (!text) return;
    if (!user) { toast.error("Please log in to comment"); return; }

    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    try {
      const newComment = await addComment(postId, text);
      const mapped: Comment = {
        id: newComment.id,
        userId: newComment.user_id,
        userName: newComment.user_name,
        userAvatar: "",
        text: newComment.text,
        createdAt: new Date(newComment.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      };
      setLocalComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), mapped],
      }));
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const toggleLike = (id: string) =>
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));

  const displayLikes = (post: Post) => {
    const nowLiked = liked[post.id] ?? post.isLiked;
    if (nowLiked === post.isLiked) return post.likes;
    return post.likes + (nowLiked ? 1 : -1);
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-10 space-y-6 px-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
            <div className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-32 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </div>
            <div className="aspect-[4/3] bg-muted" />
            <div className="p-4 space-y-2">
              <div className="h-3.5 w-full bg-muted rounded" />
              <div className="h-3.5 w-3/4 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const showFollowingEmpty = feedMode === "following" && posts.length === 0;
  const showAllEmpty = feedMode === "all" && posts.length === 0;

  return (
    <main className="container py-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header + toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Feed</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {feedMode === "following"
                ? "Posts from businesses you follow"
                : "Latest from all businesses"}
            </p>
          </div>

          {user && (
            <div className="flex rounded-lg border p-0.5 gap-0.5">
              <Button
                variant={feedMode === "all" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs gap-1.5"
                onClick={() => setFeedMode("all")}
              >
                <Globe className="h-3.5 w-3.5" />
                All
              </Button>
              <Button
                variant={feedMode === "following" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs gap-1.5"
                onClick={() => setFeedMode("following")}
              >
                <Users className="h-3.5 w-3.5" />
                Following
                {followingIds.size > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary/20 text-primary px-1.5 text-[10px] font-semibold">
                    {followingIds.size}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Empty states */}
        {showFollowingEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground px-4">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-semibold text-lg text-foreground">No posts yet</p>
            <p className="text-sm mt-1 max-w-xs">
              Follow businesses to see their latest updates here.
            </p>
            <Button asChild className="mt-6" onClick={() => setFeedMode("all")}>
              <Link to="/explore">Explore Businesses</Link>
            </Button>
          </div>
        )}

        {showAllEmpty && (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground px-4">
            <p className="text-4xl mb-4">📰</p>
            <p className="font-semibold text-lg text-foreground">Nothing to see here yet</p>
            <p className="text-sm mt-1 max-w-xs">
              Businesses haven't posted anything yet. Check back later.
            </p>
          </div>
        )}

        {/* Post list */}
        {posts.map((post) => {
          const isLiked = liked[post.id] ?? post.isLiked;
          const isPostFollowed = followingIds.has(post.businessId);
          return (
            <article key={post.id} className="rounded-xl border bg-card overflow-hidden shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <Link
                  to={`/business/${post.businessId}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.businessAvatar} alt={post.businessName} />
                    <AvatarFallback>{post.businessName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{post.businessName}</p>
                    <p className="text-xs text-muted-foreground">{post.createdAt}</p>
                  </div>
                </Link>
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" asChild>
                  <Link to={`/business/${post.businessId}`}>
                    {isPostFollowed ? "Following" : "Follow"}
                  </Link>
                </Button>
              </div>

              {/* Image */}
              {post.image && (
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={post.image}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Actions */}
              {(() => {
                const comments = localComments[post.id] ?? post.comments;
                const isOpen = !!openComments[post.id];
                const isSubmitting = !!commentSubmitting[post.id];
                return (
                  <>
                    <div className="px-4 pt-3 pb-1 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1.5 px-2 ${isLiked ? "text-red-500 hover:text-red-600" : ""}`}
                        onClick={() => toggleLike(post.id)}
                      >
                        <Heart className={`h-5 w-5 transition-all ${isLiked ? "fill-current scale-110" : ""}`} />
                        <span className="text-sm font-medium">{displayLikes(post)}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1.5 px-2 ${isOpen ? "text-primary" : "text-muted-foreground"}`}
                        onClick={() => toggleComments(post.id, post.comments)}
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm">{comments.length}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Bookmark className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Caption */}
                    <div className="px-4 pb-2">
                      <p className="text-sm leading-relaxed">
                        <Link
                          to={`/business/${post.businessId}`}
                          className="font-semibold mr-1.5 hover:underline"
                        >
                          {post.businessName}
                        </Link>
                        {post.caption}
                      </p>
                    </div>

                    {/* Comments section — expands when open */}
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t pt-3">
                        {/* Existing comments */}
                        {comments.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {comments.map((c) => (
                              <div key={c.id} className="flex gap-2">
                                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                                  <AvatarImage src={c.userAvatar} />
                                  <AvatarFallback className="text-[10px]">{c.userName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold mr-1.5">{c.userName}</span>
                                  <span className="text-xs text-muted-foreground">{c.text}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
                        )}

                        {/* Add comment input */}
                        <div className="flex gap-2">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-[10px]">{user?.name?.[0] ?? "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-1 gap-1.5">
                            <Input
                              ref={(el) => { inputRefs.current[post.id] = el; }}
                              placeholder={user ? "Add a comment…" : "Log in to comment"}
                              value={commentText[post.id] ?? ""}
                              onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(post.id); } }}
                              disabled={!user || isSubmitting}
                              className="h-8 text-sm"
                            />
                            <Button
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              disabled={!user || isSubmitting || !(commentText[post.id] ?? "").trim()}
                              onClick={() => handleAddComment(post.id)}
                            >
                              {isSubmitting
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Send className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Collapsed comment preview (when closed and comments exist) */}
                    {!isOpen && comments.length > 0 && (
                      <div className="px-4 pb-3 space-y-1">
                        {comments.slice(0, 2).map((c) => (
                          <p key={c.id} className="text-sm text-muted-foreground line-clamp-1">
                            <span className="font-medium text-foreground">{c.userName}</span>{" "}
                            {c.text}
                          </p>
                        ))}
                        {comments.length > 2 && (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => toggleComments(post.id, post.comments)}
                          >
                            View all {comments.length} comments
                          </button>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </article>
          );
        })}
      </div>
    </main>
  );
};

export default Feed;
