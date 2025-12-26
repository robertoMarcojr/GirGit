#include "audio_router.h"
#include <functiondiscoverykeys_devpkey.h>
#include <napi.h>
#include <vector>
#include <thread>
#include <atomic>
#include <iostream>
#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>

// Global callback pointer
AudioCallback gAudioCallback = nullptr;

// Threading controls
std::atomic<bool> isCapturing{false};
std::thread captureThreadMic;
std::thread captureThreadSys;

// Thread-safe function for calling JS
Napi::ThreadSafeFunction tsfnAudioCallback;

// Forward Declarations
void WorkerThreadMain(bool isLoopback);
bool InitPipe(AudioPipe &pipe, bool loopback);
void RunPipe(AudioPipe &pipe);
void AudioCallbackHandler(float* frame, int frameSize, int sampleRate, bool isLoopback, uint64_t timestampMs, bool speech);

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

bool IsSpeech(const float *samples, int n)
{
    float energy = 0.0f;
    for (int i = 0; i < n; i++)
        energy += samples[i] * samples[i];
    energy /= n;
    return energy > 0.0005f;
}

IMMDevice *GetDeviceByName(EDataFlow flow, const wchar_t *targetName)
{
    IMMDeviceEnumerator *enumerator = nullptr;
    IMMDeviceCollection *devices = nullptr;
    IMMDevice *resultDev = nullptr;

    HRESULT hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, __uuidof(IMMDeviceEnumerator), (void **)&enumerator);
    if (FAILED(hr)) return nullptr;

    enumerator->EnumAudioEndpoints(flow, DEVICE_STATE_ACTIVE, &devices);
    if (!devices) { enumerator->Release(); return nullptr; }

    UINT count = 0;
    devices->GetCount(&count);

    for (UINT i = 0; i < count; i++)
    {
        IMMDevice *dev = nullptr;
        IPropertyStore *props = nullptr;
        PROPVARIANT name;

        PropVariantInit(&name);
        devices->Item(i, &dev);
        dev->OpenPropertyStore(STGM_READ, &props);
        props->GetValue(PKEY_Device_FriendlyName, &name);

        if (name.vt == VT_LPWSTR && name.pwszVal && wcscmp(name.pwszVal, targetName) == 0)
        {
            resultDev = dev; // Keep reference
            resultDev->AddRef(); // Ensure we hold onto it after release
            PropVariantClear(&name);
            props->Release();
            dev->Release();
            break; // Found it
        }

        PropVariantClear(&name);
        props->Release();
        dev->Release();
    }

    devices->Release();
    enumerator->Release();
    return resultDev;
}

// ----------------------------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------------------------

bool InitPipe(AudioPipe &pipe, bool loopback)
{
    HRESULT hr;

    // 1. Activate Capture Client
    hr = pipe.captureDevice->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void **)&pipe.captureClient);
    if (FAILED(hr)) return false;

    // 2. Format & Resampler Setup
    pipe.captureClient->GetMixFormat(&pipe.format);
    pipe.resampler.inRate = pipe.format->nSamplesPerSec;
    pipe.resampler.outRate = 16000;
    pipe.resampler.ratio = (double)pipe.resampler.inRate / pipe.resampler.outRate;
    pipe.resampler.cursor = 0.0;

    // 3. Initialize Capture
    DWORD flags = loopback ? AUDCLNT_STREAMFLAGS_LOOPBACK : 0;
    hr = pipe.captureClient->Initialize(AUDCLNT_SHAREMODE_SHARED, flags, 0, 0, pipe.format, nullptr);
    if (FAILED(hr)) return false;

    hr = pipe.captureClient->GetService(__uuidof(IAudioCaptureClient), (void **)&pipe.capture);
    if (FAILED(hr)) return false;

    // 4. Activate Render Client (ONLY if device exists)
    if (pipe.renderDevice != nullptr) {
        hr = pipe.renderDevice->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void **)&pipe.renderClient);
        if (SUCCEEDED(hr)) {
            // Must match capture format for simple passthrough
            hr = pipe.renderClient->Initialize(AUDCLNT_SHAREMODE_SHARED, 0, 0, 0, pipe.format, nullptr);
            if (SUCCEEDED(hr)) {
                pipe.renderClient->GetService(__uuidof(IAudioRenderClient), (void **)&pipe.render);
                pipe.renderClient->Start();
            } else {
                // If format doesn't match or init fails, disable render to avoid crash
                pipe.renderClient->Release();
                pipe.renderClient = nullptr;
            }
        }
    }

    pipe.captureClient->Start();
    return true;
}

// ----------------------------------------------------------------------
// WORKER LOGIC
// ----------------------------------------------------------------------

void RunPipe(AudioPipe& pipe)
{
    OutputDebugStringA("RunPipe started\n");
    auto& r  = pipe.resampler;
    auto& fs = pipe.frame;

    const int channels = pipe.format->nChannels;
    constexpr int FRAME_SAMPLES = 320; // 20ms @ 16kHz

    while (isCapturing.load()) // Check atomic flag
    {
        UINT32 packets = 0;
        if (FAILED(pipe.capture->GetNextPacketSize(&packets))) { Sleep(5); continue; }
        if (packets == 0) { Sleep(5); continue; }

        while (packets > 0)
        {
            BYTE* inData = nullptr;
            UINT32 frames = 0;
            DWORD flags = 0;

            if (FAILED(pipe.capture->GetBuffer(&inData, &frames, &flags, nullptr, nullptr))) break;

            // --- PASSTHROUGH (Only if render exists) ---
            if (pipe.render && pipe.renderClient) {
                BYTE* outData = nullptr;
                if (SUCCEEDED(pipe.render->GetBuffer(frames, &outData))) {
                    memcpy(outData, inData, frames * pipe.format->nBlockAlign);
                    pipe.render->ReleaseBuffer(frames, 0);
                }
            }

            // --- AI PIPELINE ---
            float* samples = (float*)inData;
            for (UINT32 i = 0; i < frames; i++) {
                float sum = 0.0f;
                for (int c = 0; c < channels; c++) sum += samples[i * channels + c];
                r.buffer.push_back(sum / channels);
            }

            // Resample
            while (r.cursor + r.ratio < r.buffer.size()) {
                int idx = (int)r.cursor;
                float frac = (float)(r.cursor - idx);
                float s1 = r.buffer[idx];
                float s2 = r.buffer[idx + 1];
                std::vector<float> singleSample = { s1 + frac * (s2 - s1) };
                fs.pending.insert(fs.pending.end(), singleSample.begin(), singleSample.end());
                r.cursor += r.ratio;
            }

            // Cleanup buffer
            int consumed = (int)r.cursor;
            if (consumed > 0) {
                r.buffer.erase(r.buffer.begin(), r.buffer.begin() + consumed);
                r.cursor -= consumed;
            }

            // Emit Frames
            while (fs.pending.size() >= FRAME_SAMPLES) {
                float frame[FRAME_SAMPLES];
                memcpy(frame, fs.pending.data(), FRAME_SAMPLES * sizeof(float));
                fs.pending.erase(fs.pending.begin(), fs.pending.begin() + FRAME_SAMPLES);

                bool speech = IsSpeech(frame, FRAME_SAMPLES);
                if (gAudioCallback) {
                    AudioCallbackHandler(frame, FRAME_SAMPLES, 16000, pipe.isLoopback, fs.timestampMs, speech);
                }
                fs.timestampMs += 20;
            }

            pipe.capture->ReleaseBuffer(frames);
            if (FAILED(pipe.capture->GetNextPacketSize(&packets))) break;
        }
    }
}

// ----------------------------------------------------------------------
// THREAD ENTRY POINT
// ----------------------------------------------------------------------

void WorkerThreadMain(bool isLoopback) {
    // 1. Initialize COM on this thread
    HRESULT hr = CoInitialize(nullptr);
    if (FAILED(hr)) return;

    AudioPipe pipe;
    pipe.isLoopback = isLoopback;

    IMMDeviceEnumerator* enumerator = nullptr;
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, __uuidof(IMMDeviceEnumerator), (void**)&enumerator);
    
    if (SUCCEEDED(hr)) {
        if (isLoopback) {
            enumerator->GetDefaultAudioEndpoint(eRender, eConsole, &pipe.captureDevice);
        } else {
            enumerator->GetDefaultAudioEndpoint(eCapture, eCommunications, &pipe.captureDevice);
        }
        
        // Optional Passthrough Device
        pipe.renderDevice = GetDeviceByName(eRender, L"CABLE Input (VB-Audio Virtual Cable)");
        enumerator->Release();
    }

    if (pipe.captureDevice && InitPipe(pipe, isLoopback)) {
        RunPipe(pipe);
    }

    // Cleanup
    if (pipe.captureDevice) pipe.captureDevice->Release();
    if (pipe.captureClient) pipe.captureClient->Release();
    if (pipe.capture) pipe.capture->Release();
    
    if (pipe.renderDevice) pipe.renderDevice->Release();
    if (pipe.renderClient) pipe.renderClient->Release();
    if (pipe.render) pipe.render->Release();
    
    if (pipe.format) CoTaskMemFree(pipe.format);

    CoUninitialize();
}

// ----------------------------------------------------------------------
// N-API BINDINGS
// ----------------------------------------------------------------------

void AudioCallbackHandler(float* frame, int frameSize, int sampleRate, bool isLoopback, uint64_t timestampMs, bool speech)
{
    if (!tsfnAudioCallback) return;

    std::vector<float> audioData(frame, frame + frameSize);
    struct AudioFrameData {
        std::vector<float> frame;
        int sampleRate;
        bool isLoopback;
        uint64_t timestampMs;
        bool speech;
    };

    AudioFrameData* data = new AudioFrameData{ std::move(audioData), sampleRate, isLoopback, timestampMs, speech };

    auto callback = [](Napi::Env env, Napi::Function jsCallback, AudioFrameData* data) {
        Napi::Buffer<float> buffer = Napi::Buffer<float>::Copy(env, data->frame.data(), data->frame.size());
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("audio", buffer);
        obj.Set("sampleRate", Napi::Number::New(env, data->sampleRate));
        obj.Set("isLoopback", Napi::Boolean::New(env, data->isLoopback));
        obj.Set("timestampMs", Napi::Number::New(env, (double)data->timestampMs));
        obj.Set("speech", Napi::Boolean::New(env, data->speech));
        jsCallback.Call({obj});
        delete data;
    };

    tsfnAudioCallback.BlockingCall(data, callback);
}

Napi::Value RegisterAudioCallback(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!info[0].IsFunction()) {
        Napi::TypeError::New(env, "Expected a function").ThrowAsJavaScriptException();
        return env.Null();
    }

    tsfnAudioCallback = Napi::ThreadSafeFunction::New(env, info[0].As<Napi::Function>(), "AudioCallback", 0, 1);
    gAudioCallback = [](const float* s, int f, int r, bool sys, uint64_t t, bool sp) {}; // Dummy lambda
    return Napi::Boolean::New(env, true);
}

Napi::Value StartCapture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (isCapturing.load()) return Napi::Boolean::New(env, false);

    isCapturing = true;

    // Launch worker threads
    if (captureThreadMic.joinable()) captureThreadMic.join();
    if (captureThreadSys.joinable()) captureThreadSys.join();

    captureThreadMic = std::thread(WorkerThreadMain, false);
    captureThreadSys = std::thread(WorkerThreadMain, true);

    return Napi::Boolean::New(env, true);
}

Napi::Value StopCapture(const Napi::CallbackInfo& info) {
    isCapturing = false; 
    return Napi::Boolean::New(info.Env(), true);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("registerAudioCallback", Napi::Function::New(env, RegisterAudioCallback));
    exports.Set("startCapture", Napi::Function::New(env, StartCapture));
    exports.Set("stopCapture", Napi::Function::New(env, StopCapture));
    return exports;
}

NODE_API_MODULE(audio_capture, Init)