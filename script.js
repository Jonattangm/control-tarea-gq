import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/****************************************************
 * CONFIGURACIÓN FIREBASE
 ****************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyCFoalSasV17k812nXbCSjO9xCsnAJJRnE",
  authDomain: "control-tarea-gq.firebaseapp.com",
  projectId: "control-tarea-gq",
  storageBucket: "control-tarea-gq.appspot.com",
  messagingSenderId: "449145637626",
  appId: "1:449145637626:web:23b51b68fcadd6eaa11743"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/****************************************************
 * CONSTANTES
 ****************************************************/
const DEFAULT_ROLE = "consultor";

// Agregamos nuevos estados: SII, Municipalidad, Tesoreria, BPO
// Se comportan igual que Asignado/En proceso
const TASK_STATES = [
  "Asignado","En proceso","Por revisar","Reportar","Finalizado",
  "SII","Municipalidad","Tesoreria","BPO"
];

/****************************************************
 * REFERENCIAS AL DOM
 ****************************************************/
const authSection = document.getElementById("authSection");
const loginFooter = document.getElementById("loginFooter");

const sidebar = document.getElementById("sidebar");
const btnTareas = document.getElementById("btnTareas");
const btnUsuarios = document.getElementById("btnUsuarios");

const dashboardSection = document.getElementById("dashboardSection");
const adminUsersSection = document.getElementById("adminUsersSection");

const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const btnRegister = document.getElementById("btnRegister");
const btnLogin = document.getElementById("btnLogin");
const authMessage = document.getElementById("authMessage");

const userEmailSpan = document.getElementById("userEmail");
const userRoleSpan = document.getElementById("userRole");
const btnLogout = document.getElementById("btnLogout");

const taskCreationDiv = document.getElementById("taskCreation");
const newTaskName = document.getElementById("newTaskName");
const newTaskAssigned = document.getElementById("newTaskAssigned");
const newEmpresa = document.getElementById("newEmpresa");
const newGrupo = document.getElementById("newGrupo");
const newFolio = document.getElementById("newFolio");
const newHoras = document.getElementById("newHoras");
const createTaskBtn = document.getElementById("createTaskBtn");

const tasksTableBody = document.getElementById("tasksBody");
const usersTableBody = document.getElementById("usersBody");

/* Filtros */
const filterFecha = document.getElementById("filterFecha");
const filterAsignado = document.getElementById("filterAsignado");
const filterEstado = document.getElementById("filterEstado");
const filterEmpresa = document.getElementById("filterEmpresa");
const filterGrupo = document.getElementById("filterGrupo");
const filterFolio = document.getElementById("filterFolio");
const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

let currentUser = null;
let currentRole = null;
let allTasks = []; // Para filtrar en memoria

/****************************************************
 * DOMContentLoaded
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Evita reload en form
  authForm?.addEventListener("submit", (e) => e.preventDefault());

  // Botones login/registro
  btnRegister?.addEventListener("click", registerUser);
  btnLogin?.addEventListener("click", loginUser);

  // Botón logout
  btnLogout?.addEventListener("click", async () => {
    await signOut(auth);
  });

  // Botón crear tarea
  createTaskBtn?.addEventListener("click", createTask);

  // Botones para ver Tareas / Usuarios
  btnTareas?.addEventListener("click", () => {
    dashboardSection.style.display = "block";
    adminUsersSection.style.display = "none";
  });
  btnUsuarios?.addEventListener("click", () => {
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "block";
  });

  // Botones Filtros
  btnAplicarFiltros?.addEventListener("click", aplicarFiltros);
  btnLimpiarFiltros?.addEventListener("click", limpiarFiltros);
});

/****************************************************
 * onAuthStateChanged
 ****************************************************/
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // Carga el doc en /users/uid
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      currentRole = snap.data().role;
    } else {
      // crear doc
      await setDoc(userDocRef, {
        role: DEFAULT_ROLE,
        email: user.email.toLowerCase()
      });
      currentRole = DEFAULT_ROLE;
    }

    // Muestra dashboard, oculta login
    authSection.style.display = "none";
    loginFooter.style.display = "none"; // Oculta footer en el dashboard
    sidebar.style.display = "block";
    dashboardSection.style.display = "block";

    userEmailSpan.textContent = user.email;
    userRoleSpan.textContent = currentRole;

    if (["supervisor","admin"].includes(currentRole)) {
      taskCreationDiv.style.display = "block";
    } else {
      taskCreationDiv.style.display = "none";
    }

    if (currentRole === "admin") {
      btnUsuarios.style.display = "inline-block";
      loadAllUsers();
    } else {
      btnUsuarios.style.display = "none";
    }

    listenTasks();

  } else {
    // no user
    currentUser = null;
    currentRole = null;
    authSection.style.display = "block";
    loginFooter.style.display = "block";
    sidebar.style.display = "none";
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "none";
  }
});

/****************************************************
 * REGISTRO / LOGIN
 ****************************************************/
async function registerUser() {
  authMessage.textContent = "";
  if (!emailInput.value.trim() || !passInput.value.trim()) {
    authMessage.textContent = "Por favor, llena todos los campos.";
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passInput.value.trim());
  } catch (err) {
    authMessage.textContent = `Error al crear usuario: ${err.message}`;
  }
}

async function loginUser() {
  authMessage.textContent = "";
  if (!emailInput.value.trim() || !passInput.value.trim()) {
    authMessage.textContent = "Por favor, llena todos los campos.";
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passInput.value.trim());
  } catch (err) {
    authMessage.textContent = `Error al iniciar sesión: ${err.message}`;
  }
}

/****************************************************
 * CREAR TAREA
 ****************************************************/
async function createTask() {
  if (!newTaskName.value.trim() || !newTaskAssigned.value.trim()) {
    alert("Completa al menos Nombre y Asignado a (email).");
    return;
  }
  try {
    // Generar ID no repetido
    const colRef = collection(db, "tasks");
    const snapshot = await getDocs(colRef);
    // Buscar el max ID
    let maxId = 0;
    snapshot.forEach(d => {
      const data = d.data();
      if (data.idTarea && data.idTarea > maxId) {
        maxId = data.idTarea;
      }
    });
    const nextId = maxId + 1;

    await addDoc(colRef, {
      idTarea: nextId,
      fechaAsignacion: new Date().toLocaleDateString("es-CL"),
      name: newTaskName.value.trim(),
      assignedTo: newTaskAssigned.value.trim().toLowerCase(),
      empresa: newEmpresa.value.trim(),
      grupoCliente: newGrupo.value.trim(),
      folioProyecto: newFolio.value.trim(),
      horasAsignadas: newHoras.value.trim(), // Nuevo campo
      status: "Asignado",
      createdAt: new Date(),
      createdBy: currentUser.uid
    });

    // Limpiar
    newTaskName.value = "";
    newTaskAssigned.value = "";
    newEmpresa.value = "";
    newGrupo.value = "";
    newFolio.value = "";
    newHoras.value = "";
  } catch (err) {
    console.error("Error creando tarea:", err);
  }
}

/****************************************************
 * ESCUCHAR TAREAS
 ****************************************************/
function listenTasks() {
  const colRef = collection(db, "tasks");
  onSnapshot(colRef, (snapshot) => {
    allTasks = [];
    snapshot.forEach(docu => {
      allTasks.push({ ...docu.data(), docId: docu.id });
    });
    renderTasks(allTasks);
  });
}

/****************************************************
 * RENDER DE TAREAS + FILTROS
 ****************************************************/
function renderTasks(tasksArray) {
  tasksTableBody.innerHTML = "";

  // Filtra por rol consultor
  let arr = tasksArray.slice();
  if (currentRole === "consultor") {
    arr = arr.filter(t => t.assignedTo === currentUser.email.toLowerCase());
  }

  arr.forEach(task => {
    const tr = document.createElement("tr");

    // ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea || "N/A";
    tr.appendChild(tdId);

    // Fecha asignación
    const tdFecha = document.createElement("td");
    tdFecha.textContent = task.fechaAsignacion || "--";
    tr.appendChild(tdFecha);

    // Nombre
    const tdName = document.createElement("td");
    tdName.textContent = task.name || "(Sin nombre)";
    tr.appendChild(tdName);

    // Asignado a
    const tdAsig = document.createElement("td");
    tdAsig.textContent = task.assignedTo || "";
    tr.appendChild(tdAsig);

    // Columna Estado + Indicador
    const tdEstado = document.createElement("td");
    const selectStatus = document.createElement("select");
    
    // Ajustar para consultor
    let possibleStates = TASK_STATES.slice();
    if (currentRole === "consultor") {
      // si ya está en Por revisar, no se mueve
      if (task.status === "Por revisar") {
        possibleStates = ["Por revisar"];
      } else {
        // Asignado, En proceso, Por revisar, SII, Municipalidad, Tesoreria, BPO?
        // El enunciado dice: consultor no puede usar Reportar ni Finalizado.
        // Permite SII, etc. => asimilados a “Asignado/En proceso”
        possibleStates = [
          "Asignado","En proceso","Por revisar","SII","Municipalidad","Tesoreria","BPO"
        ];
      }
    }

    possibleStates.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      if (st === task.status) opt.selected = true;
      selectStatus.appendChild(opt);
    });

    selectStatus.addEventListener("change", () => {
      const newSt = selectStatus.value;
      if (!canChangeStatus(currentRole, task.status, newSt)) {
        alert("No tienes permiso para ese cambio.");
        selectStatus.value = task.status; 
      } else {
        updateTaskStatus(task.docId, newSt);
      }
    });
    tdEstado.appendChild(selectStatus);

    // Indicador
    const indicator = document.createElement("span");
    indicator.classList.add("status-indicator");
    const lowered = task.status?.toLowerCase().replace(" ", "-");
    indicator.classList.add(`status-${lowered}`);
    tdEstado.appendChild(indicator);

    tr.appendChild(tdEstado);

    // Empresa
    const tdEmp = document.createElement("td");
    tdEmp.textContent = task.empresa || "";
    tr.appendChild(tdEmp);

    // Grupo
    const tdGru = document.createElement("td");
    tdGru.textContent = task.grupoCliente || "";
    tr.appendChild(tdGru);

    // Folio
    const tdFol = document.createElement("td");
    tdFol.textContent = task.folioProyecto || "";
    tr.appendChild(tdFol);

    // Horas Asignadas
    const tdHoras = document.createElement("td");
    tdHoras.textContent = task.horasAsignadas || "";
    tr.appendChild(tdHoras);

    // Acciones
    const tdAcc = document.createElement("td");
    if (["supervisor","admin"].includes(currentRole)) {
      const btnDel = document.createElement("button");
      btnDel.textContent = "Eliminar";
      btnDel.addEventListener("click", async () => {
        if (confirm("¿Deseas eliminar la tarea?")) {
          await deleteDoc(doc(db, "tasks", task.docId));
        }
      });
      tdAcc.appendChild(btnDel);
    }
    tr.appendChild(tdAcc);

    tasksTableBody.appendChild(tr);
  });
}

/****************************************************
 * CAMBIO DE ESTADO: Reglas
 ****************************************************/
function canChangeStatus(role, currentSt, newSt) {
  // Consultor: 
  //   - Asignado <-> En proceso
  //   - Asignado/En proceso -> Por revisar
  //   - No puede Finalizado ni Reportar
  //   - Puede SII, Municipalidad, Tesoreria, BPO => asimilados a En proceso
  //   - No mover si ya está en "Por revisar"
  if (role === "consultor") {
    if (currentSt === "Por revisar") return false;

    // De Asignado <-> En proceso / SII / etc
    // Consideramos SII, Munic, etc. como “En proceso” a nivel de permisos
    // simplificamos => no final ni reportar
    const blocked = ["Reportar","Finalizado"];
    if (blocked.includes(newSt)) return false;

    // Asignado -> Por revisar
    if ((currentSt === "Asignado" || currentSt === "En proceso" || isEquivalentEnProceso(currentSt)) && newSt === "Por revisar") {
      return true;
    }
    // Asignado <-> En proceso (o SII, etc.)
    return true;
  }

  // Senior, Supervisor, Admin => misma lógica que teníamos,
  // con 4.0 extra states (“SII”, etc.)
  if (role === "senior") {
    // Reglas del enunciado original
    if (currentSt === "Asignado" || isEquivalentEnProceso(currentSt)) {
      if (["Por revisar","Reportar"].includes(newSt)) return true;
    }
    if (currentSt === "Por revisar") {
      return ["Asignado","En proceso","SII","Municipalidad","Tesoreria","BPO","Reportar"].includes(newSt);
    }
    return false;
  }

  if (role === "supervisor") {
    // puede todo
    return true;
  }
  if (role === "admin") {
    // puede todo
    return true;
  }
  return false;
}

// Consideramos SII, Municipalidad, Tesoreria, BPO equivalentes a "En proceso"
function isEquivalentEnProceso(state) {
  return ["En proceso","SII","Municipalidad","Tesoreria","BPO"].includes(state);
}

/****************************************************
 * ACTUALIZAR ESTADO
 ****************************************************/
async function updateTaskStatus(docId, newStatus) {
  try {
    await updateDoc(doc(db, "tasks", docId), { status: newStatus });
  } catch (err) {
    console.error("Error al cambiar estado:", err);
  }
}

/****************************************************
 * ADMIN: CARGAR Y MODIFICAR ROLES
 ****************************************************/
async function loadAllUsers() {
  usersTableBody.innerHTML = "";
  const qSnap = await getDocs(collection(db, "users"));
  qSnap.forEach(docu => {
    const userData = docu.data();
    const tr = document.createElement("tr");

    // Email
    const tdEmail = document.createElement("td");
    tdEmail.textContent = userData.email || docu.id;

    // Rol actual
    const tdRole = document.createElement("td");
    tdRole.textContent = userData.role;

    // Cambiar rol
    const tdChange = document.createElement("td");
    const selectRole = document.createElement("select");
    const ALL_ROLES = ["consultor","senior","supervisor","admin"];
    ALL_ROLES.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      if (r === userData.role) opt.selected = true;
      selectRole.appendChild(opt);
    });
    selectRole.addEventListener("change", async () => {
      const newR = selectRole.value;
      try {
        await updateDoc(doc(db, "users", docu.id), { role: newR });
        tdRole.textContent = newR;
        alert("Rol actualizado a " + newR);
      } catch (error) {
        console.error("Error cambiando rol:", error);
      }
    });

    tdChange.appendChild(selectRole);

    tr.appendChild(tdEmail);
    tr.appendChild(tdRole);
    tr.appendChild(tdChange);

    usersTableBody.appendChild(tr);
  });
}

/****************************************************
 * FILTROS
 ****************************************************/
function aplicarFiltros() {
  if (!allTasks) return;
  let arr = allTasks.slice();

  const fFecha = filterFecha.value.trim().toLowerCase();
  const fAsig = filterAsignado.value.trim().toLowerCase();
  const fEst = filterEstado.value.trim().toLowerCase();
  const fEmp = filterEmpresa.value.trim().toLowerCase();
  const fGru = filterGrupo.value.trim().toLowerCase();
  const fFol = filterFolio.value.trim().toLowerCase();

  arr = arr.filter(t => {
    // Filtro por fecha
    if (fFecha && !(t.fechaAsignacion||"").toLowerCase().includes(fFecha)) return false;
    // Filtro por Asignado
    if (fAsig && !(t.assignedTo||"").includes(fAsig)) return false;
    // Filtro por Estado
    if (fEst && !(t.status||"").toLowerCase().includes(fEst)) return false;
    // Filtro por Empresa
    if (fEmp && !(t.empresa||"").toLowerCase().includes(fEmp)) return false;
    // Filtro por Grupo
    if (fGru && !(t.grupoCliente||"").toLowerCase().includes(fGru)) return false;
    // Filtro por Folio
    if (fFol && !(t.folioProyecto||"").toLowerCase().includes(fFol)) return false;
    return true;
  });

  // Filtra adicional por rol consultor
  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => t.assignedTo === currentUser.email.toLowerCase());
  }

  // Muestra
  renderTasks(arr);
}

function limpiarFiltros() {
  filterFecha.value = "";
  filterAsignado.value = "";
  filterEstado.value = "";
  filterEmpresa.value = "";
  filterGrupo.value = "";
  filterFolio.value = "";
  // render original
  if (currentRole === "consultor") {
    const f = allTasks.filter(t => t.assignedTo === currentUser.email.toLowerCase());
    renderTasks(f);
  } else {
    renderTasks(allTasks);
  }
}
