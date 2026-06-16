const socket = io(`http://${window.location.host}`);

// DOM references
const videoFeed     = document.getElementById('videoFeed');
const captureCanvas = document.getElementById('captureCanvas');
const statusOverlay = document.getElementById('statusOverlay');
const flashEl       = document.getElementById('flash');
const pickFolderBtn = document.getElementById('pickFolderBtn');
const folderStatus  = document.getElementById('folderStatus');
const captureBtn    = document.getElementById('captureBtn');
const captureCount  = document.getElementById('captureCount');
const lastFile      = document.getElementById('lastFile');
const compatNote    = document.getElementById('compatNote');

// State
let directoryHandle  = null;
let imageCounter     = 1;
let holdTimer        = null;
let isHolding        = false;
let continuousActive = false;
let continuousTimer  = null;
let latestImageSrc   = null;   // most recent base64 data URL

// ------------------------------------------------------------------ //
// Detect File System Access API availability
// (requires secure context: HTTPS or localhost)
// ------------------------------------------------------------------ //
const fsaSupported = typeof window.showDirectoryPicker === 'function';

if (!fsaSupported) {
    compatNote.textContent =
        'Ordnerauswahl nicht verfügbar (HTTP-Kontext). ' +
        'Bilder werden automatisch in den Download-Ordner gespeichert.';
    pickFolderBtn.textContent = 'Download-Modus aktiv';
    pickFolderBtn.disabled = true;
    captureBtn.disabled = false;   // allow capturing without folder selection
}

// ------------------------------------------------------------------ //
// Socket.IO events
// ------------------------------------------------------------------ //

socket.on('connect', () => {
    statusOverlay.classList.add('hidden');
});

socket.on('disconnect', () => {
    statusOverlay.textContent = 'Verbindung unterbrochen';
    statusOverlay.classList.remove('hidden');
});

socket.on('frame', (data) => {
    const src = `data:image/jpeg;base64,${data.image}`;
    videoFeed.src = src;
    latestImageSrc = src;
});

socket.on('webcam_error', (data) => {
    statusOverlay.textContent = data.message;
    statusOverlay.classList.remove('hidden');
});

// ------------------------------------------------------------------ //
// Folder picker (only in secure contexts)
// ------------------------------------------------------------------ //

pickFolderBtn.addEventListener('click', async () => {
    if (!fsaSupported) return;
    try {
        directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        // Scan existing files to continue numbering
        imageCounter = await getNextImageNumber(directoryHandle);
        folderStatus.textContent = `"${directoryHandle.name}" – nächste Nummer: ${imageCounter}`;
        captureBtn.disabled = false;
    } catch (e) {
        if (e.name !== 'AbortError') {
            folderStatus.textContent = `Fehler: ${e.message}`;
        }
    }
});

async function getNextImageNumber(dirHandle) {
    let max = 0;
    for await (const [name] of dirHandle.entries()) {
        const m = name.match(/^(\d+)\.jpg$/i);
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max + 1;
}

// ------------------------------------------------------------------ //
// Save one frame – File System Access API or download fallback
// ------------------------------------------------------------------ //

async function captureFrame() {
    if (!latestImageSrc) return;

    // Draw latest frame onto canvas
    const img = new Image();
    img.src = latestImageSrc;
    await new Promise(resolve => { img.onload = resolve; });

    captureCanvas.width  = img.naturalWidth;
    captureCanvas.height = img.naturalHeight;
    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise(resolve =>
        captureCanvas.toBlob(resolve, 'image/jpeg', 0.92)
    );

    const filename = String(imageCounter).padStart(6, '0') + '.jpg';

    try {
        if (fsaSupported && directoryHandle) {
            // Write directly into the chosen folder
            const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
            const writable   = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
        } else {
            // Fallback: trigger browser download
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        imageCounter++;
        captureCount.textContent = imageCounter - 1;
        lastFile.textContent     = filename;
        triggerFlash();
    } catch (e) {
        lastFile.textContent = `Fehler: ${e.message}`;
    }
}

// ------------------------------------------------------------------ //
// Capture button – single click or hold for continuous
// ------------------------------------------------------------------ //

function startPress() {
    if (isHolding) return;
    isHolding = true;
    captureBtn.classList.add('active');

    // Capture one frame immediately
    captureFrame();

    // After 400 ms switch to continuous mode (~10 fps)
    holdTimer = setTimeout(() => {
        continuousActive = true;
        continuousTimer = setInterval(captureFrame, 100);
    }, 400);
}

function endPress() {
    if (!isHolding) return;
    isHolding = false;
    captureBtn.classList.remove('active');

    clearTimeout(holdTimer);
    holdTimer = null;

    if (continuousActive) {
        clearInterval(continuousTimer);
        continuousTimer  = null;
        continuousActive = false;
    }
}

// Mouse events
captureBtn.addEventListener('mousedown',  (e) => { e.preventDefault(); startPress(); });
captureBtn.addEventListener('mouseup',    endPress);
captureBtn.addEventListener('mouseleave', endPress);

// Touch events
captureBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startPress(); }, { passive: false });
captureBtn.addEventListener('touchend',   (e) => { e.preventDefault(); endPress();   }, { passive: false });
captureBtn.addEventListener('touchcancel',(e) => { e.preventDefault(); endPress();   }, { passive: false });

// ------------------------------------------------------------------ //
// Visual helpers
// ------------------------------------------------------------------ //

function triggerFlash() {
    flashEl.classList.add('active');
    setTimeout(() => flashEl.classList.remove('active'), 120);
}
