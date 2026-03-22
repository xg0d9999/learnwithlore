import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import StudentLogin from './features/auth/StudentLogin';
import AdminLogin from './features/auth/AdminLogin';
import AdminRegister from './features/auth/AdminRegister';
import Register from './features/auth/Register';
import StudentDashboard from './features/student/StudentDashboard';
import StudentLessons from './features/student/StudentLessons';
import ExerciseHub from './features/student/ExerciseHub';
import StudentExercises from './features/student/StudentExercises';
import VocabExplorer from './features/student/VocabExplorer';
import StudentFlashcards from './features/student/StudentFlashcards';
import WritingWorkshop from './features/student/WritingWorkshop';
import StudentMessages from './features/student/StudentMessages';
import StudentSpeaking from './features/student/StudentSpeaking';
import AdminDashboard from './features/admin/AdminDashboard';
import AdminStudentsList from './features/admin/AdminStudentsList';
import StudentProgress from './features/admin/StudentProgress';
import LessonBuilder from './features/admin/LessonBuilder';
import AIMagicCreator from './features/admin/AIMagicCreator';
import AdminMessaging from './features/admin/AdminMessaging';
import AdminLessonsList from './features/admin/AdminLessonsList';
import ExerciseCorrections from './features/admin/ExerciseCorrections';
import AdminCalendar from './features/calendar/AdminCalendar.tsx';
import StudentCalendar from './features/calendar/StudentCalendar.tsx';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import { FloatingCallManager } from './components/shared/FloatingCallManager';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: 'admin' | 'student';
}

function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // If we are currently bootstrapping (no user yet AND loading is true), show loading screen
  // If we have a cached role (role !== undefined), we can stop "loading" once user is detected
  if (loading && (role === undefined || !user)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary/20 animate-pulse text-3xl">shield_person</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-black text-lg">LearnWithLore</p>
          <p className="text-slate-500 text-sm font-medium">Resuming your secure session...</p>
        </div>
      </div>
    );
  }

  // If not loading and no user, it's a hard redirect to login
  if (!user) {
    console.warn(`[ProtectedRoute] Auth guard triggered at ${location.pathname}. Returning to login.`);
    const loginPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    return <Navigate to={loginPath} replace />;
  }

  // Handle role-based access
  if (allowedRole && role !== allowedRole) {
    if (role === null) {
      console.warn(`[ProtectedRoute] Access denied to ${location.pathname}: No role found for user.`);
      const loginPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
      return <Navigate to={loginPath} replace />;
    }
    console.warn(`[ProtectedRoute] Role mismatch at ${location.pathname}: User role is "${role}", but "${allowedRole}" is required.`);
    const dest = role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" expand={true} richColors />
      <FloatingCallManager />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<StudentLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Student Routes */}
          <Route element={
            <ProtectedRoute allowedRole="student">
              <StudentLayout />
            </ProtectedRoute>
          }>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/exercises" element={<ExerciseHub />} />
            <Route path="/student/asignaciones" element={<StudentLessons />} />
            <Route path="/student/vocabulary" element={<VocabExplorer />} />
            <Route path="/student/flashcards" element={<StudentFlashcards />} />
            <Route path="/student/exercises/:id" element={<StudentExercises />} />
            <Route path="/student/writing/:id" element={<WritingWorkshop />} />
            <Route path="/student/messages" element={<StudentMessages />} />
            <Route path="/student/calendar" element={<StudentCalendar />} />
            <Route path="/student/speaking" element={<StudentSpeaking />} />
          </Route>

          {/* Admin Routes */}
          <Route element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/asignaciones" element={<AdminLessonsList />} />
            <Route path="/admin/students" element={<AdminStudentsList />} />
            <Route path="/admin/corrections" element={<ExerciseCorrections />} />
            <Route path="/admin/students/:id" element={<StudentProgress />} />
            <Route path="/admin/builder/manual" element={<Navigate to="/admin/builder/manual/new" replace />} />
            <Route path="/admin/builder/manual/:id" element={<LessonBuilder />} />
            <Route path="/admin/builder/magic" element={<AIMagicCreator />} />
            <Route path="/admin/messages" element={<AdminMessaging />} />
            <Route path="/admin/calendar" element={<AdminCalendar />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
