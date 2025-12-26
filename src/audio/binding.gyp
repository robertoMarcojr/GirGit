{
  "targets": [
    {
      "target_name": "audio_capture",
      "sources": [
        "audio_router.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "libraries": [
        "Ole32.lib",
        "Dwmapi.lib",
        "Gdiplus.lib",
        "Dcomp.lib"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "NO"
      },
      "msvs_settings": {
        "VCCLCompilerTool": { "ExceptionHandling": 0 }
      }
    }
  ]
}
