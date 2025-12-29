# Implementation Plan - Brand Logo Integration

Replace current placeholder icons and text with the official `ChartSparkLogo.png`.

## Proposed Changes

### [Component] [Sidebar](file:///c:/Users/joman/OneDrive/Desktop/ChartSparkOG/src/components/layout/Sidebar.tsx)
- Replace `Stethoscope` icon and `h1` text with `ChartSparkLogo.png`.
- Use a container with `overflow-hidden` to crop the bottom tagline.
- Scale to fit the 240px (w-60) sidebar width.

### [Component] [AdminSidebar](file:///c:/Users/joman/OneDrive/Desktop/ChartSparkOG/src/components/admin/AdminSidebar.tsx)
- Similar update to main Sidebar.
- Ensure visibility against the dark background (the logo has a white background, might need a light container or `mix-blend-mode`).

### [Page] [Login](file:///c:/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/(auth)/login/page.tsx)
- Replace top branding section with the full `ChartSparkLogo.png` (including tagline).

### [Page] [NEW] [Register](file:///c:/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/(auth)/register/page.tsx)
- Create a signup page matching the login style.
- Use the full `ChartSparkLogo.png`.

### [Component] [NEW] [Loading](file:///c:/Users/joman/OneDrive/Desktop/ChartSparkOG/src/app/loading.tsx)
- Create a global loading state with a centered, pulsing logo.

## Verification Plan

### Manual Verification
1. Verifying sidebar logo fits and doesn't show tagline.
2. Verifying login/signup pages show full logo with "Connected Care Solutions".
3. Triggering a route change to see the splash loading screen.
