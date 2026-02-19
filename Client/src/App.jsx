import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Loader from "./pages/Loader";
import { useStore } from "@/store/store";
import apiClient from "./lib/apiClient";
// Lazy load pages for better performance
const Chat = React.lazy(() => import("./pages/Chat"));
const Profile = React.lazy(() => import("./pages/Profile"));
const AdminDashboard = React.lazy(() => import("./pages/Admin/Dashboard"));
const AdminUsers = React.lazy(() => import("./pages/Admin/Users"));
const AdminMessages = React.lazy(() => import("./pages/Admin/Messages"));
const AdminCalendar = React.lazy(() => import("./pages/Admin/Calendar"));
const AdminSettings = React.lazy(() => import("./pages/Admin/Settings"));
const CodeEditor = React.lazy(() => import("./pages/CodeEditor/CodeEditor"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy.jsx"));
const ZoroVault = React.lazy(() => import("./pages/ZoroVault"));

// A small utility function to check if the user is an admin
const isAdmin = (userInfo) => {
  return userInfo?.role === "admin";
};

// Protects routes that require a logged-in user
const ProtectedRoutes = ({ children }) => {
  const { userInfo } = useStore();
  const isAuthenticated = !!userInfo;
  return isAuthenticated ? children : <Navigate to="/auth" />;
};

// Reroutes authenticated users from the auth page to the chat or profile page
const AuthRoutes = ({ children }) => {
  const { userInfo } = useStore();
  const isAuthenticated = !!userInfo;
  const profileIsSetup = userInfo?.profileSetup;

  if (isAuthenticated) {
    return profileIsSetup ? (
      <Navigate to="/chat" />
    ) : (
      <Navigate to="/profile" />
    );
  }
  return children;
};

// Protects routes that require an admin user
const AdminProtectedRoutes = ({ children }) => {
  const { userInfo } = useStore();
  const isAuthenticated = !!userInfo;
  const userIsAdmin = isAdmin(userInfo);

  // If not authenticated, redirect to login. If authenticated but not admin, redirect to chat.
  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }
  if (!userIsAdmin) {
    return <Navigate to="/chat" />;
  }
  return children;
};

const App = () => {
  const { userInfo, setUserInfo } = useStore();
  const [loading, setLoading] = useState(true);

  // Using a ref to prevent multiple API calls on re-renders, especially if the component re-mounts.
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchUser = async () => {
      // Ensure we don't fetch the user more than once on initial load.
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        // The `withCredentials` option is essential for sending and receiving cookies.
        const response = await apiClient.get("/api/auth/userInfo", {
          withCredentials: true,
        });

        // The response is successful, so we set the user information.
        if (response.data && response.data.user) {
          setUserInfo(response.data.user);
        } else {
          // A successful response but no user data is unexpected.
          // We treat this as an unauthenticated state for safety.
          setUserInfo(null);
        }
      } catch (error) {
        // We only care about the response status for specific cases.
        const status = error.response?.status;

        // 🔧 FIX: A 401 is an expected response for a user who is not logged in.
        // We handle this gracefully by setting userInfo to null without logging a loud error.
        if (status === 401) {
          setUserInfo(null);
          // Clear any stale auth data
          localStorage.removeItem("authToken");
          // 🔧 FIX: Don't log this as an error - it's expected behavior
          console.debug(
            "🔒 User not authenticated on app startup (normal for logged out users)"
          );
        } else {
          // Log any other errors, as they are unexpected. This helps with debugging.
          console.error("Unexpected error during user authentication:", {
            status: status,
            message: error.message,
          });
          setUserInfo(null);
        }
      } finally {
        // We set loading to false once the API call is complete, whether it succeeded or failed.
        setLoading(false);
        isFetchingRef.current = false;
      }
    };

    // We only fetch the user if the userInfo is undefined, which indicates the very first load.
    // Otherwise, we assume the state is already correctly set.
    if (userInfo === undefined) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [userInfo, setUserInfo]);

  // We show a loading screen while the initial authentication check is in progress.
  if (loading) {
    return <Loader />;
  }

  return (
    <BrowserRouter>
      <React.Suspense fallback={<Loader />}>
        <Routes>
          {/* Authentication Routes */}
          <Route
            path="/auth"
            element={
              <AuthRoutes>
                <Auth />
              </AuthRoutes>
            }
          />

          {/* User Protected Routes */}
          <Route
            path="/chat"
            element={
              <ProtectedRoutes>
                <Chat />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoutes>
                <Profile />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/code-editor"
            element={
              <ProtectedRoutes>
                <CodeEditor />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/code-editor/:sessionId"
            element={
              <ProtectedRoutes>
                <CodeEditor />
              </ProtectedRoutes>
            }
          />

          {/* Public Route for Privacy Policy */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <AdminProtectedRoutes>
                <AdminDashboard />
              </AdminProtectedRoutes>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoutes>
                <AdminDashboard />
              </AdminProtectedRoutes>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminProtectedRoutes>
                <AdminUsers />
              </AdminProtectedRoutes>
            }
          />
          <Route
            path="/admin/messages"
            element={
              <AdminProtectedRoutes>
                <AdminMessages />
              </AdminProtectedRoutes>
            }
          />
          <Route
            path="/admin/calendar"
            element={
              <AdminProtectedRoutes>
                <AdminCalendar />
              </AdminProtectedRoutes>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminProtectedRoutes>
                <AdminSettings />
              </AdminProtectedRoutes>
            }
          />
          <Route
            path="/zoro-vault"
            element={
              <ProtectedRoutes>
                <ZoroVault />
              </ProtectedRoutes>
            }
          />

          {/* Default redirect for all other paths */}
          <Route path="*" element={<Navigate to="/auth" />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
};

export default App;
