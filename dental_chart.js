const API_PATIENTS = "https://shifo-crm-8.onrender.com/patients";
const API_CHARTS = "https://shifo-crm-8.onrender.com/dentalCharts";
const API_SERVICES = "https://shifo-crm-8.onrender.com/services_list"; // YANGI: Xizmatlar ro'yxati uchun API

// Hardcoded Service Data (UZS - O'zbekiston So'mi) -> Endi dinamik
let DENTAL_SERVICES = []; // Dinamik ma'lumotlarni saqlash uchun o'zgaruvchi

const sidebar = document.getElementById("sidebar");
const openSidebar = document.getElementById("openSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const searchInput = document.getElementById("patientSearch");
const searchResults = document.getElementById("searchResults");
const chartContainer = document.getElementById("chartContainer");
const upperJawRight = document.getElementById("upperJawRight");
const upperJawLeft = document.getElementById("upperJawLeft");
const lowerJawRight = document.getElementById("lowerJawRight");
const lowerJawLeft = document.getElementById("lowerJawLeft");

const toothModal = document.getElementById("toothModal");
const modalToothNumber = document.getElementById("modalToothNumber");
const toothStatus = document.getElementById("toothStatus");
const toothNote = document.getElementById("toothNote");
const saveToothBtn = document.getElementById("saveToothBtn");
const profileNameEl = document.getElementById("profileName");
const profileAvatarEl = document.getElementById("profileAvatar");
const notificationContainer = document.getElementById("notificationContainer");

// Services elements (Amaldagi)
const serviceSelect = document.getElementById("serviceSelect");
const serviceQuantity = document.getElementById("serviceQuantity");
const addServiceBtn = document.getElementById("addServiceBtn");
const servicesTableBody = document.getElementById("servicesTableBody");
const totalCostEl = document.getElementById("totalCost");

// Umumiy elementlar
const toggleSearchBtn = document.getElementById("toggleSearchBtn");
const searchBox = document.getElementById("searchBox");
const currentPatientNameTitle = document.getElementById("currentPatientNameTitle");
const finishTreatmentBtn = document.getElementById("finishTreatmentBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn"); 
const editAnamnezBtn = document.getElementById("editAnamnez");
const anamnezModal = document.getElementById("anamnezModal");
const anamnezTextarea = document.getElementById("anamnezTextarea");
const saveAnamnezBtn = document.getElementById("saveAnamnezBtn");

// Bemor kartasi detallari
const cardName = document.getElementById("cardName");
const cardDOB = document.getElementById("cardDOB");
const cardGender = document.getElementById("cardGender");
const cardPhone = document.getElementById("cardPhone");
const cardAddress = document.getElementById("cardAddress");
const cardID = document.getElementById("cardID");
const cardStatus = document.getElementById("cardStatus");
const cardLastVisit = document.getElementById("cardLastVisit");
const cardNextVisit = document.getElementById("cardNextVisit");
const cardAllergy = document.getElementById("cardAllergy");

const planServiceSelect = document.getElementById("planServiceSelect");
const addPlanServiceBtn = document.getElementById("addPlanServiceBtn");
const treatmentPlanTableBody = document.getElementById("treatmentPlanTableBody");

const tabServices = document.getElementById('tabServices');
const tabPlan = document.getElementById('tabPlan');
const tabContentServices = document.getElementById('tabContentServices');
const tabContentPlan = document.getElementById('tabContentPlan');


let patientsData = [];
let currentPatient = null;
let currentChartId = null; 
let currentTeeth = [];
let currentServices = []; 
let plannedServices = []; 
let currentAnamnez = ""; 
let selectedTooth = null;

// === Asosiy yordamchi funksiyalar ===
function showMessage(message, type = 'success') {
    const container = document.createElement('div');
    container.className = `p-4 rounded-xl shadow-2xl text-white font-medium transition-all transform duration-300 pointer-events-auto ${type === 'success' ? 'bg-primary' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`;
    container.innerHTML = `<div class="flex items-center gap-2"><i class="ri-information-line text-xl"></i><span>${message}</span></div>`;

    notificationContainer.appendChild(container);

    setTimeout(() => {
        container.classList.add('opacity-0', 'translate-x-full');
        container.addEventListener('transitionend', () => container.remove());
    }, 3000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(amount).replace(/\sUZS/g, '');
}

function formatDate(isoString) {
    if (!isoString) return "—";
    try {
        return new Date(isoString).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'numeric', day: 'numeric' });
    } catch (e) {
        return isoString;
    }
}
openSidebar?.addEventListener("click", () => {
    sidebar.classList.add("active");
    sidebarOverlay.classList.remove("hidden");
});
sidebarOverlay?.addEventListener("click", () => {
    sidebar.classList.remove("active");
    sidebarOverlay.classList.add("hidden");
});


// === YANGI: Xizmatlar ro'yxatini yuklash funksiyasi ===
async function loadServices() {
    try {
        const res = await fetch(API_SERVICES);
        if (!res.ok) throw new Error("Xizmatlar ro'yxatini yuklashda xato");
        DENTAL_SERVICES = await res.json();
        populateServiceSelect(); // Xizmatlar yuklangandan so'ng select boxlarni to'ldirish
    } catch (err) {
        console.error("Xizmatlarni yuklashda xatolik:", err);
        showMessage("Xizmatlar ro'yxatini yuklashda xato. (Server ishlamayotgan bo'lishi mumkin)", "error");
    }
}


async function loadPatients() {
    try {
        const res = await fetch(API_PATIENTS);
        const all = await res.json();
        
        const doctor = { id: "d1", fullname: "Dr. Aliya Sattorova" };
        
        patientsData = all.filter(p => String(p.doctorId) === String(doctor.id));

        if (patientsData.length > 0) {
            const lastPatient = patientsData[patientsData.length - 1];
            selectPatient(lastPatient);
        } else {
            currentPatientNameTitle.textContent = "Bemor tanlanmagan";
            chartContainer.style.display = 'none';
        }

    } catch (err) {
        console.error("Bemorlarni yuklashda xatolik:", err);
        showMessage("Bemorlar ro'yxatini yuklashda xato. (Server ishlamayotgan bo'lishi mumkin)", "error");
    }
}

// === Search va Toggle ===
toggleSearchBtn.addEventListener("click", () => {
    searchBox.classList.toggle("hidden");
});

document.addEventListener('click', (e) => {
    if (!toggleSearchBtn.contains(e.target) && !searchBox.contains(e.target) && !searchResults.contains(e.target)) {
        searchBox.classList.add("hidden");
    }
});

searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    searchResults.innerHTML = "";

    if (!query) {
        searchResults.innerHTML = ""; 
        return;
    }

    const filtered = patientsData.filter(p => (p.name || "").toLowerCase().includes(query) || (p.phone || "").includes(query));
    if (filtered.length === 0) {
        searchResults.innerHTML = `<li class="px-4 py-2 text-gray-500">Topilmadi</li>`;
    } else {
        filtered.forEach(patient => {
            const li = document.createElement("li");
            li.className = "px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0";
            li.innerHTML = `<strong>${patient.name}</strong> <span class="text-gray-500 ml-2">${patient.phone || ''}</span>`;
            li.onclick = () => selectPatient(patient);
            searchResults.appendChild(li);
        });
    }
});


function selectPatient(patient) {
    currentPatient = patient;
    searchInput.value = patient.name;
    searchBox.classList.add("hidden");
    currentPatientNameTitle.textContent = patient.name;
    chartContainer.style.display = 'block';

    cardName.textContent = patient.name || "---";
    cardDOB.textContent = formatDate(patient.birthDate) || "---";
    cardGender.textContent = patient.gender || "—";
    cardPhone.textContent = patient.phone || "---";
    cardAddress.textContent = patient.address || "---";
    cardID.textContent = patient.passportID || "---"; 

    const statusClass = patient.status === 'Faol' ? 'bg-green-100 text-green-800' : 
                                 patient.status === 'Yakunlangan' ? 'bg-gray-200 text-gray-600' : 'bg-yellow-100 text-yellow-800';
    cardStatus.innerHTML = `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${patient.status || 'Faol'}</span>`;

    cardLastVisit.textContent = formatDate(patient.lastVisit) || "—";
    cardNextVisit.textContent = formatDate(patient.nextVisit) || "—";

    loadDentalChart(patient.id);
}

async function loadDentalChart(patientId) {
    try {
        const doctor = { id: "d1" }; 
        const res = await fetch(`${API_CHARTS}?patientId=${patientId}&doctorId=${doctor.id}`);
        const data = await res.json();

        if (data.length > 0) {
            const chart = data[0];
            currentChartId = chart.id;
            currentTeeth = chart.teeth || [];
            currentServices = chart.services || []; 
            plannedServices = chart.plannedServices || []; 
            currentAnamnez = chart.anamnez || ""; 
        } else {
            currentChartId = null;
            currentTeeth = [];
            currentServices = [];
            plannedServices = []; 
            currentAnamnez = "";
        }

        renderAnamnez(); 
        renderTeeth();
        renderServices();
        renderTreatmentPlan(); 
        switchTab('services'); 
    } catch (err) {
        console.error("Chartni yuklashda xatolik:", err);
        showMessage("Dental Chart ma'lumotlarini yuklashda xato.", "error");
    }
}

function getStatusClass(status) {
    switch (status) {
        case "cariyes": return "status-cariyes";
        case "filled": return "status-filled";
        case "missing": return "status-missing";
        default: return "status-healthy";
    }
}

function renderTeeth() {
    upperJawRight.innerHTML = "";
    upperJawLeft.innerHTML = "";
    lowerJawRight.innerHTML = "";
    lowerJawLeft.innerHTML = "";

    const upperTeethOrder = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    const lowerTeethOrder = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

    upperTeethOrder.forEach(i => createToothElement(i, i >= 11 && i <= 18 ? upperJawRight : upperJawLeft, 'top'));
    lowerTeethOrder.forEach(i => createToothElement(i, i >= 41 && i <= 48 ? lowerJawRight : lowerJawLeft, 'bottom'));

    function createToothElement(i, parent, jawPosition) {
        const tooth = currentTeeth.find(t => Number(t.id) === i);
        const status = tooth ? tooth.status : "healthy";
        const hasNote = tooth && tooth.note.trim() ? 'has-note' : '';
        
        const wrapper = document.createElement("div");
        wrapper.className = "tooth-wrapper";

        const numberTop = document.createElement("span");
        numberTop.className = `tooth-number ${jawPosition === 'top' ? '' : 'hidden'}`;
        numberTop.textContent = i;
        wrapper.appendChild(numberTop);

        const div = document.createElement("div");
        div.className = `tooth-icon ${getStatusClass(status)} ${hasNote}`;
        div.innerHTML = `<span>${i}</span>`;
        div.onclick = () => openModal(i, tooth);
        wrapper.appendChild(div);

        const numberBottom = document.createElement("span");
        numberBottom.className = `tooth-number ${jawPosition === 'bottom' ? '' : 'hidden'} mt-1`;
        numberBottom.textContent = i;
        wrapper.appendChild(numberBottom);

        parent.appendChild(wrapper);
    }
}

function renderServices() {
    servicesTableBody.innerHTML = '';
    let total = 0;

    if (currentServices.length === 0) {
        servicesTableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500 italic">Fakturaga xizmatlar qo'shilmagan.</td></tr>`;
    }

    currentServices.forEach((service, index) => {
        const serviceData = DENTAL_SERVICES.find(s => s.id === service.serviceId);
        if (!serviceData) return;

        const subtotal = serviceData.price * service.quantity;
        total += subtotal;

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-500">${index + 1}</td>
            <td class="px-4 py-3 text-sm text-gray-800">${serviceData.name}</td>
            <td class="px-4 py-3 text-center text-sm text-gray-700">${service.quantity}</td>
            <td class="px-4 py-3 text-right text-sm text-gray-700">${formatCurrency(serviceData.price)} UZS</td>
            <td class="px-4 py-3 text-right text-sm font-semibold text-gray-800">${formatCurrency(subtotal)} UZS</td>
            <td class="px-4 py-3 text-right">
                <button onclick="removeService(${index})" class="text-red-500 hover:text-red-700 transition">
                    <i class="ri-delete-bin-line text-lg"></i>
                </button>
            </td>
        `;
        servicesTableBody.appendChild(row);
    });

    totalCostEl.textContent = `${formatCurrency(total)} UZS`;
}

// === REJALASHTIRILGAN MUOLAJALARNI RENDERLASH (NARXSIZ) ===
function renderTreatmentPlan() {
    treatmentPlanTableBody.innerHTML = '';

    if (plannedServices.length === 0) {
        treatmentPlanTableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 italic">Keyingi muolajalar rejalashtirilmagan.</td></tr>`;
    }

    plannedServices.forEach((service, index) => {
        const serviceData = DENTAL_SERVICES.find(s => s.id === service.serviceId);
        if (!serviceData) return;

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-500">${index + 1}</td>
            <td class="px-4 py-3 text-sm text-gray-800">${serviceData.name}</td>
            <td class="px-4 py-3 text-center text-sm text-gray-700">${service.quantity}</td>
            <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                     <button onclick="moveToServices(${index})" 
                        class="text-primary hover:text-secondary transition bg-primary/10 hover:bg-primary/20 p-2 rounded-lg font-medium text-xs flex items-center gap-1">
                        <i class="ri-check-line"></i> Amalga oshirildi
                    </button>
                    <button onclick="removePlanService(${index})" class="text-red-500 hover:text-red-700 transition p-2">
                        <i class="ri-delete-bin-line text-lg"></i>
                    </button>
                </div>
            </td>
        `;
        treatmentPlanTableBody.appendChild(row);
    });
}


function addService() {
    if (!currentPatient) {
        return showMessage("❌ Iltimos, avval bemorni tanlang.", "error");
    }
    const serviceId = serviceSelect.value;
    const quantity = parseInt(serviceQuantity.value);

    if (!serviceId) {
        return showMessage("❌ Xizmat turini tanlang.", "error");
    }
    if (quantity < 1 || isNaN(quantity)) {
        return showMessage("❌ Miqdor 1 dan kam bo'lishi mumkin emas.", "error");
    }

    const existing = currentServices.find(s => s.serviceId === serviceId);

    if (existing) {
        existing.quantity += quantity;
    } else {
        currentServices.push({ serviceId, quantity });
    }

    serviceQuantity.value = 1;
    renderServices();
    showMessage("✅ Xizmat fakturaga qo'shildi.");
}

function removeService(index) {
    if (index >= 0 && index < currentServices.length) {
        currentServices.splice(index, 1);
        renderServices();
        showMessage("🗑️ Xizmat fakturadan olib tashlandi.");
    }
}
window.removeService = removeService;

// === REJALASHTIRILGAN XIZMATLARNI QO'SHISH ===
function addPlanService() {
    if (!currentPatient) {
        return showMessage("❌ Iltimos, avval bemorni tanlang.", "error");
    }
    const serviceId = planServiceSelect.value;
    const serviceData = DENTAL_SERVICES.find(s => s.id === serviceId);

    if (!serviceId) {
        return showMessage("❌ Xizmat turini tanlang.", "error");
    }
    
    const quantity = 1; // Rejalashtirilgan muolaja uchun 1

    plannedServices.push({ serviceId, quantity });

    renderTreatmentPlan();
    showMessage(`✅ "${serviceData.name}" keyingi muolajaga rejalashtirildi.`);
}

function removePlanService(index) {
    if (index >= 0 && index < plannedServices.length) {
        plannedServices.splice(index, 1);
        renderTreatmentPlan();
        showMessage("🗑️ Xizmat Rejalashtirilgan Muolajadan olib tashlandi.");
    }
}
window.removePlanService = removePlanService;

// === Rejalashtirilgan Xizmatni Fakturaga (Amaldagi Xizmatlarga) o'tkazish ===
function moveToServices(index) {
    if (index < 0 || index >= plannedServices.length) return;

    const serviceToMove = plannedServices[index];
    const serviceData = DENTAL_SERVICES.find(s => s.id === serviceToMove.serviceId);

    // 1. Amaldagi Xizmatlar (currentServices) ro'yxatiga qo'shish/yangilash
    const existing = currentServices.find(s => s.serviceId === serviceToMove.serviceId);

    if (existing) {
        existing.quantity += serviceToMove.quantity;
    } else {
        currentServices.push(serviceToMove);
    }

    // 2. Rejalashtirilgan ro'yxatdan olib tashlash
    plannedServices.splice(index, 1);

    // 3. Ikkala jadvallarni yangilash va Faktura tabiga o'tkazish
    renderServices();
    renderTreatmentPlan();
    switchTab('services'); // Avtomatik faktura tabiga o'tadi
    showMessage(`✅ "${serviceData.name}" amalda bajarildi va fakturaga o'tkazildi.`);
}
window.moveToServices = moveToServices;


function populateServiceSelect() {
    // DENTAL_SERVICES endi serverdan yuklanadi
    serviceSelect.innerHTML = DENTAL_SERVICES.map(s =>
        `<option value="${s.id}">${s.name} (${formatCurrency(s.price)} UZS)</option>`
    ).join('');
    
    planServiceSelect.innerHTML = DENTAL_SERVICES.map(s =>
        `<option value="${s.id}">${s.name}</option>`
    ).join('');
}
addServiceBtn.addEventListener('click', addService);
addPlanServiceBtn.addEventListener('click', addPlanService); 

// === TAB FUNKSIONALIGINI QO'SHISH ===
function switchTab(tabName) {
    // Tab tugmalarini yangilash
    const allButtons = document.querySelectorAll('.tab-button');
    allButtons.forEach(btn => {
        btn.classList.remove('active', 'text-gray-800', 'border-primary', 'font-semibold');
        btn.classList.add('text-gray-500', 'border-transparent', 'font-medium', 'hover:text-gray-800', 'hover:border-gray-300');
    });

    const allContents = document.querySelectorAll('.tab-content');
    allContents.forEach(content => {
        content.classList.add('hidden');
    });

    if (tabName === 'services') {
        tabServices.classList.add('active', 'text-gray-800', 'border-primary', 'font-semibold');
        tabServices.classList.remove('text-gray-500', 'border-transparent', 'font-medium', 'hover:text-gray-800', 'hover:border-gray-300');
        tabContentServices.classList.remove('hidden');
    } else if (tabName === 'plan') {
        tabPlan.classList.add('active', 'text-gray-800', 'border-primary', 'font-semibold');
        tabPlan.classList.remove('text-gray-500', 'border-transparent', 'font-medium', 'hover:text-gray-800', 'hover:border-gray-300');
        tabContentPlan.classList.remove('hidden');
    }
}
window.switchTab = switchTab; 


function openModal(toothNumber, toothData) {
    if (!currentPatient) return showMessage("❌ Iltimos, avval bemorni tanlang.", "error");
    selectedTooth = toothNumber;
    modalToothNumber.innerHTML = `<i class="ri-edit-line"></i> Tish #${toothNumber}`;
    toothStatus.value = toothData ? toothData.status : "healthy";
    toothNote.value = toothData ? toothData.note : "";
    toothModal.classList.remove("hidden");
    toothModal.classList.add("flex");
}
function closeModal() {
    toothModal.classList.add("hidden");
    toothModal.classList.remove("flex");
}
window.closeModal = closeModal;

saveToothBtn.onclick = () => {
    const status = toothStatus.value;
    const note = toothNote.value;
    const existing = currentTeeth.find(t => Number(t.id) === selectedTooth);

    const newToothData = { id: String(selectedTooth), status, note };

    if (existing) {
        Object.assign(existing, newToothData);
    } else {
        currentTeeth.push(newToothData);
    }

    if (status === 'healthy' && !note.trim()) {
        currentTeeth = currentTeeth.filter(t => Number(t.id) !== selectedTooth);
    }

    closeModal();
    renderTeeth();
    showMessage("✅ Tish statusi yangilandi. Saqlash tugmasini bosing.");
};

function openAnamnezModal() {
    if (!currentPatient) return showMessage("❌ Iltimos, avval bemorni tanlang.", "error");
    anamnezTextarea.value = currentAnamnez;
    anamnezModal.classList.remove("hidden");
    anamnezModal.classList.add("flex");
}
function closeAnamnezModal() {
    anamnezModal.classList.add("hidden");
    anamnezModal.classList.remove("flex");
}
window.closeAnamnezModal = closeAnamnezModal;

editAnamnezBtn.addEventListener('click', openAnamnezModal);

saveAnamnezBtn.onclick = () => {
    currentAnamnez = anamnezTextarea.value.trim();
    renderAnamnez();
    closeAnamnezModal();
    showMessage("✅ Tibbiy ma'lumotlar saqlash uchun tayyorlandi.");
};

function renderAnamnez() {
    if (currentAnamnez) {
        cardAllergy.textContent = currentAnamnez;
        cardAllergy.classList.remove('italic');
    } else {
        cardAllergy.textContent = "Allergiya va kasalliklar haqida ma'lumot yo'q.";
        cardAllergy.classList.add('italic');
    }
}


// === Yakunlash va Qoralama Saqlash funksiyasi ===
finishTreatmentBtn.onclick = async () => {
    if (!currentPatient) return showMessage("❌ Iltimos, bemorni tanlang.", "error");
    if (currentServices.length === 0) {
            return showMessage("❌ Davolash rejasida (fakturaga) xizmatlar mavjud emas.", "error");
    }
    showMessage(`⏳ Davolash yakunlanmoqda. Jami to'lov: ${totalCostEl.textContent}`, "info");
    await saveChart(true); // true yakunlash uchun
    currentPatient.status = "Yakunlangan";
    selectPatient(currentPatient); 
};

saveDraftBtn.onclick = async () => {
    if (!currentPatient) return showMessage("❌ Iltimos, bemorni tanlang.", "error");
    await saveChart(false); // false qoralama saqlash uchun
};


// === Saqlash ===
async function saveChart(isFinished = false) {
    if (!currentPatient) return showMessage("❌ Iltimos, bemorni tanlang.", "error");

    const teethToSave = currentTeeth.filter(t => t.status !== 'healthy' || t.note.trim());
    const doctor = { id: "d1" }; // Demo: Shifokor IDsi 'profil.html'dan kelishi kerak

    const payload = {
        patientId: currentPatient.id,
        doctorId: doctor.id,
        visitDate: new Date().toISOString().split("T")[0],
        teeth: teethToSave,
        services: currentServices,
        plannedServices: plannedServices, // Rejalashtirilgan xizmatlar
        anamnez: currentAnamnez, 
        status: isFinished ? "Yakunlangan" : "Davom etmoqda" 
    };

    try {
        let res;
        if (currentChartId) {
            res = await fetch(`${API_CHARTS}/${currentChartId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(API_CHARTS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: "dc" + Date.now(), ...payload })
            });
            const newChart = await res.json();
            currentChartId = newChart.id; 
        }

        if (!res.ok) throw new Error("Serverda saqlashda xato yuz berdi.");

        if (isFinished) {
            showMessage("✅ Davolash muvaffaqiyatli yakunlandi va saqlandi!");
        } else {
            showMessage("✅ Dental chart va davolash rejasidagi o'zgarishlar muvaffaqiyatli saqlandi.");
        }

    } catch (error) {
        console.error("Saqlashda xatolik:", error);
        showMessage("❌ Saqlashda xatolik yuz berdi. (Serverga ulanishni tekshiring)", "error");
    }
}

// === Init ===
(async function init() {
    await loadServices(); // 1. Xizmatlarni yuklash
    await loadPatients(); // 2. Bemorlarni yuklash va oxirgisini tanlash
})();