"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AthleteWithProfile, Message } from "@coaching/shared";
import { createClient } from "@/lib/supabase";

export default function MessagesPage(): React.JSX.Element {
  const [athletes, setAthletes] = useState<AthleteWithProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingAthletes, setLoadingAthletes] = useState(true);

  useEffect(() => {
    api.athletes.list().then((list) => {
      setAthletes(list);
      if (list.length > 0) setSelectedId(list[0]!.id);
    }).finally(() => setLoadingAthletes(false));
  }, []);

  const selected = athletes.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
      {/* Contacts sidebar */}
      <div
        className="w-60 shrink-0 flex flex-col"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Sidebar header */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
            Messages
          </p>
        </div>

        {/* Athlete list */}
        <div className="flex-1 overflow-y-auto">
          {loadingAthletes ? (
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="px-4 py-3 flex items-center gap-2.5 animate-pulse"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="h-7 w-7 rounded-md shrink-0" style={{ background: "var(--surface-3)" }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 rounded w-24" style={{ background: "var(--surface-3)" }} />
                  <div className="h-2 rounded w-16" style={{ background: "var(--surface-3)" }} />
                </div>
              </div>
            ))
          ) : athletes.length === 0 ? (
            <p className="text-[12px] px-4 py-8 text-center" style={{ color: "var(--text-3)" }}>No athletes yet.</p>
          ) : athletes.map((a) => {
            const isSelected = selectedId === a.id;
            const initials = a.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="w-full text-left flex items-center gap-2.5 transition-all duration-100"
                style={{
                  padding: "10px 16px",
                  background: isSelected ? "var(--surface-2)" : "",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: `2px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = ""; }}
              >
                <div
                  className="h-7 w-7 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: isSelected ? "var(--accent-dim)" : "var(--surface-3)",
                    color: isSelected ? "var(--accent)" : "var(--text-2)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[12px] font-medium truncate"
                    style={{ color: isSelected ? "var(--text-1)" : "var(--text-2)" }}
                  >
                    {a.full_name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "var(--text-3)" }}>{a.email}</p>
                </div>
                {a.active_flags > 0 && (
                  <span
                    className="shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: "var(--red-dim)", color: "var(--red)" }}
                  >
                    {a.active_flags}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: "var(--bg)" }}>
        {selected ? (
          <ThreadView athlete={selected} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--surface)" }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "var(--text-3)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>No conversation selected</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>Choose an athlete from the sidebar.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadView({ athlete }: { athlete: AthleteWithProfile }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const fetchThread = useCallback(() => {
    api.messages.thread(athlete.id).then(setMessages).finally(() => setLoading(false));
  }, [athlete.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchThread();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [athlete.id, fetchThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const t = setInterval(fetchThread, 10000);
    return () => clearInterval(t);
  }, [fetchThread]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    try {
      const msg = await api.messages.send({ recipient_id: athlete.id, body: text });
      setMessages((p) => [...p, msg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(e as unknown as React.FormEvent);
    }
  }

  const initials = athlete.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      {/* Thread header */}
      <div
        className="h-14 shrink-0 flex items-center gap-3 px-5"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: "var(--surface-3)", color: "var(--text-2)", fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{athlete.full_name}</p>
          <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{athlete.email}</p>
        </div>

        {/* Action links */}
        <div className="flex items-center gap-2">
          <a
            href={`/athletes/${athlete.id}`}
            className="text-[11px] font-medium px-2.5 py-1.5 rounded transition-all duration-150"
            style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
          >
            View profile
          </a>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-0.5">
        {loading ? (
          <div className="space-y-3 pt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <div
                  className="h-9 rounded-lg animate-pulse"
                  style={{ background: "var(--surface)", width: `${120 + i * 50}px` }}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--surface)" }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "var(--text-3)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
                Start the conversation
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                Send {athlete.full_name.split(" ")[0]} a message below.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isOwn = msg.sender_id === currentUserId;
              const showTime =
                i === 0 ||
                new Date(msg.created_at).getTime() - new Date(messages[i - 1]!.created_at).getTime() > 5 * 60_000;
              return (
                <div key={msg.id}>
                  {showTime && (
                    <div className="flex items-center gap-3 py-4">
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                      <span
                        className="text-[10px] shrink-0"
                        style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {fmtTime(msg.created_at)}
                      </span>
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    </div>
                  )}
                  <div className={`flex mb-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-xs lg:max-w-md px-3.5 py-2.5 text-[13px] leading-relaxed"
                      style={
                        isOwn
                          ? {
                              background: "var(--accent)",
                              color: "#0C0C0F",
                              borderRadius: "10px 10px 2px 10px",
                              fontWeight: 500,
                            }
                          : {
                              background: "var(--surface)",
                              color: "var(--text-1)",
                              border: "1px solid var(--border)",
                              borderRadius: "10px 10px 10px 2px",
                            }
                      }
                    >
                      {msg.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        className="px-5 py-4 shrink-0"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        <div
          className="flex items-end gap-2.5 rounded-lg px-3 py-2.5 transition-all duration-150"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
          onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${athlete.full_name.split(" ")[0]}…`}
            rows={1}
            className="flex-1 resize-none text-[13px] outline-none"
            style={{
              background: "transparent",
              color: "var(--text-1)",
              minHeight: 24,
              maxHeight: 120,
              lineHeight: "1.5",
            }}
          />
          <button
            onClick={(e) => void handleSend(e as unknown as React.FormEvent)}
            disabled={!body.trim() || sending}
            className="h-8 w-8 flex items-center justify-center rounded-md transition-all shrink-0 disabled:opacity-30"
            style={{ background: "var(--accent)", color: "#0C0C0F" }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: "var(--text-3)" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </>
  );
}

function fmtTime(d: string) {
  const date = new Date(d);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYest  = new Date(now.getTime() - 86_400_000).toDateString() === date.toDateString();
  const t = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return t;
  if (isYest)  return `Yesterday · ${t}`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ` · ${t}`;
}
