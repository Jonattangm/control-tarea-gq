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

// ====================
// CONFIG
// ====================
const firebaseConfig = {
  apiKey: "AIzaSyCFoalSasV17k812nXbCSjO9xCsnAJJRnE",
  authDomain: "control-tarea-gq.firebaseapp.com",
  projectId: "control-tarea-gq",
  storageBucket: "control-tarea-gq.appspot.com",
  messagingSenderId: "449145637626",
  appId: "1:449145637626:web:23b51b68fcadd6eaa11743"
};
initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore();

// ====================
// VARIABLES
// ====================
let currentUser = null;
let currentRole = null;
let allTasks = [];
let editTaskId = null;
let currentCommentTaskId = null;

let currentSortKey = null;
let currentSortDir = 1;

const TASK_STATES = [
  "Asignado","En proceso","Por revisar","Reportar","Finalizado",
  "SII","Municipalidad","Tesoreria","BPO","Cliente"
];
const DEFAULT_ROLE = "consultor";

// ====================
// DOM elements
// ====================
const authSection = document.getElementById("authSection");
const loginFooter = document.getElementById("loginFooter");
const sidebar = document.getElementById("sidebar");
const btnTareas = document.getElementById("btnTareas");
const btnUsuarios = document.getElementById("btnUsuarios");
const dashboardSection = document.getElementById("dashboardSection");
const adminUsersSection = document.getElementById("adminUsersSection");

const userEmailSpan = document.getElementById("userEmail");
const userRoleSpan = document.getElementById("userRole");

const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const btnRegister = document.getElementById("btnRegister");
const btnLogin = document.getElementById("btnLogin");
const authMessage = document.getElementById("authMessage");
const btnLogout = document.getElementById("btnLogout");

// Filtros
const toggleFiltersBtn = document.getElementById("toggleFiltersBtn");
const filtersContainer = document.getElementById("filtersContainer");
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

// Crear Tarea
const toggleTaskBoxBtn = document.getElementById("toggleTaskBoxBtn");
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

// Tabla
const tasksTableBody = document.getElementById("tasksBody");

// Admin Users
const usersTableBody = document.getElementById("usersBody");

// Panel comentarios
const commentsPanel = document.getElementById("commentsPanel");
const commentTaskIdSpan = document.getElementById("commentTaskId");
const commentsListDiv = document.getElementById("commentsList");
const commentTextArea = document.getElementById("commentText");
const addCommentBtn = document.getElementById("addCommentBtn");
const closeCommentsBtn = document.getElementById("closeCommentsBtn");

// ====================
// DOMContentLoaded
// ====================
document.addEventListener("DOMContentLoaded", () => {
  authForm.addEventListener("submit", e => e.preventDefault());
  btnRegister.addEventListener("click", registerUser);
  btnLogin.addEventListener("click", loginUser);
  btnLogout.addEventListener("click", () => signOut(auth));

  createTaskBtn.addEventListener("click", handleTaskForm);

  // Navegación Tareas/Usuarios
  btnTareas.addEventListener("click", () => {
    dashboardSection.style.display = "block";
    adminUsersSection.style.display = "none";
  });
  btnUsuarios.addEventListener("click", () => {
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "block";
  });

  // Filtros
  btnAplicarFiltros.addEventListener("click", aplicarFiltros);
  btnLimpiarFiltros.addEventListener("click", limpiarFiltros);

  // Comentarios
  addCommentBtn.addEventListener("click", addNewComment);
  closeCommentsBtn.addEventListener("click", () => {
    commentsPanel.style.display = "none";
    currentCommentTaskId = null;
    commentsListDiv.innerHTML = "";
    commentTextArea.value = "";
  });

  // Plegar/Desplegar Filtros
  toggleFiltersBtn.addEventListener("click", () => {
    if (!filtersContainer) return;
    if (filtersContainer.style.display === "none") {
      filtersContainer.style.display = "flex";
      toggleFiltersBtn.textContent = "-";
    } else {
      filtersContainer.style.display = "none";
      toggleFiltersBtn.textContent = "+";
    }
  });

  // Plegar/Desplegar Crear Tarea
  toggleTaskBoxBtn.addEventListener("click", () => {
    if (!taskCreationDiv) return;
    if (taskCreationDiv.style.display === "none") {
      taskCreationDiv.style.display = "block";
      toggleTaskBoxBtn.textContent = "-";
    } else {
      taskCreationDiv.style.display = "none";
      toggleTaskBoxBtn.textContent = "+";
    }
  });

  // Ordenar la tabla
  const ths = document.querySelectorAll("#tasksTable thead th[data-sortkey]");
  ths.forEach(th => {
    th.addEventListener("click", () => {
      const sortKey = th.getAttribute("data-sortkey");
      if (sortKey === currentSortKey) {
        currentSortDir *= -1;
      } else {
        currentSortKey = sortKey;
        currentSortDir = 1;
      }
      renderTasks(allTasks);
    });
  });
});

// ====================
// onAuthStateChanged
// ====================
onAuthStateChanged(auth, async user => {
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

    userEmailSpan.textContent = user.email || "";
    userRoleSpan.textContent = currentRole || "";

    // admin => ver users
    if (currentRole === "admin") {
      btnUsuarios.style.display = "inline-block";
      loadAllUsers();
    } else {
      btnUsuarios.style.display = "none";
    }

    // supervisor/admin => ver crear tarea
    if (["admin","supervisor"].includes(currentRole)) {
      taskCreationDiv.style.display = "block";
    } else {
      taskCreationDiv.style.display = "none";
    }

    listenTasks();
  } else {
    currentUser = null;
    currentRole = null;
    authSection.style.display = "block";
    loginFooter.style.display = "block";
    sidebar.style.display = "none";
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "none";
  }
});

// ====================
// REGISTRO / LOGIN
// ====================
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

// ====================
// CREAR / EDITAR TAREA
// ====================
async function handleTaskForm() {
  if (!newUserName.value.trim() || !newTaskName.value.trim()) {
    alert("Completa al menos 'Responsable' y 'Actividad'.");
    return;
  }

  // Validar horas en formato HH:MM
  const horasVal = newHoras.value.trim();
  if (!/^(\d{1,2}):(\d{2})$/.test(horasVal)) {
    alert("Las horas deben tener formato HH:MM.");
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
      const dt = d.data();
      if (dt.idTarea && dt.idTarea > maxId) {
        maxId = dt.idTarea;
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
        horasAsignadas: horasVal,
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
        horasAsignadas: horasVal,
        status: "Asignado",
        createdAt: new Date(),
        createdBy: currentUser.uid
      });
      alert("Tarea creada.");
      clearTaskForm();
    }
  } catch (error) {
    console.error("Error al crear/editar tarea:", error);
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

// Buscar email a partir del name
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

// ====================
// ESCUCHAR TAREAS => onSnapshot
// ====================
function listenTasks() {
  const colRef = collection(db, "tasks");
  onSnapshot(colRef, snapshot => {
    allTasks = [];
    snapshot.forEach(docu => {
      allTasks.push({ ...docu.data(), docId: docu.id });
    });
    renderTasks(allTasks);
  });
}

// ====================
// RENDER TAREAS => con sort
// ====================
function renderTasks(tasksArray) {
  tasksTableBody.innerHTML = "";

  // Ordenar si currentSortKey
  if (currentSortKey) {
    tasksArray = tasksArray.slice().sort((a,b) => {
      let va = a[currentSortKey];
      let vb = b[currentSortKey];
      // si es Timestamp
      if (va && va.toDate) va = va.toDate();
      if (vb && vb.toDate) vb = vb.toDate();
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();

      if (va < vb) return -1 * currentSortDir;
      if (va > vb) return 1 * currentSortDir;
      return 0;
    });
  }

  // Filtra consultor => assignedTo su email
  if (currentRole === "consultor" && currentUser) {
    tasksArray = tasksArray.filter(t => (t.assignedTo||"").toLowerCase() === currentUser.email.toLowerCase());
  }

  tasksArray.forEach(task => {
    const tr = document.createElement("tr");

    // col1: Responsable
    const tdResp = document.createElement("td");
    tdResp.textContent = task.userName || "";
    tr.appendChild(tdResp);

    // col2: ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea ?? "N/A";
    tr.appendChild(tdId);

    // col3: Fecha Asignación
    const tdFAsig = document.createElement("td");
    tdFAsig.textContent = task.fechaAsignacion || "--";
    tr.appendChild(tdFAsig);

    // col4: Fecha Entrega => color, permitir negativo
    const tdFEnt = document.createElement("td");
    if (task.fechaEntrega) {
      const formatted = formatDDMMYYYY(task.fechaEntrega);
      let diff;
      if (task.status === "Finalizado") {
        diff = 0;
        tdFEnt.textContent = `${formatted} (0)`;
      } else {
        diff = calcBusinessDaysDiff(new Date(), parseDateDMY(formatted));
        tdFEnt.textContent = `${formatted} (${diff})`;
        // colorear
        if (diff <= 2) {
          tdFEnt.classList.add("fecha-rojo");
        } else if (diff <= 5) {
          tdFEnt.classList.add("fecha-naranjo");
        } else if (diff <= 8) {
          tdFEnt.classList.add("fecha-amarillo");
        } else if (diff <= 11) {
          tdFEnt.classList.add("fecha-verde");
        } else if (diff > 11) {
          tdFEnt.classList.add("fecha-azul");
        }
      }
    } else {
      tdFEnt.textContent = "";
    }
    tr.appendChild(tdFEnt);

    // col5: Actividad
    const tdAct = document.createElement("td");
    tdAct.textContent = task.name || "";
    tr.appendChild(tdAct);

    // col6: Estado => select
    const tdEstado = document.createElement("td");
    const selectStatus = document.createElement("select");
    let possibleStates = [...TASK_STATES];

    // Senior => no Finalizado
    if (currentRole === "senior") {
      possibleStates = possibleStates.filter(s => s !== "Finalizado");
      if (["Finalizado","Reportar"].includes(task.status)) {
        possibleStates = [task.status];
      }
    }
    // Consultor => no Finalizado/Reportar
    if (currentRole === "consultor") {
      if (["Finalizado","Reportar","Por revisar"].includes(task.status)) {
        possibleStates = [task.status];
      } else {
        possibleStates = ["Asignado","En proceso","Por revisar","SII","Municipalidad","Tesoreria","BPO","Cliente"];
      }
    }

    possibleStates.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      if (st === task.status) opt.selected = true;
      selectStatus.appendChild(opt);
    });

    selectStatus.addEventListener("change", async () => {
      const newSt = selectStatus.value;

      // confirm consultor -> "Por revisar"
      if (currentRole === "consultor" && newSt === "Por revisar" && task.status !== "Por revisar") {
        if (!confirm("¿Pasar a 'Por revisar'?")) {
          selectStatus.value = task.status;
          return;
        }
      }
      // confirm senior -> "Reportar"
      if (currentRole === "senior" && newSt === "Reportar" && task.status !== "Reportar") {
        if (!confirm("¿Pasar a 'Reportar'?")) {
          selectStatus.value = task.status;
          return;
        }
      }

      // Si se pasa a SII => alert + cambio de fechaEntrega => next Monday
      if (newSt === "SII") {
        alert("Recuerda anotar Folio y Fiscalizador en comentarios");
        let baseDate = new Date();
        if (task.lastCommentAt) {
          baseDate = task.lastCommentAt.toDate();
        }
        const nextMonday = getNextMonday(baseDate);
        const y = nextMonday.getFullYear();
        const m = String(nextMonday.getMonth()+1).padStart(2,'0');
        const d = String(nextMonday.getDate()).padStart(2,'0');
        const isoDate = `${y}-${m}-${d}`;
        await updateDoc(doc(db, "tasks", task.docId), {
          fechaEntrega: isoDate
        });
      }

      // Permisos
      if (!canChangeStatus(currentRole, task.status, newSt)) {
        alert("No tienes permiso para ese cambio.");
        selectStatus.value = task.status;
      } else {
        await updateTaskStatus(task.docId, newSt);
      }
    });
    tdEstado.appendChild(selectStatus);

    // status indicator
    const indicator = document.createElement("span");
    indicator.classList.add("status-indicator");
    const lowered = (task.status||"").toLowerCase().replace(" ","-");
    indicator.classList.add(`status-${lowered}`);
    tdEstado.appendChild(indicator);
    tr.appendChild(tdEstado);

    // col7: Empresa
    const tdEmp = document.createElement("td");
    tdEmp.textContent = task.empresa || "";
    tr.appendChild(tdEmp);

    // col8: Grupo
    const tdGru = document.createElement("td");
    tdGru.textContent = task.grupoCliente || "";
    tr.appendChild(tdGru);

    // col9: Folio
    const tdFolio = document.createElement("td");
    tdFolio.textContent = task.folioProyecto || "";
    tr.appendChild(tdFolio);

    // col10: Horas
    const tdHrs = document.createElement("td");
    tdHrs.textContent = task.horasAsignadas || "";
    tr.appendChild(tdHrs);

    // col11: Última actividad => lastCommentAt
    const tdLastCom = document.createElement("td");
    if (task.lastCommentAt) {
      const dd = task.lastCommentAt.toDate();
      tdLastCom.textContent = dd.toLocaleString("es-CL");
    } else {
      tdLastCom.textContent = "--";
    }
    tr.appendChild(tdLastCom);

    // col12: Acciones => admin/supervisor => Edit/Del + Botón Comentarios
    const tdAcc = document.createElement("td");
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

    // Botón Comentarios => para todos
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

// ====================
// getNextMonday => base date => next Monday
// ====================
function getNextMonday(baseDate) {
  const d = new Date(baseDate);
  // Avanzar día a día hasta Monday (getDay=1)
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

// ====================
// Comentarios
// ====================
function openCommentsPanel(taskDocId, tareaId) {
  currentCommentTaskId = taskDocId;
  commentTaskIdSpan.textContent = tareaId || "N/A";
  commentsPanel.style.display = "block";
  loadComments(taskDocId);
}

async function loadComments(taskDocId) {
  commentsListDiv.innerHTML = "Cargando...";
  const cRef = collection(db, "tasks", taskDocId, "comments");
  const qRef = query(cRef, orderBy("createdAt","asc"));
  const snap = await getDocs(qRef);

  let commentsData = [];
  snap.forEach(docu => {
    commentsData.push({ id: docu.id, ...docu.data() });
  });

  let html = "";
  let prevEmail = null;
  let sameGroupOpen = false;

  for (let i=0; i<commentsData.length; i++) {
    const c = commentsData[i];
    const dateStr = c.createdAt ? new Date(c.createdAt.toDate()).toLocaleString("es-CL") : "";
    const isOwner = (c.authorUid === currentUser?.uid);

    if (c.replyTo) {
      // Respuesta => indent
      html += `
        <div class="comment-item comment-reply">
          <div class="comment-author"><b>${c.authorEmail||"Desconocido"}</b></div>
          <div class="comment-text">${c.text||""}</div>
          <div class="comment-date" style="font-size:0.8rem;color:#888;">${dateStr}</div>
          <div class="comment-actions">
            ${isOwner ? `
              <button onclick="editComment('${c.id}')">Editar</button>
              <button onclick="deleteComment('${c.id}')">Eliminar</button>
            ` : ``}
          </div>
        </div>
      `;
      continue;
    }

    // Comentario normal => agrupado
    const sameUser = (c.authorEmail === prevEmail);
    if (!sameUser) {
      if (sameGroupOpen) {
        html += `</div>`;
        sameGroupOpen = false;
      }
      html += `<div class="comment-item">`;
      html += `<div class="comment-author"><b>${c.authorEmail||"Desconocido"}</b></div>`;
      sameGroupOpen = true;
    }
    html += `
      <div class="comment-text" style="margin-left:1rem;">${c.text||""}</div>
      <div class="comment-date" style="font-size:0.8rem;color:#888; margin-left:1rem;">${dateStr}</div>
      <div class="comment-actions" style="margin-left:1rem;">
        ${isOwner ? `
          <button onclick="editComment('${c.id}')">Editar</button>
          <button onclick="deleteComment('${c.id}')">Eliminar</button>
        ` : ``}
        <button onclick="replyComment('${c.id}')">Responder</button>
      </div>
    `;
    prevEmail = c.authorEmail;
  }
  if (sameGroupOpen) {
    html += `</div>`;
  }

  commentsListDiv.innerHTML = html || "<p>Sin comentarios</p>";
}

// REPLY
window.replyComment = async function(commentId) {
  const text = prompt("Escribe tu respuesta:");
  if (!text) return;
  try {
    if (!currentCommentTaskId) return;
    let userName = currentUser.email;
    let userUid = currentUser.uid;
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (userSnap.exists()) {
      const dat = userSnap.data();
      if (dat.name) userName = dat.name;
    }
    const cRef = collection(db, "tasks", currentCommentTaskId, "comments");
    await addDoc(cRef, {
      text,
      authorEmail: userName,
      authorUid: userUid,
      createdAt: new Date(),
      replyTo: commentId
    });
    await updateDoc(doc(db, "tasks", currentCommentTaskId), {
      lastCommentAt: new Date()
    });
    loadComments(currentCommentTaskId);
  } catch(err) {
    console.error("Error al responder comentario:", err);
  }
};

// EDIT
window.editComment = async function(commentId) {
  const newText = prompt("Editar comentario:");
  if (!newText) return;
  try {
    if (!currentCommentTaskId) return;
    await updateDoc(doc(db, "tasks", currentCommentTaskId, "comments", commentId), {
      text: newText
    });
    await updateDoc(doc(db, "tasks", currentCommentTaskId), {
      lastCommentAt: new Date()
    });
    loadComments(currentCommentTaskId);
  } catch(err) {
    console.error("Error editando comentario:", err);
  }
};

// DELETE
window.deleteComment = async function(commentId) {
  if (!confirm("¿Eliminar este comentario?")) return;
  if (!currentCommentTaskId) return;
  try {
    await deleteDoc(doc(db, "tasks", currentCommentTaskId, "comments", commentId));
    loadComments(currentCommentTaskId);
  } catch(err) {
    console.error("Error al eliminar comentario:", err);
  }
};

// ADD NEW COMMENT
async function addNewComment() {
  if (!currentCommentTaskId) return;
  const text = commentTextArea.value.trim();
  if (!text) {
    alert("Escribe un comentario");
    return;
  }
  try {
    let userName = currentUser.email;
    let userUid = currentUser.uid;
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (userSnap.exists()) {
      const dat = userSnap.data();
      if (dat.name) userName = dat.name;
    }
    const cRef = collection(db, "tasks", currentCommentTaskId, "comments");
    await addDoc(cRef, {
      text,
      authorEmail: userName,
      authorUid: userUid,
      createdAt: new Date()
    });
    await updateDoc(doc(db, "tasks", currentCommentTaskId), {
      lastCommentAt: new Date()
    });
    commentTextArea.value = "";
    loadComments(currentCommentTaskId);
  } catch(err) {
    console.error("Error agregando comentario:", err);
  }
}

// ====================
// canChangeStatus => consultor/senior
// ====================
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

// ====================
// updateTaskStatus
// ====================
async function updateTaskStatus(docId, newStatus) {
  try {
    await updateDoc(doc(db, "tasks", docId), { status: newStatus });
  } catch (err) {
    console.error("Error al cambiar estado:", err);
  }
}

// ====================
// FILTROS
// ====================
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
    // Responsable => userName
    if (valResp) {
      const match = (t.userName||"").toLowerCase().includes(valResp);
      if (exResp && match) return false;
      if (!exResp && !match) return false;
    }
    // Estado
    if (valEst) {
      const match = (t.status||"").toLowerCase().includes(valEst);
      if (exEst && match) return false;
      if (!exEst && !match) return false;
    }
    // Empresa
    if (valEmp) {
      const match = (t.empresa||"").toLowerCase().includes(valEmp);
      if (exEmp && match) return false;
      if (!exEmp && !match) return false;
    }
    // Grupo
    if (valGru) {
      const match = (t.grupoCliente||"").toLowerCase().includes(valGru);
      if (exGru && match) return false;
      if (!exGru && !match) return false;
    }
    return true;
  });

  // consultor => assignedTo su email
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

// ====================
// ADMIN: loadAllUsers
// ====================
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

    // Name => confirm
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
 * Se declara con 'let' para start y end => no error
 ****************************************************/
function calcBusinessDaysDiff(fromDate, toDate) {
  if (!fromDate || !toDate) return 9999;
  let start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  let end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

  let invert = 1;
  if (end < start) {
    // permitir negativo => invert=-1
    invert = -1;
    // swap manual
    let tmp = start;
    start = end;
    end = tmp;
  }

  let days = 0;
  let current = new Date(start);
  while (current <= end) {
    const dow = current.getDay(); // 0=Domingo,6=Sábado
    if (dow !== 0 && dow !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  return (days - 1) * invert;
}

/****************************************************
 * formatDDMMYYYY => AAAA-MM-DD => DD-MM-AAAA
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
