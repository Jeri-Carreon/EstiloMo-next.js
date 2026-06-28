"use client";

import { useEffect, useMemo, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

type ChatbotSetting = {
  id?: string;
  key: string;
  label: string;
  response: string;
  options?: unknown;
};

type BarberOption = {
  id: string;
  name: string;
};

const protectedKeys = ["greeting", "fallback"];

const starterOptions: ChatbotSetting[] = [
  {
    key: "book_appointment",
    label: "Book an Appointment",
    response:
      "Please click the Book An Appointment button on the homepage to proceed with booking an appointment.",
  },
  {
    key: "services_prices",
    label: "Services & Prices",
    response:
      "Here are our available services:\n\nHaircut - ₱150\nBeard Trim - ₱100\nHaircut + Beard Trim - ₱220\nKids Haircut - ₱120\nSenior Citizen Haircut - ₱130",
  },
  {
    key: "shop_location_hours",
    label: "Shop Location & Operating Hours",
    response:
      "We are located at Unit F, Saranay Homes, Congressional Rd. cor Malapitan Rd. Caloocan City.\n\nOpen from 10:00 AM to 8:00 PM every day.",
  },
  {
    key: "barber_availability",
    label: "Barber Availability",
    response: "Pick a barber to show availability.",
  },
  {
    key: "social_media",
    label: "Social Media",
    response:
      "Follow us on our social media pages:\n\nFacebook: https://www.facebook.com/thebarbsbro",
  },
  {
    key: "talk_to_receptionist",
    label: "Talk to Receptionist",
    response:
      "You may contact our receptionist by texting or calling 0906-222-2007 or messaging our Facebook page: https://www.facebook.com/thebarbsbro",
  },
];

async function readJsonSafe(res: Response) {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function AdminChatbotPage() {
  const [settings, setSettings] = useState<ChatbotSetting[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const optionItems = useMemo(
    () =>
      settings.filter(
        (item) => item.key !== "greeting" && item.key !== "fallback"
      ),
    [settings]
  );

  const loadSettings = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [settingsRes, barbersRes] = await Promise.all([
        fetch("/api/admin/chatbot", {
          cache: "no-store",
        }),
        fetch("/api/chatbot/barbers", {
          cache: "no-store",
        }),
      ]);

      const settingsData = await readJsonSafe(settingsRes);
      const barbersData = await readJsonSafe(barbersRes);

      if (!settingsRes.ok) {
        throw new Error(
          settingsData?.error || "Failed to load chatbot settings."
        );
      }

      setSettings(Array.isArray(settingsData) ? settingsData : []);

      if (barbersRes.ok && barbersData?.ok && Array.isArray(barbersData.barbers)) {
        setBarbers(barbersData.barbers);
      }
    } catch (error) {
      console.error("LOAD CHATBOT SETTINGS ERROR:", error);
      setMessage("Failed to load chatbot settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = (
    key: string,
    field: "label" | "response",
    value: string
  ) => {
    setSettings((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  };

  const addOption = () => {
    const number =
      settings.filter((item) => item.key.startsWith("custom_")).length + 1;

    const newKey = `custom_${Date.now()}`;

    setSettings((prev) => [
      ...prev,
      {
        key: newKey,
        label: `Custom Option ${number}`,
        response: "Enter chatbot response here.",
      },
    ]);

    setMessage("New option added. Edit it below, then click Save.");

    setTimeout(() => {
      document
        .getElementById(`chatbot-field-${newKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const restoreStarterOptions = () => {
    const existingKeys = new Set(settings.map((item) => item.key));
    const missingOptions = starterOptions.filter(
      (item) => !existingKeys.has(item.key)
    );

    if (missingOptions.length === 0) {
      setMessage("All starter options already exist.");
      return;
    }

    setSettings((prev) => [...prev, ...missingOptions]);
    setMessage("Starter options restored. Click Save to store them.");
  };

  const deleteOption = async (key: string) => {
    const item = settings.find((setting) => setting.key === key);

    if (!item) return;

    if (protectedKeys.includes(key)) {
      setMessage("Greeting and fallback cannot be deleted.");
      return;
    }

    if (!confirm(`Delete "${item.label}"? This also deletes its response.`)) {
      return;
    }

    if (!item.id) {
      setSettings((prev) => prev.filter((setting) => setting.key !== key));
      setMessage("Unsaved chatbot option removed.");
      return;
    }

    try {
      const res = await fetch("/api/admin/chatbot", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete option.");
      }

      setSettings(Array.isArray(data?.settings) ? data.settings : []);
      setMessage("Chatbot option deleted successfully.");
    } catch (error) {
      console.error("DELETE CHATBOT OPTION ERROR:", error);
      setMessage("Failed to delete chatbot option.");
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage("");

      const validSettings = settings
        .map((item) => ({
          ...item,
          label: item.label.trim(),
          response: item.response.trim(),
        }))
        .filter((item) => item.key && item.label && item.response);

      const res = await fetch("/api/admin/chatbot", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: validSettings }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save chatbot settings.");
      }

      setMessage("Chatbot settings saved successfully.");
      setSettings(Array.isArray(data?.settings) ? data.settings : validSettings);
    } catch (error) {
      console.error("SAVE CHATBOT SETTINGS ERROR:", error);
      setMessage("Failed to save chatbot settings.");
    } finally {
      setSaving(false);
    }
  };

  const getSetting = (key: string) => {
    return settings.find((item) => item.key === key);
  };

  const scrollToField = (key: string) => {
    document
      .getElementById(`chatbot-field-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Chatbot</h1>
        <p>Loading chatbot settings...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 32,
        backgroundColor: "#fff",
        minHeight: "100vh",
        color: "#111",
      }}
    >
      <h1 style={{ marginBottom: 18 }}>Chatbot</h1>

      <section
        style={{
          border: "1px solid #bdbdbd",
          backgroundColor: "#f3f3f3",
          padding: 28,
          maxWidth: 1120,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>
            Greeting / Main Menu <span style={{ color: "red" }}>*</span>
          </label>

          <textarea
            value={getSetting("greeting")?.response || ""}
            onChange={(e) =>
              updateSetting("greeting", "response", e.target.value)
            }
            style={{
              display: "block",
              width: "100%",
              maxWidth: 520,
              height: 130,
              marginTop: 8,
              padding: 12,
              border: "none",
              resize: "vertical",
              fontFamily: "inherit",
              backgroundColor: "#fff",
            }}
          />
        </div>

        <div style={{ marginBottom: 26 }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>
            Options <span style={{ color: "red" }}>*</span>
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
              gap: 12,
              marginTop: 8,
            }}
          >
            {optionItems.map((item, index) => (
              <div
                key={item.key}
                style={{
                  backgroundColor: "#fff",
                  padding: "12px 14px",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span>
                  {index + 1}. {item.label}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => scrollToField(item.key)}
                    title="Edit option"
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: "#111",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteOption(item.key)}
                    title="Delete option"
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: "#b00020",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            <button
              type="button"
              onClick={addOption}
              style={{
                border: "none",
                background: "transparent",
                color: "#333",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              + Add New Option
            </button>

            <button
              type="button"
              onClick={restoreStarterOptions}
              style={{
                border: "none",
                background: "transparent",
                color: "#333",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              + Restore Starter Options
            </button>
          </div>
        </div>

        {optionItems.map((item) => (
          <div
            id={`chatbot-field-${item.key}`}
            key={item.key}
            style={{
              marginBottom: 24,
              padding: 16,
              backgroundColor: "#eeeeee",
              border: "1px solid #e2e2e2",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <strong>{item.label}</strong>

              <button
                type="button"
                onClick={() => deleteOption(item.key)}
                style={{
                  border: "none",
                  backgroundColor: "#b00020",
                  color: "#fff",
                  padding: "7px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Delete
              </button>
            </div>

            <label style={{ fontSize: 13, fontWeight: 700 }}>
              Option Label <span style={{ color: "red" }}>*</span>
            </label>

            <input
              value={item.label}
              onChange={(e) => updateSetting(item.key, "label", e.target.value)}
              style={{
                display: "block",
                width: "100%",
                maxWidth: 520,
                marginTop: 8,
                marginBottom: 12,
                padding: 12,
                border: "none",
                backgroundColor: "#fff",
                color: "#111",
              }}
            />

            <label style={{ fontSize: 13, fontWeight: 700 }}>
              Response <span style={{ color: "red" }}>*</span>
            </label>

            <textarea
              value={item.response}
              onChange={(e) =>
                updateSetting(item.key, "response", e.target.value)
              }
              style={{
                display: "block",
                width: "100%",
                maxWidth: 520,
                minHeight: 80,
                marginTop: 8,
                padding: 12,
                border: "none",
                resize: "vertical",
                fontFamily: "inherit",
                backgroundColor: "#fff",
              }}
            />

            {item.key === "barber_availability" && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  Dynamic Barber Options
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                  {barbers.length > 0 ? (
                    barbers.map((barber, index) => (
                      <div
                        key={barber.id}
                        style={{
                          backgroundColor: "#fff",
                          padding: "10px 12px",
                          fontSize: 13,
                        }}
                      >
                        {index + 1}. {barber.name}
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        backgroundColor: "#fff",
                        padding: "10px 12px",
                        fontSize: 13,
                        color: "#777",
                      }}
                    >
                      No barbers found.
                    </div>
                  )}
                </div>

                <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                  These are pulled automatically from the Barber Management
                  records and schedules.
                </p>
              </div>
            )}
          </div>
        ))}

        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>
            Fallback Response <span style={{ color: "red" }}>*</span>
          </label>

          <textarea
            value={getSetting("fallback")?.response || ""}
            onChange={(e) =>
              updateSetting("fallback", "response", e.target.value)
            }
            style={{
              display: "block",
              width: "100%",
              maxWidth: 520,
              minHeight: 80,
              marginTop: 8,
              padding: 12,
              border: "none",
              resize: "vertical",
              fontFamily: "inherit",
              backgroundColor: "#fff",
            }}
          />
        </div>

        {message && (
          <p
            style={{
              color:
                message.includes("success") ||
                message.includes("added") ||
                message.includes("removed") ||
                message.includes("restored")
                  ? "green"
                  : "red",
              fontWeight: 700,
            }}
          >
            {message}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            style={{
              border: "none",
              backgroundColor: "#050505",
              color: "#fff",
              padding: "14px 38px",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </main>
  );
}
