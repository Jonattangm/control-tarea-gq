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
 * CONFIG
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
let currentUser = null;
let currentRole = null;
let allTasks = []; // para el filtrado

const TASK_STATES = [
  "Asignado","En proceso","Por revisar","Reportar","Finalizado",
  "SII","Municipalidad","Tesoreria","BPO"
];

/****************************************************
 * DOM
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

/* Filtros y checkboxes de exclusión */
const filterFecha = document.getElementById("filterFecha");
const filterAsignado = document.getElementById("filterAsignado");
const filterEstado = document.getElementById("filterEstado");
const filterEmpresa = document.getElementById("filterEmpresa");
const filterGrupo = document.getElementById("filterGrupo");
const filterFolio = document.getElementById("filterFolio");

const chkExcludeAsignado = document.getElementById("chkExcludeAsignado");
const chkExcludeEstado = document.getElementById("chkExcludeEstado");
const chkExcludeEmpresa = document.getElementById("chkExcludeEmpresa");
const chkExcludeGrupo = document.getElementById("chkExcludeGrupo");
const chkExcludeFolio = document.getElementById("chkExcludeFolio");

const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

/****************************************************
 * DOMContentLoaded
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  authForm?.addEventListener("submit", (e) => e.preventDefault());
  btnRegister?.addEventListener("click", registerUser);
  btnLogin?.addEventListener("click", loginUser);
  btnLogout?.addEventListener("click", async () => await signOut(auth));

  createTaskBtn?.addEventListener("click", createTask);

  btnTareas?.addEventListener("click", () => {
    dashboardSection.style.display = "block";
    adminUsersSection.style.display = "none";
  });
  btnUsuarios?.addEventListener("click", () => {
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "block";
  });

  btnAplicarFiltros?.addEventListener("click", aplicarFiltros);
  btnLimpiarFiltros?.addEventListener("click", limpiarFiltros);
});

/****************************************************
 * onAuthStateChanged
 ****************************************************/
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // Carga rol
    const userDoc = doc(db, "users", user.uid);
    const snap = await getDoc(userDoc);
    if (snap.exists()) {
      currentRole = snap.data().role;
    } else {
      await setDoc(userDoc, { role: DEFAULT_ROLE, email: user.email.toLowerCase() });
      currentRole = DEFAULT_ROLE;
    }

    // Muestra Dashboard
    authSection.style.display = "none";
    loginFooter.style.display = "none";
    sidebar.style.display = "flex";
    dashboardSection.style.display = "block";

    userEmailSpan.textContent = user.email;
    userRoleSpan.textContent = currentRole;

    // Quitar columnas para consultor / senior
    if (currentRole === "consultor") {
      // Oculta colAsignado y colAcciones
      document.querySelectorAll(".colAsignado, .colAcciones").forEach(col => {
        col.style.display = "none";
      });
      // Oculta filterAsignado
      filterAsignado.parentElement.style.display = "none";
    } else if (currentRole === "senior") {
      // Oculta colAcciones
      document.querySelectorAll(".colAcciones").forEach(col => {
        col.style.display = "none";
      });
    }

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
    // No user
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
    alert("Completa al menos Nombre y Asignado a (email/usuario).");
    return;
  }
  try {
    // Verifica si 'newTaskAssigned' es un 'name' de usuario => buscar email
    let assignedEmail = newTaskAssigned.value.trim().toLowerCase();
    const qSnap = await getDocs(collection(db, "users"));
    qSnap.forEach(d => {
      const u = d.data();
      if (u.name && u.name.toLowerCase() === assignedEmail) {
        assignedEmail = u.email; // si coincide nombre, lo convertimos a email
      }
    });

    // Generar ID no repetido
    const colRef = collection(db, "tasks");
    const snapshot = await getDocs(colRef);
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
      assignedTo: assignedEmail, // email final
      empresa: newEmpresa.value.trim(),
      grupoCliente: newGrupo.value.trim(),
      folioProyecto: newFolio.value.trim(),
      horasAsignadas: newHoras.value.trim(),
      status: "Asignado",
      createdAt: new Date(),
      createdBy: currentUser.uid
    });

    // Limpia
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
 * RENDER TAREAS
 ****************************************************/
function renderTasks(tasksArray) {
  tasksTableBody.innerHTML = "";

  // Filtra si consultor => solo sus tareas
  let arr = tasksArray.slice();
  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => t.assignedTo === currentUser.email.toLowerCase());
  }

  arr.forEach(task => {
    const tr = document.createElement("tr");

    // ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea || "N/A";
    tr.appendChild(tdId);

    // Fecha
    const tdFecha = document.createElement("td");
    tdFecha.textContent = task.fechaAsignacion || "--";
    tr.appendChild(tdFecha);

    // Nombre
    // Si Admin/Supervisor => input editable
    const tdName = document.createElement("td");
    if (["admin","supervisor"].includes(currentRole)) {
      const inpName = document.createElement("input");
      inpName.type = "text";
      inpName.value = task.name || "";
      inpName.addEventListener("change", () => {
        updateField(task.docId, { name: inpName.value });
      });
      tdName.appendChild(inpName);
    } else {
      tdName.textContent = task.name || "(Sin nombre)";
    }
    tr.appendChild(tdName);

    // Asignado a
    const tdAsig = document.createElement("td");
    if (["admin","supervisor"].includes(currentRole)) {
      const inpAsig = document.createElement("input");
      inpAsig.type = "text";
      inpAsig.value = task.assignedTo || "";
      inpAsig.addEventListener("change", () => {
        // Si lo que se ingresa coincide con name => cambiar a su email
        convertUserNameToEmail(inpAsig.value).then(finalEmail => {
          updateField(task.docId, { assignedTo: finalEmail });
        });
      });
      tdAsig.appendChild(inpAsig);
    } else {
      tdAsig.textContent = task.assignedTo || "";
    }
    tr.appendChild(tdAsig);

    // Estado
    const tdEstado = document.createElement("td");
    const selectStatus = document.createElement("select");
    let possibleStates = TASK_STATES.slice();

    // Ajustar consultor: no final/reportar, confirm si porrevisar
    if (currentRole === "consultor") {
      if (task.status === "Por revisar") {
        possibleStates = ["Por revisar"];
      } else {
        // no "Reportar" ni "Finalizado"
        possibleStates = ["Asignado","En proceso","Por revisar","SII","Municipalidad","Tesoreria","BPO"];
      }
    }
    // Ajustar senior: confirm si "Reportar"
    // (lo haremos en la change event)

    possibleStates.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      if (st === task.status) opt.selected = true;
      selectStatus.appendChild(opt);
    });
    selectStatus.addEventListener("change", () => {
      const newSt = selectStatus.value;

      // Confirm consultor -> "Por revisar"
      if (currentRole === "consultor" && newSt === "Por revisar" && task.status !== "Por revisar") {
        if (!confirm("¿Seguro de poner la tarea en 'Por revisar'?")) {
          selectStatus.value = task.status; 
          return;
        }
      }
      // Confirm senior -> "Reportar"
      if (currentRole === "senior" && newSt === "Reportar" && task.status !== "Reportar") {
        if (!confirm("¿Seguro de poner la tarea en 'Reportar'?")) {
          selectStatus.value = task.status;
          return;
        }
      }

      if (!canChangeStatus(currentRole, task.status, newSt)) {
        alert("No tienes permiso para ese cambio de estado.");
        selectStatus.value = task.status;
      } else {
        updateTaskStatus(task.docId, newSt);
      }
    });

    // Indicador
    const indicator = document.createElement("span");
    indicator.classList.add("status-indicator");
    const lowered = task.status?.toLowerCase().replace(" ", "-");
    indicator.classList.add(`status-${lowered}`);

    tdEstado.appendChild(selectStatus);
    tdEstado.appendChild(indicator);
    tr.appendChild(tdEstado);

    // Empresa
    const tdEmpresa = document.createElement("td");
    if (["admin","supervisor"].includes(currentRole)) {
      const inpEmp = document.createElement("input");
      inpEmp.type = "text";
      inpEmp.value = task.empresa || "";
      inpEmp.addEventListener("change", () => {
        updateField(task.docId, { empresa: inpEmp.value });
      });
      tdEmpresa.appendChild(inpEmp);
    } else {
      tdEmpresa.textContent = task.empresa || "";
    }
    tr.appendChild(tdEmpresa);

    // Grupo
    const tdGrupo = document.createElement("td");
    if (["admin","supervisor"].includes(currentRole)) {
      const inpGrp = document.createElement("input");
      inpGrp.type = "text";
      inpGrp.value = task.grupoCliente || "";
      inpGrp.addEventListener("change", () => {
        updateField(task.docId, { grupoCliente: inpGrp.value });
      });
      tdGrupo.appendChild(inpGrp);
    } else {
      tdGrupo.textContent = task.grupoCliente || "";
    }
    tr.appendChild(tdGrupo);

    // Folio
    const tdFolio = document.createElement("td");
    if (["admin","supervisor"].includes(currentRole)) {
      const inpFol = document.createElement("input");
      inpFol.type = "text";
      inpFol.value = task.folioProyecto || "";
      inpFol.addEventListener("change", () => {
        updateField(task.docId, { folioProyecto: inpFol.value });
      });
      tdFolio.appendChild(inpFol);
    } else {
      tdFolio.textContent = task.folioProyecto || "";
    }
    tr.appendChild(tdFolio);

    // Horas Asignadas
    const tdHoras = document.createElement("td");
    if (["admin","supervisor"].includes(currentRole)) {
      const inpHrs = document.createElement("input");
      inpHrs.type = "text";
      inpHrs.value = task.horasAsignadas || "";
      inpHrs.addEventListener("change", () => {
        updateField(task.docId, { horasAsignadas: inpHrs.value });
      });
      tdHoras.appendChild(inpHrs);
    } else {
      tdHoras.textContent = task.horasAsignadas || "";
    }
    tr.appendChild(tdHoras);

    // Acciones
    const tdAcc = document.createElement("td");
    tdAcc.classList.add("colAcciones");
    if ((currentRole === "supervisor") || (currentRole === "admin")) {
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
 * canChangeStatus
 ****************************************************/
function canChangeStatus(role, currentSt, newSt) {
  // Consultor
  if (role === "consultor") {
    // No final, no reportar
    const blocked = ["Reportar","Finalizado"];
    if (blocked.includes(newSt)) return false;
    if (currentSt === "Por revisar") return false; // no revert

    // Asignado <-> En proceso, SII, etc. => ok
    // Asignado/En proceso -> Por revisar => ok
    return true;
  }
  // Senior: Reglas originales
  if (role === "senior") {
    if (isEquivalentEnProceso(currentSt) || currentSt === "Asignado") {
      if (["Por revisar","Reportar"].includes(newSt)) return true;
    }
    if (currentSt === "Por revisar") {
      return ["Asignado","En proceso","SII","Municipalidad","Tesoreria","BPO","Reportar"].includes(newSt);
    }
    return false;
  }
  // Supervisor, Admin => todo
  return true;
}

function isEquivalentEnProceso(st) {
  return ["En proceso","SII","Municipalidad","Tesoreria","BPO"].includes(st);
}

/****************************************************
 * updateTaskStatus
 ****************************************************/
async function updateTaskStatus(docId, newStatus) {
  try {
    await updateDoc(doc(db, "tasks", docId), { status: newStatus });
  } catch (err) {
    console.error("Error al cambiar estado:", err);
  }
}

/****************************************************
 * updateField (editar campos)
 ****************************************************/
async function updateField(docId, newData) {
  try {
    await updateDoc(doc(db, "tasks", docId), newData);
  } catch (err) {
    console.error("Error al actualizar campo:", err);
  }
}

/****************************************************
 * Convertir nombre usuario -> email
 ****************************************************/
async function convertUserNameToEmail(inputVal) {
  const nameOrEmail = inputVal.toLowerCase();
  // Buscar si existe un user con userData.name = nameOrEmail
  const colRef = collection(db, "users");
  const qSnap = await getDocs(colRef);
  for (const docu of qSnap.docs) {
    const u = docu.data();
    if ((u.name||"").toLowerCase() === nameOrEmail) {
      return u.email || docu.id; 
    }
  }
  // si no encuentra => se asume que la persona escribió un email
  return nameOrEmail;
}

/****************************************************
 * ADMIN: loadAllUsers (Asignar nombre)
 ****************************************************/
async function loadAllUsers() {
  usersTableBody.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));
  snap.forEach(docu => {
    const u = docu.data();
    const tr = document.createElement("tr");

    // Email
    const tdEmail = document.createElement("td");
    tdEmail.textContent = u.email || docu.id;
    tr.appendChild(tdEmail);

    // Nombre
    const tdName = document.createElement("td");
    const inpName = document.createElement("input");
    inpName.type = "text";
    inpName.value = u.name || "";
    inpName.addEventListener("change", () => {
      updateDoc(doc(db, "users", docu.id), { name: inpName.value }).catch(err => {
        console.error("Error actualizando nombre:", err);
      });
    });
    tdName.appendChild(inpName);
    tr.appendChild(tdName);

    // Rol actual
    const tdRole = document.createElement("td");
    tdRole.textContent = u.role || "consultor";
    tr.appendChild(tdRole);

    // Cambiar Nombre / Rol
    const tdChange = document.createElement("td");
    const selectRole = document.createElement("select");
    ["consultor","senior","supervisor","admin"].forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      if (r === u.role) opt.selected = true;
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

    tr.appendChild(tdChange);
    usersTableBody.appendChild(tr);
  });
}

/****************************************************
 * FILTROS (con opción de excluir)
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

  const exAsig = chkExcludeAsignado.checked;
  const exEst = chkExcludeEstado.checked;
  const exEmp = chkExcludeEmpresa.checked;
  const exGru = chkExcludeGrupo.checked;
  const exFol = chkExcludeFolio.checked;

  arr = arr.filter(t => {
    // Filtro/Exclude: Fecha
    if (fFecha) {
      const hasFecha = (t.fechaAsignacion||"").toLowerCase().includes(fFecha);
      if (!exAsig && !exEst && !exEmp && !exGru && !exFol) {
        // no?
      }
      // Realmente cada campo se maneja por su exclude
      // para Fecha no tenemos exclude => no lo pediste
      // asumimos normal filter
      if (!hasFecha) return false;
    }
    // Asignado
    if (fAsig) {
      const assigned = (t.assignedTo||"").toLowerCase();
      const match = assigned.includes(fAsig);
      if (exAsig) {
        if (match) return false; // se excluye
      } else {
        if (!match) return false; 
      }
    }
    // Estado
    if (fEst) {
      const st = (t.status||"").toLowerCase();
      const match = st.includes(fEst);
      if (exEst) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Empresa
    if (fEmp) {
      const e = (t.empresa||"").toLowerCase();
      const match = e.includes(fEmp);
      if (exEmp) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Grupo
    if (fGru) {
      const g = (t.grupoCliente||"").toLowerCase();
      const match = g.includes(fGru);
      if (exGru) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Folio
    if (fFol) {
      const fol = (t.folioProyecto||"").toLowerCase();
      const match = fol.includes(fFol);
      if (exFol) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }

    return true;
  });

  // Filtra adicional por rol consultor
  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => t.assignedTo === currentUser.email.toLowerCase());
  }

  renderTasks(arr);
}

function limpiarFiltros() {
  filterFecha.value = "";
  filterAsignado.value = "";
  filterEstado.value = "";
  filterEmpresa.value = "";
  filterGrupo.value = "";
  filterFolio.value = "";

  chkExcludeAsignado.checked = false;
  chkExcludeEstado.checked = false;
  chkExcludeEmpresa.checked = false;
  chkExcludeGrupo.checked = false;
  chkExcludeFolio.checked = false;

  if (currentRole === "consultor" && currentUser) {
    renderTasks(allTasks.filter(t => t.assignedTo === currentUser.email.toLowerCase()));
  } else {
    renderTasks(allTasks);
  }
}
