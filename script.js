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
 * VARIABLES
 ****************************************************/
let currentUser = null;
let currentRole = null;
let allTasks = [];
let editTaskId = null;

const TASK_STATES = [
  "Asignado","En proceso","Por revisar","Reportar","Finalizado",
  "SII","Municipalidad","Tesoreria","BPO"
];
const DEFAULT_ROLE = "consultor";

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
const btnLogout = document.getElementById("btnLogout");

const userEmailSpan = document.getElementById("userEmail");
const userRoleSpan = document.getElementById("userRole");

const taskCreationDiv = document.getElementById("taskCreation");
const frmTareaTitle = document.getElementById("frmTareaTitle");
const newTaskName = document.getElementById("newTaskName");   // "Actividad"
const newUserName = document.getElementById("newUserName");   // "Responsable (Name)"
const newEmpresa = document.getElementById("newEmpresa");
const newGrupo = document.getElementById("newGrupo");
const newFolio = document.getElementById("newFolio");
const newHoras = document.getElementById("newHoras");
const createTaskBtn = document.getElementById("createTaskBtn");

const tasksTableBody = document.getElementById("tasksBody");
const usersTableBody = document.getElementById("usersBody");

/* Filtros */
const filterFecha = document.getElementById("filterFecha");
const chkExcludeFecha = document.getElementById("chkExcludeFecha");
const filterAsignado = document.getElementById("filterAsignado");
const chkExcludeAsignado = document.getElementById("chkExcludeAsignado");
const filterEstado = document.getElementById("filterEstado");
const chkExcludeEstado = document.getElementById("chkExcludeEstado");
const filterEmpresa = document.getElementById("filterEmpresa");
const chkExcludeEmpresa = document.getElementById("chkExcludeEmpresa");
const filterGrupo = document.getElementById("filterGrupo");
const chkExcludeGrupo = document.getElementById("chkExcludeGrupo");
const filterFolio = document.getElementById("filterFolio");
const chkExcludeFolio = document.getElementById("chkExcludeFolio");

const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

/****************************************************
 * DOMContentLoaded
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  authForm.addEventListener("submit", (e) => e.preventDefault());
  btnRegister.addEventListener("click", registerUser);
  btnLogin.addEventListener("click", loginUser);
  btnLogout.addEventListener("click", async () => await signOut(auth));

  createTaskBtn.addEventListener("click", handleTaskForm);

  btnTareas.addEventListener("click", () => {
    dashboardSection.style.display = "block";
    adminUsersSection.style.display = "none";
  });
  btnUsuarios.addEventListener("click", () => {
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "block";
  });

  btnAplicarFiltros.addEventListener("click", aplicarFiltros);
  btnLimpiarFiltros.addEventListener("click", limpiarFiltros);
});

/****************************************************
 * onAuthStateChanged
 ****************************************************/
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      currentRole = snap.data().role;
    } else {
      await setDoc(userRef, { role: DEFAULT_ROLE, email: user.email.toLowerCase() });
      currentRole = DEFAULT_ROLE;
    }

    // Muestra Dashboard, oculta login
    authSection.style.display = "none";
    loginFooter.style.display = "none";
    sidebar.style.display = "flex";
    dashboardSection.style.display = "block";

    userEmailSpan.textContent = user.email;
    userRoleSpan.textContent = currentRole;

    // Ocultamos la columna .colAsignado (email) para todos
    document.querySelectorAll(".colAsignado").forEach(col => {
      col.style.display = "none"; 
    });
    // Para consultor => oculta colResponsable y colAcciones
    if (currentRole === "consultor") {
      document.querySelectorAll(".colResponsable").forEach(col => col.style.display = "none");
      document.querySelectorAll(".colAcciones").forEach(col => col.style.display = "none");
      document.getElementById("rowFilterAsignado").style.display = "none";
    } else if (currentRole === "senior") {
      // Senior => ve colResponsable, oculta colAcciones
      document.querySelectorAll(".colResponsable").forEach(col => col.style.display = "");
      document.querySelectorAll(".colAcciones").forEach(col => col.style.display = "none");
    } else if (currentRole === "supervisor") {
      // Supervisor => ve colResponsable y colAcciones, no AdminUsers
      document.querySelectorAll(".colResponsable").forEach(col => col.style.display = "");
      document.querySelectorAll(".colAcciones").forEach(col => col.style.display = "");
      btnUsuarios.style.display = "none";
    } else if (currentRole === "admin") {
      // Admin => ve todo menos la colAsignado, la cual forzamos hidden
      document.querySelectorAll(".colResponsable").forEach(col => col.style.display = "");
      document.querySelectorAll(".colAcciones").forEach(col => col.style.display = "");
      btnUsuarios.style.display = "inline-block";
      loadAllUsers();
    }

    if (["admin","supervisor"].includes(currentRole)) {
      taskCreationDiv.style.display = "block";
    } else {
      taskCreationDiv.style.display = "none";
    }

    listenTasks();
  } else {
    // No user => regresa a login
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
  } catch (error) {
    authMessage.textContent = `Error al crear usuario: ${error.message}`;
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
  } catch (error) {
    authMessage.textContent = `Error al iniciar sesión: ${error.message}`;
  }
}

/****************************************************
 * CREAR/EDITAR TAREA
 ****************************************************/
async function handleTaskForm() {
  if (!newTaskName.value.trim() || !newUserName.value.trim()) {
    alert("Completa al menos la Actividad y el Nombre de Usuario (Responsable).");
    return;
  }
  try {
    // Buscar email por Nombre
    const emailResponsible = await findEmailByName(newUserName.value.trim());
    if (!emailResponsible) {
      alert("No existe un usuario con ese nombre.");
      return;
    }

    // Calcular ID correlativo
    const colRef = collection(db, "tasks");
    const snap = await getDocs(colRef);
    let maxId = 0;
    snap.forEach(d => {
      const data = d.data();
      if (data.idTarea && data.idTarea > maxId) {
        maxId = data.idTarea;
      }
    });
    const nextId = maxId + 1;

    if (editTaskId) {
      // Editar
      await updateDoc(doc(db, "tasks", editTaskId), {
        idTarea: nextId,
        userName: newUserName.value.trim(),
        assignedTo: emailResponsible,
        name: newTaskName.value.trim(),
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: newHoras.value.trim()
      });
      alert("Tarea editada correctamente.");
      clearTaskForm();
    } else {
      // Crear
      await addDoc(colRef, {
        idTarea: nextId,
        fechaAsignacion: new Date().toLocaleDateString("es-CL"),
        userName: newUserName.value.trim(),   // colResponsable
        assignedTo: emailResponsible,         // colAsignado (oculta)
        name: newTaskName.value.trim(),       // Actividad
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: newHoras.value.trim(),
        status: "Asignado",
        createdAt: new Date(),
        createdBy: currentUser.uid
      });
      alert("Tarea creada correctamente.");
      clearTaskForm();
    }
  } catch (err) {
    console.error("Error al crear/editar tarea:", err);
  }
}

function clearTaskForm() {
  newTaskName.value = "";
  newUserName.value = "";
  newEmpresa.value = "";
  newGrupo.value = "";
  newFolio.value = "";
  newHoras.value = "";
  editTaskId = null;
  frmTareaTitle.textContent = "Crear Tarea";
  createTaskBtn.textContent = "Crear Tarea";
}

/****************************************************
 * BUSCAR email POR userName
 ****************************************************/
async function findEmailByName(name) {
  const colRef = collection(db, "users");
  const snap = await getDocs(colRef);
  for (const docu of snap.docs) {
    const data = docu.data();
    if ((data.name || "").toLowerCase() === name.toLowerCase()) {
      return data.email;
    }
  }
  return null;
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

  // Filtra si consultor => assignedTo == su email
  let arr = tasksArray.slice();
  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => (t.assignedTo || "").toLowerCase() === currentUser.email.toLowerCase());
  }

  arr.forEach(task => {
    const tr = document.createElement("tr");

    // 1. ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea ?? "N/A";
    tr.appendChild(tdId);

    // 2. Fecha
    const tdFecha = document.createElement("td");
    tdFecha.textContent = task.fechaAsignacion ?? "--";
    tr.appendChild(tdFecha);

    // 3. Responsable => userName
    const tdResp = document.createElement("td");
    tdResp.classList.add("colResponsable");
    tdResp.textContent = task.userName || "";
    tr.appendChild(tdResp);

    // 4. Actividad => name
    const tdName = document.createElement("td");
    tdName.textContent = task.name || "";
    tr.appendChild(tdName);

    // 5. Estado + indicador
    const tdEstado = document.createElement("td");
    const selectStatus = document.createElement("select");
    // Lógica de estados
    let possibleStates = [...TASK_STATES];
    if (currentRole === "consultor") {
      if (["Finalizado","Reportar","Por revisar"].includes(task.status)) {
        possibleStates = [task.status];
      } else {
        possibleStates = ["Asignado","En proceso","Por revisar","SII","Municipalidad","Tesoreria","BPO"];
      }
    }
    if (currentRole === "senior") {
      if (["Finalizado","Reportar"].includes(task.status)) {
        possibleStates = [task.status];
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
      // confirm consultor -> "Por revisar"
      if (currentRole === "consultor" && newSt === "Por revisar" && task.status !== "Por revisar") {
        if (!confirm("¿Pasar a 'Por revisar'?")) {
          selectStatus.value = task.status;
          return;
        }
      }
      if (currentRole === "senior" && newSt === "Reportar" && task.status !== "Reportar") {
        if (!confirm("¿Pasar a 'Reportar'?")) {
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
    tdEstado.appendChild(selectStatus);

    const indicator = document.createElement("span");
    indicator.classList.add("status-indicator");
    const lowered = (task.status || "").toLowerCase().replace(" ", "-");
    indicator.classList.add(`status-${lowered}`);
    tdEstado.appendChild(indicator);

    tr.appendChild(tdEstado);

    // 6. Empresa
    const tdEmpresa = document.createElement("td");
    tdEmpresa.textContent = task.empresa || "";
    tr.appendChild(tdEmpresa);

    // 7. Grupo
    const tdGrupo = document.createElement("td");
    tdGrupo.textContent = task.grupoCliente || "";
    tr.appendChild(tdGrupo);

    // 8. Folio
    const tdFolio = document.createElement("td");
    tdFolio.textContent = task.folioProyecto || "";
    tr.appendChild(tdFolio);

    // 9. Horas
    const tdHoras = document.createElement("td");
    tdHoras.textContent = task.horasAsignadas || "";
    tr.appendChild(tdHoras);

    // 10. Acciones
    const tdAcc = document.createElement("td");
    tdAcc.classList.add("colAcciones");
    if (["admin","supervisor"].includes(currentRole)) {
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Editar";
      btnEdit.addEventListener("click", () => {
        editTaskId = task.docId;
        frmTareaTitle.textContent = "Editar Tarea (ID: "+(task.idTarea||"N/A")+")";
        createTaskBtn.textContent = "Actualizar Tarea";

        newTaskName.value = task.name || "";
        newUserName.value = task.userName || "";
        newEmpresa.value = task.empresa || "";
        newGrupo.value = task.grupoCliente || "";
        newFolio.value = task.folioProyecto || "";
        newHoras.value = task.horasAsignadas || "";
      });
      tdAcc.appendChild(btnEdit);

      const btnDel = document.createElement("button");
      btnDel.textContent = "Eliminar";
      btnDel.style.marginLeft = "5px";
      btnDel.addEventListener("click", async () => {
        if (confirm("¿Eliminar la tarea?")) {
          await deleteDoc(doc(db, "tasks", task.docId));
        }
      });
      tdAcc.appendChild(btnDel);
    }
    tr.appendChild(tdAcc);

    // 11. Asignado a (email) -> oculta
    // La definimos en la base, pero no la agregamos al DOM o la ocultamos
    // Sin crear la celda, ya que se indicó "ni el título ni los datos" deben verse.

    tasksTableBody.appendChild(tr);
  });
}

/****************************************************
 * LÓGICA DE CAMBIO DE ESTADO
 ****************************************************/
function canChangeStatus(role, currentSt, newSt) {
  if (role === "consultor") {
    if (["Finalizado","Reportar","Por revisar"].includes(currentSt)) return false;
    if (["Finalizado","Reportar"].includes(newSt)) return false;
    return true;
  }
  if (role === "senior") {
    if (["Finalizado","Reportar"].includes(currentSt)) return false;
    return true;
  }
  return true; // supervisor/admin => sin restricciones
}

async function updateTaskStatus(docId, newStatus) {
  try {
    await updateDoc(doc(db, "tasks", docId), { status: newStatus });
  } catch (err) {
    console.error("Error al cambiar estado:", err);
  }
}

/****************************************************
 * FILTROS
 ****************************************************/
function aplicarFiltros() {
  let arr = allTasks.slice();

  const valFecha = filterFecha.value.trim().toLowerCase();
  const exFecha = chkExcludeFecha.checked;
  const valAsig = filterAsignado.value.trim().toLowerCase();
  const exAsig = chkExcludeAsignado.checked;
  const valEst = filterEstado.value.trim().toLowerCase();
  const exEst = chkExcludeEstado.checked;
  const valEmp = filterEmpresa.value.trim().toLowerCase();
  const exEmp = chkExcludeEmpresa.checked;
  const valGru = filterGrupo.value.trim().toLowerCase();
  const exGru = chkExcludeGrupo.checked;
  const valFol = filterFolio.value.trim().toLowerCase();
  const exFol = chkExcludeFolio.checked;

  arr = arr.filter(t => {
    // Fecha
    if (valFecha) {
      const match = (t.fechaAsignacion||"").toLowerCase().includes(valFecha);
      if (exFecha) { if (match) return false; } else if (!match) return false;
    }
    // "Asignado a" => t.assignedTo
    if (valAsig) {
      const match = (t.assignedTo||"").toLowerCase().includes(valAsig);
      if (exAsig) { if (match) return false; } else if (!match) return false;
    }
    // Estado
    if (valEst) {
      const match = (t.status||"").toLowerCase().includes(valEst);
      if (exEst) { if (match) return false; } else if (!match) return false;
    }
    // Empresa
    if (valEmp) {
      const match = (t.empresa||"").toLowerCase().includes(valEmp);
      if (exEmp) { if (match) return false; } else if (!match) return false;
    }
    // Grupo
    if (valGru) {
      const match = (t.grupoCliente||"").toLowerCase().includes(valGru);
      if (exGru) { if (match) return false; } else if (!match) return false;
    }
    // Folio
    if (valFol) {
      const match = (t.folioProyecto||"").toLowerCase().includes(valFol);
      if (exFol) { if (match) return false; } else if (!match) return false;
    }
    return true;
  });

  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => (t.assignedTo||"").toLowerCase() === currentUser.email.toLowerCase());
  }
  renderTasks(arr);
}

function limpiarFiltros() {
  filterFecha.value = "";
  chkExcludeFecha.checked = false;
  filterAsignado.value = "";
  chkExcludeAsignado.checked = false;
  filterEstado.value = "";
  chkExcludeEstado.checked = false;
  filterEmpresa.value = "";
  chkExcludeEmpresa.checked = false;
  filterGrupo.value = "";
  chkExcludeGrupo.checked = false;
  filterFolio.value = "";
  chkExcludeFolio.checked = false;

  if (currentRole === "consultor" && currentUser) {
    renderTasks(allTasks.filter(t => (t.assignedTo||"").toLowerCase() === currentUser.email.toLowerCase()));
  } else {
    renderTasks(allTasks);
  }
}

/****************************************************
 * ADMIN: CARGAR/MODIFICAR USUARIOS
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
        console.error("Error actualizando name:", err);
      });
    });
    tdName.appendChild(inpName);
    tr.appendChild(tdName);

    // Rol
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
