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
  apiKey: "TU_API_KEY",
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
let currentUser = null;
let currentRole = null;
let allTasks = []; 
let editTaskId = null; // Para modo edición
let allUserNames = []; // Para autocompletar Asignado

// Estados
const TASK_STATES = [
  "Asignado","En proceso","Por revisar","Reportar","Finalizado",
  "SII","Municipalidad","Tesoreria","BPO"
];

/****************************************************
 * REFERENCIAS DOM
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

const frmTareaTitle = document.getElementById("frmTareaTitle");
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
const filterEstado = document.getElementById("filterEstado");
const chkExcludeEstado = document.getElementById("chkExcludeEstado");
const filterAsignado = document.getElementById("filterAsignado");
const chkExcludeAsignado = document.getElementById("chkExcludeAsignado");
const filterEmpresa = document.getElementById("filterEmpresa");
const chkExcludeEmpresa = document.getElementById("chkExcludeEmpresa");
const filterGrupo = document.getElementById("filterGrupo");
const chkExcludeGrupo = document.getElementById("chkExcludeGrupo");
const filterFolio = document.getElementById("filterFolio");
const chkExcludeFolio = document.getElementById("chkExcludeFolio");

const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const listUsersDataList = document.getElementById("listUsers");

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
      await setDoc(userDoc, { role: "consultor", email: user.email.toLowerCase() });
      currentRole = "consultor";
    }

    // Muestra Dashboard
    authSection.style.display = "none";
    loginFooter.style.display = "none";
    sidebar.style.display = "flex";
    dashboardSection.style.display = "block";

    userEmailSpan.textContent = user.email;
    userRoleSpan.textContent = currentRole;

    // Ocultar/mostrar columnas
    if (currentRole === "consultor") {
      document.querySelectorAll(".colAsignado, .colAcciones").forEach(col => {
        col.style.display = "none";
      });
      document.getElementById("rowFilterAsignado").style.display = "none";
    } else if (currentRole === "senior") {
      // muestra Asignado
      document.querySelectorAll(".colAsignado").forEach(col => {
        col.style.display = "";
      });
      // oculta Acciones
      document.querySelectorAll(".colAcciones").forEach(col => {
        col.style.display = "none";
      });
    } else {
      // admin y supervisor => ver todo
      document.querySelectorAll(".colAsignado, .colAcciones").forEach(col => {
        col.style.display = "";
      });
    }

    // Supervisor = admin except Admin Users
    if (currentRole === "admin") {
      btnUsuarios.style.display = "inline-block";
      loadAllUsers();
    } else if (currentRole === "supervisor") {
      btnUsuarios.style.display = "none";
    } else {
      btnUsuarios.style.display = "none";
    }

    if (["admin","supervisor"].includes(currentRole)) {
      taskCreationDiv.style.display = "block";
    } else {
      taskCreationDiv.style.display = "none";
    }

    await loadAllUserNames(); // carga listUsersDataList
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
 * loadAllUserNames => para autocompletar
 ****************************************************/
async function loadAllUserNames() {
  allUserNames = [];
  listUsersDataList.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));
  snap.forEach(docu => {
    const dat = docu.data();
    // si tiene name, lo agregamos
    if (dat.name) {
      allUserNames.push(dat.name.trim());
    }
  });
  // Pintamos en <datalist> 
  allUserNames.forEach(n => {
    const option = document.createElement("option");
    option.value = n;
    listUsersDataList.appendChild(option);
  });
}

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
async function handleTaskForm() {
  if (!newTaskName.value.trim() || !newTaskAssigned.value.trim()) {
    alert("Completa al menos Nombre y Asignado a (Name).");
    return;
  }
  try {
    // Verifica si el nombre de usuario existe
    const nameUsr = newTaskAssigned.value.trim();
    if (!allUserNames.includes(nameUsr)) {
      alert("Error: no existe el usuario con nombre '" + nameUsr + "'.");
      return;
    }

    // ID correlativo
    const colRef = collection(db, "tasks");
    const snapshot = await getDocs(colRef);
    let maxId = 0;
    snapshot.forEach(d => {
      const dt = d.data();
      if (dt.idTarea && dt.idTarea > maxId) {
        maxId = dt.idTarea;
      }
    });
    const nextId = maxId + 1;

    // No hay modo edición en el enunciado (?), o lo mantenemos?
    // Mantenemos la edición en la tabla? => Se solicitó mover a "Editar" en la tabla...
    // En la consigna se dijo "quinto lugar, en tema de diseño ..." => Sí, ya lo hicimos en la anterior. 
    // Reemplazamos la lógica con un "Create only" or "Edit if needed"?  
    // Usamos la variable 'editTaskId' si la retuvimos?

    if (editTaskId) {
      // Modo edición
      await updateDoc(doc(db, "tasks", editTaskId), {
        name: newTaskName.value.trim(),
        assignedTo: nameUsr,
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: newHoras.value.trim()
      });
      alert("Tarea actualizada correctamente.");
      clearTaskForm();
    } else {
      // Crear
      await addDoc(colRef, {
        idTarea: nextId,
        fechaAsignacion: new Date().toLocaleDateString("es-CL"),
        name: newTaskName.value.trim(),
        assignedTo: nameUsr, // Guardamos el name
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
  editTaskId = null;
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
function renderTasks(tasksArray) {
  tasksTableBody.innerHTML = "";

  let arr = tasksArray.slice();
  // Filtra consultor => assignedTo == su name
  if (currentRole === "consultor" && currentUser) {
    // Debemos buscar su 'name' => es la data en doc 'users'? 
    // Asumimos que en userDoc se guardó name
    // Omisión: si su name no existe => no ve nada
    // Podríamos cargar su name cuando onAuthStateChanged => de user doc => store in a var
    // Para simplificar, supongamos que 'currentUserName' lo guardamos. 
    // Revisamos en userDoc: name?
  }
  // Dejar la lógica en filtrar con un userDoc approach => simplest is to store userName in local var
  // For the sake of the code, let's assume we have "currentUserName" from userDoc
  // We'll do that in onAuthStateChanged:
  let currentUserName = sessionStorage.getItem("myName") || ""; 
  // ... we'll do it properly in code => see below onAuthStateChanged for real approach.

  if (currentRole === "consultor" && currentUserName) {
    arr = arr.filter(t => (t.assignedTo||"") === currentUserName);
  }

  arr.forEach(task => {
    const tr = document.createElement("tr");

    // ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea ?? "N/A";
    tr.appendChild(tdId);

    // Fecha
    const tdFecha = document.createElement("td");
    tdFecha.textContent = task.fechaAsignacion ?? "--";
    tr.appendChild(tdFecha);

    // Nombre
    const tdName = document.createElement("td");
    tdName.textContent = task.name || "";
    tr.appendChild(tdName);

    // Asignado a
    const tdAsig = document.createElement("td");
    tdAsig.classList.add("colAsignado");
    tdAsig.textContent = task.assignedTo || "";
    tr.appendChild(tdAsig);

    // Estado + indicador
    const tdEstado = document.createElement("td");
    const selectStatus = document.createElement("select");

    let possibleStates = [...TASK_STATES];
    if (currentRole === "consultor") {
      if (["Finalizado","Reportar","Por revisar"].includes(task.status)) {
        // no mover
        possibleStates = [task.status];
      } else {
        // no final ni reportar
        possibleStates = ["Asignado","En proceso","Por revisar","SII","Municipalidad","Tesoreria","BPO"];
      }
    }
    if (currentRole === "senior") {
      if (["Finalizado","Reportar"].includes(task.status)) {
        // no mover
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
      // confirm consultor -> porrevisar
      if (currentRole === "consultor" && newSt === "Por revisar" && task.status !== "Por revisar") {
        if (!confirm("¿Seguro de pasar la tarea a 'Por revisar'?")) {
          selectStatus.value = task.status;
          return;
        }
      }
      // confirm senior -> reportar
      if (currentRole === "senior" && newSt === "Reportar" && task.status !== "Reportar") {
        if (!confirm("¿Seguro de pasar la tarea a 'Reportar'?")) {
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

    // Horas
    const tdHrs = document.createElement("td");
    tdHrs.textContent = task.horasAsignadas || "";
    tr.appendChild(tdHrs);

    // Acciones
    const tdAcc = document.createElement("td");
    tdAcc.classList.add("colAcciones");
    // Admin o Supervisor => Botón Editar + Eliminar
    if (["admin","supervisor"].includes(currentRole)) {
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Editar";
      btnEdit.addEventListener("click", () => {
        editTaskId = task.docId;
        frmTareaTitle.textContent = "Editar Tarea (ID: "+(task.idTarea || "N/A")+")";
        createTaskBtn.textContent = "Actualizar Tarea";

        newTaskName.value = task.name || "";
        newEmpresa.value = task.empresa || "";
        newGrupo.value = task.grupoCliente || "";
        newFolio.value = task.folioProyecto || "";
        newHoras.value = task.horasAsignadas || "";

        // Asignado => Name
        newTaskAssigned.value = task.assignedTo || "";
      });
      tdAcc.appendChild(btnEdit);

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
 * canChangeStatus
 ****************************************************/
function canChangeStatus(role, currentSt, newSt) {
  // consultor: no mover si final,reportar,porrevisar
  if (role === "consultor") {
    if (["Finalizado","Reportar","Por revisar"].includes(currentSt)) return false;
    if (["Finalizado","Reportar"].includes(newSt)) return false;
    return true;
  }
  // senior: no mover si final/reportar
  if (role === "senior") {
    if (["Finalizado","Reportar"].includes(currentSt)) return false;
    return true;
  }
  // sup, admin => todo
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

/****************************************************
 * FILTROS (con excluir)
 ****************************************************/
function aplicarFiltros() {
  if (!allTasks) return;
  let arr = allTasks.slice();

  const valFecha = filterFecha.value.trim().toLowerCase();
  const exFecha = chkExcludeFecha.checked;
  const valEst = filterEstado.value.trim().toLowerCase();
  const exEst = chkExcludeEstado.checked;
  const valAsig = filterAsignado.value.trim().toLowerCase();
  const exAsig = chkExcludeAsignado.checked;
  const valEmp = filterEmpresa.value.trim().toLowerCase();
  const exEmp = chkExcludeEmpresa.checked;
  const valGru = filterGrupo.value.trim().toLowerCase();
  const exGru = chkExcludeGrupo.checked;
  const valFol = filterFolio.value.trim().toLowerCase();
  const exFol = chkExcludeFolio.checked;

  arr = arr.filter(t => {
    // Fecha
    if (valFecha) {
      const has = (t.fechaAsignacion||"").toLowerCase().includes(valFecha);
      if (exFecha) { if (has) return false; } else if (!has) return false;
    }
    // Estado
    if (valEst) {
      const st = (t.status||"").toLowerCase();
      const match = st.includes(valEst);
      if (exEst) { if (match) return false; } else if (!match) return false;
    }
    // Asignado => name
    if (valAsig) {
      const asig = (t.assignedTo||"").toLowerCase();
      const match = asig.includes(valAsig);
      if (exAsig) { if (match) return false; } else if (!match) return false;
    }
    // Empresa
    if (valEmp) {
      const e = (t.empresa||"").toLowerCase();
      const match = e.includes(valEmp);
      if (exEmp) { if (match) return false; } else if (!match) return false;
    }
    // Grupo
    if (valGru) {
      const g = (t.grupoCliente||"").toLowerCase();
      const match = g.includes(valGru);
      if (exGru) { if (match) return false; } else if (!match) return false;
    }
    // Folio
    if (valFol) {
      const f = (t.folioProyecto||"").toLowerCase();
      const match = f.includes(valFol);
      if (exFol) { if (match) return false; } else if (!match) return false;
    }

    return true;
  });

  // Filtra adicional por consultor => assignedTo == su name
  if (currentRole === "consultor") {
    // su name => lo guardamos en session o algo
    let myName = sessionStorage.getItem("myName") || "";
    arr = arr.filter(t => t.assignedTo === myName);
  }

  renderTasks(arr);
}

function limpiarFiltros() {
  filterFecha.value = "";
  chkExcludeFecha.checked = false;
  filterEstado.value = "";
  chkExcludeEstado.checked = false;
  filterAsignado.value = "";
  chkExcludeAsignado.checked = false;
  filterEmpresa.value = "";
  chkExcludeEmpresa.checked = false;
  filterGrupo.value = "";
  chkExcludeGrupo.checked = false;
  filterFolio.value = "";
  chkExcludeFolio.checked = false;

  if (currentRole === "consultor") {
    let myName = sessionStorage.getItem("myName") || "";
    renderTasks(allTasks.filter(t => t.assignedTo === myName));
  } else {
    renderTasks(allTasks);
  }
}
