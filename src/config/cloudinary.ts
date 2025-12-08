import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

/**
 * Upload image to Cloudinary
 * @param imageBase64 - Base64 encoded image string (with or without data URL prefix)
 * @param folder - Optional folder path in Cloudinary
 * @returns Promise with uploaded image URL
 */
export const uploadImage = async (
  imageBase64: string,
  folder: string = 'eventa/gallery'
): Promise<string> => {
  try {
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64Data}`,
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Max dimensions
          { quality: 'auto' }, // Auto optimize quality
          { format: 'auto' }, // Auto format (webp when supported)
        ],
      }
    );

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Upload video to Cloudinary
 * @param videoBase64 - Base64 encoded video string
 * @param folder - Optional folder path in Cloudinary
 * @returns Promise with uploaded video URL
 */
export const uploadVideo = async (
  videoBase64: string,
  folder: string = 'eventa/gallery'
): Promise<string> => {
  try {
    // Remove data URL prefix if present
    const base64Data = videoBase64.includes(',')
      ? videoBase64.split(',')[1]
      : videoBase64;

    const result = await cloudinary.uploader.upload(
      `data:video/mp4;base64,${base64Data}`,
      {
        folder,
        resource_type: 'video',
        transformation: [
          { width: 1920, height: 1080, crop: 'limit' }, // Max dimensions
          { quality: 'auto' },
        ],
      }
    );

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
    throw new Error('Failed to upload video');
  }
};

/**
 * Delete image/video from Cloudinary
 * @param publicId - Cloudinary public ID (extracted from URL)
 */
export const deleteMedia = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting media from Cloudinary:', error);
    throw new Error('Failed to delete media');
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID
 */
export const extractPublicId = (url: string): string | null => {
  try {
    const match = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp|mp4|mov)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

