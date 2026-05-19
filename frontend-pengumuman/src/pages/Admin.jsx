import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

export default function Admin() {
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
  const [editModalData, setEditModalData] = useState(null);
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
  const [editAnnUrl, setEditAnnUrl] = useState("");
  const [editAnnImage, setEditAnnImage] = useState(null);

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminLevel, setNewAdminLevel] = useState("Super");

  const [newAdminNameUpdate, setNewAdminNameUpdate] = useState("");
  const [newAdminPasswordUpdate, setNewAdminPasswordUpdate] = useState("");
  const [newAdminLevelUpdate, setNewAdminLevelUpdate] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [activeTab, setActiveTab] = useState("Announcements");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [profilePhoto, setProfilePhoto] = useState(null);

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // ==========================================
  // 2. DATA STATE
  // ==========================================
  const [announcements, setAnnouncements] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [admin, setAdmin] = useState([]);

  // ==========================================
  // 3. SEARCH & PAGINATION STATE
  // ==========================================
  const [searchAnnouncements, setSearchAnnouncements] = useState("");
  const [currentAnnPage, setCurrentAnnPage] = useState(1);

  const [searchAdm, setsearchAdm] = useState("");
  const [currentAdmPage, setcurrentAdmPage] = useState(1);

  const [searchBirthdays, setSearchBirthdays] = useState("");
  const [currentBdayPage, setCurrentBdayPage] = useState(1);

  const itemsPerPage = 10;

  // ==========================================
  // 4. FORM STATE (CREATE)
  // ==========================================
  const [newAnnDate, setNewAnnDate] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [newAnnUrl, setNewAnnUrl] = useState("");
  const [newAnnImage, setNewAnnImage] = useState(null); // Gunakan null untuk file

  const [newBdayName, setNewBdayName] = useState("");
  const [newBdayDate, setNewBdayDate] = useState("");
  const [newBdayGender, setNewBdayGender] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popupData, setPopupData] = useState(null);

  // ==========================================
  // 5. FETCH DATA DARI API (GET)
  // ==========================================
  // const API_URL = "http://202.155.14.105:8000/api";
  const API_URL = "http://localhost:8000/api";

  const fetchSemuaData = async () => {
    try {
      const headers = { Authorization: `Bearer ${tokenJWT}` };

      const resAnn = await fetch(`${API_URL}/announcements-with-admin`, {
        headers,
        cache: "no-store",
      });
      const dataAnn = await resAnn.json();
      setAnnouncements(dataAnn);

      const resBday = await fetch(`${API_URL}/birthdays`, {
        headers,
        cache: "no-store",
      });
      const dataBday = await resBday.json();

      const resAdmin = await fetch(`${API_URL}/admin`, {
        headers,
        cache: "no-store",
      });
      const dataAdmin = await resAdmin.json();

      setAdmin(dataAdmin);
      setBirthdays(dataBday);
    } catch (err) {
      console.error("Gagal mengambil data ulang tahun:", err);
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
  // 7. LOGIKA SEARCH & PAGINATION TABEL
  // ==========================================
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

  useEffect(() => setCurrentAnnPage(1), [searchAnnouncements]);
  useEffect(() => setCurrentBdayPage(1), [searchBirthdays]);

  // ==========================================
  // 8. FUNGSI POST (SUBMIT DATA)
  // ==========================================
  const handlePostAnnouncement = async () => {
    if (!newAnnDate || !newAnnouncement.trim())
      return alert("Isi form dengan lengkap!");
    setIsSubmitting(true);
    console.log(newAnnImage);
    try {
      const formData = new FormData();
      formData.append("announcement", newAnnouncement);
      formData.append("tanggal_masuk", newAnnDate);
      formData.append("admin_update", id_admin);

      // Cek apakah user mengisi URL dan Gambar, jika ya, masukkan ke FormData
      if (newAnnUrl) {
        formData.append("url_announcemet", newAnnUrl);
      }
      if (newAnnImage) {
        formData.append("image", newAnnImage);
      }

      const res = await fetch(`${API_URL}/announcements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenJWT}`,
        },
        body: formData,
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
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      localStorage.removeItem("id_admin");
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
      label: "Logout",
      icon: "🚪",
      allowed: ["Normal", "Super"],
    },
  ];
  const visibleMenu = menuItems.filter((item) => item.allowed.includes(role));

  // --- FUNGSI UPDATE ---
  const handleEditClick = (item) => {
    setEditModalData(item.id_announcement);
    setEditAnnDate(item.date);
    setEditAnnouncementText(item.announcement);
    setEditAnnImage(item.url_image);
    setEditAnnUrl(item.url_announcemet);
  };

  const handleUpdateAnnouncement = async () => {
    if (!editAnnDate || !editAnnouncementText.trim())
      return alert("Isi form dengan lengkap!");
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("announcement", editAnnouncementText);
      formData.append("tanggal_masuk", editAnnDate);
      formData.append("admin_update", id_admin);

      // Kirim URL jika ada
      if (editAnnUrl) {
        formData.append("url_announcemet", editAnnUrl);
      }

      // 2. Kirim gambar HANYA JIKA user memilih gambar baru
      // Jika user tidak memilih gambar, variabel ini tidak akan dikirim
      if (editAnnImage) {
        formData.append("image", editAnnImage);
      }
      const res = await fetch(`${API_URL}/announcements/${editModalData}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenJWT}`,
        },
        body: formData,
      });
      if (res.ok) {
        setPopupData({ title: "Announcement Updated!" });
        setEditModalData(null);
        fetchSemuaData();
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
        method: "PUT",
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
        setEditModalBirth(null);
        fetchSemuaData();
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
        method: "PUT",
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
        seteditModalAdm(null);
        fetchSemuaData();
      }
    } catch (err) {
      console.error("Gagal mengupdate:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNGSI DELETE ---
  const handleDelete = async (id_announcement) => {
    const isConfirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus pengumuman ini?",
    );
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/announcements/${id_announcement}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenJWT}` },
      });
      if (res.ok) {
        setPopupData({ title: "Announcement Deleted!" });
        fetchSemuaData();
      }
    } catch (err) {
      console.error("Gagal menghapus:", err);
    }
  };

  const handleDeleteBirh = async (id_birthday) => {
    const isConfirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus List ini?",
    );
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/birthdays/${id_birthday}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenJWT}` },
      });
      if (res.ok) {
        setPopupData({ title: "List Deleted!" });
        fetchSemuaData();
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
        headers: { Authorization: `Bearer ${tokenJWT}` },
      });
      if (res.ok) {
        setPopupData({ title: "List Deleted!" });
        fetchSemuaData();
      }
    } catch (err) {
      console.error("Gagal menghapus:", err);
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
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={editAnnDate}
                  onChange={(e) => setEditAnnDate(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50 transition-all font-medium text-slate-700"
                />
              </div>

              {/* Input Link/URL */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Link URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editAnnUrl || ""} // pastikan state editAnnUrl sudah kamu buat ya
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
                {/* Tampilkan preview gambar lama jika ada, tapi belum pilih gambar baru */}
                {editAnnImage != null ? (
                  <div className="mb-2">
                    <span className="text-[10px] text-slate-400">
                      Current Image:
                    </span>
                    <img
                      src={editAnnImage}
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
                  onChange={(e) => setEditAnnImage(e.target.files[0])} // pastikan state editAnnImage dibuat
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-slate-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  Kosongkan jika tidak ingin mengubah gambar.
                </p>
              </div>

              {/* Tombol Aksi */}
              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setEditModalData(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl hover:bg-slate-200 transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateAnnouncement}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#1e3a8a] text-white font-bold py-3 rounded-2xl hover:bg-blue-800 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400 text-sm"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
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
                  Batal
                </button>
                <button
                  onClick={handleUpdateBirth}
                  disabled={isSubmitting}
                  className="flex-1 bg-pink-500 text-white font-bold py-3.5 rounded-2xl hover:bg-pink-600 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
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
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password..."
                    required
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
                  Batal
                </button>
                <button
                  onClick={handleupdateAdmin}
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-2xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
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

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* BARIS 1: Tanggal & URL */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Publish Date
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
                    <div className="relative w-full md:w-80">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Search dates or names..."
                        value={searchAnnouncements}
                        onChange={(e) => setSearchAnnouncements(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#1e3a8a] outline-none shadow-sm transition-all"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Image</th>
                          <th className="px-8 py-5">Announcement</th>
                          {/* Tambahan Header untuk URL/Link */}
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
                              <td className="px-8 py-5 font-bold text-slate-700">
                                {item.date}
                              </td>

                              <td className="px-8 py-5">
                                {item.url_image ? (
                                  <img
                                    src={item.url_image}
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

                              {/* Tambahan Kolom Data untuk Menampilkan URL/Link */}
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
                                <div className="flex justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDelete(item.id_announcement)
                                    }
                                    className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
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
                              colSpan="6" // Ubah colSpan menjadi 6 karena sekarang total ada 6 kolom
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
                        value={newBdayName}
                        onChange={(e) => setNewBdayName(e.target.value)}
                        placeholder="Full name..."
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-slate-700"
                      />
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
                                <div className="flex justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEditClickBirth(item)}
                                    className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteBirh(item.id_birthday)
                                    }
                                    className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
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
                                <div className="flex justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEditAdmin(item)}
                                    className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteAdmin(item.id_admin)
                                    }
                                    className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
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
          </div>
        </div>
      </main>
    </div>
  );
}
