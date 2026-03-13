#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <jpeglib.h>
#include <jerror.h>

typedef struct {
    unsigned char* data;
    int size;
} CompressedResult;

static CompressedResult g_result = {NULL, 0};

CompressedResult* compress_image(
    unsigned char* input_buffer, 
    int input_size, 
    int quality,
    int progressive,
    int trellis,
    int trellis_dc,
    int tune_ssim,
    int optimize_scans
) {
    g_result.data = NULL;
    g_result.size = 0;
    
    struct jpeg_decompress_struct cinfo;
    struct jpeg_error_mgr jerr;
    unsigned char *buffer = NULL;
    int stride;

    cinfo.err = jpeg_std_error(&jerr);
    jpeg_create_decompress(&cinfo);

    jpeg_mem_src(&cinfo, input_buffer, input_size);
    if (jpeg_read_header(&cinfo, TRUE) != JPEG_HEADER_OK) {
        jpeg_destroy_decompress(&cinfo);
        return &g_result;
    }
    
    jpeg_start_decompress(&cinfo);

    stride = cinfo.output_width * cinfo.output_components;
    buffer = (unsigned char *)malloc(stride * cinfo.output_height);

    while (cinfo.output_scanline < cinfo.output_height) {
        unsigned char *buffer_array[1];
        buffer_array[0] = buffer + (cinfo.output_scanline) * stride;
        jpeg_read_scanlines(&cinfo, buffer_array, 1);
    }

    int width = cinfo.output_width;
    int height = cinfo.output_height;
    int components = cinfo.output_components;

    jpeg_finish_decompress(&cinfo);
    jpeg_destroy_decompress(&cinfo);

    // === CODIFICAR CON MOZJPEG ===
    struct jpeg_compress_struct cinfo_out;
    struct jpeg_error_mgr jerr_out;
    unsigned char *out_buffer = NULL;
    unsigned long out_size = 0;

    cinfo_out.err = jpeg_std_error(&jerr_out);
    jpeg_create_compress(&cinfo_out);

    jpeg_mem_dest(&cinfo_out, &out_buffer, &out_size);

    cinfo_out.image_width = width;
    cinfo_out.image_height = height;
    cinfo_out.input_components = components;
    
    if (components == 3)
        cinfo_out.in_color_space = JCS_RGB;
    else
        cinfo_out.in_color_space = JCS_GRAYSCALE;

    jpeg_set_defaults(&cinfo_out);
    jpeg_set_quality(&cinfo_out, quality, TRUE);
    
    // === OPTIMIZACIONES (las que funcionan en esta versión) ===
    cinfo_out.progressive_mode = progressive;
    cinfo_out.optimize_coding = TRUE;
    
    // Chroma subsampling 4:2:0 (mejor compresión)
    if (components == 3) {
        cinfo_out.comp_info[0].h_samp_factor = 2;
        cinfo_out.comp_info[0].v_samp_factor = 2;
        cinfo_out.comp_info[1].h_samp_factor = 1;
        cinfo_out.comp_info[1].v_samp_factor = 1;
        cinfo_out.comp_info[2].h_samp_factor = 1;
        cinfo_out.comp_info[2].v_samp_factor = 1;
    }

    jpeg_start_compress(&cinfo_out, TRUE);

    stride = width * components;
    while (cinfo_out.next_scanline < cinfo_out.image_height) {
        unsigned char *buffer_array[1];
        buffer_array[0] = buffer + (cinfo_out.next_scanline) * stride;
        jpeg_write_scanlines(&cinfo_out, buffer_array, 1);
    }

    jpeg_finish_compress(&cinfo_out);
    jpeg_destroy_compress(&cinfo_out);

    free(buffer);

    g_result.data = out_buffer;
    g_result.size = (int)out_size;

    return &g_result;
}

void free_result_data(unsigned char* ptr) {
    if (ptr) free(ptr);
}

unsigned char* get_result_data() {
    return g_result.data;
}

int get_result_size() {
    return g_result.size;
}