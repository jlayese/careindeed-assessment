# QA Test — Verbatim Assistant Answers

Run against the deployed assistant. Each answer below is copied verbatim from the app.

**Date asked:** 2026-08-16 (some answers are date-relative to this date, e.g. "next 5/7 days")

1. **What is the phone number of employee E-1001?**
   > According to the HR system, employee E-1001 (Maria Santos)'s phone number is (628) 555-0010.

2. **Which facilities require a TB test?**
   > Oakview Commons in Santa Rosa, CA (Facility F-03) requires a TB test.
   > *Source: Facilities system.*

3. **Which shifts is worker W-202 assigned to in the next 5 days?**
   > According to the Scheduling system, worker W-202 is assigned to:
   >
   > - Shift S-3240 — August 18, 2026, 07:00–15:00
   >   - Role: RN
   >   - Facility: F-03
   >   - Status: Assigned

4. **Can Maria Santos take shift S-3243?**
   > No. Maria Santos is not eligible for shift S-3243.
   >
   > - HR: Maria Santos (E-1001) is ACTIVE.
   > - Scheduling: Shift S-3243 is an open RN shift requiring RN_LICENSE, CPR, and TB_TEST.
   > - Credentialing: She has active RN_LICENSE and CPR, but no active TB_TEST record.
   >
   > She is missing the required TB_TEST credential.

5. **How many open shifts does Oakview Commons have in the next 7 days?**
   > Oakview Commons has 3 open shifts in the next 7 days, covering August 17–23, 2026.
   >
   > Source: Scheduling system; facility identified as F-03 via the Facilities system.

6. **What is employee E-1001's home address?**
   > I can't find a home address for employee E-1001 in the available HR record.
