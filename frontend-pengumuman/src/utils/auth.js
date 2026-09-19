/**
 * Helper Keamanan Autentikasi JWT (Masa Aktif 12 Jam)
 * Cita Hati East Surabaya - Admin Portal
 */

export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("Gagal mendecode payload JWT:", err);
    return null;
  }
}

/**
 * Memeriksa apakah token JWT sudah expired (melewati batas 12 jam)
 * @param {string} token - Token JWT dari localStorage
 * @returns {boolean} true jika token hilang, rusak, atau sudah melewati waktu exp
 */
export function isTokenExpired(token) {
  if (!token || token === "undefined" || token === "null") return true;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;

  // exp dalam detik, bandingkan dengan Date.now() dalam milidetik
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime >= payload.exp;
}

/**
 * Menghapus seluruh sesi admin dari browser
 */
export function clearAdminSession() {
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
  localStorage.removeItem("id_admin");
}

/**
 * Mendapatkan token JWT yang masih valid.
 * Jika sudah expired, langsung bersihkan sesi dan kembalikan null.
 */
export function getValidAdminToken() {
  const token = localStorage.getItem("jwt_token");
  if (isTokenExpired(token)) {
    clearAdminSession();
    return null;
  }
  return token;
}

/**
 * Menghitung sisa waktu sesi admin dalam format yang mudah dibaca (jam dan menit)
 */
export function getSessionRemainingTime(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return { isExpired: true, text: "Expired" };

  const currentTime = Math.floor(Date.now() / 1000);
  const remainingSeconds = payload.exp - currentTime;

  if (remainingSeconds <= 0) {
    return { isExpired: true, text: "Sesi Habis" };
  }

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);

  return {
    isExpired: false,
    hours,
    minutes,
    remainingSeconds,
    text: `${hours} jam ${minutes} menit`,
  };
}

/**
 * Eksekusi pengalihan ketika sesi berakhir
 */
export function handleSessionExpired(navigate, message = "Sesi login Anda telah berakhir (masa berlaku 12 jam telah habis). Silakan login kembali.") {
  clearAdminSession();
  if (message) {
    try {
      sessionStorage.setItem("auth_expired_msg", message);
    } catch (e) {}
  }
  if (navigate) {
    navigate("/login?expired=1", { replace: true });
  } else {
    window.location.href = "/login?expired=1";
  }
}
