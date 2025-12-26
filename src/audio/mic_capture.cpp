#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <iostream>
#include <vector>
#include <cmath>

#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "avrt.lib")

#define CHECK(hr) if (FAILED(hr)) { std::cerr << "HRESULT failed: " << std::hex << hr << std::endl; return -1; }

int main() {
    CoInitialize(nullptr);

    IMMDeviceEnumerator* enumerator = nullptr;
    IMMDevice* micDevice = nullptr;
    IAudioClient* audioClient = nullptr;
    IAudioCaptureClient* captureClient = nullptr;

    HRESULT hr = CoCreateInstance(
        __uuidof(MMDeviceEnumerator),
        nullptr,
        CLSCTX_ALL,
        __uuidof(IMMDeviceEnumerator),
        (void**)&enumerator
    );
    CHECK(hr);

    // 👉 Use DEFAULT mic (safe for now)
    hr = enumerator->GetDefaultAudioEndpoint(eCapture, eCommunications, &micDevice);
    CHECK(hr);

    hr = micDevice->Activate(
        __uuidof(IAudioClient),
        CLSCTX_ALL,
        nullptr,
        (void**)&audioClient
    );
    CHECK(hr);

    WAVEFORMATEX* mixFormat = nullptr;
    hr = audioClient->GetMixFormat(&mixFormat);
    CHECK(hr);

    std::cout << "Mic format: "
              << mixFormat->nSamplesPerSec << " Hz, "
              << mixFormat->nChannels << " channels\n";

    hr = audioClient->Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        0,
        10000000, // 1s buffer
        0,
        mixFormat,
        nullptr
    );
    CHECK(hr);

    hr = audioClient->GetService(
        __uuidof(IAudioCaptureClient),
        (void**)&captureClient
    );
    CHECK(hr);

    hr = audioClient->Start();
    CHECK(hr);

    std::cout << "Mic capture started. Speak now...\n";

    while (true) {
        Sleep(50);

        UINT32 packetLength = 0;
        captureClient->GetNextPacketSize(&packetLength);

        while (packetLength > 0) {
            BYTE* data;
            UINT32 frames;
            DWORD flags;

            captureClient->GetBuffer(&data, &frames, &flags, nullptr, nullptr);

            float* samples = (float*)data;
            float rms = 0.0f;
            for (UINT32 i = 0; i < frames; i++) {
                rms += samples[i] * samples[i];
            }
            rms = std::sqrt(rms / frames);

            std::cout << "RMS: " << rms << "\r";

            captureClient->ReleaseBuffer(frames);
            captureClient->GetNextPacketSize(&packetLength);
        }
    }

    CoUninitialize();
    return 0;
}
