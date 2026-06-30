"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  link?: string;
  linkLabel?: string;
  buttons?: MessageButton[];
};

type ChatbotSetting = {
  key: string;
  label: string;
  response: string;
};

type BarberOption = {
  id: string;
  name: string;
};

const fallbackSettings: ChatbotSetting[] = [
  {
    key: "greeting",
    label: "Greeting / Main Menu",
    response:
      "Welcome to The Barbs Bro!\n\nI am your AI chatbot assistant. I can help you with inquiries regarding our barbershop!\n\nHow may I help you today?",
  },
  {
    key: "fallback",
    label: "Fallback Response",
    response:
      "Sorry, I can only answer questions about The Barbs Bro services, prices, location, operating hours, social media, and appointment guidance.",
  },
];

const facebookLink = "https://www.facebook.com/thebarbsbro";

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

export default function ChatbotFloatingButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<ChatbotSetting[]>(fallbackSettings);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [showQuickOptions, setShowQuickOptions] = useState(true);
  const [input, setInput] = useState("");
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [loadingBot, setLoadingBot] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({
      behavior: "auto",
      block: "end",
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/chatbot", { cache: "no-store" });
        const data = await res.json();

        if (res.ok && Array.isArray(data)) {
          setSettings(data);
        }
      } catch (error) {
        console.error("LOAD CHATBOT SETTINGS ERROR:", error);
      }
    };

    const loadBarbers = async () => {
      try {
        const res = await fetch("/api/chatbot/barbers", { cache: "no-store" });
        const data = await res.json();

        if (res.ok && data?.ok && Array.isArray(data.barbers)) {
          setBarbers(data.barbers);
        }
      } catch (error) {
        console.error("LOAD CHATBOT BARBERS ERROR:", error);
      }
    };

    void loadSettings();
    void loadBarbers();
  }, []);

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

  const isBarberAvailabilityOption = (text: string) => {
    const value = normalizeText(text);

    return (
      value.includes("barber availability") ||
      value.includes("barber schedule") ||
      value.includes("availability") ||
      value.includes("available barber")
    );
  };

  const isServicesOption = (text: string) => {
    const value = normalizeText(text);

    return (
      value.includes("service") ||
      value.includes("services") ||
      value.includes("price") ||
      value.includes("prices") ||
      value.includes("haircut") ||
      value.includes("beard") ||
      value.includes("hot oil") ||
      value.includes("bleach") ||
      value.includes("color") ||
      value.includes("treatment") ||
      value.includes("mask") ||
      value.includes("scalp")
    );
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

    const loadingId = `${Date.now()}-loading-barber`;

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
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
            id: `${Date.now()}-bot`,
            role: "bot",
            text: data?.error || "Failed to fetch barber schedule.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
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
          id: `${Date.now()}-bot`,
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

    if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
      return {
        id: `${Date.now()}-bot`,
        role: "bot",
        text: "Hello! How can I help you today?",
      };
    }

    const directOptionMatch = optionItems.find((item) => {
      const label = normalizeText(item.label);
      return msg === label || msg.includes(label);
    });

    if (directOptionMatch) {
      if (
        directOptionMatch.key === "services_prices" ||
        isServicesOption(directOptionMatch.label)
      ) {
        const servicesText = await fetchServicesText();

        return {
          id: `${Date.now()}-bot`,
          role: "bot",
          text: servicesText,
        };
      }

      if (
        directOptionMatch.key === "barber_availability" ||
        isBarberAvailabilityOption(directOptionMatch.label)
      ) {
        return {
          id: `${Date.now()}-bot`,
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
        normalizeText(directOptionMatch.label).includes("social") ||
        normalizeText(directOptionMatch.label).includes("receptionist");

      return {
        id: `${Date.now()}-bot`,
        role: "bot",
        text: directOptionMatch.response,
        link: needsLink ? facebookLink : undefined,
        linkLabel: needsLink ? "Open Facebook Page" : undefined,
      };
    }

    if (isServicesOption(text)) {
      const servicesText = await fetchServicesText();

      return {
        id: `${Date.now()}-bot`,
        role: "bot",
        text: servicesText,
      };
    }

    if (isBarberAvailabilityOption(text)) {
      return {
        id: `${Date.now()}-bot`,
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
      msg.includes("receptionist") ||
      msg.includes("contact") ||
      msg.includes("call") ||
      msg.includes("message")
    ) {
      const item = optionItems.find((option) =>
        normalizeText(option.label).includes("receptionist")
      );

      return {
        id: `${Date.now()}-bot`,
        role: "bot",
        text: item?.response || getResponse("fallback"),
        link: facebookLink,
        linkLabel: "Chat with Receptionist",
      };
    }

    if (
      msg.includes("facebook") ||
      msg.includes("instagram") ||
      msg.includes("social")
    ) {
      const item = optionItems.find((option) =>
        normalizeText(option.label).includes("social")
      );

      return {
        id: `${Date.now()}-bot`,
        role: "bot",
        text: item?.response || getResponse("fallback"),
        link: facebookLink,
        linkLabel: "Open Facebook Page",
      };
    }

    if (
      msg.includes("book") ||
      msg.includes("appointment") ||
      msg.includes("schedule") ||
      msg.includes("reserve")
    ) {
      const item = optionItems.find((option) =>
        normalizeText(option.label).includes("appointment")
      );

      return {
        id: `${Date.now()}-bot`,
        role: "bot",
        text: item?.response || getResponse("fallback"),
      };
    }

    if (
      msg.includes("location") ||
      msg.includes("where") ||
      msg.includes("address") ||
      msg.includes("open") ||
      msg.includes("hours") ||
      msg.includes("time") ||
      msg.includes("operating")
    ) {
      const item = optionItems.find((option) => {
        const label = normalizeText(option.label);
        return label.includes("location") || label.includes("hours");
      });

      return {
        id: `${Date.now()}-bot`,
        role: "bot",
        text: item?.response || getResponse("fallback"),
      };
    }

    if (msg.includes("thank")) {
      return {
        id: `${Date.now()}-bot`,
        role: "bot",
        text: "You're welcome!",
      };
    }

    return {
      id: `${Date.now()}-bot`,
      role: "bot",
      text: getResponse("fallback"),
    };
  };

  const sendMessage = async (text?: string) => {
    if (loadingBot) return;

    const messageText = (text ?? input).trim();

    if (!messageText) return;

    const loadingId = `${Date.now()}-loading-bot`;

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
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

                  {message.link && (
                    <a
                      href={message.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 10,
                        padding: "8px 13px",
                        backgroundColor: "#111",
                        color: "#fff",
                        borderRadius: 999,
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {message.linkLabel}
                    </a>
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
