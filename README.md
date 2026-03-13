# 🖼️ MozJPEG WASM Compressor

Compresor de imágenes JPEG que funciona 100% en el navegador usando WebAssembly y MozJPEG.

## ✨ Características

- 🚀 **Sin servidor**: Todo el procesamiento ocurre en tu navegador
- 🔒 **Privacidad total**: Las imágenes nunca salen de tu dispositivo
- ⚡ **WebAssembly**: Rendimiento cercano a nativo
- 🎯 **MozJPEG**: Hasta 70% de compresión sin pérdida visible
- 📦 **Web Worker**: No bloquea la interfaz durante la compresión

## 🛠️ Tecnologías

- **MozJPEG**: Codec JPEG optimizado por Mozilla
- **Emscripten**: Compilador C/C++ a WebAssembly
- **Web Workers**: Procesamiento en segundo plano

## 🚀 Uso

1. Arrastrá una imagen JPEG al área designada
2. Hacé clic en "Comprimir"
3. Descargá la imagen optimizada

## 🏗️ Build

```bash
# Requisitos: Emscripten SDK, MozJPEG compilado

cd src/mozjpeg/build_wasm
emcmake cmake .. -DENABLE_STATIC=ON -DENABLE_SHARED=OFF -DWITH_SIMD=OFF -DWITH_TURBOJPEG=OFF -DPNG_SUPPORTED=OFF
emmake make jpeg-static

cd ../../..
emcc src/jpeg_wrapper.c \
  -I src/mozjpeg \
  -I src/mozjpeg/build_wasm \
  src/mozjpeg/build_wasm/libjpeg.a \
  -o build/jpeg_encoder.js \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall","getValue","wasmMemory"]' \
  -s EXPORTED_FUNCTIONS='["_compress_image","_malloc","_free"]' \
  -O3