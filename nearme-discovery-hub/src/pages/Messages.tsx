import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api_client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Search, SquarePen, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Participant {
    id: string;
    type: string;
}

interface Conversation {
    _id: string;
    participants: Participant[];
    last_message: string;
    last_message_at: string;
}

interface Message {
    _id: string;
    conversation_id: string;
    sender_id: string;
    sender_type: string;
    content: string;
    created_at: string;
}

interface UserResult {
    _id: string;
    name: string;
    role: string;
}

// A pending chat is a user we want to message but haven't yet
interface PendingChat {
    userId: string;
    userName: string;
    userRole: string;
}

const Messages = () => {
    const { user, loading: authLoading } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [pendingChat, setPendingChat] = useState<PendingChat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // New message search panel
    const [showSearch, setShowSearch] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userSearchResults, setUserSearchResults] = useState<UserResult[]>([]);
    const [userSearchLoading, setUserSearchLoading] = useState(false);

    // Filter existing conversations
    const [chatSearch, setChatSearch] = useState("");

    // Cache of userId -> displayName
    const [userNameCache, setUserNameCache] = useState<Record<string, string>>({});

    // Fetch conversations once user is ready
    useEffect(() => {
        if (!user) return;
        fetchConversations();
    }, [user]);

    const fetchConversations = async () => {
        try {
            setLoadingConversations(true);
            const { data } = await apiClient.get("/messages/conversations");
            const convList: Conversation[] = Array.isArray(data) ? data : (data?.data || []);
            setConversations(convList);

            // Prefetch names for participants we don't know yet
            const ids = [...new Set(
                convList.flatMap(c => c.participants.map(p => p.id)).filter(id => id !== user?._id)
            )];
            if (ids.length) fetchUserNames(ids);

            return convList;
        } catch (err) {
            console.error("Failed to load conversations", err);
            return [];
        } finally {
            setLoadingConversations(false);
        }
    };

    const fetchUserNames = async (ids: string[]) => {
        const updates: Record<string, string> = {};
        await Promise.allSettled(
            ids.map(async id => {
                try {
                    const { data } = await apiClient.get(`/users/${id}`);
                    const u = data?.data || data;
                    updates[id] = u?.name || `User ${id.slice(-4)}`;
                } catch {
                    updates[id] = `User ${id.slice(-4)}`;
                }
            })
        );
        setUserNameCache(prev => ({ ...prev, ...updates }));
    };

    // Fetch messages when a real conversation is selected
    useEffect(() => {
        if (!selectedConversation) { setMessages([]); return; }
        const load = async () => {
            setLoadingMessages(true);
            try {
                const { data } = await apiClient.get(`/messages/${selectedConversation._id}`);
                const msgs: Message[] = Array.isArray(data) ? data : (data?.data || []);
                setMessages(msgs);
            } catch {
                toast.error("Failed to load messages");
            } finally {
                setLoadingMessages(false);
            }
        };
        load();
    }, [selectedConversation]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Debounced user search
    useEffect(() => {
        if (!userSearchQuery.trim()) { setUserSearchResults([]); return; }
        const timer = setTimeout(async () => {
            setUserSearchLoading(true);
            try {
                const { data } = await apiClient.get(`/users/search?query=${encodeURIComponent(userSearchQuery)}`);
                const results: UserResult[] = Array.isArray(data) ? data : (data?.data || []);
                setUserSearchResults(results.filter(u => u._id !== user?._id));
            } catch {
                setUserSearchResults([]);
            } finally {
                setUserSearchLoading(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [userSearchQuery]);

    // Called when clicking a user in the search results
    const openChatWith = (targetUser: UserResult) => {
        // Check if a conversation already exists with this user
        const existing = conversations.find(conv =>
            conv.participants.some(p => p.id === targetUser._id)
        );

        if (existing) {
            setSelectedConversation(existing);
        } else {
            // Open a pending (empty) chat — conversation created on first send
            setPendingChat({ userId: targetUser._id, userName: targetUser.name, userRole: targetUser.role });
            setSelectedConversation(null);
            setMessages([]);
        }

        setShowSearch(false);
        setUserSearchQuery("");
        setUserSearchResults([]);
    };

    // Send a message in an existing conversation
    const sendToConversation = async (convId: string, receiverId: string, receiverType: string, content: string) => {
        const { data } = await apiClient.post("/messages/send", {
            receiver_id: receiverId,
            receiver_type: receiverType,
            content
        });
        const newMsg: Message = data?.data || data;
        return newMsg;
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const text = inputText.trim();
        if (!text || sendingMessage || !user) return;

        setSendingMessage(true);
        setInputText("");

        try {
            if (pendingChat) {
                // First message to a new user — creates the conversation
                const receiverType = pendingChat.userRole === 'business' ? 'business' : 'user';
                const newMsg = await sendToConversation("", pendingChat.userId, receiverType, text);

                // Now fetch updated conversations and find the new one
                const convList = await fetchConversations();
                const newConv = convList.find(conv =>
                    conv.participants.some(p => p.id === pendingChat.userId)
                );

                // Cache pending user's name
                setUserNameCache(prev => ({ ...prev, [pendingChat.userId]: pendingChat.userName }));

                setPendingChat(null);
                if (newConv) {
                    setSelectedConversation(newConv);
                    setMessages([newMsg]);
                }
            } else if (selectedConversation) {
                // Send to existing conversation
                const receiver = selectedConversation.participants.find(p => p.id !== user._id);
                if (!receiver) return;

                const newMsg = await sendToConversation(selectedConversation._id, receiver.id, receiver.type, text);
                setMessages(prev => [...prev, newMsg]);

                // Update sidebar preview
                setConversations(prev =>
                    prev.map(c =>
                        c._id === selectedConversation._id
                            ? { ...c, last_message: text, last_message_at: new Date().toISOString() }
                            : c
                    ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
                );
            }
        } catch (err: any) {
            console.error("Failed to send message", err);
            const errMsg = err?.response?.data?.detail || "Failed to send message";
            toast.error(errMsg);
            setInputText(text); // restore on error
        } finally {
            setSendingMessage(false);
        }
    };

    const getParticipantName = (conv: Conversation): string => {
        const other = conv.participants.find(p => p.id !== user?._id);
        if (!other) return "Unknown";
        return userNameCache[other.id] || `…${other.id.slice(-4)}`;
    };

    const initials = (name: string) =>
        name.split(" ").map(n => n[0] || "").join("").toUpperCase().slice(0, 2) || "?";

    const filteredConversations = chatSearch.trim()
        ? conversations.filter(c => getParticipantName(c).toLowerCase().includes(chatSearch.toLowerCase()))
        : conversations;

    // What's currently active: a pending chat or a real conversation?
    const activeContact = pendingChat
        ? { name: pendingChat.userName, sub: pendingChat.userRole === 'business' ? 'Business Account' : 'Personal Account' }
        : selectedConversation
            ? { name: getParticipantName(selectedConversation), sub: selectedConversation.participants.find(p => p.id !== user?._id)?.type === 'business' ? 'Business Account' : 'Personal Account' }
            : null;

    const chatOpen = !!pendingChat || !!selectedConversation;

    if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!user) return <div className="flex h-screen items-center justify-center text-muted-foreground">Please login to view messages.</div>;

    return (
        <div className="container py-4 md:py-6 h-[calc(100vh-72px)]">
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] h-full rounded-xl border bg-card shadow-sm overflow-hidden">

                {/* ─── SIDEBAR ─── */}
                <div className={cn("border-r flex flex-col bg-muted/20", chatOpen ? "hidden md:flex" : "flex")}>
                    {/* Header */}
                    <div className="p-3 border-b space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-lg font-bold">Messages</h2>
                            <Button size="icon" variant="ghost" title="New Message" onClick={() => { setShowSearch(s => !s); setUserSearchQuery(""); setUserSearchResults([]); }}>
                                <SquarePen className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search conversations..." className="pl-8 h-9 bg-background" value={chatSearch} onChange={e => setChatSearch(e.target.value)} />
                        </div>
                    </div>

                    {/* New Message Search Panel */}
                    {showSearch && (
                        <div className="border-b p-3 bg-background/80 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold flex-1">New Message</span>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setShowSearch(false); setUserSearchQuery(""); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input autoFocus placeholder="Search people by name..." className="pl-8 h-9" value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} />
                            </div>
                            <div className="max-h-52 overflow-y-auto space-y-0.5">
                                {userSearchLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                                ) : userSearchResults.length > 0 ? (
                                    userSearchResults.map(u => (
                                        <button key={u._id} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left" onClick={() => openChatWith(u)}>
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(u.name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{u.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                                            </div>
                                        </button>
                                    ))
                                ) : userSearchQuery ? (
                                    <p className="text-center text-xs text-muted-foreground py-4">No users found</p>
                                ) : (
                                    <p className="text-center text-xs text-muted-foreground py-4">Type a name to search</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto">
                        {loadingConversations ? (
                            <div className="flex justify-center p-6"><Loader2 className="animate-spin text-muted-foreground" /></div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground text-sm gap-3">
                                {chatSearch ? "No chats match your search" : (
                                    <>
                                        <p>No conversations yet</p>
                                        <Button size="sm" variant="outline" onClick={() => setShowSearch(true)}>
                                            <SquarePen className="h-4 w-4 mr-2" />Start a conversation
                                        </Button>
                                    </>
                                )}
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const name = getParticipantName(conv);
                                const isSelected = selectedConversation?._id === conv._id && !pendingChat;
                                return (
                                    <button
                                        key={conv._id}
                                        onClick={() => { setSelectedConversation(conv); setPendingChat(null); }}
                                        className={cn("w-full flex items-center gap-3 p-3 border-b hover:bg-accent/40 transition-colors text-left", isSelected && "bg-accent")}
                                    >
                                        <Avatar className="h-11 w-11 shrink-0">
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{initials(name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline gap-1">
                                                <span className="font-semibold text-sm truncate">{name}</span>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {conv.last_message_at ? format(new Date(conv.last_message_at), 'HH:mm') : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message || "No messages yet"}</p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ─── CHAT AREA ─── */}
                <div className={cn("flex flex-col h-full bg-background", !chatOpen ? "hidden md:flex" : "flex")}>
                    {chatOpen && activeContact ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-3 border-b flex items-center gap-3 bg-muted/10 shrink-0">
                                <Button size="icon" variant="ghost" className="md:hidden h-9 w-9 shrink-0" onClick={() => { setSelectedConversation(null); setPendingChat(null); }}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <Avatar className="h-10 w-10 shrink-0">
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials(activeContact.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold text-sm">{activeContact.name}</h3>
                                    <p className="text-xs text-muted-foreground">{activeContact.sub}</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {pendingChat && messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-1">
                                        <Avatar className="h-16 w-16 mb-2">
                                            <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials(pendingChat.userName)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-semibold text-foreground text-base">{pendingChat.userName}</p>
                                        <p className="text-xs">Send a message to start the conversation</p>
                                    </div>
                                ) : loadingMessages ? (
                                    <div className="flex justify-center pt-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                                ) : messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                        Say hello to {activeContact.name}! 👋
                                    </div>
                                ) : (
                                    messages.map(msg => {
                                        const isMe = msg.sender_id === user._id;
                                        return (
                                            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={cn(
                                                    "max-w-[72%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                                    isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                                                )}>
                                                    <p className="leading-relaxed">{msg.content}</p>
                                                    <p className={cn("text-[10px] mt-1 text-right", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                                                        {format(new Date(msg.created_at), 'HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 border-t shrink-0">
                                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                    <Input
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        placeholder={`Message ${activeContact.name}...`}
                                        className="flex-1 rounded-full bg-muted border-0 focus-visible:ring-1"
                                        disabled={sendingMessage}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    />
                                    <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={!inputText.trim() || sendingMessage}>
                                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        /* Empty state */
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                                <Send className="h-9 w-9 text-muted-foreground/40" />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="font-semibold text-foreground">Your Messages</h3>
                                <p className="text-sm">Select a conversation or start a new one</p>
                            </div>
                            <Button variant="outline" onClick={() => setShowSearch(true)}>
                                <SquarePen className="h-4 w-4 mr-2" />New Message
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;
