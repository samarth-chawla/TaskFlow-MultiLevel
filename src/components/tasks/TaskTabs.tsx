
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TaskCard from "./TaskCard";

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

interface TaskTabsProps {
  tasks: Task[];
  currentUser: User;
  onStatusUpdate: (taskId: string, status: Task['status']) => void;
  onCreateSubtask: (parentTaskId: string) => void;
  expandedTasks: Set<string>;
  onToggleExpansion: (taskId: string) => void;
  searchTerm: string;
}

const TaskTabs = ({ 
  tasks, 
  currentUser, 
  onStatusUpdate, 
  onCreateSubtask, 
  expandedTasks, 
  onToggleExpansion, 
  searchTerm 
}: TaskTabsProps) => {
  const filterTasks = (taskList: Task[]) => {
    return taskList.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const myTasks = filterTasks(tasks.filter(task => task.assigneeId == currentUser.id));
  const assignedByMe = filterTasks(tasks.filter(task => task.createdBy == currentUser.id));
  const allTasks = filterTasks(tasks);

  const TaskList = ({ taskList, title }: { taskList: Task[]; title: string }) => (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b">
        <CardTitle className="flex items-center justify-between text-xl font-semibold">
          <span className="text-gray-800">{title}</span>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-medium px-3 py-1">
            {taskList.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {taskList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-lg font-medium mb-2">No tasks found</p>
            <p className="text-sm text-gray-400">Tasks will appear here once created</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {taskList.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUser={currentUser}
                onStatusUpdate={onStatusUpdate}
                onCreateSubtask={onCreateSubtask}
                isExpanded={expandedTasks.has(task.id)}
                onToggleExpansion={onToggleExpansion}
                expandedTasks={expandedTasks}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full">
      <Tabs defaultValue="all-tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-white shadow-sm border h-12">
          <TabsTrigger 
            value="all-tasks" 
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white font-medium text-sm sm:text-base"
          >
            All Tasks
          </TabsTrigger>
          <TabsTrigger 
            value="my-tasks"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white font-medium text-sm sm:text-base"
          >
            My Tasks
          </TabsTrigger>
          <TabsTrigger 
            value="assigned-by-me"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white font-medium text-sm sm:text-base"
          >
            Assigned by Me
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-tasks" className="mt-0">
          <TaskList taskList={allTasks} title="All Tasks" />
        </TabsContent>
        
        <TabsContent value="my-tasks" className="mt-0">
          <TaskList taskList={myTasks} title="My Tasks" />
        </TabsContent>
        
        <TabsContent value="assigned-by-me" className="mt-0">
          <TaskList taskList={assignedByMe} title="Tasks Assigned by Me" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaskTabs;