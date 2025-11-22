import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to generate LiveKit token
async function generateLiveKitToken(roomName: string, participantName: string): Promise<string> {
  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured');
  }

  // Import AccessToken from LiveKit server SDK
  const { AccessToken } = await import('https://deno.land/x/livekit_server_sdk@v2.6.1/mod.ts');

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: 3600, // 1 hour
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get room name from request body
    const { roomName } = await req.json();
    
    if (!roomName) {
      throw new Error('Room name is required');
    }

    // Generate unique participant name (no auth required for MVP)
    const participantName = `participant_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log('Generating token for room:', roomName, 'participant:', participantName);

    // Generate LiveKit token
    const liveKitToken = await generateLiveKitToken(roomName, participantName);
    const liveKitUrl = Deno.env.get('LIVEKIT_URL');

    console.log('Token generated successfully');

    return new Response(
      JSON.stringify({
        token: liveKitToken,
        url: liveKitUrl,
        participantName,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in livekit-token function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
