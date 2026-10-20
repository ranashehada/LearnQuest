
import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import MySubjects from "./pages/MySubjects";
import MainLayout from "./components/MainLayout";
import SubjectDetails from "./pages/SubjectDetails";
import AddLesson from "./pages/AddLesson";
import LessonDetails from "./pages/LessonDetails";
import MyProgress from "./pages/MyProgress";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import StudyPlanner from "./pages/StudyPlanner";
import { API_URL } from "./utils/api";

import "./App.css";
import "./DarkMode.css";


// Check whether the user has an active session.
function ProtectedRoutes() {
  const [status, setStatus] = useState("loading");
  const location = useLocation();

  useEffect(() => {
    let active = true;

    async function checkAuthentication() {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (!active) return;

        setStatus(response.ok ? "authenticated" : "guest");
      } catch (error) {
        if (active) {
          console.error("Authentication error:", error);
          setStatus("guest");
        }
      }
    }

    checkAuthentication();

    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "18px",
          fontWeight: 600,
        }}
      >
        Loading LearnQuest...
      </div>
    );
  }

  if (status === "guest") {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Pages that require login */}
        <Route element={<ProtectedRoutes />}>
          <Route element={<MainLayout />}>
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/subjects"
              element={<MySubjects />}
            />

            <Route
              path="/subjects/:id"
              element={<SubjectDetails />}
            />

            <Route
              path="/subjects/:id/add-lesson"
              element={<AddLesson />}
            />

            <Route
              path="/subjects/:id/lessons/:lessonId"
              element={<LessonDetails />}
            />

            <Route
              path="/my-progress"
              element={<MyProgress />}
            />

            <Route
              path="/progress"
              element={<MyProgress />}
            />

            <Route
              path="/profile"
              element={<Profile />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

            <Route
              path="/study-planner"
              element={<StudyPlanner />}
            />
          </Route>
        </Route>

        {/* Unknown pages */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
