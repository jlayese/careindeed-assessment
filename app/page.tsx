"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col p-4">
      <h1 className="mb-4 text-xl font-semibold">Staffing Assistant</h1>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border p-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">
            Ask about shifts, credentials, eligibility, or facility requirements. Answers
            come from live Meridian data at the time you ask.
          </p>
        )}

        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "text-right" : ""}>
            <div
              className={
                "inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm " +
                (message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900")
              }
            >
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  return message.role === "user" ? (
                    <span key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </span>
                  ) : (
                    <div key={i} className="markdown-answer">
                      <ReactMarkdown>{part.text}</ReactMarkdown>
                    </div>
                  );
                }
                if (part.type.startsWith("tool-")) {
                  return (
                    <div key={i} className="mt-1 text-xs italic text-gray-500">
                      looking up: {part.type.replace("tool-", "")}...
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-sm text-red-600">
            Something went wrong: {error.message}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Can Maria Santos take shift S-3243?"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          disabled={isBusy}
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isBusy ? "..." : "Send"}
        </button>
      </form>
    </main>
  );
}
