
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  UserRound,
  Settings,
  CalendarDays,
  Timer,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const focusActive =
    location.pathname === "/dashboard" &&
    location.hash === "#focus-mode";

  return (
    <aside className="dashboard-sidebar">
      <Link to="/dashboard" className="dashboard-logo">
        <GraduationCap size={30} aria-hidden="true" />
        <span>LearnQuest</span>
      </Link>

      <p className="sidebar-description">
        Your AI Learning Companion
      </p>

      <nav
        className="dashboard-nav"
        aria-label="Main navigation"
      >
        <NavLink to="/dashboard" end>
          <LayoutDashboard size={20} aria-hidden="true" />
          Dashboard
        </NavLink>

        <Link
          to="/dashboard#focus-mode"
          className={focusActive ? "active" : undefined}
          aria-current={focusActive ? "page" : undefined}
        >
          <Timer size={20} aria-hidden="true" />
          Focus Mode
        </Link>

        <NavLink to="/study-planner">
          <CalendarDays size={20} aria-hidden="true" />
          Study Planner
        </NavLink>

        <NavLink to="/subjects">
          <BookOpen size={20} aria-hidden="true" />
          My Subjects
        </NavLink>

        <NavLink to="/my-progress">
          <ChartNoAxesColumnIncreasing size={20} aria-hidden="true" />
          My Progress
        </NavLink>

        <NavLink to="/profile">
          <UserRound size={20} aria-hidden="true" />
          Profile
        </NavLink>

        <NavLink to="/settings">
          <Settings size={20} aria-hidden="true" />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
