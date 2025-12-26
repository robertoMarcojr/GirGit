#include "audio_router.h"
#include <thread>
#include <iostream>

void TerminalAudioLogger(
    const float *data,
    int frames,
    int sampleRate,
    bool isSystem)
{
    float sum = 0.0f;
    for (int i = 0; i < frames; i++)
    {
        sum += fabs(data[i]);
    }

    float avg = sum / frames;

    if (avg > 0.001f)
    { // ignore silence
        std::cout
            << (isSystem ? "[SYSTEM] " : "[MIC] ")
            << "Level: " << avg
            << "  Frames: " << frames
            << "  SR: " << sampleRate
            << std::endl;
    }
}

// forward declarations
IMMDevice *GetDeviceByName(EDataFlow, const wchar_t *);
bool InitPipe(AudioPipe &, bool);
void RunPipe(AudioPipe &);

int main()
{
    CoInitialize(nullptr);

    IMMDeviceEnumerator *enumerator;
    CoCreateInstance(
        __uuidof(MMDeviceEnumerator),
        nullptr,
        CLSCTX_ALL,
        __uuidof(IMMDeviceEnumerator),
        (void **)&enumerator);

    AudioPipe user;
    AudioPipe system;
    user.isLoopback = false;
    system.isLoopback = true;
    // USER MIC → VB-CABLE
    enumerator->GetDefaultAudioEndpoint(
        eCapture, eCommunications, &user.captureDevice);
    user.renderDevice = GetDeviceByName(
        eRender, L"CABLE Input (VB-Audio Virtual Cable)");

    // SYSTEM AUDIO (LOOPBACK) → SAME VB-CABLE
    enumerator->GetDefaultAudioEndpoint(
        eRender, eConsole, &system.captureDevice);
    system.renderDevice = GetDeviceByName(
        eRender, L"CABLE Input (VB-Audio Virtual Cable)");

    if (!InitPipe(user, false) || !InitPipe(system, true))
    {
        std::cout << "Init failed\n";
        return 1;
    }
    // gAudioCallback = TerminalAudioLogger;
    gAudioCallback = [](auto *, int, int, bool sys,
                        uint64_t ts, bool speech)
    {
        printf("[%s] %llu ms  speech=%d\n",
               sys ? "SYSTEM" : "MIC",
               ts, speech);
    };

    std::thread t1(RunPipe, std::ref(user));
    std::thread t2(RunPipe, std::ref(system));

    std::cout << "Routing active\n";
    while (true)
    {
        Sleep(1000);
    }
}