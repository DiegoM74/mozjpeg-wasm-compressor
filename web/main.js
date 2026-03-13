const dropZone = document.getElementById('drop-zone');
const compressBtn = document.getElementById('compress-btn');
const downloadBtn = document.getElementById('download-btn');
const statusText = document.getElementById('status');
const previewImg = document.getElementById('preview');
const statsDiv = document.getElementById('stats');

let originalFile = null;
let originalBuffer = null;
let compressedBuffer = null;
let worker = null;

function initWorker() {
    // CACHE-BUSTING: Agregar timestamp para forzar recarga
    const workerUrl = './worker.js?v=' + Date.now();
    worker = new Worker(workerUrl);
    
    worker.onmessage = (e) => {
        if (e.data.type === 'ready') {
            statusText.textContent = "✅ Motor MozJPEG WASM listo. Carga una imagen.";
            statusText.style.color = 'green';
        } else if (e.data.type === 'done') {
            compressedBuffer = e.data.buffer;
            const originalKB = (e.data.originalSize / 1024).toFixed(2);
            const compressedKB = (e.data.compressedSize / 1024).toFixed(2);
            const ratio = ((1 - e.data.compressedSize / e.data.originalSize) * 100).toFixed(1);
            
            statusText.textContent = `✅ ¡Comprimido exitosamente!`;
            statusText.style.color = 'green';
            statsDiv.innerHTML = `<strong>Original:</strong> ${originalKB} KB | <strong>Comprimido:</strong> ${compressedKB} KB | <strong>Ahorro:</strong> ${ratio}%`;
            
            downloadBtn.disabled = false;
            compressBtn.disabled = false;
            
            if (compressedBuffer) {
                const blob = new Blob([compressedBuffer], { type: 'image/jpeg' });
                previewImg.src = URL.createObjectURL(blob);
            }
        } else if (e.data.type === 'error') {
            statusText.textContent = "❌ Error: " + e.data.message;
            statusText.style.color = 'red';
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

document.getElementById('file-input').addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (file.type !== 'image/jpeg') {
        alert('⚠️ Solo se permiten imágenes JPEG');
        return;
    }
    originalFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        originalBuffer = e.target.result;
        const sizeKB = (file.size / 1024).toFixed(2);
        statusText.textContent = `📁 Imagen cargada: ${sizeKB} KB`;
        statusText.style.color = '#333';
        compressBtn.disabled = false;
        previewImg.src = URL.createObjectURL(file);
    };
    reader.readAsArrayBuffer(file);
}

compressBtn.addEventListener('click', () => {
    if (!originalBuffer) {
        alert('⚠️ Primero carga una imagen');
        return;
    }
    
    compressBtn.disabled = true;
    downloadBtn.disabled = true;
    statusText.textContent = "⏳ Comprimiendo con MozJPEG...";
    statusText.style.color = 'orange';
    statsDiv.innerHTML = '';

    const bufferCopy = originalBuffer.slice(0);
    
    worker.postMessage({
        imageBuffer: bufferCopy,
        quality: 84,
        progressive: 1
    });
});

downloadBtn.addEventListener('click', () => {
    if (!compressedBuffer) return;
    const blob = new Blob([compressedBuffer], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
