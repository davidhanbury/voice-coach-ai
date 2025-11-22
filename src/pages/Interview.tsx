import OpenAIVoiceInterface from "@/components/OpenAIVoiceInterface";

const Interview = () => {
  // Generate unique session name
  const sessionName = `interview-${Date.now()}`;

  const handleTranscriptComplete = (transcript: string[]) => {
    console.log('Session transcript:', transcript);
    // Transcript is passed to results page via navigation state
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Voice Interview Session
          </h1>
          <p className="text-lg text-muted-foreground">
            Take your time. Share what's on your mind, and I'll help create a plan that works for you.
          </p>
        </div>

        {/* OpenAI Voice Interface */}
        <div className="animate-in fade-in zoom-in duration-700 delay-200">
          <OpenAIVoiceInterface 
            roomName={sessionName} 
            onTranscriptComplete={handleTranscriptComplete}
          />
        </div>
      </div>
    </div>
  );
};

export default Interview;
