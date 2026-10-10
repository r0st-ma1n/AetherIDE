// VST3 entry point of a plugin module. aether_add_plugin(... FORMATS VST3) compiles this
// file into the plugin's .vst3 together with the plugin code, which provides
// aether::pluginFactory() through AETHER_PLUGIN.
#include "aether/PluginFactory.h"
#include "aether/vst3/Vst3Effect.h"
#include "aether/vst3/Vst3Ids.h"

#include "pluginterfaces/base/funknown.h"
#include "pluginterfaces/vst/ivstaudioprocessor.h"
#include "pluginterfaces/vst/ivstcomponent.h"
#include "pluginterfaces/vst/vsttypes.h"
#include "public.sdk/source/main/pluginfactory.h"

#include <exception>
#include <string>

using namespace Steinberg;

namespace {

FUnknown* createEffect(void* /*context*/) {
    try {
        auto* effect = new aether::vst3::Vst3Effect(aether::pluginFactory().create());
        return static_cast<Vst::IAudioProcessor*>(effect);
    } catch (const std::exception&) {
        // Exceptions must not cross into the host; it sees a failed instantiation.
        return nullptr;
    }
}

IPluginFactory* createFactory() {
    const aether::PluginInfo info = aether::pluginFactory().info();
    aether::validatePluginInfo(info);

    const PFactoryInfo factoryInfo(info.vendor.c_str(), info.url.c_str(), info.email.c_str(),
                                   Vst::kDefaultFactoryFlags);
    auto* factory = new CPluginFactory(factoryInfo);

    // FUID(l1, l2, l3, l4) lays the bytes out per platform (COM GUID order on Windows), so the
    // class ID reads the same everywhere: the hex of componentClassId().
    const auto bytes = aether::vst3::componentClassId(info.id);
    const auto word = [&bytes](std::size_t i) {
        return (static_cast<uint32>(bytes[i]) << 24) | (static_cast<uint32>(bytes[i + 1]) << 16) |
               (static_cast<uint32>(bytes[i + 2]) << 8) | static_cast<uint32>(bytes[i + 3]);
    };
    TUID cid;
    FUID(word(0), word(4), word(8), word(12)).toTUID(cid);
    // v1 has effects only (PluginCategory::Effect).
    const std::string version = info.version.toString();
    const PClassInfo2 classInfo(cid, PClassInfo::kManyInstances, kVstAudioEffectClass,
                                info.name.c_str(), 0, Vst::PlugType::kFx, info.vendor.c_str(),
                                version.c_str(), kVstVersionString);
    factory->registerClass(&classInfo, createEffect);
    return factory;
}

} // namespace

SMTG_EXPORT_SYMBOL IPluginFactory* PLUGIN_API GetPluginFactory() {
    if (gPluginFactory == nullptr) {
        try {
            gPluginFactory = static_cast<CPluginFactory*>(createFactory());
        } catch (const std::exception&) {
            return nullptr; // invalid PluginInfo; the host skips the module
        }
        return gPluginFactory;
    }
    gPluginFactory->addRef();
    return gPluginFactory;
}
