// ✅ ShifoCRM bemorlar bo‘limi (patients.js)

// === Asosiy sozlamalar ===
const API_URL = "http://localhost:5001/patients";
const sidebar = document.getElementById("sidebar");
const openSidebar = document.getElementById("openSidebar");
const closeSidebar = document.getElementById("closeSidebar");
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
const profileNameEl = document.getElementById("profileName");
const profileAvatarEl = document.getElementById("profileAvatar");



let patientsData = [];
let sortKey = null;
let sortAsc = true;

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

if (closeSidebar) {
  closeSidebar.addEventListener("click", () => {
    sidebar.classList.remove("active");
    sidebarOverlay.classList.add("hidden");
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

// === Ma’lumotlarni yuklash ===
async function loadPatients(query = "") {
  try {
    const res = await fetch(API_URL);
    const raw = await res.json();
    patientsData = Array.isArray(raw) ? raw : [];

    // 👇 localStorage'dagi doctor.id bo‘yicha filter
    const doctor = JSON.parse(localStorage.getItem("doctor") || "null");
    let filtered = patientsData;
    if (doctor && doctor.id) {
      filtered = filtered.filter((p) => String(p.doctorId) === String(doctor.id));
    }

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
      );
    }

    renderPatients(filtered);
  } catch (err) {
    console.error("loadPatients error:", err);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">❌ Server bilan aloqa yo'q</td></tr>`;
    }
  }
}

// === Jadvalni chiqarish ===
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
      <td class="px-4 py-3 flex items-center justify-center gap-3">
        <button class="text-blue-600 hover:text-blue-800" title="Tafsilotlar">
          <i class="ri-user-heart-line text-lg"></i>
        </button>
        <button class="text-red-500 hover:text-red-700" title="O‘chirish">
          <i class="ri-delete-bin-6-line text-lg"></i>
        </button>
      </td>
    `;

    const [btnView, btnDelete] = tr.querySelectorAll("button");

    btnView.addEventListener("click", (e) => {
      e.stopPropagation();
      openPatientDetails(p.id);
    });

    btnDelete.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deletePatient(p.id);
    });

    tableBody.appendChild(tr);
  });
}

// === 🧩 O‘chirish funksiyasi ===
async function deletePatient(id) {
  if (!confirm("Rostdan ham ushbu bemorni o‘chirmoqchimisiz?")) return;

  try {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    showToast("🗑️ Bemor o‘chirildi", "success");
    await loadPatients();
  } catch (err) {
    console.error("delete error:", err);
    showToast("❌ O‘chirishda xato yuz berdi", "error");
  }
}

// === Yangi bemor qo'shish funksiyasi ===
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


function openPatientDetails(id) {
  const patient = patientsData.find((p) => String(p.id) === String(id));
  if (!patient) return showToast("Bemor topilmadi", "error");

  const age = getAge(patient.birthDate);
  const statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-semibold ${patient.status === "Faol"
    ? "bg-primary/10 text-primary"
    : patient.status === "Kutilmoqda"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-200 text-gray-600"
    }">${patient.status}</span>`;

  patientDetails.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-6">
        <div class="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md">
            ${patient.name.charAt(0).toUpperCase()}
        </div>
        <div class="flex-1">
            <h3 class="text-3xl font-extrabold text-gray-900">${patient.name}</h3>
            <p class="text-sm text-gray-500">Bemor ID: #${patient.id}</p>
        </div>
        <div class="mt-2 sm:mt-0">${statusBadge}</div>
    </div>

    <div class="space-y-6">
        <div class="bg-gray-50 p-5 rounded-2xl shadow-sm border border-gray-100">
            <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 text-primary">
                <i class="ri-user-3-line"></i> Shaxsiy ma’lumotlar
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-gray-700 text-sm">
                ${renderDetailItem('phone', patient.phone, 'Telefon', 'ri-phone-line', 'primary')}
                ${renderDetailItem('birthDate', patient.birthDate, 'Tug\'ilgan sana', 'ri-calendar-line', 'accent')}
                ${renderDetailItem('age', age + (age !== '—' ? ' yosh' : ''), 'Yoshi', 'ri-cake-line', 'orange-500')}
                ${renderDetailItem('gender', patient.gender, 'Jins', 'ri-men-line', 'purple-600')}
                <div class="md:col-span-3">
                    ${renderDetailItem('address', patient.address || 'Ma’lumot yo‘q', 'Manzil', 'ri-map-pin-line', 'red-600')}
                </div>
            </div>
        </div>

        <div class="bg-gray-50 p-5 rounded-2xl shadow-sm border border-gray-100">
            <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 text-primary">
                <i class="ri-money-dollar-circle-line"></i> Tibbiy va Moliyaviy
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-gray-700 text-sm">
                ${renderDetailItem('lastVisit', patient.lastVisit, 'Oxirgi Tashrif', 'ri-calendar-check-line', 'indigo-500')}
                ${renderDetailItem('price', patient.price ? patient.price.toLocaleString() + ' so‘m' : '—', 'To\'langan Narx', 'ri-bank-card-line', 'teal-600')}
            </div>
        </div>
        
        <div class="bg-gray-50 p-5 rounded-2xl shadow-sm border border-gray-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 text-primary">
                 <i class="ri-file-text-line"></i> Qo‘shimcha Izoh
            </h4>
            <div class="p-3 bg-white rounded-xl border text-sm text-gray-700 min-h-20 whitespace-pre-wrap">
                ${patient.description || "Bemor bo‘yicha qo‘shimcha izoh kiritilmagan."}
            </div>
        </div>
    </div>
  `;
  openModal(viewPatientModal);
  const editBtn = document.getElementById("editPatientBtn");
  editBtn.onclick = () => openEditPatientForm(patient);
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

function openEditPatientForm(patient) {
  patientDetails.innerHTML = `
    <form id="editPatientForm" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Ism Familiya</label>
          <input type="text" name="name" value="${patient.name}" required
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Tug'ilgan sana</label>
          <input type="date" name="birthDate" value="${patient.birthDate || ""}"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Jins</label>
          <select name="gender"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            <option value="Erkak" ${patient.gender === "Erkak" ? "selected" : ""}>Erkak</option>
            <option value="Ayol" ${patient.gender === "Ayol" ? "selected" : ""}>Ayol</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Telefon</label>
          <input type="text" name="phone" value="${patient.phone}"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
        </div>
        
        <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-600 mb-1">Manzil</label>
            <input type="text" name="address" value="${patient.address || ""}"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Oxirgi tashrif</label>
          <input type="date" name="lastVisit" value="${patient.lastVisit || ""}"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Status</label>
          <select name="status"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            <option value="Faol" ${patient.status === "Faol" ? "selected" : ""}>Faol</option>
            <option value="Kutilmoqda" ${patient.status === "Kutilmoqda" ? "selected" : ""}>Kutilmoqda</option>
            <option value="Yakunlangan" ${patient.status === "Yakunlangan" ? "selected" : ""}>Yakunlangan</option>
          </select>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-600 mb-1">Narx (so‘m)</label>
          <input type="number" name="price" value="${patient.price || ""}"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">Izoh</label>
        <textarea name="description" rows="3"
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">${patient.description || ""}</textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="openPatientDetails('${patient.id}')"
          class="px-5 py-2.5 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-700 transition">
          Bekor qilish
        </button>
        <button type="submit"
          class="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-full hover:opacity-90 transition">
          💾 Saqlash
        </button>
      </div>
    </form>
  `;

  const form = document.getElementById("editPatientForm");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const updated = Object.fromEntries(fd.entries());

    updated.price = Number(updated.price) || 0;
    updated.doctorId = patient.doctorId;

    try {
      await fetch(`${API_URL}/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      showToast("✅ Ma’lumotlar yangilandi", "success");
      await loadPatients();
      openPatientDetails(patient.id);
    } catch (err) {
      console.error(err);
      showToast("❌ Xatolik yuz berdi", "error");
    }
  };
}

// === Qidiruv ===
if (searchInput) {
  searchInput.addEventListener("input", () => loadPatients(searchInput.value));
}

// === Modal yopish ===
window.onclick = function (event) {
  if (event.target === viewPatientModal) closeModal(viewPatientModal);
  if (event.target === addPatientModal) closeModal(addPatientModal);
};

// === Boshlang‘ich yuklash ===
function initializePage() {
  renderDoctorInfo();
  loadPatients();
  if (addPatientBtn) addPatientBtn.addEventListener("click", () => openModal(addPatientModal));
  if (cancelAddPatient) cancelAddPatient.addEventListener("click", () => closeModal(addPatientModal));
}

// === Shifokor ma’lumotini headerga chiqarish ===
function renderDoctorInfo() {
  const doctor = JSON.parse(localStorage.getItem("doctor") || "null");
  const doctorNameElement = document.getElementById("doctorName");
  const doctorAvatarElement = document.getElementById("doctorAvatar");

  if (doctor && doctor.name) {
    doctorNameElement.textContent = doctor.name;
    doctorAvatarElement.textContent = doctor.name.charAt(0).toUpperCase();
  } 
}

// Sahifani ishga tushirish
document.addEventListener("DOMContentLoaded", initializePage);

