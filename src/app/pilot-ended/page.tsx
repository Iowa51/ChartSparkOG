export const dynamic = 'force-dynamic';

export default function PilotEndedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
            <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg shadow-sm p-10 text-slate-800">
                <h1 className="text-2xl font-semibold mb-4">Your pilot has ended.</h1>
                <p className="text-slate-600 mb-4">
                    Thank you for participating in the ChartSparkOG pilot. Your access window has closed. Your data has been preserved and can be exported on request.
                </p>
                <p className="text-slate-600">
                    Email{' '}
                    <a
                        href="mailto:james@redark.ventures"
                        className="text-teal-700 underline hover:text-teal-800"
                    >
                        james@redark.ventures
                    </a>{' '}
                    to discuss continued access or data export.
                </p>
            </div>
        </div>
    );
}
