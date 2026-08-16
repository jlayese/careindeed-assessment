import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import {
  searchPerson,
  getPersonById,
  listShiftsForWorker,
  listOpenShiftsForFacility,
  getShiftById,
  listFacilities,
  getFacility,
  getCredentials,
  getEmploymentStatus,
} from "@/lib/meridian";

export const maxDuration = 60;

// OpenRouter is OpenAI-API-compatible, so we point the OpenAI provider at
// OpenRouter's base URL instead of using @ai-sdk/openai's default endpoint.
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// A current, cost-efficient frontier model via OpenRouter, per the ticket.
// Swap this for whatever's actually cheapest/best at the time you're
// building, OpenRouter's model list changes.
const MODEL_ID = "openai/gpt-5.6-luna";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openrouter(MODEL_ID),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(8), // allow multi-step tool calling for cross-system questions
    tools: {
      searchPerson: tool({
        description:
          "Search for a person by name or partial name across all three source systems. Returns every matching record found; if more than one distinct person matches, ask the user to disambiguate instead of guessing.",
        inputSchema: z.object({
          query: z.string().describe("Name or partial name to search for"),
        }),
        execute: async ({ query }) => searchPerson(query),
      }),

      getPersonById: tool({
        description:
          "Look up a single person's record by their system-specific ID (e.g. 'E-1001', 'W-202'). Use this when the user gives an explicit ID.",
        inputSchema: z.object({
          systemId: z.string().describe("The system-specific person ID, e.g. E-1001 or W-202"),
        }),
        execute: async ({ systemId }) => getPersonById(systemId),
      }),

      getEmploymentStatus: tool({
        description:
          "Get a person's current employment status. Required as part of any eligibility check.",
        inputSchema: z.object({
          personSystemId: z.string(),
        }),
        execute: async ({ personSystemId }) => getEmploymentStatus(personSystemId),
      }),

      getCredentials: tool({
        description:
          "Get a person's credentials (type, status, expiry). Required as part of any eligibility or 'is this credential expiring' check.",
        inputSchema: z.object({
          personSystemId: z.string(),
        }),
        execute: async ({ personSystemId }) => getCredentials(personSystemId),
      }),

      listShiftsForWorker: tool({
        description: "List shifts assigned to a specific worker within a date range.",
        inputSchema: z.object({
          workerId: z.string(),
          fromDate: z.string().describe("ISO date, e.g. 2026-08-16"),
          toDate: z.string().describe("ISO date, e.g. 2026-08-21"),
        }),
        execute: async ({ workerId, fromDate, toDate }) =>
          listShiftsForWorker(workerId, fromDate, toDate),
      }),

      getShiftById: tool({
        description:
          "Get full details of one shift by its ID (e.g. 'S-3243'), including its requirements. Use this before answering an eligibility question about a specific shift.",
        inputSchema: z.object({
          shiftId: z.string(),
        }),
        execute: async ({ shiftId }) => getShiftById(shiftId),
      }),

      listOpenShiftsForFacility: tool({
        description: "List open (unfilled) shifts at a named facility within a date range.",
        inputSchema: z.object({
          facilityName: z.string(),
          fromDate: z.string().describe("ISO date"),
          toDate: z.string().describe("ISO date"),
        }),
        execute: async ({ facilityName, fromDate, toDate }) =>
          listOpenShiftsForFacility(facilityName, fromDate, toDate),
      }),

      listFacilities: tool({
        description:
          "List all facilities and their requirements (e.g. which require a TB test).",
        inputSchema: z.object({}),
        execute: async () => listFacilities(),
      }),

      getFacility: tool({
        description: "Get a single facility's details and requirements by name.",
        inputSchema: z.object({
          name: z.string(),
        }),
        execute: async ({ name }) => getFacility(name),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
