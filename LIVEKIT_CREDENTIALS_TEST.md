# LiveKit Credentials Testing Guide

## Verifying Your LiveKit Setup

The "Invalid token" error typically means either:
1. Edge function deployment is still in progress (wait 30-60 seconds)
2. LiveKit credentials are not configured correctly

## How to Get LiveKit Credentials

### Option 1: LiveKit Cloud (Recommended)

1. **Sign up**: Go to [cloud.livekit.io](https://cloud.livekit.io/)
2. **Create a project** or select existing one
3. **Get credentials**:
   - Navigate to: Settings → Keys
   - Copy your:
     - **API Key** (starts with `API`)
     - **API Secret** (long string)
     - **WebSocket URL** (format: `wss://your-project.livekit.cloud`)

### Option 2: Self-Hosted LiveKit

If you're running your own LiveKit server:
```bash
# Your config.yaml should have:
api_key: YOUR_API_KEY
api_secret: YOUR_API_SECRET
```

WebSocket URL format: `wss://your-domain.com` or `ws://localhost:7880` for local

## Testing Credentials Manually

You can verify your LiveKit credentials work by testing locally:

```typescript
// test-livekit.ts
import { AccessToken } from 'livekit-server-sdk';

const apiKey = 'YOUR_API_KEY';
const apiSecret = 'YOUR_API_SECRET';

const token = new AccessToken(apiKey, apiSecret, {
  identity: 'test-user',
});

token.addGrant({
  room: 'test-room',
  roomJoin: true,
  canPublish: true,
  canSubscribe: true,
});

console.log('Token:', token.toJwt());
// If this prints a token, your credentials are valid!
```

## Common Issues

### 1. Wrong URL Format

❌ **Wrong:**
- `https://your-project.livekit.cloud` (https instead of wss)
- `your-project.livekit.cloud` (missing protocol)
- `wss://your-project.livekit.cloud/` (trailing slash)

✅ **Correct:**
- `wss://your-project.livekit.cloud`
- `ws://localhost:7880` (for local development)

### 2. API Key/Secret Mismatch

- Ensure you're using matching key and secret from the same project
- Check for extra spaces or line breaks when copying
- Keys are case-sensitive

### 3. Free Tier Limitations

LiveKit Cloud free tier includes:
- 10,000 participant minutes per month
- 10 concurrent participants
- 1 concurrent room

Exceeding limits will cause connection failures.

## Checking Current Configuration

Your secrets are stored in Lovable Cloud backend. To verify they're set:

1. Go to your backend dashboard
2. Check Secrets section
3. Verify these exist:
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `LIVEKIT_URL`

**Note**: You can't view secret values once set, only update them.

## Next Steps After Fixing Credentials

Once credentials are correct:

1. **Wait for deployment** (~30-60 seconds after code changes)
2. **Check edge function logs**:
   - Look for "Checking LiveKit credentials..."
   - Should show "API Key exists: true"
   - Should show "API Secret exists: true"
3. **Test connection** from the interview page
4. **Monitor LiveKit dashboard** for new connections

## Getting Help

If you're still stuck:

1. **Check edge function logs** for detailed error messages
2. **Test credentials** using the script above
3. **Verify URL format** matches examples exactly
4. **Check LiveKit dashboard** for any service issues
5. **Try creating a new API key** in LiveKit dashboard

## Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Cloud Dashboard](https://cloud.livekit.io/)
- [LiveKit Server SDK](https://github.com/livekit/server-sdk-js)
