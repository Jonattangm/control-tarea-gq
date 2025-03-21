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
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

// Vars
let currentUser = null;
let currentRole = null;
let allTasks = [];
let currentSortKey = null;
let currentSortDir = 1;
let editTaskId = null;
let currentCommentTaskId = null;

const TASK_STATES = [
  "Asignado","En proceso","Por revisar","Reportar","Finalizado",
  "SII","Municipalidad","Tesoreria","BPO","Cliente"
];
const DEFAULT_ROLE = "consultor";

// DOM
const authSection = document.getElementById("authSection");
const loginFooter = document.getElementById("loginFooter");
const sidebar = document.getElementById("sidebar");
const btnTareas = document.getElementById("btnTareas");
const btnFinalizadas = document.getElementById("btnFinalizadas");
const btnUsuarios = document.getElementById("btnUsuarios");
const btnHistorial = document.getElementById("btnHistorial");

const dashboardSection = document.getElementById("dashboardSection");
const finalTasksSection = document.getElementById("finalTasksSection");
const adminUsersSection = document.getElementById("adminUsersSection");
const historySection = document.getElementById("historySection");

const userEmailSpan = document.getElementById("userEmail");
const userRoleSpan = document.getElementById("userRole");

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
const rowRespInput = document.getElementById("rowRespInput");
const lblResp = document.getElementById("lblResp");
const thRespHeader = document.getElementById("thRespHeader");

// Tablas
const tasksTableBody = document.getElementById("tasksBody");
const finalTasksBody = document.getElementById("finalTasksBody");
const usersTableBody = document.getElementById("usersBody");
const historyTableBody = document.getElementById("historyBody");

// Comentarios
const commentsPanel = document.getElementById("commentsPanel");
const commentTaskIdSpan = document.getElementById("commentTaskId");
const commentsListDiv = document.getElementById("commentsList");
const commentTextArea = document.getElementById("commentText");
const addCommentBtn = document.getElementById("addCommentBtn");
const closeCommentsBtn = document.getElementById("closeCommentsBtn");

// Auth form
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const btnRegister = document.getElementById("btnRegister");
const btnLogin = document.getElementById("btnLogin");
const authMessage = document.getElementById("authMessage");
const btnLogout = document.getElementById("btnLogout");

// Listen DOM
document.addEventListener("DOMContentLoaded", () => {
  authForm.addEventListener("submit", e => e.preventDefault());
  btnRegister.addEventListener("click", registerUser);
  btnLogin.addEventListener("click", loginUser);
  btnLogout.addEventListener("click", () => signOut(auth));

  createTaskBtn.addEventListener("click", handleTaskForm);

  btnTareas.addEventListener("click", () => {
    dashboardSection.style.display = "block";
    finalTasksSection.style.display = "none";
    adminUsersSection.style.display = "none";
    historySection.style.display = "none";
  });
  btnFinalizadas.addEventListener("click", () => {
    dashboardSection.style.display = "none";
    finalTasksSection.style.display = "block";
    adminUsersSection.style.display = "none";
    historySection.style.display = "none";
    renderFinalTasks(allTasks);
  });
  btnUsuarios.addEventListener("click", () => {
    dashboardSection.style.display = "none";
    finalTasksSection.style.display = "none";
    adminUsersSection.style.display = "block";
    historySection.style.display = "none";
    loadAllUsers();
  });
  btnHistorial.addEventListener("click", () => {
    dashboardSection.style.display = "none";
    finalTasksSection.style.display = "none";
    adminUsersSection.style.display = "none";
    historySection.style.display = "block";
    loadHistory();
  });

  btnAplicarFiltros.addEventListener("click", aplicarFiltros);
  btnLimpiarFiltros.addEventListener("click", limpiarFiltros);

  addCommentBtn.addEventListener("click", addNewComment);
  closeCommentsBtn.addEventListener("click", () => {
    commentsPanel.style.display = "none";
    currentCommentTaskId = null;
    commentsListDiv.innerHTML = "";
    commentTextArea.value = "";
  });

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

  // Ordenar tabla principal
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

// AuthState
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
    finalTasksSection.style.display = "none";

    userEmailSpan.textContent = user.email || "";
    userRoleSpan.textContent = currentRole || "";

    // Ver Tareas Finalizadas en todos los roles? Ajustamos:
    btnFinalizadas.style.display = "inline-block";

    // Admin => ver "Administrar Usuarios"
    if (currentRole === "admin") {
      btnUsuarios.style.display = "inline-block";
    } else {
      btnUsuarios.style.display = "none";
    }
    // Senior, Supervisor, Admin => ver Historial
    if (["senior","supervisor","admin"].includes(currentRole)) {
      btnHistorial.style.display = "inline-block";
    } else {
      btnHistorial.style.display = "none";
    }

    // Consultor => oculta input de "Responsable" 
    if (currentRole === "consultor") {
      rowRespInput.style.display = "none";
      thRespHeader.textContent = ""; // quita label
    }

    listenTasks();
  } else {
    currentUser = null;
    currentRole = null;
    authSection.style.display = "block";
    loginFooter.style.display = "block";
    sidebar.style.display = "none";
    dashboardSection.style.display = "none";
    finalTasksSection.style.display = "none";
    adminUsersSection.style.display = "none";
    historySection.style.display = "none";
  }
});

// REGISTRO/LOGIN
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

// CREAR/EDITAR TAREA
async function handleTaskForm() {
  // autoasignar si consultor
  let respName = newUserName.value.trim();
  if (currentRole === "consultor") {
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (userSnap.exists() && userSnap.data().name) {
      respName = userSnap.data().name;
    } else {
      respName = currentUser.email;
    }
  }

  const activityName = newTaskName.value.trim();
  if (!activityName) {
    alert("Completa la 'Actividad'.");
    return;
  }

  // Validar horas
  const horasVal = newHoras.value.trim();
  if (!/^(\d{1,2}):(\d{2})$/.test(horasVal)) {
    alert("Las horas deben tener formato HH:MM.");
    return;
  }

  try {
    let assignedEmail = null;
    if (currentRole === "consultor") {
      assignedEmail = currentUser.email;
    } else {
      if (!respName) {
        alert("Completa 'Responsable'.");
        return;
      }
      assignedEmail = await findEmailByName(respName);
      if (!assignedEmail) {
        alert("No existe un usuario con ese 'Responsable (Name)'.");
        return;
      }
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
      // EDIT
      const oldSnap = await getDoc(doc(db, "tasks", editTaskId));
      const oldData = oldSnap.exists() ? oldSnap.data() : {};

      const newData = {
        idTarea: nextId,
        userName: respName,
        assignedTo: assignedEmail,
        name: activityName,
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: horasVal,
        fechaEntrega: newFechaEntrega.value || null
      };

      await updateDoc(doc(db, "tasks", editTaskId), newData);
      alert("Tarea actualizada.");

      // Determinar cambios
      let changes = [];
      for (let k of ["userName","name","empresa","grupoCliente","folioProyecto","horasAsignadas","fechaEntrega"]) {
        const oldVal = oldData[k] || "";
        const newVal = newData[k] || "";
        if (oldVal !== newVal) {
          changes.push(`${k}: "${oldVal}" => "${newVal}"`);
        }
      }
      if (changes.length===0) changes.push("Sin cambios detectados");

      await addDoc(collection(db, "history"), {
        taskId: nextId,
        responsible: respName,
        activity: activityName,
        company: newData.empresa,
        group: newData.grupoCliente,
        action: `Editó la tarea (campos: ${changes.join(", ")})`,
        date: new Date(),
        userEmail: currentUser.email
      });
      clearTaskForm();
    } else {
      // CREATE
      const newTask = {
        idTarea: nextId,
        fechaAsignacion: new Date().toLocaleDateString("es-CL"),
        fechaEntrega: newFechaEntrega.value || null,
        userName: respName,
        assignedTo: assignedEmail,
        name: activityName,
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: horasVal,
        status: "Asignado",
        createdAt: new Date(),
        createdBy: currentUser.uid
      };
      await addDoc(colRef, newTask);
      alert("Tarea creada.");
      await addDoc(collection(db, "history"), {
        taskId: nextId,
        responsible: respName,
        activity: activityName,
        company: newTask.empresa,
        group: newTask.grupoCliente,
        action: "Creó la tarea",
        date: new Date(),
        userEmail: currentUser.email
      });
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

// ESCUCHAR TAREAS
function listenTasks() {
  const colRef = collection(db, "tasks");
  onSnapshot(colRef, snapshot => {
    let tempTasks = [];
    snapshot.forEach(docu => {
      tempTasks.push({ ...docu.data(), docId: docu.id });
    });
    allTasks = tempTasks;
    // Render principal + final
    renderTasks(allTasks);
    renderFinalTasks(allTasks);
  });
}

// RENDER TAREAS (No finalizadas)
function renderTasks(tasksArray) {
  tasksTableBody.innerHTML = "";

  // Filtrar las NO finalizadas
  const arr = tasksArray.filter(t => t.status !== "Finalizado");

  // Orden
  let sorted = arr.slice();
  if (currentSortKey) {
    sorted = sorted.sort((a,b) => {
      let va = a[currentSortKey];
      let vb = b[currentSortKey];
      if (va && va.toDate) va = va.toDate();
      if (vb && vb.toDate) vb = vb.toDate();
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return -1 * currentSortDir;
      if (va > vb) return 1 * currentSortDir;
      return 0;
    });
  }

  sorted.forEach(task => {
    const tr = document.createElement("tr");

    // col 1 => Responsable
    let tdResp = document.createElement("td");
    // Si consultor => en la vista: no está en blanco, se definió que consultor la ve en blanco? 
    // Indicación: "El consultor no ve el label, pero sí la col está en blanco"
    if (currentRole==="consultor") {
      tdResp.textContent = "";
    } else {
      tdResp.textContent = task.userName || "";
    }
    tr.appendChild(tdResp);

    // col2 => ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea ?? "N/A";
    tr.appendChild(tdId);

    // col3 => Fecha Asignación
    const tdFA = document.createElement("td");
    tdFA.textContent = task.fechaAsignacion || "--";
    tr.appendChild(tdFA);

    // col4 => Fecha de Entrega, sin hora
    const tdFE = document.createElement("td");
    if (task.fechaEntrega) {
      // calculamos diff 
      const formatted = formatDDMMYYYY(task.fechaEntrega);
      let diff = 0;
      if (task.status === "Finalizado") {
        diff=0;
        tdFE.textContent = `${formatted} (0)`;
      } else {
        diff= calcBusinessDaysDiff(new Date(), parseDateDMY(formatted));
        tdFE.textContent = `${formatted} (${diff})`;
        // color
        if (diff <= 2) tdFE.classList.add("fecha-rojo");
        else if (diff <=5) tdFE.classList.add("fecha-naranjo");
        else if (diff <=8) tdFE.classList.add("fecha-amarillo");
        else if (diff <=11) tdFE.classList.add("fecha-verde");
        else tdFE.classList.add("fecha-azul");
      }
    } else {
      tdFE.textContent="";
    }
    tr.appendChild(tdFE);

    // col5 => Actividad
    const tdAct = document.createElement("td");
    tdAct.textContent = task.name || "";
    tr.appendChild(tdAct);

    // col6 => Estado => select
    const tdEst = document.createElement("td");
    const sel = document.createElement("select");

    let possible = TASK_STATES.slice();
    // consultor => no Finalizado/Reportar
    if (currentRole==="consultor") {
      if (["Finalizado","Reportar","Por revisar"].includes(task.status)) {
        possible = [task.status];
      } else {
        possible = ["Asignado","En proceso","Por revisar","SII","Municipalidad","Tesoreria","BPO","Cliente"];
      }
    }
    if (currentRole==="senior") {
      possible = possible.filter(s => s!=="Finalizado");
      if (["Finalizado","Reportar"].includes(task.status)) {
        possible=[task.status];
      }
    }

    possible.forEach(st => {
      let o = document.createElement("option");
      o.value = st;
      o.textContent = st;
      if (st===task.status) o.selected=true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", async ()=>{
      const newSt= sel.value;
      // Confirm final
      if (newSt==="Finalizado" && task.status!=="Finalizado"){
        if (!confirm("¿Estás seguro de poner estado Finalizado?")) {
          sel.value=task.status;
          return;
        }
      }
      // Confirm consultor->por revisar
      if (currentRole==="consultor" && newSt==="Por revisar" && task.status!=="Por revisar"){
        if (!confirm("¿Pasar a 'Por revisar'?")) {
          sel.value= task.status;
          return;
        }
      }
      // confirm senior->reportar
      if (currentRole==="senior" && newSt==="Reportar" && task.status!=="Reportar"){
        if(!confirm("¿Pasar a 'Reportar'?")){
          sel.value=task.status;
          return;
        }
      }
      // SII => set next Monday
      if (newSt==="SII"){
        alert("Recuerda anotar Folio y Fiscalizador en comentarios");
        let baseDate=new Date();
        if (task.lastCommentAt) baseDate=task.lastCommentAt.toDate();
        const nm= getNextMonday(baseDate);
        const y= nm.getFullYear();
        const m= String(nm.getMonth()+1).padStart(2,'0');
        const d= String(nm.getDate()).padStart(2,'0');
        const iso=`${y}-${m}-${d}`;
        await updateDoc(doc(db,"tasks",task.docId), { fechaEntrega: iso });
      }

      if(!canChangeStatus(currentRole, task.status, newSt)){
        alert("No tienes permiso para ese cambio.");
        sel.value=task.status;
      } else {
        await updateTaskStatus(task.docId,newSt);
      }
    });
    tdEst.appendChild(sel);

    // Indicador
    const ind= document.createElement("span");
    ind.classList.add("status-indicator");
    const lowered= (task.status||"").toLowerCase().replace(" ","-");
    ind.classList.add(`status-${lowered}`);
    tdEst.appendChild(ind);

    tr.appendChild(tdEst);

    // col7 => Empresa
    let tdEmp= document.createElement("td");
    tdEmp.textContent=task.empresa||"";
    tr.appendChild(tdEmp);

    // col8 => Grupo
    let tdGru= document.createElement("td");
    tdGru.textContent= task.grupoCliente||"";
    tr.appendChild(tdGru);

    // col9 => Folio
    let tdFolio= document.createElement("td");
    tdFolio.textContent= task.folioProyecto||"";
    tr.appendChild(tdFolio);

    // col10 => Horas
    let tdHrs= document.createElement("td");
    tdHrs.textContent= task.horasAsignadas||"";
    tr.appendChild(tdHrs);

    // col11 => Ultima actividad => solo fecha
    let tdUlt= document.createElement("td");
    if (task.lastCommentAt){
      let dd= task.lastCommentAt.toDate();
      // Solo fecha => toLocaleDateString
      tdUlt.textContent= dd.toLocaleDateString("es-CL");
    } else tdUlt.textContent= "--";
    tr.appendChild(tdUlt);

    // col12 => Acciones => con iconos + tooltip
    let tdAcc= document.createElement("td");

    // Edit
    const btnEdit= document.createElement("button");
    btnEdit.classList.add("action-btn");
    btnEdit.innerHTML= "✎"; // o un icono
    btnEdit.title="Editar Tarea";
    btnEdit.addEventListener("click", ()=>{
      editTaskId= task.docId;
      frmTareaTitle.textContent = "Editar Tarea (ID: "+(task.idTarea||"N/A")+")";
      createTaskBtn.textContent= "Actualizar Tarea";

      newUserName.value= task.userName||"";
      newTaskName.value= task.name||"";
      newEmpresa.value= task.empresa||"";
      newGrupo.value= task.grupoCliente||"";
      newFolio.value= task.folioProyecto||"";
      newHoras.value= task.horasAsignadas||"";
      newFechaEntrega.value= task.fechaEntrega||"";
    });
    tdAcc.appendChild(btnEdit);

    // Delete
    const btnDel= document.createElement("button");
    btnDel.classList.add("action-btn");
    btnDel.innerHTML= "🗑";
    btnDel.title="Eliminar Tarea";
    btnDel.addEventListener("click", async()=>{
      if(!confirm("¿Deseas eliminar la tarea?")) return;
      // Historial => "Eliminó la tarea"
      await addDoc(collection(db,"history"),{
        taskId: task.idTarea||-1,
        responsible: task.userName,
        activity: task.name,
        company: task.empresa,
        group: task.grupoCliente,
        action:"Eliminó la tarea",
        date: new Date(),
        userEmail: currentUser.email
      });
      await deleteDoc(doc(db,"tasks",task.docId));
    });
    tdAcc.appendChild(btnDel);

    // Comments
    const btnCom= document.createElement("button");
    btnCom.classList.add("action-btn");
    btnCom.innerHTML="💬";
    btnCom.title="Comentarios";
    btnCom.addEventListener("click", ()=>{
      openCommentsPanel(task.docId, task.idTarea);
    });
    tdAcc.appendChild(btnCom);

    tr.appendChild(tdAcc);

    tasksTableBody.appendChild(tr);
  });
}

// RENDER TAREAS FINALIZADAS
function renderFinalTasks(tasksArray) {
  finalTasksBody.innerHTML="";
  // Filtramos status=Finalizado
  let arr= tasksArray.filter(t=> t.status==="Finalizado");
  // No orden particular, salvo si deseas reusar currentSortKey
  if (currentSortKey) {
    arr= arr.slice().sort((a,b)=>{
      let va= a[currentSortKey];
      let vb= b[currentSortKey];
      if(va && va.toDate) va=va.toDate();
      if(vb && vb.toDate) vb= vb.toDate();
      if (typeof va==="string") va= va.toLowerCase();
      if (typeof vb==="string") vb= vb.toLowerCase();
      if(va<vb) return -1*currentSortDir;
      if(va>vb) return 1*currentSortDir;
      return 0;
    });
  }

  arr.forEach(task=>{
    let tr= document.createElement("tr");

    // col1 => Responsable (consultor??)
    let tdResp= document.createElement("td");
    if (currentRole==="consultor"){
      tdResp.textContent="";
    } else {
      tdResp.textContent= task.userName||"";
    }
    tr.appendChild(tdResp);

    // ID
    let tdId= document.createElement("td");
    tdId.textContent= task.idTarea||"N/A";
    tr.appendChild(tdId);

    // Fecha Asig
    let tdFA= document.createElement("td");
    tdFA.textContent= task.fechaAsignacion||"--";
    tr.appendChild(tdFA);

    // Fecha Ent (solo fecha)
    let tdFE= document.createElement("td");
    if (task.fechaEntrega){
      const formatted= formatDDMMYYYY(task.fechaEntrega);
      tdFE.textContent= formatted+" (0)"; // ya final => 0
    } else {
      tdFE.textContent="";
    }
    tr.appendChild(tdFE);

    // Actividad
    let tdAct= document.createElement("td");
    tdAct.textContent= task.name||"";
    tr.appendChild(tdAct);

    // Estado => si se cambia => regresa a Tareas
    let tdEst= document.createElement("td");
    let sel= document.createElement("select");
    // Muestra todos los states? 
    TASK_STATES.forEach(st=>{
      let o= document.createElement("option");
      o.value= st;
      o.textContent= st;
      if (st=== task.status) o.selected=true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", async()=>{
      const newSt= sel.value;
      if(newSt!=="Finalizado"){
        // sale de final
        if(!canChangeStatus(currentRole, "Finalizado", newSt)){
          alert("No tienes permiso para ese cambio.");
          sel.value="Finalizado";
          return;
        }
        await updateTaskStatus(task.docId, newSt);
        // Regresa a "Tareas"
        dashboardSection.style.display="block";
        finalTasksSection.style.display="none";
      }
    });
    tdEst.appendChild(sel);
    // Indicador
    let ind= document.createElement("span");
    ind.classList.add("status-indicator");
    let lowered= (task.status||"").toLowerCase().replace(" ","-");
    ind.classList.add(`status-${lowered}`);
    tdEst.appendChild(ind);
    tr.appendChild(tdEst);

    // Empresa
    let tdEmp= document.createElement("td");
    tdEmp.textContent= task.empresa||"";
    tr.appendChild(tdEmp);

    // Grupo
    let tdGru= document.createElement("td");
    tdGru.textContent= task.grupoCliente||"";
    tr.appendChild(tdGru);

    // Folio
    let tdFol= document.createElement("td");
    tdFol.textContent= task.folioProyecto||"";
    tr.appendChild(tdFol);

    // Horas
    let tdHr= document.createElement("td");
    tdHr.textContent= task.horasAsignadas||"";
    tr.appendChild(tdHr);

    // Ultima => solo fecha
    let tdUl= document.createElement("td");
    if(task.lastCommentAt){
      let dd= task.lastCommentAt.toDate();
      tdUl.textContent= dd.toLocaleDateString("es-CL");
    } else tdUl.textContent="--";
    tr.appendChild(tdUl);

    // Acciones => iconos
    let tdAc= document.createElement("td");

    // Edit
    let bEd= document.createElement("button");
    bEd.classList.add("action-btn");
    bEd.innerHTML= "✎";
    bEd.title= "Editar Tarea";
    bEd.addEventListener("click",()=>{
      editTaskId= task.docId;
      frmTareaTitle.textContent= "Editar Tarea (ID: "+(task.idTarea||"N/A")+")";
      createTaskBtn.textContent= "Actualizar Tarea";

      newUserName.value= task.userName||"";
      newTaskName.value= task.name||"";
      newEmpresa.value= task.empresa||"";
      newGrupo.value= task.grupoCliente||"";
      newFolio.value= task.folioProyecto||"";
      newHoras.value= task.horasAsignadas||"";
      newFechaEntrega.value= task.fechaEntrega||"";

      // al editar => ir a Tareas
      dashboardSection.style.display="block";
      finalTasksSection.style.display="none";
    });
    tdAc.appendChild(bEd);

    // Del
    let bDel= document.createElement("button");
    bDel.classList.add("action-btn");
    bDel.innerHTML="🗑";
    bDel.title="Eliminar Tarea";
    bDel.style.marginLeft="5px";
    bDel.addEventListener("click",async()=>{
      if(!confirm("¿Deseas eliminar la tarea?"))return;
      // Historial
      await addDoc(collection(db,"history"),{
        taskId: task.idTarea||-1,
        responsible: task.userName,
        activity: task.name,
        company: task.empresa,
        group: task.grupoCliente,
        action: "Eliminó la tarea",
        date: new Date(),
        userEmail: currentUser.email
      });
      await deleteDoc(doc(db,"tasks",task.docId));
    });
    tdAc.appendChild(bDel);

    // Comments
    let bCom= document.createElement("button");
    bCom.classList.add("action-btn");
    bCom.innerHTML="💬";
    bCom.title="Comentarios";
    bCom.style.marginLeft="5px";
    bCom.addEventListener("click",()=>{
      openCommentsPanel(task.docId, task.idTarea);
    });
    tdAc.appendChild(bCom);

    tr.appendChild(tdAc);

    finalTasksBody.appendChild(tr);
  });
}

// canChangeStatus
function canChangeStatus(role, currentSt, newSt) {
  if (role==="senior"){
    if(newSt==="Finalizado" && currentSt!=="Finalizado") return false;
    if(["Finalizado","Reportar"].includes(currentSt)) return false;
    return true;
  }
  if(role==="consultor"){
    if(["Finalizado","Reportar","Por revisar"].includes(currentSt))return false;
    if(["Finalizado","Reportar"].includes(newSt))return false;
    return true;
  }
  return true;
}

// updateTaskStatus
async function updateTaskStatus(docId,newStatus){
  try{
    const snap= await getDoc(doc(db,"tasks",docId));
    if(!snap.exists())return;
    const tdata= snap.data();
    await updateDoc(doc(db,"tasks",docId), {status:newStatus});
    // Historial
    await addDoc(collection(db,"history"),{
      taskId: tdata.idTarea||-1,
      responsible: tdata.userName,
      activity: tdata.name,
      company: tdata.empresa,
      group: tdata.grupoCliente,
      action: `Cambió estado a ${newStatus}`,
      date: new Date(),
      userEmail: currentUser.email
    });
  }catch(e){
    console.error("Error al cambiar estado:", e);
  }
}

// Filtros
function aplicarFiltros(){
  // no se hace distincion final vs no final aqui, se filtra en la vista principal
  renderTasks(allTasks);
}
function limpiarFiltros(){
  filterResponsable.value="";
  chkExcludeAsignado.checked=false;
  filterEstado.value="";
  chkExcludeEstado.checked=false;
  filterEmpresa.value="";
  chkExcludeEmpresa.checked=false;
  filterGrupo.value="";
  chkExcludeGrupo.checked=false;
  renderTasks(allTasks);
}

// loadAllUsers
async function loadAllUsers(){
  usersTableBody.innerHTML="";
  const snap=await getDocs(collection(db,"users"));
  snap.forEach(docu=>{
    const u= docu.data();
    let tr= document.createElement("tr");
    // Email
    let tdE= document.createElement("td");
    tdE.textContent= u.email||docu.id;
    tr.appendChild(tdE);
    // name
    let tdN= document.createElement("td");
    let inp= document.createElement("input");
    inp.type="text";
    inp.value= u.name||"";
    inp.addEventListener("change", async()=>{
      if(!confirm("¿Confirmar cambio de Nombre?")){
        inp.value= u.name||"";
        return;
      }
      try{
        await updateDoc(doc(db,"users",docu.id), { name:inp.value });
        u.name=inp.value;
      }catch(er){console.error("Error actualizando name:",er);}
    });
    tdN.appendChild(inp);
    tr.appendChild(tdN);

    // rol
    let tdR= document.createElement("td");
    tdR.textContent= u.role||"consultor";
    tr.appendChild(tdR);

    // change rol
    let tdC= document.createElement("td");
    let sel= document.createElement("select");
    ["consultor","senior","supervisor","admin"].forEach(rr=>{
      let o= document.createElement("option");
      o.value= rr;
      o.textContent= rr;
      if(rr=== u.role) o.selected=true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", async()=>{
      if(!confirm(`¿Confirmar cambio de Rol a "${sel.value}"?`)){
        sel.value= u.role; 
        return;
      }
      try{
        await updateDoc(doc(db,"users",docu.id), { role: sel.value });
        u.role= sel.value;
        tdR.textContent= sel.value;
      }catch(er){ console.error("Error cambiando rol:",er);}
    });
    tdC.appendChild(sel);
    tr.appendChild(tdC);

    usersTableBody.appendChild(tr);
  });
}

// Historial => 2 semanas
async function loadHistory(){
  historyTableBody.innerHTML="Cargando...";
  try{
    const twoWeeksAgo= new Date(Date.now() -14*24*60*60*1000);
    const qRef= query(
      collection(db,"history"),
      where("date",">=", twoWeeksAgo),
      orderBy("date","desc")
    );
    const snap= await getDocs(qRef);
    let html="";
    snap.forEach(docu=>{
      const h= docu.data();
      const dStr= h.date ? new Date(h.date.toDate()).toLocaleDateString("es-CL") : "";
      html+=`
      <tr>
        <td>${h.taskId||""}</td>
        <td>${h.responsible||""}</td>
        <td>${h.activity||""}</td>
        <td>${h.company||""}</td>
        <td>${h.group||""}</td>
        <td>${h.action||""} (por ${h.userEmail||"Desconocido"})</td>
        <td>${dStr}</td>
      </tr>
      `;
    });
    if(!html) html="<tr><td colspan='7'>Sin historial (últimos 14 días)</td></tr>";
    historyTableBody.innerHTML= html;
  }catch(e){
    console.error("Error cargando historial:", e);
    historyTableBody.innerHTML=`<tr><td colspan='7'>Error: ${e.message}</td></tr>`;
  }
}

/****************************************************
 * calcBusinessDaysDiff => días hábiles (permite negativo)
 ****************************************************/
function calcBusinessDaysDiff(fromDate, toDate){
  if(!fromDate||!toDate) return 9999;
  let start= new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  let end= new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  let invert=1;
  if(end<start){
    invert=-1;
    let tmp=start; start=end; end=tmp;
  }
  let days=0;
  let current=new Date(start);
  while(current<=end){
    const dow= current.getDay();
    if(dow!==0 && dow!==6) days++;
    current.setDate(current.getDate()+1);
  }
  return (days-1)*invert;
}

/****************************************************
 * formatDDMMYYYY => AAAA-MM-DD => DD-MM-AAAA
 ****************************************************/
function formatDDMMYYYY(yyyy_mm_dd){
  if(!yyyy_mm_dd) return "";
  const [y,m,d]= yyyy_mm_dd.split("-");
  return `${d}-${m}-${y}`;
}

/****************************************************
 * parseDateDMY => "DD-MM-AAAA" => Date
 ****************************************************/
function parseDateDMY(dd_mm_yyyy){
  if(!dd_mm_yyyy) return null;
  const [d,m,y]= dd_mm_yyyy.split("-");
  return new Date(parseInt(y), parseInt(m)-1, parseInt(d));
}

/****************************************************
 * getNextMonday => base date => next Monday
 ****************************************************/
function getNextMonday(baseDate){
  const d= new Date(baseDate);
  while(d.getDay()!==1){
    d.setDate(d.getDate()+1);
  }
  return d;
}
