// js/qr-generator.js - QR Code Generation Utility
// Uses the qrcode.js library from CDN for generating QR codes

/**
 * Generate a QR code data URL from text
 * @param {string} text - The text/data to encode in the QR code
 * @param {object} options - Configuration options
 * @returns {Promise<string>} - Base64 encoded data URL
 */
export async function generateQRCode(text, options = {}) {
  try {
    // Import qrcode library dynamically
    // Using unpkg CDN for qrcode library
    const QRCode = (await import('https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js')).default;
    
    const defaultOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    };

    const config = { ...defaultOptions, ...options };

    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: config.errorCorrectionLevel,
      type: config.type,
      quality: config.quality,
      margin: config.margin,
      width: config.width,
      color: config.color
    });

    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback: return a placeholder data URL or try alternative method
    return await generateQRCodeFallback(text, options);
  }
}

/**
 * Fallback QR code generation using Canvas API
 * (Simple implementation - generates a basic QR pattern)
 * For production, use a proper QR library
 */
export function generateQRCodeFallback(text, options = {}) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const size = options.width || 300;
    canvas.width = canvas.height = size;
    
    // Fill background
    ctx.fillStyle = options.color?.light || '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Add border
    ctx.fillStyle = options.color?.dark || '#000000';
    ctx.fillRect(0, 0, size, size);
    
    // Simple pattern representing the text (placeholder)
    // In production, use a proper QR library
    ctx.fillStyle = options.color?.light || '#ffffff';
    const blockSize = size / 10;
    const hash = hashCode(text);
    
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if ((hash * (i + 1) * (j + 1)) % 2 === 0) {
          ctx.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
        }
      }
    }
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error in fallback QR generation:', error);
    return null;
  }
}

/**
 * Simple hash function for fallback pattern generation
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate Freedom ID for a participant
 * Format: FREEDOM-YYYY-XXXXX (e.g., FREEDOM-2025-00142)
 */
export function generateFreedomId(userId) {
  const year = new Date().getFullYear();
  // Extract a number from userId for consistent ID generation
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const number = Math.abs(hash % 100000).toString().padStart(5, '0');
  return `FREEDOM-${year}-${number}`;
}

/**
 * Display QR code in an HTML element
 * @param {string} dataUrl - The QR code data URL
 * @param {HTMLElement} container - The element to display the QR code in
 * @param {object} options - Additional styling options
 */
export function displayQRCode(dataUrl, container, options = {}) {
  if (!container || !dataUrl) {
    console.warn('Invalid container or dataUrl provided');
    return;
  }

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'QR Code';
  img.style.maxWidth = options.maxWidth || '100%';
  img.style.width = options.width || 'auto';
  img.style.height = options.height || 'auto';
  img.style.borderRadius = options.borderRadius || '12px';
  img.style.border = options.border || 'none';

  // Clear container and add image
  container.innerHTML = '';
  container.appendChild(img);
}

/**
 * Download QR code as PNG file
 * @param {string} dataUrl - The QR code data URL
 * @param {string} filename - The filename to save as
 */
export function downloadQRCode(dataUrl, filename = 'qrcode.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
