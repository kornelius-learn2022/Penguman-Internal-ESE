import QRCode from "qrcode";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  isTokenExpired,
  clearAdminSession,
  handleSessionExpired,
} from "../utils/auth";

export default function Admin() {
  // ==========================================
  // 1. AUTENTIKASI & LAYOUT STATE
  // ==========================================
  const tokenJWT = localStorage.getItem("jwt_token");
  const userRole = localStorage.getItem("role") || "Super";
  const username = localStorage.getItem("username") || "Admin Cita Hati";
  const [role, setRole] = useState(userRole);
  const id_admin = localStorage.getItem("id_admin") || "1";
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  // Validasi ketat token JWT (Masa Aktif 12 Jam)
  useEffect(() => {
    if (!tokenJWT || isTokenExpired(tokenJWT)) {
      handleSessionExpired(
        navigate,
        "For your security, your 12-hour login session has ended. Please log in again to continue."
      );
      return;
    }

    const checkAndSyncSession = () => {
      if (isTokenExpired(tokenJWT)) {
        handleSessionExpired(
          navigate,
          "For your security, your 12-hour login session has ended. Please log in again to continue."
        );
      }
    };

    checkAndSyncSession();
    // Cek berkala setiap 30 detik apakah token 12 jam kedaluwarsa
    const interval = setInterval(checkAndSyncSession, 30000);
    return () => clearInterval(interval);
  }, [tokenJWT, navigate]);

  // Base URL dari file .env
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // Header Standar untuk keamanan API
  const authHeaders = {
    Authorization: `Bearer ${tokenJWT}`,
    "Content-Type": "application/json",
  };

  // Wrapper API aman: Memvalidasi JWT 12 jam sebelum & sesudah request ke backend
  const apiFetch = useCallback(
    async (url, options = {}) => {
      // 1. Cek sebelum request: Jika token di browser sudah lewat 12 jam, tolak & redirect
      if (!tokenJWT || isTokenExpired(tokenJWT)) {
        handleSessionExpired(
          navigate,
          "For your security, your 12-hour login session has ended. Please log in again to continue."
        );
        throw new Error("Token session expired (12 hours).");
      }

      // 2. Kirim request ke backend
      const res = await fetch(url, options);

      // 3. Cek setelah request: Jika backend menolak dengan HTTP 401 Unauthorized
      if (res.status === 401) {
        handleSessionExpired(
          navigate,
          "For your security, your 12-hour login session has ended. Please log in again to continue."
        );
        throw new Error("Your login session has expired (12 hours).");
      }

      return res;
    },
    [tokenJWT, navigate]
  );

  // ==========================================
  // STATE UNTUK UPDATE & DELETE
  // ==========================================
  const [editModalData, setEditModalData] = useState(null);
  const [editAnnDate, setEditAnnDate] = useState("");
  const [editAnnEndDate, setEditAnnEndDate] = useState("");
  const [editAnnouncementText, setEditAnnouncementText] = useState("");
  const [editModalBirth, setEditModalBirth] = useState(null);
  const [editModalAdm, seteditModalAdm] = useState(null);

  const [editBirthName, seteditBirthName] = useState("");
  const [editBirtGender, setBirtGender] = useState("");
  const [editBirtDate, settBirtDat] = useState("");

  const [editAnnUrl, setEditAnnUrl] = useState("");
  const [editAnnImage, setEditAnnImage] = useState(null);

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminLevel, setNewAdminLevel] = useState("Super");

  const [newAdminNameUpdate, setNewAdminNameUpdate] = useState("");
  const [newAdminPasswordUpdate, setNewAdminPasswordUpdate] = useState("");
  const [newAdminLevelUpdate, setNewAdminLevelUpdate] = useState("");

  const [activeTab, setActiveTab] = useState("Announcements");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const [newAnnIsPinned, setNewAnnIsPinned] = useState(false);
  const [editAnnIsPinned, setEditAnnIsPinned] = useState(false);

  // ==========================================
  // 2. DATA STATE (DIKOSONGKAN UNTUK API)
  // ==========================================
  const [announcements, setAnnouncements] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [admin, setAdmin] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [duties, setDuties] = useState([]);
  const [dutyInvals, setDutyInvals] = useState([]);
  const [eventSchedules, setEventSchedules] = useState([]);
  const [dutyAttendanceRecords, setDutyAttendanceRecords] = useState([]);
  const [dutyAttendanceSessions, setDutyAttendanceSessions] = useState([]);
  const [dutyAttendanceLocations, setDutyAttendanceLocations] = useState([]);
  const [selectedQrLocation, setSelectedQrLocation] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [filterAttStatus, setFilterAttStatus] = useState("all");
  const [showLocationLinks, setShowLocationLinks] = useState(true);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [teachersList, setTeachersList] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [searchTeacherKeyword, setSearchTeacherKeyword] = useState("");
  const [dutyViewMode, setDutyViewMode] = useState("schedules"); // "schedules" | "pins"

  // State untuk Tab Available Teachers (Guru Kosong Berdasarkan Hari & Jam)
  const currentDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const [freeTeacherDay, setFreeTeacherDay] = useState(
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(currentDayName)
      ? currentDayName
      : "Monday"
  );
  const [freeTeacherSlot, setFreeTeacherSlot] = useState("all");
  const [freeTeachersList, setFreeTeachersList] = useState([]);
  const [searchFreeTeacher, setSearchFreeTeacher] = useState("");
  const [isLoadingFreeTeachers, setIsLoadingFreeTeachers] = useState(false);
  const [showInvalHistory, setShowInvalHistory] = useState(false);

  const handleOpenQrModal = async (loc) => {
    setSelectedQrLocation(loc);
    const targetUrl = `https://pengumuman.klprojects.online/duty/${encodeURIComponent(loc)}`;
    try {
      const url = await QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#1e3a8a",
          light: "#ffffff",
        },
      });
      setQrCodeDataUrl(url);
    } catch (err) {
      console.error("Failed to generate QR Code", err);
    }
  };

  const handlePrintQr = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Duty - ${selectedQrLocation}</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { margin: 0; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: #ffffff;
            }
            .poster {
              border: 5px solid #1e3a8a;
              border-radius: 28px;
              padding: 40px 30px;
              text-align: center;
              max-width: 480px;
              width: 100%;
              box-sizing: border-box;
            }
            .logo {
              height: 90px;
              margin: 0 auto 16px;
              display: block;
            }
            .school-name {
              font-size: 17px;
              line-height: 1.3;
              font-weight: 900;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 0 0 6px 0;
            }
            .subtitle {
              font-size: 13px;
              font-weight: 700;
              color: #d97706;
              letter-spacing: 2px;
              text-transform: uppercase;
              margin: 0 0 24px 0;
            }
            .location-box {
              background: #1e3a8a;
              color: #ffffff;
              display: inline-block;
              padding: 12px 32px;
              border-radius: 40px;
              font-size: 24px;
              font-weight: 900;
              margin-bottom: 24px;
              letter-spacing: 0.5px;
            }
            .qr-code {
              width: 280px;
              height: 280px;
              margin: 0 auto 20px;
              display: block;
            }
            .instructions {
              font-size: 15px;
              font-weight: 800;
              color: #1e293b;
              margin: 0 0 8px 0;
            }
            .sub-instructions {
              font-size: 12px;
              color: #64748b;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="poster">
            <img class="logo" src="/252-SMA_CITA_HATI_EAST_SURABAYA.png" alt="Cita Hati Logo" />
            <h1 class="school-name">Cita Hati Christian School Elementary Pakuwon City Campus</h1>
            <div class="subtitle">Duty Attendance Check-In</div>
            <div class="location-box">📍 ${selectedQrLocation}</div>
            <img class="qr-code" src="${qrCodeDataUrl}" alt="QR Code" />
            <p class="instructions">Scan this QR Code to check in for duty</p>
            <p class="sub-instructions">Use your smartphone camera / QR scanner</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeDataUrl;
    a.download = `QR_Duty_${selectedQrLocation.replace(/\s+/g, "_")}.png`;
    a.click();
  };

  const [filterAttDate, setFilterAttDate] = useState("");
  const [filterAttEndDate, setFilterAttEndDate] = useState("");
  const [filterAttPeriod, setFilterAttPeriod] = useState("all");

  const [editAttModal, setEditAttModal] = useState(null);
  const [editAttTeacher, setEditAttTeacher] = useState("");
  const [editAttLocation, setEditAttLocation] = useState("");
  const [editAttTimeSlot, setEditAttTimeSlot] = useState("");
  const [editAttCategory, setEditAttCategory] = useState("");
  const [editAttDate, setEditAttDate] = useState("");
  const [editAttScheduled, setEditAttScheduled] = useState(true);
  const [editAttStatus, setEditAttStatus] = useState("Sudah Duty");
  const [editAttNotes, setEditAttNotes] = useState("");

  const [invalFreeTeachers, setInvalFreeTeachers] = useState([]);
  const [isLoadingInvalFreeTeachers, setIsLoadingInvalFreeTeachers] = useState(false);

  const [filterAttLoc, setFilterAttLoc] = useState("");
  const [filterAttScheduled, setFilterAttScheduled] = useState("all");
  const [searchAttTeacher, setSearchAttTeacher] = useState("");
  const [currentAttPage, setCurrentAttPage] = useState(1);
  const [isSeedingAttDummy, setIsSeedingAttDummy] = useState(false);
  const [visitorStats, setVisitorStats] = useState({
    total_visits: 0,
    today_visits: 0,
    weekly_stats: [],
  });

  // ==========================================
  // 3. SEARCH, FILTER TANGGAL, & PAGINATION STATE
  // ==========================================
  const [searchAnnouncements, setSearchAnnouncements] = useState("");
  const [filterAnnDate, setFilterAnnDate] = useState(""); // Filter Date Tabel Announcement
  const [currentAnnPage, setCurrentAnnPage] = useState(1);

  const [searchAdm, setsearchAdm] = useState("");
  const [currentAdmPage, setcurrentAdmPage] = useState(1);

  const [searchBirthdays, setSearchBirthdays] = useState("");
  const [filterBdayDate, setFilterBdayDate] = useState(""); // Filter Date Tabel Birthday
  const [currentBdayPage, setCurrentBdayPage] = useState(1);

  const [searchSchedule, setSearchSchedule] = useState("");
  const [filterScheduleDay, setFilterScheduleDay] = useState("");
  const [currentSchedulePage, setCurrentSchedulePage] = useState(1);

  const [searchDuty, setSearchDuty] = useState("");
  const [filterDutyDay, setFilterDutyDay] = useState("");
  const [filterDutyLocation, setFilterDutyLocation] = useState("");
  const [currentDutyPage, setCurrentDutyPage] = useState(1);

  // Inval Duty Search & Pagination
  const [searchInval, setSearchInval] = useState("");
  const [filterInvalDate, setFilterInvalDate] = useState("");
  const [filterInvalStatus, setFilterInvalStatus] = useState("all"); // "all" | "active" | "history"
  const [currentInvalPage, setCurrentInvalPage] = useState(1);

  // Event Schedules Search & Pagination
  const [searchEvent, setSearchEvent] = useState("");
  const [currentEventPage, setCurrentEventPage] = useState(1);

  const itemsPerPage = 10;

  // ==========================================
  // 4. FORM STATE (CREATE)
  // ==========================================
  const [newAnnDate, setNewAnnDate] = useState("");
  const [newAnnEndDate, setNewAnnEndDate] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [newAnnUrl, setNewAnnUrl] = useState("");
  const [newAnnImage, setNewAnnImage] = useState(null);

  const [newBdayName, setNewBdayName] = useState("");
  const [newBdayDate, setNewBdayDate] = useState("");
  const [newBdayGender, setNewBdayGender] = useState("");

  // Teacher Schedule Create Form
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [newSchedTeacher, setNewSchedTeacher] = useState("");
  const [newSchedSubject, setNewSchedSubject] = useState("");
  const [newSchedDay, setNewSchedDay] = useState("Monday");
  const [newSchedTime, setNewSchedTime] = useState("");
  const [newSchedClass, setNewSchedClass] = useState("");
  const [newSchedNote, setNewSchedNote] = useState("");

  // Teacher Schedule Edit Form
  const [editSchedModal, setEditSchedModal] = useState(null);
  const [editSchedTeacher, setEditSchedTeacher] = useState("");
  const [editSchedSubject, setEditSchedSubject] = useState("");
  const [editSchedDay, setEditSchedDay] = useState("Monday");
  const [editSchedTime, setEditSchedTime] = useState("");
  const [editSchedClass, setEditSchedClass] = useState("");
  const [editSchedNote, setEditSchedNote] = useState("");

  // Teacher Duty Create Form
  const [isCreateDutyOpen, setIsCreateDutyOpen] = useState(false);
  const [newDutyCategory, setNewDutyCategory] = useState("Morning Duty");
  const [newDutyGradeScope, setNewDutyGradeScope] = useState("All Grades (Schoolwide)");
  const [newDutyLocation, setNewDutyLocation] = useState("ESE Backyard");
  const [newDutyDay, setNewDutyDay] = useState("Monday");
  const [newDutyTime, setNewDutyTime] = useState("07.15-07.45");
  const [newDutyTeacher, setNewDutyTeacher] = useState("");
  const [newDutyTask, setNewDutyTask] = useState("");

  // Teacher Duty Edit Form
  const [editDutyModal, setEditDutyModal] = useState(null);
  const [editDutyCategory, setEditDutyCategory] = useState("");
  const [editDutyGradeScope, setEditDutyGradeScope] = useState("");
  const [editDutyLocation, setEditDutyLocation] = useState("");
  const [editDutyDay, setEditDutyDay] = useState("Monday");
  const [editDutyTime, setEditDutyTime] = useState("");
  const [editDutyTeacher, setEditDutyTeacher] = useState("");
  const [editDutyTask, setEditDutyTask] = useState("");

  // Inval Duty Create Form
  const [isCreateInvalOpen, setIsCreateInvalOpen] = useState(false);
  const [newInvalDate, setNewInvalDate] = useState(today);
  const [newInvalOriginalTeacher, setNewInvalOriginalTeacher] = useState("");
  const [newInvalSubstituteTeacher, setNewInvalSubstituteTeacher] = useState("");
  const [newInvalLocation, setNewInvalLocation] = useState("ESE Backyard");
  const [newInvalTime, setNewInvalTime] = useState("07.15-07.45");
  const [newInvalReason, setNewInvalReason] = useState("");
  const [newInvalNote, setNewInvalNote] = useState("");

  // Event Schedule Create & Edit Form
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventScope, setNewEventScope] = useState("Schoolwide");
  const [newEventDate, setNewEventDate] = useState(today);
  const [newEventEndDate, setNewEventEndDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventAffectsKbm, setNewEventAffectsKbm] = useState(true);

  const [editEventModal, setEditEventModal] = useState(null);
  const [editEventName, setEditEventName] = useState("");
  const [editEventScope, setEditEventScope] = useState("Schoolwide");
  const [editEventDate, setEditEventDate] = useState("");
  const [editEventEndDate, setEditEventEndDate] = useState("");
  const [editEventTime, setEditEventTime] = useState("");
  const [editEventDesc, setEditEventDesc] = useState("");
  const [editEventAffectsKbm, setEditEventAffectsKbm] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popupData, setPopupData] = useState(null);

  // ==========================================
  // 5. FETCH DATA DARI API
  // ==========================================
  const fetchSemuaData = useCallback(async () => {
    try {
      // Fetch data dengan menyertakan token JWT untuk keamanan (validasi 12 jam)
      const [
        resAnn,
        resBday,
        resAdm,
        resSched,
        resDuties,
        resStats,
        resInvals,
        resEvents,
      ] = await Promise.all([
        apiFetch(`${baseUrl}/announcements`, {
          headers: { Authorization: `Bearer ${tokenJWT}` },
        }),
        apiFetch(`${baseUrl}/birthdays`, {
          headers: { Authorization: `Bearer ${tokenJWT}` },
        }),
        apiFetch(`${baseUrl}/admin`, {
          headers: { Authorization: `Bearer ${tokenJWT}` },
        }),
        apiFetch(`${baseUrl}/schedules`, {
          headers: { Authorization: `Bearer ${tokenJWT}` },
        }),
        apiFetch(`${baseUrl}/duties`, {
          headers: { Authorization: `Bearer ${tokenJWT}` },
        }),
        apiFetch(`${baseUrl}/admin/visitor-stats`, {
          headers: { Authorization: `Bearer ${tokenJWT}` },
        }),
        apiFetch(`${baseUrl}/duties/inval`, {
          headers: { Authorization: `Bearer ${tokenJWT}` },
        }),
        apiFetch(`${baseUrl}/events/schedule`, {
          headers: { Authorization: `Bearer ${tokenJWT}` },
        }),
      ]);

      if (resAnn.ok) setAnnouncements(await resAnn.json());
      if (resBday.ok) setBirthdays(await resBday.json());
      if (resAdm.ok) setAdmin(await resAdm.json());
      if (resSched.ok) setSchedules(await resSched.json());
      if (resDuties.ok) setDuties(await resDuties.json());
      if (resStats.ok) setVisitorStats(await resStats.json());
      if (resInvals.ok) setDutyInvals(await resInvals.json());
      if (resEvents.ok) setEventSchedules(await resEvents.json());
    } catch (error) {
      console.error("Failed to fetch data from the server", error);
    }
  }, [baseUrl, tokenJWT, apiFetch]);

  useEffect(() => {
    document.title = "Admin Panel - Cita Hati";
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);

    // Panggil data saat komponen dimuat
    if (tokenJWT) {
      fetchSemuaData();
      fetchTeachers();
    }

    return () => window.removeEventListener("resize", handleResize);
  }, [fetchSemuaData, tokenJWT]);

  // ==========================================
  // 6. LOGIKA FILTER DASHBOARD HARI INI
  // ==========================================
  const todayAnnouncements = announcements.filter(
    (item) => item.date === selectedDate,
  );
  const monthDayPilihan = selectedDate.substring(5);
  const todayBirthdays = Array.isArray(birthdays)
    ? birthdays.filter((b) => b.date && b.date.endsWith(monthDayPilihan))
    : [];

  // ==========================================
  // 7. LOGIKA SEARCH, FILTER TABEL & PAGINATION
  // ==========================================

  // FILTER TABEL ANNOUNCEMENT (Search Teks & Filter Bulan-Tanggal)
  const filteredAnnouncements = announcements.filter((item) => {
    const safeDate = item.date || "";
    const matchSearch =
      item.announcement
        ?.toLowerCase()
        .includes(searchAnnouncements.toLowerCase()) ||
      safeDate.includes(searchAnnouncements);

    // Bandingkan substring mulai index ke-5 (YYYY-MM-DD -> MM-DD)
    const matchDate = filterAnnDate
      ? safeDate.substring(5) === filterAnnDate.substring(5)
      : true;

    return matchSearch && matchDate;
  });

  const totalAnnPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const currentAnnData = filteredAnnouncements.slice(
    (currentAnnPage - 1) * itemsPerPage,
    currentAnnPage * itemsPerPage,
  );

  // FILTER TABEL BIRTHDAY (Search Teks & Filter Bulan-Tanggal)
  const filteredBirthdays = Array.isArray(birthdays)
    ? birthdays.filter((item) => {
        const safeName = item.name || "";
        const safeDate = item.date || "";
        const safeGender = item.gender || "";

        const matchSearch =
          safeName.toLowerCase().includes(searchBirthdays.toLowerCase()) ||
          safeDate.includes(searchBirthdays) ||
          safeGender.toLowerCase().includes(searchBirthdays.toLowerCase());

        // Bandingkan substring mulai index ke-5 (YYYY-MM-DD -> MM-DD)
        const matchDate = filterBdayDate
          ? safeDate.substring(5) === filterBdayDate.substring(5)
          : true;

        return matchSearch && matchDate;
      })
    : [];

  const totalBdayPages = Math.ceil(filteredBirthdays.length / itemsPerPage);
  const currentBdayData = filteredBirthdays.slice(
    (currentBdayPage - 1) * itemsPerPage,
    currentBdayPage * itemsPerPage,
  );

  const filteredAdmin = Array.isArray(admin)
    ? admin.filter(
        (item) =>
          item.name_admin.toLowerCase().includes(searchAdm.toLowerCase()) ||
          item.level_admin.toLowerCase().includes(searchAdm.toLowerCase()),
      )
    : [];

  const totalAdmPages = Math.ceil(filteredAdmin.length / itemsPerPage);
  const currentAdmData = filteredAdmin.slice(
    (currentAdmPage - 1) * itemsPerPage,
    currentAdmPage * itemsPerPage,
  );

  // FILTER TABEL TEACHER SCHEDULES (Search Guru / Mapel / Class / Grade / Waktu & Filter Hari)
  const filteredSchedules = Array.isArray(schedules)
    ? schedules.filter((item) => {
        const safeTeacher = item.teacher_name || "";
        const safeSubject = item.subject_grade || "";
        const safeClass = item.class_name || "";
        const safeTime = item.time_slot || "";
        const safeDay = item.day_of_week || "";

        const query = searchSchedule.toLowerCase();
        const matchSearch =
          safeTeacher.toLowerCase().includes(query) ||
          safeSubject.toLowerCase().includes(query) ||
          safeClass.toLowerCase().includes(query) ||
          safeTime.toLowerCase().includes(query);

        const matchDay = filterScheduleDay
          ? safeDay === filterScheduleDay
          : true;
        return matchSearch && matchDay;
      })
    : [];

  const totalSchedulePages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const currentScheduleData = filteredSchedules.slice(
    (currentSchedulePage - 1) * itemsPerPage,
    currentSchedulePage * itemsPerPage,
  );

  // FILTER TABEL TEACHER DUTIES (Search Guru / Lokasi / Kategori / Tugas & Filter Hari & Lokasi)
  const filteredDuties = Array.isArray(duties)
    ? duties.filter((item) => {
        const safeTeacher = item.teacher_name || "";
        const safeLocation = item.location || "";
        const safeCategory = item.category || "";
        const safeTask = item.task || "";
        const safeTime = item.time_slot || "";
        const safeDay = item.day_of_week || "";

        const query = searchDuty.toLowerCase();
        const matchSearch =
          safeTeacher.toLowerCase().includes(query) ||
          safeLocation.toLowerCase().includes(query) ||
          safeCategory.toLowerCase().includes(query) ||
          safeTask.toLowerCase().includes(query) ||
          safeTime.toLowerCase().includes(query);

        const matchDay = filterDutyDay ? safeDay === filterDutyDay : true;
        const matchLocation = filterDutyLocation
          ? safeLocation.toLowerCase().includes(filterDutyLocation.toLowerCase())
          : true;

        return matchSearch && matchDay && matchLocation;
      })
    : [];

  const totalDutyPages = Math.ceil(filteredDuties.length / itemsPerPage);
  const currentDutyData = filteredDuties.slice(
    (currentDutyPage - 1) * itemsPerPage,
    currentDutyPage * itemsPerPage,
  );

  // FILTER TABEL INVAL DUTY
  const activeInvalCount = Array.isArray(dutyInvals)
    ? dutyInvals.filter((item) => item.date >= today).length
    : 0;
  const historyInvalCount = Array.isArray(dutyInvals)
    ? dutyInvals.filter((item) => item.date < today).length
    : 0;

  const filteredInvals = Array.isArray(dutyInvals)
    ? dutyInvals.filter((item) => {
        const safeOrig = item.original_teacher || "";
        const safeSub = item.substitute_teacher || "";
        const safeLoc = item.location || "";
        const safeReason = item.reason || "";
        const query = searchInval.toLowerCase();
        const matchesSearch =
          safeOrig.toLowerCase().includes(query) ||
          safeSub.toLowerCase().includes(query) ||
          safeLoc.toLowerCase().includes(query) ||
          safeReason.toLowerCase().includes(query);
        const matchesDate = !filterInvalDate || item.date === filterInvalDate;
        
        const isUpcomingOrToday = item.date >= today;
        const matchesStatus =
          filterInvalStatus === "all" ||
          (filterInvalStatus === "active" && isUpcomingOrToday) ||
          (filterInvalStatus === "history" && !isUpcomingOrToday);

        return matchesSearch && matchesDate && matchesStatus;
      })
    : [];
  const totalInvalPages = Math.ceil(filteredInvals.length / itemsPerPage);
  const currentInvalData = filteredInvals.slice(
    (currentInvalPage - 1) * itemsPerPage,
    currentInvalPage * itemsPerPage,
  );

  // FILTER TABEL EVENT SCHEDULES
  const filteredEvents = Array.isArray(eventSchedules)
    ? eventSchedules.filter((item) => {
        const safeName = item.event_name || "";
        const safeScope = item.target_scope || "";
        const safeDesc = item.description || "";
        const query = searchEvent.toLowerCase();
        return (
          safeName.toLowerCase().includes(query) ||
          safeScope.toLowerCase().includes(query) ||
          safeDesc.toLowerCase().includes(query)
        );
      })
    : [];
  const totalEventPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const currentEventData = filteredEvents.slice(
    (currentEventPage - 1) * itemsPerPage,
    currentEventPage * itemsPerPage,
  );

  // FILTER TABEL DUTY ATTENDANCE (ABSENSI GURU PIKET)
  const filteredAttendanceRecords = Array.isArray(dutyAttendanceRecords)
    ? dutyAttendanceRecords.filter((rec) => {
        const matchTeacher = searchAttTeacher
          ? (rec.teacher_name || "")
              .toLowerCase()
              .includes(searchAttTeacher.toLowerCase())
          : true;
        const matchScheduled =
          filterAttScheduled === "all"
            ? true
            : filterAttScheduled === "scheduled"
              ? rec.is_scheduled_duty === true
              : rec.is_scheduled_duty === false;
        const matchLoc = filterAttLoc
          ? (rec.location || "").toLowerCase() === filterAttLoc.toLowerCase()
          : true;
        const matchStatus =
          !filterAttStatus || filterAttStatus === "all"
            ? true
            : filterAttStatus === "tidak_duty"
              ? rec.status === "Tidak Duty" || rec.status === "tidak_duty" || (rec.status_label && rec.status_label.toLowerCase().includes("tidak"))
              : filterAttStatus === "sudah_duty"
                ? rec.status === "Sudah Duty" || rec.status === "sudah_duty" || (rec.status_label && rec.status_label.toLowerCase().includes("sudah"))
                : filterAttStatus === "lagi_duty"
                  ? rec.status === "Lagi Duty" || rec.status === "lagi_duty" || (rec.status_label && rec.status_label.toLowerCase().includes("lagi"))
                  : filterAttStatus === "sedang_jam_piket"
                    ? rec.status === "Sedang Jam Piket" || (rec.status_label && rec.status_label.toLowerCase().includes("sedang jam piket"))
                    : filterAttStatus === "belum_duty"
                      ? rec.status === "Belum Duty" || rec.status === "belum_duty" || (rec.status_label && rec.status_label.toLowerCase().includes("belum"))
                      : true;
        return matchTeacher && matchScheduled && matchLoc && matchStatus;
      })
    : [];
  const totalAttPages =
    Math.ceil(filteredAttendanceRecords.length / itemsPerPage) || 1;
  const currentAttData = filteredAttendanceRecords.slice(
    (currentAttPage - 1) * itemsPerPage,
    currentAttPage * itemsPerPage,
  );

  // Reset pagination saat pencarian atau filter diubah
  useEffect(() => setCurrentAnnPage(1), [searchAnnouncements, filterAnnDate]);
  useEffect(() => setCurrentBdayPage(1), [searchBirthdays, filterBdayDate]);
  useEffect(
    () => setCurrentSchedulePage(1),
    [searchSchedule, filterScheduleDay],
  );
  useEffect(
    () => setCurrentDutyPage(1),
    [searchDuty, filterDutyDay, filterDutyLocation],
  );
  useEffect(() => setCurrentInvalPage(1), [searchInval, filterInvalDate]);
  useEffect(() => setCurrentEventPage(1), [searchEvent]);
  useEffect(
    () => setCurrentAttPage(1),
    [searchAttTeacher, filterAttDate, filterAttLoc, filterAttScheduled, filterAttStatus],
  );

  // ==========================================
  // 8. FUNGSI POST (SUBMIT DATA) KE API
  // ==========================================
  const handlePostAnnouncement = async () => {
    if (!newAnnDate || !newAnnouncement.trim())
      return alert("Please fill out the form completely!");
    setIsSubmitting(true);

    try {
      // Karena ada upload gambar, gunakan FormData, BUKAN application/json
      const formData = new FormData();
      formData.append("tanggal_masuk", newAnnDate);
      if (newAnnEndDate) formData.append("end_date", newAnnEndDate);
      formData.append("announcement", newAnnouncement);
      formData.append("admin_update", id_admin);
      if (newAnnUrl) formData.append("url_announcemet", newAnnUrl);
      if (newAnnImage) formData.append("image", newAnnImage);
      formData.append("is_pinned", newAnnIsPinned);

      const res = await apiFetch(`${baseUrl}/announcements`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenJWT}` }, // JANGAN tambahkan Content-Type untuk form-data
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to post announcement");

      await fetchSemuaData(); // Refresh tabel setelah sukses
      setPopupData({ title: "Announcement Posted!" });
      setNewAnnDate("");
      setNewAnnEndDate("");
      setNewAnnouncement("");
      setNewAnnUrl("");
      setNewAnnImage(null);
      setNewAnnIsPinned(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostBirthday = async (e) => {
    e.preventDefault();
    if (!newBdayName || !newBdayDate || !newBdayGender)
      return alert("Please fill out the form completely!");
    setIsSubmitting(true);

    try {
      const payload = {
        name: newBdayName,
        date: newBdayDate,
        gender: newBdayGender,
      };

      const res = await apiFetch(`${baseUrl}/birthdays`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to add birthday record");

      await fetchSemuaData();
      setPopupData({ title: "Birthday Record Added!" });
      setNewBdayName("");
      setNewBdayDate("");
      setNewBdayGender("");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminName || !newAdminPassword || !newAdminLevel)
      return alert("Please fill out the form completely!");
    setIsSubmitting(true);

    try {
      const payload = {
        name_admin: newAdminName,
        password_admin: newAdminPassword,
        level_admin: newAdminLevel,
      };

      const res = await apiFetch(`${baseUrl}/admin`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create new admin");

      await fetchSemuaData();
      setPopupData({ title: "Admin Record Added!" });
      setNewAdminName("");
      setNewAdminPassword("");
      setNewAdminLevel("Super");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to sign out from the Admin portal?",
    );
    if (isConfirmed) {
      clearAdminSession();
      window.location.href = "/AdminLogin";
    }
  };

  const handlePostSchedule = async (e) => {
    e.preventDefault();
    if (
      !newSchedTeacher.trim() ||
      !newSchedSubject.trim() ||
      !newSchedDay ||
      !newSchedTime.trim() ||
      !newSchedClass.trim()
    ) {
      return alert("Lengkapi semua field jadwal guru!");
    }
    setIsSubmitting(true);

    try {
      const payload = {
        teacher_name: newSchedTeacher.trim(),
        subject_grade: newSchedSubject.trim(),
        day_of_week: newSchedDay,
        time_slot: newSchedTime.trim(),
        class_name: newSchedClass.trim(),
        note: newSchedNote.trim() || null,
      };

      const res = await apiFetch(`${baseUrl}/schedules`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (res.status === 403)
        throw new Error(
          "Akses ditolak: Hanya Super Admin yang dapat menambah jadwal guru!",
        );
      if (!res.ok) throw new Error("Failed to add teacher schedule.");

      await fetchSemuaData();
      setPopupData({ title: "Teacher Schedule Added!" });
      setIsCreateScheduleOpen(false);
      setNewSchedTeacher("");
      setNewSchedSubject("");
      setNewSchedDay("Monday");
      setNewSchedTime("");
      setNewSchedClass("");
      setNewSchedNote("");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditScheduleClick = (item) => {
    setEditSchedModal(item.id_schedule);
    setEditSchedTeacher(item.teacher_name || "");
    setEditSchedSubject(item.subject_grade || "");
    setEditSchedDay(item.day_of_week || "Monday");
    setEditSchedTime(item.time_slot || "");
    setEditSchedClass(item.class_name || "");
    setEditSchedNote(item.note || "");
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    if (
      !editSchedTeacher.trim() ||
      !editSchedSubject.trim() ||
      !editSchedDay ||
      !editSchedTime.trim() ||
      !editSchedClass.trim()
    ) {
      return alert("Lengkapi semua field jadwal guru!");
    }
    setIsSubmitting(true);

    try {
      const payload = {
        teacher_name: editSchedTeacher.trim(),
        subject_grade: editSchedSubject.trim(),
        day_of_week: editSchedDay,
        time_slot: editSchedTime.trim(),
        class_name: editSchedClass.trim(),
        note: editSchedNote.trim() || null,
      };

      const res = await apiFetch(`${baseUrl}/schedules/${editSchedModal}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (res.status === 403)
        throw new Error(
          "Akses ditolak: Hanya Super Admin yang dapat mengubah jadwal guru!",
        );
      if (!res.ok) throw new Error("Failed to update teacher schedule.");

      await fetchSemuaData();
      setPopupData({ title: "Teacher Schedule Updated!" });
      setEditSchedModal(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id_schedule) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this teacher schedule? This action cannot be undone.",
    );
    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`${baseUrl}/schedules/${id_schedule}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (res.status === 403)
        throw new Error(
          "Akses ditolak: Hanya Super Admin yang dapat menghapus jadwal guru!",
        );
      if (!res.ok) throw new Error("Failed to delete teacher schedule.");

      await fetchSemuaData();
      setPopupData({ title: "Schedule Deleted!" });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSyncMasterSchedules = async () => {
    const isConfirmed = window.confirm(
      "Sinkronkan ulang seluruh jadwal guru dari file master CSV? Seluruh data jadwal saat ini akan di-reset sesuai file master.",
    );
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`${baseUrl}/schedules/sync-master`, {
        method: "POST",
        headers: authHeaders,
      });

      if (res.status === 403)
        throw new Error(
          "Akses ditolak: Hanya Super Admin yang diizinkan sinkronisasi jadwal!",
        );
      if (!res.ok) throw new Error("Failed to synchronize master CSV.");

      const data = await res.json();
      await fetchSemuaData();
      alert(data.message || "Sinkronisasi berhasil!");
      setPopupData({ title: "Master CSV Synced!" });
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HANDLER TEACHER DUTIES (DUTY SCHEDULES)
  // ==========================================
  const handlePostDuty = async (e) => {
    e.preventDefault();
    if (
      !newDutyCategory.trim() ||
      !newDutyLocation.trim() ||
      !newDutyDay ||
      !newDutyTime.trim() ||
      !newDutyTeacher.trim()
    ) {
      return alert("Lengkapi semua field wajib untuk jadwal duty!");
    }
    setIsSubmitting(true);
    try {
      const payload = {
        category: newDutyCategory.trim(),
        grade_scope: newDutyGradeScope.trim() || "All Grades (Schoolwide)",
        location: newDutyLocation.trim(),
        day_of_week: newDutyDay,
        time_slot: newDutyTime.trim(),
        teacher_name: newDutyTeacher.trim(),
        task: newDutyTask.trim() || null,
      };

      const res = await apiFetch(`${baseUrl}/duties`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (res.status === 403)
        throw new Error(
          "Akses ditolak: Hanya Super Admin yang dapat menambah jadwal duty!",
        );
      if (!res.ok) throw new Error("Failed to add duty schedule.");

      await fetchSemuaData();
      setPopupData({ title: "Teacher Duty Added!" });
      setIsCreateDutyOpen(false);
      setNewDutyTeacher("");
      setNewDutyTask("");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDutyClick = (item) => {
    setEditDutyModal(item.id_duty);
    setEditDutyCategory(item.category || "Morning Duty");
    setEditDutyGradeScope(item.grade_scope || "All Grades (Schoolwide)");
    setEditDutyLocation(item.location || "ESE Backyard");
    setEditDutyDay(item.day_of_week || "Monday");
    setEditDutyTime(item.time_slot || "");
    setEditDutyTeacher(item.teacher_name || "");
    setEditDutyTask(item.task || "");
  };

  const handleUpdateDuty = async (e) => {
    e.preventDefault();
    if (
      !editDutyCategory.trim() ||
      !editDutyLocation.trim() ||
      !editDutyDay ||
      !editDutyTime.trim() ||
      !editDutyTeacher.trim()
    ) {
      return alert("Lengkapi semua field wajib untuk jadwal duty!");
    }
    setIsSubmitting(true);
    try {
      const payload = {
        category: editDutyCategory.trim(),
        grade_scope: editDutyGradeScope.trim() || "All Grades (Schoolwide)",
        location: editDutyLocation.trim(),
        day_of_week: editDutyDay,
        time_slot: editDutyTime.trim(),
        teacher_name: editDutyTeacher.trim(),
        task: editDutyTask.trim() || null,
      };

      const res = await apiFetch(`${baseUrl}/duties/${editDutyModal}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (res.status === 403)
        throw new Error(
          "Akses ditolak: Hanya Super Admin yang dapat mengubah jadwal duty!",
        );
      if (!res.ok) throw new Error("Failed to update duty schedule.");

      await fetchSemuaData();
      setPopupData({ title: "Teacher Duty Updated!" });
      setEditDutyModal(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDuty = async (id_duty) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this duty schedule? This action cannot be undone.",
    );
    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`${baseUrl}/duties/${id_duty}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (res.status === 403)
        throw new Error(
          "Akses ditolak: Hanya Super Admin yang dapat menghapus jadwal duty!",
        );
      if (!res.ok) throw new Error("Failed to delete duty schedule.");

      await fetchSemuaData();
      setPopupData({ title: "Duty Deleted!" });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSyncMasterDuties = async () => {
    const isConfirmed = window.confirm(
      "Sinkronkan ulang seluruh jadwal duty dari file master CSV? Seluruh data duty saat ini akan di-reset sesuai file master.",
    );
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`${baseUrl}/duties/sync-master`, {
        method: "POST",
        headers: authHeaders,
      });

      if (res.status === 403)
        throw new Error(
          "Akses ditolak: Hanya Super Admin yang diizinkan sinkronisasi jadwal duty!",
        );
      if (!res.ok) throw new Error("Failed to synchronize duty master CSV.");

      const data = await res.json();
      await fetchSemuaData();
      alert(data.message || "Sinkronisasi duty berhasil!");
      setPopupData({ title: "Duty Master Synced!" });
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // INVAL DUTY CRUD
  // ==========================================
  const handlePostInval = async () => {
    if (
      !newInvalDate ||
      !newInvalOriginalTeacher.trim() ||
      !newInvalSubstituteTeacher.trim() ||
      !newInvalLocation.trim() ||
      !newInvalTime.trim()
    ) {
      return alert("Lengkapi semua field wajib untuk inval duty!");
    }
    setIsSubmitting(true);
    try {
      const payload = {
        date: newInvalDate,
        original_teacher: newInvalOriginalTeacher.trim(),
        substitute_teacher: newInvalSubstituteTeacher.trim(),
        location: newInvalLocation.trim(),
        time_slot: newInvalTime.trim(),
        reason: newInvalReason.trim() || null,
        note: newInvalNote.trim() || null,
      };

      const res = await apiFetch(`${baseUrl}/duties/inval`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to add inval duty data.");

      await fetchSemuaData();
      setPopupData({ title: "Inval Duty Added!" });
      setIsCreateInvalOpen(false);
      setNewInvalOriginalTeacher("");
      setNewInvalSubstituteTeacher("");
      setNewInvalReason("");
      setNewInvalNote("");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInval = async (id_inval) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this substitute duty record? This action cannot be undone.",
    );
    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`${baseUrl}/duties/inval/${id_inval}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) throw new Error("Failed to delete inval duty data.");

      await fetchSemuaData();
      setPopupData({ title: "Inval Duty Deleted!" });
    } catch (error) {
      alert(error.message);
    }
  };

  // ==========================================
  // EVENT SCHEDULE CRUD
  // ==========================================
  const handlePostEvent = async () => {
    if (!newEventName.trim() || !newEventDate || !newEventDesc.trim()) {
      return alert("Nama acara, tanggal mulai, dan deskripsi wajib diisi!");
    }
    setIsSubmitting(true);
    try {
      const payload = {
        event_name: newEventName.trim(),
        target_scope: newEventScope.trim() || "Schoolwide",
        date: newEventDate,
        end_date: newEventEndDate || null,
        time_slot: newEventTime.trim() || null,
        description: newEventDesc.trim(),
        affects_kbm: newEventAffectsKbm,
      };

      const res = await apiFetch(`${baseUrl}/events/schedule`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create special event schedule.");

      await fetchSemuaData();
      setPopupData({ title: "Event Schedule Created!" });
      setIsCreateEventOpen(false);
      setNewEventName("");
      setNewEventEndDate("");
      setNewEventTime("");
      setNewEventDesc("");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClickEvent = (item) => {
    setEditEventModal(item.id_event);
    setEditEventName(item.event_name);
    setEditEventScope(item.target_scope);
    setEditEventDate(item.date);
    setEditEventEndDate(item.end_date || "");
    setEditEventTime(item.time_slot || "");
    setEditEventDesc(item.description);
    setEditEventAffectsKbm(item.affects_kbm);
  };

  const handleUpdateEvent = async () => {
    if (!editEventName.trim() || !editEventDate || !editEventDesc.trim()) {
      return alert("Nama acara, tanggal mulai, dan deskripsi wajib diisi!");
    }
    setIsSubmitting(true);
    try {
      const payload = {
        event_name: editEventName.trim(),
        target_scope: editEventScope.trim() || "Schoolwide",
        date: editEventDate,
        end_date: editEventEndDate || null,
        time_slot: editEventTime.trim() || null,
        description: editEventDesc.trim(),
        affects_kbm: editEventAffectsKbm,
      };

      const res = await apiFetch(
        `${baseUrl}/events/schedule/${editEventModal}`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Failed to update event schedule.");

      await fetchSemuaData();
      setPopupData({ title: "Event Schedule Updated!" });
      setEditEventModal(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id_event) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this special event schedule? This action cannot be undone.",
    );
    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`${baseUrl}/events/schedule/${id_event}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) throw new Error("Failed to delete event schedule.");

      await fetchSemuaData();
      setPopupData({ title: "Event Schedule Deleted!" });
    } catch (error) {
      alert(error.message);
    }
  };

  // ==========================================
  // HANDLERS ABSENSI DUTY GURU & AVAILABLE TEACHERS
  // ==========================================
  const fetchTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const res = await apiFetch(`${baseUrl}/admin/teachers`, {
        headers: { Authorization: `Bearer ${tokenJWT}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeachersList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch teachers:", err);
    } finally {
      setTeachersLoading(false);
    }
  }, [baseUrl, tokenJWT, apiFetch]);

  const fetchDutyAttendanceData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterAttDate && filterAttEndDate) {
        params.append("start_date", filterAttDate);
        params.append("end_date", filterAttEndDate);
      } else if (filterAttDate) {
        params.append("tanggal", filterAttDate);
      }
      if (filterAttLoc) params.append("location", filterAttLoc);
      if (searchAttTeacher) params.append("teacher_name", searchAttTeacher);

      const recUrl = `${baseUrl}/duty-attendance/comprehensive-records?${params.toString()}`;

      const targetSessDate = filterAttDate || today;
      let sessUrl = `${baseUrl}/duty-attendance/sessions?tanggal=${targetSessDate}`;
      if (filterAttLoc) sessUrl += `&location=${encodeURIComponent(filterAttLoc)}`;

      const [resRec, resSess, resLoc] = await Promise.all([
        apiFetch(recUrl, { headers: { Authorization: `Bearer ${tokenJWT}` } }),
        apiFetch(sessUrl, { headers: { Authorization: `Bearer ${tokenJWT}` } }),
        apiFetch(`${baseUrl}/duty-attendance/locations`, { headers: { Authorization: `Bearer ${tokenJWT}` } }),
      ]);

      if (resRec.ok) setDutyAttendanceRecords(await resRec.json());
      if (resSess.ok) setDutyAttendanceSessions(await resSess.json());
      if (resLoc.ok) setDutyAttendanceLocations(await resLoc.json());
    } catch (e) {
      console.error("Failed to fetch duty attendance data:", e);
    }
  }, [baseUrl, tokenJWT, filterAttDate, filterAttEndDate, filterAttLoc, searchAttTeacher, filterAttStatus, today, apiFetch]);

  useEffect(() => {
    if (activeTab === "Duty Attendance") {
      fetchDutyAttendanceData();
    }
    if (activeTab === "Manage Teachers") {
      fetchTeachers();
    }
  }, [activeTab, filterAttDate, filterAttEndDate, filterAttLoc, searchAttTeacher, filterAttStatus, fetchDutyAttendanceData]);

  // Catalog Guru Kosong (Available Teachers)
  const fetchFreeTeachersCatalog = useCallback(async () => {
    setIsLoadingFreeTeachers(true);
    try {
      let url = `${baseUrl}/duty-attendance/free-teachers?day_of_week=${encodeURIComponent(freeTeacherDay)}`;
      if (freeTeacherSlot && freeTeacherSlot !== "all") {
        url += `&time_slot=${encodeURIComponent(freeTeacherSlot)}`;
      }
      const res = await apiFetch(url, { headers: { Authorization: `Bearer ${tokenJWT}` } });
      if (res.ok) {
        const data = await res.json();
        setFreeTeachersList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch free teachers catalog:", e);
    } finally {
      setIsLoadingFreeTeachers(false);
    }
  }, [baseUrl, tokenJWT, freeTeacherDay, freeTeacherSlot, apiFetch]);

  useEffect(() => {
    if (activeTab === "Inval Duties") {
      fetchFreeTeachersCatalog();
    }
  }, [activeTab, freeTeacherDay, freeTeacherSlot, fetchFreeTeachersCatalog]);

  const handleAssignFreeTeacher = (teacherName) => {
    setNewInvalSubstitute(teacherName);
    if (freeTeacherSlot && freeTeacherSlot !== "all") {
      setNewInvalTime(freeTeacherSlot);
    }
    setIsCreateInvalOpen(true);
  };

  const handleManualVerifyClick = async (rec) => {
    if (!window.confirm(`Verifikasi manual kehadiran untuk ${rec.teacher_name} pada tugas ${rec.location} (${rec.time_slot})?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        date: rec.date,
        location: rec.location,
        time_slot: rec.time_slot,
        teacher_name: rec.teacher_name,
        duty_category: rec.duty_category || null,
        is_scheduled_duty: rec.is_scheduled_duty ?? true,
        notes: "Manual verification by Admin",
      };
      const res = await apiFetch(`${baseUrl}/duty-attendance/manual-verify`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal verifikasi manual");
      setPopupData({ title: `Berhasil memverifikasi ${rec.teacher_name}!` });
      fetchDutyAttendanceData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPeriod = (period) => {
    setFilterAttPeriod(period);
    const now = new Date();
    if (period === "all") {
      setFilterAttDate("");
      setFilterAttEndDate("");
    } else if (period === "today") {
      setFilterAttDate(today);
      setFilterAttEndDate(today);
    } else if (period === "week") {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(new Date().setDate(diffToMon));
      const sun = new Date(new Date().setDate(diffToMon + 6));
      setFilterAttDate(mon.toISOString().split("T")[0]);
      setFilterAttEndDate(sun.toISOString().split("T")[0]);
    } else if (period === "month") {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstD = new Date(y, m, 1);
      const lastD = new Date(y, m + 1, 0);
      setFilterAttDate(firstD.toISOString().split("T")[0]);
      setFilterAttEndDate(lastD.toISOString().split("T")[0]);
    }
    setCurrentAttPage(1);
  };

  const handleOpenEditAttendance = (rec) => {
    setEditAttModal(rec);
    setEditAttTeacher(rec.teacher_name);
    setEditAttLocation(rec.location);
    setEditAttTimeSlot(rec.time_slot);
    setEditAttCategory(rec.duty_category || "");
    setEditAttDate(rec.date);
    setEditAttScheduled(rec.is_scheduled_duty);
    setEditAttStatus(
      rec.status === "Tidak Duty" ? "Tidak Duty" :
      rec.status === "Lagi Duty" ? "Lagi Duty" : "Sudah Duty"
    );
    setEditAttNotes(rec.notes || "");
  };

  const handleSaveEditAttendance = async (e) => {
    e.preventDefault();
    if (!editAttModal) return;
    setIsSubmitting(true);
    try {
      const payload = {
        teacher_name: editAttTeacher.trim(),
        location: editAttLocation.trim(),
        time_slot: editAttTimeSlot.trim(),
        duty_category: editAttCategory.trim() || null,
        date: editAttDate,
        is_scheduled_duty: editAttStatus !== "Tidak Duty",
        status: editAttStatus,
        status_label: editAttStatus,
        notes: editAttNotes.trim() || null,
      };
      const res = await apiFetch(`${baseUrl}/duty-attendance/records/${editAttModal.id_attendance}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to update attendance record");
      }
      setPopupData({ title: "Attendance Record Updated Successfully!" });
      setEditAttModal(null);
      fetchDutyAttendanceData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportAttendanceExcel = async () => {
    if (isExportingExcel) return;
    setIsExportingExcel(true);
    try {
      const params = new URLSearchParams();
      if (filterAttDate && filterAttEndDate) {
        params.append("start_date", filterAttDate);
        params.append("end_date", filterAttEndDate);
      } else if (filterAttDate) {
        params.append("tanggal", filterAttDate);
      }
      if (filterAttLoc) params.append("location", filterAttLoc);
      if (searchAttTeacher) params.append("teacher_name", searchAttTeacher);
      if (filterAttStatus && filterAttStatus !== "all") {
        params.append("status_duty", filterAttStatus);
      }

      const res = await fetch(`${baseUrl}/duty-attendance/export-excel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tokenJWT}` },
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to export Excel report");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Duty_Attendance_Report_${filterAttDate || "All"}_${filterAttEndDate || "Dates"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export Excel Error: " + err.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleFetchInvalFreeTeachers = async (dateVal, timeVal) => {
    const targetDate = dateVal || newInvalDate;
    const targetTime = timeVal || newInvalTime;
    if (!targetDate || !targetTime) return;
    setIsLoadingInvalFreeTeachers(true);
    try {
      const res = await apiFetch(
        `${baseUrl}/duty-attendance/free-teachers?date=${targetDate}&time_slot=${encodeURIComponent(targetTime)}`,
        { headers: { Authorization: `Bearer ${tokenJWT}` } }
      );
      if (res.ok) {
        setInvalFreeTeachers(await res.json());
      }
    } catch (e) {
      console.error("Failed to load free teachers for inval", e);
    } finally {
      setIsLoadingInvalFreeTeachers(false);
    }
  };

  const handleDeleteAttendanceRecord = async (id_attendance) => {
    if (!window.confirm("Are you sure you want to delete this attendance record? This action cannot be undone.")) return;
    try {
      const res = await apiFetch(`${baseUrl}/duty-attendance/records/${id_attendance}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenJWT}` },
      });
      if (!res.ok) throw new Error("Failed to delete attendance record");
      setPopupData({ title: "Attendance Record Deleted Successfully!" });
      fetchDutyAttendanceData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAdminSeedDummy = async () => {
    setIsSeedingAttDummy(true);
    try {
      const res = await apiFetch(`${baseUrl}/duty-attendance/seed-dummy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenJWT}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to seed dummy data");
      setPopupData({ title: "Data Dummy Absensi Berhasil Dibuat!" });
      setFilterAttDate(data.date);
      fetchDutyAttendanceData();
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSeedingAttDummy(false);
    }
  };

  const handleExportAttendanceCSV = () => {
    if (!dutyAttendanceRecords.length) {
      alert("Tidak ada data absensi untuk diekspor!");
      return;
    }
    const headers = [
      "ID",
      "Tanggal",
      "Jam Absen",
      "Teacher Name",
      "Tempat/Lokasi",
      "Time Slot",
      "Kategori",
      "Status Jadwal",
      "Password",
      "Notes",
    ];
    const rows = dutyAttendanceRecords.map((r) => [
      r.id_attendance,
      r.date,
      new Date(r.check_in_time).toLocaleTimeString("id-ID"),
      `"${r.teacher_name.replace(/"/g, '""')}"`,
      `"${r.location.replace(/"/g, '""')}"`,
      `"${r.time_slot}"`,
      `"${r.duty_category || ""}"`,
      r.is_scheduled_duty ? "Terjadwal Duty" : "Bukan Jadwal Duty / Pengganti",
      r.verified_code,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Rekap_Absensi_Duty_${filterAttDate || "All"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // 9. MENU SIDEBAR
  // ==========================================
  const menuItems = [
    {
      id: "Announcements",
      label: "Announcements",
      icon: "📝",
      allowed: ["Normal", "Super"],
    },
    { id: "Birthday List", label: "Birthdays", icon: "🎂", allowed: ["Super"] },
    {
      id: "Teacher Schedules",
      label: "Teacher Schedules",
      icon: "📅",
      allowed: ["Super"],
    },
    {
      id: "Duty Schedules",
      label: "Duty Schedules",
      icon: "🛡️",
      allowed: ["Super"],
    },
    {
      id: "Inval Duties",
      label: "Available Teachers (Guru Kosong)",
      icon: "👥",
      allowed: ["Normal", "Super"],
    },
    {
      id: "Duty Attendance",
      label: "Duty Attendance",
      icon: "📋",
      allowed: ["Normal", "Super"],
    },
    {
      id: "Event Schedules",
      label: "Event Schedules",
      icon: "⭐",
      allowed: ["Normal", "Super"],
    },
    {
      id: "Manage Teachers",
      label: "Teacher Codes & PIN",
      icon: "??",
      allowed: ["Super"],
    },
    {
      id: "Manage Admin",
      label: "Manage Admin",
      icon: "👥",
      allowed: ["Super"],
    },
    {
      id: "logout_admin",
      label: "Logout",
      icon: "🚪",
      allowed: ["Normal", "Super"],
    },
  ];
  const visibleMenu = menuItems.filter((item) => item.allowed.includes(role));

  // ==========================================
  // 10. FUNGSI UPDATE DATA (PUT)
  // ==========================================
  const handleEditClick = (item) => {
    setEditModalData(item.id_announcement);
    setEditAnnDate(item.date);
    setEditAnnEndDate(item.end_date || "");
    setEditAnnouncementText(item.announcement);
    setEditAnnImage(item.url_image); // URL string dari backend
    setEditAnnUrl(item.url_announcemet);
    setEditAnnIsPinned(Boolean(item.is_pinned));
  };

  const handleUpdateAnnouncement = async () => {
    if (!editAnnDate || !editAnnouncementText.trim())
      return alert("Please fill out the form completely!");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("tanggal_masuk", editAnnDate);
      if (editAnnEndDate) formData.append("end_date", editAnnEndDate);
      formData.append("announcement", editAnnouncementText);
      formData.append("admin_update", id_admin);
      formData.append("is_pinned", editAnnIsPinned);
      if (editAnnUrl) formData.append("url_announcemet", editAnnUrl);

      // Kirim image hanya jika user benar-benar memilih file baru (tipe Object/File)
      if (editAnnImage && typeof editAnnImage !== "string") {
        formData.append("image", editAnnImage);
      }

      const res = await apiFetch(`${baseUrl}/announcements/${editModalData}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenJWT}` }, // Tanpa Content-Type
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to update announcement");

      await fetchSemuaData();
      setPopupData({ title: "Announcement Updated!" });
      setEditModalData(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (id_announcement) => {
    try {
      const res = await apiFetch(
        `${baseUrl}/announcements/${id_announcement}/toggle-pin`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${tokenJWT}` },
        }
      );
      if (!res.ok) throw new Error("Failed to change pin status");
      await fetchSemuaData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditClickBirth = (item) => {
    setEditModalBirth(item.id_birthday);
    seteditBirthName(item.name);
    setBirtGender(item.gender);
    settBirtDat(item.date);
  };

  const handleUpdateBirth = async () => {
    if (!editBirthName || !editBirtGender)
      return alert("Please fill out the form completely!");
    setIsSubmitting(true);

    try {
      const payload = {
        name: editBirthName,
        date: editBirtDate,
        gender: editBirtGender,
      };

      const res = await apiFetch(`${baseUrl}/birthdays/${editModalBirth}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update birthday");

      await fetchSemuaData();
      setPopupData({ title: "Birthday List Updated!" });
      setEditModalBirth(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAdmin = (item) => {
    seteditModalAdm(item.id_admin);
    setNewAdminNameUpdate(item.name_admin);
    setNewAdminPasswordUpdate(""); // Kosongkan demi keamanan, ubah jika user mau
    setNewAdminLevelUpdate(item.level_admin);
  };

  const handleupdateAdmin = async () => {
    if (!newAdminNameUpdate || !newAdminLevelUpdate)
      return alert("Please fill out the form completely!");
    setIsSubmitting(true);

    try {
      const payload = {
        name_admin: newAdminNameUpdate,
        level_admin: newAdminLevelUpdate,
      };

      // Hanya kirim password ke backend jika admin mengisi kolom password (ingin diganti)
      if (newAdminPasswordUpdate) {
        payload.password_admin = newAdminPasswordUpdate;
      }

      const res = await apiFetch(`${baseUrl}/admin/${editModalAdm}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update admin list");

      await fetchSemuaData();
      setPopupData({ title: "List Admin sudah dirubah" });
      seteditModalAdm(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 11. FUNGSI DELETE KE API
  // ==========================================
  const handleDelete = async (id_announcement) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this announcement? This action cannot be undone.",
    );
    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`${baseUrl}/announcements/${id_announcement}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) throw new Error("Failed to delete announcement data");

      await fetchSemuaData();
      setPopupData({ title: "Announcement Deleted Successfully!" });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteBirh = async (id_birthday) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this birthday record? This action cannot be undone.",
    );
    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`${baseUrl}/birthdays/${id_birthday}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) throw new Error("Failed to delete birthday data");

      await fetchSemuaData();
      setPopupData({ title: "Birthday Record Deleted Successfully!" });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteAdmin = async (id_admin) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this admin account? This action cannot be undone.",
    );
    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`${baseUrl}/admin/${id_admin}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) throw new Error("Failed to delete data admin");

      await fetchSemuaData();
      setPopupData({ title: "Admin Deleted!" });
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans overflow-hidden">
      {/* ======================= MODALS & POPUPS ======================= */}
      {popupData && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-green-100">
              ✓
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {popupData.title}
            </h3>
            <button
              onClick={() => setPopupData(null)}
              className="w-full bg-[#1e3a8a] hover:bg-blue-800 text-white font-bold py-3.5 rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Edit Announcement */}
      {editModalData !== null && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#1e3a8a]"></div>

            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                ✏️ Edit Announcement
              </h3>
              <button
                onClick={() => setEditModalData(null)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 pl-2 max-h-[70vh] overflow-y-auto pr-2">
              {/* Input Tanggal */}
              {/* Input Tanggal Mulai & Tanggal Selesai */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editAnnDate}
                    onChange={(e) => setEditAnnDate(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50 transition-all font-medium text-slate-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    End Date (Opt)
                  </label>
                  <input
                    type="date"
                    value={editAnnEndDate}
                    min={editAnnDate}
                    onChange={(e) => setEditAnnEndDate(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50 transition-all font-medium text-slate-700 text-sm"
                  />
                </div>
              </div>

              {/* Input Link/URL */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Link URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editAnnUrl || ""}
                  onChange={(e) => setEditAnnUrl(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50 transition-all font-medium text-slate-700 text-sm"
                />
              </div>

              {/* Teks Pengumuman */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Details
                </label>
                <textarea
                  value={editAnnouncementText}
                  onChange={(e) => setEditAnnouncementText(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50 min-h-[100px] resize-y transition-all font-medium text-slate-700 text-sm"
                  placeholder="Update event details..."
                ></textarea>
              </div>

              {/* Ganti Gambar */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Change Image (Optional)
                </label>
                {editAnnImage != null ? (
                  <div className="mb-2">
                    <span className="text-[10px] text-slate-400">
                      Current Image:
                    </span>
                    <img
                      src={
                        typeof editAnnImage === "string"
                          ? `${new URL(import.meta.env.VITE_API_BASE_URL).origin}${editAnnImage}`
                          : URL.createObjectURL(editAnnImage)
                      }
                      alt="current"
                      className="h-16 w-16 object-cover rounded-lg border mt-1"
                    />
                  </div>
                ) : (
                  <div className="mb-2">
                    <p className="text-[10px] text-slate-400">NO IMAGE </p>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditAnnImage(e.target.files[0])}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-slate-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  Kosongkan jika tidak ingin mengubah gambar.
                </p>
              </div>

              {/* Checkbox Sematkan (Pin) */}
              <div className="flex items-center gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <input
                  type="checkbox"
                  id="editAnnIsPinned"
                  checked={editAnnIsPinned}
                  onChange={(e) => setEditAnnIsPinned(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
                <label
                  htmlFor="editAnnIsPinned"
                  className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                >
                  📌 Sematkan Pengumuman Ini di Paling Atas (Sticky Pin)
                </label>
              </div>

              {/* Tombol Action */}
              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setEditModalData(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl hover:bg-slate-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAnnouncement}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-2xl hover:bg-blue-800 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400 text-sm"
                >
                  {isSubmitting ? "Menyimpan..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Birthday */}
      {editModalBirth !== null && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-pink-500"></div>
            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                🎁 Edit Birthday
              </h3>
              <button
                onClick={() => setEditModalBirth(null)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <form
              className="space-y-5 pl-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Student or Teacher Name..."
                  required
                  value={editBirthName}
                  onChange={(e) => seteditBirthName(e.target.value)}
                  className="w-full border border-slate-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500 bg-slate-50 transition-all font-medium text-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editBirtDate}
                    onChange={(e) => settBirtDat(e.target.value)}
                    className="w-full border border-slate-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500 bg-slate-50 transition-all font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                    Gender
                  </label>
                  <div className="flex gap-2">
                    <label
                      className={`flex-1 flex items-center justify-center border rounded-2xl cursor-pointer py-3.5 transition-all ${editBirtGender === "Male" ? "bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500"}`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value="Male"
                        onChange={(e) => setBirtGender(e.target.value)}
                        className="hidden"
                      />
                      👨 L
                    </label>
                    <label
                      className={`flex-1 flex items-center justify-center border rounded-2xl cursor-pointer py-3.5 transition-all ${editBirtGender === "Female" ? "bg-pink-50 border-pink-500 text-pink-700 font-bold shadow-sm" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500"}`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value="Female"
                        onChange={(e) => setBirtGender(e.target.value)}
                        className="hidden"
                      />
                      👩 P
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditModalBirth(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBirth}
                  disabled={isSubmitting}
                  className="flex-1 bg-pink-500 text-white font-bold py-3.5 rounded-2xl hover:bg-pink-600 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Admin */}
      {editModalAdm !== null && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                👥 Edit Admin
              </h3>
              <button
                onClick={() => seteditModalAdm(null)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <form
              className="space-y-5 pl-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Admin Name
                </label>
                <input
                  type="text"
                  placeholder="Teacher Name..."
                  required
                  value={newAdminNameUpdate}
                  onChange={(e) => setNewAdminNameUpdate(e.target.value)}
                  className="w-full border border-slate-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 transition-all font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Password (Kosongkan jika tidak diganti)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password..."
                    value={newAdminPasswordUpdate}
                    onChange={(e) => setNewAdminPasswordUpdate(e.target.value)}
                    className="w-full border border-slate-200 p-3.5 pr-12 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 transition-all font-medium text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Access Level
                </label>
                <div className="flex gap-4">
                  <label
                    className={`flex-1 flex items-center justify-center py-3.5 rounded-2xl border text-sm font-bold cursor-pointer transition-all ${newAdminLevelUpdate === "Super" ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500"}`}
                  >
                    <input
                      type="radio"
                      name="adminLevelEdit"
                      value="Super"
                      onChange={(e) => setNewAdminLevelUpdate(e.target.value)}
                      className="hidden"
                    />
                    Super Admin
                  </label>
                  <label
                    className={`flex-1 flex items-center justify-center py-3.5 rounded-2xl border text-sm font-bold cursor-pointer transition-all ${newAdminLevelUpdate === "Normal" ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500"}`}
                  >
                    <input
                      type="radio"
                      name="adminLevelEdit"
                      value="Normal"
                      onChange={(e) => setNewAdminLevelUpdate(e.target.value)}
                      className="hidden"
                    />
                    Normal Admin
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => seteditModalAdm(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleupdateAdmin}
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-2xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Create Teacher Schedule */}
      {isCreateScheduleOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                📅 Add Schedule Guru
              </h3>
              <button
                onClick={() => setIsCreateScheduleOpen(false)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <form className="space-y-4 pl-2" onSubmit={handlePostSchedule}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Teacher Name
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Mr. Kornelius"
                    required
                    value={newSchedTeacher}
                    onChange={(e) => setNewSchedTeacher(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Subject / Grade
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: IT Grade 3-4"
                    required
                    value={newSchedSubject}
                    onChange={(e) => setNewSchedSubject(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Hari
                  </label>
                  <select
                    value={newSchedDay}
                    onChange={(e) => setNewSchedDay(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="Monday">Monday (Monday)</option>
                    <option value="Tuesday">Tuesday (Tuesday)</option>
                    <option value="Wednesday">Wednesday (Wednesday)</option>
                    <option value="Thursday">Thursday (Thursday)</option>
                    <option value="Friday">Friday (Friday)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Waktu / Jam Pelajaran
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 08.00 - 09.10"
                    required
                    value={newSchedTime}
                    onChange={(e) => setNewSchedTime(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Class / Grade / Sesi
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 3A, Break, PC Session"
                    required
                    value={newSchedClass}
                    onChange={(e) => setNewSchedClass(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Notes / Time Block (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Time 1 / Time 2"
                    value={newSchedNote}
                    onChange={(e) => setNewSchedNote(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateScheduleOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-2xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Teacher Schedule */}
      {editSchedModal !== null && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                ✏️ Edit Jadwal Guru
              </h3>
              <button
                onClick={() => setEditSchedModal(null)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <form className="space-y-4 pl-2" onSubmit={handleUpdateSchedule}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Teacher Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editSchedTeacher}
                    onChange={(e) => setEditSchedTeacher(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Subject / Grade
                  </label>
                  <input
                    type="text"
                    required
                    value={editSchedSubject}
                    onChange={(e) => setEditSchedSubject(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Hari
                  </label>
                  <select
                    value={editSchedDay}
                    onChange={(e) => setEditSchedDay(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="Monday">Monday (Monday)</option>
                    <option value="Tuesday">Tuesday (Tuesday)</option>
                    <option value="Wednesday">Wednesday (Wednesday)</option>
                    <option value="Thursday">Thursday (Thursday)</option>
                    <option value="Friday">Friday (Friday)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Waktu / Jam Pelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={editSchedTime}
                    onChange={(e) => setEditSchedTime(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Class / Grade / Sesi
                  </label>
                  <input
                    type="text"
                    required
                    value={editSchedClass}
                    onChange={(e) => setEditSchedClass(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Notes / Time Block (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editSchedNote}
                    onChange={(e) => setEditSchedNote(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditSchedModal(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Create Teacher Duty */}
      {isCreateDutyOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600"></div>
            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                🛡️ Add Schedule Duty / Piket
              </h3>
              <button
                onClick={() => setIsCreateDutyOpen(false)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <form className="space-y-4 pl-2" onSubmit={handlePostDuty}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Teacher Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ms. Jenny P"
                    value={newDutyTeacher}
                    onChange={(e) => setNewDutyTeacher(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Lokasi Duty
                  </label>
                  <select
                    value={newDutyLocation}
                    onChange={(e) => setNewDutyLocation(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="ESE Backyard">ESE Backyard</option>
                    <option value="Canteen">Canteen</option>
                    <option value="2nd floor lobby">2nd floor lobby</option>
                    <option value="3rd floor lobby">3rd floor lobby</option>
                    <option value="4th floor lobby">4th floor lobby</option>
                    <option value="Announcer (front gate)">Announcer (front gate)</option>
                    <option value="Announcer (back gate)">Announcer (back gate)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Kategori Sesi
                  </label>
                  <select
                    value={newDutyCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewDutyCategory(val);
                      if (val.includes("Grade 1-2")) setNewDutyGradeScope("Grade 1-2");
                      else if (val.includes("Grade 3-4")) setNewDutyGradeScope("Grade 3-4");
                      else if (val.includes("Grade 5-6")) setNewDutyGradeScope("Grade 5-6");
                      else setNewDutyGradeScope("All Grades (Schoolwide)");
                    }}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="Morning Duty">Morning Duty</option>
                    <option value="Break 1 (Grade 1-2)">Break 1 (Grade 1-2)</option>
                    <option value="Break 1 (Grade 3-4)">Break 1 (Grade 3-4)</option>
                    <option value="Break 1 (Grade 5-6)">Break 1 (Grade 5-6)</option>
                    <option value="Break 2 (Grade 1-2)">Break 2 (Grade 1-2)</option>
                    <option value="Break 2 (Grade 3-4)">Break 2 (Grade 3-4)</option>
                    <option value="Break 2 (Grade 5-6)">Break 2 (Grade 5-6)</option>
                    <option value="Go Home (Grade 1-2)">Go Home (Grade 1-2)</option>
                    <option value="Go Home (Grade 3-4)">Go Home (Grade 3-4)</option>
                    <option value="Go Home (Grade 5-6)">Go Home (Grade 5-6)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Grade Scope
                  </label>
                  <input
                    type="text"
                    required
                    value={newDutyGradeScope}
                    onChange={(e) => setNewDutyGradeScope(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Hari
                  </label>
                  <select
                    value={newDutyDay}
                    onChange={(e) => setNewDutyDay(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="Monday">Monday (Monday)</option>
                    <option value="Tuesday">Tuesday (Tuesday)</option>
                    <option value="Wednesday">Wednesday (Wednesday)</option>
                    <option value="Thursday">Thursday (Thursday)</option>
                    <option value="Friday">Friday (Friday)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Waktu / Jam Sesi
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 09.10-09.35"
                    value={newDutyTime}
                    onChange={(e) => setNewDutyTime(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Tugas / Instruksi Jaga (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: supervise students, remind them to play safely"
                  value={newDutyTask}
                  onChange={(e) => setNewDutyTask(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-medium text-slate-700"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateDutyOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-2xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Duty Baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Teacher Duty */}
      {editDutyModal !== null && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600"></div>
            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                ✏️ Edit Jadwal Duty / Piket
              </h3>
              <button
                onClick={() => setEditDutyModal(null)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <form className="space-y-4 pl-2" onSubmit={handleUpdateDuty}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Teacher Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editDutyTeacher}
                    onChange={(e) => setEditDutyTeacher(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Lokasi Duty
                  </label>
                  <select
                    value={editDutyLocation}
                    onChange={(e) => setEditDutyLocation(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="ESE Backyard">ESE Backyard</option>
                    <option value="Canteen">Canteen</option>
                    <option value="2nd floor lobby">2nd floor lobby</option>
                    <option value="3rd floor lobby">3rd floor lobby</option>
                    <option value="4th floor lobby">4th floor lobby</option>
                    <option value="Announcer (front gate)">Announcer (front gate)</option>
                    <option value="Announcer (back gate)">Announcer (back gate)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Kategori Sesi
                  </label>
                  <select
                    value={editDutyCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditDutyCategory(val);
                      if (val.includes("Grade 1-2")) setEditDutyGradeScope("Grade 1-2");
                      else if (val.includes("Grade 3-4")) setEditDutyGradeScope("Grade 3-4");
                      else if (val.includes("Grade 5-6")) setEditDutyGradeScope("Grade 5-6");
                      else setEditDutyGradeScope("All Grades (Schoolwide)");
                    }}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="Morning Duty">Morning Duty</option>
                    <option value="Break 1 (Grade 1-2)">Break 1 (Grade 1-2)</option>
                    <option value="Break 1 (Grade 3-4)">Break 1 (Grade 3-4)</option>
                    <option value="Break 1 (Grade 5-6)">Break 1 (Grade 5-6)</option>
                    <option value="Break 2 (Grade 1-2)">Break 2 (Grade 1-2)</option>
                    <option value="Break 2 (Grade 3-4)">Break 2 (Grade 3-4)</option>
                    <option value="Break 2 (Grade 5-6)">Break 2 (Grade 5-6)</option>
                    <option value="Go Home (Grade 1-2)">Go Home (Grade 1-2)</option>
                    <option value="Go Home (Grade 3-4)">Go Home (Grade 3-4)</option>
                    <option value="Go Home (Grade 5-6)">Go Home (Grade 5-6)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Grade Scope
                  </label>
                  <input
                    type="text"
                    required
                    value={editDutyGradeScope}
                    onChange={(e) => setEditDutyGradeScope(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Hari
                  </label>
                  <select
                    value={editDutyDay}
                    onChange={(e) => setEditDutyDay(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="Monday">Monday (Monday)</option>
                    <option value="Tuesday">Tuesday (Tuesday)</option>
                    <option value="Wednesday">Wednesday (Wednesday)</option>
                    <option value="Thursday">Thursday (Thursday)</option>
                    <option value="Friday">Friday (Friday)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Waktu / Jam Sesi
                  </label>
                  <input
                    type="text"
                    required
                    value={editDutyTime}
                    onChange={(e) => setEditDutyTime(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Tugas / Instruksi Jaga (Opsional)
                </label>
                <input
                  type="text"
                  value={editDutyTask}
                  onChange={(e) => setEditDutyTask(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm font-medium text-slate-700"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditDutyModal(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-2xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Create Inval Duty */}
      {isCreateInvalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                🔄 Tambah Inval Duty (Pergantian Sementara)
              </h3>
              <button
                onClick={() => setIsCreateInvalOpen(false)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 pl-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Tanggal Tugas Inval *
                </label>
                <input
                  type="date"
                  required
                  value={newInvalDate}
                  onChange={(e) => setNewInvalDate(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Guru Asli *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama guru yang digantikan"
                    value={newInvalOriginalTeacher}
                    onChange={(e) => setNewInvalOriginalTeacher(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Guru Pengganti (Inval) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama guru pengganti"
                    value={newInvalSubstituteTeacher}
                    onChange={(e) => setNewInvalSubstituteTeacher(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Lokasi Piket *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: ESE Backyard / Canteen"
                    value={newInvalLocation}
                    onChange={(e) => setNewInvalLocation(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Waktu / Jam Sesi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: 07.15-07.45"
                    value={newInvalTime}
                    onChange={(e) => setNewInvalTime(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Alasan Inval (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Sakit, Dinas luar, Izin"
                  value={newInvalReason}
                  onChange={(e) => setNewInvalReason(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Notes Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Notes khusus untuk tugas ini"
                  value={newInvalNote}
                  onChange={(e) => setNewInvalNote(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium text-slate-700"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateInvalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePostInval}
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Inval"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create Event Schedule */}
      {isCreateEventOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                ⭐ Buat Jadwal Event Khusus
              </h3>
              <button
                onClick={() => setIsCreateEventOpen(false)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 pl-2 max-h-[75vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Nama Event / Acara *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Assembly Paskah, Retreat Grade 6, PTS Genap"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Target Scope / Tingkat *
                  </label>
                  <select
                    value={newEventScope}
                    onChange={(e) => setNewEventScope(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="Schoolwide">Schoolwide (Seluruh Sekolah)</option>
                    <option value="Grade 1-3">Grade 1-3 (Lower Primary)</option>
                    <option value="Grade 4-6">Grade 4-6 (Upper Primary)</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Waktu / Jam (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: 08.00 - 11.00"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Tanggal Mulai *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={newEventEndDate}
                    min={newEventDate}
                    onChange={(e) => setNewEventEndDate(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Deskripsi / Keterangan Acara *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Jelaskan agenda acara dan apa yang perlu diketahui guru/murid..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700 resize-y"
                ></textarea>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                <input
                  type="checkbox"
                  id="createAffectsKbm"
                  checked={newEventAffectsKbm}
                  onChange={(e) => setNewEventAffectsKbm(e.target.checked)}
                  className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                />
                <label
                  htmlFor="createAffectsKbm"
                  className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                >
                  Event ini mengubah/menyesuaikan jadwal KBM normal
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateEventOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePostEvent}
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-500 text-white font-bold py-3.5 rounded-2xl hover:bg-amber-600 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Event Schedule */}
      {editEventModal !== null && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
            <div className="flex justify-between items-center mb-6 pl-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                ✏️ Edit Jadwal Event Khusus
              </h3>
              <button
                onClick={() => setEditEventModal(null)}
                className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 pl-2 max-h-[75vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Nama Event / Acara *
                </label>
                <input
                  type="text"
                  required
                  value={editEventName}
                  onChange={(e) => setEditEventName(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Target Scope / Tingkat *
                  </label>
                  <select
                    value={editEventScope}
                    onChange={(e) => setEditEventScope(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-semibold text-slate-700"
                  >
                    <option value="Schoolwide">Schoolwide (Seluruh Sekolah)</option>
                    <option value="Grade 1-3">Grade 1-3 (Lower Primary)</option>
                    <option value="Grade 4-6">Grade 4-6 (Upper Primary)</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Waktu / Jam (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: 08.00 - 11.00"
                    value={editEventTime}
                    onChange={(e) => setEditEventTime(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Tanggal Mulai *
                  </label>
                  <input
                    type="date"
                    required
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={editEventEndDate}
                    min={editEventDate}
                    onChange={(e) => setEditEventEndDate(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Deskripsi / Keterangan Acara *
                </label>
                <textarea
                  rows="3"
                  required
                  value={editEventDesc}
                  onChange={(e) => setEditEventDesc(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium text-slate-700 resize-y"
                ></textarea>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                <input
                  type="checkbox"
                  id="editAffectsKbm"
                  checked={editEventAffectsKbm}
                  onChange={(e) => setEditEventAffectsKbm(e.target.checked)}
                  className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                />
                <label
                  htmlFor="editAffectsKbm"
                  className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                >
                  Event ini mengubah/menyesuaikan jadwal KBM normal
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditEventModal(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateEvent}
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-500 text-white font-bold py-3.5 rounded-2xl hover:bg-amber-600 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= SIDEBAR ======================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-[#1e3a8a] to-[#152865] text-white flex flex-col shadow-2xl transition-all duration-300 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-8 text-center pt-10 border-b border-white/10">
          <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-inner">
            👨‍💼
          </div>
          <h1 className="text-xl font-bold tracking-tight truncate">
            {username}
          </h1>
          <p className="text-[10px] font-black mt-2 py-1.5 px-4 bg-amber-400 text-blue-900 rounded-full inline-block uppercase tracking-widest shadow-sm">
            {role} ADMIN
          </p>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {visibleMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "logout_admin") handleLogout();
                else {
                  setActiveTab(item.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-semibold ${
                activeTab === item.id
                  ? "bg-white text-[#1e3a8a] shadow-lg shadow-blue-900/30 translate-x-2"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-xl">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ======================= MAIN CONTENT ======================= */}
      <main
        className={`flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 ${isSidebarOpen ? "md:ml-72" : "ml-0"}`}
      >
        {/* HEADER */}
        <header className="bg-white/80 backdrop-blur-md px-8 py-5 flex justify-between items-center z-10 border-b border-slate-200 sticky top-0">
          <div className="flex items-center gap-5">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-slate-500 transition-colors shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
                />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {activeTab}
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-4 bg-slate-50 p-1.5 pl-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Dashboard View
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
            />
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* ========================================================= */}
            {/* VISITOR METRICS / ANALYTICS (ADMIN ONLY) */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-900 to-indigo-950 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-950/20 relative overflow-hidden flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-blue-300">
                    Total Visitors (Lifetime)
                  </span>
                  <h3 className="text-3xl font-black tracking-tight">
                    {visitorStats.total_visits}{" "}
                    <span className="text-sm font-semibold text-blue-200">
                      visits
                    </span>
                  </h3>
                  <p className="text-xs text-blue-300/80">
                    Unique daily visitors counted
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl backdrop-blur-sm border border-white/10">
                  👥
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                    Today's Visitors
                  </span>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                    {visitorStats.today_visits}{" "}
                    <span className="text-sm font-semibold text-slate-500">
                      visits
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Active visitors today
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl border border-emerald-100">
                  📊
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Last 7 Days Trend
                  </span>
                  <span className="text-xs font-bold text-blue-600">Weekly</span>
                </div>
                <div className="flex items-end justify-between gap-1.5 h-12 pt-2">
                  {visitorStats.weekly_stats &&
                  visitorStats.weekly_stats.length > 0 ? (
                    visitorStats.weekly_stats.map((stat, idx) => {
                      const counts = visitorStats.weekly_stats.map(
                        (s) => s.count,
                      );
                      const maxVal = Math.max(...counts, 1);
                      const heightPct = Math.max(
                        (stat.count / maxVal) * 100,
                        15,
                      );
                      const dayLabel = stat.date ? stat.date.substring(8) : "";
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                            title={`${stat.date}: ${stat.count} visits`}
                          />
                          <span className="text-[9px] font-bold text-slate-400">
                            {dayLabel}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      No data available mingguan
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* TAB: ANNOUNCEMENTS */}
            {/* ========================================================= */}
            {activeTab === "Announcements" && (
              <div className="space-y-8">
                {/* CREATE CARD */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-[#1e3a8a]"></div>
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <span className="bg-blue-50 text-blue-600 p-2 rounded-xl text-sm">
                      📝
                    </span>{" "}
                    New Announcement
                  </h3>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* BARIS 1: Tanggal Mulai, Tanggal Selesai, URL */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Start Date / Tanggal Mulai *
                      </label>
                      <input
                        type="date"
                        value={newAnnDate}
                        onChange={(e) => setNewAnnDate(e.target.value)}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all font-medium text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        End Date / Selesai (Opsional)
                      </label>
                      <input
                        type="date"
                        value={newAnnEndDate}
                        min={newAnnDate}
                        onChange={(e) => setNewAnnEndDate(e.target.value)}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all font-medium text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Attach URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newAnnUrl}
                        onChange={(e) => setNewAnnUrl(e.target.value)}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all font-medium text-slate-700"
                      />
                    </div>

                    {/* BARIS 2: Kotak Konten Pengumuman (Lebih Besar) */}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Announcement Content
                      </label>
                      <textarea
                        rows="4"
                        placeholder="Write the announcement details here..."
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all font-medium text-slate-700 resize-y"
                      ></textarea>
                    </div>

                    {/* BARIS 3: Upload Foto & Tombol Submit */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Upload Image (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewAnnImage(e.target.files[0])}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-slate-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl md:col-span-2">
                      <input
                        type="checkbox"
                        id="newAnnIsPinned"
                        checked={newAnnIsPinned}
                        onChange={(e) => setNewAnnIsPinned(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <label
                        htmlFor="newAnnIsPinned"
                        className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                      >
                        📌 Sematkan Pengumuman Ini di Paling Atas (Sticky Pin)
                      </label>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={handlePostAnnouncement}
                        disabled={isSubmitting}
                        className="w-full bg-[#1e3a8a] text-white py-3.5 rounded-2xl font-bold hover:shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
                      >
                        Publish Event
                      </button>
                    </div>
                  </div>
                </div>

                {/* TABLE CARD */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="text-xl">📋</span> History Log
                    </h3>
                    {/* CONTAINER UNTUK FILTER TANGGAL & SEARCH */}
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                      <input
                        type="date"
                        value={filterAnnDate}
                        onChange={(e) => setFilterAnnDate(e.target.value)}
                        className="w-full md:w-auto px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#1e3a8a] outline-none shadow-sm transition-all text-slate-600"
                      />
                      <div className="relative w-full md:w-80">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          🔍
                        </span>
                        <input
                          type="text"
                          placeholder="Search dates or names..."
                          value={searchAnnouncements}
                          onChange={(e) =>
                            setSearchAnnouncements(e.target.value)
                          }
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#1e3a8a] outline-none shadow-sm transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Image</th>
                          <th className="px-8 py-5">Announcement</th>
                          <th className="px-8 py-5">Link</th>
                          <th className="px-8 py-5">Author</th>
                          <th className="px-8 py-5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {currentAnnData.length > 0 ? (
                          currentAnnData.map((item) => (
                            <tr
                              key={item.id_announcement}
                              className="hover:bg-slate-50/80 transition-colors group"
                            >
                              <td className="px-8 py-5 font-bold text-slate-700 whitespace-nowrap">
                                {item.is_pinned && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md uppercase tracking-wider mb-1 block w-fit">
                                    📌 Pinned
                                  </span>
                                )}
                                {item.end_date && item.end_date !== item.date ? (
                                  <div>
                                    <span className="text-[#1e3a8a]">{item.date}</span>
                                    <span className="text-[10px] text-slate-400 block font-semibold">s/d</span>
                                    <span className="text-indigo-700">{item.end_date}</span>
                                  </div>
                                ) : (
                                  item.date
                                )}
                              </td>

                              <td className="px-8 py-5">
                                {item.url_image ? (
                                  <img
                                    src={`${new URL(import.meta.env.VITE_API_BASE_URL).origin}${item.url_image}`}
                                    alt="Announcement Thumbnail"
                                    className="w-20 h-20 object-cover rounded-lg border border-slate-200 shadow-sm"
                                  />
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic bg-slate-100 px-3 py-1 rounded-md">
                                    No Image
                                  </span>
                                )}
                              </td>

                              <td className="px-8 py-5 text-slate-600 font-medium">
                                {item.announcement}
                              </td>

                              <td className="px-8 py-5">
                                {item.url_announcemet ? (
                                  <a
                                    href={item.url_announcemet}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 rounded-full font-bold text-[10px] uppercase tracking-wide transition-colors"
                                  >
                                    Open Link
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic bg-slate-100 px-3 py-1 rounded-md">
                                    No Link
                                  </span>
                                )}
                              </td>

                              <td className="px-8 py-5">
                                <span className="px-3 py-1.5 bg-blue-50 text-[#1e3a8a] border border-blue-100 rounded-full font-bold text-[10px] uppercase tracking-wide">
                                  {item.admin_pembuat
                                    ? item.admin_pembuat.name_admin
                                    : "Unknown"}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex justify-center gap-2 opacity-100">
                                  <button
                                    onClick={() => handleTogglePin(item.id_announcement)}
                                    title={item.is_pinned ? "Unpin from Top" : "Pin to Top"}
                                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
                                      item.is_pinned
                                        ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                                        : "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                                    }`}
                                  >
                                    {item.is_pinned ? "📌 Unpin" : "📌 Pin"}
                                  </button>
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Edit Announcement"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDelete(item.id_announcement)
                                    }
                                    className="px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Delete Announcement"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="6"
                              className="p-12 text-center text-slate-400 font-medium italic"
                            >
                              No matching announcements found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalAnnPages > 1 && (
                    <div className="p-6 bg-white border-t border-slate-100 flex justify-center gap-2">
                      {[...Array(totalAnnPages)].map((_, index) => (
                        <button
                          key={index + 1}
                          onClick={() => setCurrentAnnPage(index + 1)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentAnnPage === index + 1 ? "bg-[#1e3a8a] text-white shadow-md shadow-blue-900/20" : "bg-white border border-slate-200 text-slate-500 hover:border-[#1e3a8a] hover:text-[#1e3a8a]"}`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: BIRTHDAY LIST */}
            {/* ========================================================= */}
            {activeTab === "Birthday List" && (
              <div className="space-y-8">
                {/* CREATE CARD */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-pink-500"></div>
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <span className="bg-pink-50 text-pink-600 p-2 rounded-xl text-sm">
                      🎁
                    </span>{" "}
                    Add New Birthday
                  </h3>
                  <form
                    onSubmit={handlePostBirthday}
                    className="grid md:grid-cols-4 gap-6 items-end"
                  >
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Student/Teacher Name
                      </label>
                      <input
                        type="text"
                        required
                        list="teacher-names"
                        value={newBdayName}
                        onChange={(e) => setNewBdayName(e.target.value)}
                        placeholder="Select or type name..."
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-slate-700"
                      />
                      <datalist id="teacher-names">
                        {teachersList.map((t) => (
                          <option key={t.id_teacher} value={t.full_name}>
                            {t.full_name} ({t.db_name})
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Birth Date
                      </label>
                      <input
                        type="date"
                        required
                        value={newBdayDate}
                        onChange={(e) => setNewBdayDate(e.target.value)}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Gender
                      </label>
                      <div className="flex gap-2">
                        <label
                          className={`flex-1 flex items-center justify-center border rounded-2xl cursor-pointer py-3.5 transition-all text-sm font-bold ${newBdayGender === "Male" ? "bg-blue-50 border-blue-500 text-blue-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500"}`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value="Male"
                            onChange={(e) => setNewBdayGender(e.target.value)}
                            className="hidden"
                          />
                          Male
                        </label>
                        <label
                          className={`flex-1 flex items-center justify-center border rounded-2xl cursor-pointer py-3.5 transition-all text-sm font-bold ${newBdayGender === "Female" ? "bg-pink-50 border-pink-500 text-pink-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500"}`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value="Female"
                            onChange={(e) => setNewBdayGender(e.target.value)}
                            className="hidden"
                          />
                          Female
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-[0.98] disabled:bg-slate-300"
                    >
                      Add Record
                    </button>
                  </form>
                </div>

                {/* TABLE CARD */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="text-xl">📇</span> Birthday Directory
                    </h3>
                    {/* CONTAINER UNTUK FILTER TANGGAL & SEARCH */}
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                      <input
                        type="date"
                        value={filterBdayDate}
                        onChange={(e) => setFilterBdayDate(e.target.value)}
                        className="w-full md:w-auto px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500 outline-none shadow-sm transition-all text-slate-600"
                      />
                      <div className="relative w-full md:w-80">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          🔍
                        </span>
                        <input
                          type="text"
                          placeholder="Search name or date..."
                          value={searchBirthdays}
                          onChange={(e) => setSearchBirthdays(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500 outline-none shadow-sm transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Name</th>
                          <th className="px-8 py-5 text-center">Gender</th>
                          <th className="px-8 py-5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {currentBdayData.length > 0 ? (
                          currentBdayData.map((item) => (
                            <tr
                              key={item.id_birthday}
                              className="hover:bg-slate-50/80 transition-colors group"
                            >
                              <td className="px-8 py-5 font-bold text-slate-700">
                                {item.date}
                              </td>
                              <td className="px-8 py-5 text-slate-800 font-bold">
                                {item.name}
                              </td>
                              <td className="px-8 py-5 text-center">
                                <span
                                  className={`inline-flex px-3 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${item.gender === "Male" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-pink-50 text-pink-700 border border-pink-100"}`}
                                >
                                  {item.gender}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex justify-center gap-2 opacity-100">
                                  <button
                                    onClick={() => handleEditClickBirth(item)}
                                    className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Edit Birthday Record"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteBirh(item.id_birthday)
                                    }
                                    className="px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Delete Birthday Record"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="4"
                              className="p-12 text-center text-slate-400 font-medium italic"
                            >
                              No birthdays found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalBdayPages > 1 && (
                    <div className="p-6 bg-white border-t border-slate-100 flex justify-center gap-2">
                      {[...Array(totalBdayPages)].map((_, index) => (
                        <button
                          key={index + 1}
                          onClick={() => setCurrentBdayPage(index + 1)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentBdayPage === index + 1 ? "bg-slate-800 text-white shadow-md" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-800 hover:text-slate-800"}`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: MANAGE ADMIN */}
            {/* ========================================================= */}
            
            {activeTab === "Manage Teachers" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                        <span className="bg-blue-50 text-blue-600 p-2 rounded-xl text-lg">??</span>
                        Teacher Duty Passcodes & PIN Management
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Manage individual duty check-in PIN / employee codes for teachers and substitutes.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Search teacher by name or code..."
                        value={searchTeacherKeyword}
                        onChange={(e) => setSearchTeacherKeyword(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                      />
                      <button
                        onClick={fetchTeachers}
                        disabled={teachersLoading}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                      >
                        {teachersLoading ? "Refreshing..." : "?? Refresh"}
                      </button>
                    </div>
                  </div>

                  {teachersLoading && teachersList.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">Loading teachers from database...</div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/80">
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">No</th>
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">Duty Name (DB)</th>
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">Full Name</th>
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">PIN / Check-in Code</th>
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {teachersList
                            .filter((t) => {
                              if (!searchTeacherKeyword.trim()) return true;
                              const kw = searchTeacherKeyword.toLowerCase();
                              return (
                                (t.db_name && t.db_name.toLowerCase().includes(kw)) ||
                                (t.full_name && t.full_name.toLowerCase().includes(kw)) ||
                                (t.pin_code && t.pin_code.toLowerCase().includes(kw))
                              );
                            })
                            .map((t, idx) => (
                              <tr key={t.id_teacher} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-4 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="p-4 font-bold text-slate-800">{t.db_name}</td>
                                <td className="p-4 text-slate-600">{t.full_name}</td>
                                <td className="p-4">
                                  <input
                                    type="text"
                                    id={`pin-${t.id_teacher}`}
                                    defaultValue={t.pin_code}
                                    className="border border-slate-300 bg-white px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-blue-500 outline-none w-32 shadow-xs"
                                  />
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={async () => {
                                      const inputEl = document.getElementById(`pin-${t.id_teacher}`);
                                      const newPin = inputEl ? inputEl.value.trim() : "";
                                      if (!newPin) {
                                        alert("PIN code cannot be empty!");
                                        return;
                                      }
                                      try {
                                        const res = await apiFetch(`${baseUrl}/admin/teachers/${t.id_teacher}/pin`, {
                                          method: "PUT",
                                          headers: authHeaders,
                                          body: JSON.stringify({ pin_code: newPin }),
                                        });
                                        if (res.ok) {
                                          alert(`PIN for ${t.db_name} updated successfully to: ${newPin}`);
                                          fetchTeachers();
                                        } else {
                                          const errData = await res.json();
                                          alert("Failed to update PIN: " + (errData.detail || "Error"));
                                        }
                                      } catch (err) {
                                        alert("Network error: " + err.message);
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
                                  >
                                    Save PIN
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "Manage Admin" && (
              <div className="space-y-8">
                {/* CREATE CARD */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <span className="bg-emerald-50 text-emerald-600 p-2 rounded-xl text-sm">
                      👥
                    </span>{" "}
                    Add New Admin
                  </h3>
                  <form
                    onSubmit={handlePostAdmin}
                    className="grid md:grid-cols-4 gap-6 items-end"
                  >
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Teacher Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="Name..."
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Password..."
                          className="w-full p-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Access Level
                      </label>
                      <div className="flex gap-2">
                        <label
                          className={`flex-1 flex items-center justify-center border rounded-2xl cursor-pointer py-3.5 transition-all text-xs font-bold ${newAdminLevel === "Super" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500"}`}
                        >
                          <input
                            type="radio"
                            name="adminLevel"
                            value="Super"
                            onChange={(e) => setNewAdminLevel(e.target.value)}
                            className="hidden"
                          />
                          Super
                        </label>
                        <label
                          className={`flex-1 flex items-center justify-center border rounded-2xl cursor-pointer py-3.5 transition-all text-xs font-bold ${newAdminLevel === "Normal" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500"}`}
                        >
                          <input
                            type="radio"
                            name="adminLevel"
                            value="Normal"
                            onChange={(e) => setNewAdminLevel(e.target.value)}
                            className="hidden"
                          />
                          Admin
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-[0.98] disabled:bg-slate-300 shadow-emerald-900/20"
                    >
                      Create Admin
                    </button>
                  </form>
                </div>

                {/* TABLE CARD */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="text-xl">🛡️</span> Admin List
                    </h3>
                    <div className="relative w-full md:w-80">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Search admins..."
                        value={searchAdm}
                        onChange={(e) => setsearchAdm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5">Name</th>
                          <th className="px-8 py-5">Password Key</th>
                          <th className="px-8 py-5 text-center">Role Level</th>
                          <th className="px-8 py-5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {currentAdmData.length > 0 ? (
                          currentAdmData.map((item) => (
                            <tr
                              key={item.id_admin}
                              className="hover:bg-slate-50/80 transition-colors group"
                            >
                              <td className="px-8 py-5 font-bold text-slate-800">
                                {item.name_admin}
                              </td>
                              <td className="px-8 py-5 font-mono text-slate-500 text-xs bg-slate-50/50">
                                ••••••••
                              </td>
                              <td className="px-8 py-5 text-center">
                                <span
                                  className={`inline-flex px-3 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${item.level_admin === "Super" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}
                                >
                                  {item.level_admin}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex justify-center gap-2 opacity-100">
                                  <button
                                    onClick={() => handleEditAdmin(item)}
                                    className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Edit Admin Account"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteAdmin(item.id_admin)
                                    }
                                    className="px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Delete Admin Account"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="4"
                              className="p-12 text-center text-slate-400 font-medium italic"
                            >
                              No admins found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalAdmPages > 1 && (
                    <div className="p-6 bg-white border-t border-slate-100 flex justify-center gap-2">
                      {[...Array(totalAdmPages)].map((_, index) => (
                        <button
                          key={index + 1}
                          onClick={() => setcurrentAdmPage(index + 1)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentAdmPage === index + 1 ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "bg-white border border-slate-200 text-slate-500 hover:border-emerald-600 hover:text-emerald-600"}`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= TAB TEACHER SCHEDULES ================= */}
            {activeTab === "Teacher Schedules" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header Card */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                      <span>📅</span> Teacher Schedules
                      <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200 uppercase">
                        Super Admin Only
                      </span>
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      Kelola jadwal pelajaran seluruh guru TK-SD-SMP-SMA. Total:{" "}
                      <span className="font-bold text-blue-600">
                        {schedules.length}
                      </span>{" "}
                      entri jadwal.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSyncMasterSchedules}
                      disabled={isSubmitting}
                      className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
                      title="Sinkronkan ulang data master dari JADWAL_GURU_MASTER.csv"
                    >
                      <span>🔄</span> Sync dari Master CSV
                    </button>
                    <button
                      onClick={() => setIsCreateScheduleOpen(true)}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="text-base leading-none">+</span> Tambah
                      Jadwal Baru
                    </button>
                  </div>
                </div>

                {/* Filter and Table Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-96">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Cari guru, kelas, mapel..."
                        value={searchSchedule}
                        onChange={(e) => setSearchSchedule(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-xs transition-all"
                      />
                    </div>

                    {/* Day Filter */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Filter Day:
                      </span>
                      <select
                        value={filterScheduleDay}
                        onChange={(e) => setFilterScheduleDay(e.target.value)}
                        className="bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-xs transition-all"
                      >
                        <option value="">All Days (All Days)</option>
                        <option value="Monday">Monday (Monday)</option>
                        <option value="Tuesday">Tuesday (Tuesday)</option>
                        <option value="Wednesday">Wednesday (Wednesday)</option>
                        <option value="Thursday">Thursday (Thursday)</option>
                        <option value="Friday">Friday (Friday)</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Guru (Teacher)</th>
                          <th className="px-6 py-4">Mapel / Grade</th>
                          <th className="px-6 py-4">Hari (Day)</th>
                          <th className="px-6 py-4">Waktu (Time Slot)</th>
                          <th className="px-6 py-4 text-center">
                            Class / Grade / Sesi
                          </th>
                          <th className="px-6 py-4 text-center">Notes</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {currentScheduleData.length > 0 ? (
                          currentScheduleData.map((item) => (
                            <tr
                              key={item.id_schedule}
                              className="hover:bg-slate-50/80 transition-colors group"
                            >
                              <td className="px-6 py-4 font-bold text-slate-800">
                                {item.teacher_name}
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-600">
                                {item.subject_grade}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                  {item.day_of_week}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs font-medium text-slate-700">
                                {item.time_slot}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span
                                  className={`inline-flex px-3 py-1 rounded-full font-bold text-xs ${
                                    item.class_name === "Break"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : item.class_name.includes("PC")
                                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                                        : item.class_name.includes(
                                              "Assembly",
                                            ) ||
                                            item.class_name.includes("Excur")
                                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {item.class_name}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center text-xs text-slate-400">
                                {item.note || "-"}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() =>
                                      handleEditScheduleClick(item)
                                    }
                                    className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Edit Schedule"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteSchedule(item.id_schedule)
                                    }
                                    className="px-3.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Delete Schedule"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="7"
                              className="p-12 text-center text-slate-400 font-medium italic"
                            >
                              Tidak ada data jadwal ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalSchedulePages > 1 && (
                    <div className="p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-slate-500 font-medium">
                        Halaman{" "}
                        <span className="font-bold text-slate-800">
                          {currentSchedulePage}
                        </span>{" "}
                        dari{" "}
                        <span className="font-bold text-slate-800">
                          {totalSchedulePages}
                        </span>{" "}
                        ({filteredSchedules.length} hasil)
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={currentSchedulePage === 1}
                          onClick={() =>
                            setCurrentSchedulePage((p) => Math.max(1, p - 1))
                          }
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          ◀ Prev
                        </button>
                        <div className="flex gap-1">
                          {[...Array(Math.min(5, totalSchedulePages))].map(
                            (_, idx) => {
                              let pageNum = idx + 1;
                              if (
                                totalSchedulePages > 5 &&
                                currentSchedulePage > 3
                              ) {
                                pageNum = currentSchedulePage - 2 + idx;
                                if (pageNum > totalSchedulePages)
                                  pageNum = totalSchedulePages - 4 + idx;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() =>
                                    setCurrentSchedulePage(pageNum)
                                  }
                                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                    currentSchedulePage === pageNum
                                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                      : "bg-white border border-slate-200 text-slate-600 hover:border-blue-600 hover:text-blue-600"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            },
                          )}
                        </div>
                        <button
                          disabled={currentSchedulePage === totalSchedulePages}
                          onClick={() =>
                            setCurrentSchedulePage((p) =>
                              Math.min(totalSchedulePages, p + 1),
                            )
                          }
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= TAB TEACHER DUTY SCHEDULES ================= */}
            {activeTab === "Duty Schedules" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Sub Tab Navigation inside Duty Schedules */}
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs w-fit">
                  <button
                    onClick={() => setDutyViewMode("schedules")}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                      dutyViewMode === "schedules"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>???</span> Jadwal Penugasan Duty ({duties.length})
                  </button>
                  <button
                    onClick={() => {
                      setDutyViewMode("pins");
                      fetchTeachers();
                    }}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                      dutyViewMode === "pins"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>??</span> Manajemen PIN Guru Duty ({teachersList.length})
                  </button>
                </div>
                {dutyViewMode === "pins" && (
                  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                          <span className="bg-blue-50 text-blue-600 p-2 rounded-xl text-lg">??</span>
                          Manajemen PIN & Password Guru Duty
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Guru menggunakan PIN / Kode Pegawai masing-masing untuk check-in duty dan menggantikan (substitusi) rekan lain.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <input
                          type="text"
                          placeholder="Cari guru (nama atau kode)..."
                          value={searchTeacherKeyword}
                          onChange={(e) => setSearchTeacherKeyword(e.target.value)}
                          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                        />
                        <button
                          onClick={fetchTeachers}
                          disabled={teachersLoading}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                        >
                          {teachersLoading ? "Loading..." : "?? Refresh"}
                        </button>
                      </div>
                    </div>

                    {teachersLoading && teachersList.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">Loading data guru...</div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80">
                              <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">No</th>
                              <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">Nama Duty (DB)</th>
                              <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">Nama Lengkap</th>
                              <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">PIN / Kode Check-in</th>
                              <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {teachersList
                              .filter((t) => {
                                if (!searchTeacherKeyword.trim()) return true;
                                const kw = searchTeacherKeyword.toLowerCase();
                                return (
                                  (t.db_name && t.db_name.toLowerCase().includes(kw)) ||
                                  (t.full_name && t.full_name.toLowerCase().includes(kw)) ||
                                  (t.pin_code && t.pin_code.toLowerCase().includes(kw))
                                );
                              })
                              .map((t, idx) => (
                                <tr key={t.id_teacher} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="p-4 text-slate-400 font-mono">{idx + 1}</td>
                                  <td className="p-4 font-bold text-slate-800">{t.db_name}</td>
                                  <td className="p-4 text-slate-600">{t.full_name}</td>
                                  <td className="p-4">
                                    <input
                                      type="text"
                                      id={`duty-pin-${t.id_teacher}`}
                                      defaultValue={t.pin_code}
                                      className="border border-slate-300 bg-white px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-blue-500 outline-none w-32 shadow-xs"
                                    />
                                  </td>
                                  <td className="p-4 text-right">
                                    <button
                                      onClick={async () => {
                                        const inputEl = document.getElementById(`duty-pin-${t.id_teacher}`);
                                        const newPin = inputEl ? inputEl.value.trim() : "";
                                        if (!newPin) {
                                          alert("PIN tidak boleh kosong!");
                                          return;
                                        }
                                        try {
                                          const res = await apiFetch(`${baseUrl}/admin/teachers/${t.id_teacher}/pin`, {
                                            method: "PUT",
                                            headers: authHeaders,
                                            body: JSON.stringify({ pin_code: newPin }),
                                          });
                                          if (res.ok) {
                                            alert(`PIN untuk ${t.db_name} berhasil diubah ke: ${newPin}`);
                                            fetchTeachers();
                                          } else {
                                            const errData = await res.json();
                                            alert("Gagal update PIN: " + (errData.detail || "Error"));
                                          }
                                        } catch (err) {
                                          alert("Network error: " + err.message);
                                        }
                                      }}
                                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
                                    >
                                      Simpan PIN
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {dutyViewMode === "schedules" && (
                  <>

                {/* Header Card */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                      <span>🛡️</span> Duty Schedules (Jadwal Piket & Jaga)
                      <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200 uppercase">
                        Super Admin Only
                      </span>
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      Kelola jadwal piket dan penugasan jaga area sekolah (ESE Backyard, Kantin, Lobby, Gerbang). Total:{" "}
                      <span className="font-bold text-emerald-600">
                        {duties.length}
                      </span>{" "}
                      entri duty.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSyncMasterDuties}
                      disabled={isSubmitting}
                      className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
                      title="Sinkronkan ulang data master dari JADWAL_DUTY_MASTER.csv"
                    >
                      <span>🔄</span> Sync dari Master CSV
                    </button>
                    <button
                      onClick={() => {
                        setDutyViewMode("pins");
                        fetchTeachers();
                      }}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>??</span> Kelola PIN Guru Duty
                    </button>
                    <button
                      onClick={() => setIsCreateDutyOpen(true)}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="text-base leading-none">+</span> Tambah Duty Baru
                    </button>
                  </div>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
                      🌳
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Backyard Duty</p>
                      <p className="text-xl font-black text-slate-800">
                        {duties.filter((d) => (d.location || "").toLowerCase().includes("backyard")).length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">
                      ☕
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Canteen Duty</p>
                      <p className="text-xl font-black text-slate-800">
                        {duties.filter((d) => (d.location || "").toLowerCase().includes("canteen")).length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl">
                      🏢
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lobby & Corridors</p>
                      <p className="text-xl font-black text-slate-800">
                        {duties.filter((d) => (d.location || "").toLowerCase().includes("lobby")).length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
                      🚪
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gates / Announcer</p>
                      <p className="text-xl font-black text-slate-800">
                        {duties.filter((d) => (d.location || "").toLowerCase().includes("gate")).length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filter and Table Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
                    {/* Search Input */}
                    <div className="relative w-full md:w-80">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Cari guru, lokasi, tugas..."
                        value={searchDuty}
                        onChange={(e) => setSearchDuty(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs transition-all"
                      />
                    </div>

                    {/* Filter Hari & Lokasi */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          Day:
                        </span>
                        <select
                          value={filterDutyDay}
                          onChange={(e) => setFilterDutyDay(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs transition-all"
                        >
                          <option value="">All Days (All Days)</option>
                          <option value="Monday">Monday (Monday)</option>
                          <option value="Tuesday">Tuesday (Tuesday)</option>
                          <option value="Wednesday">Wednesday (Wednesday)</option>
                          <option value="Thursday">Thursday (Thursday)</option>
                          <option value="Friday">Friday (Friday)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          Lokasi:
                        </span>
                        <select
                          value={filterDutyLocation}
                          onChange={(e) => setFilterDutyLocation(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs transition-all"
                        >
                          <option value="">Semua Lokasi</option>
                          <option value="Backyard">ESE Backyard</option>
                          <option value="Canteen">Canteen</option>
                          <option value="2nd floor">2nd Floor Lobby</option>
                          <option value="3rd floor">3rd Floor Lobby</option>
                          <option value="4th floor">4th Floor Lobby</option>
                          <option value="gate">Gates / Announcer</option>
                        </select>
                      </div>
                    </div>
                  </div>


                  {/* ─── Mobile Card List (tampil di layar < md) ─── */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {currentDutyData.length > 0 ? (
                      currentDutyData.map((item) => {
                        const loc = (item.location || "").toLowerCase();
                        const locColor = loc.includes("backyard")
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : loc.includes("canteen")
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : loc.includes("lobby")
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-blue-50 text-blue-700 border-blue-200";
                        const locIcon = loc.includes("backyard") ? "🌳" : loc.includes("canteen") ? "☕" : loc.includes("lobby") ? "🏢" : "🚪";
                        return (
                          <div key={item.id_duty} className="p-4 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{item.teacher_name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{item.category} · {item.grade_scope}</p>
                              </div>
                              <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs border ${locColor}`}>
                                {locIcon} {item.location}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 font-semibold">{item.day_of_week}</span>
                              <span className="font-mono font-medium text-slate-700">{item.time_slot}</span>
                              {item.task && <span className="text-slate-500 truncate max-w-[160px]" title={item.task}>{item.task}</span>}
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleEditDutyClick(item)}
                                className="flex-1 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors shadow-2xs"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDeleteDuty(item.id_duty)}
                                className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shadow-2xs"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-10 text-center text-slate-400 font-medium italic text-sm">
                        Tidak ada data jadwal duty ditemukan.
                      </div>
                    )}
                  </div>

                  {/* ─── Desktop Table (tampil di layar ≥ md) ─── */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Guru (Teacher)</th>
                          <th className="px-6 py-4">Lokasi (Location)</th>
                          <th className="px-6 py-4">Kategori & Grade</th>
                          <th className="px-6 py-4">Hari (Day)</th>
                          <th className="px-6 py-4">Waktu (Time Slot)</th>
                          <th className="px-6 py-4">Tugas / Instruksi</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {currentDutyData.length > 0 ? (
                          currentDutyData.map((item) => (
                            <tr
                              key={item.id_duty}
                              className="hover:bg-slate-50/80 transition-colors group"
                            >
                              <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span>{item.teacher_name}</span>
                                  {teachersList.find((t) => t.db_name === item.teacher_name)?.pin_code && (
                                    <button
                                      onClick={() => {
                                        setSearchTeacherKeyword(item.teacher_name);
                                        setDutyViewMode("pins");
                                      }}
                                      title="Klik untuk ubah PIN guru ini"
                                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-mono font-bold rounded-lg transition-all flex items-center gap-1"
                                    >
                                      <span>PIN: {teachersList.find((t) => t.db_name === item.teacher_name)?.pin_code}</span>
                                      <span className="text-[10px]">??</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs ${
                                    (item.location || "").toLowerCase().includes("backyard")
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : (item.location || "").toLowerCase().includes("canteen")
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : (item.location || "").toLowerCase().includes("lobby")
                                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                                          : "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}
                                >
                                  {(item.location || "").toLowerCase().includes("backyard") ? "🌳" : (item.location || "").toLowerCase().includes("canteen") ? "☕" : (item.location || "").toLowerCase().includes("lobby") ? "🏢" : "🚪"}{" "}
                                  {item.location}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-600 whitespace-nowrap">
                                <div>{item.category}</div>
                                <div className="text-[11px] text-slate-400 font-semibold">{item.grade_scope}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                  {item.day_of_week}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                                {item.time_slot}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={item.task || ""}>
                                {item.task || "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => handleEditDutyClick(item)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Edit Duty Schedule"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDuty(item.id_duty)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                    title="Delete Duty Schedule"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="7"
                              className="p-12 text-center text-slate-400 font-medium italic"
                            >
                              Tidak ada data jadwal duty ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>


                  {/* Pagination */}
                  {totalDutyPages > 1 && (
                    <div className="p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-slate-500 font-medium">
                        Halaman{" "}
                        <span className="font-bold text-slate-800">
                          {currentDutyPage}
                        </span>{" "}
                        dari{" "}
                        <span className="font-bold text-slate-800">
                          {totalDutyPages}
                        </span>{" "}
                        ({filteredDuties.length} hasil)
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={currentDutyPage === 1}
                          onClick={() =>
                            setCurrentDutyPage((p) => Math.max(1, p - 1))
                          }
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          ◀ Prev
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalDutyPages) },
                            (_, i) => {
                              let pageNum = i + 1;
                              if (totalDutyPages > 5) {
                                if (currentDutyPage > 3) {
                                  pageNum = currentDutyPage - 2 + i;
                                  if (pageNum > totalDutyPages) {
                                    pageNum = totalDutyPages - 4 + i;
                                  }
                                }
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() =>
                                    setCurrentDutyPage(pageNum)
                                  }
                                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                    currentDutyPage === pageNum
                                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                                      : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-600 hover:text-emerald-600"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            },
                          )}
                        </div>
                        <button
                          disabled={currentDutyPage === totalDutyPages}
                          onClick={() =>
                            setCurrentDutyPage((p) =>
                              Math.min(totalDutyPages, p + 1),
                            )
                          }
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: INVAL DUTIES (PERGANTIAN PIKET SEMENTARA) */}
            {/* ========================================================= */}
            {activeTab === "Inval Duties" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-lg">
                        👥
                      </span>
                      Available Teachers (Guru Kosong Berdasarkan Hari & Jam)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Pencarian guru yang kosong (tidak memiliki jadwal piket dan tidak memiliki jadwal mengajar) untuk penugasan pengganti (inval).
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowInvalHistory(!showInvalHistory)}
                      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-3 rounded-2xl transition-all shadow-sm"
                    >
                      <span>📋</span> {showInvalHistory ? "Tutup Riwayat Inval" : "Lihat Riwayat Inval"}
                    </button>
                    <button
                      onClick={() => setIsCreateInvalOpen(true)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <span>➕</span> Catat Inval Manual
                    </button>
                  </div>
                </div>

                {/* AVAILABLE TEACHERS SEARCH & CATALOG */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 space-y-6">
                  {/* Pilih Hari (Day of Week) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      📅 Pilih Hari (Day of Week):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "Monday", label: "Senin (Monday)" },
                        { id: "Tuesday", label: "Selasa (Tuesday)" },
                        { id: "Wednesday", label: "Rabu (Wednesday)" },
                        { id: "Thursday", label: "Kamis (Thursday)" },
                        { id: "Friday", label: "Jumat (Friday)" },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setFreeTeacherDay(d.id)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            freeTeacherDay === d.id
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pilih Jam / Sesi & Search Teacher */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                      <label className="text-xs font-bold text-slate-500 whitespace-nowrap">
                        🕒 Pilih Jam / Sesi Piket:
                      </label>
                      <select
                        value={freeTeacherSlot}
                        onChange={(e) => setFreeTeacherSlot(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">Semua Jam (Sepanjang Hari Kosong)</option>
                        <option value="07.15-07.45">07.15-07.45 (Morning Duty / Devotion)</option>
                        <option value="09.10-09.35">09.10-09.35 (Recess 1)</option>
                        <option value="09.30-09.45">09.30-09.45</option>
                        <option value="10.20-10.45">10.20-10.45</option>
                        <option value="11.20-11.50">11.20-11.50 (Lunch / Recess 2)</option>
                        <option value="11.55-12.25">11.55-12.25</option>
                        <option value="12.05-12.25">12.05-12.25</option>
                        <option value="13.00-13.35">13.00-13.35</option>
                        <option value="13.25-13.50">13.25-13.50</option>
                        <option value="13.35-14.00">13.35-14.00</option>
                        <option value="14.00-15.00">14.00-15.00 (Dismissal)</option>
                        <option value="14.10-14.35">14.10-14.35</option>
                        <option value="14.30-15.00">14.30-15.00</option>
                      </select>
                    </div>

                    <div className="relative w-full md:w-72">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Cari nama guru kosong..."
                        value={searchFreeTeacher}
                        onChange={(e) => setSearchFreeTeacher(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Available Teachers Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-600">
                        Guru yang Kosong pada hari <strong className="text-indigo-600 font-extrabold">{freeTeacherDay}</strong> {freeTeacherSlot !== "all" ? `jam ${freeTeacherSlot}` : "(sepanjang hari)"}:
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg border border-emerald-200">
                        {freeTeachersList.filter((t) => !searchFreeTeacher || t.toLowerCase().includes(searchFreeTeacher.toLowerCase())).length} Guru Tersedia
                      </span>
                    </div>

                    {isLoadingFreeTeachers ? (
                      <div className="py-12 text-center text-slate-400 animate-pulse text-xs font-bold">
                        Memuat daftar guru yang kosong...
                      </div>
                    ) : freeTeachersList.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm font-medium">Tidak ada guru kosong yang sesuai kriteria ini.</p>
                        <p className="text-xs text-slate-400 mt-1">Coba pilih slot jam lain atau hari lain.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
                        {freeTeachersList
                          .filter((t) => !searchFreeTeacher || t.toLowerCase().includes(searchFreeTeacher.toLowerCase()))
                          .map((teacher, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 bg-slate-50/70 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all flex flex-col justify-between gap-3 group"
                            >
                              <div>
                                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-black">
                                    ✓
                                  </span>
                                  <span className="truncate" title={teacher}>{teacher}</span>
                                </div>
                                <div className="mt-2 space-y-1 text-[10px]">
                                  <div className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <span>🟢</span> Bebas Jadwal Mengajar
                                  </div>
                                  <div className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <span>🟢</span> Bebas Jadwal Piket
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAssignFreeTeacher(teacher)}
                                className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
                              >
                                <span>➕</span> Tugaskan Inval
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Daftar Pergantian Piket (Inval) dihilangkan sesuai permintaan user */}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: EVENT SCHEDULES (JADWAL ACARA KHUSUS) */}
            {/* ========================================================= */}
            {activeTab === "Event Schedules" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="p-2 bg-amber-50 text-amber-600 rounded-xl text-lg">
                        ⭐
                      </span>
                      Jadwal Event & Agenda Khusus
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Kelola jadwal acara khusus (Assembly, Retreat, Ujian) yang menyesuaikan KBM dan dikenali oleh AI Chatbot.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateEventOpen(true)}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-6 py-3.5 rounded-2xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
                  >
                    <span>➕</span> Buat Event Baru
                  </button>
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="text-xl">📋</span> Daftar Acara Khusus
                    </h3>
                    <div className="relative w-full md:w-80">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Cari nama event, scope, deskripsi..."
                        value={searchEvent}
                        onChange={(e) => setSearchEvent(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none shadow-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-5">Periode Tanggal</th>
                          <th className="px-6 py-5">Nama Event</th>
                          <th className="px-6 py-5">Target Scope</th>
                          <th className="px-6 py-5">Jam</th>
                          <th className="px-6 py-5">Pengaruh KBM</th>
                          <th className="px-6 py-5">Deskripsi</th>
                          <th className="px-6 py-5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {currentEventData.length > 0 ? (
                          currentEventData.map((item) => (
                            <tr
                              key={item.id_event}
                              className="hover:bg-slate-50/80 transition-colors group"
                            >
                              <td className="px-6 py-5 font-bold text-slate-800 whitespace-nowrap">
                                📅 {item.date}
                                {item.end_date && item.end_date !== item.date && (
                                  <span className="block text-xs font-medium text-amber-700">
                                    s/d {item.end_date}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5 font-bold text-slate-900">
                                {item.event_name}
                              </td>
                              <td className="px-6 py-5">
                                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-200">
                                  {item.target_scope}
                                </span>
                              </td>
                              <td className="px-6 py-5 font-mono text-xs font-bold text-slate-600">
                                {item.time_slot ? `🕒 ${item.time_slot}` : "-"}
                              </td>
                              <td className="px-6 py-5">
                                {item.affects_kbm ? (
                                  <span className="inline-block px-2.5 py-1 bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider rounded-md border border-rose-200">
                                    Mengubah KBM
                                  </span>
                                ) : (
                                  <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                                    KBM Normal
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5 text-xs text-slate-600 max-w-xs leading-relaxed">
                                {item.description}
                              </td>
                              <td className="px-6 py-5 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleEditClickEvent(item)}
                                  className="px-3.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors shadow-2xs mr-2 inline-flex items-center gap-1"
                                  title="Edit Event Schedule"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(item.id_event)}
                                  className="px-3.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1"
                                  title="Delete Event Schedule"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="7"
                              className="p-12 text-center text-slate-400 font-medium italic"
                            >
                              Belum ada jadwal event khusus tercatat.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalEventPages > 1 && (
                    <div className="p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-slate-500 font-medium">
                        Halaman{" "}
                        <span className="font-bold text-slate-800">
                          {currentEventPage}
                        </span>{" "}
                        dari{" "}
                        <span className="font-bold text-slate-800">
                          {totalEventPages}
                        </span>{" "}
                        ({filteredEvents.length} hasil)
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={currentEventPage === 1}
                          onClick={() =>
                            setCurrentEventPage((p) => Math.max(1, p - 1))
                          }
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          ◀ Prev
                        </button>
                        <button
                          disabled={currentEventPage === totalEventPages}
                          onClick={() =>
                            setCurrentEventPage((p) =>
                              Math.min(totalEventPages, p + 1),
                            )
                          }
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: DUTY ATTENDANCE (ABSENSI GURU PIKET) */}
            {activeTab === "Duty Attendance" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-lg">
                        📋
                      </span>
                      Duty Attendance Monitoring & Summary
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Daily teacher duty attendance records by time slot & location. Evaluated automatically from 06:00 WIB with fixed passcode{" "}
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        citahati
                      </span>
                      .
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleAdminSeedDummy}
                      disabled={isSeedingAttDummy}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-3 rounded-2xl transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                      title="Generate 1 data uji coba untuk hari ini"
                    >
                      <span>🧪</span> {isSeedingAttDummy ? "Generating Dummy..." : "Test Dummy Data"}
                    </button>
                    <button
                      onClick={handleExportAttendanceExcel}
                      disabled={isExportingExcel}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-2xl transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                      title="Export report to Excel (.xlsx) with detail logs & duty calculation"
                    >
                      <span>📊</span> {isExportingExcel ? "Generating Excel..." : "Export to Excel (.xlsx)"}
                    </button>
                    <a
                      href="/duty-attendance"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-3 rounded-2xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <span>🔗</span> Open Duty Attendance Page ↗
                    </a>
                  </div>
                </div>

                {/* Filter & Search Bar (Ditaruh di atas verifikasi & memuat filter Siapa Tidak Duty) */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                  {/* Period Presets */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 mr-2">Filter Periode:</span>
                      {[
                        { id: "all", label: "All Records (Semua)" },
                        { id: "today", label: "Hari Ini (Today)" },
                        { id: "week", label: "Minggu Ini (This Week)" },
                        { id: "month", label: "Bulan Ini (This Month)" },
                        { id: "custom", label: "Rentang Kustom (Custom)" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPeriod(p.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filterAttPeriod === p.id
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Quick Reset All Filters */}
                    {(filterAttStatus !== "all" || filterAttLoc || filterAttScheduled !== "all" || searchAttTeacher || filterAttPeriod !== "all") && (
                      <button
                        onClick={() => {
                          setFilterAttStatus("all");
                          setFilterAttLoc("");
                          setFilterAttScheduled("all");
                          setSearchAttTeacher("");
                          handleSelectPeriod("all");
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <span>✕</span> Reset Filter
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    {/* Tanggal Mulai & Akhir */}
                    <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                      <label className="text-xs font-bold text-slate-500 whitespace-nowrap">From:</label>
                      <input
                        type="date"
                        value={filterAttDate}
                        onChange={(e) => {
                          setFilterAttDate(e.target.value);
                          setFilterAttPeriod("custom");
                        }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <label className="text-xs font-bold text-slate-500 whitespace-nowrap">To:</label>
                      <input
                        type="date"
                        value={filterAttEndDate}
                        onChange={(e) => {
                          setFilterAttEndDate(e.target.value);
                          setFilterAttPeriod("custom");
                        }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Filter Status Duty (Siapa Tidak Duty / Sudah / Lagi / Belum) */}
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Status Duty:</label>
                      <select
                        value={filterAttStatus}
                        onChange={(e) => setFilterAttStatus(e.target.value)}
                        className={`w-full lg:w-56 px-3 py-2 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                          filterAttStatus === "tidak_duty"
                            ? "bg-amber-100/70 border-amber-400 text-amber-900 font-extrabold"
                            : filterAttStatus === "sudah_duty"
                              ? "bg-blue-100/70 border-blue-400 text-blue-900 font-extrabold"
                              : filterAttStatus === "lagi_duty"
                                ? "bg-emerald-100/70 border-emerald-400 text-emerald-900 font-extrabold"
                                : filterAttStatus === "sedang_jam_piket"
                                  ? "bg-yellow-100/70 border-yellow-400 text-yellow-900 font-extrabold"
                                  : filterAttStatus === "belum_duty"
                                    ? "bg-slate-200 border-slate-400 text-slate-900 font-extrabold"
                                    : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <option value="all">Semua Status Duty</option>
                        <option value="tidak_duty">🟠 Tidak Duty (Terlewat / Belum Absen)</option>
                        <option value="sudah_duty">🔵 Sudah Duty (Hadir / Terverifikasi)</option>
                        <option value="lagi_duty">🟢 Lagi Duty (Sedang Berlangsung)</option>
                        <option value="sedang_jam_piket">🟡 Sedang Jam Piket (Harusnya Duty / Belum Absen)</option>
                        <option value="belum_duty">⚪ Belum Duty (Jadwal Belum Mulai)</option>
                      </select>
                    </div>

                    {/* Lokasi Dropdown */}
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Lokasi:</label>
                      <select
                        value={filterAttLoc}
                        onChange={(e) => setFilterAttLoc(e.target.value)}
                        className="w-full lg:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Duty Locations</option>
                        {dutyAttendanceLocations.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Search Teacher */}
                    <div className="relative w-full lg:w-56">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Cari nama guru..."
                        value={searchAttTeacher}
                        onChange={(e) => setSearchAttTeacher(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* KPI Status Cards (Interaktif: Klik untuk menyaring status) */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* Belum Duty */}
                  <div
                    onClick={() => setFilterAttStatus(filterAttStatus === "belum_duty" ? "all" : "belum_duty")}
                    className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                      filterAttStatus === "belum_duty"
                        ? "bg-slate-100 border-slate-400 ring-2 ring-slate-400 scale-[1.02]"
                        : "bg-white border-slate-200/80 hover:bg-slate-50"
                    }`}
                    title="Klik untuk filter guru yang Belum Duty"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-slate-400 text-base">⚪</span>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Belum Duty</span>
                      </div>
                      <div className="text-2xl font-black text-slate-700">
                        {dutyAttendanceRecords.filter((r) => r.status === "Belum Duty").length}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Schedule not started</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                      ⚪
                    </div>
                  </div>

                  {/* Lagi Duty */}
                  <div
                    onClick={() => setFilterAttStatus(filterAttStatus === "lagi_duty" ? "all" : "lagi_duty")}
                    className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                      filterAttStatus === "lagi_duty"
                        ? "bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-500 scale-[1.02]"
                        : "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100/40"
                    }`}
                    title="Klik untuk filter guru yang Lagi Duty (Sedang Bertugas)"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-emerald-500 text-base">🟢</span>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Lagi Duty</span>
                      </div>
                      <div className="text-2xl font-black text-emerald-700">
                        {dutyAttendanceRecords.filter((r) => r.status === "Lagi Duty").length}
                      </div>
                      <p className="text-[10px] text-emerald-600 mt-1">Active / Check-in</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold animate-pulse">
                      🟢
                    </div>
                  </div>

                  {/* Sedang Jam Piket */}
                  <div
                    onClick={() => setFilterAttStatus(filterAttStatus === "sedang_jam_piket" ? "all" : "sedang_jam_piket")}
                    className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                      filterAttStatus === "sedang_jam_piket"
                        ? "bg-yellow-100/90 border-yellow-500 ring-2 ring-yellow-500 scale-[1.02]"
                        : "bg-yellow-50/50 border-yellow-200/90 hover:bg-yellow-100/40"
                    }`}
                    title="Klik untuk filter guru Sedang Jam Piket (Harusnya duty namun belum absen)"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-yellow-600 text-base">🟡</span>
                        <span className="text-[11px] font-bold text-yellow-800 uppercase tracking-wider">Jam Piket</span>
                      </div>
                      <div className="text-2xl font-black text-yellow-800">
                        {dutyAttendanceRecords.filter((r) => r.status === "Sedang Jam Piket").length}
                      </div>
                      <p className="text-[10px] text-yellow-700 mt-1">Harusnya duty / blm absen</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold animate-pulse">
                      🟡
                    </div>
                  </div>

                  {/* Sudah Duty */}
                  <div
                    onClick={() => setFilterAttStatus(filterAttStatus === "sudah_duty" ? "all" : "sudah_duty")}
                    className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                      filterAttStatus === "sudah_duty"
                        ? "bg-blue-100/70 border-blue-500 ring-2 ring-blue-500 scale-[1.02]"
                        : "bg-blue-50/50 border-blue-100 hover:bg-blue-100/40"
                    }`}
                    title="Klik untuk filter guru yang Sudah Duty"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-blue-500 text-base">🔵</span>
                        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Sudah Duty</span>
                      </div>
                      <div className="text-2xl font-black text-blue-700">
                        {dutyAttendanceRecords.filter((r) => r.status === "Sudah Duty").length}
                      </div>
                      <p className="text-[10px] text-blue-600 mt-1">Verified attendances</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      🔵
                    </div>
                  </div>

                  {/* Tidak Duty */}
                  <div
                    onClick={() => setFilterAttStatus(filterAttStatus === "tidak_duty" ? "all" : "tidak_duty")}
                    className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                      filterAttStatus === "tidak_duty"
                        ? "bg-amber-100/80 border-amber-500 ring-2 ring-amber-500 scale-[1.02]"
                        : "bg-amber-50/50 border-amber-100 hover:bg-amber-100/40"
                    }`}
                    title="Klik untuk filter: Siapa Tidak Duty"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-amber-500 text-base">🟠</span>
                        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Tidak Duty</span>
                      </div>
                      <div className="text-2xl font-black text-amber-700">
                        {dutyAttendanceRecords.filter((r) => r.status === "Tidak Duty").length}
                      </div>
                      <p className="text-[10px] text-amber-600 mt-1">Ended without check-in</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                      🟠
                    </div>
                  </div>
                </div>

                  {/* GENERATOR LINK ABSENSI DUTY & QR CODES (Selalu Tampil) */}
                  {dutyAttendanceLocations.length > 0 && (
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span>🔗</span> Duty Attendance Access Links & QR Codes
                        </h4>
                        <span className="text-xs text-slate-400 font-medium">
                          Share this link with teachers on duty
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dutyAttendanceLocations.map((loc, idx) => {
                          const safeUrl = `https://pengumuman.klprojects.online/duty/${encodeURIComponent(loc)}`;
                          return (
                            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-2 font-bold text-slate-700">
                                <span>📍</span>
                                <span>{loc}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="text" 
                                  readOnly 
                                  value={safeUrl} 
                                  className="w-full text-[10px] p-2 bg-white border border-slate-300 rounded-lg text-slate-500 font-mono outline-none"
                                />
                                <button 
                                  onClick={() => handleOpenQrModal(loc)}
                                  className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                                  title="Generate QR Code for this location"
                                >
                                  <span>📱</span>
                                  <span>QR</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(safeUrl);
                                    alert('Link copied to clipboard!');
                                  }}
                                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                                  title="Copy Link"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <a 
                                  href={safeUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex-shrink-0 bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-lg transition-colors"
                                  title="Open Link"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* MODAL QR CODE LOKASI DENGAN LOGO CITA HATI */}
                  {selectedQrLocation && (
                    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📱</span>
                            <h3 className="text-base font-black text-slate-800">
                              Location Duty QR Code
                            </h3>
                          </div>
                          <button
                            onClick={() => setSelectedQrLocation(null)}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition-colors"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Printable Poster Card Preview */}
                        <div className="my-5 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-indigo-200 text-center flex flex-col items-center">
                          <img
                            src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
                            alt="Cita Hati Logo"
                            className="h-14 w-auto object-contain mb-2"
                          />
                          <h4 className="text-xs font-black text-[#1e3a8a] uppercase tracking-wider max-w-xs leading-tight">
                            Cita Hati Christian School Elementary Pakuwon City Campus
                          </h4>
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                            Duty Attendance Check-In
                          </span>

                          <div className="my-3 px-4 py-1.5 bg-[#1e3a8a] text-white text-sm font-black rounded-full shadow-sm">
                            📍 {selectedQrLocation}
                          </div>

                          {qrCodeDataUrl ? (
                            <img
                              src={qrCodeDataUrl}
                              alt="QR Code"
                              className="w-52 h-52 my-1 rounded-xl shadow-md border border-slate-200 bg-white p-2"
                            />
                          ) : (
                            <div className="w-52 h-52 flex items-center justify-center bg-slate-200 rounded-xl animate-pulse text-xs text-slate-500 font-bold">
                              Generating QR Code...
                            </div>
                          )}

                          <p className="text-xs font-bold text-slate-700 mt-2">
                            Scan this QR Code to check in for duty
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={handlePrintQr}
                            className="w-full bg-[#1e3a8a] hover:bg-blue-800 text-white text-xs font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            <span>🖨️</span>
                            <span>Print Poster</span>
                          </button>
                          <button
                            onClick={handleDownloadQr}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
                          >
                            <span>💾</span>
                            <span>Download PNG</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODAL EDIT ATTENDANCE RECORD */}
                  {editAttModal && (
                    <div className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                            <span>✏️</span> Edit Attendance Record #{editAttModal.id_attendance}
                          </h3>
                          <button
                            onClick={() => setEditAttModal(null)}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                        <form onSubmit={handleSaveEditAttendance} className="space-y-4 my-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Teacher Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={editAttTeacher}
                              onChange={(e) => setEditAttTeacher(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Location *
                              </label>
                              <input
                                type="text"
                                required
                                value={editAttLocation}
                                onChange={(e) => setEditAttLocation(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Time Slot *
                              </label>
                              <input
                                type="text"
                                required
                                value={editAttTimeSlot}
                                onChange={(e) => setEditAttTimeSlot(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Date *
                              </label>
                              <input
                                type="date"
                                required
                                value={editAttDate}
                                onChange={(e) => setEditAttDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Duty Category
                              </label>
                              <input
                                type="text"
                                value={editAttCategory}
                                onChange={(e) => setEditAttCategory(e.target.value)}
                                placeholder="e.g. Break 1 / Morning Devotion"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Duty Status *
                            </label>
                            <select
                              value={editAttStatus}
                              onChange={(e) => setEditAttStatus(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Tidak Duty">🟠 Tidak Duty</option>
                              <option value="Sudah Duty">🔵 Sudah Duty</option>
                              <option value="Lagi Duty">🟢 Lagi Duty</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Notes
                            </label>
                            <textarea
                              rows={2}
                              value={editAttNotes}
                              onChange={(e) => setEditAttNotes(e.target.value)}
                              placeholder="Tambahkan catatan jika ada"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="flex gap-3 pt-3">
                            <button
                              type="button"
                              onClick={() => setEditAttModal(null)}
                              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50"
                            >
                              {isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Table Log Absensi Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="text-lg">📜</span> Attendance & Verification Records ({filteredAttendanceRecords.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      {filterAttStatus !== "all" && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                          <span>Status:</span>
                          <span className="capitalize">{filterAttStatus.replace("_", " ")}</span>
                          <button
                            onClick={() => setFilterAttStatus("all")}
                            className="ml-1 text-amber-900 hover:text-rose-600 font-bold"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Password:</span>
                        <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          citahati
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-4 px-6 text-center w-12">#</th>
                          <th className="py-4 px-6">Check-in Time</th>
                          <th className="py-4 px-6">Teacher Name</th>
                          <th className="py-4 px-6">Location</th>
                          <th className="py-4 px-6">Time Slot</th>
                          <th className="py-4 px-6">Kategori</th>
                          <th className="py-4 px-6">Status Verifikasi</th>
                          <th className="py-4 px-6">Jadwal / Inval</th>
                          <th className="py-4 px-6">Validation</th>
                          <th className="py-4 px-6">Notes</th>
                          <th className="py-4 px-6 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {currentAttData.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="py-12 text-center text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <span className="text-3xl">📋</span>
                                <p className="font-medium text-sm">
                                  Belum ada catatan absensi duty untuk filter ini.
                                </p>
                                <p className="text-xs text-slate-400">
                                  Gunakan filter di atas atau klik tombol reset filter.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          currentAttData.map((rec, index) => (
                            <tr
                              key={rec.id_attendance || `${rec.date}-${rec.location}-${rec.time_slot}-${rec.teacher_name}-${index}`}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="py-4 px-6 text-center text-slate-400 font-mono">
                                {(currentAttPage - 1) * itemsPerPage + index + 1}
                              </td>
                              <td className="py-4 px-6">
                                {rec.check_in_time ? (
                                  <>
                                    <div className="font-bold text-slate-800">
                                      {new Date(rec.check_in_time).toLocaleTimeString("id-ID", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })}{" "}
                                      WIB
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      {rec.date}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="font-bold text-amber-600/90 italic">
                                      Belum Absen
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      {rec.date}
                                    </div>
                                  </>
                                )}
                              </td>
                              <td className="py-4 px-6 font-bold text-slate-800">
                                {rec.teacher_name}
                                {rec.substitute_name && (
                                  <div className="text-xs text-amber-600 font-medium">
                                    Substituted by: {rec.substitute_name}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold rounded-lg">
                                  {rec.location}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-mono text-slate-600 font-semibold">
                                {rec.time_slot}
                              </td>
                              <td className="py-4 px-6 text-slate-600">
                                {rec.duty_category || "-"}
                              </td>
                              <td className="py-4 px-6">
                                {rec.status === "Sudah Duty" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    🔵 Sudah Duty
                                  </span>
                                ) : rec.status === "Lagi Duty" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                                    🟢 Lagi Duty
                                  </span>
                                ) : rec.status === "Sedang Jam Piket" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-900 border border-yellow-300 animate-pulse">
                                    🟡 Sedang Jam Piket
                                  </span>
                                ) : rec.status === "Tidak Duty" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    🟠 Tidak Duty
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    ⚪ Belum Duty
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                {rec.is_inval ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title={rec.notes || "Inval"}>
                                    👥 Inval {rec.teacher_name === rec.original_teacher ? `(Digantikan ${rec.substitute_teacher || ""})` : `(Pengganti ${rec.original_teacher || ""})`}
                                  </span>
                                ) : rec.is_scheduled_duty ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    🛡️ Terjadwal Duty
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    ⚠️ Luar Jadwal
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 font-mono font-bold text-slate-700">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                                  {rec.verified_code || "-"}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-slate-500 max-w-xs truncate" title={rec.notes}>
                                {rec.notes || "-"}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {rec.id_attendance ? (
                                    <>
                                      <button
                                        onClick={() => handleOpenEditAttendance(rec)}
                                        className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all"
                                        title="Edit rekaman absensi ini"
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAttendanceRecord(rec.id_attendance)}
                                        className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all"
                                        title="Delete rekaman absensi ini"
                                      >
                                        🗑️ Delete
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleManualVerifyClick(rec)}
                                      disabled={isSubmitting}
                                      className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm border border-indigo-200 flex items-center gap-1"
                                      title="Verifikasi manual kehadiran guru ini"
                                    >
                                      <span>✏️</span> Verifikasi
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalAttPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <p className="text-xs font-semibold text-slate-500">
                        Menampilkan {(currentAttPage - 1) * itemsPerPage + 1} -{" "}
                        {Math.min(currentAttPage * itemsPerPage, filteredAttendanceRecords.length)}{" "}
                        dari {filteredAttendanceRecords.length} catatan
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={currentAttPage === 1}
                          onClick={() => setCurrentAttPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          ◀ Prev
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-2">
                          Hal {currentAttPage} / {totalAttPages}
                        </span>
                        <button
                          disabled={currentAttPage === totalAttPages}
                          onClick={() => setCurrentAttPage((p) => Math.min(totalAttPages, p + 1))}
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
