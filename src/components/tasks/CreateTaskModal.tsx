
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
}

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

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  users: User[];
  currentUser: User;
  parentTaskId?: string;
  parentTask?: Task;
}

const CreateTaskModal = ({
  isOpen,
  onClose,
  onCreateTask,
  users,
  currentUser,
  parentTaskId,
  parentTask
}: CreateTaskModalProps) => {
  // Get current user from Redux store to ensure consistency
  const { currentUser: reduxCurrentUser, users: reduxUsers } = useAppSelector((state) => state.user);
  
  // Use Redux data as primary source, fallback to props for backward compatibility
  const activeCurrentUser = reduxCurrentUser || currentUser;
  const activeUsers = reduxUsers.length > 0 ? reduxUsers : users;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
  });

  // Debug users data with detailed logging
  useEffect(() => {
    console.log('CreateTaskModal - Redux current user:', reduxCurrentUser);
    console.log('CreateTaskModal - Redux users:', reduxUsers);
    console.log('CreateTaskModal - All users with IDs:', activeUsers.map(u => ({ id: u.id, name: u.name, type: typeof u.id })));
    console.log('CreateTaskModal - Active current user:', activeCurrentUser);
  }, [activeUsers, activeCurrentUser, reduxCurrentUser, reduxUsers]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: "",
        description: "",
        assigneeId: "",
        dueDate: "",
      });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission - assigneeId:', formData.assigneeId, 'type:', typeof formData.assigneeId);
    console.log('All user IDs in array:', activeUsers.map(u => ({ id: u.id, type: typeof u.id })));
    
    // Ensure we have a valid assigneeId
    if (!formData.assigneeId || formData.assigneeId.trim() === "") {
      console.error('No assignee ID provided');
      return;
    }
    
    // Try both string and number comparison to handle type mismatches
    const assignee = activeUsers.find(u => 
      String(u.id) === String(formData.assigneeId) || 
      u.id === formData.assigneeId
    );
    
    console.log('Found assignee:', assignee);
    
    if (!assignee) {
      console.error('No assignee found for ID:', formData.assigneeId);
      console.error('Available user IDs:', activeUsers.map(u => u.id));
      return;
    }

    const newTask: Omit<Task, 'id' | 'createdAt'> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      assigneeId: String(formData.assigneeId), // Ensure string type
      assigneeName: assignee.name,
      createdBy: String(activeCurrentUser.id), // Ensure string type
      createdByName: activeCurrentUser.name,
      status: 'NOT_STARTED',
      dueDate: formData.dueDate,
      parentTaskId,
      subtasks: [],
    };

    console.log('Submitting task with data:', newTask);
    onCreateTask(newTask);
    
    // Reset form
    setFormData({
      title: "",
      description: "",
      assigneeId: "",
      dueDate: "",
    });
    
    onClose();
  };

  const handleChange = (field: string, value: string) => {
    console.log(`Updating ${field} to:`, value, 'type:', typeof value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAssigneeChange = (value: string) => {
    console.log('Assignee selection changed to:', value, 'type:', typeof value);
    console.log('Available users with IDs:', activeUsers.map(u => ({ id: u.id, name: u.name, idType: typeof u.id })));
    // Store as string to ensure consistency
    handleChange("assigneeId", String(value));
  };

  // Filter out admin users and the current user (task creator) from assignee options
  const availableUsers = activeUsers.filter(user => 
    user.role !== 'admin' && 
    String(user.id) !== String(activeCurrentUser.id) &&
    user.status === 'approved'
  );

  console.log('CreateTaskModal - Available users for assignment:', availableUsers.map(u => ({ id: u.id, name: u.name })));
  console.log('CreateTaskModal - Current assigneeId:', formData.assigneeId);

  // Get max date for subtasks (parent task due date)
  const maxDate = parentTask ? parentTask.dueDate : undefined;
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {parentTaskId ? '➕ Create Subtask' : '📝 Create New Task'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">Task Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Enter a descriptive task title"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Provide detailed task description..."
              rows={4}
              className="mt-1 resize-none"
              required
            />
          </div>

          <div>
            <Label htmlFor="assignee" className="text-sm font-medium text-gray-700">Assign to</Label>
            <Select
              value={formData.assigneeId}
              onValueChange={handleAssigneeChange}
              required
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select team member to assign" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-[60]">
                {availableUsers.map((user) => (
                  <SelectItem 
                    key={`user-${user.id}`}
                    value={String(user.id)}
                    className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableUsers.length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No available users to assign tasks to. 
                  {activeUsers.length === 0 ? ' No users loaded.' : ' All users are either admins or not approved.'}
                </p>
                {activeUsers.length > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Total users: {activeUsers.length}, 
                    Approved non-admin users: {activeUsers.filter(u => u.role !== 'admin' && u.status === 'approved').length}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange("dueDate", e.target.value)}
              className="mt-1"
              min={minDate}
              max={maxDate}
              required
            />
            {parentTask && (
              <p className="text-xs text-gray-500 mt-1">
                Due date cannot exceed parent task due date: {new Date(parentTask.dueDate).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="px-6">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 px-6"
              disabled={availableUsers.length === 0}
            >
              {parentTaskId ? 'Create Subtask' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskModal;
