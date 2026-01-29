/**
 * Verification Script: Managed Billing Logic (v3)
 */

import { ERAParser } from "./src/lib/managed-billing/era-parser";
import { OfficeAllySFTPAdapter } from "./src/lib/managed-billing/office-ally-sftp";
import { ClaimScrubber } from "./src/lib/managed-billing/claim-scrubber";

async function verify() {
    console.log("--- STARTING TECHNICAL VERIFICATION ---");

    // 1. Verify ERA Parser
    console.log("\n[1] Testing ERA Parser...");
    const mock835 = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *231028*1200*^*00501*000000001*0*T*:~ST*835*0001~BPR*I*15000*C*CHK*NON*01*...~N1*PR*AETNA~CLP*CLM-00124*1*15000*12500*2500*12*123456789~SVC*HC:99214*15000*12500~DTM*472*20231024~SE*10*0001~GE*1*1~IEA*1*000000001~`;
    try {
        const eras = ERAParser.parse(mock835);
        console.log(`Parsed ${eras.length} ERA message(s).`);
        if (eras[0]?.claims[0]?.claimControlNumber === 'CLM-00124') {
            console.log("✅ ERA Parser correctly extracted Claim ID CLM-00124");
        } else {
            console.log("❌ ERA Parser failed to extract Claim ID");
        }
    } catch (e: any) {
        console.error("❌ ERA Parser threw error:", e.message);
    }

    // 2. Verify SFTP Adapter (Mock Mode)
    console.log("\n[2] Testing SFTP Adapter (Mock)...");
    try {
        const adapter = new OfficeAllySFTPAdapter({
            host: 'ftp10.officeally.com',
            port: 22,
            username: 'testuser',
            path: '/inbound'
        }, true);
        const uploadResult = await adapter.uploadClaim('test_837.txt', 'ISA*...');
        console.log(`Upload Result: ${uploadResult.message}`);
        if (uploadResult.success) {
            console.log("✅ SFTP Adapter (Mock) successfully 'uploaded' file.");
        }
    } catch (e: any) {
        console.error("❌ SFTP Adapter failed:", e.message);
    }

    // 3. Verify Claim Scrubber
    console.log("\n[3] Testing Claim Scrubber...");
    try {
        const invalidClaim = {
            billingProvider: { npi: '', tin: '123' }, // Invalid NPI, short TIN
            renderingProvider: { npi: '123' }, // Invalid NPI
            patient: { firstName: '', lastName: 'Connor', dob: 'invalid', gender: 'F' },
            coverage: { memberId: '', payerId: 'p1' },
            serviceLines: []
        };

        const issues = ClaimScrubber.scrub(invalidClaim as any);
        console.log(`Scrubber found ${issues.length} issues.`);

        const expectedFields = ['billingProvider.npi', 'renderingProvider.npi', 'billingProvider.tin', 'patient.name', 'patient.dob', 'coverage.memberId', 'serviceLines'];
        const foundFields = issues.map(i => i.field);

        const allFound = expectedFields.every(f => foundFields.includes(f));

        if (allFound) {
            console.log("✅ Claim Scrubber correctly identified ALL intentional errors.");
        } else {
            console.log("❌ Claim Scrubber missed some errors.");
            console.log("Found:", foundFields);
        }
    } catch (e: any) {
        console.error("❌ Claim Scrubber failed:", e.message);
    }

    console.log("\n--- VERIFICATION COMPLETE ---");
}

verify().catch(console.error);
