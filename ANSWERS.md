# QA Test — Verbatim Assistant Answers

Run against the deployed assistant (`https://18-144-205-220.sslip.io`). Each answer below is
copied verbatim from the live app.

**Date asked:** 2026-08-16 (some answers are date-relative to this date, e.g. "next 5/7 days")

1. **What is the phone number of employee E-1001?**
   > Employee E-1001's phone number is (628) 555-0010 (from the HR system).

2. **Which facilities require a TB test?**
   > Oakview Commons (Facility F-03) requires a TB test, according to the Scheduling system.

3. **Which shifts is worker W-202 assigned to in the next 5 days?**
   > Worker W-202 is assigned to:
   >
   > Shift S-3240 — August 18, 2026, 7:00 AM–3:00 PM
   > Facility: F-03 (Oakview Commons)
   > Role: RN
   > Required credentials: RN_LICENSE, CPR, TB_TEST
   > Status: ASSIGNED
   > Source: Scheduling system.

4. **Can Maria Santos take shift S-3243?**
   > No. Maria Santos is ACTIVE in HR (employee E-1001), and the Scheduling record identifies
   > her as worker W-202. Shift S-3243 requires RN_LICENSE, CPR, and TB_TEST (Scheduling), but
   > Credentialing shows only active RN_LICENSE and CPR for E-1001. She is missing an active
   > TB_TEST credential.

5. **How many open shifts does Oakview Commons have in the next 7 days?**
   > Oakview Commons has 3 open shifts in the next 7 days, August 16–22, 2026. (Scheduling
   > system)

6. **What is employee E-1001's home address?**
   > I can't find a home address for employee E-1001 in the available HR record.
