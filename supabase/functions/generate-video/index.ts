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

    // Use fal.ai's AI Avatar API
    const response = await fetch('https://fal.run/fal-ai/ai-avatar/single-text', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        text: script,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('fal.ai API error:', error);
      throw new Error(`fal.ai API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Video generation initiated');

    // fal.ai returns a request ID that we need to poll
    return new Response(JSON.stringify({ 
      videoUrl: data.video_url || data.video?.url,
      requestId: data.request_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
