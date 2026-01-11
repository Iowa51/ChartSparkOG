import { NextRequest, NextResponse } from 'next/server';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';

export async function POST(request: NextRequest) {
    try {
        const { message, conversationHistory = [] } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Use safe Azure OpenAI wrapper (falls back to demo if not configured)
        const response = await safeAzureOpenAI.chat(message, conversationHistory);

        return NextResponse.json({
            response,
            isDemo: !safeAzureOpenAI.isAvailable(),
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Error in AI chat API:', error);
        return NextResponse.json(
            { error: 'Failed to get AI response' },
            { status: 500 }
        );
    }
}
