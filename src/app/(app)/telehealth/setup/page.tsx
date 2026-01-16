"use client";

import { Header } from "@/components/layout";
import {
    Settings,
    Video,
    Mic,
    Monitor,
    Camera,
    Volume2,
    CheckCircle2,
    Lock,
    AlertCircle,
    Loader2
} from "lucide-react";
import { useState, useEffect } from "react";

interface DeviceInfo {
    deviceId: string;
    label: string;
    kind: MediaDeviceKind;
}

export default function TelehealthSetupPage() {
    const [testActive, setTestActive] = useState(false);
    const [testStream, setTestStream] = useState<MediaStream | null>(null);
    const [cameras, setCameras] = useState<DeviceInfo[]>([]);
    const [microphones, setMicrophones] = useState<DeviceInfo[]>([]);
    const [speakers, setSpeakers] = useState<DeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>("");
    const [selectedMic, setSelectedMic] = useState<string>("");
    const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Get available devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permission first to get device labels
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                stream.getTracks().forEach(track => track.stop());

                const devices = await navigator.mediaDevices.enumerateDevices();

                const videoInputs = devices.filter(d => d.kind === "videoinput").map(d => ({
                    deviceId: d.deviceId,
                    label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
                    kind: d.kind
                }));

                const audioInputs = devices.filter(d => d.kind === "audioinput").map(d => ({
                    deviceId: d.deviceId,
                    label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
                    kind: d.kind
                }));

                const audioOutputs = devices.filter(d => d.kind === "audiooutput").map(d => ({
                    deviceId: d.deviceId,
                    label: d.label || `Speaker ${d.deviceId.slice(0, 8)}`,
                    kind: d.kind
                }));

                setCameras(videoInputs);
                setMicrophones(audioInputs);
                setSpeakers(audioOutputs);

                if (videoInputs.length > 0) setSelectedCamera(videoInputs[0].deviceId);
                if (audioInputs.length > 0) setSelectedMic(audioInputs[0].deviceId);
                if (audioOutputs.length > 0) setSelectedSpeaker(audioOutputs[0].deviceId);

                setPermissionError(null);
            } catch (err) {
                console.error("Error getting devices:", err);
                setPermissionError("Please allow camera and microphone access to configure devices.");
            } finally {
                setIsLoading(false);
            }
        };

        getDevices();
    }, []);

    const startTest = async () => {
        try {
            setPermissionError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
                audio: selectedMic ? { deviceId: { exact: selectedMic } } : true
            });
            setTestStream(stream);
            setTestActive(true);

            // Play to video preview
            const videoElement = document.getElementById("camera-preview") as HTMLVideoElement;
            if (videoElement) {
                videoElement.srcObject = stream;
            }
        } catch (err) {
            console.error("Error starting test:", err);
            setPermissionError("Could not access camera or microphone. Please check permissions.");
        }
    };

    const stopTest = () => {
        if (testStream) {
            testStream.getTracks().forEach(track => track.stop());
            setTestStream(null);
        }
        setTestActive(false);

        const videoElement = document.getElementById("camera-preview") as HTMLVideoElement;
        if (videoElement) {
            videoElement.srcObject = null;
        }
    };

    const handleTest = () => {
        if (testActive) {
            stopTest();
        } else {
            startTest();
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (testStream) {
                testStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [testStream]);

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Telehealth Settings"
                description="Configure your audio, video, and security preferences for virtual sessions."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Telehealth", href: "/telehealth" },
                    { label: "Settings" },
                ]}
            />

            <div className="flex-1 overflow-y-auto p-6 lg:px-10 lg:py-8 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Permission Error */}
                {permissionError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">{permissionError}</p>
                    </div>
                )}

                {/* Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Device Settings */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Settings className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Hardware Configuration</h2>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Camera Source</label>
                                    <select
                                        value={selectedCamera}
                                        onChange={(e) => setSelectedCamera(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    >
                                        {cameras.length === 0 && <option>No cameras found</option>}
                                        {cameras.map(cam => (
                                            <option key={cam.deviceId} value={cam.deviceId}>{cam.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Microphone Source</label>
                                    <select
                                        value={selectedMic}
                                        onChange={(e) => setSelectedMic(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    >
                                        {microphones.length === 0 && <option>No microphones found</option>}
                                        {microphones.map(mic => (
                                            <option key={mic.deviceId} value={mic.deviceId}>{mic.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Speaker Output</label>
                                    <select
                                        value={selectedSpeaker}
                                        onChange={(e) => setSelectedSpeaker(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    >
                                        {speakers.length === 0 && <option>Default Speaker</option>}
                                        {speakers.map(spk => (
                                            <option key={spk.deviceId} value={spk.deviceId}>{spk.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleTest}
                            disabled={isLoading}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-2 ${testActive
                                    ? "bg-red-500 text-white hover:bg-red-600"
                                    : "bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {testActive ? (
                                <>
                                    <Volume2 className="h-4 w-4 animate-bounce" />
                                    Stop Test
                                </>
                            ) : (
                                <>
                                    <Video className="h-4 w-4" />
                                    Run Diagnostic Test
                                </>
                            )}
                        </button>
                    </div>

                    {/* Preview / Security Card */}
                    <div className="space-y-8">
                        {/* Video Preview Block */}
                        <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] border-4 border-white dark:border-slate-900 shadow-2xl relative overflow-hidden group">
                            {testActive ? (
                                <>
                                    <video
                                        id="camera-preview"
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                        Live Preview Active
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                    <Camera className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
                                    <p className="text-xs font-bold text-slate-400">Camera preview is disabled.<br />Run diagnostic to check feed.</p>
                                </div>
                            )}
                        </div>

                        {/* Security Policy */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Lock className="h-5 w-5 text-emerald-500" />
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest">E2E Encryption Active</h3>
                            </div>
                            <p className="text-[11px] text-emerald-800/70 dark:text-emerald-400/70 font-medium leading-relaxed">
                                Your telehealth stream is protected by military-grade AES-256 encryption. This organization enforces strict HIPAA compliance for all clinical communications.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-primary" />
                        Session Preferences
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Blur Background</span>
                                <input type="checkbox" className="w-10 h-5 appearance-none bg-slate-300 checked:bg-primary rounded-full relative cursor-pointer outline-none transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-all checked:after:left-6" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Auto-Record (Internal Only)</span>
                                <input type="checkbox" className="w-10 h-5 appearance-none bg-slate-300 checked:bg-primary rounded-full relative cursor-pointer outline-none transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-all checked:after:left-6" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Share Screen Permissions</span>
                                <input type="checkbox" defaultChecked className="w-10 h-5 appearance-none bg-slate-300 checked:bg-primary rounded-full relative cursor-pointer outline-none transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-all checked:after:left-6" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Waiting Room Enabled</span>
                                <input type="checkbox" defaultChecked className="w-10 h-5 appearance-none bg-slate-300 checked:bg-primary rounded-full relative cursor-pointer outline-none transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-all checked:after:left-6" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Footer */}
                <div className="flex items-center justify-center pt-4">
                    <button className="px-12 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5" />
                        Apply Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
