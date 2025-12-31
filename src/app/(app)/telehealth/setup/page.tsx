"use client";

import { Header } from "@/components/layout";
import {
    Settings,
    Video,
    Mic,
    Monitor,
    Shield,
    Camera,
    Volume2,
    CheckCircle2,
    Lock
} from "lucide-react";
import { useState } from "react";

export default function TelehealthSetupPage() {
    const [testActive, setTestActive] = useState(false);

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

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Camera Source</label>
                                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                                    <option>FaceTime HD Camera (Built-in)</option>
                                    <option>Logitech StreamCam</option>
                                    <option>OBS Virtual Camera</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Microphone Source</label>
                                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                                    <option>MacBook Pro Microphone (Built-in)</option>
                                    <option>Yeti Stereo Microphone</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Speaker Output</label>
                                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                                    <option>MacBook Pro Speakers (Built-in)</option>
                                    <option>External Headphones</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => setTestActive(!testActive)}
                            className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            {testActive ? <Volume2 className="h-4 w-4 animate-bounce" /> : <Video className="h-4 w-4" />}
                            {testActive ? "Testing in Progress..." : "Run Diagnostic Test"}
                        </button>
                    </div>

                    {/* Preview / Security Card */}
                    <div className="space-y-8">
                        {/* Video Preview Block */}
                        <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] border-4 border-white dark:border-slate-900 shadow-2xl relative overflow-hidden group">
                            {testActive ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                                    <div className="h-20 w-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                                    <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                                        Live Preview Active
                                    </div>
                                </div>
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
