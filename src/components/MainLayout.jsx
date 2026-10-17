
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import "./MainLayout.css";

export default function MainLayout() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopHeader />

        <Outlet />
      </main>
    </div>
  );
}
