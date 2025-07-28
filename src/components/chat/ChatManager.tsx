
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { apiService } from "@/services/api";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  sender_name?: string;
  created_at: string;
  is_read: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  email: string;
}

interface Conversation {
  user: ChatUser;
  lastMessage?: Message;
  unreadCount: number;
}

interface ChatManagerProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
  initialChatUser?: ChatUser;
  onClose?: () => void;
}

const ChatManager = ({ currentUser, initialChatUser, onClose }: ChatManagerProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(initialChatUser || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.id);
      // Mark messages as read when opening a chat
      markConversationAsRead(selectedUser.id);
    }
  }, [selectedUser]);

  const loadConversations = async () => {
    try {
      setConversationsLoading(true);
      // Get all approved users to build conversation list
      const users = await apiService.getApprovedUsers();
      
      // Filter out current user and build conversations
      const otherUsers = users.filter(user => user.id !== currentUser.id);
      const conversationPromises = otherUsers.map(async (user) => {
        try {
          const messages = await apiService.getMessages(user.id);
          // Only include users who have sent messages to current user
          const messagesFromUser = messages.filter(msg => msg.sender_id === user.id);
          
          if (messagesFromUser.length === 0) {
            return null; // Don't include users who haven't sent any messages
          }
          
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
          const unreadCount = messages.filter(msg => 
            msg.sender_id === user.id && !msg.is_read
          ).length;
          
          return {
            user,
            lastMessage,
            unreadCount
          };
        } catch (error) {
          return null;
        }
      });

      const conversationsData = (await Promise.all(conversationPromises)).filter(Boolean);
      
      // Sort by last message time or alphabetically
      conversationsData.sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return a.user.name.localeCompare(b.user.name);
      });

      setConversations(conversationsData);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setConversationsLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      setLoading(true);
      const messagesData = await apiService.getMessages(userId);
      setMessages(messagesData);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markConversationAsRead = async (userId: string) => {
    try {
      // Mark all unread messages from this user as read
      const unreadMessages = messages.filter(msg => 
        msg.sender_id === userId && !msg.is_read
      );
      
      await Promise.all(
        unreadMessages.map(msg => apiService.markMessageAsRead(msg.id))
      );

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.sender_id === userId ? { ...msg, is_read: true } : msg
        )
      );

      // Update conversations unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.user.id === userId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      await apiService.sendMessage(selectedUser.id, newMessage.trim());
      setNewMessage("");
      
      // Reload messages to get the new one
      await loadMessages(selectedUser.id);
      
      // Update conversation list with new last message
      await loadConversations();
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!selectedUser) {
    return (
      <Card className="h-[600px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Messages
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {conversationsLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading conversations...</p>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No conversations yet</p>
                <p className="text-sm text-gray-400">Start a conversation from the groups section</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.user.id}
                    className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedUser(conversation.user)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {conversation.user.name}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <div className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.user.email}
                        </p>
                        {conversation.lastMessage && (
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {conversation.lastMessage.sender_id === currentUser.id ? 'You: ' : ''}
                            {conversation.lastMessage.content}
                          </p>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-xs text-gray-400 flex-shrink-0">
                          {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { 
                            addSuffix: true 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedUser(null)}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
            <p className="text-sm text-gray-500">{selectedUser.email}</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col h-[520px]">
        <ScrollArea className="flex-1 px-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No messages yet</p>
                <p className="text-xs text-gray-400">Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      message.sender_id === currentUser.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender_id === currentUser.id
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatManager;