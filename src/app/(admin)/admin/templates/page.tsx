/**
 * Admin Template Management Page
 * Task 2.2: Template Management
 * Path: /admin/templates
 * 
 * Manage note templates for the organization:
 * - List/create/edit templates
 * - Template sharing within org
 * - Usage analytics
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    FileText,
    Plus,
    Edit,
    Trash2,
    Copy,
    Search,
    Clock,
    Users,
    Eye,
    Star,
    StarOff,
    Loader2,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    X,
    Save,
} from 'lucide-react';

interface Template {
    id: string;
    name: string;
    description?: string;
    content: string;
    type: 'SOAP' | 'H&P' | 'PROGRESS' | 'PROCEDURE' | 'DISCHARGE' | 'OTHER';
    specialty?: string;
    is_shared: boolean;
    is_default: boolean;
    created_by: string;
    creator_name?: string;
    usage_count: number;
    created_at: string;
    updated_at: string;
}

const TEMPLATE_TYPES = ['SOAP', 'H&P', 'PROGRESS', 'PROCEDURE', 'DISCHARGE', 'OTHER'] as const;

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    'SOAP': { label: 'SOAP Note', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    'H&P': { label: 'H&P', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    'PROGRESS': { label: 'Progress', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
    'PROCEDURE': { label: 'Procedure', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    'DISCHARGE': { label: 'Discharge', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    'OTHER': { label: 'Other', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
};

export default function TemplateManagementPage() {
    const supabase = createClient();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [showEditor, setShowEditor] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formType, setFormType] = useState<typeof TEMPLATE_TYPES[number]>('SOAP');
    const [formSpecialty, setFormSpecialty] = useState('');
    const [formIsShared, setFormIsShared] = useState(true);
    const [formIsDefault, setFormIsDefault] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) {
                throw new Error('Organization not found');
            }

            // Get templates for this org
            const { data, error: fetchError } = await supabase
                .from('note_templates')
                .select(`
                    id,
                    name,
                    description,
                    content,
                    type,
                    specialty,
                    is_shared,
                    is_default,
                    created_by,
                    usage_count,
                    created_at,
                    updated_at,
                    users!note_templates_created_by_fkey(first_name, last_name)
                `)
                .eq('organization_id', profile.organization_id)
                .order('usage_count', { ascending: false });

            if (fetchError) throw fetchError;

            const templatesWithCreator = (data || []).map((t: any) => ({
                ...t,
                creator_name: t.users ? `${t.users.first_name} ${t.users.last_name}` : 'Unknown',
            }));

            setTemplates(templatesWithCreator);
        } catch (err: any) {
            console.error('Error loading templates:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openEditor = (template?: Template) => {
        if (template) {
            setEditingTemplate(template);
            setFormName(template.name);
            setFormDescription(template.description || '');
            setFormContent(template.content);
            setFormType(template.type);
            setFormSpecialty(template.specialty || '');
            setFormIsShared(template.is_shared);
            setFormIsDefault(template.is_default);
        } else {
            setEditingTemplate(null);
            setFormName('');
            setFormDescription('');
            setFormContent('');
            setFormType('SOAP');
            setFormSpecialty('');
            setFormIsShared(true);
            setFormIsDefault(false);
        }
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!formName.trim() || !formContent.trim()) {
            setError('Name and content are required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            const templateData = {
                name: formName.trim(),
                description: formDescription.trim() || null,
                content: formContent,
                type: formType,
                specialty: formSpecialty.trim() || null,
                is_shared: formIsShared,
                is_default: formIsDefault,
                organization_id: profile?.organization_id,
                updated_at: new Date().toISOString(),
            };

            if (editingTemplate) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('note_templates')
                    .update(templateData)
                    .eq('id', editingTemplate.id);

                if (updateError) throw updateError;
                setSuccess('Template updated successfully');
            } else {
                // Create new
                const { error: createError } = await supabase
                    .from('note_templates')
                    .insert({
                        ...templateData,
                        created_by: user.id,
                        usage_count: 0,
                    });

                if (createError) throw createError;
                setSuccess('Template created successfully');
            }

            setShowEditor(false);
            await loadTemplates();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        setDeleting(id);
        try {
            const { error } = await supabase
                .from('note_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuccess('Template deleted');
            await loadTemplates();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeleting(null);
        }
    };

    const handleDuplicate = async (template: Template) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            const { error } = await supabase
                .from('note_templates')
                .insert({
                    name: `${template.name} (Copy)`,
                    description: template.description,
                    content: template.content,
                    type: template.type,
                    specialty: template.specialty,
                    is_shared: template.is_shared,
                    is_default: false,
                    organization_id: profile?.organization_id,
                    created_by: user.id,
                    usage_count: 0,
                });

            if (error) throw error;

            setSuccess('Template duplicated');
            await loadTemplates();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const toggleDefault = async (template: Template) => {
        try {
            const { error } = await supabase
                .from('note_templates')
                .update({ is_default: !template.is_default })
                .eq('id', template.id);

            if (error) throw error;
            await loadTemplates();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const filteredTemplates = templates.filter(t => {
        if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        return true;
    });

    const stats = {
        total: templates.length,
        shared: templates.filter(t => t.is_shared).length,
        totalUsage: templates.reduce((sum, t) => sum + t.usage_count, 0),
    };

    if (loading && templates.length === 0) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Template Management</h1>
                        <p className="text-slate-500 mt-1">Create and manage note templates for your organization</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadTemplates}
                        disabled={loading}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                    >
                        <RefreshCw className={`h-5 w-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => openEditor()}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium"
                    >
                        <Plus className="h-5 w-5" />
                        New Template
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-emerald-800 dark:text-emerald-200">{success}</p>
                    <button onClick={() => setSuccess(null)} className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-slate-500">Total Templates</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-teal-500" />
                        <span className="text-sm text-slate-500">Shared</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.shared}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-slate-500">Total Usage</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsage}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                    <option value="ALL">All Types</option>
                    {TEMPLATE_TYPES.map(type => (
                        <option key={type} value={type}>{TYPE_LABELS[type].label}</option>
                    ))}
                </select>
            </div>

            {/* Templates Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.length === 0 ? (
                    <div className="col-span-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">
                            {searchTerm || filterType !== 'ALL' ? 'No templates match your filters' : 'No templates yet'}
                        </p>
                        <button
                            onClick={() => openEditor()}
                            className="mt-4 text-teal-600 hover:underline"
                        >
                            Create your first template
                        </button>
                    </div>
                ) : (
                    filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{template.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                        {template.description || 'No description'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleDefault(template)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                >
                                    {template.is_default ? (
                                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                    ) : (
                                        <StarOff className="h-5 w-5 text-slate-300" />
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_LABELS[template.type].color}`}>
                                    {TYPE_LABELS[template.type].label}
                                </span>
                                {template.is_shared && (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                        Shared
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                                <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {template.usage_count} uses
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(template.updated_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                                <button
                                    onClick={() => openEditor(template)}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                                >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDuplicate(template)}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                                >
                                    <Copy className="h-4 w-4" />
                                    Duplicate
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    disabled={deleting === template.id}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                >
                                    {deleting === template.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingTemplate ? 'Edit Template' : 'New Template'}
                            </h2>
                            <button
                                onClick={() => setShowEditor(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Template Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            placeholder="e.g., Psychiatry Initial Evaluation"
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Type *
                                        </label>
                                        <select
                                            value={formType}
                                            onChange={(e) => setFormType(e.target.value as any)}
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                        >
                                            {TEMPLATE_TYPES.map(type => (
                                                <option key={type} value={type}>{TYPE_LABELS[type].label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        placeholder="Brief description of when to use this template"
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Specialty
                                    </label>
                                    <input
                                        type="text"
                                        value={formSpecialty}
                                        onChange={(e) => setFormSpecialty(e.target.value)}
                                        placeholder="e.g., Psychiatry, Family Medicine"
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Template Content *
                                    </label>
                                    <textarea
                                        value={formContent}
                                        onChange={(e) => setFormContent(e.target.value)}
                                        rows={12}
                                        placeholder="Enter your template content here. Use placeholders like {{patient_name}}, {{date}}, {{chief_complaint}}, etc."
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Tip: Use {'{{placeholders}}'} for dynamic content
                                    </p>
                                </div>

                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formIsShared}
                                            onChange={(e) => setFormIsShared(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-teal-600"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            Share with organization
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formIsDefault}
                                            onChange={(e) => setFormIsDefault(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-teal-600"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            Set as default for this type
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setShowEditor(false)}
                                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formName.trim() || !formContent.trim()}
                                className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {editingTemplate ? 'Save Changes' : 'Create Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
