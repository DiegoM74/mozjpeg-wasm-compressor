# Compresor JPEG WASM

Compresor de imágenes JPEG que funciona completamente en el navegador utilizando WebAssembly e integrando MozJPEG y Jpegli para compresión optimizada.

## Características

- **Sin servidor**: Todo el procesamiento ocurre localmente en tu navegador, sin necesidad de backend ni envío de datos a servidores externos.
- **Privacidad total**: Las imágenes nunca salen del dispositivo del usuario. El procesamiento se realiza 100% en cliente.
- **WebAssembly**: Rendimiento cercano al nativo mediante compilación de código C a WebAssembly con Emscripten.
- **Soporte múltiple imágenes**: Capacidad de cargar y procesar múltiples archivos JPEG simultáneamente. Las imágenes comprimidas pueden descargar individualmente o en un archivo ZIP para descarga conjunta.
- **Web Worker**: El motor de compresión corre en segundo plano, sin bloquear la interfaz de usuario durante el procesamiento.

## Arquitectura Tecnológica

El proyecto integra dos librerías de compresión JPEG trabajando en paralelo:

### MozJPEG

- Codec JPEG optimizado por Mozilla con años de desarrollo maduro.
- Implementación compilada a WebAssembly mediante Emscripten.
- Proporciona compresión confiable y de alta calidad.

### Jpegli (Próximamente)

- La librería de compresión JPEG de Google, actualmente bajo desarrollo activo.
- Se encuentra en fase de investigación preliminar para pruebas comparativas.
- Será implementado oficialmente en una versión futura cuando alcance madurez operativa.

### Enfoque de Compresión Comparativa

El objetivo del proyecto no es únicamente utilizar MozJPEG o Jpegli, sino integrar ambas librerías para realizar pruebas A/B y determinar qué técnica ofrece mejor relación entre compresión y preservación de detalles visuales según cada caso de uso específico.

## Tecnologías Utilizadas

- **MozJPEG**: Codec JPEG optimizado por Mozilla
- **Jpegli**: Codec JPEG optimizado por Google
- **Emscripten**: Compilador C/C++ a WebAssembly
- **Web Workers**: Procesamiento en segundo plano para no bloquear la interfaz
- **JSZip**: Paquetización de múltiples archivos comprimidos en ZIP

## Instalación y Uso

1. Clona el repositorio
2. Abre la carpeta `web` directamente en un navegador web moderno
3. Arrastra una o más imágenes JPEG al área designada, o haz clic para seleccionar archivos desde el sistema de archivos
4. Presiona el botón "Comprimir" cuando se hayan cargado las imágenes
5. Descarga las imágenes optimizadas individualmente o todas juntas en un ZIP presionando el botón "Descargar"

## Requisitos del Sistema

- Navegador web moderno con soporte para Web Workers y WebAssembly
- Archivos de entrada exclusivamente en formato JPEG (próximamente se soportarán otros formatos)

## Compilación del Código Fuente

El proyecto incluye código fuente compilado a WASM. Para recompilar el módulo MozJPEG WASM (próximamente comandos para Jpegli):

```bash
# Requisitos: Emscripten SDK, MozJPEG compilado
# En Windows, usar Ubuntu en WSL

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
```

## Estructura del Proyecto

```
jpeg-compressor-wasm/
├── README.md              # Este archivo de documentación
├── .gitignore             # Archivo de ignorado para git
├── build/                 # Directorio de archivos compilados
├── src/                   # Código fuente C/C++
│   ├── jpeg_wrapper.c     # Wrapper para MozJPEG WASM existente
│   ├── jpegli_wrapper.c   # Wrapper para Jpegli (futura implementación)
│   └── mozjpeg/           # Código de MozJPEG y compilación WASM
└── web/                   # Aplicación frontend
    ├── index.html         # Estructura HTML del aplicacion
    ├── main.js            # Lógica principal del JavaScript
    ├── styles.css         # Estilos CSS del interfaz
    ├── worker.js          # Web Worker para ejecución paralela
    ├── jpeg_encoder.js    # Módulo WASM compilado de MozJPEG
    └── jpeg_encoder.wasm  # Binario WASM de MozJPEG
```

## Roadmap

- **Fase Actual**: Implementación y pruebas con MozJPEG WASM.
- **Próxima Fase**: Integración oficial del módulo Jpegli para comparativa de rendimiento.
- **Futuro**: Implementación de otros codec de compresión de imágenes (PNG, WebP y AVIF).

## Licencia

Este proyecto se encuentra bajo la licencia MIT con dependencias en sus términos propios de licencia original.

---
