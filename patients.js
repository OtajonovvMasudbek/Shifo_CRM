// ✅ ShifoCRM bemorlar bo‘limi (patients.js)

// === Asosiy sozlamalar ===
const API_URL = "https://shifo-crm-8.onrender.com/patients";
const sidebar = document.getElementById("sidebar");
const openSidebar = document.getElementById("openSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const tableBody = document.getElementById("patientsTableBody");
const addPatientBtn = document.getElementById("addPatientBtn");
const addPatientModal = document.getElementById("addPatientModal");
const cancelAddPatient = document.getElementById("cancelAddPatient");
const addPatientForm = document.getElementById("addPatientForm");
const searchInput = document.getElementById("searchInput");
const viewPatientModal = document.getElementById("viewPatientModal");
const patientDetails = document.getElementById("patientDetails");
const toastContainer = document.getElementById("toastContainer");

// --- YANGI QO'SHILGAN O'ZGARUVCHILAR ---
const statusFilter = document.getElementById("statusFilter");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const patientsPerPageEl = document.getElementById("patientsPerPage");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const currentPageIndicator = document.getElementById("currentPageIndicator");
const totalPatientsCountEl = document.getElementById("totalPatientsCount");
const doctorNameEl = document.getElementById("doctorName");
const profileAvatarEl = document.getElementById("profileAvatar");

// --- PAGINATSIYA VA FILTR O'ZGARUVCHILARI ---
let patientsData = [];
let sortKey = null;
let sortAsc = true;
let currentPage = 1; // Hozirgi sahifa
let patientsPerPage = 10; // Sahifadagi bemorlar soni
let currentFilteredPatients = []; // Filtrdan o'tgan bemorlar ro'yxati

// === Asosiy yordamchi funksiyalar ===
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast px-4 py-3 rounded-lg shadow-md text-white flex items-center gap-2 ${type === "error"
    ? "bg-red-500"
    : type === "success"
      ? "bg-green-600"
      : "bg-blue-500"
    }`;
  toast.innerHTML = `<i class="ri-information-line text-xl"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function openModal(modal) {
  modal.classList.add("active");
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.remove("active");
  modal.classList.add("hidden");
}

// === Sidebar boshqaruvi ===
if (openSidebar) {
  openSidebar.addEventListener("click", () => {
    sidebar.classList.add("active");
    sidebarOverlay.classList.remove("hidden");
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("active");
    sidebarOverlay.classList.add("hidden");
  });
}


function getAge(birthDate) {
  if (!birthDate) return "—";
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : "—";
}

// === Ma’lumotlarni yuklash va filtrlash (O'ZGARGAN QISM) ===
async function loadPatients(query = "", status = "") {
  try {
    const res = await fetch(API_URL);
    const raw = await res.json();
    patientsData = Array.isArray(raw) ? raw : [];

    // 👇 Barcha ma’lumotlarni qabul qilish. Doktor ID bo‘yicha filtrlash olib tashlandi.
    let filtered = patientsData;

    // 👇 Status bo‘yicha filter
    const currentStatus = status || (statusFilter ? statusFilter.value : "");
    if (currentStatus) {
      filtered = filtered.filter((p) => p.status === currentStatus);
    }

    // 👇 Qidiruv bo‘yicha filter
    const currentQuery = query || (searchInput ? searchInput.value : "");
    if (currentQuery) {
      const q = currentQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
      );
    }

    currentFilteredPatients = filtered;
    currentPage = 1; // Yangi filtrlashda sahifani 1 ga qaytarish
    updateView(); // Paginatsiya va jadvalni yangilash
  } catch (err) {
    console.error("loadPatients error:", err);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">❌ Server bilan aloqa yo'q</td></tr>`;
    }
  }
}

// === Paginatsiya, ma'lumotlarni saralash va jadvalni yangilash (YANGI) ===
function updateView() {
  // Saralash amali 
  if (sortKey) {
    currentFilteredPatients.sort((a, b) => {
      const aVal = a[sortKey] || "";
      const bVal = b[sortKey] || "";
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  // Paginatsiya logikasi
  const totalPatients = currentFilteredPatients.length;
  const totalPages = Math.ceil(totalPatients / patientsPerPage);

  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
  else if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * patientsPerPage;
  const end = start + patientsPerPage;
  const patientsOnPage = currentFilteredPatients.slice(start, end);

  renderPatients(patientsOnPage);

  // Paginatsiya boshqaruvini yangilash
  if (totalPatientsCountEl) totalPatientsCountEl.textContent = totalPatients;
  if (currentPageIndicator) currentPageIndicator.textContent = `${totalPages > 0 ? currentPage : 0} / ${totalPages}`;
  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1 || totalPages === 0;
  if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// === Saralash funksiyasi (HTMLda onclickga bog'langan) (YANGI) ===
window.sortTable = function (key) {
  if (sortKey === key) {
    sortAsc = !sortAsc;
  } else {
    sortKey = key;
    sortAsc = true;
  }
  updateView();
}

function renderPatients(patients) {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (!patients || patients.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">Hech qanday bemor topilmadi</td></tr>`;
    return;
  }

  patients.forEach((p) => {
    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-green-50 transition duration-150 border-b border-gray-100";

    tr.innerHTML = `
      <td class="px-4 py-3 font-medium text-gray-800">${p.name}</td>
      <td class="px-4 py-3 text-gray-700">${p.phone}</td>
      <td class="px-4 py-3 text-gray-700">${p.lastVisit || "—"}</td>
      <td class="px-4 py-3">
        <span class="px-2 py-1 rounded-full text-xs ${p.status === "Faol"
        ? "bg-green-100 text-green-700"
        : p.status === "Kutilmoqda"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-gray-100 text-gray-700"
      }">${p.status}</span>
      </td>
      <td class="p-4 text-center">
    <a href="./description.html?id=${p.id}"
        class="inline-flex items-center justify-center w-9 h-9 text-lg text-accent hover:text-blue-700 hover:bg-blue-50/50 transition duration-150 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        title="Bemor ma'lumotlarini ko'rish"
        onclick="event.stopPropagation()">
        <i class="ri-eye-line font-normal"></i>
    </a>
    
    <button data-id="${p.id}" class="delete-btn ml-2 inline-flex items-center justify-center w-9 h-9 text-lg text-red-500 hover:text-red-700 hover:bg-red-50/50 transition duration-150 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500/50"
            title="Bemor ma'lumotlarini o'chirish"
            onclick="event.stopPropagation()">
        <i class="ri-delete-bin-line font-normal"></i>
    </button>
</td>
    `;


    const btnDelete = tr.querySelector(".delete-btn");

    if (btnDelete) {
      btnDelete.addEventListener("click", async (e) => {
        e.stopPropagation();
        await deletePatient(p.id);
      });
    }

    tableBody.appendChild(tr);
  });
}

async function deletePatient(id) {
  if (!confirm("Rostdan ham ushbu bemorni o‘chirmoqchimisiz?")) return;

  try {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    showToast("Bemor o‘chirildi", "success");
    await loadPatients();
  } catch (err) {
    console.error("delete error:", err);
    showToast("❌ O‘chirishda xato yuz berdi", "error");
  }
}

// === Yangi bemor qo'shish funksiyasi (O'ZGARISHSIZ) ===
if (addPatientForm) {
  addPatientForm.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(addPatientForm);
    const newPatient = Object.fromEntries(fd.entries());

    newPatient.price = Number(newPatient.price) || 0;

    const doctor = JSON.parse(localStorage.getItem("doctor") || "null");
    if (doctor && doctor.id) {
      newPatient.doctorId = doctor.id;
    }

    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPatient),
      });
      showToast("✅ Yangi bemor qo‘shildi", "success");
      addPatientForm.reset();
      closeModal(addPatientModal);
      await loadPatients();
    } catch (err) {
      console.error(err);
      showToast("❌ Qo‘shishda xatolik yuz berdi", "error");
    }
  };
}



function renderDetailItem(key, value, label, iconClass, iconColor) {
  return `
        <div class="flex flex-col">
            <p class="font-medium text-xs uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                <i class="${iconClass} text-base text-${iconColor}"></i> ${label}
            </p>
            <p class="text-base font-semibold text-gray-800">${value || '—'}</p>
        </div>
    `;
}




function exportToCSV(patients) {
  if (patients.length === 0) return showToast("Eksport qilish uchun bemor yo‘q", "info");

  const header = ["ID", "F.I.O.", "Telefon", "Tug'ilgan sana", "Jins",  "Status", "To'langan Narx (so'm)", "Manzil", "Izoh"];

  const rows = patients.map(p => [
    p.id || '',
    p.name || '',
    `'${p.phone || ''}`,
    p.birthDate || '',
    p.gender || '',
    p.status || '',
    
    p.price || 0,
    p.address || '',
    p.description ? p.description.replace(/"/g, '""').replace(/(\r\n|\n|\r)/gm, " ") : ''
  ]);

  // CSV ma'lumotlarini tayyorlash: qatorlarni qo'shtirnoq ichiga olib, vergul bilan ajratish
  const csvContent = [
    header.join(","),
    // Har bir qiymatni qo'shtirnoq ichiga olamiz
    ...rows.map(row => row.map(e => `"${e}"`).join(","))
  ].join("\n");

  // BOM (\uFEFF) ni qo'shish. Bu o‘zbek (lotin) belgilarini Excelda to‘g‘ri ko‘rsatish uchun muhim.
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `bemorlar_royxati_${new Date().toISOString().slice(0, 10)}.csv`); // Fayl nomiga sana qo'shildi
  a.click();

  showToast("✅ Excelga eksport bajarildi!", "success");
}

// === Qidiruv ===
if (searchInput) {
  // Qidiruv maydoni o'zgarganda loadPatients ni chaqirish
  searchInput.addEventListener("input", () => loadPatients(searchInput.value));
}

// === Modal yopish (O'ZGARISHSIZ) ===
window.onclick = function (event) {
  if (event.target === viewPatientModal) closeModal(viewPatientModal);
  if (event.target === addPatientModal) closeModal(addPatientModal);
};

// === Boshlang‘ich yuklash (YANGILANGAN) ===
function initializePage() {
  renderDoctorInfo();
  loadPatients();

  if (addPatientBtn) addPatientBtn.addEventListener("click", () => openModal(addPatientModal));
  if (cancelAddPatient) cancelAddPatient.addEventListener("click", () => closeModal(addPatientModal));

  // --- YANGI HODISA TINGLOVCHILARI ---

  // Status filteri
  if (statusFilter) statusFilter.addEventListener("change", () => loadPatients(searchInput.value, statusFilter.value));

  // Excelga eksport
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => exportToCSV(currentFilteredPatients));
  }

  if (patientsPerPageEl) {
    patientsPerPageEl.addEventListener("change", (e) => {
      patientsPerPage = Number(e.target.value);
      currentPage = 1;
      updateView();
    });
  }

  // Paginatsiya boshqaruvi
  if (prevPageBtn) prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      updateView();
    }
  });

  if (nextPageBtn) nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(currentFilteredPatients.length / patientsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      updateView();
    }
  });
}
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    loadPatients(searchInput.value, statusFilter.value);
    updateView();
  }
});
function renderDoctorInfo() {
  const doctor = JSON.parse(localStorage.getItem("doctor") || "null");

  if (doctor && doctor.name) {
    if (doctorNameEl) doctorNameEl.textContent = doctor.name;
    if (profileAvatarEl) profileAvatarEl.textContent = doctor.name.charAt(0).toUpperCase();
  } else {
    if (doctorNameEl) doctorNameEl.textContent = "Profil";
    if (profileAvatarEl) profileAvatarEl.innerHTML = '<i class="ri-user-line"></i>';
  }
}

// Sahifani ishga tushirish
document.addEventListener("DOMContentLoaded", initializePage);