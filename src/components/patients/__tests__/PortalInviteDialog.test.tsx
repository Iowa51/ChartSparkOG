import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import PortalInviteDialog from "../PortalInviteDialog";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const fetchMock = vi.fn();
const writeTextMock = vi.fn();

function statusResponse(
  portal_status: string,
  invite: Record<string, unknown> | null = null,
  account_status: string | null = null,
) {
  return {
    ok: true,
    json: async () => ({ portal_status, account_status, invite }),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  writeTextMock.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText: writeTextMock },
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("<PortalInviteDialog />", () => {
  it("renders nothing when closed and does not fetch", () => {
    render(
      <PortalInviteDialog
        patientId={PATIENT_ID}
        patientEmail="pt@example.com"
        open={false}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads status on open and shows it with the patient email", async () => {
    fetchMock.mockResolvedValueOnce(statusResponse("not_invited"));

    render(
      <PortalInviteDialog
        patientId={PATIENT_ID}
        patientEmail="pt@example.com"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-status")).toHaveTextContent("Not invited");
    });
    expect(fetchMock).toHaveBeenCalledWith(`/api/portal-invites?patient_id=${PATIENT_ID}`);
    expect(screen.getByTestId("portal-invite-email")).toHaveTextContent("pt@example.com");
  });

  it("sends the invite and shows the one-time link with working copy-to-clipboard", async () => {
    const inviteUrl = "https://portal.chartspark.io/invite/tok123";
    fetchMock.mockResolvedValueOnce(statusResponse("not_invited")).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invite_id: "inv-1", invite_url: inviteUrl, expires_at: FUTURE }),
    });

    render(
      <PortalInviteDialog
        patientId={PATIENT_ID}
        patientEmail="pt@example.com"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-send-btn")).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId("portal-invite-send-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-url")).toHaveValue(inviteUrl);
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/portal-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: PATIENT_ID }),
    });

    fireEvent.click(screen.getByTestId("portal-invite-copy-btn"));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(inviteUrl);
    });
    expect(screen.getByTestId("portal-invite-copy-btn")).toHaveTextContent("Copied");
  });

  it("disables send and warns when the patient has no email on file", async () => {
    fetchMock.mockResolvedValueOnce(statusResponse("not_invited"));

    render(
      <PortalInviteDialog
        patientId={PATIENT_ID}
        patientEmail={null}
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-status")).toHaveTextContent("Not invited");
    });
    expect(screen.getByTestId("portal-invite-email")).toHaveTextContent("No email on file");
    expect(screen.getByText(/add an email address to the patient record/i)).toBeInTheDocument();
    expect(screen.getByTestId("portal-invite-send-btn")).toBeDisabled();
  });

  it("offers a re-send for a pending invite and shows the current expiry", async () => {
    fetchMock.mockResolvedValueOnce(
      statusResponse("pending", {
        invited_at: new Date().toISOString(),
        expires_at: FUTURE,
        claimed_at: null,
      }),
    );

    render(
      <PortalInviteDialog
        patientId={PATIENT_ID}
        patientEmail="pt@example.com"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-status")).toHaveTextContent("Invited (pending)");
    });
    expect(screen.getByText(/current link expires/i)).toBeInTheDocument();
    expect(screen.getByTestId("portal-invite-send-btn")).toHaveTextContent(/re-send invite/i);
  });

  it("hides the send button entirely for an active account", async () => {
    fetchMock.mockResolvedValueOnce(statusResponse("active", null, "active"));

    render(
      <PortalInviteDialog
        patientId={PATIENT_ID}
        patientEmail="pt@example.com"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-status")).toHaveTextContent("Active account");
    });
    expect(screen.queryByTestId("portal-invite-send-btn")).not.toBeInTheDocument();
  });

  it("surfaces API errors inline and keeps the dialog usable", async () => {
    fetchMock.mockResolvedValueOnce(statusResponse("not_invited")).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Patient has no email on file." }),
    });

    render(
      <PortalInviteDialog
        patientId={PATIENT_ID}
        patientEmail="pt@example.com"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-send-btn")).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId("portal-invite-send-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-error")).toHaveTextContent(
        "Patient has no email on file.",
      );
    });
    expect(screen.getByTestId("portal-invite-send-btn")).toBeEnabled();
  });

  it("surfaces a status-load failure (e.g. feature gated off) as an inline error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Feature not enabled for your account" }),
    });

    render(
      <PortalInviteDialog
        patientId={PATIENT_ID}
        patientEmail="pt@example.com"
        open={true}
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-error")).toHaveTextContent(
        "Feature not enabled for your account",
      );
    });
  });

  it("fires onClose from the Close button", async () => {
    fetchMock.mockResolvedValueOnce(statusResponse("not_invited"));
    const onClose = vi.fn();

    render(
      <PortalInviteDialog
        patientId={PATIENT_ID}
        patientEmail="pt@example.com"
        open={true}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portal-invite-status")).toBeInTheDocument();
    });
    // Two buttons share the accessible name "Close": the header X
    // (aria-label) and the footer button. Either must close the dialog.
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });
});
