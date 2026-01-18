"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import DailyIframe, { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    Users,
    Loader2,
    Heart,
    Shield,
    XCircle
} from "lucide-react";

interface ParticipantState {
    id: string;
    userName: string;
    videoTrack: MediaStreamTrack | null;
    audioTrack: MediaStreamTrack | null;
    isLocal: boolean;
}

function PatientVideoCall() {
    const searchParams = useSearchParams();
    const roomUrl = searchParams.get("room");
    const token = searchParams.get("t");

    const callRef = useRef<DailyCall | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [isJoining, setIsJoining] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [participants, setParticipants] = useState<ParticipantState[]>([]);
    const [callDuration, setCallDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [patientName, setPatientName] = useState("");

    // Timer for call duration
    useEffect(() => {
        if (isConnected) {
            const timer = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isConnected]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Handle participant updates
    const updateParticipants = useCallback((call: DailyCall) => {
        try {
            const participantList = call.participants();
            const newParticipants: ParticipantState[] = [];

            Object.values(participantList).forEach((p: DailyParticipant) => {
                newParticipants.push({
                    id: p.session_id,
                    userName: p.user_name || "Guest",
                    videoTrack: p.tracks?.video?.persistentTrack || null,
                    audioTrack: p.tracks?.audio?.persistentTrack || null,
                    isLocal: p.local
                });
            });

            setParticipants(newParticipants);
        } catch (e) {
            console.error("[Patient] Error updating participants:", e);
        }
    }, []);

    // Attach video tracks to elements
    useEffect(() => {
        const localParticipant = participants.find(p => p.isLocal);
        const remoteParticipant = participants.find(p => !p.isLocal);

        if (localParticipant?.videoTrack && localVideoRef.current) {
            const stream = new MediaStream([localParticipant.videoTrack]);
            localVideoRef.current.srcObject = stream;
        }

        if (remoteParticipant?.videoTrack && remoteVideoRef.current) {
            const stream = new MediaStream([remoteParticipant.videoTrack]);
            remoteVideoRef.current.srcObject = stream;
        }

        // Handle remote audio
        if (remoteParticipant?.audioTrack) {
            const audioElement = document.getElementById("remote-audio") as HTMLAudioElement;
            if (audioElement) {
                const stream = new MediaStream([remoteParticipant.audioTrack]);
                audioElement.srcObject = stream;
            }
        }
    }, [participants]);

    const cleanup = useCallback(async () => {
        if (callRef.current) {
            try {
                const state = callRef.current.meetingState();
                if (state === "joined-meeting" || state === "joining-meeting") {
                    await callRef.current.leave();
                }
                callRef.current.destroy();
            } catch (e) {
                console.error("[Patient] Cleanup error:", e);
            }
            callRef.current = null;
        }
    }, []);

    const joinCall = async () => {
        if (!roomUrl || !patientName.trim()) {
            setError("Please enter your name to join the session.");
            return;
        }

        setIsJoining(true);
        setError(null);

        try {
            // Check for existing instance
            const existingCall = DailyIframe.getCallInstance();
            if (existingCall) {
                try {
                    existingCall.destroy();
                } catch (e) {
                    console.error("[Patient] Error destroying existing:", e);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            const call = DailyIframe.createCallObject({
                audioSource: true,
                videoSource: true,
            });

            callRef.current = call;

            call.on("joined-meeting", () => {
                console.log("[Patient] Joined meeting!");
                setIsJoining(false);
                setIsConnected(true);
                updateParticipants(call);
            });

            call.on("participant-joined", () => updateParticipants(call));
            call.on("participant-left", () => updateParticipants(call));
            call.on("participant-updated", () => updateParticipants(call));
            call.on("track-started", () => updateParticipants(call));
            call.on("track-stopped", () => updateParticipants(call));

            call.on("error", (event) => {
                console.error("[Patient] Error:", event);
                setError(event?.errorMsg || "Connection error occurred");
                setIsJoining(false);
            });

            call.on("left-meeting", () => {
                setIsConnected(false);
                setIsJoining(false);
            });

            await call.join({
                url: roomUrl,
                token: token || undefined,
                userName: patientName.trim(),
            });

        } catch (err) {
            console.error("[Patient] Join error:", err);
            setError(err instanceof Error ? err.message : "Failed to join session");
            setIsJoining(false);
        }
    };

    const cancelJoin = () => {
        cleanup();
        setIsJoining(false);
    };

    const leaveCall = async () => {
        await cleanup();
        setIsConnected(false);
        setCallDuration(0);
    };

    const toggleAudio = async () => {
        if (callRef.current) {
            await callRef.current.setLocalAudio(!isAudioMuted);
            setIsAudioMuted(!isAudioMuted);
        }
    };

    const toggleVideo = async () => {
        if (callRef.current) {
            await callRef.current.setLocalVideo(!isVideoOff);
            setIsVideoOff(!isVideoOff);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    const remoteParticipant = participants.find(p => !p.isLocal);

    // No room URL provided
    if (!roomUrl) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center max-w-md">
                    <XCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
                    <h1 className="text-2xl font-black text-white mb-3">Invalid Session Link</h1>
                    <p className="text-slate-400">
                        This telehealth link appears to be invalid or expired. Please contact your healthcare provider for a new link.
                    </p>
                </div>
            </div>
        );
    }

    // Pre-join lobby
    if (!isConnected && !isJoining) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 text-center max-w-lg w-full">
                    {/* Logo/Branding */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-xl shadow-primary/30">
                            <Heart className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tight">ChartSpark</span>
                    </div>

                    <h1 className="text-2xl font-black text-white mb-2">Join Telehealth Session</h1>
                    <p className="text-slate-400 mb-8">
                        Your provider is waiting for you. Enter your name to join the video session.
                    </p>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 text-left">
                            Your Name
                        </label>
                        <input
                            type="text"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 font-medium outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                            onKeyDown={(e) => e.key === "Enter" && joinCall()}
                        />
                    </div>

                    <button
                        onClick={joinCall}
                        disabled={!patientName.trim()}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                        <Video className="h-5 w-5" />
                        Join Video Session
                    </button>

                    {/* Security badge */}
                    <div className="flex items-center justify-center gap-2 mt-8 text-emerald-400">
                        <Shield className="h-4 w-4" />
                        <span className="text-xs font-bold">HIPAA Compliant • End-to-End Encrypted</span>
                    </div>
                </div>
            </div>
        );
    }

    // Connecting state
    if (isJoining) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
                    <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                        Connecting to Session
                    </h2>
                    <p className="text-slate-400 mb-6">
                        Please wait while we connect you to your provider...
                    </p>
                    <button
                        onClick={cancelJoin}
                        className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 mx-auto"
                    >
                        <XCircle className="h-4 w-4" />
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // In-call view
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <audio id="remote-audio" autoPlay playsInline />

            {/* Main video area */}
            <div className="flex-1 relative">
                {/* Remote participant (provider) - main view */}
                {remoteParticipant?.videoTrack ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
                        <div className="h-24 w-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                            <Users className="h-12 w-12 text-white/30" />
                        </div>
                        <h3 className="text-lg font-black text-white/50 uppercase tracking-tight mb-2">
                            Waiting for Provider
                        </h3>
                        <p className="text-sm text-white/30 max-w-xs">
                            Your provider will appear here when they join the session.
                        </p>
                    </div>
                )}

                {/* Call status */}
                <div className="absolute top-4 left-4 flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-emerald-500/90 backdrop-blur-md rounded-full flex items-center gap-2 text-white">
                        <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest">
                            Connected • {formatDuration(callDuration)}
                        </span>
                    </div>
                </div>

                {/* Local video (self view) */}
                <div className="absolute bottom-24 right-4 w-32 md:w-40 aspect-video bg-slate-800 rounded-xl border-2 border-white/20 overflow-hidden shadow-2xl">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
                    />
                    {isVideoOff && (
                        <div className="w-full h-full flex items-center justify-center bg-slate-700">
                            <VideoOff className="h-6 w-6 text-white/40" />
                        </div>
                    )}
                    <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white">
                        You
                    </div>
                </div>

                {/* Call controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
                    <button
                        onClick={toggleAudio}
                        className={`p-3 rounded-xl transition-all ${isAudioMuted
                            ? "bg-red-500 text-white"
                            : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                        title={isAudioMuted ? "Unmute" : "Mute"}
                    >
                        {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    <button
                        onClick={toggleVideo}
                        className={`p-3 rounded-xl transition-all ${isVideoOff
                            ? "bg-red-500 text-white"
                            : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                        title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                    >
                        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </button>
                    <div className="w-px h-8 bg-white/10 mx-1" />
                    <button
                        onClick={leaveCall}
                        className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <PhoneOff className="h-4 w-4" />
                        Leave
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PatientJoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
        }>
            <PatientVideoCall />
        </Suspense>
    );
}
