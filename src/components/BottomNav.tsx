import { Mic, Calendar as CalendarIcon, Target } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border/50 z-50 shadow-lg">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="grid grid-cols-3 gap-2 py-3">
          <NavLink
            to="/interview"
            className="flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all hover:bg-accent/50"
            activeClassName="bg-primary/10 text-primary scale-105"
          >
            <Mic className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Chat</span>
          </NavLink>
          
          <NavLink
            to="/"
            className="flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all hover:bg-accent/50"
            activeClassName="bg-primary/10 text-primary scale-105"
          >
            <Target className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Goals</span>
          </NavLink>
          
          <NavLink
            to="/calendar"
            className="flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all hover:bg-accent/50"
            activeClassName="bg-primary/10 text-primary scale-105"
          >
            <CalendarIcon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Calendar</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
