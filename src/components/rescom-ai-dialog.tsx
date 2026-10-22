"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Send,
  Shield,
  Smartphone,
  Download,
  RotateCcw,
  ChevronRight,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { RescomAiAvatar, RESCOM_AI_CONFIG } from "@/components/rescom-ai-avatar";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  links?: { label: string; href: string }[];
}

export const ACCURATE_KNOWLEDGE: {
  keywords: string[];
  response: string;
  links?: { label: string; href: string }[];
}[] = [
  // 1. THE 11 GENERAL ORDERS OF A SENTRY
  {
    keywords: ["general order", "sentry", "11 orders", "orders of a sentry", "general orders", "11 go"],
    response: `The 11 General Orders of a Sentry (Basic ROTC Military Science):

1. To take charge of this post and all government property in view.
2. To walk my post in a military manner, keeping always on the alert and observing everything that takes place within sight or hearing.
3. To report all violations of orders I am instructed to enforce.
4. To repeat all calls from posts more distant from the guardhouse than my own.
5. To quit my post only when properly relieved.
6. To receive, obey, and pass on to the sentry who relieves me all orders from the Commanding Officer, Officer of the Day, and Non-Commissioned Officers of the guard only.
7. To talk to no one except in line of duty.
8. To give the alarm in case of fire or disorder.
9. To call the Commander of the Guard in any case not covered by instructions.
10. To salute all officers and all colors and standards not cased.
11. To be especially watchful at night, and during the time for challenging, to challenge all persons on or near my post, and to allow no one to pass without proper authority.`,
  },

  // 2. PHILIPPINE ARMY RANK STRUCTURE
  {
    keywords: ["army rank", "afp rank", "rank structure", "commissioned officer", "enlisted personnel", "pvt", "pfc", "cpl", "sgt", "lieutenant", "captain", "major", "colonel", "general"],
    response: `Philippine Army Rank Structure (Regular & Reserve Force):

Commissioned Officers (CO):
• General (GEN) — 4 Silver Stars
• Lieutenant General (LTGEN) — 3 Silver Stars
• Major General (MGEN) — 2 Silver Stars
• Brigadier General (BGEN) — 1 Silver Star
• Colonel (COL) — 3 Sunbursts
• Lieutenant Colonel (LTC) — 2 Sunbursts
• Major (MAJ) — 1 Sunburst
• Captain (CPT) — 3 Gold/Bronze Triangles
• First Lieutenant (1LT) — 2 Triangles
• Second Lieutenant (2LT) — 1 Triangle

Senior Non-Commissioned Officers (NCO):
• First Chief Master Sergeant (FCMS) — E-10
• Chief Master Sergeant (CMS) — E-9
• Senior Master Sergeant (SMS) — E-8
• Master Sergeant (MSG) — E-7
• Technical Sergeant (TSG) — E-6
• Staff Sergeant (SSG) — E-5
• Sergeant (SGT) — E-4

Junior Enlisted Personnel (EP):
• Corporal (CPL) — E-3
• Private First Class (PFC) — E-2
• Private (PVT) — E-1`,
  },

  // 3. ROTC CADET OFFICER RANKS
  {
    keywords: ["cadet rank", "cadet officer", "cadet colonel", "c/col", "c/ltc", "c/maj", "c/cpt", "c/1lt", "c/2lt", "cadre", "advance rotc rank", "corps commander"],
    response: `ROTC Cadet Officer Rank Structure (DMST Leadership):

Cadet Commissioned Officers:
• Cadet Colonel (C/COL) — Regimental / Corps Commander (3 Silver Triangles / Diamonds)
• Cadet Lieutenant Colonel (C/LTC) — Battalion Commander (2 Silver Triangles)
• Cadet Major (C/MAJ) — Battalion Executive Officer / Operations S3 (1 Silver Triangle)
• Cadet Captain (C/CPT) — Company Commander (3 Gold/Bronze Bars)
• Cadet First Lieutenant (C/1LT) — Platoon Leader (2 Gold/Bronze Bars)
• Cadet Second Lieutenant (C/2LT) — Assistant Platoon Leader (1 Gold/Bronze Bar)

Cadet Non-Commissioned Officers (NCO):
• Cadet First Sergeant (C/FSG) — Company Senior NCO
• Cadet Staff Sergeant (C/SSG) — Platoon Sergeant
• Cadet Sergeant (C/SGT) — Squad Leader
• Cadet Corporal (C/CPL) — Assistant Squad Leader
• Cadet Private (C/PVT) — Basic ROTC Cadet (MS 1 & MS 2)`,
  },

  // 4. AFP CORE VALUES
  {
    keywords: ["core value", "values", "afp values", "honor", "patriotism", "duty", "karangalan", "bayan", "katapatan"],
    response: `Core Values of the Armed Forces of the Philippines (AFP):

1. HONOR (Karangalan):
The crowning value of a soldier. It is the bedrock of moral character that impels an individual to conduct themselves with truthfulness, personal integrity, and unwavering fidelity.

2. PATRIOTISM (Kabayanihan / Pagmamahal sa Bayan):
The perpetual devotion to the welfare of the Republic of the Philippines and the Filipino people. Placing national sovereignty, constitutional democracy, and civil welfare above personal convenience.

3. DUTY (Katapatan sa Tungkulin):
The steadfast commitment to perform all assigned responsibilities and obey lawful commands with dedication, technical competence, and discipline.`,
  },

  // 5. CADET HONOR CODE
  {
    keywords: ["honor code", "cadet code", "lie", "cheat", "steal", "honor system", "code of honor", "toleration"],
    response: `The Cadet Honor Code:

"A cadet will not lie, cheat, steal, nor tolerate among them those who do."

Principles of the Honor System:
1. No Lying: A cadet never utters falsehoods, fabricates facts, or gives misleading statements.
2. No Cheating: A cadet never takes unfair advantage in examinations, drills, or certifications.
3. No Stealing: A cadet never deprives another of their property without authorized permission.
4. The Non-Toleration Clause: Tolerating an honor violation committed by another cadet is considered a direct violation of the Honor Code itself.`,
  },

  // 6. MILITARY COURTESY & SALUTING
  {
    keywords: ["courtesy", "discipline", "salute", "reporting", "rules of the salute", "when to salute", "hand salute", "reporting rule"],
    response: `Military Courtesy and Discipline (Basic ROTC Principles):

• Discipline: The prompt, cheerful, and willing obedience to all lawful orders, resulting in coordinated unit effectiveness.
• Military Courtesy: The formal expression of respect and fellowship among soldiers. The Hand Salute is its highest traditional symbol.

Rules of the Salute:
1. Who is saluted:
   • The National Flag and National Anthem.
   • All commissioned officers of the AFP and allied foreign services.
   • High civilian officials (President, Vice President, Secretary of National Defense).
2. When to salute:
   • Out of doors when recognizing an officer within 6 to 30 paces.
   • When reporting to an officer indoors or outdoors.
3. When NOT to salute:
   • In civilian clothes (except hand over heart for the Flag/Anthem).
   • When carrying bulky items in both hands.
   • Actively performing tactical field work or firing exercises.

Cadet Reporting Protocol:
Halt two paces from the officer, execute a crisp hand salute, and state:
"Sir/Ma'am, Cadet (Last Name), reporting for instructions, Sir/Ma'am."`,
  },

  // 7. DRILLS AND CEREMONIES (D&C)
  {
    keywords: ["drill", "ceremony", "command", "preparatory command", "command of execution", "facing", "march", "cadence", "parade rest", "attention", "harap", "tikas", "paluwag"],
    response: `Drills and Ceremonies (Basic ROTC D&C Fundamentals):

Two Parts of a Drill Command:
1. Preparatory Command: Announces the direction or movement to be executed, giving cadets time to prepare mentally (e.g., "Paharap...", "Pasulong...").
2. Command of Execution: Directs the exact instant the movement must be carried out decisively (e.g., "...Harap!", "...Kad!").

Stationary Facing Movements:
• Harap sa Kanan (Right Face) — 90-degree turn to the right on right heel and left toe.
• Harap sa Kaliwa (Left Face) — 90-degree turn to the left on left heel and right toe.
• Harap sa Likod (About Face) — 180-degree turn to the rear, pivoting on right heel and left toe.

Rest Positions:
• Tikas Pahinga (Parade Rest) — Left foot moves 12 inches to the left, hands clasped behind back.
• Tindig Paluwag (Stand at Ease) — Similar to parade rest with eyes following the commander.
• Paluwag (At Ease) — Free to move feet while keeping right foot in place, silent.
• Pahinga (Rest) — Allowed to move and talk quietly unless called to attention.

Cadence:
• Quick Time: 120 steps per minute (standard 30-inch marching step).
• Double Time: 180 steps per minute (jogging cadence).`,
  },

  // 8. INTERIOR GUARD DUTY
  {
    keywords: ["interior guard", "guard duty", "countersign", "parole", "challenge", "password", "officer of the day", "commander of the guard", "sentry post"],
    response: `Interior Guard Duty (Basic ROTC Principles):

Purpose:
To preserve order, protect military personnel and government property, and enforce specific regulations within a military camp or cantonment.

Guard Force Composition:
1. Officer of the Day (OD): Supervises the entire interior guard force on behalf of the Group Commander.
2. Commander of the Guard (CG): Senior officer or NCO responsible for instruction and conduct of the guard.
3. Sergeant of the Guard: Maintains the guard report and manages sentry shift rotations.
4. Corporal of the Guard: Posts and relieves sentries on their respective reliefs.
5. Sentries / Guards on Post: Perform sentinel duties across assigned watch sectors.

The Countersign:
A security identifier consisting of:
• Challenge: Secret word given by the sentry (e.g., "Luzon").
• Password: Secret reply given by the person challenged (e.g., "Manila").`,
  },

  // 9. FIRST AID & FIELD SANITATION
  {
    keywords: ["first aid", "hygiene", "sanitation", "heat stroke", "heat exhaustion", "heat cramp", "tourniquet", "bandage", "triage", "field sanitation"],
    response: `Military Hygiene & Heat Injury First Aid (Field Training):

Managing Heat Injuries During Drill Formations:
1. Heat Cramps:
   • Signs: Painful muscle spasms in abdomen, calves, or shoulders.
   • First Aid: Move cadet to shade, rest, and hydrate with water and electrolytes.
2. Heat Exhaustion:
   • Signs: Profuse sweating, pale cold skin, dizziness, nausea, weak rapid pulse.
   • First Aid: Loosen uniform/web gear, elevate legs 8-12 inches, fan the cadet, apply cool damp cloths.
3. Heat Stroke (Medical Emergency):
   • Signs: Sweating stops; skin is hot, dry, and flushed; high core temperature; delirium or unconsciousness.
   • First Aid: Call medics immediately! Strip to undershirt, aggressively cool body with ice/water on armpits and groin, evacuate to station infirmary.

Severe Bleeding Control:
• Step 1: Direct, firm pressure over the wound using sterile field dressing.
• Step 2: Elevate injured extremity above heart level if no fracture is present.
• Step 3: Apply Combat Application Tourniquet (CAT) 2-3 inches above the wound (never over a joint) for life-threatening arterial bleeding. Record application time on forehead or tourniquet band.`,
  },

  // 10. SOLDIER'S CREED (KAWAL PILIPINO)
  {
    keywords: ["soldier's creed", "kawal pilipino", "creed", "panunumpa", "panata"],
    response: `The Soldier's Creed (Ang Kawal Pilipino):

"Ako ay Kawal Pilipino.
Naglilingkod ako nang buong katapatan at buwis-buhay sa Republika ng Pilipinas.
Ipinagmamalaki ko ang marangal na tradisyon ng Hukbong Sandatahang Lakas ng Pilipinas.

Itataguyod ko ang Konstitusyon,
Ipagtatanggol ang Sambayanang Pilipino,
At susundin ang lahat ng makatarungang utos ng aking mga pinuno.

Karangalan, Katapatan, at Kagitingan ang aking gabay sa bawat laban at tungkulin."`,
  },

  // 11. REPUBLIC ACT 7077 & RA 9163 (ROTC & RESERVE FORCE)
  {
    keywords: ["ra 7077", "ra 9163", "nstp", "citizen armed force", "reservist act", "reserve force", "ready reserve", "standby reserve", "basic rotc", "advance rotc"],
    response: `ROTC & Reserve Force Integration (Republic Act 7077 & RA 9163):

• Republic Act No. 7077 (Citizen Armed Forces of the Philippines Reservist Act):
  Governs the organization, training, and mobilization of citizen soldiers.
  - Ready Reserve: Reservists ready for immediate call-up in national defense or disaster operations.
  - Standby Reserve: Reservists mobilized in times of general war or national emergency.
  - Retired Reserve: Inactive reservists who have reached retirement age or disability.

• Republic Act No. 9163 (National Service Training Program - NSTP):
  Mandates tertiary students to undergo one of three components (ROTC, CWTS, LTS).
  - Basic ROTC: 2-semester military science course (MS 1 & MS 2) instilling military discipline, civic duties, disaster preparedness, and basic combat tactics.
  - Advance ROTC: 2-year leadership program producing Cadet Officers who can be commissioned as Second Lieutenants (2LT) in the Reserve Force.

• 10RCDG Supervision:
  The 10th Regional Community Defense Group exercises direct oversight of all university Department of Military Science and Tactics (DMST) units across Region X.`,
    links: [
      { label: "Download RESCOM ALERT App", href: "/download" },
    ],
  },

  // 12. CHAIN OF COMMAND
  {
    keywords: ["chain of command", "hierarchy", "command structure", "csafp", "cgpa", "commander-in-chief", "dnd"],
    response: `Chain of Command (Armed Forces of the Philippines):

1. Commander-in-Chief — President of the Republic of the Philippines
2. Secretary of National Defense (SND)
3. Chief of Staff, Armed Forces of the Philippines (CSAFP)
4. Commanding General, Philippine Army (CGPA)
5. Commander, Reserve Command, Philippine Army (RESCOM PA)
6. Group Commander, 10th Regional Community Defense Group (10RCDG)
7. Director, Community Defense Center (CDC Battalion)
8. Commandant, Department of Military Science and Tactics (DMST ROTC Unit)
9. Cadet Corps Commander (C/COL) / Cadet Company & Platoon Leaders`,
  },

  // 13. 10RCDG & REGION X CDCs
  {
    keywords: ["10rcdg", "camp evangelista", "region 10", "region x", "cagayan de oro", "misamis", "bukidnon", "camiguin", "iligan", "cdc"],
    response: `10th Regional Community Defense Group (10RCDG):

• Headquarters: Camp Evangelista, Patag, Cagayan de Oro City, Northern Mindanao (Region X)
• Parent Command: Reserve Command, Philippine Army (RESCOM PA)
• Operational Units (Community Defense Centers):
  - 1001st CDC — Camiguin
  - 1002nd CDC — Misamis Oriental (Cagayan de Oro)
  - 1003rd CDC — Bukidnon (Malaybalay City)
  - 1004th CDC — Misamis Occidental (Oroquieta City)
  - 1005th CDC — Iligan City & Lanao del Norte
• Primary Mission: Administer, organize, train, and equip Ready Reserve Battalions and University ROTC units for disaster response, civic action, and territorial defense.`,
  },

  // 14. OFFICIAL RESCOM ALERT MOBILE APP
  {
    keywords: ["download", "app", "apk", "install", "android", "version", "mobile", "siren"],
    response: `Official RESCOM ALERT Android Mobile Application:

• Current Release: Version 1.1.0 
• Android Compatibility: Android 8.0 through Android 15
• Purpose: Secure mass notification and mobilization system for Ready Reservists, ROTC cadre, and command personnel.
• Key Capability: Android audio service override capable of sounding high-decibel alert sirens during Red Alert emergencies even when phones are silenced.
• Direct APK Link: Available for direct download at the official download hub.`,
    links: [
      { label: "Go to Mobile App Download Portal", href: "/download" },
      { label: "Step-by-Step Installation Guide", href: "/download/guide" },
    ],
  },

  // 15. ROSTER VERIFICATION & PAIRING
  {
    keywords: ["verify", "number", "roster", "phone", "enlist", "pairing", "device"],
    response: `Roster Verification & Device Pairing:

• Reservists pair their registered Philippine mobile number (+63) to receive unit broadcasts.
• Only mobile numbers verified in the official 10RCDG personnel roster are authorized for pairing.
• If your number has changed or is not yet registered, contact your designated Community Defense Center (CDC) officer at Camp Evangelista.`,
    links: [
      { label: "Verify Mobile Number at Download Hub", href: "/download" },
    ],
  },

  // 16. OPSEC SHIELD & CLASSIFIED RESTRICTION
  {
    keywords: ["classified", "database", "roster list", "soldier list", "all soldiers", "phone numbers", "names of soldiers", "confidential", "passwords", "weapons list", "ammunition", "secret"],
    response: `OPSEC POLICY ENFORCEMENT:
Access Denied.

Personnel rosters, contact numbers, mobilization rosters, and operational tactical data are strictly restricted to authorized command staff behind authenticated terminals at Camp Evangelista.

RESCOM AI operates strictly as an unclassified public military science guide and has zero access to internal military records or soldier rosters.`,
  },
];

// QUICK TOPIC PILLS FOR ROTC STUDENTS & CADETS
export const ROTC_QUICK_TOPICS = [
  { label: "11 General Orders", query: "11 General Orders of a Sentry" },
  { label: "Army Ranks", query: "Philippine Army Rank Structure" },
  { label: "Cadet Ranks", query: "ROTC Cadet Officer Ranks" },
  { label: "AFP Core Values", query: "Core Values of the AFP" },
  { label: "Cadet Honor Code", query: "The Cadet Honor Code" },
  { label: "Military Courtesy", query: "Military Courtesy and Saluting Rules" },
  { label: "Drills & Commands", query: "Drills and Ceremonies Commands" },
  { label: "Interior Guard Duty", query: "Interior Guard Duty and Sentry Roles" },
  { label: "Heat Injury First Aid", query: "Military Hygiene and Heat Injury First Aid" },
  { label: "RA 7077 & ROTC", query: "Republic Act 7077 and ROTC Integration" },
  { label: "Download Mobile App", query: "How to download the Android APK?" },
];

// Clean inline text formatting (transforms **bold** into clean strong tags without raw asterisks)
function parseInlineFormatting(str: string, isUser: boolean = false): React.ReactNode[] {
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong
          key={i}
          className={isUser ? "font-bold text-white" : "font-semibold text-slate-950"}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function FormattedMessageText({ text, isUser = false }: { text: string; isUser?: boolean }) {
  if (isUser) {
    return <div className="whitespace-pre-wrap font-medium">{text}</div>;
  }

  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Header lines: ### Header or ## Header (render without raw hashtags)
        const headerMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
        if (headerMatch) {
          return (
            <div key={idx} className="font-bold text-slate-950 text-xs sm:text-sm pt-1 pb-0.5 border-b border-slate-100">
              {parseInlineFormatting(headerMatch[1], false)}
            </div>
          );
        }

        // Blockquotes: > Quote (render clean quote bar without raw > symbol)
        const quoteMatch = trimmed.match(/^>\s*(.+)$/);
        if (quoteMatch) {
          return (
            <div key={idx} className="border-l-2 border-emerald-600 pl-2.5 py-0.5 bg-slate-50/80 rounded-r text-slate-700 italic my-1">
              {parseInlineFormatting(quoteMatch[1], false)}
            </div>
          );
        }

        // Bullet lists: - item, * item, • item (render with clean green bullet dot)
        const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5 my-0.5">
              <span className="text-emerald-700 font-bold shrink-0 leading-relaxed">•</span>
              <span className="flex-1 leading-relaxed">{parseInlineFormatting(bulletMatch[1], false)}</span>
            </div>
          );
        }

        // Numbered lists: 1. item, 2. item (render clean aligned numbered items)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5 my-0.5">
              <span className="text-emerald-800 font-bold shrink-0 text-xs leading-relaxed">{numMatch[1]}.</span>
              <span className="flex-1 leading-relaxed">{parseInlineFormatting(numMatch[2], false)}</span>
            </div>
          );
        }

        // Regular paragraph text
        return (
          <div key={idx} className="leading-relaxed">
            {parseInlineFormatting(line, false)}
          </div>
        );
      })}
    </div>
  );
}

interface RescomAiDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RescomAiDialog({ isOpen, onClose }: RescomAiDialogProps) {
  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Greetings, Cadet / Citizen Soldier. I am RESCOM AI, your dedicated military science reference from the 10th Regional Community Defense Group (10RCDG), Reserve Command, Philippine Army.\n\nMy knowledge is strictly restricted to Basic ROTC Military Science (11 General Orders, Philippine Army rank structures, cadet officer ranks, AFP core values, military courtesy, drills, interior guard duty, first aid) and official RESCOM ALERT app guidance.\n\nSelect a topic below or type your military science inquiry.",
      timestamp: "Active",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (messages.length <= 1) {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = 0;
        }
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages.length, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const raw = (textToSend || query).trim();
    if (!raw || isTyping || cooldown > 0) return;

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

    // 1. SMART LOCAL DOCTRINE INTERCEPT:
    // If the cadet is asking for standard reference doctrine (or clicks a chip),
    // answer instantly from local verified database. Zero API cost, zero lag, never 429!
    const lower = raw.toLowerCase();
    const directDoctrineMatch = ACCURATE_KNOWLEDGE.find((item) =>
      item.keywords.some((kw) => {
        return lower === kw || lower.startsWith(kw) || (lower.includes(kw) && lower.split(" ").length <= 7);
      })
    );

    if (directDoctrineMatch) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  text: directDoctrineMatch.response,
                  links: directDoctrineMatch.links,
                }
              : msg
          )
        );
        setIsTyping(false);
        setCooldown(2);
      }, 300);
      return;
    }

    setIsTyping(true);

    try {
      // Build conversation history for the live AI backend
      const history = messages
        .filter((m) => m.id !== "welcome" && m.text && m.text.trim().length > 0)
        .map((m) => ({
          role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: m.text,
        }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: raw, history }),
      });

      // 2. FRIENDLY RATE-LIMIT (429) ADVISORY
      if (res.status === 429) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  text: `Advisory: Mataas ang kasalukuyang bilang ng mga kadeteng kumukonsulta sa RESCOM AI sa Northern Mindanao (High Volume Traffic).

Mangyaring maghintay ng 10–15 segundo bago subukang muli ang iyong katanungan, o sumangguni sa mga opisyal na doktrina sa ibaba habang naghihintay:`,
                  links: [
                    { label: "The 11 General Orders of a Sentry", href: "/rescom-ai" },
                    { label: "Philippine Army Rank Structure", href: "/rescom-ai" },
                    { label: "The Cadet Honor Code", href: "/rescom-ai" },
                    { label: "Download RESCOM ALERT APK", href: "/download" },
                  ],
                }
              : msg
          )
        );
        setIsTyping(false);
        setCooldown(10);
        return;
      }

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
          const lowerCase = raw.toLowerCase();
          const shouldAttachAppLinks =
            lowerCase.includes("download") ||
            lowerCase.includes("app") ||
            lowerCase.includes("apk") ||
            lowerCase.includes("install") ||
            lowerCase.includes("mobile") ||
            lowerCase.includes("alert");

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
          setCooldown(3);
          return;
        }
      }
    } catch (err) {
      console.warn("Live AI streaming error, executing local doctrine fallback", err);
    }

    // Graceful fallback to verified local doctrine database
    let match = ACCURATE_KNOWLEDGE.find((item) =>
      item.keywords.some((kw) => lower.includes(kw))
    );

    if (!match) {
      match = {
        keywords: [],
        response: `Paumanhin, kasalukuyang nagre-reconnect ang live RESCOM AI intelligence network. Maaari mong ulitin ang iyong katanungan tungkol sa military doctrine, cadet leadership, o pumili sa mga gabay sa ibaba habang muling kumokonekta:

• The 11 General Orders of a Sentry
• Philippine Army & Cadet Officer Rank Structures
• AFP Core Values & The Cadet Honor Code
• Military Courtesy, Saluting & Reporting Rules
• Drills and Ceremonies (Commands & Movements)
• Interior Guard Duty & Countersign
• Military Hygiene & Heat Injury First Aid
• RA 7077 (Citizen Armed Forces) & RA 9163`,
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
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: "Terminal reset. Ready for Basic ROTC military science inquiries and RESCOM ALERT guidance.",
        timestamp: "Active",
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/40 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal Card */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden text-slate-900">
        
        {/* Header with Official Generated RESCOM AI Mascot Badge */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <RescomAiAvatar size="lg" variant="mascot" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-slate-950 tracking-tight whitespace-nowrap">
                  {RESCOM_AI_CONFIG.name}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 truncate">
                  {RESCOM_AI_CONFIG.badgeTitle}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {RESCOM_AI_CONFIG.roleDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleReset}
              title="Reset Terminal"
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200/60 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security & Scope Banner */}
        <div className="px-3.5 sm:px-5 py-1.5 sm:py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 min-w-0">
            <Shield className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="hidden sm:inline">Strict Military Science scope: 11 General Orders, ranks, drills & readiness.</span>
            <span className="sm:hidden truncate">Strict Military Science reference.</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
            10RCDG • REGION X
          </span>
        </div>

        {/* Messages Body */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 bg-[#f8fafc]"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${
                m.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {m.sender === "ai" && (
                <RescomAiAvatar size="sm" className="mt-1" />
              )}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  m.sender === "user"
                    ? "bg-emerald-800 text-white rounded-br-none shadow-xs font-medium"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-xs"
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

                {m.links && m.links.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                    {m.links.map((link, idx) => (
                      <Link
                        key={idx}
                        href={link.href}
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-700 hover:underline"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{link.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {m.timestamp}
              </span>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* ROTC Quick Inquiries Strip */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            <span>Basic ROTC Study Topics (MS 1 & MS 2)</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {ROTC_QUICK_TOPICS.map((topic, i) => (
              <button
                key={i}
                onClick={() => handleSend(topic.query)}
                className="text-[11px] text-slate-700 hover:text-emerald-900 bg-slate-100 hover:bg-emerald-50 px-2.5 py-1 rounded-md border border-slate-200 hover:border-emerald-300 transition-colors text-left"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about 11 General Orders, ranks, drills, honor code, or app..."
            className="flex-1 bg-white border border-slate-300 rounded-md px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          />
          <button
            type="submit"
            disabled={!query.trim() || isTyping || cooldown > 0}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-800 text-white font-semibold rounded-md text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {cooldown > 0 ? (
              <span className="font-mono text-xs">{cooldown}s</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
