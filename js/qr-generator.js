// js/qr-generator.js - Enhanced QR Code Generator
export async function generateQRCode(text, options = {}) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const size = options.width || 300;
        canvas.width = size;
        canvas.height = size;

        // Use QRCode library if available, otherwise fallback
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(canvas, text, {
                width: size,
                margin: 2,
                color: {
                    dark: options.colorDark || '#1a1a2e',
                    light: options.colorLight || '#ffffff'
                }
            }, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(canvas.toDataURL('image/png'));
                }
            });
        } else {
            // Fallback: load QRCode library dynamically
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
            script.onload = () => {
                QRCode.toCanvas(canvas, text, {
                    width: size,
                    margin: 2
                }, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(canvas.toDataURL('image/png'));
                    }
                });
            };
            script.onerror = () => reject(new Error('Failed to load QR library'));
            document.head.appendChild(script);
        }
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