-- Create storage bucket for therapist images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('therapist-images', 'therapist-images', true);

-- Create policy for public access to images
CREATE POLICY "Anyone can view therapist images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'therapist-images');

-- Create policy for users to upload their own images
CREATE POLICY "Users can upload therapist images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'therapist-images');