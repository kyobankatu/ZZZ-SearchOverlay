const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let screenshotImage = null;
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;

// Returns the ratio of canvas pixels to CSS pixels.
// desktopCapturer may return physical-pixel images on HiDPI/Retina displays,
// so we need this scale to map mouse coordinates (CSS pixels) to canvas pixels.
function getScale() {
    if (!screenshotImage) {
        return 1;
    }
    return screenshotImage.width / window.innerWidth;
}

// Receive the screenshot from the main process and draw it on the canvas
window.captureAPI.onScreenshot(dataUrl => {
    const img = new Image();
    img.onload = () => {
        screenshotImage = img;
        canvas.width = img.width;
        canvas.height = img.height;
        drawFrame();
    };
    img.src = dataUrl;
});

/**
 * Redraws the canvas: screenshot + dark overlay + selection rectangle.
 */
function drawFrame() {
    if (!screenshotImage) {
        return;
    }

    // Draw screenshot
    ctx.drawImage(screenshotImage, 0, 0);

    if (!isDrawing) {
        return;
    }

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    // Dark overlay outside selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear the selected area so it shows through
    ctx.clearRect(x, y, w, h);
    ctx.drawImage(screenshotImage, x, y, w, h, x, y, w, h);

    // Selection border
    ctx.strokeStyle = '#ffdc50';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Size label (show logical pixels so the number matches visual size)
    const scale = screenshotImage ? screenshotImage.width / window.innerWidth : 1;
    ctx.fillStyle = '#ffdc50';
    ctx.font = `${13 * scale}px Segoe UI, sans-serif`;
    ctx.fillText(
        `${Math.round(w / scale)} × ${Math.round(h / scale)}`,
        x + 4 * scale,
        y > 20 * scale ? y - 6 * scale : y + h + 18 * scale
    );
}

canvas.addEventListener('mousedown', e => {
    const scale = getScale();
    isDrawing = true;
    startX = e.clientX * scale;
    startY = e.clientY * scale;
    currentX = startX;
    currentY = startY;
});

canvas.addEventListener('mousemove', e => {
    if (!isDrawing) {
        return;
    }
    const scale = getScale();
    currentX = e.clientX * scale;
    currentY = e.clientY * scale;
    drawFrame();
});

canvas.addEventListener('mouseup', async e => {
    if (!isDrawing) {
        return;
    }
    isDrawing = false;

    const scale = getScale();
    const x = Math.min(startX, e.clientX * scale);
    const y = Math.min(startY, e.clientY * scale);
    const w = Math.abs(e.clientX * scale - startX);
    const h = Math.abs(e.clientY * scale - startY);

    // Ignore tiny accidental clicks
    if (w < 10 || h < 10) {
        drawFrame();
        return;
    }

    const croppedDataUrl = cropSelection(x, y, w, h);
    await window.captureAPI.submitSelection(croppedDataUrl);
});

/**
 * Crops the selected region from the screenshot and returns it as a data URL.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {string} PNG data URL of the cropped region
 */
function cropSelection(x, y, w, h) {
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(screenshotImage, x, y, w, h, 0, 0, w, h);
    return offscreen.toDataURL('image/png');
}

// Cancel on Esc
document.addEventListener('keydown', async e => {
    if (e.key === 'Escape') {
        await window.captureAPI.cancel();
    }
});
