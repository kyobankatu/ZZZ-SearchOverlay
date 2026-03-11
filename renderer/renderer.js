let apiBaseUrl = 'http://localhost:5000';

// Load API URL from main process
window.electronAPI.getApiUrl().then(url => {
    apiBaseUrl = url;
});

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`tab-${targetId}`).classList.add('active');
    });
});

// Close button
document.getElementById('close-btn').addEventListener('click', () => {
    window.close();
});

// --- Text Search ---

const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const textResult = document.getElementById('text-result');

async function performTextSearch() {
    const word = searchInput.value.trim();
    if (!word) {
        return;
    }

    searchBtn.disabled = true;
    textResult.innerHTML = '<span class="loading">Searching...</span>';

    try {
        const response = await fetch(`${apiBaseUrl}/get_info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        renderTextResult(data);
    } catch (err) {
        textResult.innerHTML = `<span class="error">Error: ${err.message}</span>`;
    } finally {
        searchBtn.disabled = false;
    }
}

/**
 * Renders the get_info API response into the result box.
 * @param {Object} data - Response from /get_info
 */
function renderTextResult(data) {
    const title = document.createElement('div');
    title.className = 'result-title';
    title.textContent = data.word || data.search_word || '';

    const info = document.createElement('div');
    info.textContent = data.info || '(No info returned)';

    const url = document.createElement('div');
    url.className = 'result-url';
    url.textContent = data.url || '';

    textResult.innerHTML = '';
    textResult.appendChild(title);
    textResult.appendChild(info);
    if (data.url) {
        textResult.appendChild(url);
    }
}

searchBtn.addEventListener('click', performTextSearch);
searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        performTextSearch();
    }
});

// --- Area Search ---

const areaBtn = document.getElementById('area-btn');
const areaResult = document.getElementById('area-result');

areaBtn.addEventListener('click', async () => {
    areaBtn.disabled = true;
    const result = await window.electronAPI.startAreaCapture();
    if (result && result.error === 'screen-permission-denied') {
        areaBtn.disabled = false;
        areaResult.innerHTML =
            '<span class="error">Screen recording permission is required.<br>' +
            'Please enable it in System Settings → Privacy &amp; Security → Screen Recording, then restart the app.</span>';
    }
});

// Receive cropped image from main process after area selection
window.electronAPI.onScanImage(async (dataUrl) => {
    areaBtn.disabled = false;

    // Switch to Area Search tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="area"]').classList.add('active');
    document.getElementById('tab-area').classList.add('active');

    areaResult.innerHTML = '<span class="loading">Scanning...</span>';

    try {
        const blob = await dataUrlToBlob(dataUrl);
        const formData = new FormData();
        formData.append('image', blob, 'capture.png');

        const response = await fetch(`${apiBaseUrl}/scan`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        renderScanResult(data);
    } catch (err) {
        areaResult.innerHTML = `<span class="error">Error: ${err.message}</span>`;
    }
});

/**
 * Converts a data URL string to a Blob object.
 * @param {string} dataUrl
 * @returns {Promise<Blob>}
 */
async function dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    return response.blob();
}

/**
 * Renders the scan API response into the result box.
 * @param {Object} data - Response from /scan
 */
function renderScanResult(data) {
    const items = data.filtered_in || [];

    if (!items.length) {
        areaResult.innerHTML = '<span class="error">No known ZZZ terms detected.</span>';
        return;
    }

    const container = document.createElement('div');
    container.className = 'scan-items';

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'scan-item';
        el.textContent = item;
        el.addEventListener('click', () => {
            searchInput.value = item;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelector('[data-tab="text"]').classList.add('active');
            document.getElementById('tab-text').classList.add('active');
            performTextSearch();
        });
        container.appendChild(el);
    });

    const label = document.createElement('div');
    label.className = 'result-title';
    label.textContent = `Detected terms (${items.length})`;

    areaResult.innerHTML = '';
    areaResult.appendChild(label);
    areaResult.appendChild(container);
}
