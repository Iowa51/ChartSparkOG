"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import DailyIframe, { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Users,
    Copy,
    Check,
    Loader2,
    XCircle
} from "lucide-react";

interface DailyVideoCallProps {
    // SEC-PT4-F2: provider token delivered via HTTP-only cookie when same-site allows it.
    // providerSessionToken is an optional body fallback for cross-site hosts where the
    // cookie may be stripped. join-session accepts either.
    userName?: string;
    patientLink?: string;
    providerSessionToken?: string;
    onLeave?: () => void;
    onError?: (error: string) => void;
}

interface ParticipantState {
    id: string;
    userName: string;
    videoTrack: MediaStreamTrack | null;
    audioTrack: MediaStreamTrack | null;
    isLocal: boolean;
}

// SEC-SPRINT9: Session access kept in ref, not state, to avoid persisting
// roomUrl/meetingToken in React state beyond the moment of use.
interface SessionAccessData {
    roomUrl: string;
    token?: string;
}

export default function DailyVideoCall({
    userName = "Provider",
    patientLink,
    providerSessionToken,
    onLeave,
    onError
}: DailyVideoCallProps) {
    const callRef = useRef<DailyCall | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [isJoining, setIsJoining] = useState(true);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [participants, setParticipants] = useState<ParticipantState[]>([]);
    const [linkCopied, setLinkCopied] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [connectionQuality] = useState<"excellent" | "good" | "poor">("excellent");
    const sessionAccessRef = useRef<SessionAccessData | null>(null);
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        if (!isJoining) {
            const timer = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isJoining]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const updateParticipants = useCallback((call: DailyCall) => {
        try {
            const participantList = call.participants();
            const newParticipants: ParticipantState[] = [];

            Object.values(participantList).forEach((participant: DailyParticipant) => {
                newParticipants.push({
                    id: participant.session_id,
                    userName: participant.user_name || "Guest",
                    videoTrack: participant.tracks?.video?.persistentTrack || null,
                    audioTrack: participant.tracks?.audio?.persistentTrack || null,
                    isLocal: participant.local
                });
            });

            setParticipants(newParticipants);
        } catch {
            onError?.("Failed to update participant state");
        }
    }, [onError]);

    useEffect(() => {
        const localParticipant = participants.find(participant => participant.isLocal);
        const remoteParticipant = participants.find(participant => !participant.isLocal);

        if (localParticipant?.videoTrack && localVideoRef.current) {
            const stream = new MediaStream([localParticipant.videoTrack]);
            localVideoRef.current.srcObject = stream;
        }

        if (remoteParticipant?.videoTrack && remoteVideoRef.current) {
            const stream = new MediaStream([remoteParticipant.videoTrack]);
            remoteVideoRef.current.srcObject = stream;
        }

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
            } catch {
                onError?.("Failed to clean up telehealth session");
            }
            callRef.current = null;
        }
    }, [onError]);

    const handleCancel = useCallback(async () => {
        await cleanup();
        onLeave?.();
    }, [cleanup, onLeave]);

    useEffect(() => {
        let isMounted = true;

        const loadSession = async () => {
            try {
                // Provider token is delivered via HTTP-only cookie when same-site allows it.
                // Body fallback covers cross-site contexts where the cookie may be dropped.
                const response = await fetch("/api/telehealth/join-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ providerSessionToken }),
                });

                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload.error || "Failed to load telehealth session");
                }

                if (isMounted) {
                    sessionAccessRef.current = {
                        roomUrl: payload.roomUrl,
                        token: payload.token || undefined,
                    };
                    setSessionReady(true);
                }
            } catch (error) {
                if (isMounted) {
                    onError?.(error instanceof Error ? error.message : "Failed to load telehealth session");
                }
            }
        };

        loadSession();

        return () => {
            isMounted = false;
        };
    }, [onError, providerSessionToken]);

    useEffect(() => {
        let isMounted = true;
        let call: DailyCall | null = null;

        const initCall = async () => {
            if (!sessionReady || !sessionAccessRef.current) {
                return;
            }

            // SEC-SPRINT9: Consume session access from ref and clear immediately
            const access = sessionAccessRef.current;
            sessionAccessRef.current = null;

            try {
                const existingCall = DailyIframe.getCallInstance();
                if (existingCall) {
                    try {
                        const state = existingCall.meetingState();
                        if (state === "joined-meeting" || state === "joining-meeting") {
                            await existingCall.leave();
                        }
                        existingCall.destroy();
                    } catch {
                        onError?.("Failed to reset previous telehealth session");
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 100));

                if (!isMounted) return;

                call = DailyIframe.createCallObject({
                    audioSource: true,
                    videoSource: true,
                });

                if (!isMounted) {
                    call.destroy();
                    return;
                }

                callRef.current = call;

                call.on("joined-meeting", () => {
                    if (isMounted) {
                        setIsJoining(false);
                        updateParticipants(call!);
                    }
                });

                call.on("participant-joined", () => {
                    if (isMounted && call) updateParticipants(call);
                });

                call.on("participant-left", () => {
                    if (isMounted && call) updateParticipants(call);
                });

                call.on("participant-updated", () => {
                    if (isMounted && call) updateParticipants(call);
                });

                call.on("track-started", () => {
                    if (isMounted && call) updateParticipants(call);
                });

                call.on("track-stopped", () => {
                    if (isMounted && call) updateParticipants(call);
                });

                call.on("error", (event) => {
                    if (isMounted) {
                        onError?.(event?.errorMsg || "Unknown error occurred");
                    }
                });

                call.on("left-meeting", () => {
                    if (isMounted) {
                        onLeave?.();
                    }
                });

                await call.join({
                    url: access.roomUrl,
                    token: access.token,
                    userName: userName,
                });
            } catch (error) {
                if (isMounted) {
                    onError?.(error instanceof Error ? error.message : "Failed to join call");
                }
            }
        };

        initCall();

        return () => {
            isMounted = false;
            cleanup();
        };
    }, [sessionReady, userName, onError, onLeave, updateParticipants, cleanup]);

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

    const leaveCall = async () => {
        await cleanup();
        onLeave?.();
    };

    const copyPatientLink = () => {
        if (patientLink) {
            navigator.clipboard.writeText(patientLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }
    };

    const remoteParticipant = participants.find(participant => !participant.isLocal);

    if (isJoining) {
        return (
            <div className="h-full min-h-[400px] bg-slate-950 rounded-3xl flex flex-col items-center justify-center p-8 border border-white/10">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                    Connecting to Session
                </h3>
                <p className="text-sm text-slate-400 font-medium mb-6">
                    Initializing secure HIPAA-compliant video stream...
                </p>
                <button
                    onClick={handleCancel}
                    className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-red-500/30"
                >
                    <XCircle className="h-4 w-4" />
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <div className="h-full min-h-[400px] flex flex-col">
            <audio id="remote-audio" autoPlay playsInline />

            <div className="relative flex-1 bg-slate-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                {remoteParticipant ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                        <div className="h-24 w-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                            <Users className="h-12 w-12 text-white/30" />
                        </div>
                        <h3 className="text-lg font-black text-white/50 uppercase tracking-tight mb-2">
                            Waiting for Patient
                        </h3>
                        <p className="text-sm text-white/30 max-w-xs">
                            Share the patient link below to invite them to the session.
                        </p>
                    </div>
                )}

                <div className="absolute top-4 left-4 flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-red-500/90 backdrop-blur-md rounded-full flex items-center gap-2 text-white">
                        <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest">
                            Live • {formatDuration(callDuration)}
                        </span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md ${connectionQuality === "excellent"
                        ? "bg-emerald-500/90 text-white"
                        : connectionQuality === "good"
                            ? "bg-yellow-500/90 text-black"
                            : "bg-red-500/90 text-white"
                        }`}>
                        {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)} Connection
                    </div>
                </div>

                <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full flex items-center gap-2 text-white">
                    <Users className="h-3 w-3" />
                    <span className="text-xs font-bold">{participants.length}</span>
                </div>

                <div className="absolute bottom-20 right-4 w-40 aspect-video bg-slate-800 rounded-xl border-2 border-white/20 overflow-hidden shadow-2xl">
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
                        className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-red-500/30"
                    >
                        End Session
                    </button>
                </div>
            </div>

            {patientLink && !remoteParticipant && (
                <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">
                            Patient Invite Link
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-mono truncate overflow-hidden text-ellipsis">
                            {patientLink}
                        </p>
                    </div>
                    <button
                        onClick={copyPatientLink}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${linkCopied
                            ? "bg-emerald-500 text-white"
                            : "bg-primary text-white hover:bg-primary/90"
                            }`}
                    >
                        {linkCopied ? (
                            <>
                                <Check className="h-4 w-4" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="h-4 w-4" />
                                Copy Link
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
