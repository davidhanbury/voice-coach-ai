import { MessageCircle, Calendar as CalendarIcon, Target } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="grid grid-cols-3 gap-2 py-2">
          <NavLink
            to="/interview"
            className="flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-colors hover:bg-accent"
            activeClassName="bg-primary/10 text-primary"
          >
            <MessageCircle className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Chat</span>
          </NavLink>
          
          <NavLink
            to="/today"
            className="flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-colors hover:bg-accent"
            activeClassName="bg-primary/10 text-primary"
          >
            <Target className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Today</span>
          </NavLink>
          
          <NavLink
            to="/calendar"
            className="flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-colors hover:bg-accent"
            activeClassName="bg-primary/10 text-primary"
          >
            <CalendarIcon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Calendar</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
