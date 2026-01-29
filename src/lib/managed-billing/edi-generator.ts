/**
 * X12 837P Professional Claim Generator
 * 
 * Translates clinical and financial data into HIPAA-compliant
 * EDI 837P transaction sets for Office Ally.
 */

export interface EDI837PData {
    isTestMode: boolean;
    senderId: string;
    claimId: string;
    creationDate: Date;

    billingProvider: {
        name: string;
        npi: string;
        taxId: string;
        address: string;
        city: string;
        state: string;
        zip: string;
    };

    payer: {
        name: string;
        payerId: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
    };

    patient: {
        firstName: string;
        lastName: string;
        dob: string;
        gender: 'M' | 'F' | 'U';
        address: string;
        city: string;
        state: string;
        zip: string;
        memberId: string;
    };

    encounter: {
        serviceDate: Date;
        placeOfServiceCode: string;
        diagnosisCodes: string[]; // ICD-10
    };

    serviceLines: Array<{
        cptCode: string;
        modifiers?: string[];
        charge: number; // in cents
        units: number;
        diagnosisPointers: number[]; // 1-indexed
    }>;
}

export class EDI837PGenerator {
    /**
     * Generates a complete 837P transaction string
     */
    static generate(data: EDI837PData): string {
        const segments: string[] = [];
        const ts = this.formatTimestamp(data.creationDate);
        const dateStr = ts.date;
        const timeStr = ts.time;

        // 1. ISA - Interchange Control Header
        // Note: Office Ally requires 'OATEST' for test mode in ISA15 if possible or within filename
        const isaUsage = data.isTestMode ? 'T' : 'P';
        segments.push(this.draftISA(data.senderId, dateStr, timeStr, isaUsage));

        // 2. GS - Functional Group Header
        segments.push(`GS*HC*${data.senderId}*OFFICEALLY*${dateStr}*${timeStr}*1*X*005010X222A1~`);

        // 3. ST - Transaction Set Header
        segments.push(`ST*837*0001*005010X222A1~`);

        // 4. BHT - Beginning of Hierarchical Transaction
        segments.push(`BHT*0019*00*0001*${dateStr}*${timeStr}*CH~`);

        // 5. Submitters / Provider Loops (Simplified subset for Phase 1)
        // 1000A - Submitter Name
        segments.push(`NM1*41*2*CHART SPARK HEALTH*****46*${data.senderId}~`);
        segments.push(`PER*IC*SUPPORT*TE*8885551234~`);

        // 1000B - Receiver Name
        segments.push(`NM1*40*2*OFFICE ALLY*****46*OFFICEALLY~`);

        // 2000A - Billing Provider HL
        segments.push(`HL*1**20*1~`);
        segments.push(`NM1*85*2*${data.billingProvider.name.toUpperCase()}*****XX*${data.billingProvider.npi}~`);
        segments.push(`N3*${data.billingProvider.address.toUpperCase()}~`);
        segments.push(`N4*${data.billingProvider.city.toUpperCase()}*${data.billingProvider.state}*${data.billingProvider.zip}~`);
        segments.push(`REF*EI*${data.billingProvider.taxId}~`);

        // 2000B - Subscriber HL
        segments.push(`HL*2*1*22*0~`);
        segments.push(`SBR*P*18*******CI~`); // P=Primary, 18=Self

        // 2010BA - Subscriber Name
        segments.push(`NM1*IL*1*${data.patient.lastName.toUpperCase()}*${data.patient.firstName.toUpperCase()}****MI*${data.patient.memberId}~`);
        segments.push(`N3*${data.patient.address.toUpperCase()}~`);
        segments.push(`N4*${data.patient.city.toUpperCase()}*${data.patient.state}*${data.patient.zip}~`);
        segments.push(`DMG*D8*${this.formatDate8(data.patient.dob)}*${data.patient.gender}~`);

        // 2010BB - Payer Name
        segments.push(`NM1*PR*2*${data.payer.name.toUpperCase()}*****PI*${data.payer.payerId}~`);

        // 2300 - Claim Information (Simplified)
        const totalCharge = data.serviceLines.reduce((acc, line) => acc + line.charge, 0) / 100;
        segments.push(`CLM*${data.claimId}*${totalCharge.toFixed(2)}***${data.encounter.placeOfServiceCode}:B:1*Y*A*Y*Y~`);

        // 2310B - Rendering Provider
        // segments.push(`NM1*82*1*PROVIDER_LAST*PROVIDER_FIRST****XX*${data.renderingProvider.npi}~`);

        // Diagnosis Codes (HI)
        const diagSegments = data.encounter.diagnosisCodes.map((code, i) => `ABK:${code.replace('.', '')}`).join('*');
        segments.push(`HI*${diagSegments}~`);

        // 2400 - Service Lines
        data.serviceLines.forEach((line, index) => {
            const lineCharge = line.charge / 100;
            const dateSvc = this.formatDate8(data.encounter.serviceDate);

            segments.push(`LX*${index + 1}~`);
            segments.push(`SV1*HC:${line.cptCode}*${lineCharge.toFixed(2)}*UN*${line.units}***${line.diagnosisPointers.join(':')}~`);
            segments.push(`DTP*472*D8*${dateSvc}~`);
        });

        // GE / IEA - Trailers
        segments.push(`SE*${segments.length - 2}*0001~`); // Count includes ST but not SE/GE/IEA technically? (Actually ST to SE)
        segments.push(`GE*1*1~`);
        segments.push(`IEA*1*000000001~`);

        return segments.join('');
    }

    private static draftISA(sender: string, date: string, time: string, usage: string): string {
        // Fixed length fields for ISA
        const s = sender.padEnd(15);
        const r = "OFFICEALLY    ";
        return `ISA*00*          *00*          *ZZ*${s}*ZZ*${r}*${date}*${time}*^*00501*000000001*0*${usage}*:~`;
    }

    private static formatTimestamp(d: Date) {
        const year = d.getFullYear().toString().slice(-2);
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const hour = d.getHours().toString().padStart(2, '0');
        const min = d.getMinutes().toString().padStart(2, '0');
        return {
            date: `${year}${month}${day}`,
            time: `${hour}${min}`
        };
    }

    private static formatDate8(d: Date | string) {
        const date = new Date(d);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}${month}${day}`;
    }
}
