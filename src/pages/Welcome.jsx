
import { Link } from "react-router-dom";
import { GraduationCap, BookOpen, Sparkles, Trophy } from "lucide-react";

export default function Welcome() {
  return (
    <div className="welcome">
      <header className="welcome-header">
        <div className="logo">
          <GraduationCap size={30} />
          <span>LearnQuest</span>
        </div>

        <Link to="/login" className="btn-outline">
          Log In
        </Link>
      </header>

      <main className="welcome-main">
        <div className="hero-icon">
          <GraduationCap size={45} />
        </div>

        <h1>Turn Your Lessons into Learning Adventures</h1>

        <p>
          Upload your study materials, learn with AI,
          test your knowledge, and track your progress.
        </p>

        <Link to="/signup" className="btn-primary">
          Get Started →
        </Link>

        <div className="features">
          <div className="feature-card">
            <BookOpen size={30} />
            <h3>Organize Lessons</h3>
            <p>Keep your subjects and lessons in one place.</p>
          </div>

          <div className="feature-card">
            <Sparkles size={30} />
            <h3>Learn with AI</h3>
            <p>Understand complex topics with AI explanations.</p>
          </div>

          <div className="feature-card">
            <Trophy size={30} />
            <h3>Track Progress</h3>
            <p>Complete quizzes and earn achievements.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
