
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import "./MainLayout.css";

export default function MainLayout() {
  return (
    <div className="dashboard-layout">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar />

      <main id="main-content" className="dashboard-main" tabIndex={-1}>
        <TopHeader />

        <Outlet />
      </main>
    </div>
  );
}
