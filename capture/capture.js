const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let screenshotImage = null;
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;

// Converts viewport CSS coordinates to canvas pixel coordinates.
// Uses getBoundingClientRect() for accurate scale and offset on any DPI setting.
function toCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
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
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    ctx.fillStyle = '#ffdc50';
    ctx.font = `${13 * scaleX}px Segoe UI, sans-serif`;
    ctx.fillText(
        `${Math.round(w / scaleX)} × ${Math.round(h / scaleY)}`,
        x + 4 * scaleX,
        y > 20 * scaleY ? y - 6 * scaleY : y + h + 18 * scaleY
    );
}

canvas.addEventListener('mousedown', e => {
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    isDrawing = true;
    startX = x;
    startY = y;
    currentX = x;
    currentY = y;
});

canvas.addEventListener('mousemove', e => {
    if (!isDrawing) {
        return;
    }
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    currentX = x;
    currentY = y;
    drawFrame();
});

canvas.addEventListener('mouseup', async e => {
    if (!isDrawing) {
        return;
    }
    isDrawing = false;

    const { x: ex, y: ey } = toCanvasCoords(e.clientX, e.clientY);
    const x = Math.min(startX, ex);
    const y = Math.min(startY, ey);
    const w = Math.abs(ex - startX);
    const h = Math.abs(ey - startY);

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
