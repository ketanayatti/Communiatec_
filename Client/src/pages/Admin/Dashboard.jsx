import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/store";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  User,
  Plus,
  UserCog,
  Shield,
  Calendar,
  TrendingUp,
  MessageSquare,
  Clock,
  ArrowUpRight,
  Settings,
  Zap,
  Database,
  Globe,
  Eye,
  ChevronRight,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Dashboard = () => {
  const { userInfo } = useStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (!userInfo || userInfo.role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      navigate("/chat");
      return;
    }

    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/api/admin/dashboard-stats");
        setStats(response.data.stats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        toast.error("Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userInfo, navigate]);

  const quickActions = [
    {
      title: "User Management",
      description: "Manage accounts, roles & permissions",
      icon: <UserCog className="h-7 w-7" />,
      onClick: () => navigate("/admin/users"),
      gradient: "from-cyan-500 to-blue-600",
      shadowColor: "cyan-500/25",
      count: stats?.totalUsers || 0,
      metric: "users",
    },
    {
      title: "Event Calendar",
      description: "Schedule & track system events",
      icon: <Calendar className="h-7 w-7" />,
      onClick: () => navigate("/admin/calendar"),
      gradient: "from-indigo-500 to-purple-600",
      shadowColor: "indigo-500/25",
      count: stats?.upcomingEvents || 0,
      metric: "events",
    },
    {
      title: "System Settings",
      description: "Configure platform preferences",
      icon: <Settings className="h-7 w-7" />,
      onClick: () => navigate("/admin/settings"),
      gradient: "from-emerald-500 to-teal-600",
      shadowColor: "emerald-500/25",
      metric: "configs",
    },
  ];

  const statsCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: <Users className="h-7 w-7" />,
      gradient: "from-cyan-500 to-blue-600",
      shadowColor: "cyan-500/20",
      trendUp: true,
      description: "Registered accounts",
      onClick: () => navigate("/admin/users"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/3 to-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none"></div>

      {/* Floating Elements */}
      <div className="absolute top-20 right-20 w-6 h-6 bg-cyan-400/40 rounded-full animate-ping"></div>
      <div className="absolute bottom-40 left-20 w-4 h-4 bg-blue-400/30 rounded-full animate-ping delay-500"></div>
      <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-indigo-400/20 rounded-full animate-ping delay-1000"></div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Modern Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="p-4 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 shadow-2xl shadow-cyan-500/10">
                      <Database className="h-8 w-8 text-cyan-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
                  </div>
                  <div>
                    <h1 className="text-6xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 text-transparent bg-clip-text tracking-tight leading-tight">
                      Control Center
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                      <Shield className="h-5 w-5 text-cyan-400" />
                      <p className="text-slate-400 text-xl font-semibold">
                        Welcome back,{" "}
                        <span className="text-white font-bold">
                          {userInfo?.firstName || "Admin"}
                        </span>
                      </p>
                      <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 rounded-full font-semibold">
                        Administrator
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate("/chat")}
                  className="relative bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-xl shadow-cyan-500/25 px-8 py-4 rounded-2xl font-bold border border-cyan-400/20 hover:border-cyan-400/40 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <MessageSquare className="h-5 w-5 mr-3 relative z-10" />
                  <span className="relative z-10">Return to Chat</span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <AnimatePresence>
              {statsCards.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100,
                  }}
                  onClick={stat.onClick}
                  className="group cursor-pointer"
                >
                  <Card className="relative bg-slate-800/40 backdrop-blur-2xl border-slate-700/50 hover:border-slate-600/70 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 rounded-3xl overflow-hidden">
                    {/* Gradient Overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                    ></div>

                    <CardHeader className="pb-4 relative z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                          {stat.title}
                        </CardTitle>
                        <div
                          className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} bg-opacity-20 group-hover:bg-opacity-30 transition-all shadow-xl shadow-${stat.shadowColor} group-hover:scale-110 duration-300 border border-white/10`}
                        >
                          {stat.icon}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="relative z-10">
                      <div className="space-y-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-4xl font-black text-white mb-2 tracking-tight">
                              {loading ? (
                                <div className="w-20 h-10 bg-gradient-to-r from-slate-700 to-slate-600 animate-pulse rounded-xl"></div>
                              ) : (
                                stat.value.toLocaleString()
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-medium mb-3">
                              {stat.description}
                            </p>
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                                stat.trendUp
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-red-500/20 text-red-300 border border-red-500/30"
                              }`}
                            >
                              <TrendingUp
                                className={`h-3 w-3 ${
                                  stat.trendUp ? "" : "rotate-180"
                                }`}
                              />
                              {stat.trend} vs last week
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    {/* Hover Effect */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Enhanced Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                <Zap className="h-6 w-6 text-indigo-400" />
              </div>
              <h2 className="text-3xl font-black text-white">Quick Actions</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-700 via-slate-600 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.4 + index * 0.1,
                    type: "spring",
                    stiffness: 100,
                  }}
                >
                  <Card
                    className="relative bg-slate-800/40 backdrop-blur-2xl border-slate-700/50 hover:border-slate-600/70 transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 cursor-pointer group rounded-3xl overflow-hidden h-full"
                    onClick={action.onClick}
                  >
                    {/* Background Gradient */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                    ></div>

                    <CardContent className="p-8 relative z-10 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-6">
                        <div
                          className={`p-4 rounded-3xl bg-gradient-to-br ${action.gradient} bg-opacity-20 group-hover:bg-opacity-30 transition-all shadow-2xl shadow-${action.shadowColor} group-hover:scale-110 duration-300 border border-white/10`}
                        >
                          {action.icon}
                        </div>
                        <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/50 px-3 py-1 rounded-full font-bold">
                          {action.count} {action.metric}
                        </Badge>
                      </div>

                      <div className="flex-1 space-y-3">
                        <h3 className="font-black text-white text-xl leading-tight group-hover:text-cyan-300 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-slate-400 leading-relaxed font-medium">
                          {action.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700/30">
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                          Click to manage
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>

                    {/* Hover Border Effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Enhanced Recent Users Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-slate-800/40 backdrop-blur-2xl border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl shadow-black/20">
              <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 border-b border-slate-700/30 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                      <Users className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-2xl font-black">
                        Recent Users
                      </CardTitle>
                      <CardDescription className="text-slate-400 mt-1 font-medium text-lg">
                        Latest platform registrations and member activity
                      </CardDescription>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 rounded-2xl px-6 py-3 font-semibold transition-all duration-300 group"
                    onClick={() => navigate("/admin/users")}
                  >
                    <span>View All Users</span>
                    <ArrowUpRight className="h-4 w-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-8">
                {loading ? (
                  <div className="flex flex-col justify-center items-center py-16">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-500 rounded-full animate-spin animate-reverse"></div>
                    </div>
                    <p className="text-slate-400 font-medium text-lg">
                      Loading recent users...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats?.recentUsers?.slice(0, 5).map((user, index) => (
                      <motion.div
                        key={user._id}
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.6 + index * 0.1,
                          type: "spring",
                          stiffness: 100,
                        }}
                        className="relative group"
                      >
                        <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-slate-900/40 to-slate-800/40 hover:from-slate-800/60 hover:to-slate-700/60 transition-all duration-300 border border-slate-700/30 hover:border-slate-600/50 backdrop-blur-sm">
                          <div className="flex items-center gap-5">
                            <div className="relative">
                              <Avatar className="h-16 w-16 ring-4 ring-slate-600/30 group-hover:ring-cyan-500/30 transition-all duration-300 rounded-2xl">
                                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-black text-lg rounded-2xl">
                                  {user.firstName?.charAt(0) ||
                                    user.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <p className="font-bold text-white text-lg">
                                  {user.firstName && user.lastName
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.email.split("@")[0]}
                                </p>
                              </div>
                              <p className="text-slate-400 font-medium">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <Badge
                              className={`px-4 py-2 rounded-xl font-bold border shadow-lg ${
                                user.role === "admin"
                                  ? "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border-orange-500/30 shadow-orange-500/20"
                                  : "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border-cyan-500/30 shadow-cyan-500/20"
                              }`}
                            >
                              {user.role === "admin" && (
                                <Crown className="h-3 w-3 mr-1" />
                              )}
                              {user.role === "user" && (
                                <User className="h-3 w-3 mr-1" />
                              )}
                              {user.role}
                            </Badge>

                            <div className="text-right space-y-1">
                              <div className="text-sm text-slate-300 font-semibold flex items-center gap-2">
                                <Clock className="h-3 w-3 text-slate-500" />
                                {new Date(user.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                {Math.floor(
                                  (Date.now() - new Date(user.createdAt)) /
                                    (1000 * 60 * 60 * 24)
                                )}{" "}
                                days ago
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Subtle hover gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                      </motion.div>
                    ))}

                    {(!stats?.recentUsers ||
                      stats.recentUsers.length === 0) && (
                      <div className="text-center py-20">
                        <div className="relative mb-8">
                          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-700/40 to-slate-600/40 flex items-center justify-center mx-auto border border-slate-600/30 shadow-2xl">
                            <Users className="h-12 w-12 text-slate-500" />
                          </div>
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full border border-cyan-500/30 flex items-center justify-center">
                            <Plus className="h-4 w-4 text-cyan-400" />
                          </div>
                        </div>
                        <p className="text-slate-300 text-2xl font-bold mb-3">
                          No users found
                        </p>
                        <p className="text-slate-500 text-lg mb-6">
                          New user registrations will appear here
                        </p>
                        <Button
                          onClick={() => navigate("/admin/users")}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-xl shadow-cyan-500/25"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First User
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* System Status Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-8 py-8"
          >
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-slate-300 font-semibold">
                System Status: Online
              </span>
            </div>

            <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
              <Globe className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-300 font-semibold">
                Global Access
              </span>
            </div>

            <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
              <Eye className="h-4 w-4 text-indigo-400" />
              <span className="text-slate-300 font-semibold">
                Monitoring Active
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
