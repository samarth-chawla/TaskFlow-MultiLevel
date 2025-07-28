
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, User, Users } from "lucide-react";

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

interface TaskStatsProps {
  tasks: Task[];
  currentUser: User;
}

const TaskStats = ({ tasks, currentUser }: TaskStatsProps) => {
  // Get all tasks including subtasks
  const getAllTasks = (taskList: Task[]): Task[] => {
    const allTasks: Task[] = [];
    
    const addTasksRecursively = (tasks: Task[]) => {
      tasks.forEach(task => {
        allTasks.push(task);
        if (task.subtasks && task.subtasks.length > 0) {
          addTasksRecursively(task.subtasks);
        }
      });
    };
    
    addTasksRecursively(taskList);
    return allTasks;
  };

  const allTasks = getAllTasks(tasks);

  // Calculate stats correctly
  const myTasks = allTasks.filter(task => task.assigneeId == currentUser.id);
  const assignedByMe = allTasks.filter(task => task.createdBy == currentUser.id);
  const completedByMe = allTasks.filter(task => 
    task.assigneeId == currentUser.id && task.status === 'COMPLETED'
  );
  const assignedToMe = allTasks.filter(task => 
    task.assigneeId == currentUser.id && task.status !== 'COMPLETED'
  );

  const stats = [
    {
      title: "My Tasks",
      value: myTasks.length,
      icon: User,
      color: "bg-blue-500",
      description: "Tasks assigned to me"
    },
    {
      title: "Assigned to Me",
      value: assignedToMe.length,
      icon: Clock,
      color: "bg-orange-500",
      description: "Active assignments"
    },
    {
      title: "Assigned by Me",
      value: assignedByMe.length,
      icon: Users,
      color: "bg-purple-500",
      description: "Tasks I created"
    },
    {
      title: "Completed by Me",
      value: completedByMe.length,
      icon: CheckCircle,
      color: "bg-green-500",
      description: "Tasks I've completed"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>
              <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TaskStats;
