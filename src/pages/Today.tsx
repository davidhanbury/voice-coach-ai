import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";

interface DailyGoal {
  id: string;
  task: string;
  completed: boolean;
  goal_id: string;
  goal_title?: string;
}

const Today = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchTodayGoals();
  }, []);

  const fetchTodayGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('daily_goals')
        .select(`
          id,
          task,
          completed,
          goal_id,
          goals:goal_id (
            title
          )
        `)
        .eq('date', today);

      if (error) throw error;

      const goalsWithTitle = data?.map(goal => ({
        ...goal,
        goal_title: (goal.goals as any)?.title || 'Untitled Goal'
      })) || [];

      setDailyGoals(goalsWithTitle);
    } catch (error) {
      console.error('Error fetching today goals:', error);
      toast({
        title: "Error",
        description: "Failed to load today's goals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleGoalComplete = async (goalId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('daily_goals')
        .update({ completed: !currentStatus })
        .eq('id', goalId);

      if (error) throw error;

      setDailyGoals(prev => 
        prev.map(g => g.id === goalId ? { ...g, completed: !currentStatus } : g)
      );

      toast({
        title: "Updated",
        description: !currentStatus ? "Goal completed! 🎉" : "Goal unmarked",
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive"
      });
    }
  };

  const completedCount = dailyGoals.filter(g => g.completed).length;
  const totalCount = dailyGoals.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-4xl mx-auto">
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
            onClick={() => navigate('/calendar')}
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Today's Goals
          </h1>
          <p className="text-lg text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          {totalCount > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>{completedCount} of {totalCount} completed</span>
            </div>
          )}
        </div>

        {/* Daily Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Your Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : dailyGoals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No goals scheduled for today
                </p>
                <Button onClick={() => navigate('/interview')}>
                  Create Your First Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={goal.completed}
                      onCheckedChange={() => toggleGoalComplete(goal.id, goal.completed)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {goal.task}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Goal: {goal.goal_title}
                      </p>
                    </div>
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

export default Today;
