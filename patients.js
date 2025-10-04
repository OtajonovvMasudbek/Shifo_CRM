
const API_URL = "https://shifo-crm-7.onrender.com/patients";
// DOM elementlar (existence tekshiriladi)
const sidebar = document.getElementById("sidebar");
const openSidebar = document.getElementById("openSidebar");
const closeSidebar = document.getElementById("closeSidebar");
const tableBody = document.getElementById("patientsTableBody");
const addPatientBtn = document.getElementById("addPatientBtn");
const addPatientModal = document.getElementById("addPatientModal");
const cancelAddPatient = document.getElementById("cancelAddPatient");
const addPatientForm = document.getElementById("addPatientForm");
const searchInput = document.getElementById("searchInput");
const viewPatientModal = document.getElementById("viewPatientModal");
const patientDetails = document.getElementById("patientDetails");
const toastContainer = document.getElementById("toastContainer");
const navItems = document.querySelectorAll(".nav-item");

let patientsData = [];
let sortKey = null;
let sortAsc = true;
let debounceTimeout = null;
openSidebar?.addEventListener("click", () => sidebar.classList.remove("-translate-x-full"));
closeSidebar?.addEventListener("click", () => sidebar.classList.add("-translate-x-full"));
// --- Utility helpers ---
function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast px-4 py-3 rounded-lg shadow-md text-white flex items-center gap-2 ${type === "error" ? "bg-red-500" : type === "success" ? "bg-green-500" : "bg-blue-500"
    }`;
  toast.innerHTML = `<i class="ri-information-line text-xl"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.style.animation = "fadeOut 1s forwards"; setTimeout(() => toast.remove(), 1000); }, 2500);
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("active"), 10);
}
function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("active");
}

function normalizePatient(p) {
  return {
    ...p,
    id: String(p.id),
    age: typeof p.age === 'string' && p.age !== '' ? Number(p.age) : (p.age || 0),
    phone: (p.phone || "").toString(),
    lastVisit: p.lastVisit || "",
    status: p.status || "Faol",
    price: p.price ? Number(p.price) : (p.price === 0 ? 0 : null),
    description: p.description || "",
    address: p.address || "",
    doctorId: p.doctorId ? String(p.doctorId) : null
  };
}

function formatNumberWithCommas(value) {
  if (value === null || value === undefined || value === "") return "";
  const v = String(value).replace(/\D/g, "");
  if (!v) return "";
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function normalizePhoneDigits(value) {
  if (!value) return "";
  const digits = value.toString().replace(/\D/g, "");
  // Make sure it starts with 998 (Uzbekistan) or just return digits
  if (digits.startsWith("998")) return digits;
  // if user typed local number like 90..., prepend 998
  if (digits.length === 9 || digits.length === 10) return "998" + digits.slice(-9);
  // fallback: return digits
  return digits;
}

function formatPhoneDisplay(digits) {
  if (!digits) return "";
  const v = digits.replace(/\D/g, "");
  if (!v) return "";
  // expect 12 digits like 998901234567 -> +998 90 123 45 67
  let formatted = "+" + v.slice(0, 3);
  if (v.length > 3) formatted += " " + v.slice(3, 5);
  if (v.length > 5) formatted += " " + v.slice(5, 8);
  if (v.length > 8) formatted += " " + v.slice(8, 10);
  if (v.length > 10) formatted += " " + v.slice(10, 12);
  return formatted;
}

function safeFetch(url, options = {}) {
  return fetch(url, options).then(async res => {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      err.status = res.status;
      throw err;
    }
    return res.json().catch(() => null);
  });
}

// --- Rendering & table operations ---
function renderPatients(patients) {
  if (!tableBody) return;
  tableBody.innerHTML = "";
  if (!patients || patients.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">❌ Bemor topilmadi</td></tr>`;
    return;
  }

  patients.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 cursor-pointer';
    tr.setAttribute('data-id', p.id);

    const tdName = document.createElement('td'); tdName.className = 'px-4 py-2'; tdName.textContent = p.name;
    const tdPhone = document.createElement('td'); tdPhone.className = 'px-4 py-2'; tdPhone.textContent = p.phone;
    const tdLast = document.createElement('td'); tdLast.className = 'px-4 py-2'; tdLast.textContent = p.lastVisit;
    const tdStatus = document.createElement('td'); tdStatus.className = 'px-4 py-2';

    const badge = document.createElement('span');
    badge.className = `px-2 py-1 rounded-full text-xs ${p.status === 'Faol' ? 'bg-green-100 text-green-700' : p.status === 'Kutilmoqda' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-700'
      }`;
    badge.textContent = p.status;
    tdStatus.appendChild(badge);

    const tdActions = document.createElement('td'); tdActions.className = 'px-4 py-2 text-center flex gap-2 justify-center';

    const btnView = document.createElement('button'); btnView.className = 'text-blue-500 p-2 rounded-lg hover:bg-blue-50 transition-colors'; btnView.setAttribute('title', 'Tahrirlash');
    btnView.innerHTML = '<i class="ri-edit-2-line"></i>';
    btnView.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(p.id); });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors';
    btnDelete.setAttribute('title', "O'chirish");
    btnDelete.innerHTML = '<i class="ri-delete-bin-line"></i>';
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePatient(p.id);
    });

    btnDelete.addEventListener('click', (e) => { e.stopPropagation(); deletePatient(p.id); });

    tdActions.appendChild(btnView); tdActions.appendChild(btnDelete);

    tr.appendChild(tdName);
    tr.appendChild(tdPhone);
    tr.appendChild(tdLast);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);

    tr.addEventListener('click', () => openPatientDetails(p.id));

    tableBody.appendChild(tr);
  });
}

// --- Sorting & searching ---
function sortPatientsList(list, key, asc = true) {
  if (!key) return list;
  const sorted = [...list];
  sorted.sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    // If dates (ISO style), compare as dates
    if (/^\d{4}-\d{2}-\d{2}$/.test(av) && /^\d{4}-\d{2}-\d{2}$/.test(bv)) {
      const da = new Date(av).getTime();
      const db = new Date(bv).getTime();
      return asc ? da - db : db - da;
    }
    // fallback: string compare
    return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  return sorted;
}

async function loadPatients(query = "") {
  try {
    const raw = await safeFetch(API_URL);
    patientsData = Array.isArray(raw) ? raw.map(normalizePatient) : [];

    // If doctor is set in localStorage, filter to that doctor's patients
    const doctor = (() => {
      try { return JSON.parse(localStorage.getItem('doctor') || 'null'); } catch (e) { return null; }
    })();

    let filtered = patientsData;
    if (doctor && doctor.id) {
      filtered = filtered.filter(p => String(p.doctorId) === String(doctor.id));
    }

    if (query && query.trim() !== "") {
      const q = query.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        (p.status || "").toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q)
      );
    }

    if (sortKey) {
      filtered = sortPatientsList(filtered, sortKey, sortAsc);
    }

    renderPatients(filtered);
  } catch (err) {
    console.error('loadPatients error', err);
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">❌ Server bilan aloqa yo'q: ${err.message}</td></tr>`;
  }
}

// --- Modals: view details & edit ---
function openPatientDetails(id) {
  const patient = patientsData.find(p => String(p.id) === String(id));
  if (!patient) return showToast('Bemor topilmadi', 'error');
  if (!viewPatientModal || !patientDetails) return;

  const html = `
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-semibold">${patient.name}</h3>
        <div class="space-x-2">
          <button id="openEditFromDetails" class="px-3 py-1 bg-green-600 text-white rounded">Tahrirlash</button>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-2 text-sm text-gray-700">
        <div><strong>Telefon:</strong> <a href="tel:${patient.phone}" class="text-blue-600">${patient.phone}</a></div>
        <div><strong>Yoshi:</strong> ${patient.age || '—'}</div>
        <div><strong>Manzil:</strong> ${patient.address || '—'}</div>
        <div><strong>Oxirgi tashrif:</strong> ${patient.lastVisit || '—'}</div>
        <div><strong>Narx:</strong> ${patient.price !== null && patient.price !== undefined ? patient.price : '—'}</div>
        <div><strong>Holat:</strong> ${patient.status}</div>
        <div><strong>Qisqacha tarix:</strong><div class="mt-1">${patient.description || 'Ma’lumot yo‘q'}</div></div>
      </div>
    </div>
  `;

  patientDetails.innerHTML = html;
  openModal(viewPatientModal);

  const btn = document.getElementById('openEditFromDetails');
  if (btn) btn.addEventListener('click', () => { openEditModal(id); });
}

function openEditModal(id) {
  const patient = patientsData.find(p => String(p.id) === String(id));
  if (!patient) return showToast('Bemor topilmadi', 'error');

  const formHtml = `
    <form id="editPatientForm" class="space-y-4">
      <input type="hidden" name="id" value="${patient.id}" />
      <div>
        <label class="block text-sm text-gray-600 mb-1">Ism Familiya</label>
        <input type="text" name="name" value="${patient.name}" required class="w-full px-4 py-3 border rounded-lg">
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">Yoshi</label>
        <input type="number" name="age" value="${patient.age}" required class="w-full px-4 py-3 border rounded-lg">
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">Telefon</label>
        <input type="text" name="phone" value="${patient.phone}" required placeholder="+998 90 123 45 67" class="w-full px-4 py-3 border rounded-lg">
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">Oxirgi tashrif sanasi</label>
        <input type="date" name="lastVisit" value="${patient.lastVisit}" required class="w-full px-4 py-3 border rounded-lg">
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">Status</label>
        <select name="status" required class="w-full px-4 py-3 border rounded-lg">
          <option value="Faol" ${patient.status === 'Faol' ? 'selected' : ''}>Faol</option>
          <option value="Kutilmoqda" ${patient.status === 'Kutilmoqda' ? 'selected' : ''}>Kutilmoqda</option>
          <option value="Yakunlangan" ${patient.status === 'Yakunlangan' ? 'selected' : ''}>Yakunlangan</option>
        </select>
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">Narx (so'm)</label>
        <input type="text" name="price" value="${patient.price !== null && patient.price !== undefined ? formatNumberWithCommas(patient.price) : ''}" class="w-full px-4 py-3 border rounded-lg">
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">Izoh</label>
        <textarea name="description" rows="3" class="w-full px-4 py-3 border rounded-lg">${patient.description || ''}</textarea>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="submit" class="bg-green-600 text-white px-5 py-2 rounded-full">Saqlash</button>
      </div>
    </form>
  `;

  patientDetails.innerHTML = formHtml;
  openModal(viewPatientModal);
}

// Delegated submit handler for edit form inside viewPatientModal
// Delegated submit handler for edit form inside viewPatientModal
if (document) {
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!form) return;

    if (form.id === 'editPatientForm') {
      e.preventDefault();

      const fd = new FormData(form);
      const updated = Object.fromEntries(fd.entries());

      const id = String(updated.id);
      delete updated.id;

      // normalize fields
      if (updated.age) updated.age = Number(updated.age);
      if (updated.phone) {
        const digits = normalizePhoneDigits(updated.phone);
        updated.phone = formatPhoneDisplay(digits);
      }
      if (updated.price) {
        updated.price = Number(String(updated.price).replace(/\D/g, ""));
      } else {
        updated.price = null;
      }

      // ❗️ doctorId ni bemorning eski malumotidan olib qo‘shamiz
      const oldPatient = patientsData.find(p => p.id === id);
      if (oldPatient?.doctorId) {
        updated.doctorId = oldPatient.doctorId;
      }

      try {
        const res = await fetch(`${API_URL}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        showToast("✅ Bemor ma'lumotlari yangilandi", "success");
        closeModal(viewPatientModal);
        await loadPatients(searchInput ? searchInput.value : '');
      } catch (err) {
        console.error("❌ edit submit error", err);
        showToast("Yangilashda xato yuz berdi", "error");
      }
    }
  });
}


if (addPatientForm) {
  addPatientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(addPatientForm);
    const data = Object.fromEntries(fd.entries());

    if (!data.name || !data.phone) { showToast('Ism va telefon majburiy', 'error'); return; }

    const phoneDigits = normalizePhoneDigits(data.phone);
    if (!phoneDigits) { showToast('Telefon noto\'g\'ri format', 'error'); return; }

    const doctor = (() => { try { return JSON.parse(localStorage.getItem('doctor') || 'null'); } catch (e) { return null; } })();

    const newPatient = {
      id: Date.now().toString(),
      name: data.name,
      age: data.age ? Number(data.age) : null,
      phone: formatPhoneDisplay(phoneDigits),
      lastVisit: data.lastVisit || new Date().toISOString().slice(0, 10),
      status: data.status || 'Faol',
      price: data.price ? Number(String(data.price).replace(/\D/g, '')) : null,
      description: data.description || '',
      address: data.address || '',
      doctorId: doctor && doctor.id ? String(doctor.id) : null
    };

    try {
      await safeFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient)
      });

      showToast('Bemor qo\'shildi', 'success');
      addPatientForm.reset();
      closeModal(addPatientModal);
      await loadPatients(searchInput ? searchInput.value : '');
    } catch (err) {
      console.error('add patient error', err);
      showToast('Bemor qo\'shishda xato yuz berdi', 'error');
    }
  });
}

// --- Delete ---
async function deletePatient(id) {
  if (!id) return showToast('ID topilmadi', 'error');
  if (!confirm('Rostdan ham ushbu bemorni o\'chirmoqchimisiz?')) return;
  try {
    await safeFetch(`${API_URL}/${id}`, { method: 'DELETE' });
    showToast('Bemor o\'chirildi', 'success');
    await loadPatients(searchInput ? searchInput.value : '');
  } catch (err) {
    console.error('delete error', err);
    showToast('O\'chirishda xato yuz berdi', 'error');
  }
}


if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => loadPatients(searchInput.value), 300);
  });
}

function sortTable(key) {
  sortAsc = (sortKey === key) ? !sortAsc : true;
  sortKey = key;
  loadPatients(searchInput ? searchInput.value : '');
}
window.sortTable = sortTable;

document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t) return;
  if (t.name === 'phone') {
    const digits = normalizePhoneDigits(t.value);
    t.value = formatPhoneDisplay(digits);
  }
  if (t.name === 'price') {
    const oldPos = t.selectionStart || 0;
    const oldLen = t.value.length;
    t.value = formatNumberWithCommas(t.value);
    const newLen = t.value.length;
    const diff = newLen - oldLen;
    try { t.setSelectionRange(oldPos + diff, oldPos + diff); } catch (e) { }
  }
});

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const section = e.currentTarget.getAttribute('data-section');
    if (section === 'patients') {
      navItems.forEach(it => it.classList.remove('text-primary', 'bg-primary/10', 'font-semibold'));
      e.currentTarget.classList.add('text-primary', 'bg-primary/10', 'font-semibold');
      loadPatients(searchInput ? searchInput.value : '');
    } else {
      showToast(`Bu bo'lim (${section}) demo versiyada mavjud emas.`, 'info');
    }
  });
});
if (addPatientBtn) addPatientBtn.addEventListener('click', () => openModal(addPatientModal));
if (cancelAddPatient) cancelAddPatient.addEventListener('click', () => closeModal(addPatientModal));
window.onclick = function (event) {
  if (event.target === addPatientModal) closeModal(addPatientModal);
  if (event.target === viewPatientModal) closeModal(viewPatientModal);
}
loadPatients();
window._patientsLoad = loadPatients;
window._patientsData = () => patientsData;

