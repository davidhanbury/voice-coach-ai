import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { script, imageUrl } = await req.json();
    
    if (!script || !imageUrl) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'missing_parameters',
        message: 'Script and image URL are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Required API keys not configured');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'api_key_missing',
        message: 'Video generation API keys not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Step 1: Converting text to audio...');
    console.log('Script length:', script.length);

    // Step 1: Convert text to audio using OpenAI TTS
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: script,
        voice: 'alloy',
        response_format: 'mp3',
      }),
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('TTS error:', error);
      throw new Error('Failed to convert text to audio');
    }

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBlob = new Uint8Array(audioArrayBuffer);
    
    console.log('Audio generated, size:', audioBlob.length, 'bytes');

    // Step 2: Upload audio to Supabase storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const audioFileName = `${Date.now()}-audio.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('therapist-images')
      .upload(audioFileName, audioBlob, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Audio upload error:', uploadError);
      throw new Error('Failed to upload audio file');
    }

    const { data: { publicUrl: audioUrl } } = supabase.storage
      .from('therapist-images')
      .getPublicUrl(audioFileName);

    console.log('Audio uploaded to:', audioUrl);
    console.log('Step 3: Calling fal.ai VEED Fabric 1.0 API...');

    // Step 3: Call fal.ai VEED Fabric API with image and audio
    const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
    
    if (!FAL_API_KEY) {
      console.error('FAL_API_KEY not configured');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'api_key_missing',
        message: 'FAL API key not configured',
        audioUrl: audioUrl
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const veedResponse = await fetch('https://fal.run/veed/fabric-1.0', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          audio_url: audioUrl,
          resolution: '720p'
        }),
      });

      if (!veedResponse.ok) {
        const errorText = await veedResponse.text();
        console.error('fal.ai API error:', veedResponse.status, errorText);
        
        return new Response(JSON.stringify({ 
          success: false,
          error: 'fal_api_error',
          message: 'Failed to generate video with fal.ai',
          statusCode: veedResponse.status,
          details: errorText,
          audioUrl: audioUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const veedData = await veedResponse.json();
      
      console.log('fal.ai VEED Fabric response:', JSON.stringify(veedData, null, 2));

      // Extract video URL from fal.ai response: { video: { url: "..." } }
      let videoUrl = null;
      
      if (veedData.video && typeof veedData.video === 'object' && veedData.video.url) {
        videoUrl = veedData.video.url;
      } else if (veedData.video_url) {
        videoUrl = veedData.video_url;
      } else if (veedData.url) {
        videoUrl = veedData.url;
      }

      console.log('Extracted video URL:', videoUrl);

      if (!videoUrl) {
        console.error('No video URL found in response:', veedData);
        return new Response(JSON.stringify({ 
          success: false,
          error: 'no_video_url',
          message: 'Video generation completed but no URL was returned',
          rawResponse: veedData,
          audioUrl: audioUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        videoUrl: videoUrl,
        audioUrl: audioUrl,
        requestId: veedData.request_id,
        success: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fetchError) {
      console.error('Network error calling fal.ai:', fetchError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'connection_failed',
        message: 'Could not connect to fal.ai video generation service',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        audioUrl: audioUrl
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-video function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'server_error',
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
