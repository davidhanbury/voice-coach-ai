import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Target, Calendar, CheckCircle2 } from "lucide-react";
import heroBackground from "@/assets/hero-background.webp";
import BottomNav from "@/components/BottomNav";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <>
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pb-24">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background/95" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight">
            Achieve Your Goals with
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              The GROW Framework
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Set SMART goals and create actionable plans through AI-powered coaching.
            Track your progress and achieve what matters most.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
              onClick={() => navigate('/interview')}
            >
              <Target className="mr-2 h-5 w-5" />
              Set Your Goals
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 border-2"
              onClick={() => navigate('/today')}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Today's Goals
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 border-2"
              onClick={() => navigate('/calendar')}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Calendar
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">GROW Framework</h3>
            <p className="text-muted-foreground">
              Goal, Reality, Obstacles, Will - A proven coaching method to achieve your aspirations
            </p>
          </div>

          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="bg-accent/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">SMART Goals</h3>
            <p className="text-muted-foreground">
              Set Specific, Measurable, Achievable, Relevant, and Time-bound goals
            </p>
          </div>

          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="bg-secondary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-7 w-7 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">Daily Tracking</h3>
            <p className="text-muted-foreground">
              Monitor your progress with daily tasks and calendar views
            </p>
          </div>
        </div>
      </div>
    </section>
    <BottomNav />
    </>
  );
};

export default Hero;
