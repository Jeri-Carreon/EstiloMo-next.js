"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";

type MessageButton = {
  label: string;
  value: string;
  type?: "barber";
};

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  buttons?: MessageButton[];
  links?: {
    label: string;
    url: string;
  }[];
};

type ChatbotSetting = {
  key: string;
  label: string;
  response: string;
};

type BarberOption = {
  id: string;
  name: string;
  isActive?: boolean;
};

const fallbackSettings: ChatbotSetting[] = [
  {
    key: "greeting",
    label: "Greeting / Main Menu",
    response:
      "Welcome to The Barbs Bro!\n\nI am your virtual assistant. I can help you with inquiries regarding our barbershop!\n\nHow may I help you today?",
  },
  {
    key: "fallback",
    label: "Fallback Response",
    response:
      "Sorry, I can only answer questions about The Barbs Bro services, prices, location, operating hours, social media, and appointment guidance.",
  },
];

const socialLinks = [
  {
    label: "Facebook",
    url: "https://www.facebook.com/thebarbsbro",
  },
  {
    label: "Instagram",
    url: "https://www.instagram.com/thebarbsbro",
  },
  {
    label: "TikTok",
    url: "https://www.tiktok.com/@thebarbsbro",
  },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function wordsMatch(left: string, right: string) {
  if (left === right) return true;

  const longestLength = Math.max(left.length, right.length);
  const allowedDistance = longestLength >= 8 ? 2 : longestLength >= 4 ? 1 : 0;

  return allowedDistance > 0 && editDistance(left, right) <= allowedDistance;
}

function matchesAny(text: string, phrases: string[]) {
  const normalizedText = normalizeText(text);
  const textWords = normalizedText.split(" ").filter(Boolean);

  return phrases.some((phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) return false;

    if (` ${normalizedText} `.includes(` ${normalizedPhrase} `)) return true;

    const phraseWords = normalizedPhrase.split(" ");
    return phraseWords.every((phraseWord) =>
      textWords.some((textWord) => wordsMatch(textWord, phraseWord))
    );
  });
}

export default function ChatbotFloatingButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showQuickOptions, setShowQuickOptions] = useState(true);
  const [input, setInput] = useState("");
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [loadingBot, setLoadingBot] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);

  const nextMessageId = (suffix: string) => {
    messageIdRef.current += 1;
    return `${messageIdRef.current}-${suffix}`;
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({
      behavior: "auto",
      block: "end",
    });
  };

  const { data: chatbotSettings = fallbackSettings } = useQuery<ChatbotSetting[]>({
    queryKey: ["publicChatbotSettings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/chatbot", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
        throw new Error(data?.error || "Failed to load chatbot settings.");
      }

      return data;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const { data: chatbotBarbers = [] } = useQuery<BarberOption[]>({
    queryKey: ["publicChatbotBarbers"],
    queryFn: async () => {
      const res = await fetch("/api/chatbot/barbers", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !Array.isArray(data.barbers)) {
        throw new Error(data?.error || "Failed to load chatbot barbers.");
      }

      return data.barbers;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const settings = chatbotSettings ?? fallbackSettings;
  const barbers = (chatbotBarbers ?? []).filter(
    (barber) => barber.isActive !== false
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 50);
    }
  }, [open]);

  const optionItems = useMemo(
    () =>
      settings.filter(
        (item) => item.key !== "greeting" && item.key !== "fallback"
      ),
    [settings]
  );

  const getResponse = (key: string) => {
    return (
      settings.find((item) => item.key === key)?.response ||
      fallbackSettings.find((item) => item.key === key)?.response ||
      ""
    );
  };

  const findOption = (terms: string[]) =>
    optionItems.find((option) =>
      matchesAny(
        `${option.key.replaceAll("_", " ")} ${option.label}`,
        terms
      )
    );

  const isBarberAvailabilityOption = (text: string) => {
    const value = normalizeText(text);

    return matchesAny(value, [
      "barber availability",
      "barber schedule",
      "available barber",
      "available stylist",
      "who is available",
      "sino available",
      "available ba",
      "availability",
      "barber shift",
      "barber duty",
      "free barber",
      "barber list",
      "list of barbers",
      "choose barber",
      "select barber",
      "preferred barber",
      "barber roster",
      "barber today",
      "barber tomorrow",
      "barber ngayon",
      "barber bukas",
      "staff available",
      "stylist available",
      "may available",
      "vacant barber",
      "free slot",
      "available slot",
      "open slot",
      "time slot",
    ]);
  };

  const isServicesOption = (text: string) => {
    const value = normalizeText(text);

    return matchesAny(value, [
      "service", "services", "service list", "service menu", "menu",
      "offer", "offers", "price", "prices", "pricing", "price list",
      "rate", "rates", "fee", "fees", "charge", "charges", "cost",
      "how much", "how much is", "magkano", "presyo", "bayad", "serbisyo",
      "haircut", "hair cut", "hair style", "hairstyle", "style", "cut",
      "trim", "gupit", "fade", "taper", "undercut", "buzz cut",
      "crew cut", "kids cut", "child haircut", "beard", "balbas",
      "mustache", "moustache", "shave", "ahit", "razor", "grooming",
      "hot oil", "hair wash", "shampoo", "bleach", "color", "colour",
      "kulay", "dye", "perm", "rebond", "treatment", "mask", "scalp",
      "facial", "massage", "promo", "promotion", "discount", "deal",
      "package", "bundle",
    ]);
  };

  const fetchServicesText = async () => {
    try {
      const res = await fetch("/api/chatbot/services", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        return data?.error || "Failed to fetch available services.";
      }

      return data.responseText || "No available services are listed right now.";
    } catch (error) {
      console.error("FETCH CHATBOT SERVICES ERROR:", error);
      return "Failed to fetch available services.";
    }
  };

  const handleBarberClick = async (barberId: string, barberName: string) => {
    if (loadingBarbers) return;

    const loadingId = nextMessageId("loading-barber");

    setMessages((prev) => [
      ...prev,
      {
        id: nextMessageId("user"),
        role: "user",
        text: barberName,
      },
      {
        id: loadingId,
        role: "bot",
        text: "Checking barber schedule...",
      },
    ]);

    setLoadingBarbers(true);

    try {
      const res = await fetch(`/api/chatbot/barbers/${barberId}/schedule`, {
        cache: "no-store",
      });

      const data = await res.json();

      setMessages((prev) => prev.filter((item) => item.id !== loadingId));

      if (!res.ok || !data?.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId("bot"),
            role: "bot",
            text: data?.error || "Failed to fetch barber schedule.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId("bot"),
          role: "bot",
          text: data.responseText,
        },
      ]);
    } catch (error) {
      console.error("FETCH BARBER SCHEDULE ERROR:", error);

      setMessages((prev) => prev.filter((item) => item.id !== loadingId));

      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId("bot"),
          role: "bot",
          text: "Failed to fetch barber schedule.",
        },
      ]);
    } finally {
      setLoadingBarbers(false);
      setShowQuickOptions(false);
    }
  };

  const getBotReply = async (text: string): Promise<Message> => {
    const msg = normalizeText(text);

    const directOptionMatch = optionItems.find((item) => {
      const label = normalizeText(item.label);
      const key = normalizeText(item.key.replaceAll("_", " "));
      return matchesAny(msg, [label, key]);
    });

    if (directOptionMatch) {
      if (
        directOptionMatch.key === "services_prices" ||
        isServicesOption(directOptionMatch.label)
      ) {
        const servicesText = await fetchServicesText();

        return {
          id: nextMessageId("bot"),
          role: "bot",
          text: servicesText,
        };
      }

      if (
        directOptionMatch.key === "barber_availability" ||
        isBarberAvailabilityOption(directOptionMatch.label)
      ) {
        return {
          id: nextMessageId("bot"),
          role: "bot",
          text:
            directOptionMatch.response || "Pick a barber to show availability:",
          buttons: barbers.map((barber) => ({
            label: barber.name,
            value: barber.id,
            type: "barber",
          })),
        };
      }

      const needsLink =
        directOptionMatch.key.includes("social") ||
        directOptionMatch.key.includes("receptionist") ||
        directOptionMatch.key.includes("contact") ||
        normalizeText(directOptionMatch.label).includes("social") ||
        normalizeText(directOptionMatch.label).includes("receptionist") ||
        normalizeText(directOptionMatch.label).includes("contact");

      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: directOptionMatch.response,
        links: needsLink
          ? [
              {
                label: "Open Facebook Page",
                url: "https://www.facebook.com/thebarbsbro",
              },
              {
                label: "Open Instagram Page",
                url: "https://www.instagram.com/thebarbsbro",
              },
              {
                label: "Open TikTok Page",
                url: "https://www.tiktok.com/@thebarbsbro",
              },
            ]
          : undefined,
      };
    }

    if (isServicesOption(text)) {
      const servicesText = await fetchServicesText();

      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: servicesText,
      };
    }

    if (isBarberAvailabilityOption(text)) {
      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: "Pick a barber to show availability:",
        buttons: barbers.map((barber) => ({
          label: barber.name,
          value: barber.id,
          type: "barber",
        })),
      };
    }

    if (
      matchesAny(msg, [
        "receptionist",
        "contact",
        "contact number",
        "phone",
        "phone number",
        "telephone",
        "hotline",
        "cellphone",
        "mobile",
        "mobile number",
        "numero",
        "number",
        "email",
        "email address",
        "reach you",
        "reach the shop",
        "call",
        "tawag",
        "tawagan",
        "text",
        "message",
        "messenger",
        "chat with staff",
        "talk to staff",
        "talk to a person",
        "speak to someone",
        "speak with staff",
        "kausapin",
        "admin",
        "support",
        "customer support",
      ])
    ) {
      const item = findOption([
        "talk to receptionist",
        "receptionist",
        "contact",
        "support",
      ]);

      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: item?.response || getResponse("fallback"),
        links: [
          {
            label: "Chat with Receptionist on Facebook",
            url: "https://www.facebook.com/thebarbsbro",
          },
        ],
      };
    }

    if (
      matchesAny(msg, [
        "facebook",
        "fb",
        "instagram",
        "ig",
        "tiktok",
        "social",
        "social media",
        "social page",
        "official page",
        "social account",
        "social profile",
        "social link",
        "dm",
        "direct message",
        "online page",
        "follow",
      ])
    ) {
      const item = findOption(["social media", "social", "facebook"]);

      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: item?.response || getResponse("fallback"),
        links: socialLinks,
      };
    }

    if (
      matchesAny(msg, [
        "book",
        "booking",
        "book online",
        "booking link",
        "how to book",
        "can i book",
        "make a booking",
        "mag book",
        "magpa book",
        "pa appointment",
        "appointment",
        "make appointment",
        "set appointment",
        "get appointment",
        "appointment online",
        "appointment date",
        "schedule a visit",
        "schedule haircut",
        "reservation",
        "reserve",
        "reschedule",
        "change appointment",
        "move appointment",
        "cancel booking",
        "cancel appointment",
        "walk in",
        "walkin",
        "walk in allowed",
        "accept walk ins",
        "queue",
      ])
    ) {
      const item = findOption([
        "book appointment",
        "appointment",
        "booking",
        "reservation",
      ]);

      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: item?.response || getResponse("fallback"),
      };
    }

    if (
      matchesAny(msg, [
        "location",
        "exact location",
        "located",
        "branch",
        "shop address",
        "barbershop address",
        "where is the shop",
        "where are you",
        "saan kayo",
        "saan ang shop",
        "saan located",
        "saan banda",
        "address",
        "map",
        "map pin",
        "google maps",
        "directions",
        "direction",
        "landmark",
        "near",
        "nearby",
        "paano pumunta",
        "how to get there",
        "open",
        "open now",
        "are you open",
        "business hours",
        "opening hours",
        "closed",
        "sarado",
        "bukas ba",
        "bukas ngayon",
        "bukas bukas",
        "closing",
        "closing time",
        "until what time",
        "opening",
        "hours",
        "shop hours",
        "what time",
        "anong oras",
        "what days",
        "anong araw",
        "weekday",
        "weekend",
        "sunday",
        "monday",
        "holiday",
        "operating hours",
        "open today",
        "open tomorrow",
      ])
    ) {
      const item = findOption([
        "shop location hours",
        "location",
        "address",
        "operating hours",
        "hours",
      ]);

      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: item?.response || getResponse("fallback"),
      };
    }

    if (
      matchesAny(msg, [
        "hi",
        "hello",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
        "good day",
        "greetings",
        "howdy",
        "yo",
        "kumusta",
        "kamusta",
        "magandang umaga",
        "magandang hapon",
        "magandang gabi",
      ])
    ) {
      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: "Hello! How can I help you today?",
      };
    }

    if (
      matchesAny(msg, [
        "thank",
        "thanks",
        "thank you",
        "many thanks",
        "appreciate it",
        "ty",
        "salamat",
        "maraming salamat",
      ])
    ) {
      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: "You're welcome!",
      };
    }

    if (
      matchesAny(msg, [
        "help",
        "help me",
        "assist me",
        "assistance",
        "what can you do",
        "what can i ask",
        "show options",
        "show choices",
        "questions",
      ])
    ) {
      return {
        id: nextMessageId("bot"),
        role: "bot",
        text:
          "I can help with services and prices, appointments, barber availability, shop location and hours, social media, or contacting the receptionist.",
      };
    }

    if (
      matchesAny(msg, [
        "bye",
        "goodbye",
        "see you",
        "later",
        "paalam",
      ])
    ) {
      return {
        id: nextMessageId("bot"),
        role: "bot",
        text: "Goodbye! We hope to see you at The Barbs Bro soon.",
      };
    }

    return {
      id: nextMessageId("bot"),
      role: "bot",
      text: getResponse("fallback"),
    };
  };

  const sendMessage = async (text?: string) => {
    if (loadingBot) return;

    const messageText = (text ?? input).trim();

    if (!messageText) return;

    const loadingId = nextMessageId("loading-bot");

    setMessages((prev) => [
      ...prev,
      {
        id: nextMessageId("user"),
        role: "user",
        text: messageText,
      },
      {
        id: loadingId,
        role: "bot",
        text: "Checking...",
      },
    ]);

    setInput("");
    setShowQuickOptions(false);
    setLoadingBot(true);

    const botMessage = await getBotReply(messageText);

    setMessages((prev) => [
      ...prev.filter((item) => item.id !== loadingId),
      botMessage,
    ]);

    setLoadingBot(false);
  };

  const greetingParts = getResponse("greeting").split("\n\n");

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 1200,
      }}
    >
      {open && (
        <div
          style={{
            position: "relative",
            width: 390,
            maxWidth: "calc(100vw - 32px)",
            height: "min(620px, calc(100vh - 130px))",
            display: "flex",
            flexDirection: "column",
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: "#fff",
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
            marginBottom: 18,
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chatbot"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#f4f4f4",
              color: "#111",
              cursor: "pointer",
              fontSize: 24,
              lineHeight: 1,
              zIndex: 5,
              boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
            }}
          >
            ×
          </button>

          <div
            style={{
              padding: "16px 58px 16px 18px",
              backgroundColor: "#111",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800 }}>Chatbot</div>
            <div style={{ fontSize: 12, color: "#bbb", marginTop: 3 }}>
              Virtual assistant for The Barbs Bro
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 18,
              backgroundColor: "#f4f4f4",
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 18,
                padding: 16,
                marginBottom: 14,
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 10 }}>
                {greetingParts[0] || "Welcome to The Barbs Bro!"}
              </div>

              {greetingParts.slice(1).map((part) => (
                <div
                  key={part}
                  style={{
                    fontSize: 13,
                    color: "#555",
                    lineHeight: 1.6,
                    marginTop: 8,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {part}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    alignSelf:
                      message.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    padding: "11px 14px",
                    borderRadius:
                      message.role === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    backgroundColor:
                      message.role === "user" ? "#111" : "#fff",
                    color: message.role === "user" ? "#fff" : "#111",
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    boxShadow:
                      message.role === "bot"
                        ? "0 2px 8px rgba(0,0,0,0.06)"
                        : "none",
                  }}
                >
                  <div>{message.text}</div>

                  {message.links && message.links.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginTop: 10,
                        width: "100%",
                      }}
                    >
                      {message.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "80%",
                            padding: "10px 14px",
                            backgroundColor: "#111",
                            color: "#fff",
                            borderRadius: 999,
                            textDecoration: "none",
                            fontSize: 12,
                            fontWeight: 700,
                            boxSizing: "border-box",
                          }}
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}

                  {message.buttons && message.buttons.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {message.buttons.map((button) => (
                        <button
                          key={button.value}
                          type="button"
                          disabled={loadingBarbers}
                          onClick={() => {
                            if (button.type === "barber") {
                              void handleBarberClick(button.value, button.label);
                            }
                          }}
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: 999,
                            backgroundColor: "#fff",
                            color: "#111",
                            padding: "8px 12px",
                            fontSize: 12,
                            cursor: loadingBarbers ? "not-allowed" : "pointer",
                          }}
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div ref={bottomRef} />
            </div>

            {showQuickOptions && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 9,
                  marginTop: 16,
                }}
              >
                {optionItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    disabled={loadingBot}
                    onClick={() => void sendMessage(item.label)}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 999,
                      backgroundColor: "#fff",
                      color: "#111",
                      padding: "9px 13px",
                      fontSize: 13,
                      cursor: loadingBot ? "not-allowed" : "pointer",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {!showQuickOptions && (
              <button
                type="button"
                onClick={() => setShowQuickOptions(true)}
                style={{
                  marginTop: 16,
                  border: "1px solid #111",
                  borderRadius: 999,
                  backgroundColor: "#111",
                  color: "#fff",
                  padding: "10px 15px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Show quick questions
              </button>
            )}
          </div>

          <div
            style={{
              padding: 14,
              backgroundColor: "#fff",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#f1f1f1",
                borderRadius: 999,
                padding: "9px 10px 9px 14px",
              }}
            >
              <input
                type="text"
                value={input}
                disabled={loadingBot}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void sendMessage();
                  }
                }}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  color: "#111",
                  fontSize: 14,
                  minWidth: 0,
                  opacity: loadingBot ? 0.7 : 1,
                }}
              />

              <button
                type="button"
                disabled={loadingBot}
                onClick={() => void sendMessage()}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: "#111",
                  color: "#fff",
                  cursor: loadingBot ? "not-allowed" : "pointer",
                  fontSize: 18,
                  flexShrink: 0,
                  opacity: loadingBot ? 0.7 : 1,
                }}
                aria-label="Send message"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chatbot"
          style={{
            position: "relative",
            border: "none",
            backgroundColor: "#f8f8f8",
            color: "#111",
            cursor: "pointer",
            boxShadow: "0 5px 14px rgba(0,0,0,.18)",
            borderRadius: 14,
            padding: "10px 16px",
            width: 230,
            maxWidth: "calc(100vw - 40px)",
            height: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontWeight: 600,
            fontSize: 14,
            transition: "all .2s ease",
          }}
        >
          <ChatBubbleOutlineRoundedIcon
            sx={{
              fontSize: 24,
              color: "#444",
            }}
          />

          <span style={{ whiteSpace: "nowrap" }}>Chat with our chatbot!</span>

          <span
            style={{
              position: "absolute",
              right: 22,
              bottom: -7,
              width: 14,
              height: 14,
              background: "#f8f8f8",
              transform: "rotate(45deg)",
              borderRadius: 2,
            }}
          />
        </button>
      )}
    </div>
  );
}
