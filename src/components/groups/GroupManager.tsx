
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Crown, User, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api";
import ChatInterface from "./ChatInterface";

interface TaskGroup {
  id: string;
  task_id: string;
  task_title: string;
  task_description: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  member_count: number;
}

interface GroupMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  is_current_user: boolean;
}

interface GroupManagerProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onOpenChat?: (userId: string, userName: string, userEmail: string) => void;
}

const GroupManager = ({ currentUser, onOpenChat }: GroupManagerProps) => {
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TaskGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<GroupMember | null>(null);
  const [clickedMemberId, setClickedMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load task groups from backend
  useEffect(() => {
    loadTaskGroups();
  }, []);

  const loadTaskGroups = async () => {
    setLoading(true);
    try {
      const groups = await apiService.getTaskGroups();
      setTaskGroups(groups);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load task groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      const members = await apiService.getTaskGroupMembers(groupId);
      // Remove duplicates based on user_id
      const uniqueMembers = members.filter((member: GroupMember, index: number, self: GroupMember[]) => 
        index === self.findIndex((m) => m.user_id === member.user_id)
      );
      setGroupMembers(uniqueMembers);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load group members",
        variant: "destructive",
      });
    }
  };

  const handleGroupSelect = (group: TaskGroup) => {
    setSelectedGroup(group);
    setSelectedChatUser(null);
    setClickedMemberId(null);
    loadGroupMembers(group.id);
  };

  const handleMemberClick = (member: GroupMember) => {
    if (member.is_current_user) {
      return;
    }
    setClickedMemberId(member.id);
  };

  const handleChatWithUser = (member: GroupMember) => {
    if (member.user_id === currentUser.id) {
      toast({
        title: "Info",
        description: "You cannot chat with yourself",
        variant: "default",
      });
      return;
    }
    
    if (onOpenChat) {
      // Navigate to chat tab with this user
      onOpenChat(member.user_id, member.user_name, member.user_email);
    } else {
      // Fallback to local chat interface
      setSelectedChatUser(member);
    }
    setClickedMemberId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Task Groups</h2>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {taskGroups.length}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Task Groups List */}
        <div className="space-y-4">
          {taskGroups.map((group) => (
            <Card 
              key={group.id} 
              className={`transition-all hover:shadow-md ${
                selectedGroup?.id === group.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  {group.task_title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Group for task: {group.task_title}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Created by {group.created_by_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(group.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-xs">
                    {`${Number(group.member_count)+1}`} members
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGroupSelect(group)}
                    className="text-xs"
                  >
                    {selectedGroup?.id === group.id ? 'Selected' : 'View Details'}
                  </Button>
                </div>
                
                {/* Show members directly in the group card when selected */}
                {selectedGroup?.id === group.id && groupMembers.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Members:</p>
                    <div className="flex flex-wrap gap-2">
                      {groupMembers.map((member) => (
                        <div key={member.id} className="relative">
                          <Badge
                            variant={member.is_current_user ? "default" : "secondary"}
                            className={`cursor-pointer transition-colors ${
                              !member.is_current_user ? 'hover:bg-blue-100' : ''
                            } ${
                              member.is_current_user ? 'bg-black text-white' : ''
                            }`}
                            onClick={() => !member.is_current_user && handleMemberClick(member)}
                          >
                            {member.user_name}
                            {member.is_current_user && " (You)"}
                          </Badge>
                          
                          {!member.is_current_user && clickedMemberId === member.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChatWithUser(member);
                              }}
                              className="absolute top-full left-0 mt-1 text-xs z-10 bg-white shadow-lg"
                            >
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Chat
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {taskGroups.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No task groups found</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Interface */}
        {/* <div>
          {selectedChatUser ? (
            <ChatInterface
              currentUser={currentUser}
              chatUser={selectedChatUser}
              onClose={() => setSelectedChatUser(null)}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Click on a member's name to see chat option</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div> */}
      </div>
    </div>
  );
};

export default GroupManager;