import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
export default function Admin() {
  // Tambahkan ini di bagian atas (di tempat kumpulan useState)

  // ==========================================
  // 1. AUTENTIKASI & LAYOUT STATE
  // ==========================================
  const tokenJWT = localStorage.getItem("jwt_token");
  const userRole = localStorage.getItem("role");
  const username = localStorage.getItem("username");
  const [role, setRole] = useState(userRole);
  const id_admin = localStorage.getItem("id_admin");

  const [showPassword, setShowPassword] = useState(false);
  // ==========================================
  // STATE UNTUK UPDATE & DELETE
  // ==========================================
  // State untuk Update (Edit Pengumuman)
  const [editModalData, setEditModalData] = useState(null); // Menyimpan ID pengumuman yang diedit
  const [editAnnDate, setEditAnnDate] = useState("");
  const [editAnnouncementText, setEditAnnouncementText] = useState("");
  const [editModalBirth, setEditModalBirth] = useState(null);
  const [editModalAdm, seteditModalAdm] = useState(null);

  const [editBirthName, seteditBirthName] = useState("");
  const [editBirtGender, setBirtGender] = useState("");
  const [editBirtDate, settBirtDat] = useState("");

  const [editNewBirthName, seteditNewBirthName] = useState("");
  const [editNewBirtGender, setNewBirtGender] = useState("");
  const [editNewBirtDate, settNewBirtDat] = useState("");

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminLevel, setNewAdminLevel] = useState("Super"); // Default Super

  // update admin
  const [newAdminNameUpdate, setNewAdminNameUpdate] = useState("");
  const [newAdminPasswordUpdate, setNewAdminPasswordUpdate] = useState("");
  const [newAdminLevelUpdate, setNewAdminLevelUpdate] = useState("");

  // State untuk Delete (Opsional jika ingin buat popup konfirmasi)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [activeTab, setActiveTab] = useState("Announcements");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Tanggal untuk Dashboard Atas
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // ==========================================
  // 2. DATA STATE (MENYIMPAN SEMUA DATA DARI DATABASE)
  // ==========================================
  const [announcements, setAnnouncements] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [admin, setAdmin] = useState([]);

  // ==========================================
  // 3. SEARCH & PAGINATION STATE
  // ==========================================
  // Untuk Announcements
  const [searchAnnouncements, setSearchAnnouncements] = useState("");
  const [currentAnnPage, setCurrentAnnPage] = useState(1);

  //untuk admin
  const [searchAdm, setsearchAdm] = useState("");
  const [currentAdmPage, setcurrentAdmPage] = useState(1);

  // Untuk Birthdays
  const [searchBirthdays, setSearchBirthdays] = useState("");
  const [currentBdayPage, setCurrentBdayPage] = useState(1);

  const itemsPerPage = 2;

  // ==========================================
  // 4. FORM STATE (CREATE)
  // ==========================================
  const [newAnnDate, setNewAnnDate] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState("");

  const [newBdayName, setNewBdayName] = useState("");
  const [newBdayDate, setNewBdayDate] = useState("");
  const [newBdayGender, setNewBdayGender] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popupData, setPopupData] = useState(null);

  // ==========================================
  // 5. FETCH DATA DARI API (GET)
  // ==========================================
  // Gunakan localhost untuk testing di laptop, ubah ke IP Wi-Fi jika tes di HP
  // const API_URL = "http://localhost:8000/api";
  // Alamat IP VPS Server
  const API_URL = "http://202.155.14.105:8000/api";
  const fetchSemuaData = async () => {
    try {
      const headers = { Authorization: `Bearer ${tokenJWT}` };

      // Ambil Pengumuman
      const resAnn = await fetch(`${API_URL}/announcements-with-admin`, {
        headers,
      });
      const dataAnn = await resAnn.json();
      console.log(dataAnn);
      setAnnouncements(dataAnn);

      // Ambil Ulang Tahun
      const resBday = await fetch(`${API_URL}/birthdays`, { headers });
      const dataBday = await resBday.json();

      const resAdmin = await fetch(`${API_URL}/admin`, { headers });
      const dataAdmin = await resAdmin.json();
      setAdmin(dataAdmin);
      setBirthdays(dataBday);
    } catch (err) {
      console.error("Gagal mengambil data:", err);
    }
  };

  useEffect(() => {
    fetchSemuaData();
    document.title = "Admin Panel - Cita Hati";
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ==========================================
  // 6. LOGIKA FILTER DASHBOARD HARI INI (REALTIME)
  // ==========================================
  const todayAnnouncements = announcements.filter(
    (item) => item.date === selectedDate,
  );
  const monthDayPilihan = selectedDate.substring(5);
  const todayBirthdays = Array.isArray(birthdays)
    ? birthdays.filter((b) => b.date && b.date.endsWith(monthDayPilihan))
    : [];

  // ==========================================
  // 7. LOGIKA SEARCH & PAGINATION TABEL (REALTIME)
  // ==========================================
  // Tabel Pengumuman
  const filteredAnnouncements = announcements.filter(
    (item) =>
      item.announcement
        .toLowerCase()
        .includes(searchAnnouncements.toLowerCase()) ||
      item.date.includes(searchAnnouncements),
  );
  const totalAnnPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const currentAnnData = filteredAnnouncements.slice(
    (currentAnnPage - 1) * itemsPerPage,
    currentAnnPage * itemsPerPage,
  );

  console.log(currentAnnPage);
  // Tabel Ulang Tahun
  const filteredBirthdays = Array.isArray(birthdays)
    ? birthdays.filter(
        (item) =>
          item.name.toLowerCase().includes(searchBirthdays.toLowerCase()) ||
          item.date.includes(searchBirthdays) ||
          item.gender.toLowerCase().includes(searchBirthdays.toLowerCase()),
      )
    : [];
  const totalBdayPages = Math.ceil(filteredBirthdays.length / itemsPerPage);
  const currentBdayData = filteredBirthdays.slice(
    (currentBdayPage - 1) * itemsPerPage,
    currentBdayPage * itemsPerPage,
  );

  //tabel admin
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

  // Reset pagination jika user mengetik di kotak pencarian
  useEffect(() => setCurrentAnnPage(1), [searchAnnouncements]);
  useEffect(() => setCurrentBdayPage(1), [searchBirthdays]);

  // ==========================================
  // 8. FUNGSI POST (SUBMIT DATA)
  // ==========================================
  const handlePostAnnouncement = async () => {
    if (!newAnnDate || !newAnnouncement.trim())
      return alert("Isi form dengan lengkap!");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenJWT}`,
        },
        body: JSON.stringify({
          announcement: newAnnouncement,
          date: newAnnDate,
          admin_update: id_admin,
        }),
      });
      if (res.ok) {
        setPopupData({ title: "Announcement Posted!" });
        setNewAnnDate("");
        setNewAnnouncement("");
        fetchSemuaData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostBirthday = async (e) => {
    e.preventDefault();
    if (!newBdayName || !newBdayDate || !newBdayGender)
      return alert("Isi form dengan lengkap!");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/birthdays`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenJWT}`,
        },
        body: JSON.stringify({
          name: newBdayName,
          date: newBdayDate,
          gender: newBdayGender,
          admin_update: id_admin,
        }),
      });
      if (res.ok) {
        setPopupData({ title: "Birthday Record Added!" });
        setNewBdayName("");
        setNewBdayDate("");
        setNewBdayGender("");
        fetchSemuaData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handlePostAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminName || !newAdminPassword || !newAdminLevel)
      return alert("Isi form dengan lengkap!");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenJWT}`,
        },
        body: JSON.stringify({
          name_admin: newAdminName,
          password_admin: newAdminPassword,
          level_admin: newAdminLevel,
        }),
      });
      if (res.ok) {
        setPopupData({ title: "Admin Record Added!" });
        setNewAdminName("");
        setNewAdminPassword("");
        setNewAdminLevel("");
        fetchSemuaData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleLogout = () => {
    const isConfirmed = window.confirm(
      "Apakah Anda yakin ingin keluar dari halaman Admin?",
    );
    if (isConfirmed) {
      // 1. Bersihkan semua data dari brankas browser
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      localStorage.removeItem("id_admin");

      // 2. Tendang kembali ke halaman login
      window.location.href = "/login";
    }
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
      id: "Manage Admin",
      label: "Manage Admin",
      icon: "👥",
      allowed: ["Super"],
    },
    {
      id: "logout_admin",
      label: "Logout", // <--- PERBAIKAN: Menambahkan koma di sini
      icon: "🚪", // <--- Menambahkan ikon agar tidak kosong
      allowed: ["Normal", "Super"],
    },
  ];
  const visibleMenu = menuItems.filter((item) => item.allowed.includes(role));
  // --- FUNGSI UPDATE (PUT) ---
  // Fungsi ini dipanggil saat tombol "Edit" di tabel diklik untuk mengisi form
  const handleEditClick = (item) => {
    setEditModalData(item.id_announcement);
    setEditAnnDate(item.date);
    setEditAnnouncementText(item.announcement);
  };

  // Fungsi ini dipanggil saat form edit disubmit
  const handleUpdateAnnouncement = async () => {
    if (!editAnnDate || !editAnnouncementText.trim())
      return alert("Isi form dengan lengkap!");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/announcements/${editModalData}`, {
        method: "PUT", // Gunakan PUT atau PATCH sesuai setting backend kamu
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenJWT}`,
        },
        body: JSON.stringify({
          announcement: editAnnouncementText,
          date: editAnnDate,
          admin_update: id_admin,
        }),
      });
      if (res.ok) {
        setPopupData({ title: "Announcement Updated!" });
        setEditModalData(null); // Tutup modal edit
        fetchSemuaData(); // Refresh tabel
      }
    } catch (err) {
      console.error("Gagal mengupdate:", err);
    } finally {
      setIsSubmitting(false);
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
      return alert("Isi form dengan lengkap!");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/birthdays/${editModalBirth}`, {
        method: "PUT", // Gunakan PUT atau PATCH sesuai setting backend kamu
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenJWT}`,
        },
        body: JSON.stringify({
          name: editBirthName,
          date: editBirtDate,
          gender: editBirtGender,
          admin_update: id_admin,
        }),
      });
      if (res.ok) {
        setPopupData({ title: "Birthday List Updated!" });
        setEditModalBirth(null); // Tutup modal edit
        fetchSemuaData(); // Refresh tabel
      }
    } catch (err) {
      console.error("Gagal mengupdate:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleEditAdmin = (item) => {
    seteditModalAdm(item.id_admin);
    setNewAdminNameUpdate(item.name_admin);
    setNewAdminPasswordUpdate(item.password_admin);
    setNewAdminLevelUpdate(item.level_admin);
  };
  const handleupdateAdmin = async () => {
    if (!newAdminNameUpdate || !newAdminPasswordUpdate || !newAdminLevelUpdate)
      return alert("Isi form dengan lengkap!");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/${editModalAdm}`, {
        method: "PUT", // Gunakan PUT atau PATCH sesuai setting backend kamu
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenJWT}`,
        },
        body: JSON.stringify({
          name_admin: newAdminNameUpdate,
          password_admin: newAdminPasswordUpdate,
          level_admin: newAdminLevelUpdate,
        }),
      });
      if (res.ok) {
        setPopupData({ title: "List Admin sudah dirubah" });
        seteditModalAdm(null); // Tutup modal edit
        fetchSemuaData(); // Refresh tabel
      }
    } catch (err) {
      console.error("Gagal mengupdate:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- FUNGSI DELETE (DELETE) ---
  const handleDelete = async (id_announcement) => {
    // Gunakan konfirmasi bawaan browser agar aman
    const isConfirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus pengumuman ini?",
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/announcements/${id_announcement}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenJWT}`,
        },
      });
      if (res.ok) {
        setPopupData({ title: "Announcement Deleted!" });
        fetchSemuaData(); // Refresh tabel setelah dihapus
      }
    } catch (err) {
      console.error("Gagal menghapus:", err);
    }
  };
  const handleDeleteBirh = async (id_birthday) => {
    // Gunakan konfirmasi bawaan browser agar aman
    const isConfirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus List ini?",
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/birthdays/${id_birthday}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenJWT}`,
        },
      });
      if (res.ok) {
        setPopupData({ title: "List Deleted!" });
        fetchSemuaData(); // Refresh tabel setelah dihapus
      }
    } catch (err) {
      console.error("Gagal menghapus:", err);
    }
  };

  const handleDeleteAdmin = async (id_admin) => {
    const isConfirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus List ini?",
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/admin/${id_admin}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenJWT}`,
        },
      });
      if (res.ok) {
        setPopupData({ title: "List Deleted!" });
        fetchSemuaData(); // Refresh tabel setelah dihapus
      }
    } catch (err) {
      console.error("Gagal menghapus:", err);
    }
  };
  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* POPUP NOTIFIKASI */}
      {popupData && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-6">
              {popupData.title}
            </h3>
            <button
              onClick={() => setPopupData(null)}
              className="w-full bg-[#1e3a8a] text-white font-bold py-3 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {editModalData !== null && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                ✏️ Edit Announcement
              </h3>
              <button
                onClick={() => setEditModalData(null)}
                className="text-slate-400 hover:text-red-500 font-bold text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Input Tanggal */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editAnnDate}
                  onChange={(e) => setEditAnnDate(e.target.value)}
                  className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50"
                />
              </div>

              {/* Input Textarea */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Announcement Details
                </label>
                <textarea
                  value={editAnnouncementText}
                  onChange={(e) => setEditAnnouncementText(e.target.value)}
                  className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50 min-h-[120px] resize-y"
                  placeholder="Update event details..."
                ></textarea>
              </div>

              {/* Tombol Aksi */}
              <div className="flex gap-3 mt-6 pt-2">
                <button
                  onClick={() => setEditModalData(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 border border-slate-300 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAnnouncement}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-colors disabled:bg-slate-400 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? "⏳ Saving..." : "💾 Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editModalBirth !== null && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              🎁 Update Birthday
            </h3>
            <form className="space-y-4">
              <input
                type="text"
                placeholder="Student or Teacher Name..."
                required
                value={editBirthName}
                onChange={(e) => seteditBirthName(e.target.value)}
                className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  required
                  value={editBirtDate}
                  onChange={(e) => settBirtDat(e.target.value)}
                  className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
                <div className="flex gap-2">
                  <label
                    className={`flex-1 flex items-center justify-center border rounded-lg cursor-pointer ${editBirtGender === "Male" ? "bg-blue-50 border-blue-500 text-blue-700 font-bold" : "hover:bg-slate-50"}`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      onChange={(e) => setBirtGender(e.target.value)}
                      className="hidden"
                    />
                    👨 Male
                  </label>
                  <label
                    className={`flex-1 flex items-center justify-center border rounded-lg cursor-pointer ${editBirtGender === "Female" ? "bg-pink-50 border-pink-500 text-pink-700 font-bold" : "hover:bg-slate-50"}`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      onChange={(e) => setBirtGender(e.target.value)}
                      className="hidden"
                    />
                    👩 Female
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-2">
                <button
                  onClick={() => setEditModalBirth(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 border border-slate-300 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBirth}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-colors disabled:bg-slate-400 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? "⏳ Saving..." : "💾 Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editModalAdm !== null && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="mb-10 max-w-2xl bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              👥 Add New Admin
            </h3>

            <form className="space-y-5">
              {/* Input Nama Admin */}
              <input
                type="text"
                placeholder="Teacher Name..."
                required
                value={newAdminNameUpdate}
                onChange={(e) => setNewAdminNameUpdate(e.target.value)}
                className="w-full border border-slate-300 p-4 rounded-xl text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all"
              />

              {/* Input Password Admin (sebelumnya placeholder-nya sama, saya asumsikan ini untuk password) */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password..."
                  required
                  value={newAdminPasswordUpdate}
                  onChange={(e) => setNewAdminPasswordUpdate(e.target.value)}
                  // Tambahkan pr-12 (padding-right) agar teks tidak tertimpa icon
                  className="w-full border border-slate-300 p-4 pr-12 rounded-xl text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all"
                />

                {/* Tombol Show/Hide */}
                <button
                  type="button" // Sangat penting agar form tidak tersubmit saat tombol ini diklik
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1e3a8a] transition-colors focus:outline-none flex items-center justify-center"
                >
                  {showPassword ? (
                    // Icon Eye Slash (Sembunyikan) - Bisa diganti SVG/react-icons
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    // Icon Eye (Tampilkan) - Bisa diganti SVG/react-icons
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {/* Tombol Pilihan Level (Super / Admin) */}
              <div className="flex gap-4 w-1/2 pt-2 pb-4">
                <label
                  className={`flex-1 flex items-center justify-center py-2.5 rounded-full border text-sm font-bold cursor-pointer transition-all duration-200 ${
                    newAdminLevelUpdate === "Super"
                      ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="adminLevel"
                    value="Super"
                    onChange={(e) => setNewAdminLevelUpdate(e.target.value)}
                    className="hidden"
                  />
                  Super
                </label>

                <label
                  className={`flex-1 flex items-center justify-center py-2.5 rounded-full border text-sm font-bold cursor-pointer transition-all duration-200 ${
                    newAdminLevelUpdate === "Normal"
                      ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="adminLevel"
                    value="Normal"
                    onChange={(e) => setNewAdminLevelUpdate(e.target.value)}
                    className="hidden"
                  />
                  Admin
                </label>
              </div>

              {/* Tombol Submit */}
              <div className="flex gap-3 mt-8 pt-2">
                <button
                  onClick={handleupdateAdmin}
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#283593] text-white font-bold py-3.5 rounded-xl hover:bg-blue-800 transition-colors"
                >
                  {isSubmitting ? "Adding..." : "Add Admin"}
                </button>
                <button
                  className="flex-1 bg-white text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-colors"
                  onClick={() => {
                    seteditModalAdm(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1e3a8a] text-white flex flex-col shadow-2xl transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-8 border-b border-blue-800 text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-blue-400 bg-blue-600 flex items-center justify-center text-4xl">
            👨‍💼
          </div>
          <h1 className="text-xl font-bold tracking-wider uppercase">
            {username}
          </h1>
          <span className="inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/50">
            {role === "Super" ? "SUPER ADMIN" : "ADMIN"}
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {visibleMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                // --- BAGIAN YANG DIUBAH MULAI DI SINI ---
                if (item.id === "logout_admin") {
                  handleLogout(); // Panggil fungsi logout jika menu keluar diklik
                } else {
                  setActiveTab(item.id); // Buka tab seperti biasa
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }
                // --- BAGIAN YANG DIUBAH SELESAI ---
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left font-medium ${activeTab === item.id ? "bg-white text-[#1e3a8a] shadow-lg" : "text-blue-100 hover:bg-blue-800"}`}
            >
              <span className="text-xl">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main
        className={`flex-1 flex flex-col h-screen transition-all ${isSidebarOpen ? "md:ml-72" : "ml-0"}`}
      >
        {/* TOP NAVBAR (DATE PICKER) */}
        <header className="bg-white shadow-sm px-6 py-4 flex flex-col sm:flex-row justify-between items-center z-10 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-slate-100 hover:bg-blue-100 rounded-lg text-slate-600"
            >
              ☰
            </button>
            <h2 className="text-xl font-black text-[#1a237e] uppercase tracking-tight">
              {activeTab.replace("_", " ")}
            </h2>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200 w-full sm:w-auto">
            <label className="text-sm font-semibold text-slate-600 uppercase">
              Dashboard Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-3 py-1 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            />
          </div>
        </header>

        <div className="p-4 sm:p-8 flex-1 overflow-y-auto bg-slate-50">
          <div className="w-full max-w-6xl mx-auto space-y-8">
            {/* --- TOP DASHBOARD: TAMPIL SELALU (HARI INI) --- */}
            {/* Kolom Kiri: Events Hari Ini */}

            {/* Kolom Kanan: Birthdays Hari Ini */}

            {/* --- KONTEN BERDASARKAN TAB YANG DIPILIH --- */}

            {/* TAB: ANNOUNCEMENTS */}
            {activeTab === "Announcements" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                {/* Form Tambah Pengumuman */}
                <div className="mb-10 max-w-xl">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">
                    📝 Create Announcement
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="date"
                      value={newAnnDate}
                      onChange={(e) => setNewAnnDate(e.target.value)}
                      className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      placeholder="Event details..."
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    ></textarea>
                    <button
                      onClick={handlePostAnnouncement}
                      disabled={isSubmitting}
                      className="w-full bg-[#1e3a8a] text-white py-3 rounded-lg font-bold hover:bg-blue-800 disabled:bg-slate-400"
                    >
                      Post Announcement
                    </button>
                  </div>
                </div>

                {/* Tabel Riwayat Pengumuman dengan Fitur SEARCH */}
                {/* Tabel Riwayat Pengumuman dengan Fitur SEARCH */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800">
                    📋 Announcement History
                  </h3>
                  <input
                    type="text"
                    placeholder="Search dates or names..."
                    value={searchAnnouncements}
                    onChange={(e) => setSearchAnnouncements(e.target.value)}
                    className="border p-2 rounded-lg w-64 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div className="overflow-x-auto border rounded-lg mb-4 shadow-sm bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                      <tr>
                        <th className="p-4 w-1/4">Date</th>
                        <th className="p-4 w-1/4">Announcement</th>
                        <th className="p-4 w-1/2">Made By</th>
                        <th className="p-4 w-1/4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAnnData.length > 0 ? (
                        currentAnnData.map((item) => (
                          <tr
                            key={item.id_announcement}
                            className="border-b hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-4 whitespace-nowrap font-medium text-slate-800">
                              {item.date}
                            </td>
                            <td className="p-4 whitespace-nowrap font-medium text-slate-800">
                              {item.announcement}
                            </td>
                            <td className="p-4 font-bold text-[#1e3a8a]">
                              {/* Menampilkan Nama Relasi Jika Ada, Jika Tidak Tampilkan Default Berdasarkan ID */}
                              {item.admin_pembuat.name_admin}
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                {/* TOMBOL EDIT/UPDATE */}
                                {/* TOMBOL EDIT/UPDATE (YANG BENAR) */}
                                <button
                                  onClick={() => handleEditClick(item)}
                                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-all cursor-pointer"
                                >
                                  Edit
                                </button>
                                {/* TOMBOL DELETE */}
                                <button
                                  onClick={() =>
                                    handleDelete(item.id_announcement)
                                  }
                                  className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="3"
                            className="p-8 text-center text-slate-500 italic"
                          >
                            No matching announcements found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* --- UI PAGINATION ADMIN --- */}
                {totalAnnPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 rounded-b-lg sm:px-6">
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-700">
                          Showing{" "}
                          <span className="font-bold">
                            {(currentAnnPage - 1) * itemsPerPage + 1}
                          </span>{" "}
                          to{" "}
                          <span className="font-bold">
                            {Math.min(
                              currentAnnPage * itemsPerPage,
                              filteredAnnouncements.length,
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="font-bold">
                            {filteredAnnouncements.length}
                          </span>{" "}
                          results
                        </p>
                      </div>
                      <div>
                        <nav
                          className="inline-flex -space-x-px rounded-md shadow-sm"
                          aria-label="Pagination"
                        >
                          {/* Tombol Previous */}
                          <button
                            onClick={() =>
                              setCurrentAnnPage(currentAnnPage - 1)
                            }
                            disabled={currentAnnPage === 1}
                            className="relative inline-flex items-center px-2 py-2 text-slate-400 rounded-l-md ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>

                          {/* Angka Halaman */}
                          {[...Array(totalAnnPages)].map((_, index) => (
                            <button
                              key={index + 1}
                              onClick={() => setCurrentAnnPage(index + 1)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                                currentAnnPage === index + 1
                                  ? "z-10 bg-[#1e3a8a] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a8a]"
                                  : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}

                          {/* Tombol Next */}
                          <button
                            onClick={() =>
                              setCurrentAnnPage(currentAnnPage + 1)
                            }
                            disabled={currentAnnPage === totalAnnPages}
                            className="relative inline-flex items-center px-2 py-2 text-slate-400 rounded-r-md ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BIRTHDAYS */}
            {activeTab === "Birthday List" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                {/* Form Tambah Ulang Tahun */}
                <div className="mb-10 max-w-2xl">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">
                    🎁 Add New Birthday
                  </h3>
                  <form onSubmit={handlePostBirthday} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Student or Teacher Name..."
                      required
                      value={newBdayName}
                      onChange={(e) => setNewBdayName(e.target.value)}
                      className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="date"
                        required
                        value={newBdayDate}
                        onChange={(e) => setNewBdayDate(e.target.value)}
                        className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                      />
                      <div className="flex gap-2">
                        <label
                          className={`flex-1 flex items-center justify-center border rounded-lg cursor-pointer ${newBdayGender === "Male" ? "bg-blue-50 border-blue-500 text-blue-700 font-bold" : "hover:bg-slate-50"}`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value="Male"
                            onChange={(e) => setNewBdayGender(e.target.value)}
                            className="hidden"
                          />
                          👨 Male
                        </label>
                        <label
                          className={`flex-1 flex items-center justify-center border rounded-lg cursor-pointer ${newBdayGender === "Female" ? "bg-pink-50 border-pink-500 text-pink-700 font-bold" : "hover:bg-slate-50"}`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value="Female"
                            onChange={(e) => setNewBdayGender(e.target.value)}
                            className="hidden"
                          />
                          👩 Female
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#1e3a8a] text-white py-3 rounded-lg font-bold hover:bg-blue-800 disabled:bg-slate-400"
                    >
                      Add Birthday
                    </button>
                  </form>
                </div>

                {/* Tabel Riwayat Ulang Tahun dengan Fitur SEARCH */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800">
                    📋 Birthday Directory
                  </h3>
                  <input
                    type="text"
                    placeholder="Search name, date, or gender..."
                    value={searchBirthdays}
                    onChange={(e) => setSearchBirthdays(e.target.value)}
                    className="border p-2 rounded-lg w-64 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div className="overflow-x-auto border rounded-lg mb-4 shadow-sm bg-white">
                  {/* PERUBAHAN UTAMA: Tambah border-collapse dan border utama */}
                  <table className="w-full text-sm text-left border-collapse border border-slate-200">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b-2 border-slate-300">
                      <tr>
                        {/* PERUBAHAN: Tambah border-r pada setiap th untuk garis vertikal */}
                        <th className="p-4 md:px-6 w-1/4 border-r border-slate-200">
                          Date
                        </th>
                        <th className="p-4 md:px-6 w-1/3 border-r border-slate-200">
                          Name
                        </th>
                        <th className="p-4 md:px-6 w-1/4 border-r border-slate-200 text-center">
                          Gender
                        </th>
                        <th className="p-4 md:px-6 w-[15%] text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBdayData.length > 0 ? (
                        currentBdayData.map((item) => (
                          <tr
                            key={item.id_birthday}
                            className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors duration-150"
                          >
                            {/* PERUBAHAN: Tambah border-r pada setiap td */}
                            <td className="p-4 md:px-6 whitespace-nowrap font-medium text-slate-800 border-r border-slate-200">
                              {item.date}
                            </td>
                            <td className="p-4 md:px-6 font-bold text-[#1e3a8a] border-r border-slate-200">
                              {item.name}
                            </td>
                            <td className="p-4 md:px-6 border-r border-slate-200 text-center">
                              <span
                                className={`inline-flex px-3 py-1.5 rounded-md text-xs font-bold items-center justify-center gap-1.5 ${
                                  item.gender === "Male"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-pink-100 text-pink-800"
                                }`}
                              >
                                {item.gender}
                              </span>
                            </td>
                            <td className="p-4 md:px-6">
                              {/* Posisi tombol dirapikan agar sejajar di tengah */}
                              <div className="flex items-center justify-center gap-2.5">
                                <button
                                  onClick={() => handleEditClickBirth(item)}
                                  className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteBirh(item.id_birthday)
                                  }
                                  className="px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="4"
                            className="p-8 text-center text-slate-500 italic"
                          >
                            No birthdays found matching "{searchBirthdays}".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* --- UI PAGINATION ADMIN --- */}
                {totalBdayPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 rounded-b-lg sm:px-6">
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-700">
                          Showing{" "}
                          <span className="font-bold">
                            {(currentBdayPage - 1) * itemsPerPage + 1}
                          </span>{" "}
                          to{" "}
                          <span className="font-bold">
                            {Math.min(
                              currentBdayPage * itemsPerPage,
                              filteredBirthdays.length,
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="font-bold">
                            {filteredBirthdays.length}
                          </span>{" "}
                          results
                        </p>
                      </div>
                      <div>
                        <nav
                          className="inline-flex -space-x-px rounded-md shadow-sm"
                          aria-label="Pagination"
                        >
                          {/* Tombol Previous */}
                          <button
                            onClick={() =>
                              setCurrentBdayPage(currentBdayPage - 1)
                            }
                            disabled={currentBdayPage === 1}
                            className="relative inline-flex items-center px-2 py-2 text-slate-400 rounded-l-md ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>

                          {/* Angka Halaman */}
                          {[...Array(totalBdayPages)].map((_, index) => (
                            <button
                              key={index + 1}
                              onClick={() => setCurrentBdayPage(index + 1)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                                currentBdayPage === index + 1
                                  ? "z-10 bg-[#1e3a8a] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a8a]"
                                  : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}

                          {/* Tombol Next */}
                          <button
                            onClick={() =>
                              setcurrentAdmPage(currentBdayPage + 1)
                            }
                            disabled={currentBdayPage === totalBdayPages}
                            className="relative inline-flex items-center px-2 py-2 text-slate-400 rounded-r-md ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ADNUB LEVEL */}
            {activeTab === "Manage Admin" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                {/* Form Tambah Ulang Tahun */}
                <div className="mb-10 max-w-2xl bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    👥 Add New Admin
                  </h3>

                  <form className="space-y-5" onSubmit={handlePostAdmin}>
                    {/* Input Nama Admin */}
                    <input
                      type="text"
                      placeholder="Teacher Name..."
                      required
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="w-full border border-slate-300 p-4 rounded-xl text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all"
                    />

                    {/* Input Password Admin (sebelumnya placeholder-nya sama, saya asumsikan ini untuk password) */}
                    {/* Input Password Admin */}
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password..."
                        required
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        // Tambahkan pr-12 (padding-right) agar teks tidak tertimpa icon
                        className="w-full border border-slate-300 p-4 pr-12 rounded-xl text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all"
                      />

                      {/* Tombol Show/Hide */}
                      <button
                        type="button" // Sangat penting agar form tidak tersubmit saat tombol ini diklik
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1e3a8a] transition-colors focus:outline-none flex items-center justify-center"
                      >
                        {showPassword ? (
                          // Icon Eye Slash (Sembunyikan) - Bisa diganti SVG/react-icons
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                            />
                          </svg>
                        ) : (
                          // Icon Eye (Tampilkan) - Bisa diganti SVG/react-icons
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    {/* Tombol Pilihan Level (Super / Admin) */}
                    <div className="flex gap-4 w-1/2 pt-2 pb-4">
                      <label
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-full border text-sm font-bold cursor-pointer transition-all duration-200 ${
                          newAdminLevel === "Super"
                            ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
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
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-full border text-sm font-bold cursor-pointer transition-all duration-200 ${
                          newAdminLevel === "Normal"
                            ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
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

                    {/* Tombol Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#283593] hover:bg-[#1a237e] text-white font-bold py-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-slate-400 disabled:shadow-none"
                    >
                      {isSubmitting ? "Adding..." : "Add Admin"}
                    </button>
                  </form>
                </div>

                {/* Tabel Riwayat Ulang Tahun dengan Fitur SEARCH */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800">
                    📋 ADMIN LIST
                  </h3>
                  <input
                    type="text"
                    placeholder="Search name, date, or gender..."
                    value={searchAdm}
                    onChange={(e) => setsearchAdm(e.target.value)}
                    className="border p-2 rounded-lg w-64 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div className="overflow-x-auto border rounded-lg mb-4">
                  <table className="w-full text-sm text-left border-collapse border border-slate-200">
                    <thead>
                      <tr>
                        <th className="p-4 md:px-6 whitespace-nowrap font-medium text-slate-800 border-r border-slate-200 w-[30%]">
                          Name
                        </th>
                        <th className="p-4 md:px-6 font-bold text-[#1e3a8a] border-r border-slate-200 w-[30%]">
                          Password
                        </th>
                        <th className="p-4 md:px-6 border-r border-slate-200 text-center w-[20%]">
                          Level
                        </th>
                        <th className="p-4 md:px-6 text-center w-[20%]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAdmData.length > 0 ? (
                        currentAdmData.map((item) => (
                          <tr
                            key={item.id_admin}
                            className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors duration-150"
                          >
                            {/* PERUBAHAN: Tambahkan border-r di setiap td untuk garis pembatas vertikal */}
                            <td className="p-4 md:px-6 font-bold text-slate-800 border-r border-slate-200">
                              {item.name_admin}
                            </td>
                            <td className="p-4 md:px-6 font-bold text-[#1e3a8a] border-r border-slate-200">
                              {item.password_admin}
                            </td>
                            <td className="p-4 md:px-6 border-r border-slate-200 text-center">
                              {/* PERUBAHAN: Ganti item.gender menjadi item.level_admin */}
                              <span
                                className={`inline-flex px-3 py-1.5 rounded-md text-xs font-bold items-center justify-center gap-1.5 ${
                                  item.level_admin === "Super"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {item.level_admin}
                              </span>
                            </td>
                            <td className="p-4 md:px-6">
                              <div className="flex items-center justify-center gap-2.5">
                                <button
                                  onClick={() => handleEditAdmin(item)}
                                  className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteAdmin(item.id_admin)
                                  }
                                  className="px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="3"
                            className="p-8 text-center text-slate-500 italic"
                          >
                            No birthdays found matching "{searchBirthdays}".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalAdmPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 rounded-b-lg sm:px-6">
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-700">
                          Showing{" "}
                          <span className="font-bold">
                            {(currentAdmPage - 1) * itemsPerPage + 1}
                          </span>{" "}
                          to{" "}
                          <span className="font-bold">
                            {Math.min(
                              currentAdmPage * itemsPerPage,
                              filteredAdmin.length,
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="font-bold">
                            {filteredAdmin.length}
                          </span>{" "}
                          results
                        </p>
                      </div>
                      <div>
                        <nav
                          className="inline-flex -space-x-px rounded-md shadow-sm"
                          aria-label="Pagination"
                        >
                          {/* Tombol Previous */}
                          <button
                            onClick={() =>
                              setcurrentAdmPage(currentAdmPage - 1)
                            }
                            disabled={currentAdmPage === 1}
                            className="relative inline-flex items-center px-2 py-2 text-slate-400 rounded-l-md ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>

                          {/* Angka Halaman */}
                          {[...Array(totalAdmPages)].map((_, index) => (
                            <button
                              key={index + 1}
                              onClick={() => setcurrentAdmPage(index + 1)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                                currentAdmPage === index + 1
                                  ? "z-10 bg-[#1e3a8a] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a8a]"
                                  : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}

                          {/* Tombol Next */}
                          <button
                            onClick={() =>
                              setcurrentAdmPage(currentAdmPage + 1)
                            }
                            disabled={currentAdmPage === totalAdmPages}
                            className="relative inline-flex items-center px-2 py-2 text-slate-400 rounded-r-md ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
