import TurnBasedVoiceChat from "@/components/TurnBasedVoiceChat";
import BottomNav from "@/components/BottomNav";

const Interview = () => {
  const handleTranscriptComplete = (transcript: string[]) => {
    console.log('Session transcript:', transcript);
    // Transcript is passed to results page via navigation state
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Goal Setting Session
          </h1>
          <p className="text-lg text-muted-foreground">
            Let's chat about your goals. Click Record to speak, then stop when done.
          </p>
        </div>

        {/* Turn-Based Voice Chat */}
        <div className="animate-in fade-in zoom-in duration-700 delay-200">
          <TurnBasedVoiceChat 
            onTranscriptComplete={handleTranscriptComplete}
          />
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Interview;
