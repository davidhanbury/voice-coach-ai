import TurnBasedVoiceChat from "@/components/TurnBasedVoiceChat";
import BottomNav from "@/components/BottomNav";

const Interview = () => {
  const handleTranscriptComplete = (transcript: string[]) => {
    console.log('Session transcript:', transcript);
    // Transcript is passed to results page via navigation state
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 py-8 px-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Let's Chat
          </h1>
          <p className="text-base text-muted-foreground">
            Tell me about your goals. Click Record to speak, then stop when done.
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
