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
    console.log('Original script length:', script.length);

    // To comply with fal.ai Fabric 1.0 max 60s audio limit, truncate script for TTS if needed
    const MAX_TTS_SCRIPT_LENGTH = 600;
    let ttsScript = script;
    if (ttsScript.length > MAX_TTS_SCRIPT_LENGTH) {
      console.log(
        `Script too long for TTS (${ttsScript.length} chars). Truncating to ${MAX_TTS_SCRIPT_LENGTH} chars to keep audio under 60 seconds.`,
      );
      ttsScript = ttsScript.slice(0, MAX_TTS_SCRIPT_LENGTH);
      console.log('Truncated script length:', ttsScript.length);
    }

    // Step 1: Convert text to audio using OpenAI TTS
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: ttsScript,
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
      // Step 3a: Create video generation task in fal queue
      const queueResponse = await fetch('https://queue.fal.run/veed/fabric-1.0', {
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

      if (!queueResponse.ok) {
        const errorText = await queueResponse.text();
        console.error('fal.ai queue API error:', queueResponse.status, errorText);
        
        return new Response(JSON.stringify({ 
          success: false,
          error: 'fal_api_error',
          message: 'Failed to enqueue video generation with fal.ai',
          statusCode: queueResponse.status,
          details: errorText,
          audioUrl: audioUrl
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const queueData = await queueResponse.json();
      console.log('fal.ai queue response:', JSON.stringify(queueData, null, 2));

      let status: string | undefined = queueData.status;
      const requestId: string | undefined = queueData.request_id;
      let responseUrl: string | undefined = queueData.response_url;
      let statusUrl: string | undefined = queueData.status_url;

      const maxAttempts = 18; // up to ~90s (18 * 5s)
      const delayMs = 5000;
      let attempt = 0;
      let lastStatusData: any = null;

      // Step 3b: Poll status until completed, failed, or timeout
      while (
        status !== 'COMPLETED' &&
        status !== 'FAILED' &&
        status !== 'ERROR' &&
        status !== 'CANCELLED' &&
        attempt < maxAttempts &&
        statusUrl
      ) {
        attempt++;
        console.log(`Polling fal.ai status (attempt ${attempt})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        const statusResp = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
          },
        });

        if (!statusResp.ok) {
          const statusError = await statusResp.text();
          console.error('fal.ai status API error:', statusResp.status, statusError);
          break;
        }

        const statusData = await statusResp.json();
        lastStatusData = statusData;
        status = statusData.status || status;
        responseUrl = statusData.response_url || responseUrl;
        statusUrl = statusData.status_url || statusUrl;
        console.log('fal.ai status update:', status);
      }

      if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED') {
        console.error('fal.ai generation failed with status:', status, 'data:', lastStatusData);
        return new Response(JSON.stringify({
          success: false,
          error: 'fal_api_error',
          message: `Video generation failed with status ${status}`,
          status,
          details: lastStatusData,
          audioUrl: audioUrl,
          requestId,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (status !== 'COMPLETED' || !responseUrl) {
        console.error('fal.ai generation did not complete in time or missing response_url. Final status:', status);
        return new Response(JSON.stringify({ 
          success: false,
          error: 'generation_timeout',
          message: 'Video generation did not complete in time',
          audioUrl: audioUrl,
          requestId,
          status,
          lastStatus: lastStatusData,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Step 3c: Fetch final video output from response_url
      const outputResp = await fetch(responseUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
        },
      });

      if (!outputResp.ok) {
        const outputError = await outputResp.text();
        console.error('fal.ai output API error:', outputResp.status, outputError);
        return new Response(JSON.stringify({ 
          success: false,
          error: 'fal_api_error',
          message: 'Failed to retrieve video output from fal.ai',
          statusCode: outputResp.status,
          details: outputError,
          audioUrl: audioUrl,
          requestId,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const outputData = await outputResp.json();
      console.log('fal.ai VEED Fabric output:', JSON.stringify(outputData, null, 2));

      // Extract video URL from output: { video: { url: "..." } }
      let videoUrl: string | null = null;
      
      if (outputData.video && typeof outputData.video === 'object' && outputData.video.url) {
        videoUrl = outputData.video.url;
      } else if (outputData.video_url) {
        videoUrl = outputData.video_url;
      } else if (outputData.url) {
        videoUrl = outputData.url;
      }

      console.log('Extracted video URL:', videoUrl);

      if (!videoUrl) {
        console.error('No video URL found in fal.ai output:', outputData);
        return new Response(JSON.stringify({ 
          success: false,
          error: 'no_video_url',
          message: 'Video generation completed but no URL was returned',
          rawResponse: outputData,
          audioUrl: audioUrl,
          requestId,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        videoUrl: videoUrl,
        audioUrl: audioUrl,
        requestId,
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
