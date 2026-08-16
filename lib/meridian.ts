// Meridian API client.
//
// NOTE: exact endpoint paths below are placeholders inferred from the ticket
// description and QA test questions (entities: people/employees/workers
// identified differently across three systems, shifts, facilities,
// credentials). Confirm the real paths against the docs at
// {MERIDIAN_API_BASE_URL}/docs and adjust the ENDPOINTS map + response
// parsing accordingly before relying on this for real answers.

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
      // Some APIs expect a custom header instead of Bearer, e.g.:
      // "X-API-Key": API_KEY,
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

// Generic pagination walker: follows a `next`/`cursor`/`page` style response
// until exhausted. Adjust field names once the real pagination shape is known.
async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T[]> {
  const results: T[] = [];
  let cursor: string | number | undefined = undefined;
  let page = 1;

  // Rate limit: 60 requests/minute per the ticket. A small delay between
  // pages keeps a paginated pull well under that even in a hot loop.
  const throttleMs = 150;

  // Safety cap so a pagination bug can't spin forever.
  for (let i = 0; i < 200; i++) {
    const data: any = await meridianFetch(path, {
      ...params,
      cursor,
      page: cursor ? undefined : page,
    });

    const items: T[] = data.items ?? data.results ?? data.data ?? [];
    results.push(...items);

    const nextCursor = data.next_cursor ?? data.nextCursor ?? data.cursor;
    const hasMore = Boolean(nextCursor) || Boolean(data.has_more);
    if (!hasMore || items.length === 0) break;

    cursor = nextCursor;
    page += 1;
    await new Promise((r) => setTimeout(r, throttleMs));
  }

  return results;
}

export interface PersonMatch {
  system: string; // e.g. "hr", "scheduling", "credentialing"
  systemId: string; // e.g. "E-1001", "W-202"
  name: string;
  [key: string]: unknown;
}

// Search for a person by name or ID across all three systems. Should surface
// every system's record for the same underlying person so the model can
// cross-link them and cite the source system in its answer.
export async function searchPerson(query: string): Promise<PersonMatch[]> {
  return fetchAllPages<PersonMatch>("/people/search", { q: query });
}

export async function getPersonById(systemId: string): Promise<PersonMatch | null> {
  try {
    return await meridianFetch<PersonMatch>(`/people/${encodeURIComponent(systemId)}`);
  } catch (err) {
    if (err instanceof MeridianApiError && err.status === 404) return null;
    throw err;
  }
}

export interface Shift {
  shiftId: string;
  facility: string;
  date: string;
  status: "open" | "filled" | string;
  assignedWorkerId?: string;
  requiredCredentials?: string[];
  [key: string]: unknown;
}

export async function listShiftsForWorker(
  workerId: string,
  fromDate: string,
  toDate: string
): Promise<Shift[]> {
  return fetchAllPages<Shift>("/shifts", { workerId, from: fromDate, to: toDate });
}

export async function listOpenShiftsForFacility(
  facilityName: string,
  fromDate: string,
  toDate: string
): Promise<Shift[]> {
  return fetchAllPages<Shift>("/shifts", {
    facility: facilityName,
    status: "open",
    from: fromDate,
    to: toDate,
  });
}

export async function getShiftById(shiftId: string): Promise<Shift | null> {
  try {
    return await meridianFetch<Shift>(`/shifts/${encodeURIComponent(shiftId)}`);
  } catch (err) {
    if (err instanceof MeridianApiError && err.status === 404) return null;
    throw err;
  }
}

export interface Facility {
  name: string;
  requirements?: string[]; // e.g. ["TB test"]
  [key: string]: unknown;
}

export async function listFacilities(): Promise<Facility[]> {
  return fetchAllPages<Facility>("/facilities");
}

export async function getFacility(name: string): Promise<Facility | null> {
  try {
    return await meridianFetch<Facility>(`/facilities/${encodeURIComponent(name)}`);
  } catch (err) {
    if (err instanceof MeridianApiError && err.status === 404) return null;
    throw err;
  }
}

export interface CredentialRecord {
  personSystemId: string;
  credentialType: string;
  status: "active" | "expired" | "expiring" | string;
  expiresOn?: string;
  [key: string]: unknown;
}

export async function getCredentials(personSystemId: string): Promise<CredentialRecord[]> {
  return fetchAllPages<CredentialRecord>("/credentials", { personId: personSystemId });
}

export interface EmploymentStatus {
  personSystemId: string;
  status: "active" | "terminated" | "on_leave" | string;
  [key: string]: unknown;
}

export async function getEmploymentStatus(
  personSystemId: string
): Promise<EmploymentStatus | null> {
  try {
    return await meridianFetch<EmploymentStatus>(
      `/employment-status/${encodeURIComponent(personSystemId)}`
    );
  } catch (err) {
    if (err instanceof MeridianApiError && err.status === 404) return null;
    throw err;
  }
}
