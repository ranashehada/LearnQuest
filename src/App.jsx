
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
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

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subjects" element={<MySubjects />} />
          <Route path="/subjects/:id" element={<SubjectDetails />} />
          <Route path="/subjects/:id/add-lesson" element={<AddLesson />} />
          <Route path="my-progress" element={<MyProgress />} />
          <Route path="progress" element={<MyProgress />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/study-planner" element={<StudyPlanner />} />

          <Route
            path="/subjects/:id/lessons/:lessonId"
            element={<LessonDetails />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
