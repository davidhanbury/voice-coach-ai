# Authentication Implementation TODO

## Current Status: Public Access (MVP)

The LiveKit integration currently works **without authentication** to allow quick testing and development. This is suitable for MVP/demo purposes but **NOT for production**.

### What's Currently Implemented

- ✅ LiveKit token generation works for any user
- ✅ Voice sessions work without login
- ✅ Public edge function (no JWT verification)
- ❌ No user accounts
- ❌ No session persistence
- ❌ No user-specific data

### Security Implications

**IMPORTANT**: The current setup means:
- Anyone can create therapy sessions
- No way to track or save user sessions
- No privacy controls
- Cannot associate transcripts with specific users

### Required for Production

Before launching to real users, you MUST:

1. **Add Authentication System**
   ```typescript
   // Enable Lovable Cloud auth with email/password
   - Create signup/login pages
   - Protect interview page with auth
   - Store user sessions in database
   ```

2. **Update Edge Function**
   - Re-enable JWT verification in `supabase/config.toml`
   - Restore user authentication check
   - Associate tokens with authenticated users

3. **Add Database Tables**
   ```sql
   -- Store therapy sessions
   CREATE TABLE therapy_sessions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users NOT NULL,
     room_name TEXT NOT NULL,
     transcript JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Enable RLS
   ALTER TABLE therapy_sessions ENABLE ROW LEVEL SECURITY;
   
   -- Users can only see their own sessions
   CREATE POLICY "Users view own sessions" 
   ON therapy_sessions FOR SELECT 
   USING (auth.uid() = user_id);
   ```

4. **Update Frontend**
   - Add auth context/provider
   - Protect routes with auth guards
   - Display user-specific sessions
   - Add logout functionality

### Implementation Steps

When ready to add authentication:

1. **Enable Auto-confirm Email Signups**
   ```typescript
   // This allows instant testing without email verification
   // Do this via: Settings → Authentication → Auto Confirm
   ```

2. **Create Auth Pages**
   - `/login` - Email/password login
   - `/signup` - New user registration
   - `/profile` - User profile management

3. **Protect Interview Route**
   ```typescript
   // Only authenticated users can access
   <Route 
     path="/interview" 
     element={
       <ProtectedRoute>
         <Interview />
       </ProtectedRoute>
     } 
   />
   ```

4. **Update LiveKit Hook**
   ```typescript
   // Pass user session to edge function
   const { data: { session } } = await supabase.auth.getSession();
   const { data } = await supabase.functions.invoke('livekit-token', {
     headers: {
       Authorization: `Bearer ${session.access_token}`
     },
     body: { roomName }
   });
   ```

5. **Re-enable JWT Verification**
   ```toml
   # supabase/config.toml
   [functions.livekit-token]
   verify_jwt = true  # Change from false to true
   ```

### Testing Authentication

Once implemented, test these flows:
- [ ] New user signup
- [ ] Existing user login
- [ ] Logout functionality
- [ ] Protected routes redirect to login
- [ ] Sessions persist across page refreshes
- [ ] User can only see their own data

### Resources

- [Lovable Cloud Authentication Guide](https://docs.lovable.dev/features/cloud)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

---

**Remember**: Current setup is for development only. Add authentication before sharing with real users!
