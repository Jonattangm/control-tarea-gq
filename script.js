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
  getDocs,
  query,
  orderBy
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

// Para el panel de comentarios
let currentCommentTaskId = null;

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
const newUserName = document.getElementById("newUserName");
const newTaskName = document.getElementById("newTaskName");
const newEmpresa = document.getElementById("newEmpresa");
const newGrupo = document.getElementById("newGrupo");
const newFolio = document.getElementById("newFolio");
const newHoras = document.getElementById("newHoras");
const newFechaEntrega = document.getElementById("newFechaEntrega");
const createTaskBtn = document.getElementById("createTaskBtn");

const tasksTableBody = document.getElementById("tasksBody");
const usersTableBody = document.getElementById("usersBody");

/* Filtros */
const filterFecha = document.getElementById("filterFecha");
const chkExcludeFecha = document.getElementById("chkExcludeFecha");
const filterResponsable = document.getElementById("filterResponsable");
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
 * Panel de Comentarios
 ****************************************************/
const commentsPanel = document.getElementById("commentsPanel"); // div id="commentsPanel"
const commentTaskIdSpan = document.getElementById("commentTaskId"); // span id="commentTaskId"
const commentsListDiv = document.getElementById("commentsList");    // div id="commentsList"
const commentTextArea = document.getElementById("commentText");     // textarea id="commentText"
const addCommentBtn = document.getElementById("addCommentBtn");
const closeCommentsBtn = document.getElementById("closeCommentsBtn");

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

  // Eventos para el panel de comentarios
  if (addCommentBtn) {
    addCommentBtn.addEventListener("click", addNewComment);
  }
  if (closeCommentsBtn) {
    closeCommentsBtn.addEventListener("click", () => {
      commentsPanel.style.display = "none";
      currentCommentTaskId = null;
      commentsListDiv.innerHTML = "";
      commentTextArea.value = "";
    });
  }
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

    authSection.style.display = "none";
    loginFooter.style.display = "none";
    sidebar.style.display = "flex";
    dashboardSection.style.display = "block";

    userEmailSpan.textContent = user.email;
    userRoleSpan.textContent = currentRole;

    // Ocultar col "Asignado" para todos
    document.querySelectorAll(".colAsignado").forEach(el => {
      el.style.display = "none";
    });

    // Títulos en blanco consultor => "Responsable" y "Acciones"
    // Senior => "Acciones" en blanco
    const thResp = document.getElementById("thResp");
    const thAcc = document.getElementById("thAcc");
    if (currentRole === "consultor") {
      thResp.textContent = "";
      thAcc.textContent = "";
      document.getElementById("rowFilterAsignado").style.display = "none";
    } else if (currentRole === "senior") {
      thAcc.textContent = "";
    }

    // Si admin => ver users
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

    listenTasks();
  } else {
    // sin user
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
 * CREAR / EDITAR TAREA
 ****************************************************/
async function handleTaskForm() {
  if (!newUserName.value.trim() || !newTaskName.value.trim()) {
    alert("Completa al menos 'Responsable' y 'Actividad'.");
    return;
  }
  try {
    const emailResponsible = await findEmailByName(newUserName.value.trim());
    if (!emailResponsible) {
      alert("No existe un usuario con ese 'Responsable (Name)'.");
      return;
    }

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
      // Update
      await updateDoc(doc(db, "tasks", editTaskId), {
        idTarea: nextId,
        userName: newUserName.value.trim(),
        assignedTo: emailResponsible,
        name: newTaskName.value.trim(),
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: newHoras.value.trim(),
        fechaEntrega: newFechaEntrega.value || null
      });
      alert("Tarea actualizada.");
      clearTaskForm();
    } else {
      // Create
      await addDoc(colRef, {
        idTarea: nextId,
        fechaAsignacion: new Date().toLocaleDateString("es-CL"), // dd-mm-aaaa
        fechaEntrega: newFechaEntrega.value || null,
        userName: newUserName.value.trim(),
        assignedTo: emailResponsible,
        name: newTaskName.value.trim(),
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: newHoras.value.trim(),
        status: "Asignado",
        createdAt: new Date(),
        createdBy: currentUser.uid
      });
      alert("Tarea creada.");
      clearTaskForm();
    }
  } catch (err) {
    console.error("Error al crear/editar tarea:", err);
  }
}

function clearTaskForm() {
  newUserName.value = "";
  newTaskName.value = "";
  newEmpresa.value = "";
  newGrupo.value = "";
  newFolio.value = "";
  newHoras.value = "";
  newFechaEntrega.value = "";
  editTaskId = null;
  frmTareaTitle.textContent = "Crear Tarea";
  createTaskBtn.textContent = "Crear Tarea";
}

/** Buscar email por userName **/
async function findEmailByName(name) {
  const snap = await getDocs(collection(db, "users"));
  for (const docu of snap.docs) {
    const dat = docu.data();
    if ((dat.name || "").toLowerCase() === name.toLowerCase()) {
      return dat.email;
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
 * RENDER TAREAS (incluye columna "Última actividad" y botón "Comentarios")
 ****************************************************/
function renderTasks(tasksArray) {
  tasksTableBody.innerHTML = "";

  let arr = tasksArray.slice();
  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => (t.assignedTo||"").toLowerCase() === currentUser.email.toLowerCase());
  }

  arr.forEach(task => {
    const tr = document.createElement("tr");

    // col 1) Responsable => consultor => blanco
    const tdResp = document.createElement("td");
    tdResp.textContent = (currentRole === "consultor") ? "" : (task.userName || "");
    tr.appendChild(tdResp);

    // col 2) ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea ?? "N/A";
    tr.appendChild(tdId);

    // col 3) Fecha Asignación
    const tdFechaAsig = document.createElement("td");
    tdFechaAsig.textContent = task.fechaAsignacion || "--";
    tr.appendChild(tdFechaAsig);

    // col 4) Fecha de Entrega => dd-mm-aaaa + (días) => ya implementado
    const tdFechaEnt = document.createElement("td");
    if (task.fechaEntrega) {
      const formatted = formatDDMMYYYY(task.fechaEntrega);
      let daysBetween = 0;
      if (task.status === "Finalizado") {
        daysBetween = 0;
        tdFechaEnt.textContent = `${formatted} (0)`;
      } else {
        daysBetween = calcBusinessDaysDiff(new Date(), parseDateDMY(formatted));
        if (daysBetween < 0) daysBetween = 0;
        tdFechaEnt.textContent = `${formatted} (${daysBetween})`;

        if (daysBetween <= 2) {
          tdFechaEnt.classList.add("fecha-rojo");
        } else if (daysBetween <= 5) {
          tdFechaEnt.classList.add("fecha-naranjo");
        } else if (daysBetween <= 8) {
          tdFechaEnt.classList.add("fecha-amarillo");
        } else if (daysBetween <= 11) {
          tdFechaEnt.classList.add("fecha-verde");
        } else {
          tdFechaEnt.classList.add("fecha-azul");
        }
      }
    } else {
      tdFechaEnt.textContent = "";
    }
    tr.appendChild(tdFechaEnt);

    // col 5) Actividad
    const tdAct = document.createElement("td");
    tdAct.textContent = task.name || "";
    tr.appendChild(tdAct);

    // col 6) Estado + select
    const tdEstado = document.createElement("td");
    const selectStatus = document.createElement("select");

    // Senior => no Finalizado
    let possibleStates = [...TASK_STATES];
    if (currentRole === "senior") {
      possibleStates = possibleStates.filter(s => s !== "Finalizado");
      if (["Finalizado","Reportar"].includes(task.status)) {
        possibleStates = [task.status];
      }
    }
    // consultor => no final/reportar
    if (currentRole === "consultor") {
      if (["Finalizado","Reportar","Por revisar"].includes(task.status)) {
        possibleStates = [task.status];
      } else {
        possibleStates = ["Asignado","En proceso","Por revisar","SII","Municipalidad","Tesoreria","BPO"];
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
        alert("No tienes permiso para ese cambio.");
        selectStatus.value = task.status;
      } else {
        updateTaskStatus(task.docId, newSt);
      }
    });
    tdEstado.appendChild(selectStatus);

    // Indicador color
    const indicator = document.createElement("span");
    indicator.classList.add("status-indicator");
    const lowered = (task.status||"").toLowerCase().replace(" ", "-");
    indicator.classList.add(`status-${lowered}`);
    tdEstado.appendChild(indicator);
    tr.appendChild(tdEstado);

    // col 7) Empresa
    const tdEmp = document.createElement("td");
    tdEmp.textContent = task.empresa || "";
    tr.appendChild(tdEmp);

    // col 8) Grupo
    const tdGru = document.createElement("td");
    tdGru.textContent = task.grupoCliente || "";
    tr.appendChild(tdGru);

    // col 9) Folio
    const tdFolio = document.createElement("td");
    tdFolio.textContent = task.folioProyecto || "";
    tr.appendChild(tdFolio);

    // col 10) Horas
    const tdHrs = document.createElement("td");
    tdHrs.textContent = task.horasAsignadas || "";
    tr.appendChild(tdHrs);

    // col 11) Última actividad (fecha/hora del último comentario)
    const tdLastAct = document.createElement("td");
    if (task.lastCommentAt) {
      // lastCommentAt es un Timestamp => .toDate()
      const d = task.lastCommentAt.toDate();
      tdLastAct.textContent = new Date(d).toLocaleString("es-CL");
    } else {
      tdLastAct.textContent = "--";
    }
    tr.appendChild(tdLastAct);

    // col 12) Acciones
    const tdAcc = document.createElement("td");
    if (["consultor","senior","supervisor","admin"].includes(currentRole)) {
      // Botón Editar/Eliminar solo si admin/supervisor
      if (["admin","supervisor"].includes(currentRole)) {
        const btnEdit = document.createElement("button");
        btnEdit.textContent = "Editar";
        btnEdit.addEventListener("click", () => {
          editTaskId = task.docId;
          frmTareaTitle.textContent = "Editar Tarea (ID: " + (task.idTarea||"N/A") + ")";
          createTaskBtn.textContent = "Actualizar Tarea";

          newUserName.value = task.userName || "";
          newTaskName.value = task.name || "";
          newEmpresa.value = task.empresa || "";
          newGrupo.value = task.grupoCliente || "";
          newFolio.value = task.folioProyecto || "";
          newHoras.value = task.horasAsignadas || "";
          newFechaEntrega.value = task.fechaEntrega || "";
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

      // (Comentarios) => lo permitimos a todos
      const btnComments = document.createElement("button");
      btnComments.textContent = "Comentarios";
      btnComments.style.marginLeft = "5px";
      btnComments.addEventListener("click", () => {
        openCommentsPanel(task.docId, task.idTarea);
      });
      tdAcc.appendChild(btnComments);

    } else {
      // Ninguna acción
      tdAcc.textContent = "";
    }
    tr.appendChild(tdAcc);

    tasksTableBody.appendChild(tr);
  });
}

/****************************************************
 * openCommentsPanel => abre submenú de comentarios
 ****************************************************/
function openCommentsPanel(taskDocId, tareaId) {
  currentCommentTaskId = taskDocId;
  document.getElementById("commentTaskId").textContent = tareaId || "N/A";

  const panel = document.getElementById("commentsPanel");
  if (panel) {
    panel.style.display = "block";
  }
  loadComments(taskDocId);
}

/****************************************************
 * loadComments => lee subcoleccion tasks/{taskId}/comments
 ****************************************************/
async function loadComments(taskDocId) {
  const cList = document.getElementById("commentsList");
  if (cList) {
    cList.innerHTML = "Cargando...";
  }
  const cRef = collection(db, "tasks", taskDocId, "comments");
  // Ordenar por fecha asc
  const qComments = query(cRef, orderBy("createdAt","asc"));
  const snap = await getDocs(qComments);
  let html = "";
  snap.forEach(docu => {
    const c = docu.data();
    const dateStr = c.createdAt ? new Date(c.createdAt.toDate()).toLocaleString("es-CL") : "";
    html += `
      <div class="comment-item">
        <div class="comment-author"><b>${c.authorEmail || "Desconocido"}</b></div>
        <div class="comment-text">${c.text || ""}</div>
        <div class="comment-date" style="font-size:0.8rem;color:#888;">${dateStr}</div>
      </div>
    `;
  });
  cList.innerHTML = html || "<p>Sin comentarios</p>";
}

/****************************************************
 * addNewComment => agrega un comentario
 ****************************************************/
async function addNewComment() {
  if (!currentCommentTaskId) return;
  const text = commentTextArea.value.trim();
  if (!text) {
    alert("Escribe un comentario");
    return;
  }
  try {
    const cRef = collection(db, "tasks", currentCommentTaskId, "comments");
    await addDoc(cRef, {
      text,
      authorEmail: currentUser ? currentUser.email : "anónimo",
      createdAt: new Date()
    });
    // Actualizamos lastCommentAt en la task
    await updateDoc(doc(db, "tasks", currentCommentTaskId), {
      lastCommentAt: new Date()
    });
    commentTextArea.value = "";
    loadComments(currentCommentTaskId);
  } catch (err) {
    console.error("Error agregando comentario:", err);
  }
}

/****************************************************
 * canChangeStatus
 ****************************************************/
function canChangeStatus(role, currentSt, newSt) {
  if (role === "senior") {
    if (newSt === "Finalizado" && currentSt !== "Finalizado") {
      return false;
    }
    if (["Finalizado","Reportar"].includes(currentSt)) return false;
    return true;
  }
  if (role === "consultor") {
    if (["Finalizado","Reportar","Por revisar"].includes(currentSt)) return false;
    if (["Finalizado","Reportar"].includes(newSt)) return false;
    return true;
  }
  return true;
}

/****************************************************
 * updateTaskStatus
 ****************************************************/
async function updateTaskStatus(docId, newStatus) {
  try {
    await updateDoc(doc(db, "tasks", docId), { status: newStatus });
  } catch (error) {
    console.error("Error al cambiar estado:", error);
  }
}

/****************************************************
 * FILTROS
 ****************************************************/
function aplicarFiltros() {
  let arr = allTasks.slice();

  const valFecha = filterFecha.value.trim().toLowerCase();
  const exFecha = chkExcludeFecha.checked;
  const valResp = filterResponsable.value.trim().toLowerCase();
  const exResp = chkExcludeAsignado.checked;
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
    // ResponsAble => t.userName
    if (valResp) {
      const match = (t.userName||"").toLowerCase().includes(valResp);
      if (exResp) { if (match) return false; } else if (!match) return false;
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

  // consultor => solo asignadas a él
  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => (t.assignedTo||"").toLowerCase() === currentUser.email.toLowerCase());
  }
  renderTasks(arr);
}

function limpiarFiltros() {
  filterFecha.value = "";
  chkExcludeFecha.checked = false;
  filterResponsable.value = "";
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

    // Nombre => confirm
    const tdName = document.createElement("td");
    const inpName = document.createElement("input");
    inpName.type = "text";
    inpName.value = u.name || "";
    inpName.addEventListener("change", async () => {
      if (!confirm("¿Confirmar cambio de Nombre de Usuario?")) {
        inpName.value = u.name || "";
        return;
      }
      try {
        await updateDoc(doc(db, "users", docu.id), { name: inpName.value });
        u.name = inpName.value;
      } catch (er) {
        console.error("Error actualizando name:", er);
      }
    });
    tdName.appendChild(inpName);
    tr.appendChild(tdName);

    // Rol => texto
    const tdRole = document.createElement("td");
    tdRole.textContent = u.role || "consultor";
    tr.appendChild(tdRole);

    // Cambiar Rol => confirm
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
      if (!confirm(`¿Confirmar cambio de Rol a "${selectRole.value}"?`)) {
        selectRole.value = u.role;
        return;
      }
      try {
        await updateDoc(doc(db, "users", docu.id), { role: selectRole.value });
        u.role = selectRole.value;
        tdRole.textContent = selectRole.value;
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
 * calcBusinessDaysDiff => días hábiles
 ****************************************************/
function calcBusinessDaysDiff(fromDate, toDate) {
  if (!fromDate || !toDate) return 9999;
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  if (end < start) return -1;

  let days = 0;
  let current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  return days - 1;
}

/****************************************************
 * Convertir AAAA-MM-DD => DD-MM-AAAA
 ****************************************************/
function formatDDMMYYYY(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return "";
  const [y, m, d] = yyyy_mm_dd.split("-");
  return `${d}-${m}-${y}`;
}

/****************************************************
 * parseDateDMY => "DD-MM-AAAA" => Date
 ****************************************************/
function parseDateDMY(dd_mm_yyyy) {
  if (!dd_mm_yyyy) return null;
  const [d, m, y] = dd_mm_yyyy.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}
