import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";

interface Goal {
  id: string;
  title: string;
  timeline: string | null;
}

interface DailyGoal {
  date: string;
  task: string;
  completed: boolean;
}

const Calendar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoalsAndTasks();
  }, [currentDate]);

  const fetchGoalsAndTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, timeline')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Fetch daily goals for current month
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_goals')
        .select('date, task, completed, goal_id')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .in('goal_id', goalsData?.map(g => g.id) || []);

      if (dailyError) throw dailyError;

      setGoals(goalsData || []);
      setDailyGoals(dailyData || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDayTasks = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dailyGoals.filter(g => g.date === dateStr);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/today')}
            className="gap-2"
          >
            Today's Goals
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Goal Calendar
          </h1>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            >
              Previous
            </Button>
            <span className="text-xl font-semibold min-w-[200px]">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : (
              <div>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold text-muted-foreground p-2">
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
                    const completedTasks = dayTasks.filter(t => t.completed).length;
                    const hasDeadline = goals.some(g => 
                      g.timeline && isSameDay(new Date(g.timeline), day)
                    );

                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                          aspect-square p-2 rounded-lg border transition-colors
                          ${isToday(day) ? 'border-primary bg-primary/10' : 'border-border'}
                          ${dayTasks.length > 0 ? 'bg-accent/50' : 'bg-card'}
                          hover:bg-accent cursor-pointer
                        `}
                      >
                        <div className="flex flex-col h-full">
                          <span className={`text-sm font-medium ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                            {format(day, 'd')}
                          </span>
                          {dayTasks.length > 0 && (
                            <div className="mt-auto">
                              <p className="text-xs text-muted-foreground">
                                {completedTasks}/{dayTasks.length} done
                              </p>
                            </div>
                          )}
                          {hasDeadline && (
                            <div className="mt-1">
                              <CalendarIcon className="h-3 w-3 text-primary" />
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

        {/* Goals Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Goals</CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No goals set yet</p>
                <Button onClick={() => navigate('/interview')}>
                  Start Goal Setting
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map(goal => (
                  <div key={goal.id} className="p-4 rounded-lg border bg-card">
                    <h3 className="font-semibold text-foreground">{goal.title}</h3>
                    {goal.timeline && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Target: {format(new Date(goal.timeline), 'MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Calendar;
