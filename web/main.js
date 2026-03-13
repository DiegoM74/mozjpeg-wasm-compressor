const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const compressBtn = document.getElementById('compress-btn');
const downloadBtn = document.getElementById('download-btn');
const statusText = document.getElementById('status');
const previewImg = document.getElementById('preview');
const statsDiv = document.getElementById('stats');

let originalFile = null;
let originalBuffer = null;
let compressedBuffer = null;
let worker = null;

function updateStatus(text, type = 'default') {
    statusText.textContent = text;
    statusText.className = '';
    if (type !== 'default') {
        statusText.classList.add(`status-${type}`);
    }
}

function initWorker() {
    // CACHE-BUSTING: Agregar timestamp para forzar recarga
    const workerUrl = './worker.js?v=' + Date.now();
    worker = new Worker(workerUrl);
    
    worker.onmessage = (e) => {
        if (e.data.type === 'ready') {
            updateStatus("Motor MozJPEG WASM listo. Carga una imagen.", 'success');
        } else if (e.data.type === 'done') {
            compressedBuffer = e.data.buffer;
            const originalKB = (e.data.originalSize / 1024).toFixed(2);
            const compressedKB = (e.data.compressedSize / 1024).toFixed(2);
            const ratio = ((1 - e.data.compressedSize / e.data.originalSize) * 100).toFixed(1);
            
            updateStatus(`¡Comprimido exitosamente!`, 'success');
            statsDiv.innerHTML = `<b>Original:</b> ${originalKB} KB | <b>Comprimido:</b> ${compressedKB} KB | <b>Ahorro:</b> ${ratio}%`;
            
            downloadBtn.disabled = false;
            compressBtn.disabled = false;
            
            if (compressedBuffer) {
                const blob = new Blob([compressedBuffer], { type: 'image/jpeg' });
                previewImg.src = URL.createObjectURL(blob);
            }
        } else if (e.data.type === 'error') {
            updateStatus("Error: " + e.data.message, 'error');
            compressBtn.disabled = false;
        }
    };
}

initWorker();

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (file.type !== 'image/jpeg') {
        alert('Solo se permiten imágenes JPG');
        return;
    }
    originalFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        originalBuffer = e.target.result;
        const sizeKB = (file.size / 1024).toFixed(2);
        updateStatus(`Imagen cargada: ${sizeKB} KB`, 'info');
        compressBtn.disabled = false;
        previewImg.src = URL.createObjectURL(file);
    };
    reader.readAsArrayBuffer(file);
}

compressBtn.addEventListener('click', () => {
    if (!originalBuffer) {
        alert('Primero carga una imagen');
        return;
    }
    
    compressBtn.disabled = true;
    downloadBtn.disabled = true;
    updateStatus("Comprimiendo con MozJPEG...", 'warning');
    statsDiv.innerHTML = '';

    const bufferCopy = originalBuffer.slice(0);
    
    worker.postMessage({
        imageBuffer: bufferCopy,
        quality: 84,
        progressive: 1
    });
});

downloadBtn.addEventListener('click', () => {
    if (!compressedBuffer || !originalFile) return;

    const originalName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
    const blob = new Blob([compressedBuffer], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${originalName}-compressed.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
