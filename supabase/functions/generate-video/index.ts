import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, imageUrl } = await req.json();
    
    if (!script) {
      throw new Error('Script is required');
    }

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
    if (!FAL_API_KEY) {
      throw new Error('FAL_API_KEY not configured');
    }

    console.log('Generating video with fal.ai');

    try {
      // Use fal.ai's AI Avatar API with correct format
      const response = await fetch('https://fal.run/fal-ai/ai-avatar/single-text', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: {
            url: imageUrl
          },
          text: script
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('fal.ai API error:', error);
        throw new Error(`fal.ai API returned ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Video generation successful', data);

      return new Response(JSON.stringify({ 
        videoUrl: data.video?.url || data.video_url,
        requestId: data.request_id,
        success: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fetchError) {
      // Handle HTTP/2 connection errors and other transport issues
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.error('fal.ai connection error:', errorMessage);
      
      // Return a graceful error response instead of throwing
      return new Response(JSON.stringify({ 
        success: false,
        error: 'connection_failed',
        message: 'Unable to connect to video generation service. Please use the downloaded script and image with VEED or fal.ai directly.',
        details: errorMessage
      }), {
        status: 200, // Return 200 so client can handle gracefully
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-video:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
