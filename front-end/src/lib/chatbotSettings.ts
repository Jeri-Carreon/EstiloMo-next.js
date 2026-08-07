export type ChatbotSettingData = {
  key: string;
  label: string;
  response: string;
};

export const defaultChatbotSettings: ChatbotSettingData[] = [
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

export const starterChatbotOptions: ChatbotSettingData[] = [
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
      "Services and prices are pulled automatically from Service Management.",
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

export const fallbackChatbotSettings = [
  ...defaultChatbotSettings,
  ...starterChatbotOptions,
];
