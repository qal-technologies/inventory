/**
 * Server-side Cloudinary utilities.
 * Uses the Cloudinary Admin API (signed requests) to delete assets.
 * Required env vars (server-only, never expose to client):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Note: We derive CLOUDINARY_CLOUD_NAME from NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME too.
 */

import crypto from 'crypto';

function getCloudinaryConfig() {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return { cloudName, apiKey, apiSecret };
}

/**
 * Extract the Cloudinary public_id from a secure_url.
 * Example: "https://res.cloudinary.com/mycloud/image/upload/v1234/products/abc123.jpg"
 * → "products/abc123"
 */
export function extractPublicId(url: string): string | null {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    // Pattern: .../upload/[vXXXXX/]<public_id>.<ext>
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z]{2,5})?$/);
    if (!match) return null;
    return match[1];
  } catch {
    return null;
  }
}

/**
 * Delete a Cloudinary asset by its secure_url using the Admin API.
 * Safe to call — silently succeeds if credentials are missing or URL is not from Cloudinary.
 */
export async function deleteCloudinaryImage(imageUrl: string): Promise<boolean> {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return true; // not a cloudinary image, skip

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('[Cloudinary] Missing API credentials — image not deleted from Cloudinary.');
    return false;
  }

  const publicId = extractPublicId(imageUrl);
  if (!publicId) {
    console.warn('[Cloudinary] Could not extract public_id from URL:', imageUrl);
    return false;
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    const formData = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
    });

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      }
    );

    const data = await res.json();
    if (data.result === 'ok') {
      console.log(`[Cloudinary] Deleted image: ${publicId}`);
      return true;
    } else if (data.result === 'not found') {
      console.log(`[Cloudinary] Image not found (already deleted?): ${publicId}`);
      return true; // treat as success
    } else {
      console.warn('[Cloudinary] Delete returned unexpected result:', data);
      return false;
    }
  } catch (err) {
    console.error('[Cloudinary] Error deleting image:', err);
    return false;
  }
}
