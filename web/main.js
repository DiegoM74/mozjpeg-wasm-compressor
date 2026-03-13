const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const compressBtn = document.getElementById('compress-btn');
const downloadBtn = document.getElementById('download-btn');
const statusText = document.getElementById('status');
const statsDiv = document.getElementById('stats');
const imageList = document.getElementById('image-list');

let filesData = []; // [{ id, originalFile, originalBuffer, compressedBuffer, originalSize, compressedSize, previewUrl }]
let worker = null;
let isCompressing = false;

function updateStatus(text, type = 'default') {
    statusText.textContent = text;
    statusText.className = '';
    if (type !== 'default') {
        statusText.classList.add(`status-${type}`);
    }
}

// Promisified worker call
function compressImage(buffer) {
    return new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
            if (e.data.type === 'done') {
                resolve({
                    buffer: e.data.buffer,
                    originalSize: e.data.originalSize,
                    compressedSize: e.data.compressedSize
                });
            } else if (e.data.type === 'error') {
                reject(new Error(e.data.message));
            } else if (e.data.type === 'ready') {
                // Ignore ready msg here
            }
        };
        worker.onerror = (e) => {
            reject(e);
        };
        worker.postMessage({
            imageBuffer: buffer,
            quality: 84,
            progressive: 1
        });
    });
}

function initWorker() {
    const workerUrl = './worker.js?v=' + Date.now();
    worker = new Worker(workerUrl);
    worker.onmessage = (e) => {
        if (e.data.type === 'ready') {
            updateStatus("Motor MozJPEG WASM listo. Carga tus imágenes.", 'success');
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
        handleFiles(Array.from(e.dataTransfer.files));
    }
});

dropZone.addEventListener('click', () => {
    if (!isCompressing) fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFiles(Array.from(e.target.files));
    }
    fileInput.value = '';
});

function handleFiles(newFiles) {
    if (isCompressing) return;
    
    for (const file of newFiles) {
        const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        if (file.type !== 'image/jpeg') {
            filesData.push({
                id: fileId,
                originalFile: file,
                isUnsupported: true,
                errorMessage: `Omitido ${file.name}: formato no soportado`
            });
            renderList();
            continue;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            filesData.push({
                id: fileId,
                originalFile: file,
                originalBuffer: e.target.result,
                compressedBuffer: null,
                originalSize: file.size,
                compressedSize: null,
                previewUrl: URL.createObjectURL(file)
            });
            renderList();
            updateTotalStats();
            const validFiles = filesData.filter(f => !f.isUnsupported);
            compressBtn.disabled = validFiles.length === 0;
            updateStatus(`Imágenes cargadas: ${validFiles.length}`, 'info');
        };
        reader.readAsArrayBuffer(file);
    }
}

function removeFile(id) {
    if (isCompressing) return;
    const idx = filesData.findIndex(f => f.id === id);
    if (idx !== -1) {
        if (filesData[idx].previewUrl) {
            URL.revokeObjectURL(filesData[idx].previewUrl);
        }
        filesData.splice(idx, 1);
        renderList();
        updateTotalStats();
        
        const validFiles = filesData.filter(f => !f.isUnsupported);
        compressBtn.disabled = validFiles.length === 0;
        
        if (filesData.length === 0) {
            updateStatus("Esperando imágenes...", 'default');
            downloadBtn.disabled = true;
        } else if (validFiles.length > 0) {
            updateStatus(`Imágenes cargadas: ${validFiles.length}`, 'info');
        } else {
            updateStatus("Esperando imágenes válidas...", 'default');
        }
    }
}

function updateTotalStats() {
    let totalOriginal = 0;
    let totalCompressed = 0;
    
    for (const f of filesData) {
        if (f.isUnsupported) continue;
        totalOriginal += f.originalSize;
        if (f.compressedSize) {
            totalCompressed += f.compressedSize;
        }
    }
    
    if (totalOriginal === 0) {
        statsDiv.innerHTML = '';
        return;
    }
    
    const origMB = (totalOriginal / (1024 * 1024)).toFixed(2);
    if (totalCompressed > 0) {
        const compMB = (totalCompressed / (1024 * 1024)).toFixed(2);
        const ratio = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
        statsDiv.innerHTML = `<b>Total Original:</b> ${origMB} MB | <b>Total Comprimido:</b> ${compMB} MB | <b>Ahorro:</b> ${ratio}%`;
    } else {
        statsDiv.innerHTML = `<b>Total Original:</b> ${origMB} MB`;
    }
}

function renderList() {
    imageList.innerHTML = '';
    filesData.forEach(file => {
        if (file.isUnsupported) {
            const item = document.createElement('div');
            item.className = 'unsupported-item';
            
            const info = document.createElement('div');
            info.className = 'image-info';
            info.textContent = file.errorMessage;
            
            const btn = document.createElement('button');
            btn.className = 'delete-btn';
            btn.textContent = 'X';
            btn.onclick = () => removeFile(file.id);
            btn.disabled = isCompressing;
            
            item.appendChild(info);
            item.appendChild(btn);
            imageList.appendChild(item);
            return;
        }
        
        const item = document.createElement('div');
        item.className = 'image-item';
        item.id = `item-${file.id}`;
        
        const img = document.createElement('img');
        img.src = file.previewUrl;
        
        const info = document.createElement('div');
        info.className = 'image-info';
        
        const name = document.createElement('div');
        name.className = 'image-name';
        name.textContent = file.originalFile.name;
        
        const stats = document.createElement('div');
        stats.className = 'image-stats';
        
        const origKB = (file.originalSize / 1024).toFixed(2);
        if (file.compressedSize) {
            const compKB = (file.compressedSize / 1024).toFixed(2);
            const ratio = ((1 - file.compressedSize / file.originalSize) * 100).toFixed(1);
            stats.innerHTML = `Original: ${origKB} KB | <b>Comprimido: ${compKB} KB</b> (-${ratio}%)`;
        } else {
            stats.textContent = `Original: ${origKB} KB`;
        }
        
        info.appendChild(name);
        info.appendChild(stats);
        
        item.appendChild(img);
        item.appendChild(info);
        
        const btn = document.createElement('button');
        btn.className = 'delete-btn';
        btn.textContent = 'Eliminar';
        btn.onclick = () => removeFile(file.id);
        btn.disabled = isCompressing;
        
        item.appendChild(btn);
        imageList.appendChild(item);
    });
}

compressBtn.addEventListener('click', async () => {
    const validFiles = filesData.filter(f => !f.isUnsupported);
    if (validFiles.length === 0) return;
    
    isCompressing = true;
    compressBtn.disabled = true;
    downloadBtn.disabled = true;
    
    const btns = document.querySelectorAll('.delete-btn');
    btns.forEach(b => b.disabled = true);
    
    let successCount = 0;
    
    for (let i = 0; i < validFiles.length; i++) {
        const f = validFiles[i];
        updateStatus(`Comprimiendo (${i + 1}/${validFiles.length}): ${f.originalFile.name}...`, 'warning');
        
        try {
            const bufferCopy = f.originalBuffer.slice(0);
            const result = await compressImage(bufferCopy);
            f.compressedBuffer = result.buffer;
            f.compressedSize = result.compressedSize;
            successCount++;
            
            // Update individual item DOM instead of re-rendering list (to prevent re-triggering animations)
            updateFileDOM(f);
            updateTotalStats();
        } catch (err) {
            console.error(err);
        }
    }
    
    isCompressing = false;
    
    if (successCount > 0) {
        updateStatus(`¡Completado! Se comprimieron ${successCount} de ${validFiles.length} imágenes.`, 'success');
        downloadBtn.disabled = false;
    } else {
        updateStatus("Ocurrió un error al comprimir las imágenes.", 'error');
        compressBtn.disabled = false;
        renderList();
    }
});

function updateFileDOM(file) {
    const item = document.getElementById(`item-${file.id}`);
    if (item) {
        const statsEl = item.querySelector('.image-stats');
        if (statsEl) {
            const origKB = (file.originalSize / 1024).toFixed(2);
            if (file.compressedSize) {
                const compKB = (file.compressedSize / 1024).toFixed(2);
                const ratio = ((1 - file.compressedSize / file.originalSize) * 100).toFixed(1);
                statsEl.innerHTML = `Original: ${origKB} KB | <b>Comprimido: ${compKB} KB</b> (-${ratio}%)`;
            } else {
                statsEl.textContent = `Original: ${origKB} KB`;
            }
        }
    }
}

downloadBtn.addEventListener('click', async () => {
    const compressedFiles = filesData.filter(f => f.compressedBuffer);
    if (compressedFiles.length === 0) return;
    
    if (compressedFiles.length === 1) {
        // Download single file
        const f = compressedFiles[0];
        const originalName = f.originalFile.name.substring(0, f.originalFile.name.lastIndexOf('.')) || f.originalFile.name;
        const blob = new Blob([f.compressedBuffer], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${originalName}-compressed.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        // Download ZIP for multiple
        statusText.textContent = "Generando ZIP...";
        try {
            const zip = new JSZip();
            compressedFiles.forEach(f => {
                zip.file(f.originalFile.name, f.compressedBuffer);
            });
            
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = "compressed.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            updateStatus("¡ZIP Descargado!", 'success');
        } catch (err) {
            console.error(err);
            updateStatus("Error al generar el ZIP", 'error');
        }
    }
});
