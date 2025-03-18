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
let currentCommentTaskId = null; // Guardamos el taskId actual para comentarios

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

/* Filtros => Responsables, Estado, Empresa, Grupo */
const filterResponsable = document.getElementById("filterResponsable");
const chkExcludeAsignado = document.getElementById("chkExcludeAsignado");
const filterEstado = document.getElementById("filterEstado");
const chkExcludeEstado = document.getElementById("chkExcludeEstado");
const filterEmpresa = document.getElementById("filterEmpresa");
const chkExcludeEmpresa = document.getElementById("chkExcludeEmpresa");
const filterGrupo = document.getElementById("filterGrupo");
const chkExcludeGrupo = document.getElementById("chkExcludeGrupo");

const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

/****************************************************
 * Panel de Comentarios
 ****************************************************/
const commentsPanel = document.getElementById("commentsPanel");
const commentTaskIdSpan = document.getElementById("commentTaskId");
const commentsListDiv = document.getElementById("commentsList");
const commentTextArea = document.getElementById("commentText");
const addCommentBtn = document.getElementById("addCommentBtn");
const closeCommentsBtn = document.getElementById("closeCommentsBtn");

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

    // Cargar role
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

    // (Quitar la lógica de rowFilterAsignado => no existe)
    // No ocultamos nada al consultor, simplemente mostramos.

    if (["admin","supervisor"].includes(currentRole)) {
      taskCreationDiv.style.display = "block";
    } else {
      taskCreationDiv.style.display = "none";
    }

    // Si admin => ver usuarios
    if (currentRole === "admin") {
      btnUsuarios.style.display = "inline-block";
      loadAllUsers();
    } else {
      btnUsuarios.style.display = "none";
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
    // Buscar mail por name
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
        fechaAsignacion: new Date().toLocaleDateString("es-CL"),
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

/** Buscar email por name => doc(users).name => email */
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
 * RENDER TAREAS
 ****************************************************/
function renderTasks(tasksArray) {
  tasksTableBody.innerHTML = "";

  // Filtrar consultor => solo sus tareas
  let arr = tasksArray.slice();
  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => (t.assignedTo||"").toLowerCase() === currentUser.email.toLowerCase());
  }

  arr.forEach(task => {
    const tr = document.createElement("tr");

    // (1) Responsable
    const tdResp = document.createElement("td");
    tdResp.textContent = task.userName || "";
    tr.appendChild(tdResp);

    // (2) ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea ?? "N/A";
    tr.appendChild(tdId);

    // (3) Fecha Asignación
    const tdFechaAsig = document.createElement("td");
    tdFechaAsig.textContent = task.fechaAsignacion || "--";
    tr.appendChild(tdFechaAsig);

    // (4) Fecha de Entrega => con colores
    const tdFechaEnt = document.createElement("td");
    if (task.fechaEntrega) {
      const formatted = formatDDMMYYYY(task.fechaEntrega);
      if (task.status === "Finalizado") {
        // si está finalizada => (0), sin color
        tdFechaEnt.textContent = `${formatted} (0)`;
      } else {
        let diff = calcBusinessDaysDiff(new Date(), parseDateDMY(formatted));
        if (diff < 0) diff = 0;
        tdFechaEnt.textContent = `${formatted} (${diff})`;
        // Colores
        if (diff <= 2) {
          tdFechaEnt.classList.add("fecha-rojo");
        } else if (diff <= 5) {
          tdFechaEnt.classList.add("fecha-naranjo");
        } else if (diff <= 8) {
          tdFechaEnt.classList.add("fecha-amarillo");
        } else if (diff <= 11) {
          tdFechaEnt.classList.add("fecha-verde");
        } else {
          tdFechaEnt.classList.add("fecha-azul");
        }
      }
    } else {
      tdFechaEnt.textContent = "";
    }
    tr.appendChild(tdFechaEnt);

    // (5) Actividad
    const tdAct = document.createElement("td");
    tdAct.textContent = task.name || "";
    tr.appendChild(tdAct);

    // (6) Estado
    const tdEstado = document.createElement("td");
    const selectStatus = document.createElement("select");

    let possibleStates = [...TASK_STATES];
    // Senior => quita "Finalizado"
    if (currentRole === "senior") {
      possibleStates = possibleStates.filter(s => s !== "Finalizado");
      if (["Finalizado","Reportar"].includes(task.status)) {
        possibleStates = [task.status];
      }
    }
    // Consultor => quita "Finalizado"/"Reportar"
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

    // (7) Empresa
    const tdEmp = document.createElement("td");
    tdEmp.textContent = task.empresa || "";
    tr.appendChild(tdEmp);

    // (8) Grupo
    const tdGru = document.createElement("td");
    tdGru.textContent = task.grupoCliente || "";
    tr.appendChild(tdGru);

    // (9) Folio
    const tdFolio = document.createElement("td");
    tdFolio.textContent = task.folioProyecto || "";
    tr.appendChild(tdFolio);

    // (10) Horas
    const tdHrs = document.createElement("td");
    tdHrs.textContent = task.horasAsignadas || "";
    tr.appendChild(tdHrs);

    // (11) Última actividad => task.lastCommentAt
    const tdLastAct = document.createElement("td");
    if (task.lastCommentAt) {
      const d = task.lastCommentAt.toDate();
      tdLastAct.textContent = d.toLocaleString("es-CL");
    } else {
      tdLastAct.textContent = "--";
    }
    tr.appendChild(tdLastAct);

    // (12) Acciones => todos los roles pueden ver "Comentarios"
    const tdAcc = document.createElement("td");
    // Admin/Supervisor => Editar/Eliminar
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

    // Botón Comentarios => todos los roles
    const btnComments = document.createElement("button");
    btnComments.textContent = "Comentarios";
    btnComments.style.marginLeft = "5px";
    btnComments.addEventListener("click", () => {
      openCommentsPanel(task.docId, task.idTarea);
    });
    tdAcc.appendChild(btnComments);

    tr.appendChild(tdAcc);

    tasksTableBody.appendChild(tr);
  });
}

/****************************************************
 * openCommentsPanel => abrir el panel de comentarios
 ****************************************************/
function openCommentsPanel(taskDocId, tareaId) {
  currentCommentTaskId = taskDocId;
  if (commentTaskIdSpan) {
    commentTaskIdSpan.textContent = tareaId || "N/A";
  }
  if (commentsPanel) {
    commentsPanel.style.display = "block";
  }
  loadComments(taskDocId);
}

/****************************************************
 * loadComments => tasks/{taskDocId}/comments
 ****************************************************/
async function loadComments(taskDocId) {
  if (!commentsListDiv) return;
  commentsListDiv.innerHTML = "Cargando...";

  const cRef = collection(db, "tasks", taskDocId, "comments");
  const qRef = query(cRef, orderBy("createdAt","asc"));
  const snap = await getDocs(qRef);

  let html = "";
  for (const docu of snap.docs) {
    const c = docu.data();
    // Muestra name en lugar de email => busquemos su name
    const authorName = await findNameByEmail(c.authorEmail || "");
    const dateStr = c.createdAt ? new Date(c.createdAt.toDate()).toLocaleString("es-CL") : "";

    html += `
      <div class="comment-item">
        <div class="comment-author"><b>${authorName || "Desconocido"}</b></div>
        <div class="comment-text">${c.text || ""}</div>
        <div class="comment-date" style="font-size:0.8rem;color:#888;">${dateStr}</div>
        <button style="margin-top:4px;" onclick="deleteComment('${docu.id}')">Eliminar</button>
      </div>
    `;
  }
  commentsListDiv.innerHTML = html || "<p>Sin comentarios</p>";
}

/****************************************************
 * findNameByEmail => buscar "users" donde .email == mail
 ****************************************************/
async function findNameByEmail(email) {
  if (!email) return null;
  const snap = await getDocs(collection(db, "users"));
  for (const docu of snap.docs) {
    const udata = docu.data();
    if ((udata.email || "").toLowerCase() === email.toLowerCase()) {
      return udata.name || email; // si no tiene name, retorna email
    }
  }
  return email;
}

/****************************************************
 * deleteComment => elimina un comentario
 ****************************************************/
window.deleteComment = async function(commentId) {
  try {
    if (!currentCommentTaskId) return;
    if (!confirm("¿Eliminar este comentario?")) return;
    const docRef = doc(db, "tasks", currentCommentTaskId, "comments", commentId);
    await deleteDoc(docRef);
    loadComments(currentCommentTaskId); // recarga la lista
  } catch(err) {
    console.error("Error al eliminar comentario:", err);
  }
};

/****************************************************
 * addNewComment => subcoleccion
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

    // Obtener name en lugar de email
    let userName = "Desconocido";
    if (currentUser) {
      // Buscamos su "name" en la colección users
      const uRef = doc(db, "users", currentUser.uid);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists() && uSnap.data().name) {
        userName = uSnap.data().name;
      } else {
        // si no tiene name, usamos su email
        userName = currentUser.email;
      }
    }

    await addDoc(cRef, {
      text,
      authorEmail: userName,
      createdAt: new Date()
    });
    // Actualizar lastCommentAt en la tarea
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
 * canChangeStatus => consultor/senior
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
 * FILTROS => [Responsable, Estado, Empresa, Grupo]
 ****************************************************/
function aplicarFiltros() {
  let arr = allTasks.slice();

  const valResp = filterResponsable.value.trim().toLowerCase();
  const exResp = chkExcludeAsignado.checked;
  const valEst = filterEstado.value.trim().toLowerCase();
  const exEst = chkExcludeEstado.checked;
  const valEmp = filterEmpresa.value.trim().toLowerCase();
  const exEmp = chkExcludeEmpresa.checked;
  const valGru = filterGrupo.value.trim().toLowerCase();
  const exGru = chkExcludeGrupo.checked;

  arr = arr.filter(t => {
    // Responsable => t.userName
    if (valResp) {
      const match = (t.userName||"").toLowerCase().includes(valResp);
      if (exResp) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Estado
    if (valEst) {
      const match = (t.status||"").toLowerCase().includes(valEst);
      if (exEst) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Empresa
    if (valEmp) {
      const match = (t.empresa||"").toLowerCase().includes(valEmp);
      if (exEmp) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    // Grupo
    if (valGru) {
      const match = (t.grupoCliente||"").toLowerCase().includes(valGru);
      if (exGru) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    return true;
  });

  if (currentRole === "consultor" && currentUser) {
    arr = arr.filter(t => (t.assignedTo||"").toLowerCase() === currentUser.email.toLowerCase());
  }
  renderTasks(arr);
}

function limpiarFiltros() {
  filterResponsable.value = "";
  chkExcludeAsignado.checked = false;
  filterEstado.value = "";
  chkExcludeEstado.checked = false;
  filterEmpresa.value = "";
  chkExcludeEmpresa.checked = false;
  filterGrupo.value = "";
  chkExcludeGrupo.checked = false;

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

    // Rol
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
