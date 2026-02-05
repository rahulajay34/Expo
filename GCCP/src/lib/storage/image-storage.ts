import { createClient } from '@supabase/supabase-js';

/**
 * Image Storage Service
 * 
 * Handles uploading generated images to Supabase Storage
 * and returning public URLs for embedding in content.
 */

const BUCKET_NAME = 'generated-images';

interface UploadResult {
    url: string;
    path: string;
}

/**
 * Convert base64 string to Uint8Array for upload
 */
function base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Generate a unique filename for the image
 */
function generateFilename(mimeType: string): string {
    const extension = mimeType.split('/')[1] || 'png';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}.${extension}`;
}

/**
 * Upload a base64-encoded image to Supabase Storage
 * 
 * @param base64 - The base64-encoded image data (without data URI prefix)
 * @param mimeType - The MIME type of the image (e.g., 'image/png')
 * @returns The public URL of the uploaded image
 */
export async function uploadGeneratedImage(
    base64: string,
    mimeType: string
): Promise<UploadResult> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration missing for image storage');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const bytes = base64ToBytes(base64);
    const filename = generateFilename(mimeType);
    const path = `generations/${filename}`;

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, bytes, {
            contentType: mimeType,
            cacheControl: '31536000', // 1 year cache
            upsert: false
        });

    if (error) {
        console.error('[ImageStorage] Upload failed:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return {
        url: publicUrlData.publicUrl,
        path: data.path
    };
}

/**
 * Delete an image from storage by its path
 */
export async function deleteGeneratedImage(path: string): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration missing for image storage');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

    if (error) {
        console.error('[ImageStorage] Delete failed:', error);
        throw new Error(`Failed to delete image: ${error.message}`);
    }
}
