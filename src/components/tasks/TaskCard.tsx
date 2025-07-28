import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  User,
  Plus,
  ChevronRight,
  ChevronDown,
  Clock,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "pending" | "approved" | "rejected";
}

interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  createdBy: string;
  createdByName: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  dueDate: string;
  parentTaskId?: string;
  subtasks: Task[];
  createdAt: string;
}

interface TaskCardProps {
  task: Task;
  currentUser: User;
  onStatusUpdate: (taskId: string, status: Task["status"]) => void;
  onCreateSubtask: (parentTaskId: string) => void;
  isExpanded: boolean;
  onToggleExpansion: (taskId: string) => void;
  expandedTasks?: Set<string>;
}

const TaskCard = ({
  task,
  currentUser,
  onStatusUpdate,
  onCreateSubtask,
  isExpanded,
  onToggleExpansion,
  expandedTasks,
}: TaskCardProps) => {
  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "NOT_STARTED":
        return "bg-gray-100 text-gray-800 hover:text-gray-100 border-gray-300";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800 hover:text-yellow-100 border-yellow-300";
      case "COMPLETED":
        return "bg-green-100 text-green-800 hover:text-green-100 border-green-300";
      case "OVERDUE":
        return "bg-red-100 text-red-800 hover:text-red-100 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 hover:text-gray-100 border-gray-300";
    }
  };

  const getCardBorderColor = (status: Task["status"]) => {
    switch (status) {
      case "NOT_STARTED":
        return "border-l-gray-400";
      case "IN_PROGRESS":
        return "border-l-yellow-400";
      case "COMPLETED":
        return "border-l-green-400";
      case "OVERDUE":
        return "border-l-red-400";
      default:
        return "border-l-gray-400";
    }
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "NOT_STARTED":
        return "⏳";
      case "IN_PROGRESS":
        return "🔄";
      case "COMPLETED":
        return "✅";
      case "OVERDUE":
        return "⚠️";
      default:
        return "⏳";
    }
  };

  //  const getCalculatedStatus = (task: Task): Task['status'] => {
  //   if (task.subtasks.length === 0) {
  //     return task.status; // No subtasks, use original status
  //   }

  //   const completedSubtasks = task.subtasks.filter(st => st.status === 'COMPLETED').length;
  //   const inProgressSubtasks = task.subtasks.filter(st => st.status === 'IN_PROGRESS').length;

  //   if (completedSubtasks === task.subtasks.length) {
  //     return 'COMPLETED';
  //   } else if (inProgressSubtasks > 0 || completedSubtasks > 0) {
  //     return 'IN_PROGRESS';
  //   } else {
  //     return 'NOT_STARTED';
  //   }
  // };

  const getCalculatedStatus = (task: Task): Task["status"] => {
    // First check if the task is overdue (only if not completed)
    const isPastDue = new Date(task.dueDate) < new Date();

    // For tasks with no subtasks
    if (task.subtasks.length === 0) {
      if (task.status === "COMPLETED") {
        return "COMPLETED";
      }
      return isPastDue ? "OVERDUE" : task.status;
    }

    // For tasks with subtasks
    const subtaskStatuses = task.subtasks.map(getCalculatedStatus);
    const allCompleted = subtaskStatuses.every((s) => s === "COMPLETED");
    const anyInProgress = subtaskStatuses.some((s) => s === "IN_PROGRESS");
    const anyOverdue = subtaskStatuses.some((s) => s === "OVERDUE");

    if (allCompleted) {
      return "COMPLETED";
    } else if (anyInProgress) {
      return "IN_PROGRESS";
    } else if (anyOverdue || isPastDue) {
      return "OVERDUE";
    } else {
      return "NOT_STARTED";
    }
  };

  const displayStatus = getCalculatedStatus(task);
  const canUpdateStatus =
    task.assigneeId == currentUser.id &&
    currentUser.role !== "admin" &&
    task.subtasks.length === 0;
  const canCreateSubtask =
    task.assigneeId == currentUser.id &&
    currentUser.role !== "admin" &&
    displayStatus !== "COMPLETED";

  const isOverdue =
    new Date(task.dueDate) < new Date() && displayStatus !== "COMPLETED";

  return (
    <Card
      className={`hover:shadow-lg transition-all duration-200 border-l-4 ${getCardBorderColor(
        displayStatus
      )} bg-white h-fit`}
    >
      {" "}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-base line-clamp-2 flex-1">
                {task.title}
              </h3>
              {task.subtasks.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleExpansion(task.id)}
                  className="h-6 w-6 p-0 hover:bg-blue-50 flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-blue-600" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-blue-600" />
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <span className="font-medium truncate">{task.assigneeName}</span>
          </div>
          <div
            className={`flex items-center gap-1 ${
              isOverdue ? "text-red-600" : ""
            }`}
          >
            <Calendar
              className={`w-3 h-3 flex-shrink-0 ${
                isOverdue ? "text-red-500" : "text-green-500"
              }`}
            />
            <span className={`${isOverdue ? "font-medium" : ""} text-xs`}>
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
            {isOverdue && <Clock className="w-3 h-3 text-red-500" />}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          {canUpdateStatus ? (
            <Select
              value={task.status}
              onValueChange={(value: Task["status"]) =>
                onStatusUpdate(task.id, value)
              }
            >
              <SelectTrigger className="w-32 h-8 bg-white border text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-xs">
                    {getStatusIcon(displayStatus)}
                  </span>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">
                  <div className="flex items-center gap-2">
                    <span>Not Started</span>
                  </div>
                </SelectItem>
                <SelectItem value="IN_PROGRESS">
                  <div className="flex items-center gap-2">
                    <span>In Progress</span>
                  </div>
                </SelectItem>
                <SelectItem value="COMPLETED">
                  <div className="flex items-center gap-2">
                    <span>Completed</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge
              className={`${getStatusColor(
                displayStatus
              )} px-2 py-1 font-medium border text-xs`}
            >
              <span className="mr-1">{getStatusIcon(displayStatus)}</span>
              {displayStatus.replace("_", " ")}
            </Badge>
          )}

          {canCreateSubtask && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateSubtask(task.id)}
              className="h-7 px-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Add Subtask</span>
              <span className="sm:hidden">+</span>
            </Button>
          )}
        </div>

        {/* Subtasks progress section */}
        {task.subtasks.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-xs text-blue-700 font-medium">
              📋 Subtasks:{" "}
              {task.subtasks.filter((st) => st.status === "COMPLETED").length}/
              {task.subtasks.length} completed
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    task.subtasks.length > 0
                      ? (task.subtasks.filter((st) => st.status === "COMPLETED")
                          .length /
                          task.subtasks.length) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Expanded subtasks */}
        {isExpanded && task.subtasks.length > 0 && (
          <div className="border-l-2 border-blue-200 pl-3 ml-1 space-y-2 bg-blue-50/30 rounded-r-lg p-2">
            {task.subtasks.map((subtask) => (
              <TaskCard
                key={subtask.id}
                task={subtask}
                currentUser={currentUser}
                onStatusUpdate={onStatusUpdate}
                onCreateSubtask={onCreateSubtask}
                isExpanded={
                  expandedTasks ? expandedTasks.has(subtask.id) : false
                }
                onToggleExpansion={onToggleExpansion}
                expandedTasks={expandedTasks}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;
