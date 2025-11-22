import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Filter, Flame, Trophy } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import BottomNav from "@/components/BottomNav";

interface Goal {
  id: string;
  title: string;
  color: string;
  category: string;
}

interface DailyGoal {
  id: string;
  date: string;
  task: string;
  completed: boolean;
  goal_id: string;
  goal_title?: string;
  goal_color?: string;
  goal_category?: string;
}

const CalendarNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    fetchGoalsAndTasks();
    fetchStreak();
  }, [currentDate]);

  const fetchStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setStreakData({
          current: data.current_streak || 0,
          longest: data.longest_streak || 0
        });
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    }
  };

  const fetchGoalsAndTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, color, category')
        .eq('user_id', user.id);

      if (goalsError) throw goalsError;

      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_goals')
        .select(`
          id,
          date,
          task,
          completed,
          goal_id,
          goals:goal_id (title, color, category)
        `)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .in('goal_id', goalsData?.map(g => g.id) || []);

      if (dailyError) throw dailyError;

      const goalsWithTitle = dailyData?.map(goal => ({
        ...goal,
        goal_title: (goal.goals as any)?.title,
        goal_color: (goal.goals as any)?.color || '#3b82f6',
        goal_category: (goal.goals as any)?.category
      })) || [];

      setGoals(goalsData || []);
      setDailyGoals(goalsWithTitle);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('daily_goals')
        .update({ completed: !currentStatus })
        .eq('id', taskId);

      if (error) throw error;

      setDailyGoals(prev =>
        prev.map(g => g.id === taskId ? { ...g, completed: !currentStatus } : g)
      );

      toast({
        title: "Updated",
        description: !currentStatus ? "Task completed! 🎉" : "Task unmarked",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };

  const getDayTasks = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let tasks = dailyGoals.filter(g => g.date === dateStr);
    
    if (selectedCategories.length > 0) {
      tasks = tasks.filter(t => selectedCategories.includes(t.goal_category || ''));
    }
    
    return tasks;
  };

  const getDayProgress = (date: Date) => {
    const tasks = getDayTasks(date);
    if (tasks.length === 0) return { percent: 0, color: 'bg-muted' };
    
    const completed = tasks.filter(t => t.completed).length;
    const percent = (completed / tasks.length) * 100;
    
    if (percent === 100) return { percent, color: 'bg-green-500' };
    if (percent >= 50) return { percent, color: 'bg-amber-500' };
    return { percent, color: 'bg-red-500' };
  };

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const categories = [...new Set(goals.map(g => g.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header with Streaks */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">Track your goals</p>
          </div>
          
          {streakData.current > 0 && (
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-lg font-bold">{streakData.current}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter:</span>
                {categories.map(category => (
                  <Badge
                    key={category}
                    variant={selectedCategories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCategoryFilter(category)}
                  >
                    {category}
                  </Badge>
                ))}
                {selectedCategories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategories([])}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : (
              <div>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold text-sm text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                  {emptyDays.map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square" />
                  ))}
                  {daysInMonth.map(day => {
                    const dayTasks = getDayTasks(day);
                    const progress = getDayProgress(day);
                    const uniqueColors = [...new Set(dayTasks.map(t => t.goal_color))];

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => dayTasks.length > 0 && setSelectedDate(day)}
                        className={`
                          aspect-square p-2 rounded-lg border transition-all cursor-pointer
                          ${isToday(day) ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
                          ${dayTasks.length > 0 ? 'hover:shadow-lg' : ''}
                          bg-card
                        `}
                      >
                        <div className="flex flex-col h-full">
                          <span className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                            {format(day, 'd')}
                          </span>
                          
                          {/* Color indicators */}
                          {uniqueColors.length > 0 && (
                            <div className="flex gap-1 flex-wrap mb-1">
                              {uniqueColors.slice(0, 3).map((color, i) => (
                                <div
                                  key={i}
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          )}
                          
                          {/* Progress ring */}
                          {dayTasks.length > 0 && (
                            <div className="mt-auto">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                progress.percent === 100 ? 'border-green-500 bg-green-500/20' :
                                progress.percent >= 50 ? 'border-amber-500 bg-amber-500/20' :
                                'border-border'
                              }`}>
                                <span className="text-[8px] font-bold">
                                  {dayTasks.filter(t => t.completed).length}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Day Tasks Sheet */}
      <Sheet open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(60vh-120px)]">
            {selectedDate && getDayTasks(selectedDate).map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                style={{ borderLeftWidth: '4px', borderLeftColor: task.goal_color }}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTaskComplete(task.id, task.completed)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.task}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {task.goal_title}
                    </Badge>
                    {task.goal_category && (
                      <span className="text-xs text-muted-foreground">
                        {task.goal_category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
};

export default CalendarNew;
