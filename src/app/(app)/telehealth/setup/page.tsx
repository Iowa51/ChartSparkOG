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
import { useState, useEffect, useRef, useCallback } from "react";

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
    const [errorType, setErrorType] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionsGranted, setPermissionsGranted] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    const getDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();

            // Only update if we actually have labels (labels are hidden until permission is granted)
            const hasLabels = devices.some(d => d.label);

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

            if (videoInputs.length > 0 && !selectedCamera) setSelectedCamera(videoInputs[0].deviceId);
            if (audioInputs.length > 0 && !selectedMic) setSelectedMic(audioInputs[0].deviceId);
            if (audioOutputs.length > 0 && !selectedSpeaker) setSelectedSpeaker(audioOutputs[0].deviceId);

            if (hasLabels) {
                setPermissionsGranted(true);
            }
        } catch (err) {
            console.error("Error getting devices:", err);
        }
    }, [selectedCamera, selectedMic, selectedSpeaker]);

    const requestPermissions = async () => {
        setIsLoading(true);
        setPermissionError(null);
        setErrorType(null);

        try {
            console.log("[Hardware] Requesting media permissions...");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // Stop tracks immediately as we only want to trigger the browser prompt
            stream.getTracks().forEach(track => track.stop());

            setPermissionsGranted(true);
            await getDevices();
            setPermissionError(null);
        } catch (err: any) {
            console.error("[Hardware] Permission error:", err);
            setErrorType(err.name);

            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setPermissionError("Camera and microphone access was denied. Please update your browser settings for this site.");
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                setPermissionError("No camera or microphone hardware was found on this device.");
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                setPermissionError("Your camera or microphone is already in use by another application.");
            } else {
                setPermissionError(`Device access error: ${err.message || "Unknown error"}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Initial check for devices and permissions
    useEffect(() => {
        const checkInitialStatus = async () => {
            // First check what we can see without asking
            await getDevices();

            // Check if we already have permissions stored in browser
            try {
                if (navigator.permissions && (navigator.permissions as any).query) {
                    const results = await Promise.all([
                        navigator.permissions.query({ name: 'camera' as any }),
                        navigator.permissions.query({ name: 'microphone' as any })
                    ]);

                    if (results.every(r => r.state === 'granted')) {
                        setPermissionsGranted(true);
                        await getDevices();
                    }
                }
            } catch (e) {
                // Background permission query not supported in all browsers
                console.log("Permission query not supported");
            }

            setIsLoading(false);
        };

        checkInitialStatus();
    }, [getDevices]);

    // Attach stream to video element when it changes
    useEffect(() => {
        if (videoRef.current && testStream) {
            videoRef.current.srcObject = testStream;
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
    }, [testStream, testActive]);

    const startTest = async () => {
        try {
            setPermissionError(null);
            setErrorType(null);

            // Stop any existing stream first
            if (testStream) {
                testStream.getTracks().forEach(track => track.stop());
            }

            // Ensure we don't pass dummy IDs
            const videoConstraint = selectedCamera && selectedCamera !== "No cameras found"
                ? { deviceId: { exact: selectedCamera } }
                : true;
            const audioConstraint = selectedMic && selectedMic !== "No microphones found"
                ? { deviceId: { exact: selectedMic } }
                : true;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraint,
                audio: audioConstraint
            });

            setTestStream(stream);
            setTestActive(true);

        } catch (err: any) {
            console.error("Error starting test:", err);
            setErrorType(err.name);
            setPermissionError(`Could not access devices: ${err.message || err.name}`);
        }
    };

    const stopTest = () => {
        if (testStream) {
            testStream.getTracks().forEach(track => track.stop());
            setTestStream(null);
        }
        setTestActive(false);

        if (videoRef.current) {
            videoRef.current.srcObject = null;
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
                {/* Permission Error / Diagnostic */}
                {permissionError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400 font-black uppercase tracking-tight">Access Denied</p>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{permissionError}</p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={requestPermissions}
                                className="px-4 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            >
                                Re-request Permissions
                            </button>
                            {errorType === "NotAllowedError" && (
                                <a
                                    href="https://support.google.com/chrome/answer/2693767"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                                >
                                    Browser Help
                                </a>
                            )}
                        </div>
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
                            <>
                                {!permissionsGranted && (
                                    <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl text-center space-y-4">
                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Permissions are required to list and select specific devices.
                                        </p>
                                        <button
                                            onClick={requestPermissions}
                                            className="px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                                        >
                                            Enable Camera & Mic
                                        </button>
                                    </div>
                                )}

                                {permissionsGranted && (
                                    <div className="space-y-4 animate-in fade-in duration-500">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Camera Source</label>
                                            <select
                                                value={selectedCamera}
                                                onChange={(e) => setSelectedCamera(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-701 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-701 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-701 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            >
                                                {speakers.length === 0 && <option>Default Speaker</option>}
                                                {speakers.map(spk => (
                                                    <option key={spk.deviceId} value={spk.deviceId}>{spk.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </>
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
                                        ref={videoRef}
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
