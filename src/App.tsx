import React, { useState, useMemo, useEffect } from "react";
import Navbar from "./components/Navbar";
import Filters from "./components/Filters";
import EventCard from "./components/EventCard";
import EventModal from "./components/EventModal";
import CalendarView from "./components/CalendarView";
import AdminDashboard from "./components/AdminDashboard";
import FeedbackModal from "./components/FeedbackModal";
import StudentSupport from "./components/StudentSupport";
import EventRequestModal from "./components/EventRequestModal";
import Footer from "./components/Footer";
import { mockEvents as initialMockEvents } from "./data/mockEvents";
import { CampusEvent, FeedbackMessage, User, AuditLog } from "./types";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginModal from "./components/LoginModal";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : "/api");

const CampusApp: React.FC = () => {
  const { user, isAdmin, logout, refreshUser } = useAuth();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("calendar");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [categories, setCategories] = useState<string[]>([
    "Academic",
    "Social",
    "Sports",
  ]);

  const [homeConfig, setHomeConfig] = useState<any>({});

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isEventRequestModalOpen, setIsEventRequestModalOpen] = useState(false);
  const [isStudentSupportOpen, setIsStudentSupportOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // ---------------- FETCH FROM DB (ONLY SOURCE OF TRUTH) ----------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ev, users, msg, logs, config] = await Promise.all([
          fetch(`${API_URL}/events`).then((r) => r.json()),
          fetch(`${API_URL}/users`).then((r) => r.json()),
          fetch(`${API_URL}/feedback`).then((r) => r.json()),
          fetch(`${API_URL}/audit`).then((r) => r.json()),
          fetch(`${API_URL}/config`).then((r) => r.json()),
        ]);

        setEvents(ev || []);
        setUsersList(users || []);
        setMessages(msg || []);
        setAuditLogs(logs || []);
        setHomeConfig(config || {});
      } catch (err) {
        console.error("API error:", err);
        setEvents(initialMockEvents);
      }

      setIsLoaded(true);
    };

    fetchData();
  }, []);

  // ---------------- EVENTS ----------------
  const handleAddEvent = async (newEvent: any) => {
    const eventWithStatus = {
      ...newEvent,
      status: isAdmin ? "Approved" : "Pending",
    };

    setEvents((prev) => [eventWithStatus, ...prev]);

    await fetch(`${API_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventWithStatus),
    });
  };

  const handleUpdateEvent = async (updated: CampusEvent) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );

    await fetch(`${API_URL}/events/${updated.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };

  const handleDeleteEvent = async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));

    await fetch(`${API_URL}/events/${id}`, {
      method: "DELETE",
    });
  };

  if (!isLoaded) return null;

  return (
    <div className={theme === "dark" ? "bg-black text-white" : "bg-white"}>
      <Navbar
        onLoginClick={() => setIsLoginModalOpen(true)}
        theme={theme}
        toggleTheme={() =>
          setTheme((p) => (p === "light" ? "dark" : "light"))
        }
      />

      <main>
        <h1 className="text-3xl font-bold p-4">Campus Events</h1>

        <div className="grid grid-cols-3 gap-4 p-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={setSelectedEvent}
            />
          ))}
        </div>
      </main>

      <Footer homeConfig={homeConfig} theme={theme} />

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          usersList={usersList}
        />
      )}
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <CampusApp />
  </AuthProvider>
);

export default App;
