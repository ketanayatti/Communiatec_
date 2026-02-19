import { useState, useEffect } from "react";
import { useSocket } from "@/context/SocketContext";
import {
  startOfWeek,
  addDays,
  format,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Trash2,
  ArrowLeft,
  Sparkles,
  Globe,
  Zap,
  Target,
  Star
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const AdminCalendar = () => {
  const { socket } = useSocket() || {};
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Modal state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(true);

  // Delete event handler
  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (!window.confirm(`Delete "${eventTitle}"?`)) return;
    try {
      await apiClient.delete(`/api/admin/events/${eventId}`);
      toast.success("Event deleted successfully");
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
    } catch (err) {
      toast.error("Failed to delete event");
    }
  };

  const fetchEvents = async (month) => {
    try {
      setLoading(true);
      const monthParam = format(month, "yyyy-MM");
      const res = await apiClient.get(`/api/admin/events?month=${monthParam}`);
      // ensure dates are Date objects
      const normalized = res.data.events.map((e) => ({
        ...e,
        start: parseISO(e.start),
        end: parseISO(e.end),
      }));
      setEvents(normalized);
    } catch (err) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!title || !date) {
      toast.error("Title and date are required");
      return;
    }

    try {
      const eventData = {
        title,
        description,
        start: allDay ? date : `${date}T${time || "09:00"}`,
        end: allDay ? date : `${date}T${time || "09:00"}`,
        allDay,
      };

      await apiClient.post("/api/admin/events", eventData);
      toast.success("Event created successfully");

      // Reset form
      setTitle("");
      setDescription("");
      setDate("");
      setTime("");
      setAllDay(true);
      setIsDialogOpen(false);

      fetchEvents(currentMonth);
    } catch (err) {
      toast.error("Failed to create event");
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleNewEvent = (event) => {
      setEvents((prev) => [
        ...prev,
        { ...event, start: parseISO(event.start), end: parseISO(event.end) },
      ]);
    };
    socket.on("calendarEventCreated", handleNewEvent);
    return () => socket.off("calendarEventCreated", handleNewEvent);
  }, [socket]);

  useEffect(() => {
    fetchEvents(currentMonth);
  }, [currentMonth]);

  const renderHeader = () => (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-2xl px-6 py-3 font-semibold transition-all duration-300 border border-slate-700/50 hover:border-slate-600/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent"></div>
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 shadow-xl shadow-indigo-500/10">
              <CalendarIcon className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-5xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <p className="text-slate-400 font-semibold text-lg">Event Management Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800/50 backdrop-blur-xl rounded-2xl p-2 border border-slate-700/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="hover:bg-slate-700/50 rounded-xl w-12 h-12 transition-all duration-300 hover:text-cyan-400"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="hover:bg-slate-700/50 rounded-xl w-12 h-12 transition-all duration-300 hover:text-cyan-400"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="relative bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xl shadow-indigo-500/25 px-8 py-4 rounded-2xl font-bold border border-indigo-400/20 group overflow-hidden">
                <div className="absolute inset-0 bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <Plus className="h-5 w-5 mr-2 relative z-10" />
                <span className="relative z-10">Create Event</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800/95 backdrop-blur-2xl text-white border-slate-700/50 max-w-lg rounded-3xl shadow-2xl">
              <DialogHeader className="space-y-4 pb-6">
                <DialogTitle className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                    <Plus className="h-6 w-6 text-indigo-400" />
                  </div>
                  Create New Event
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-300 font-semibold">
                    Event Title
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Team meeting, product launch..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-slate-900/60 border-slate-600/50 text-white placeholder-slate-500 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 h-12 rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-300 font-semibold">
                    Description <span className="text-slate-500 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="description"
                    type="text"
                    placeholder="Add event details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-900/60 border-slate-600/50 text-white placeholder-slate-500 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 h-12 rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-slate-300 font-semibold">
                    Event Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-slate-900/60 border-slate-600/50 text-white focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 h-12 rounded-xl font-medium"
                  />
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-900/40 to-slate-800/40 rounded-2xl border border-slate-700/50">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={allDay}
                    onChange={() => setAllDay(!allDay)}
                    className="w-5 h-5 text-indigo-500 bg-slate-700 border-slate-600 rounded-lg focus:ring-indigo-500 focus:ring-2"
                  />
                  <Label
                    htmlFor="allDay"
                    className="text-slate-300 cursor-pointer font-semibold flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4 text-indigo-400" />
                    All-day event
                  </Label>
                </div>

                {!allDay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="time" className="text-slate-300 font-semibold">
                      Event Time
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="bg-slate-900/60 border-slate-600/50 text-white focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 h-12 rounded-xl font-medium"
                    />
                  </motion.div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleCreateEvent}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white h-12 rounded-xl font-bold shadow-xl shadow-indigo-500/25"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-slate-600/50 bg-slate-900/50 text-slate-300 hover:bg-slate-700/70 h-12 rounded-xl font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.div>
  );

  const renderDays = () => {
    const days = [];
    const date = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Monday start
    for (let i = 0; i < 7; i++) {
      days.push(
        <div
          key={i}
          className="text-sm font-black text-center text-slate-400 py-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur uppercase tracking-widest"
        >
          {format(addDays(date, i), "EEE")}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-7">{days}</div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const dayEvents = events.filter((e) => isSameDay(e.start, cloneDay));
        const isToday = isSameDay(day, new Date());
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <motion.div
            key={day}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02, type: "spring", stiffness: 100 }}
            className={`border-r border-b border-slate-700/20 p-4 min-h-[140px] flex flex-col gap-3 transition-all duration-300 hover:bg-slate-800/30 relative group ${
              !isCurrentMonth
                ? "bg-slate-900/20 text-slate-600"
                : "bg-slate-800/10"
            } ${isToday ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30" : ""}`}
          >
            {/* Date Display */}
            <div className="flex items-center justify-between">
              <span
                className={`text-lg font-black transition-all duration-300 ${
                  isToday
                    ? "bg-gradient-to-r from-cyan-400 to-blue-400 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-500/25 border border-cyan-400/30"
                    : isCurrentMonth
                    ? "text-white hover:text-cyan-300 w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-slate-700/30"
                    : "text-slate-600 w-10 h-10 rounded-2xl flex items-center justify-center"
                }`}
              >
                {formattedDate}
              </span>
              {dayEvents.length > 2 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/60 backdrop-blur rounded-full border border-slate-600/30">
                  <span className="text-xs text-slate-300 font-bold">+{dayEvents.length - 2}</span>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>

            {/* Events List */}
            <div className="space-y-2 flex-1">
              {dayEvents.slice(0, 2).map((event, index) => (
                <motion.div
                  key={event._id}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                  className={`group/event relative text-xs p-3 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 backdrop-blur border ${
                    event.allDay
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-100 hover:from-cyan-500/30 hover:to-blue-500/30 shadow-lg shadow-cyan-500/10"
                      : "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-100 hover:from-indigo-500/30 hover:to-purple-500/30 shadow-lg shadow-indigo-500/10"
                  }`}
                  onClick={() => handleDeleteEvent(event._id, event.title)}
                  title={`${event.title}${
                    event.description ? ` - ${event.description}` : ""
                  }\nClick to delete`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {!event.allDay && (
                        <Clock className="h-3 w-3 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">
                          {!event.allDay && format(event.start, "HH:mm")}{" "}
                          {event.title}
                        </div>
                        {event.description && (
                          <div className="text-xs opacity-70 truncate mt-1">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <Trash2 className="h-3 w-3 opacity-0 group-hover/event:opacity-100 transition-opacity text-red-400 flex-shrink-0 ml-2" />
                  </div>
                  
                  {/* Event Type Indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                    event.allDay ? "bg-gradient-to-b from-cyan-400 to-blue-400" : "bg-gradient-to-b from-indigo-400 to-purple-400"
                  }`}></div>
                </motion.div>
              ))}
            </div>

            {/* Hover Effect for Empty Days */}
            {dayEvents.length === 0 && isCurrentMonth && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="p-2 bg-slate-700/60 backdrop-blur rounded-xl border border-slate-600/30">
                  <Plus className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            )}
          </motion.div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-r from-indigo-500/3 to-purple-500/3 rounded-full blur-3xl"></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none"></div>

      {/* Floating Orbs */}
      <div className="absolute top-20 right-20 w-5 h-5 bg-indigo-400/50 rounded-full animate-ping"></div>
      <div className="absolute bottom-40 left-20 w-4 h-4 bg-purple-400/40 rounded-full animate-ping delay-500"></div>
      <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-cyan-400/30 rounded-full animate-ping delay-1000"></div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {renderHeader()}

          {/* Enhanced Calendar Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 80 }}
            className="bg-slate-800/40 backdrop-blur-2xl rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl shadow-black/20 mb-8"
          >
            {renderDays()}

            {loading ? (
              <div className="flex flex-col justify-center items-center py-32 bg-slate-800/20">
                <div className="relative mb-8">
                  <div className="w-20 h-20 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-purple-500 rounded-full animate-spin animate-reverse"></div>
                </div>
                <p className="text-slate-400 font-semibold text-lg">Loading calendar events...</p>
              </div>
            ) : (
              <div className="bg-slate-800/20">
                <AnimatePresence>{renderCells()}</AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Enhanced Legend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-12 mb-8"
          >
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
              <div className="w-4 h-4 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 border border-cyan-500/50 rounded-lg shadow-lg shadow-cyan-500/20"></div>
              <span className="text-sm text-slate-300 font-semibold">All-day events</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
              <div className="w-4 h-4 bg-gradient-to-r from-indigo-500/40 to-purple-500/40 border border-indigo-500/50 rounded-lg shadow-lg shadow-indigo-500/20"></div>
              <span className="text-sm text-slate-300 font-semibold">Timed events</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
              <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full shadow-lg shadow-cyan-500/30"></div>
              <span className="text-sm text-slate-300 font-semibold">Today</span>
            </div>
          </motion.div>

          {/* Enhanced Events Summary */}
          {events.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-slate-800/40 backdrop-blur-2xl rounded-3xl border border-slate-700/50 shadow-2xl shadow-black/20 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 border-b border-slate-700/30 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                      <CalendarIcon className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white flex items-center gap-3">
                        Events This Month
                        <Badge className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/30 px-3 py-1 rounded-full font-bold">
                          {events.length}
                        </Badge>
                      </h3>
                      <p className="text-slate-400 font-medium text-lg mt-1">
                        Upcoming scheduled activities and milestones
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                    <span className="text-slate-300 font-semibold">Live Updates</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.slice(0, 6).map((event, index) => (
                    <motion.div
                      key={event._id}
                      initial={{ opacity: 0, x: -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1, type: "spring", stiffness: 100 }}
                      className="group/card relative"
                    >
                      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-slate-900/40 to-slate-800/40 rounded-2xl hover:from-slate-800/60 hover:to-slate-700/60 transition-all duration-300 border border-slate-700/30 hover:border-slate-600/50 backdrop-blur-sm">
                        <div className={`w-3 h-16 rounded-full shadow-lg ${
                          event.allDay
                            ? "bg-gradient-to-b from-cyan-400 to-blue-500 shadow-cyan-500/30"
                            : "bg-gradient-to-b from-indigo-400 to-purple-500 shadow-indigo-500/30"
                        }`}></div>
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between">
                            <p className="font-bold text-white truncate text-lg leading-tight">
                              {event.title}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEvent(event._id, event.title)}
                              className="opacity-0 group-hover/card:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-xl transition-all duration-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-slate-400 font-medium">
                              <Clock className="h-3 w-3" />
                              <span className="text-sm">
                                {format(event.start, event.allDay ? "MMM d" : "MMM d, HH:mm")}
                              </span>
                            </div>
                            
                            {event.allDay ? (
                              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 px-2 py-1 rounded-lg text-xs font-bold">
                                All Day
                              </Badge>
                            ) : (
                              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 px-2 py-1 rounded-lg text-xs font-bold">
                                Timed
                              </Badge>
                            )}
                          </div>
                          
                          {event.description && (
                            <p className="text-slate-400 text-sm truncate">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Subtle glow effect */}
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${
                        event.allDay ? "from-cyan-500/0 via-cyan-500/5 to-blue-500/0" : "from-indigo-500/0 via-indigo-500/5 to-purple-500/0"
                      } opacity-0 group-hover/card:opacity-100 transition-opacity duration-500`}></div>
                    </motion.div>
                  ))}
                </div>
                
                {events.length > 6 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 }}
                    className="text-center mt-8 pt-6 border-t border-slate-700/30"
                  >
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-slate-600/30 backdrop-blur">
                      <Star className="h-4 w-4 text-indigo-400" />
                      <span className="text-slate-300 font-semibold">
                        And {events.length - 6} more events this month
                      </span>
                      <Target className="h-4 w-4 text-purple-400" />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Enhanced Footer Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-8 py-8"
          >
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
              <span className="text-slate-300 font-semibold">Calendar System Online</span>
            </div>
            
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl">
              <Zap className="h-4 w-4 text-indigo-400" />
              <span className="text-slate-300 font-semibold">Real-time Sync</span>
            </div>
            
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl">
              <Globe className="h-4 w-4 text-purple-400" />
              <span className="text-slate-300 font-semibold">Global Events</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;