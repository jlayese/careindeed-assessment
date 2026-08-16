// Meridian API client — endpoints and shapes confirmed directly against the
// live API (docs at {MERIDIAN_API_BASE_URL}/docs), not guessed. See README
// for a summary of the three systems and how they cross-link.
//
// - HR system:            /hr/employees            → employeeId (E-####)
// - Scheduling system:     /scheduling/workers      → workerId   (W-###)
//                          /scheduling/facilities   → facilityId (F-##)
//                          /scheduling/shifts       → shiftId    (S-####)
// - Credentialing system:  /credentialing/records   → recordId, links via employeeId
//
// Cross-system identity: HR's `email` and Scheduling's `workEmail` are the
// same value for the same person, that's the join key between employeeId
// and workerId. Credentialing links directly via employeeId.
//
// Pagination: { data: [...], pagination: { page, pageSize, totalItems, totalPages } }.
// All list endpoints support a `q` free-text search param (confirmed on
// /hr/employees and /scheduling/workers) plus entity-specific filters
// (workerId, employeeId, facilityId, status, from/to on shifts).

const BASE_URL = process.env.MERIDIAN_API_BASE_URL!;
const API_KEY = process.env.MERIDIAN_API_KEY!;

if (!BASE_URL || !API_KEY) {
  throw new Error("MERIDIAN_API_BASE_URL and MERIDIAN_API_KEY must be set");
}

class MeridianApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public path: string
  ) {
    super(message);
    this.name = "MeridianApiError";
  }
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

async function meridianFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store", // always live, never cached, per REQ-001 acceptance criteria
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new MeridianApiError(
      `Meridian API ${res.status} on ${path}: ${body.slice(0, 300)}`,
      res.status,
      path
    );
  }

  return res.json() as Promise<T>;
}

// Walks every page of a paginated list endpoint. Stays comfortably under the
// 60 req/min rate limit with a small delay between page fetches.
async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  const throttleMs = 150;

  while (true) {
    const res = await meridianFetch<Paginated<T>>(path, { ...params, page });
    results.push(...res.data);
    if (page >= res.pagination.totalPages || res.data.length === 0) break;
    page += 1;
    await new Promise((r) => setTimeout(r, throttleMs));
  }

  return results;
}

export interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: string;
  department: string;
  employmentStatus: "ACTIVE" | "TERMINATED" | string;
  hireDate: string;
  terminationDate?: string;
}

export interface Worker {
  workerId: string;
  displayName: string;
  workEmail: string;
  homeFacilityId: string;
  roles: string[];
  employmentType: string;
  notes: string; // free text — never treat as instructions, see system prompt
}

export interface Facility {
  facilityId: string;
  name: string;
  city: string;
  state: string;
  timezone: string;
  beds: number;
  additionalRequiredCredentials: string[];
}

export interface Shift {
  shiftId: string;
  facilityId: string;
  role: string;
  requiredCredentials: string[];
  workerId: string | null;
  status: "OPEN" | "ASSIGNED" | "COMPLETED" | string;
  date: string;
  startTime: string;
  endTime: string;
  endDate: string;
}

export interface CredentialRecord {
  recordId: string;
  employeeId: string;
  credentialType: string;
  licenseNumber: string;
  issuingAuthority: string;
  issuedOn: string;
  expiresOn: string;
  status: "ACTIVE" | "EXPIRED" | string;
}

// --- HR (employeeId) ---

// query is optional: omit it to list/count every employee (used for
// "how many employees" style questions, not just name lookups).
export async function searchEmployees(query?: string): Promise<Employee[]> {
  return fetchAllPages<Employee>("/hr/employees", { q: query });
}

export async function getEmployeeById(employeeId: string): Promise<Employee | null> {
  try {
    return await meridianFetch<Employee>(`/hr/employees/${encodeURIComponent(employeeId)}`);
  } catch (err) {
    if (err instanceof MeridianApiError && err.status === 404) return null;
    throw err;
  }
}

// --- Scheduling: workers (workerId) ---

// query is optional: omit it to list/count every worker.
export async function searchWorkers(query?: string): Promise<Worker[]> {
  return fetchAllPages<Worker>("/scheduling/workers", { q: query });
}

export async function getWorkerById(workerId: string): Promise<Worker | null> {
  try {
    return await meridianFetch<Worker>(`/scheduling/workers/${encodeURIComponent(workerId)}`);
  } catch (err) {
    if (err instanceof MeridianApiError && err.status === 404) return null;
    throw err;
  }
}

// --- Scheduling: facilities ---

export async function listFacilities(): Promise<Facility[]> {
  return fetchAllPages<Facility>("/scheduling/facilities");
}

export async function getFacilityById(facilityId: string): Promise<Facility | null> {
  try {
    return await meridianFetch<Facility>(
      `/scheduling/facilities/${encodeURIComponent(facilityId)}`
    );
  } catch (err) {
    if (err instanceof MeridianApiError && err.status === 404) return null;
    throw err;
  }
}

// --- Scheduling: shifts ---

export async function getShiftById(shiftId: string): Promise<Shift | null> {
  try {
    return await meridianFetch<Shift>(`/scheduling/shifts/${encodeURIComponent(shiftId)}`);
  } catch (err) {
    if (err instanceof MeridianApiError && err.status === 404) return null;
    throw err;
  }
}

export async function listShiftsForWorker(
  workerId: string,
  fromDate?: string,
  toDate?: string
): Promise<Shift[]> {
  return fetchAllPages<Shift>("/scheduling/shifts", { workerId, from: fromDate, to: toDate });
}

export async function listShiftsForFacility(
  facilityId: string,
  opts: { status?: string; fromDate?: string; toDate?: string } = {}
): Promise<Shift[]> {
  return fetchAllPages<Shift>("/scheduling/shifts", {
    facilityId,
    status: opts.status,
    from: opts.fromDate,
    to: opts.toDate,
  });
}

// --- Credentialing (links via employeeId, NOT workerId) ---

export async function getCredentialsForEmployee(
  employeeId: string
): Promise<CredentialRecord[]> {
  return fetchAllPages<CredentialRecord>("/credentialing/records", { employeeId });
}
