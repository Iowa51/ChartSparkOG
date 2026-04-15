import { timingSafeEqual } from 'crypto';

export function timingSafeStringEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isValidBearerSecret(authHeader: string | null, expectedSecret: string): boolean {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    const providedSecret = authHeader.slice('Bearer '.length);
    return timingSafeStringEqual(providedSecret, expectedSecret);
}
