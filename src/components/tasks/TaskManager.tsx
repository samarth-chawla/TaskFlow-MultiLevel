
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TaskStats from "./TaskStats";
import TaskSearch from "./TaskSearch";
import TaskTabs from "./TaskTabs";
import CreateTaskModal from "./CreateTaskModal";

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

interface TaskManagerProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onTaskStatusUpdate: (taskId: string, status: Task['status']) => void;
  onTaskAdd: (task: Omit<Task, 'id' | 'createdAt'>) => void;
}

const TaskManager = ({ tasks, users, currentUser, onTaskStatusUpdate, onTaskAdd }: TaskManagerProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParentTask, setSelectedParentTask] = useState<string | undefined>();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleCreateSubtask = (parentTaskId: string) => {
    setSelectedParentTask(parentTaskId);
    setShowCreateModal(true);
  };

  // Admin cannot create or assign tasks - only view and manage approvals
  const canCreateTasks = currentUser.role !== 'admin';

  // Find parent task for subtask creation
  const parentTask = selectedParentTask ? tasks.find(t => t.id == selectedParentTask) : undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {currentUser.role === 'admin' ? 'Task Overview' : 'Task Dashboard'}
          </h2>
          <p className="text-gray-600 mt-1">
            {currentUser.role === 'admin' 
              ? 'Monitor task progress across the organization' 
              : 'Manage and track your tasks efficiently'}
          </p>
        </div>
        {canCreateTasks && (
          <Button 
            onClick={() => {
              setSelectedParentTask(undefined);
              setShowCreateModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        )}
      </div>

      {/* Task Statistics */}
      <TaskStats tasks={tasks} currentUser={currentUser} />

      {/* Search */}
      <div className="max-w-md">
        <TaskSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      </div>

      {/* Task Tabs */}
      <TaskTabs
        tasks={tasks}
        currentUser={currentUser}
        onStatusUpdate={onTaskStatusUpdate}
        onCreateSubtask={handleCreateSubtask}
        expandedTasks={expandedTasks}
        onToggleExpansion={toggleTaskExpansion}
        searchTerm={searchTerm}
      />

      {/* Create Task Modal - Only for non-admin users */}
      {canCreateTasks && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedParentTask(undefined);
          }}
          onCreateTask={onTaskAdd}
          users={users}
          currentUser={currentUser}
          parentTaskId={selectedParentTask}
          parentTask={parentTask}
        />
      )}
    </div>
  );
};

export default TaskManager;
