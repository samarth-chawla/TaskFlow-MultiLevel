
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Calendar, ChevronRight, ChevronDown, LogOut, Shield, Users, MessageCircle } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import RegistrationForm from "@/components/auth/RegistrationForm";
import AdminPanel from "@/components/admin/AdminPanel";
import TaskManager from "@/components/tasks/TaskManager";
import GroupManager from "@/components/groups/GroupManager";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import ChatManager from "@/components/chat/ChatManager";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCurrentUser, setUsers, setLoading, clearUserData } from "@/store/slices/userSlice";

// Data structures
interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  createdBy: string;
  createdByName: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string;
  parentTaskId?: string;
  subtasks: Task[];
  createdAt: string;
}

const Index = () => {
  const dispatch = useAppDispatch();
  const { currentUser, users, loading } = useAppSelector((state) => state.user);
  const [showRegistration, setShowRegistration] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'groups' | 'chat'>('tasks');
  const [selectedChatUser, setSelectedChatUser] = useState<{id: string; name: string; email: string} | null>(null);
  
  const { toast } = useToast();

  // Load data from backend
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && !currentUser) {
      // Auto-login if token exists - we need to decode the token to get user info
      // For now, we'll let the user login again
      loadUserDataAfterLogin();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserDataAfterLogin = async () => {
    // This is called when we have a token but no user info
    // Decode the JWT token to get user info
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      // Simple JWT decode (for demo - in production use a proper JWT library)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userData = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name || payload.email.split('@')[0],
        status: 'approved' as const // Users with valid tokens are approved
      };
      
      dispatch(setCurrentUser(userData));
      await loadTasks();
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Token might be invalid, clear it
      localStorage.removeItem('authToken');
    }
  };

  const loadUserData = async () => {
    if (!currentUser) return;
    
    try {
      dispatch(setLoading(true));
      
      // Load tasks for all users
      await loadTasks();
      
      // Load users for all logged-in users (needed for task assignment)
      await loadUsers();
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data from server",
        variant: "destructive",
      });
    } finally {
      dispatch(setLoading(false));
    }
  };

  const loadUsers = async () => {
    if (!currentUser) return;
    
    try {
      if (currentUser.role === 'admin') {
        setAdminLoading(true);
      }
      console.log('Loading users...');
      
      // Use different endpoints based on user role
      const usersData = currentUser.role === 'admin' 
        ? await apiService.getUsers() 
        : await apiService.getApprovedUsers();
      
      console.log('Users loaded:', usersData);
      dispatch(setUsers(usersData));
    } catch (error) {
      console.error('Error loading users:', error);
      // Only show error toast for admin users since they need users for admin panel
      if (currentUser.role === 'admin') {
        toast({
          title: "Error",
          description: "Failed to load users data",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load approved users for task assignment",
          variant: "destructive",
        });
      }
    } finally {
      if (currentUser.role === 'admin') {
        setAdminLoading(false);
      }
    }
  };

  const loadTasks = async () => {
    try {
      console.log('Loading tasks...');
      const tasksData = await apiService.getTasks();
      console.log('Tasks loaded:', tasksData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks data",
        variant: "destructive",
      });
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      dispatch(setLoading(true));
      console.log('Attempting login for:', email);
      const result = await apiService.login({ email, password });
      console.log('Login successful:', result);
      
      dispatch(setCurrentUser(result.user));
      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.name}!`,
      });
      
      // Data will be loaded by useEffect when currentUser changes
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleRegister = async (userData: any) => {
    try {
      dispatch(setLoading(true));
      console.log('Attempting registration for:', userData.email);
      await apiService.register(userData);
      toast({
        title: "Registration Successful",
        description: "Your account is pending admin approval. You'll be notified once approved.",
      });
      setShowRegistration(false);
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Registration failed",
        variant: "destructive",
      });
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleLogout = () => {
    console.log('Logging out user');
    apiService.logout();
    dispatch(clearUserData());
    setTasks([]);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      console.log('Updating task status:', taskId, newStatus);
      await apiService.updateTaskStatus(taskId, newStatus);
      await loadTasks(); // Reload tasks to get updated data
      toast({
        title: "Task Updated",
        description: "Task status updated successfully",
      });
    } catch (error) {
      console.error('Task update error:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const addTask = async (newTask: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      console.log('Creating new task:', newTask);
      await apiService.createTask({
        title: newTask.title,
        description: newTask.description,
        assigneeId: newTask.assigneeId,
        dueDate: newTask.dueDate,
        parentTaskId: newTask.parentTaskId
      });
      
      await loadTasks(); // Reload tasks to get updated data
      toast({
        title: "Task Created",
        description: "Task has been created successfully",
      });
    } catch (error) {
      console.error('Task creation error:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const handleUserApproval = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      console.log('Updating user status:', userId, status);
      await apiService.updateUserStatus(userId, status);
      await loadUsers(); // Reload users to get updated data
      toast({
        title: status === 'approved' ? "User Approved" : "User Rejected",
        description: `User account has been ${status}.`,
      });
    } catch (error) {
      console.error('User approval error:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleOpenChat = (userId: string, userName: string, userEmail: string) => {
    setSelectedChatUser({ id: userId, name: userName, email: userEmail });
    setActiveTab('chat');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
              TaskFlow
            </h1>
            <p className="text-gray-600 text-lg">Multi-Level Task Management System</p>
          </div>
          
          {!showRegistration ? (
            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-semibold text-gray-800">Welcome Back</CardTitle>
                <p className="text-gray-600 text-sm">Sign in to manage your tasks</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <LoginForm onLogin={handleLogin} />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">New to TaskFlow?</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowRegistration(true)}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Create Account"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-semibold text-gray-800">Create Account</CardTitle>
                <p className="text-gray-600 text-sm">Join TaskFlow to start managing tasks</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <RegistrationForm onRegister={handleRegister} />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Already have an account?</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowRegistration(false)}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Back to Sign In"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left section - Logo and title */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  TaskFlow
                </h1>
              </div>
              <Badge 
                variant={currentUser.role === 'admin' ? 'default' : 'secondary'} 
                className={`hidden sm:flex ${
                  currentUser.role === 'admin' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {currentUser.role === 'admin' ? (
                  <>
                    <Shield className="w-3 h-3 mr-1" />
                    Administrator
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 mr-1" />
                    User
                  </>
                )}
              </Badge>
            </div>
            {/* Right section - User info and logout */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <NotificationCenter currentUser={currentUser} onOpenChat={handleOpenChat} />
              {/* User info - responsive */}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">Welcome back,</p>
                <p className="text-sm text-gray-600 truncate max-w-[120px]">{currentUser.name}</p>
              </div>
              {/* Mobile user indicator */}
              <div className="sm:hidden">
                <Badge variant="outline" className="px-2 py-1">
                  <User className="w-3 h-3 mr-1" />
                  <span className="truncate max-w-[60px]">{currentUser.name}</span>
                </Badge>
              </div>
              {/* Logout button - responsive */}
              <Button 
                variant="outline" 
                onClick={handleLogout}
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-2 sm:px-4"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            {currentUser.role !== 'admin' && (
            <div className="flex items-center space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm border">
              <Button
                variant={activeTab === 'tasks' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('tasks')}
                className="flex-1"
              >
                Tasks
              </Button>
              <Button
                variant={activeTab === 'groups' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('groups')}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Groups
              </Button>
              <Button
                variant={activeTab === 'chat' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('chat')}
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>
            </div>)}

            {activeTab === 'tasks' ? (
              <>
                {currentUser.role === 'admin' ? (
                  <div className="space-y-8">
                    <AdminPanel 
                      users={users} 
                      onUserApproval={handleUserApproval}
                      loading={adminLoading}
                    />
                    {/* <TaskManager 
                      tasks={tasks} 
                      users={users}
                      currentUser={currentUser}
                      onTaskStatusUpdate={updateTaskStatus}
                      onTaskAdd={addTask}
                    /> */}
                  </div>
                ) : (
                  <TaskManager 
                    tasks={tasks} 
                    users={users}
                    currentUser={currentUser}
                    onTaskStatusUpdate={updateTaskStatus}
                    onTaskAdd={addTask}
                  />
                )}
              </>
            ) : activeTab === 'groups' ? (
              <GroupManager currentUser={currentUser} onOpenChat={handleOpenChat} />
            ) : (
              <ChatManager 
                currentUser={currentUser} 
                initialChatUser={selectedChatUser}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
export default Index;