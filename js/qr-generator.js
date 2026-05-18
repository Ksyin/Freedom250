// js/qr-generator.js - QR Code Generator for Freedom 250
// NOTE: generateQRCode is called from auth.js during signup to store a data URL
// in Firestore. However, when called from auth context (no DOM), it may not have
// the QRCode library available — in that case it returns null gracefully and the
// dashboard re-renders the QR locally from the freedomId instead.

export async function generateQRCode(text, options = {}) {
    // If QRCode library is not available (e.g. called during auth init before DOM),
    // return null so the caller can skip storing and let the dashboard render it.
    if (typeof QRCode === 'undefined') {
        console.warn('[QR] QRCode library not available, skipping generation');
        return null;
    }

    return new Promise((resolve, reject) => {
        const size = options.width || 300;
        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, text, {
            width: size,
            margin: 2,
            color: {
                dark: options.colorDark || '#1a1a2e',
                light: options.colorLight || '#ffffff'
            },
            errorCorrectionLevel: 'M'
        }, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve(canvas.toDataURL('image/png'));
            }
        });
    });
}

export function generateFreedomId(userId) {
    const year = new Date().getFullYear();
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash) + userId.charCodeAt(i);
        hash |= 0;
    }
    const num = Math.abs(hash % 100000).toString().padStart(5, '0');
    return `FREEDOM-${year}-${num}`;
}

export function displayQRCode(qrDataUrl, container, options = {}) {
    if (!container) return;
    const img = document.createElement('img');
    img.src = qrDataUrl;
    img.alt = 'QR Code';
    img.style.width = options.width || '100%';
    img.style.height = options.height || '100%';
    img.style.objectFit = 'contain';
    container.innerHTML = '';
    container.appendChild(img);
}

export async function renderQRInto(container, text, opts = {}) {
    if (!container || !text) return;
    try {
        const dataUrl = await generateQRCode(text, { width: opts.width || 200 });
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        container.innerHTML = '';
        container.appendChild(img);
    } catch (err) {
        console.error('QR render error:', err);
        container.innerHTML = '<i class="fas fa-qrcode" style="font-size: 2.5rem; color: #ccc;"></i>';
    }
}