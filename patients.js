const API_URL = "https://shifo-crm-6.onrender.com/patients";
const tableBody = document.getElementById("patientsTableBody");
const addPatientBtn = document.getElementById("addPatientBtn");
const addPatientModal = document.getElementById("addPatientModal");
const cancelAddPatient = document.getElementById("cancelAddPatient");
const addPatientForm = document.getElementById("addPatientForm");
const searchInput = document.getElementById("searchInput");
const viewPatientModal = document.getElementById("viewPatientModal");
const patientDetails = document.getElementById("patientDetails");
const navItems = document.querySelectorAll(".nav-item");

let patientsData = [];
let sortKey = null;
let sortAsc = true;
let activeSection = 'patients';

function closeModal(modal) { modal.classList.add("hidden"); modal.classList.remove("active"); }
function openModal(modal) { modal.classList.remove("hidden"); setTimeout(() => modal.classList.add("active"), 10); }

async function loadPatients(query = "") {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) {
            throw new Error(`Server xatosi: ${res.status}`);
        }
        patientsData = await res.json();

        let filtered = patientsData.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.phone.includes(query) ||
            p.status.toLowerCase().includes(query.toLowerCase())
        );

        if (sortKey) {
            filtered.sort((a, b) => {
                if (a[sortKey] < b[sortKey]) return sortAsc ? -1 : 1;
                if (a[sortKey] > b[sortKey]) return sortAsc ? 1 : -1;
                return 0;
            });
        }

        renderPatients(filtered);
    } catch (error) {
        console.error("Ma'lumotlarni yuklashda xato:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">❌ Server bilan aloqa yo'q.</td></tr>`;
    }
}

function renderPatients(patients) {
    tableBody.innerHTML = "";
    if (patients.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">❌ Bemor topilmadi</td></tr>`;
        return;
    }
    patients.forEach(p => {
        const badgeColors = {
            "Faol": "bg-green-100 text-green-700",
            "Kutilmoqda": "bg-yellow-100 text-yellow-700",
            "Yakunlangan": "bg-gray-200 text-gray-700"
        };
        tableBody.innerHTML += `
    <tr onclick='openPatientModal(${JSON.stringify(p)})' 
        class="hover:bg-gray-50 cursor-pointer">
        <td class="px-4 py-2">${p.name}</td>
        <td class="px-4 py-2">${p.phone}</td>
        <td class="px-4 py-2">${p.lastVisit}</td>
        <td class="px-4 py-2">
            <span class="px-2 py-1 rounded-full text-xs ${badgeColors[p.status] || "bg-gray-100"}">${p.status}</span>
        </td>
        <td class="px-4 py-2 text-center flex gap-2 justify-center"
            onclick="event.stopPropagation()">
            <button onclick="viewPatient(${p.id}); event.stopPropagation();" 
                class="text-blue-500 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                <i class="ri-edit-2-line"></i>
            </button>
            <button onclick="deletePatient(${p.id}); event.stopPropagation();" 
                class="text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors">
                <i class="ri-delete-bin-line"></i>
            </button>
        </td>
    </tr>
`;


    });
}

function sortTable(key) {
    sortAsc = (sortKey === key) ? !sortAsc : true;
    sortKey = key;
    loadPatients(searchInput.value);
}

// Telefon input avtomatik formatlash
const phoneInput = document.querySelector('input[name="phone"]');
phoneInput.addEventListener("input", e => {
    let value = e.target.value.replace(/\D/g, ""); // faqat raqam qoldiramiz

    // doim 998 bilan boshlanishini ta'minlash
    if (!value.startsWith("998")) {
        value = "998" + value;
    }

    // faqat 12 ta raqam qabul qiladi: 998 XX XXX XX XX
    if (value.length > 12) {
        value = value.slice(0, 12);
    }

    // formatlash
    let formatted = "+998";
    if (value.length > 3) formatted += " " + value.slice(3, 5);
    if (value.length > 5) formatted += " " + value.slice(5, 8);
    if (value.length > 8) formatted += " " + value.slice(8, 10);
    if (value.length > 10) formatted += " " + value.slice(10, 12);

    e.target.value = formatted;
});

const priceInput = document.querySelector('input[name="price"]');

function formatNumber(value) {
    value = value.replace(/\D/g, ""); // faqat raqamlarni olamiz
    value = value.replace(/^0+/, ""); // bosh nolni olib tashlaymiz
    if (!value) return "";

    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ","); // 3 xonadan keyin vergul
}

priceInput.addEventListener("input", e => {
    const cursorPos = e.target.selectionStart;
    const oldLength = e.target.value.length;

    e.target.value = formatNumber(e.target.value);

    const newLength = e.target.value.length;
    const diff = newLength - oldLength;
    e.target.setSelectionRange(cursorPos + diff, cursorPos + diff);
});


// Form submit – API ga yuborishda asl raqamlarni olish
addPatientForm.addEventListener("submit", async e => {
    e.preventDefault();
    const formData = new FormData(addPatientForm);

    let newId = patientsData.length > 0
        ? Math.max(...patientsData.map(p => p.id)) + 1
        : 1;

    const phoneRaw = formData.get("phone").replace(/\D/g, "");
    const priceRaw = formData.get("price").replace(/\D/g, "");

    const newPatient = {
        id: String(newId),
        name: formData.get("name"),
        age: Number(formData.get("age")),
        phone: "+" + phoneRaw,
        lastVisit: formData.get("lastVisit"),
        status: formData.get("status"),
        price: Number(priceRaw),
        description: formData.get("description") || "",
        address: formData.get("address") // 🆕 qo‘shildi
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPatient)
    });

    if (response.ok) {
        loadPatients();
        closeModal(addPatientModal);
        addPatientForm.reset();
    } else {
        alert("Bemor qo'shishda xato yuz berdi.");
    }
});

window.viewPatient = function (id) {
    const patient = patientsData.find(p => p.id == id);
    if (!patient) {
        alert("Bemor topilmadi.");
        return;
    }

    // Modalni ochamiz
    openModal(viewPatientModal);

    // Modal ichidagi formni render qilamiz
    patientDetails.innerHTML = `
    

    <form id="editPatientForm" class="space-y-4">
        <div>
            <label class="block text-sm text-gray-600 mb-1">Ism Familiya</label>
            <input type="text" name="name" value="${patient.name}" required
                class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none">
        </div>
        <div>
            <label class="block text-sm text-gray-600 mb-1">Yoshi</label>
            <input type="number" name="age" value="${patient.age}" required
                class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none">
        </div>
        <div>
            <label class="block text-sm text-gray-600 mb-1">Telefon</label>
            <input type="text" name="phone" placeholder="+998" value="${patient.phone}" required
                class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none">
        </div>
        <div>
            <label class="block text-sm text-gray-600 mb-1">Oxirgi tashrif sanasi</label>
            <input type="date" name="lastVisit" value="${patient.lastVisit}" required
                class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none">
        </div>
        <div>
            <label class="block text-sm text-gray-600 mb-1">Status</label>
            <select name="status" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="Faol" ${patient.status === 'Faol' ? 'selected' : ''}>Faol</option>
                <option value="Kutilmoqda" ${patient.status === 'Kutilmoqda' ? 'selected' : ''}>Kutilmoqda</option>
                <option value="Yakunlangan" ${patient.status === 'Yakunlangan' ? 'selected' : ''}>Yakunlangan</option>
            </select>
        </div>

        <div class="flex justify-end gap-2 pt-2">
            <button type="submit"
                class="bg-green-600 text-white px-5 py-2 rounded-full hover:bg-green-700 transition">Saqlash</button>
        </div>
    </form>
`;

    // Form submit bo‘lganda PATCH so‘rovini yuborish
    const editForm = document.getElementById("editPatientForm");
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(editForm);

        const updatedPatient = {
            ...patient,
            name: formData.get("name"),
            age: Number(formData.get("age")),
            phone: formData.get("phone"),
            lastVisit: formData.get("lastVisit"),
            status: formData.get("status")
        };

        try {
            const res = await fetch(`${API_URL}/${patient.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedPatient)
            });

            if (res.ok) {
                showToast("Bemor ma'lumotlari yangilandi", "success");
                loadPatients(searchInput.value);
                closeModal(viewPatientModal);
            } else {
                showToast("Yangilashda xato yuz berdi", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Server bilan aloqa yo'q", "error");
        }
    });
};

window.deletePatient = async function (id) {
    if (!id) {
        alert("Xato: bemor ID aniqlanmadi!");
        return;
    }
    if (confirm("Rostdan ham ushbu bemorni o‘chirmoqchimisiz?")) {
        try {
            const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
            if (res.ok) {
                loadPatients(searchInput.value);
            } else {
                alert(`O'chirishda xato yuz berdi. Server javobi: ${res.status} ${res.statusText}`);
            }
        } catch (error) {
            console.error("O'chirish so'rovida xato:", error);
            alert("O'chirishda xato yuz berdi. Server bilan aloqa yo'q.");
        }
    }
};

let debounceTimeout;
searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        loadPatients(searchInput.value);
    }, 300);
});

addPatientBtn.addEventListener("click", () => openModal(addPatientModal));
cancelAddPatient.addEventListener("click", () => closeModal(addPatientModal));

window.onclick = function (event) {
    if (event.target == addPatientModal) {
        closeModal(addPatientModal);
    }
    if (event.target == viewPatientModal) {
        closeModal(viewPatientModal);
    }
}

function setActiveNavItem(section) {
    navItems.forEach(item => {
        const itemSection = item.getAttribute('data-section');
        if (itemSection === section) {
            item.classList.add('text-primary', 'bg-primary/10', 'font-semibold');
            item.classList.remove('text-gray-400', 'hover:text-primary');
        } else {
            item.classList.remove('text-primary', 'bg-primary/10', 'font-semibold');
            item.classList.add('text-gray-400', 'hover:text-primary');
        }
    });
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const section = e.currentTarget.getAttribute('data-section');
        if (section === 'patients') {
            setActiveNavItem(section);
            loadPatients(searchInput.value);
        } else {
            showToast(`Bu bo'lim (${section}) demo versiyada mavjud emas.`, "info");
        }
    });
});

loadPatients();
setActiveNavItem('patients');
const currentUsername = localStorage.getItem("username");

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");

    const toast = document.createElement("div");
    toast.className = `toast px-4 py-3 rounded-lg shadow-md text-white flex items-center gap-2
        ${type === "error" ? "bg-red-500" : type === "success" ? "bg-green-500" : "bg-blue-500"}`;

    toast.innerHTML = `
        <i class="ri-information-line text-xl"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "fadeOut 3s forwards";
        setTimeout(() => toast.remove(), 3000);
    }, 30000);
}
function openPatientModal(patient) {
    const modal = document.getElementById("patientModal");
    const content = document.getElementById("modalContent");

    content.innerHTML = `
  <div class="relative bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-6 border 
              max-w-2xl mx-auto max-h-[85vh] overflow-y-auto">
    
    <!-- Header -->
    <div class="text-center space-y-3">
      <h3 class="text-xl sm:text-2xl font-bold text-gray-800 break-words">
        ${patient.name}
      </h3>
      <span class="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
        ${patient.status || "Holati noma'lum"}
      </span>
    </div>

    <!-- Asosiy ma'lumotlar -->
    <div class="grid grid-cols-1 sm:gap-5 gap-4 text-sm sm:text-base text-gray-700">
      <div class="flex justify-between items-center gap-2">
        <span class="flex items-center gap-2 text-gray-500 whitespace-nowrap">
          <i class="ri-phone-line text-base"></i> Telefon
        </span>
        <a href="tel:${patient.phone}" 
           class="text-blue-600 hover:underline font-medium break-words text-right">
          ${patient.phone}
        </a>
      </div>

      <div class="flex justify-between items-center gap-2">
        <span class="flex items-center gap-2 text-gray-500 whitespace-nowrap">
          <i class="ri-cake-2-line text-base"></i> Yosh
        </span>
        <span class="font-medium">${patient.age || "—"}</span>
      </div>

      <div class="flex justify-between items-start gap-2">
        <span class="flex items-center gap-2 text-gray-500 whitespace-nowrap">
          <i class="ri-home-4-line text-base"></i> Manzil
        </span>
        <span class="text-right sm:text-left break-words max-w-[70%] leading-relaxed">
          ${patient.address || "—"}
        </span>
      </div>

      <div class="flex justify-between items-center gap-2">
        <span class="flex items-center gap-2 text-gray-500 whitespace-nowrap">
          <i class="ri-calendar-check-line text-base"></i> Muolaja narxi
        </span>
        <span class="font-medium break-words text-right">${patient.price}</span>
      </div>

      <div class="flex justify-between items-center gap-2">
        <span class="flex items-center gap-2 text-gray-500 whitespace-nowrap">
          <i class="ri-calendar-event-line text-base"></i> Kelgusi tashrif
        </span>
        <span class="font-medium break-words text-right">${patient.nextVisit || "—"}</span>
      </div>
    </div>

    <!-- Qisqa tibbiy tarix -->
    <div class="bg-gray-50 p-4 sm:p-5 rounded-lg text-sm sm:text-base space-y-2">
      <p class="flex items-center gap-2 font-medium text-gray-600">
        <i class="ri-stethoscope-line text-base"></i> Qisqa tibbiy tarix
      </p>
      <p class="text-gray-700 leading-relaxed whitespace-pre-line break-words">
        ${patient.description || "Ma'lumot kiritilmagan"}
      </p>
    </div>
  </div>
`;

    modal.classList.remove("hidden");
}

function closePatientModal() {
    document.getElementById("patientModal").classList.add("hidden");
}
const doctor = JSON.parse(localStorage.getItem("doctor"));

document.getElementById("addPatientForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(e.target);

  const newPatient = {
    id: Date.now(),
    name: data.get("name"),
    age: data.get("age"),
    phone: data.get("phone"),
    lastVisit: data.get("lastVisit"),
    status: data.get("status"),
    doctorId: doctor.id  // 🔑 kirgan shifokor ID sini qo'shdik
  };

  await fetch("http://localhost:3001/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newPatient)
  });

  e.target.reset();
  loadPatients(); 
});
async function loadPatients() {
    const res = await fetch("http://localhost:3001/patients");
    const patients = await res.json();
  
    // faqat shu shifokorning bemorlarini chiqaramiz
    const myPatients = patients.filter(p => p.doctorId === doctor.id);
  
    const tbody = document.getElementById("patientsTableBody");
    tbody.innerHTML = "";
    myPatients.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="border px-4 py-2">${p.name}</td>
        <td class="border px-4 py-2">${p.phone}</td>
        <td class="border px-4 py-2">${p.lastVisit}</td>
        <td class="border px-4 py-2">${p.status}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  


