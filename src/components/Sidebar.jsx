
import { Link, NavLink } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  UserRound,
  Settings,
  CalendarDays
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="dashboard-sidebar">
      <Link to="/dashboard" className="dashboard-logo">
        <GraduationCap size={30} />
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
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>

        <NavLink to="/study-planner">
            <CalendarDays size={20} />
            Study Planner
        </NavLink>

        <NavLink to="/subjects">
          <BookOpen size={20} />
          My Subjects
        </NavLink>

        <NavLink to="/my-progress">
          <ChartNoAxesColumnIncreasing size={20} />
          My Progress
        </NavLink>

        <NavLink to="/profile">
            <UserRound size={20} />
            Profile
        </NavLink>

        <NavLink to="/settings">
            <Settings size={20} />
            Settings
        </NavLink>
      </nav>
    </aside>
  );
}
