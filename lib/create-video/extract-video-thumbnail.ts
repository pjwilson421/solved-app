/**
 * Extracts the first frame from a video data URL as a thumbnail image data URL.
 * Uses HTML5 video element and canvas to capture the first frame.
 */

export async function extractVideoThumbnail(videoDataUrl: string): Promise<string | null> {
  try {
    // Create a video element
    const video = document.createElement('video');
    video.src = videoDataUrl;
    video.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video thumbnail extraction timeout'));
      }, 10000); // 10 second timeout
      
      video.addEventListener('loadedmetadata', () => {
        try {
          // Create a canvas element
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            clearTimeout(timeout);
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Seek to the first frame (time 0)
          video.currentTime = 0;
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
      
      video.addEventListener('seeked', () => {
        try {
          // Draw the current frame to canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            clearTimeout(timeout);
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to data URL
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          clearTimeout(timeout);
          resolve(thumbnailDataUrl);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
      
      video.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('Video loading error'));
      });
      
      // Start loading the video
      video.load();
    });
  } catch (error) {
    console.error('Failed to extract video thumbnail:', error);
    return null;
  }
}

/**
 * Extracts thumbnail from video data URL with fallback handling.
 * Returns null if extraction fails, allowing graceful fallback.
 */
export async function extractVideoThumbnailWithFallback(videoDataUrl: string): Promise<string | null> {
  try {
    return await extractVideoThumbnail(videoDataUrl);
  } catch (error) {
    console.warn('Video thumbnail extraction failed, using fallback:', error);
    return null;
  }
}
