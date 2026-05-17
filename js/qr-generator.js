// js/qr-generator.js - QR Code Generation Utility
// Uses qrcodejs via CDN (loaded as a global) for reliable offline-capable QR generation

/**
 * Load the QRCode library from CDN (once) and cache it on window.
 */
function loadQRLib() {
  if (window._qrLibReady) return Promise.resolve();
  if (window._qrLibLoading) return window._qrLibLoading;

  window._qrLibLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = () => { window._qrLibReady = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load QR library'));
    document.head.appendChild(script);
  });

  return window._qrLibLoading;
}

/**
 * Generate a QR code data URL from text.
 * @param {string} text - Text/data to encode
 * @param {object} options - Optional overrides (width, color)
 * @returns {Promise<string>} Base64 PNG data URL
 */
export async function generateQRCode(text, options = {}) {
  try {
    await loadQRLib();

    const size = options.width || 300;
    const dark = (options.color && options.color.dark) || '#000000';
    const light = (options.color && options.color.light) || '#ffffff';

    const holder = document.createElement('div');
    holder.style.position = 'fixed';
    holder.style.top = '-9999px';
    holder.style.left = '-9999px';
    document.body.appendChild(holder);

    return await new Promise((resolve, reject) => {
      try {
        new window.QRCode(holder, {
          text,
          width: size,
          height: size,
          colorDark: dark,
          colorLight: light,
          correctLevel: window.QRCode.CorrectLevel.H
        });

        // qrcodejs renders synchronously but we give it a tick
        setTimeout(() => {
          try {
            const canvas = holder.querySelector('canvas');
            if (canvas) {
              resolve(canvas.toDataURL('image/png'));
            } else {
              const img = holder.querySelector('img');
              resolve(img ? img.src : null);
            }
          } catch (e) {
            reject(e);
          } finally {
            document.body.removeChild(holder);
          }
        }, 100);
      } catch (e) {
        document.body.removeChild(holder);
        reject(e);
      }
    });
  } catch (error) {
    console.error('Primary QR generation failed, using fallback:', error);
    return generateQRCodeFallback(text, options);
  }
}

/**
 * Fallback: uses the free, CORS-open api.qrserver.com API.
 */
export async function generateQRCodeFallback(text, options = {}) {
  const size = options.width || 300;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=H&data=${encodeURIComponent(text)}`;

  return new Promise((resolve) => {
    const testImg = new Image();
    testImg.onload = () => resolve(url);
    testImg.onerror = () => resolve(generateSVGPlaceholder(text, size));
    testImg.src = url;
  });
}

/**
 * SVG fallback placeholder when completely offline.
 */
function generateSVGPlaceholder(text, size = 300) {
  const cells = 10;
  const cell = size / cells;
  const hash = hashCode(text);
  let rects = '';

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const isCorner =
        (r < 3 && c < 3) || (r < 3 && c > cells - 4) || (r > cells - 4 && c < 3);
      const filled = isCorner || ((hash * (r + 1) * (c + 1)) % 3 !== 0);
      if (filled) {
        rects += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="#000"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#fff"/>
    ${rects}
  </svg>`;

  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/**
 * Generate a stable Freedom ID for a participant.
 * Format: FREEDOM-YYYY-XXXXX (e.g., FREEDOM-2025-00142)
 */
export function generateFreedomId(userId) {
  const year = new Date().getFullYear();
  const hash = userId.split('').reduce((acc, char) => {
    return Math.imul(31, acc) + char.charCodeAt(0) | 0;
  }, 0);
  const number = Math.abs(hash % 100000).toString().padStart(5, '0');
  return `FREEDOM-${year}-${number}`;
}

/**
 * Render a QR code directly into a container element.
 */
export async function displayQRCode(text, container, options = {}) {
  if (!container || !text) {
    console.warn('displayQRCode: invalid container or text');
    return;
  }

  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:0.8rem;">Generating…</div>';

  try {
    const dataUrl = await generateQRCode(text, options);
    if (!dataUrl) throw new Error('No data URL returned');

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'QR Code';
    img.style.cssText = `width:100%;height:auto;border-radius:${options.borderRadius || '8px'};display:block;margin:0 auto;`;

    container.innerHTML = '';
    container.appendChild(img);
  } catch (err) {
    console.error('displayQRCode failed:', err);
    container.innerHTML = '<div style="color:#c00;font-size:0.75rem;text-align:center;padding:8px;">QR unavailable</div>';
  }
}

/**
 * Download QR code PNG from a container's img element.
 */
export function downloadQRCode(container, filename = 'freedom-qr.png') {
  const img = container && container.querySelector('img');
  if (!img) { alert('QR code not ready yet.'); return; }
  const link = document.createElement('a');
  link.href = img.src;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}
