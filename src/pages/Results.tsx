import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Results = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDownload = () => {
    toast({
      title: "Download Started",
      description: "Your treatment plan video is downloading...",
    });
    // TODO: Implement actual download from VEED
  };

  const handleShare = () => {
    toast({
      title: "Share Options",
      description: "Share your treatment plan with your healthcare provider.",
    });
    // TODO: Implement share functionality
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Your Personalized Treatment Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Here's a video summary created just for you, based on our conversation.
          </p>
        </div>

        {/* Video Card */}
        <Card className="p-4 border-2 mb-8 animate-in fade-in zoom-in duration-700 delay-200">
          {/* Video Player Placeholder - Will integrate with VEED */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
            <div className="text-center space-y-4 p-8">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <svg 
                  className="h-10 w-10 text-primary" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-muted-foreground">
                Your personalized treatment plan video will appear here
              </p>
              <p className="text-sm text-muted-foreground">
                (VEED video integration pending)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={handleDownload} className="px-8">
              <Download className="mr-2 h-5 w-5" />
              Download Video
            </Button>
            <Button size="lg" variant="outline" onClick={handleShare} className="px-8">
              <Share2 className="mr-2 h-5 w-5" />
              Share
            </Button>
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={() => navigate('/')}
              className="px-8"
            >
              <Home className="mr-2 h-5 w-5" />
              Return Home
            </Button>
          </div>
        </Card>

        {/* Treatment Plan Summary */}
        <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom duration-700 delay-400">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                <span className="text-primary font-bold">1</span>
              </span>
              Key Issues Identified
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Based on your interview responses</li>
              <li>• Personalized to your situation</li>
              <li>• Prioritized by importance</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="bg-accent/10 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                <span className="text-accent font-bold">2</span>
              </span>
              Recommended Actions
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Tailored behavioral strategies</li>
              <li>• Step-by-step guidance</li>
              <li>• Aligned with your preferences</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="bg-secondary/10 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                <span className="text-secondary font-bold">3</span>
              </span>
              Progress Tracking
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Measurable milestones</li>
              <li>• Regular check-ins</li>
              <li>• Adjust as you grow</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                <span className="text-primary font-bold">4</span>
              </span>
              Support Resources
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Recommended tools and techniques</li>
              <li>• Additional reading materials</li>
              <li>• Community support options</li>
            </ul>
          </Card>
        </div>

        {/* Next Steps */}
        <Card className="mt-8 p-8 bg-primary/5 border-primary/20 animate-in fade-in duration-700 delay-600">
          <h3 className="text-2xl font-semibold mb-4 text-center">Next Steps</h3>
          <div className="max-w-2xl mx-auto text-center space-y-4 text-muted-foreground">
            <p>
              Review your personalized video and take notes on key points that resonate with you.
            </p>
            <p>
              Share this plan with your healthcare provider or therapist to integrate it into your overall care.
            </p>
            <p className="font-semibold text-foreground">
              Remember: This is a starting point. Your journey is unique, and progress happens one step at a time.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Results;
