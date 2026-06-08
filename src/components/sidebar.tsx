// Sidebar.jsx
import { useState } from "react";
import SearchPanel from "./panels/SearchPanel";
import NotificationsPanel from "./panels/NotificationsPanel";
import ChatPanel from "./panels/ChatPanel";
import ProfilePanel from "./panels/ProfilePanel";

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState(null); // null = hech biri ochilmagan

  const tabs = [
    { id: "search",        icon: <SearchIcon />,       panel: <SearchPanel /> },
    { id: "notifications", icon: <BellIcon />,         panel: <NotificationsPanel /> },
    { id: "chat",          icon: <ChatIcon />,         panel: <ChatPanel /> },
    { id: "profile",       icon: <UserIcon />,         panel: <ProfilePanel /> },
  ];

  const handleTabClick = (tabId) => {
    // Bosilgan tab allaqachon ochiq bo'lsa — yopadi
    setActiveTab(prev => prev === tabId ? null : tabId);
  };

  const activePanel = tabs.find(t => t.id === activeTab)?.panel;

  return (
    <div className="sidebar-wrapper flex">
      {/* Icon tugmalar ustuni */}
      <nav className="sidebar-icons flex flex-col gap-4 p-4 border-r">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`p-2 rounded-lg ${activeTab === tab.id ? "bg-blue-100 text-blue-600" : "text-gray-500"}`}
          >
            {tab.icon}
          </button>
        ))}
      </nav>

      {/* Panel (faqat desktop da ko'rinadi) */}
      {activePanel && (
        <div className="sidebar-panel w-80 border-r hidden md:block">
          {activePanel}
        </div>
      )}
    </div>
  );
}
