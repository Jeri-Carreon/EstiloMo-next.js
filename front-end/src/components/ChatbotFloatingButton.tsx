"use client";

import { useState } from "react";

export default function ChatbotFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1200 }}>
      {open && (
        <div
          style={{
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            minHeight: 480,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: "#fff",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 20px",
              backgroundColor: "#111",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Chatbot</span>
              <span style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>
                Virtual assistant for The Barbs Bro
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                border: "none",
                backgroundColor: "rgba(255,255,255,0.08)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                lineHeight: 1,
              }}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div style={{ flex: 1, padding: 18, backgroundColor: "#f3f3f3" }}>
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 18,
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>
                  Welcome to The Barbs Bro!
                </div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                  I am your AI chatbot assistant. I can help you with inquiries regarding our barbershop!
                </div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                  How may I help you today?
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  "Book an Appointment",
                  "Barber Availability",
                  "Shop Location & Operating Hours",
                  "Services & Prices",
                  "Talk to Receptionist",
                  "Social Media",
                ].map((label) => (
                  <button
                    key={label}
                    type="button"
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 999,
                      backgroundColor: "#fff",
                      color: "#111",
                      padding: "10px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 16,
              backgroundColor: "#fff",
              borderTop: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#f1f1f1",
                borderRadius: 999,
                padding: "10px 12px",
              }}
            >
              <input
                type="text"
                disabled
                placeholder="Type a message..."
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  color: "#333",
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: "#111",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Send message"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "none",
          backgroundColor: "#111",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 22px 60px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? "×" : "Chat"}
      </button>
    </div>
  );
}
