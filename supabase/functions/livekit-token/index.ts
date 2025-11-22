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

  console.log('Checking LiveKit credentials...');
  console.log('API Key exists:', !!apiKey);
  console.log('API Secret exists:', !!apiSecret);

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured. Please check LIVEKIT_API_KEY and LIVEKIT_API_SECRET secrets.');
  }

  try {
    console.log('Importing LiveKit SDK...');
    // Import AccessToken from LiveKit server SDK
    const { AccessToken } = await import('https://deno.land/x/livekit_server_sdk@v2.6.1/mod.ts');

    console.log('Creating AccessToken...');
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: 3600, // 1 hour
    });

    console.log('Adding grants...');
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    console.log('Generating JWT...');
    return at.toJwt();
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate LiveKit token: ${errorMessage}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== LiveKit Token Generation Request ===');
    
    // Get room name from request body
    const { roomName } = await req.json();
    console.log('Room name:', roomName);
    
    if (!roomName) {
      throw new Error('Room name is required');
    }

    // Generate unique participant name (no auth required for MVP)
    const participantName = `participant_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log('Participant name:', participantName);

    // Generate LiveKit token
    const liveKitToken = await generateLiveKitToken(roomName, participantName);
    const liveKitUrl = Deno.env.get('LIVEKIT_URL');
    
    console.log('LiveKit URL exists:', !!liveKitUrl);
    console.log('Token generated successfully');
    console.log('=== Request Complete ===');

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
    console.error('=== Error in livekit-token function ===');
    console.error('Error type:', error?.constructor?.name);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error message:', errorMessage);
    console.error('Full error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Check edge function logs for more information'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
