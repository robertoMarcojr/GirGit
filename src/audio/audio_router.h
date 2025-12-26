#pragma once
#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <vector>

struct Resampler {
    int inRate = 0;
    int outRate = 16000;

    double ratio = 1.0;
    double cursor = 0.0;

    std::vector<float> buffer;
};
struct FrameState {
    std::vector<float> pending;
    uint64_t timestampMs = 0;
};

struct AudioPipe {
    IMMDevice* captureDevice = nullptr;
    IMMDevice* renderDevice = nullptr;

    IAudioClient* captureClient = nullptr;
    IAudioClient* renderClient = nullptr;

    IAudioCaptureClient* capture = nullptr;
    IAudioRenderClient* render = nullptr;

    WAVEFORMATEX* format = nullptr;
    bool isLoopback = false; 
    Resampler resampler;
    FrameState frame;
};

typedef void (*AudioCallback)(
    const float* samples,
    int frames,
    int sampleRate,
    bool isSystem,
    uint64_t timestampMs,
    bool isSpeech 
);

extern AudioCallback gAudioCallback;
