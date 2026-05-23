/**
 * Cloudinary image uploader utility.
 * Performs direct unsigned client-side uploads.
 * If credentials are not set, it falls back to Firebase Storage
 * or throws an error.
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/client';

export async function uploadProductImage(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Cloudinary upload request failed');
      }

      const data = await res.json();
      return data.secure_url;
    } catch (err: any) {
      console.warn('Cloudinary upload failed, attempting Firebase fallback...', err);
    }
  }

  // Fallback to Firebase Storage
  const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
  const snap = await uploadBytes(storageRef, file);
  return getDownloadURL(snap.ref);
}
