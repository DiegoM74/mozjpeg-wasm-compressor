importScripts("./jpeg_encoder.js");

var wasmReady = false;
var heapU8 = null;

var Module = {
  onRuntimeInitialized: function () {
    wasmReady = true;

    if (Module.HEAPU8) {
      heapU8 = Module.HEAPU8;
    } else if (Module.wasmMemory && Module.wasmMemory.buffer) {
      heapU8 = new Uint8Array(Module.wasmMemory.buffer);
    }

    console.log("MozJPEG WASM ready");
    self.postMessage({ type: "ready" });
  },
};

self.onmessage = function (e) {
  if (!wasmReady) {
    self.postMessage({ type: "error", message: "WASM not initialized" });
    return;
  }

  const { imageBuffer, quality = 84 } = e.data;

  if (!imageBuffer || imageBuffer.byteLength === 0) {
    self.postMessage({ type: "error", message: "Empty buffer" });
    return;
  }

  const firstBytes = new Uint8Array(imageBuffer, 0, 2);
  if (firstBytes[0] !== 0xff || firstBytes[1] !== 0xd8) {
    self.postMessage({ type: "error", message: "Not a JPEG" });
    return;
  }

  try {
    const inputPtr = Module._malloc(imageBuffer.byteLength);
    const imageArray = new Uint8Array(imageBuffer);

    for (let i = 0; i < imageBuffer.byteLength; i++) {
      heapU8[inputPtr + i] = imageArray[i];
    }

    // === CONFIGURACIÓN OPTIMIZADA ===
    const progressive = 1;
    const trellis = 1;
    const trellis_dc = 1;
    const tune_ssim = 1;
    const optimize_scans = 1;

    const resultStructPtr = Module._compress_image(
      inputPtr,
      imageBuffer.byteLength,
      quality,
      progressive,
      trellis,
      trellis_dc,
      tune_ssim,
      optimize_scans,
    );

    const dataPtr =
      heapU8[resultStructPtr] |
      (heapU8[resultStructPtr + 1] << 8) |
      (heapU8[resultStructPtr + 2] << 16) |
      (heapU8[resultStructPtr + 3] << 24);
    const size =
      heapU8[resultStructPtr + 4] |
      (heapU8[resultStructPtr + 5] << 8) |
      (heapU8[resultStructPtr + 6] << 16) |
      (heapU8[resultStructPtr + 7] << 24);

    const outputBuffer = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      outputBuffer[i] = heapU8[dataPtr + i];
    }

    Module._free(inputPtr);

    self.postMessage(
      {
        type: "done",
        buffer: outputBuffer.buffer,
        originalSize: imageBuffer.byteLength,
        compressedSize: size,
      },
      [outputBuffer.buffer],
    );
  } catch (err) {
    console.error("Error:", err);
    self.postMessage({ type: "error", message: err.message });
  }
};
