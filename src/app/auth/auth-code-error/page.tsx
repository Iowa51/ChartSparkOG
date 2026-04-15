import AuthCodeErrorClient from "./AuthCodeErrorClient";

export default async function AuthCodeErrorPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; type?: string }>;
}) {
    const params = await searchParams;
    const isRecovery = params.type === "recovery";
    const message = params.message || (
        isRecovery
            ? "Password reset link expired or already used. Please request a new reset link."
            : "Email confirmation link expired or already used. Please register again."
    );

    return <AuthCodeErrorClient isRecovery={isRecovery} message={message} />;
}
