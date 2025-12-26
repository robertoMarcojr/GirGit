#include <windows.h>
#include <mmdeviceapi.h>
#include <functiondiscoverykeys_devpkey.h>
#include <iostream>

#pragma comment(lib, "ole32.lib")

void ListAudioDevices(EDataFlow flow, const char* flowName) {
    HRESULT hr;
    IMMDeviceEnumerator* pEnumerator = nullptr;
    IMMDeviceCollection* pCollection = nullptr;

    hr = CoCreateInstance(
        __uuidof(MMDeviceEnumerator),
        nullptr,
        CLSCTX_ALL,
        __uuidof(IMMDeviceEnumerator),
        (void**)&pEnumerator
    );

    if (FAILED(hr)) {
        std::cerr << "Failed to create device enumerator\n";
        return;
    }

    hr = pEnumerator->EnumAudioEndpoints(
        flow,
        DEVICE_STATE_ACTIVE,
        &pCollection
    );

    if (FAILED(hr)) {
        std::cerr << "Failed to enumerate endpoints\n";
        pEnumerator->Release();
        return;
    }

    UINT count = 0;
    pCollection->GetCount(&count);

    std::cout << "\n=== " << flowName << " devices ===\n";

    for (UINT i = 0; i < count; i++) {
        IMMDevice* pDevice = nullptr;
        IPropertyStore* pProps = nullptr;
        LPWSTR deviceId = nullptr;
        PROPVARIANT varName;

        PropVariantInit(&varName);

        pCollection->Item(i, &pDevice);
        pDevice->GetId(&deviceId);
        pDevice->OpenPropertyStore(STGM_READ, &pProps);
        pProps->GetValue(PKEY_Device_FriendlyName, &varName);

        std::wcout << L"[" << i << L"] "
                   << varName.pwszVal
                   << L"\n    ID: " << deviceId << L"\n";

        PropVariantClear(&varName);
        CoTaskMemFree(deviceId);
        pProps->Release();
        pDevice->Release();
    }

    pCollection->Release();
    pEnumerator->Release();
}

int main() {
    CoInitialize(nullptr);

    ListAudioDevices(eCapture, "CAPTURE (Microphones)");
    ListAudioDevices(eRender, "RENDER (Speakers / Virtual Cables)");

    CoUninitialize();
    return 0;
}
