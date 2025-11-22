# LiveKit Integration Setup Guide

This guide explains how to set up and use LiveKit for real-time voice conversations in the MindCare therapy application.

## Overview

LiveKit provides real-time audio/video communication capabilities. This app uses LiveKit to conduct voice-based therapy interview sessions.

## Prerequisites

1. **LiveKit Account**: Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
2. **LiveKit Credentials**: You'll need:
   - API Key
   - API Secret
   - WebSocket URL (e.g., `wss://your-project.livekit.cloud`)

## Setup Steps

### 1. Get Your LiveKit Credentials

1. Go to [LiveKit Cloud Dashboard](https://cloud.livekit.io/)
2. Create a new project or select an existing one
3. Navigate to Settings → API Keys
4. Copy your:
   - API Key
   - API Secret
   - WebSocket URL

### 2. Configure Secrets in Lovable Cloud

The secrets have already been added to your project. You configured:
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_URL`

These secrets are securely stored and used by the backend to generate authentication tokens.

### 3. How It Works

#### Architecture

```
User Browser → LiveKit Component → Backend Function → LiveKit Cloud
                                    (generates token)
```

1. **Frontend**: Uses `@livekit/components-react` and `livekit-client`
2. **Backend**: Edge function (`livekit-token`) generates secure access tokens
3. **LiveKit Cloud**: Manages the real-time audio communication

#### Key Components

- **`useLiveKit` Hook**: Custom hook managing LiveKit connection state
- **`LiveKitVoice` Component**: UI for voice interview sessions
- **`livekit-token` Edge Function**: Generates authenticated tokens for users

#### Flow

1. User clicks "Start Interview"
2. Frontend requests token from `livekit-token` edge function
3. Edge function generates JWT token using LiveKit credentials
4. Frontend connects to LiveKit room using token
5. User's microphone is enabled for audio streaming
6. Transcript data can be captured via DataChannel
7. User ends session, transcript is processed

## Features

### Audio Streaming
- Real-time bidirectional audio
- Automatic echo cancellation
- Noise suppression

### Transcript Collection
- Captures conversation data via DataChannel
- Stores transcript for treatment plan generation
- Privacy-focused (encrypted in transit)

### Session Management
- Unique room per session
- Automatic cleanup on disconnect
- Error handling and reconnection

## Testing

### Local Testing

1. Start the development server
2. Navigate to `/interview`
3. Click "Start Interview"
4. Allow microphone access when prompted
5. Speak - your audio will be streamed to LiveKit
6. Click "End Session" to complete

### Production Testing

1. Deploy your app (click Publish in Lovable)
2. Test with multiple participants
3. Monitor LiveKit dashboard for connection stats

## LiveKit Dashboard

Access your LiveKit dashboard to:
- View active rooms and participants
- Monitor connection quality
- Check bandwidth usage
- View logs and analytics

## Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to LiveKit"
- **Solution**: Verify LIVEKIT_URL format (must start with `wss://`)
- **Check**: Ensure API credentials are correct

**Problem**: Microphone not working
- **Solution**: Check browser permissions
- **Check**: Ensure HTTPS connection (required for microphone access)

### Token Errors

**Problem**: "Invalid token"
- **Solution**: Check API Key and Secret in Lovable Cloud secrets
- **Check**: Ensure edge function has access to secrets

### Audio Issues

**Problem**: No audio streaming
- **Solution**: Check browser console for errors
- **Check**: Verify room connection in LiveKit dashboard

## Security

- Tokens are generated server-side only
- Tokens expire after 1 hour
- User authentication required for token generation
- All credentials stored securely in Lovable Cloud

## Next Steps

### Adding AI Conversation Partner

To implement an AI therapist that responds during the conversation:

1. Set up LiveKit Agents SDK
2. Deploy agent to LiveKit Cloud or your server
3. Agent joins room and processes audio in real-time
4. Responds with synthesized speech

### Integrating Speech-to-Text

Current setup uses LiveKit's DataChannel for transcripts. To add automatic transcription:

1. Use LiveKit's Transcription feature
2. Or integrate services like:
   - OpenAI Whisper
   - Google Speech-to-Text
   - AssemblyAI

### Recording Sessions

To record audio for later analysis:

1. Enable recording in LiveKit room options
2. Recordings saved to S3 or cloud storage
3. Access recordings via LiveKit API

## Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit React Components](https://docs.livekit.io/reference/components/react/)
- [LiveKit Cloud Dashboard](https://cloud.livekit.io/)
- [LiveKit Community](https://livekit.io/community)

## Support

For issues specific to this integration:
1. Check browser console for errors
2. Review LiveKit dashboard logs
3. Contact support through Lovable or LiveKit channels
