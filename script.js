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
let allTasks = []; 
let editTaskId = null; // Para modo edición

// Agregamos estados extras
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
  authForm?.addEventListener("submit", (e) => e.preventDefault());
  btnRegister?.addEventListener("click", registerUser);
  btnLogin?.addEventListener("click", loginUser);
  btnLogout?.addEventListener("click", async () => await signOut(auth));

  createTaskBtn?.addEventListener("click", handleTaskForm);

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

    // Ocultar/mostrar columnas según rol
    if (currentRole === "consultor") {
      document.querySelectorAll(".colAsignado, .colAcciones").forEach(col => {
        col.style.display = "none";
      });
      // Oculta rowFilterAsignado
      document.getElementById("rowFilterAsignado").style.display = "none";
    } else if (currentRole === "senior") {
      // Solo oculta colAcciones
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
 * CREAR/EDITAR TAREA
 ****************************************************/
// Botón del formulario de tareas
async function handleTaskForm() {
  if (!newTaskName.value.trim() || !newTaskAssigned.value.trim()) {
    alert("Completa al menos Nombre y Asignado a (nombre usuario o email).");
    return;
  }
  try {
    if (editTaskId) {
      // Modo edición: Actualizar
      const assignedEmail = await convertUserNameToEmail(newTaskAssigned.value.trim());
      await updateDoc(doc(db, "tasks", editTaskId), {
        name: newTaskName.value.trim(),
        assignedTo: assignedEmail,
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: newHoras.value.trim()
      });
      alert("Tarea actualizada correctamente.");
      clearTaskForm();
    } else {
      // Modo creación
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
      const assignedEmail = await convertUserNameToEmail(newTaskAssigned.value.trim());

      await addDoc(colRef, {
        idTarea: nextId,
        fechaAsignacion: new Date().toLocaleDateString("es-CL"),
        name: newTaskName.value.trim(),
        assignedTo: assignedEmail,
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
    console.error("Error creando/editando tarea:", err);
  }
}

function clearTaskForm() {
  newTaskName.value = "";
  newTaskAssigned.value = "";
  newEmpresa.value = "";
  newGrupo.value = "";
  newFolio.value = "";
  newHoras.value = "";
  editTaskId = null; // Quita modo edición
  document.getElementById("frmTareaTitle").textContent = "Crear Tarea";
  createTaskBtn.textContent = "Crear Tarea";
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
async function renderTasks(tasksArray) {
  tasksTableBody.innerHTML = "";

  // Para mostrar “Asignado a” -> buscar user name si existe
  const allUsers = {};
  const usersSnap = await getDocs(collection(db, "users"));
  usersSnap.forEach(uDoc => {
    const dat = uDoc.data();
    if (dat.email) {
      allUsers[dat.email.toLowerCase()] = dat.name || null; 
    }
  });

  // Filtra si consultor => solo sus tareas
  let arr = tasksArray.slice();
  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => (t.assignedTo||"").toLowerCase() === currentUser.email.toLowerCase());
  }

  arr.forEach(task => {
    const tr = document.createElement("tr");

    // ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea ?? "N/A";
    tr.appendChild(tdId);

    // Fecha Asignación
    const tdFecha = document.createElement("td");
    tdFecha.textContent = task.fechaAsignacion ?? "--";
    tr.appendChild(tdFecha);

    // Nombre
    const tdName = document.createElement("td");
    tdName.textContent = task.name || "";
    tr.appendChild(tdName);

    // Asignado a -> Nombre de usuario si existe
    const tdAssigned = document.createElement("td");
    let userName = allUsers[(task.assignedTo||"").toLowerCase()];
    tdAssigned.textContent = userName ? userName : task.assignedTo;
    tr.appendChild(tdAssigned);

    // Estado + indicador
    const tdEstado = document.createElement("td");
    const selectStatus = document.createElement("select");

    // Lógica de qué estados mostrar
    let possibleStates = TASK_STATES.slice();
    if (currentRole === "consultor") {
      // No final/reportar, no revertir por revisar
      if (["Finalizado","Reportar","Por revisar"].includes(task.status)) {
        // no puede cambiar
        possibleStates = [task.status];
      } else {
        possibleStates = ["Asignado","En proceso","Por revisar","SII","Municipalidad","Tesoreria","BPO"];
      }
    }
    if (currentRole === "senior") {
      // no mover si final/reportar
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
      // confirm consultor -> por revisar
      if (currentRole === "consultor" && newSt === "Por revisar" && task.status !== "Por revisar") {
        if (!confirm("¿Seguro de pasar la tarea a Por revisar?")) {
          selectStatus.value = task.status;
          return;
        }
      }
      // confirm senior -> reportar
      if (currentRole === "senior" && newSt === "Reportar" && task.status !== "Reportar") {
        if (!confirm("¿Seguro de pasar la tarea a Reportar?")) {
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
    const lowered = (task.status||"").toLowerCase().replace(" ", "-");
    indicator.classList.add(`status-${lowered}`);

    tdEstado.appendChild(selectStatus);
    tdEstado.appendChild(indicator);
    tr.appendChild(tdEstado);

    // Empresa
    const tdEmpresa = document.createElement("td");
    tdEmpresa.textContent = task.empresa || "";
    tr.appendChild(tdEmpresa);

    // Grupo
    const tdGrupo = document.createElement("td");
    tdGrupo.textContent = task.grupoCliente || "";
    tr.appendChild(tdGrupo);

    // Folio
    const tdFolio = document.createElement("td");
    tdFolio.textContent = task.folioProyecto || "";
    tr.appendChild(tdFolio);

    // Horas
    const tdHoras = document.createElement("td");
    tdHoras.textContent = task.horasAsignadas || "";
    tr.appendChild(tdHoras);

    // Acciones
    const tdAcc = document.createElement("td");
    tdAcc.classList.add("colAcciones");
    // Admin o Supervisor => Botón "Editar" y "Eliminar"
    if ((currentRole === "admin") || (currentRole === "supervisor")) {
      // Botón Editar
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Editar";
      btnEdit.addEventListener("click", () => {
        // Carga datos en el form
        editTaskId = task.docId;
        document.getElementById("frmTareaTitle").textContent = "Editar Tarea (ID: "+task.idTarea+")";
        createTaskBtn.textContent = "Actualizar Tarea";
        newTaskName.value = task.name || "";
        // Convert assignedTo -> name si existe
        let userName = allUsers[(task.assignedTo||"").toLowerCase()];
        if (userName) {
          newTaskAssigned.value = userName;
        } else {
          newTaskAssigned.value = task.assignedTo;
        }
        newEmpresa.value = task.empresa || "";
        newGrupo.value = task.grupoCliente || "";
        newFolio.value = task.folioProyecto || "";
        newHoras.value = task.horasAsignadas || "";
      });
      tdAcc.appendChild(btnEdit);

      // Botón Eliminar
      const btnDel = document.createElement("button");
      btnDel.textContent = "Eliminar";
      btnDel.style.marginLeft = "5px";
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
 * CAMBIO DE ESTADO
 ****************************************************/
function canChangeStatus(role, currentSt, newSt) {
  // Consultor: NO mover si (Finalizado, Reportar, Por revisar)
  // Senior: NO mover si (Finalizado, Reportar)
  if (role === "consultor") {
    // Si ya está en Finalizado, Reportar o Por revisar => no mover
    if (["Finalizado","Reportar","Por revisar"].includes(currentSt)) return false;

    // no puede usar finalizado, reportar
    if (["Finalizado","Reportar"].includes(newSt)) return false;
    return true;
  }

  if (role === "senior") {
    // no mover si finalizado/reportar
    if (["Finalizado","Reportar"].includes(currentSt)) return false;
    return true;
  }

  // Supervisor, Admin => todo
  return true;
}

async function updateTaskStatus(docId, newStatus) {
  try {
    await updateDoc(doc(db, "tasks", docId), { status: newStatus });
  } catch (err) {
    console.error("Error al cambiar estado:", err);
  }
}

/****************************************************
 * Convertir nombre a email
 ****************************************************/
async function convertUserNameToEmail(nameOrEmail) {
  const colRef = collection(db, "users");
  const snapshot = await getDocs(colRef);
  for (const docu of snapshot.docs) {
    const dat = docu.data();
    if ((dat.name||"").toLowerCase() === nameOrEmail) {
      return dat.email || docu.id;
    }
  }
  return nameOrEmail; // asume que es email si no coincide
}

/****************************************************
 * ADMIN: Cargar/Modificar usuarios
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

/****************************************************
 * FILTROS (con excluir)
 ****************************************************/
function aplicarFiltros() {
  if (!allTasks) return;
  let arr = allTasks.slice();

  // Captura
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
    // Filtro/Exclusión por Fecha Asignación
    if (valFecha) {
      const has = (t.fechaAsignacion||"").toLowerCase().includes(valFecha);
      if (exFecha) {
        if (has) return false;
      } else {
        if (!has) return false;
      }
    }
    // Asignado
    if (valAsig) {
      const assigned = (t.assignedTo||"").toLowerCase();
      const match = assigned.includes(valAsig);
      if (exAsig) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Estado
    if (valEst) {
      const st = (t.status||"").toLowerCase();
      const match = st.includes(valEst);
      if (exEst) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Empresa
    if (valEmp) {
      const e = (t.empresa||"").toLowerCase();
      const match = e.includes(valEmp);
      if (exEmp) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Grupo
    if (valGru) {
      const g = (t.grupoCliente||"").toLowerCase();
      const match = g.includes(valGru);
      if (exGru) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Folio
    if (valFol) {
      const f = (t.folioProyecto||"").toLowerCase();
      const match = f.includes(valFol);
      if (exFol) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }

    return true;
  });

  // Filtra adicional por consultor
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

  // Filtra adicional por consultor
  if (currentRole === "consultor" && currentUser) {
    renderTasks(allTasks.filter(t => (t.assignedTo||"").toLowerCase() === currentUser.email.toLowerCase()));
  } else {
    renderTasks(allTasks);
  }
}
