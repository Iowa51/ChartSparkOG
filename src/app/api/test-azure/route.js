import { NextResponse } from 'next/server';
import azureOpenAIService from '@/services/azureOpenAIService';

export async function POST(request) {
    try {
        const { message } = await request.json();
        const response = await azureOpenAIService.chat(message || "Hello! Can you confirm you are connected and responding correctly?", []);

        return NextResponse.json({
            success: true,
            response: response
        });
    } catch (error) {
        console.error("Test API Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
