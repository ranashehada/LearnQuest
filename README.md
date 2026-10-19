# 🎓 LearnQuest — AI-Powered Learning Platform

**Learn Smarter. Stay Organized. Achieve More.**

LearnQuest is an AI-powered personalized learning platform designed to help university students organize their study materials, understand complex topics, and improve their academic performance through interactive AI-assisted learning.

The platform combines study management, intelligent learning tools, progress tracking, and gamification in one user-friendly workspace.

## 🚀 Key Features

### 📚 Subject & Lesson Management
- Create and organize subjects.
- Upload PDF and PowerPoint (PPTX) study materials.
- Manage lessons within each subject.
- Access uploaded documents and extracted study content.

### 🤖 AI-Powered Study Assistant
- **AI Explanations:** Generate structured, step-by-step explanations from uploaded materials.
- **Smart Summaries:** Create concise summaries of important concepts.
- **AI Chat:** Ask questions about lessons and receive contextual answers.
- **AI Quizzes:** Generate multiple-choice quizzes with customizable difficulty levels and question counts.

### 📊 Progress Tracking & Gamification
- Earn XP by completing learning activities.
- Track study progress and learning achievements.
- Monitor study streaks.
- Stay motivated through a gamified learning experience.

### 📅 Study Planner
- Organize study tasks and deadlines.
- Track completed activities.
- Manage academic responsibilities in one place.

### ⏱️ Focus Timer
- Use Pomodoro-style focus sessions.
- Choose different study durations.
- Improve concentration and study consistency.

### 👤 User Accounts
- User registration and login.
- Password hashing and session-based authentication.
- Profile and account settings.
- Account-specific subject and lesson organization.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Styling | CSS |
| Backend | Node.js, Express.js |
| AI Integration | Google Gemini API |
| Authentication | Express Session, bcrypt |
| Local Data Storage | LocalStorage, IndexedDB |
| Document Processing | pdf-parse, JSZip |
| Icons | Lucide React |
| Version Control | Git & GitHub |

## ⚙️ Getting Started

### Prerequisites

- Node.js and npm
- Git
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/ranashehada/LearnQuest.git
cd LearnQuest
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd server
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the `server` directory.

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_supported_gemini_model
SESSION_SECRET=your_long_random_session_secret
PORT=5000
```

**Security:** Never commit your `.env` file or API keys to GitHub.

### 5. Start the Backend

From the `server` directory:

```bash
node index.js
```

The backend runs at:

`http://localhost:5000`

### 6. Start the Frontend

Open another terminal in the project root:

```bash
npm run dev
```

The frontend runs at:

`http://localhost:5173`

## 🧠 How LearnQuest Works

1. **Create an Account** — Register and log in to your learning workspace.
2. **Add Subjects** — Organize courses and academic topics.
3. **Upload Lessons** — Add PDF or PowerPoint study materials.
4. **Learn with AI** — Generate explanations, summaries, and contextual answers.
5. **Test Your Knowledge** — Practice with AI-generated quizzes.
6. **Track Your Progress** — Manage tasks, study sessions, and learning achievements.

## 🎯 Project Goals

LearnQuest aims to:

- Make studying more interactive and personalized.
- Reduce the time students spend organizing learning resources.
- Help students understand difficult academic concepts.
- Encourage consistent study habits through gamification.
- Combine AI assistance and academic productivity in one platform.

## 🔒 Security & Current Limitations

LearnQuest is currently a development-stage academic project.

- Some learning data and uploaded files are stored locally in the browser.
- Local browser storage is not a substitute for server-side access control.
- Scanned PDF documents may require OCR for text extraction.
- Additional security measures and persistent server-side storage are needed before production deployment.

## Study Planner

The planner schedules study sessions by date, start time, and duration. Link a session to a subject and lesson, then open the explanation, summary, or quiz directly from the session. Sessions can be edited, completed, reopened, or removed with an undo action. Overlapping sessions are rejected; exceeding a preferred daily time limit shows a warning.

Use **Study time & exams** to set a daily minute budget (0 means a day off) and one exam date per subject. Up to three editable, 20-minute suggestions are calculated from existing lessons and the latest quiz scores. Earlier exams take priority, and suggestions fit the next seven days between 08:00 and 22:00. The score thresholds are simple planning rules, not a measurement of mastery. Suggestions make no AI requests and are only saved after the student accepts a schedule.

Plans are saved separately for each authenticated account in this browser. Only session details and subject/lesson IDs are stored, with a limit of 100 pending and the most recent 30 completed sessions. Existing tasks remain available under **Previous tasks**, and their earned XP is preserved. New scheduled sessions do not award XP. Clearing browser data removes the plan; there is no cloud sync yet.

### Checking the planner

Run `npm run test:planner` for date, overlap, retention, suggestion, and lesson-link checks, and `npm run build` for the production build. For a manual check:

1. Set study time and an exam date, then schedule a linked lesson.
2. Reload the page and check the saved time, subject, and lesson.
3. Try an overlapping time; confirm the validation message and that no extra session is saved.
4. Edit, complete, reopen, remove, and undo a session.
5. Open the lesson and verify the selected study tab. Check the week view and dialogs on a narrow screen.

## 🔮 Future Improvements

- Cloud-based database and file storage.
- Secure server-side user data management.
- OCR support for scanned documents.
- Personalized AI
