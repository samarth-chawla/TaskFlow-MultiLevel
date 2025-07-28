
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Check, Clock, Shield, Mail, UserCheck, UserX } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}

interface AdminPanelProps {
  users: User[];
  onUserApproval: (userId: string, status: 'approved' | 'rejected') => void;
  loading?: boolean;
}

const AdminPanel = ({ users, onUserApproval, loading = false }: AdminPanelProps) => {
  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-600">Manage user approvals and oversee the system</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
            <Clock className="w-4 h-4" />
            {pendingUsers.length} Pending
          </Badge>
          <Badge variant="default" className="flex items-center gap-2 px-3 py-1 bg-green-600">
            <UserCheck className="w-4 h-4" />
            {approvedUsers.length} Approved
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-yellow-400 bg-yellow-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending Approval</p>
                <p className="text-3xl font-bold text-yellow-700">{pendingUsers.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-400 bg-green-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Approved Users</p>
                <p className="text-3xl font-bold text-green-700">{approvedUsers.length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-400 bg-red-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Rejected Users</p>
                <p className="text-3xl font-bold text-red-700">{rejectedUsers.length}</p>
              </div>
              <UserX className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 ? (
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              Pending User Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-6 border-2 border-dashed border-yellow-200 rounded-xl bg-yellow-50/30 hover:bg-yellow-50/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{user.name}</h3>
                      <div className="flex items-center text-gray-600 mt-1">
                        <Mail className="w-4 h-4 mr-2" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {user.role}
                      </Badge>
                      {user.created_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Registered: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      onClick={() => onUserApproval(user.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onUserApproval(user.id, 'rejected')}
                      className="px-4 py-2"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-0 bg-white">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No pending user approvals at the moment.</p>
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            All Users ({users.filter(u => u.status !== 'pending').length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {users.filter(u => u.status !== 'pending').length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No approved or rejected users yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.filter(u => u.status !== 'pending').map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.status === 'approved' 
                        ? 'bg-gradient-to-r from-green-400 to-green-500' 
                        : 'bg-gradient-to-r from-red-400 to-red-500'
                    }`}>
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{user.name}</h3>
                      <div className="flex items-center text-gray-600 text-sm mt-1">
                        <Mail className="w-3 h-3 mr-1" />
                        {user.email}
                      </div>
                      {user.created_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {user.role}
                    </Badge>
                    <Badge 
                      variant={user.status === 'approved' ? 'default' : 'destructive'}
                      className={user.status === 'approved' ? 'bg-green-600' : ''}
                    >
                      {user.status === 'approved' ? <Check className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                      {user.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
