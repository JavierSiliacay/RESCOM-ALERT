"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Shield,
  Smartphone,
  RotateCcw,
  ChevronRight,
  BookOpen,
  Award,
  Compass,
} from "lucide-react";
import { RescomAiAvatar, RESCOM_AI_CONFIG } from "@/components/rescom-ai-avatar";
import {
  ACCURATE_KNOWLEDGE,
  ROTC_QUICK_TOPICS,
  FormattedMessageText,
} from "@/components/rescom-ai-dialog";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  links?: { label: string; href: string }[];
}

const STARTER_PROMPTS = [
  {
    icon: <Shield className="w-4 h-4 text-emerald-700" />,
    title: "11 General Orders",
    desc: "Recite the 11 General Orders of a Sentry",
    query: "11 General Orders of a Sentry",
  },
  {
    icon: <Award className="w-4 h-4 text-emerald-700" />,
    title: "Army & Cadet Ranks",
    desc: "Philippine Army and ROTC Cadet rank structure",
    query: "Philippine Army Rank Structure",
  },
  {
    icon: <Compass className="w-4 h-4 text-emerald-700" />,
    title: "Military Courtesy",
    desc: "Saluting rules, reporting & AFP core values",
    query: "Military Courtesy and Saluting Rules",
  },
  {
    icon: <Smartphone className="w-4 h-4 text-emerald-700" />,
    title: "RESCOM ALERT App",
    desc: "Download and install the mobile APK",
    query: "How to download and install the RESCOM ALERT mobile app?",
  },
];

export default function RescomAiPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const raw = (textToSend || query).trim();
    if (!raw || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: raw,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const aiMsgId = `ai-${Date.now()}`;
    const initialAiMsg: Message = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg, initialAiMsg]);
    setQuery("");
    setIsTyping(true);

    try {
      // Build conversation history for the live AI backend
      const history = messages.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: raw, history }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let receivedFirstChunk = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            if (!receivedFirstChunk) {
              receivedFirstChunk = true;
              setIsTyping(false);
            }
            accumulated += chunk;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId ? { ...msg, text: accumulated } : msg
              )
            );
          }
        }

        if (accumulated.trim()) {
          const lower = raw.toLowerCase();
          const shouldAttachAppLinks =
            lower.includes("download") ||
            lower.includes("app") ||
            lower.includes("apk") ||
            lower.includes("install") ||
            lower.includes("mobile") ||
            lower.includes("alert");

          if (shouldAttachAppLinks) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? {
                      ...msg,
                      links: [
                        { label: "Go to Mobile App Download Portal", href: "/download" },
                        { label: "Step-by-Step Installation Guide", href: "/download/guide" },
                      ],
                    }
                  : msg
              )
            );
          }
          setIsTyping(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Live AI streaming error, executing local doctrine fallback", err);
    }

    // Fallback to verified local doctrine database
    const lower = raw.toLowerCase();
    let match = ACCURATE_KNOWLEDGE.find((item) =>
      item.keywords.some((kw) => lower.includes(kw))
    );

    if (!match) {
      match = {
        keywords: [],
        response: `Notice: RESCOM AI is strictly dedicated to Basic ROTC Military Science, Philippine Army doctrine, and 10RCDG readiness. My knowledge is restricted purely to military science and national defense affairs.\n\nCadets may inquire about:\n• The 11 General Orders of a Sentry\n• Philippine Army & Cadet Officer Rank Structures\n• AFP Core Values & The Cadet Honor Code\n• Military Courtesy, Saluting & Reporting Rules\n• Drills and Ceremonies (Commands & Movements)\n• Interior Guard Duty & Countersign\n• Military Hygiene & Heat Injury First Aid\n• RA 7077 (Citizen Armed Forces) & RA 9163\n• Official RESCOM ALERT Mobile App Download`,
        links: [
          { label: "Download RESCOM ALERT APK", href: "/download" },
          { label: "Android Setup Guide", href: "/download/guide" },
        ],
      };
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === aiMsgId
          ? {
              ...msg,
              text: match.response,
              links: match.links,
            }
          : msg
      )
    );
    setIsTyping(false);
  };

  const handleReset = () => {
    setMessages([]);
    setQuery("");
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#f8fafc] text-slate-900 flex flex-col overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* ====================================================
          TOP NAVIGATION HEADER
         ==================================================== */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shrink-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          
          {/* Left: Back to Portal & Dual Insignia */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-900 hover:bg-slate-100 transition-colors"
              title="Return to Main Portal"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">10RCDG Portal</span>
              <span className="sm:hidden">Back</span>
            </Link>

            <div className="hidden xs:flex items-center -space-x-1.5">
              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-amber-500/80 bg-white shadow-2xs">
                <Image
                  src="/rescom-pa-seal.png"
                  alt="Philippine Army"
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              </div>
              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-amber-500/80 bg-white shadow-2xs">
                <Image
                  src="/rescom-emblem.jpg"
                  alt="10RCDG"
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Center: Clean RESCOM AI Branding */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <RescomAiAvatar size="xs" className="sm:w-8 sm:h-8 ring-2 ring-emerald-500/20" />
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-sm sm:text-base text-slate-950 tracking-tight">
                  {RESCOM_AI_CONFIG.name}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 hidden sm:inline">
                  ROTC GUIDE
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate hidden md:block pt-0.5">
                10RCDG Military Science Intelligence Reference
              </p>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors border border-transparent hover:border-slate-200"
                title="Start a new chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}

            <Link
              href="/download"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Download App</span>
            </Link>
          </div>

        </div>
      </header>

      {/* ====================================================
          SLIM SECURITY / DOCTRINE SCOPE STRIP
         ==================================================== */}
      <div className="bg-slate-900 text-slate-300 px-3 sm:px-6 py-1 text-[11px] flex items-center justify-between gap-2 shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-1.5 truncate">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">
            Military Science Scope: 11 General Orders, army rank structures, drills, and readiness.
          </span>
        </div>
        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800 shrink-0">
          10RCDG
        </span>
      </div>

      {/* ====================================================
          MESSAGES BODY / CLEAN WELCOME STATE
         ==================================================== */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 flex flex-col"
      >
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          
          {/* CLEAN "ASK ANYTHING" WELCOME STATE (like modern AIs) */}
          {messages.length === 0 ? (
            <div className="my-auto py-6 sm:py-10 flex flex-col items-center text-center space-y-6">
              
              {/* Center Mascot Emblem */}
              <div className="relative">
                <RescomAiAvatar size="xl" variant="mascot" className="shadow-lg ring-4 ring-emerald-500/10" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-200 animate-pulse" />
              </div>

              {/* Headline & Description */}
              <div className="space-y-2 max-w-lg mx-auto">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight">
                  Ask anything about Basic ROTC & Military Science
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                  Official 10RCDG reference for Northern Mindanao cadets & reservists. Inquire about sentry orders, Philippine Army rank structures, troop drills, military courtesy, or the mobile app.
                </p>
              </div>

              {/* Modern Prompt Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full max-w-xl pt-1 sm:pt-2 text-left">
                {STARTER_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.query)}
                    className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-white hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs hover:shadow-xs active:scale-98 group text-left"
                  >
                    <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 border border-emerald-100 text-emerald-800 shrink-0 transition-colors">
                      {p.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-950 leading-snug">
                        {p.title}
                      </div>
                      <div className="text-[11px] text-slate-500 group-hover:text-slate-600 leading-snug truncate pt-0.5">
                        {p.desc}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 shrink-0 transition-colors" />
                  </button>
                ))}
              </div>

            </div>
          ) : (
            /* CONVERSATION STREAM */
            <div className="space-y-4 py-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 sm:gap-3 ${
                    m.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {m.sender === "ai" && (
                    <RescomAiAvatar size="sm" className="mt-1 shadow-2xs" />
                  )}
                  
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 sm:px-5 py-3.5 text-xs sm:text-sm leading-relaxed ${
                      m.sender === "user"
                        ? "bg-emerald-800 text-white rounded-br-xs shadow-xs font-medium"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    {m.text ? (
                      <FormattedMessageText text={m.text} isUser={m.sender === "user"} />
                    ) : (
                      <div className="flex items-center gap-2 py-1 text-slate-500 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        <span>Analyzing your response for a while...</span>
                      </div>
                    )}

                    {/* Action Links */}
                    {m.links && m.links.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                        {m.links.map((link, idx) => (
                          <Link
                            key={idx}
                            href={link.href}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{link.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 mt-1.5 px-1 shrink-0">
                    {m.timestamp}
                  </span>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          )}

        </div>
      </div>

      {/* ====================================================
          HORIZONTAL QUICK TOPICS STRIP (Shown during conversation)
         ==================================================== */}
      {messages.length > 0 && (
        <div className="bg-slate-100/90 border-t border-slate-200 py-1.5 px-3 sm:px-6 shrink-0">
          <div className="max-w-3xl mx-auto w-full flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 shrink-0 uppercase tracking-wider hidden sm:flex">
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              <span>Topics:</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 w-full">
              {ROTC_QUICK_TOPICS.map((topic, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(topic.query)}
                  disabled={isTyping}
                  className="text-[11px] text-slate-700 hover:text-emerald-950 bg-white hover:bg-emerald-50 px-3 py-1 rounded-full border border-slate-200 hover:border-emerald-300 font-medium transition-colors shrink-0 shadow-2xs disabled:opacity-50"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          STICKY BOTTOM INPUT DOCK
         ==================================================== */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-3xl mx-auto w-full space-y-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about Basic ROTC, 11 General Orders, army ranks, drills..."
              disabled={isTyping}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-colors"
            />
            <button
              type="submit"
              disabled={!query.trim() || isTyping}
              className="px-4 sm:px-5 py-2.5 sm:py-3 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>

          <p className="text-[10px] text-slate-400 text-center">
            Operating under Republic Act No. 7077 & RA 9163 • 10RCDG Reserve Command, PA
          </p>
        </div>
      </div>

    </div>
  );
}
