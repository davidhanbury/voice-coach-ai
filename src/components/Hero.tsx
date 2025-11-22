import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Mic, Video, Heart } from "lucide-react";
import heroBackground from "@/assets/hero-background.webp";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
            Your Journey to
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Better Mental Health
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Experience personalized behavioral therapy through AI-powered voice conversations 
            and custom treatment plans designed just for you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
              onClick={() => navigate('/interview')}
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Your Session
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 border-2"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">Voice Interview</h3>
            <p className="text-muted-foreground">
              Share your thoughts naturally through our AI-guided voice conversation
            </p>
          </div>

          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="bg-accent/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-7 w-7 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">Personalized Care</h3>
            <p className="text-muted-foreground">
              Receive a treatment plan tailored to your unique needs and preferences
            </p>
          </div>

          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="bg-secondary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="h-7 w-7 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">Video Summary</h3>
            <p className="text-muted-foreground">
              Get your personalized treatment plan delivered as an engaging video
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
