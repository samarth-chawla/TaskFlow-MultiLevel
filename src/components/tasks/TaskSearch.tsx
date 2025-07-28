
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TaskSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const TaskSearch = ({ searchTerm, onSearchChange }: TaskSearchProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Search tasks..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
      />
    </div>
  );
};

export default TaskSearch;
