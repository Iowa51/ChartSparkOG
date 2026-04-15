"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Upload,
    FileText,
    Image as ImageIcon,
    Trash2,
    Download,
    X,
    Loader2,
    CreditCard,
    User,
    Eye,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

interface PatientDocumentItem {
    id: string;
    patient_id: string;
    document_type: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    label?: string;
    created_at: string;
}

interface PatientDocumentsProps {
    patientId: string;
}

const DOCUMENT_TYPE_OPTIONS = [
    { value: "photo_id", label: "Photo ID", icon: User },
    { value: "insurance_card_front", label: "Insurance Card (Front)", icon: CreditCard },
    { value: "insurance_card_back", label: "Insurance Card (Back)", icon: CreditCard },
    { value: "other", label: "Other Document", icon: FileText },
];

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    photo_id: "Photo ID",
    insurance_card_front: "Insurance Card (Front)",
    insurance_card_back: "Insurance Card (Back)",
    other: "Other",
};

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PatientDocuments({ patientId }: PatientDocumentsProps) {
    const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState("insurance_card_front");
    const [label, setLabel] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewName, setPreviewName] = useState<string>("");
    const [previewMimeType, setPreviewMimeType] = useState<string>("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch documents
    const fetchDocuments = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/patients/${patientId}/documents`);
            if (!res.ok) throw new Error("Failed to load documents");
            const data = await res.json();
            setDocuments(data.documents || []);
        } catch (err) {
            console.error("Error loading documents:", err);
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // Clear messages after 4 seconds
    useEffect(() => {
        if (successMsg) {
            const t = setTimeout(() => setSuccessMsg(null), 4000);
            return () => clearTimeout(t);
        }
    }, [successMsg]);
    useEffect(() => {
        if (error) {
            const t = setTimeout(() => setError(null), 6000);
            return () => clearTimeout(t);
        }
    }, [error]);

    // Upload handler
    const handleUpload = async (file: File) => {
        if (uploading) return;

        // Client-side validation
        if (file.size > 5 * 1024 * 1024) {
            setError("File too large. Maximum size is 5MB.");
            return;
        }
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        if (!allowedTypes.includes(file.type)) {
            setError("File type not allowed. Accepted: JPEG, PNG, WebP, PDF.");
            return;
        }

        setUploading(true);
        setError(null);
        setUploadProgress("Uploading...");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("document_type", selectedType);
            if (label.trim()) formData.append("label", label.trim());

            const res = await fetch(`/api/patients/${patientId}/documents`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Upload failed");
            }

            setSuccessMsg("Document uploaded successfully!");
            setLabel("");
            await fetchDocuments();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
            setUploadProgress(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Drag & drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    // View document (signed URL)
    const handleView = async (doc: PatientDocumentItem) => {
        try {
            const res = await fetch(`/api/patients/${patientId}/documents/${doc.id}`);
            if (!res.ok) throw new Error("Failed to generate view URL");
            const data = await res.json();
            setPreviewUrl(data.url);
            setPreviewName(doc.file_name);
            setPreviewMimeType(doc.mime_type);
        } catch {
            setError("Failed to load document preview");
        }
    };

    // Download
    const handleDownload = async (doc: PatientDocumentItem) => {
        try {
            const res = await fetch(`/api/patients/${patientId}/documents/${doc.id}`);
            if (!res.ok) throw new Error("Failed to generate download URL");
            const data = await res.json();
            const a = document.createElement("a");
            a.href = data.url;
            a.download = doc.file_name;
            a.target = "_blank";
            a.click();
        } catch {
            setError("Failed to download document");
        }
    };

    // Delete
    const handleDelete = async (docId: string) => {
        if (!confirm("Are you sure you want to delete this document? This cannot be undone.")) return;
        setDeletingId(docId);
        try {
            const res = await fetch(`/api/patients/${patientId}/documents/${docId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete document");
            setSuccessMsg("Document deleted");
            await fetchDocuments();
        } catch {
            setError("Failed to delete document");
        } finally {
            setDeletingId(null);
        }
    };

    const isImage = (mimeType: string) => mimeType.startsWith("image/");

    return (
        <div className="space-y-6">
            {/* Status Messages */}
            {successMsg && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm animate-in fade-in duration-200">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    {successMsg}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-sm animate-in fade-in duration-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Upload Section */}
            <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Upload Document</h4>

                {/* Document Type Selector */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setSelectedType(opt.value)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${selectedType === opt.value
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                                }`}
                        >
                            <opt.icon className="h-3.5 w-3.5" />
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Optional Label */}
                <input
                    type="text"
                    placeholder="Optional label (e.g., 'Front of Aetna card')"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={200}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                />

                {/* Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${dragOver
                            ? "border-primary bg-primary/5 scale-[1.01]"
                            : uploading
                                ? "border-muted bg-muted/20 cursor-wait"
                                : "border-border hover:border-primary/40 hover:bg-muted/30"
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file);
                        }}
                        className="hidden"
                        disabled={uploading}
                    />

                    {uploading ? (
                        <>
                            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                            <p className="text-sm font-medium text-foreground">{uploadProgress}</p>
                        </>
                    ) : (
                        <>
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium text-foreground">
                                {dragOver ? "Drop file here" : "Click or drag to upload"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                JPEG, PNG, WebP, or PDF — Max 5MB
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Documents Gallery */}
            <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Uploaded Documents ({documents.length})
                </h4>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-8 bg-muted/30 border border-border rounded-xl">
                        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Upload a patient ID or insurance card above
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="group bg-background border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all"
                            >
                                {/* Thumbnail area */}
                                <button
                                    onClick={() => handleView(doc)}
                                    className="w-full h-32 flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors relative"
                                >
                                    {isImage(doc.mime_type) ? (
                                        <ImageIcon className="h-10 w-10 text-primary/40" />
                                    ) : (
                                        <FileText className="h-10 w-10 text-amber-500/40" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-black/30">
                                        <Eye className="h-6 w-6 text-white drop-shadow-lg" />
                                    </div>
                                </button>

                                {/* Info */}
                                <div className="p-3 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded mb-1">
                                                {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                                            </span>
                                            <p className="text-xs font-medium text-foreground truncate" title={doc.file_name}>
                                                {doc.label || doc.file_name}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {formatFileSize(doc.file_size)} •{" "}
                                                {new Date(doc.created_at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 pt-1 border-t border-border">
                                        <button
                                            onClick={() => handleView(doc)}
                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all"
                                        >
                                            <Eye className="h-3 w-3" />
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleDownload(doc)}
                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all"
                                        >
                                            <Download className="h-3 w-3" />
                                            Save
                                        </button>
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            disabled={deletingId === doc.id}
                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                                        >
                                            {deletingId === doc.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3 w-3" />
                                            )}
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setPreviewUrl(null)}
                >
                    <div
                        className="relative bg-background rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2 min-w-0">
                                {isImage(previewMimeType) ? (
                                    <ImageIcon className="h-4 w-4 text-primary flex-shrink-0" />
                                ) : (
                                    <FileText className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                )}
                                <span className="text-sm font-bold text-foreground truncate">{previewName}</span>
                            </div>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)] flex items-center justify-center">
                            {isImage(previewMimeType) ? (
                                <img
                                    src={previewUrl}
                                    alt={previewName}
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                                />
                            ) : (
                                <iframe
                                    src={previewUrl}
                                    title={previewName}
                                    className="w-full h-[70vh] rounded-lg border border-border"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
