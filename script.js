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

// -------------------
//  CONFIGURACIÓN
// -------------------
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

// -------------------
//  VARIABLES GLOBALES
// -------------------
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

// -------------------
//  DOM
// -------------------
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
const thRespHeader = document.getElementById("thRespHeader");

// Tablas
const tasksTableBody = document.getElementById("tasksBody");
const finalTasksBody = document.getElementById("finalTasksBody");
const usersTableBody = document.getElementById("usersBody");
const historyTableBody = document.getElementById("historyBody");

// Botón Borrar Historial
const btnClearHistory = document.getElementById("btnClearHistory");

// Comentarios
const commentsPanel = document.getElementById("commentsPanel");
const commentTaskIdSpan = document.getElementById("commentTaskId");
const commentsListDiv = document.getElementById("commentsList");
const commentTextArea = document.getElementById("commentText");
const closeCommentsBtn = document.getElementById("closeCommentsBtn");
const addCommentBtn = document.getElementById("addCommentBtn");

// Auth form
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const btnRegister = document.getElementById("btnRegister");
const btnLogin = document.getElementById("btnLogin");
const authMessage = document.getElementById("authMessage");
const btnLogout = document.getElementById("btnLogout");

// -------------------
//  EVENTOS
// -------------------
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

  // Borrar historial
  btnClearHistory?.addEventListener("click", clearHistory);

  // Filtros
  btnAplicarFiltros.addEventListener("click", aplicarFiltros);
  btnLimpiarFiltros.addEventListener("click", limpiarFiltros);

  // Comentarios
  addCommentBtn.addEventListener("click", addNewComment);
  closeCommentsBtn.addEventListener("click", closeCommentsPanel);

  // Toggle filters
  toggleFiltersBtn.addEventListener("click", toggleFilters);
  // Toggle task creation
  toggleTaskBoxBtn.addEventListener("click", toggleTaskBox);

  // Ordenar tabla principal
  const thsTasks = document.querySelectorAll("#tasksTable thead th[data-sortkey]");
  thsTasks.forEach(th => {
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

  // Ordenar tabla final
  const thsFinal = document.querySelectorAll("#finalTasksTable thead th[data-sortkey]");
  thsFinal.forEach(th => {
    th.addEventListener("click", () => {
      const sortKey = th.getAttribute("data-sortkey");
      if (sortKey === currentSortKey) {
        currentSortDir *= -1;
      } else {
        currentSortKey = sortKey;
        currentSortDir = 1;
      }
      renderFinalTasks(allTasks);
    });
  });
});

// onAuthStateChanged
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

    // Tareas finalizadas => visible
    btnFinalizadas.style.display = "inline-block";

    // Admin => ver "Usuarios"
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

    // consultor => oculta input "Responsable"
    if (currentRole==="consultor") {
      rowRespInput.style.display = "none";
      thRespHeader.textContent = "";
    }

    // Botón Borrar Historial => visible a admin/supervisor
    if(["admin","supervisor"].includes(currentRole)){
      btnClearHistory.style.display="inline-block";
    } else {
      btnClearHistory.style.display="none";
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

// -------------------
//  LOGIN / REGISTER
// -------------------
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

// -------------------
//  CREAR / EDITAR TAREA
// -------------------
async function handleTaskForm() {
  // autoasignar si consultor
  let respName = newUserName.value.trim();
  if (currentRole==="consultor") {
    // Buscar su name en users
    const userRef= doc(db, "users", currentUser.uid);
    const userSnap= await getDoc(userRef);
    if(userSnap.exists() && userSnap.data().name) {
      respName = userSnap.data().name;
    } else {
      respName = currentUser.email;
    }
  }

  const activityName = newTaskName.value.trim();
  if(!activityName) {
    alert("Completa la 'Actividad'.");
    return;
  }

  // Validar horas
  const horasVal = newHoras.value.trim();
  if(!/^(\d{1,2}):(\d{2})$/.test(horasVal)) {
    alert("Las horas deben tener formato HH:MM.");
    return;
  }

  try {
    let assignedEmail = null;
    if (currentRole==="consultor") {
      assignedEmail = currentUser.email;
    } else {
      if(!respName) {
        alert("Completa 'Responsable'.");
        return;
      }
      assignedEmail = await findEmailByName(respName);
      if(!assignedEmail){
        alert("No existe un usuario con ese 'Responsable (Name)'.");
        return;
      }
    }

    const colRef= collection(db, "tasks");
    const snap= await getDocs(colRef);
    // Buscamos la Tarea actual para no cambiar su ID
    let oldId=0; 
    if(editTaskId){
      // si edit
      const oldSnap= await getDoc(doc(db,"tasks",editTaskId));
      if(oldSnap.exists()){
        oldId= oldSnap.data().idTarea||0;
      }
    }

    let maxId=0;
    snap.forEach(d=>{
      const dt = d.data();
      if(dt.idTarea && dt.idTarea>maxId) {
        maxId= dt.idTarea;
      }
    });

    // Si estamos edit => mantenemos su ID, sino => se crea uno nuevo
    let nextId= oldId>0 ? oldId : maxId+1;

    if(editTaskId) {
      // Modo Edit
      const oldSnap= await getDoc(doc(db,"tasks",editTaskId));
      const oldData= oldSnap.exists()? oldSnap.data(): {};

      const newData= {
        // Mantiene el ID
        idTarea: nextId,
        userName: respName,
        assignedTo: assignedEmail,
        name: activityName,
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: horasVal,
        fechaEntrega: newFechaEntrega.value||null
      };
      await updateDoc(doc(db,"tasks",editTaskId), newData);
      alert("Tarea actualizada.");

      // Cambios
      let changes=[];
      for(let k of ["userName","name","empresa","grupoCliente","folioProyecto","horasAsignadas","fechaEntrega"]){
        const oldVal= oldData[k]||"";
        const newVal= newData[k]||"";
        if(oldVal!==newVal){
          changes.push(`${k}: "${oldVal}" => "${newVal}"`);
        }
      }
      if(changes.length===0) changes.push("Sin cambios detectados");

      // Historial
      await addDoc(collection(db,"history"), {
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
        fechaEntrega: newFechaEntrega.value||null,
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
      await addDoc(collection(db,"history"), {
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
  } catch(e) {
    console.error("Error al crear/editar tarea:", e);
  }
}

function clearTaskForm() {
  newUserName.value="";
  newTaskName.value="";
  newEmpresa.value="";
  newGrupo.value="";
  newFolio.value="";
  newHoras.value="";
  newFechaEntrega.value="";
  editTaskId= null;
  frmTareaTitle.textContent="Crear Tarea";
  createTaskBtn.textContent="Crear Tarea";
}

// Buscar email por name
async function findEmailByName(name) {
  const snap= await getDocs(collection(db,"users"));
  for(const docu of snap.docs) {
    const dat= docu.data();
    if((dat.name||"").toLowerCase()=== name.toLowerCase()){
      return dat.email;
    }
  }
  return null;
}

// -------------------
//  ESCUCHAR TAREAS
// -------------------
function listenTasks(){
  const colRef= collection(db,"tasks");
  onSnapshot(colRef, snapshot=>{
    let tempTasks=[];
    snapshot.forEach(docu=>{
      tempTasks.push({ ...docu.data(), docId: docu.id});
    });
    allTasks= tempTasks;
    renderTasks(allTasks);
    renderFinalTasks(allTasks);
  });
}

// -------------------
//  RENDER TAREAS
// -------------------
// Filtra NO final
function renderTasks(tasksArray){
  tasksTableBody.innerHTML="";
  // Filtrar consultor => solo las suyas
  let arr= tasksArray.filter(t=> t.status!=="Finalizado");
  if(currentRole==="consultor" && currentUser){
    arr= arr.filter(t=> (t.assignedTo||"").toLowerCase()=== currentUser.email.toLowerCase());
  }

  // Orden
  let sorted= arr.slice();
  if(currentSortKey){
    sorted= sorted.sort((a,b)=>{
      let va=a[currentSortKey];
      let vb=b[currentSortKey];
      if(va && va.toDate) va= va.toDate();
      if(vb && vb.toDate) vb= vb.toDate();
      if(typeof va==="string") va= va.toLowerCase();
      if(typeof vb==="string") vb= vb.toLowerCase();
      if(va<vb)return -1*currentSortDir;
      if(va>vb)return 1*currentSortDir;
      return 0;
    });
  }

  // Filtros
  const filtered= filtrarDash(sorted);

  filtered.forEach(task=>{
    const tr= document.createElement("tr");

    // col1 => Responsable
    const tdResp= document.createElement("td");
    if (currentRole==="consultor") {
      tdResp.textContent="";
    } else {
      tdResp.textContent= task.userName||"";
    }
    tr.appendChild(tdResp);

    // ID
    const tdId= document.createElement("td");
    tdId.textContent= task.idTarea||"N/A";
    tr.appendChild(tdId);

    // Fecha asig
    const tdFA= document.createElement("td");
    tdFA.textContent= task.fechaAsignacion||"--";
    tr.appendChild(tdFA);

    // Fecha ent => sin hora
    const tdFE= document.createElement("td");
    if(task.fechaEntrega){
      const formatted= formatDDMMYYYY(task.fechaEntrega);
      let diff=0;
      if(task.status==="Finalizado"){
        diff=0;
        tdFE.textContent= `${formatted} (0)`;
      } else {
        diff= calcBusinessDaysDiff(new Date(), parseDateDMY(formatted));
        tdFE.textContent= `${formatted} (${diff})`;
        if(diff<=2) tdFE.classList.add("fecha-rojo");
        else if(diff<=5) tdFE.classList.add("fecha-naranjo");
        else if(diff<=8) tdFE.classList.add("fecha-amarillo");
        else if(diff<=11) tdFE.classList.add("fecha-verde");
        else tdFE.classList.add("fecha-azul");
      }
    } else {
      tdFE.textContent="";
    }
    tr.appendChild(tdFE);

    // Act
    const tdAct= document.createElement("td");
    tdAct.textContent= task.name||"";
    tr.appendChild(tdAct);

    // Estado => select
    const tdEst= document.createElement("td");
    const sel= document.createElement("select");
    let possible= TASK_STATES.slice();
    if(currentRole==="consultor"){
      if(["Finalizado","Reportar","Por revisar"].includes(task.status)){
        possible=[task.status];
      } else {
        possible=["Asignado","En proceso","Por revisar","SII","Municipalidad","Tesoreria","BPO","Cliente"];
      }
    }
    if(currentRole==="senior"){
      possible= possible.filter(s=> s!=="Finalizado");
      if(["Finalizado","Reportar"].includes(task.status)){
        possible=[task.status];
      }
    }
    possible.forEach(st=>{
      let o= document.createElement("option");
      o.value= st;
      o.textContent= st;
      if(st=== task.status) o.selected=true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", async ()=>{
      const newSt= sel.value;
      // Confirm final
      if(newSt==="Finalizado" && task.status!=="Finalizado"){
        if(!confirm("¿Estás seguro de poner estado Finalizado?")){
          sel.value= task.status;
          return;
        }
        // Al poner final => ultimaAct
        await updateDoc(doc(db,"tasks",task.docId), {
          lastCommentAt: new Date()
        });
      }
      if(currentRole==="consultor" && newSt==="Por revisar" && task.status!=="Por revisar"){
        if(!confirm("¿Pasar a 'Por revisar'?")){
          sel.value= task.status;
          return;
        }
      }
      if(currentRole==="senior" && newSt==="Reportar" && task.status!=="Reportar"){
        if(!confirm("¿Pasar a 'Reportar'?")){
          sel.value= task.status;
          return;
        }
      }
      if(newSt==="SII"){
        alert("Recuerda anotar Folio y Fiscalizador en comentarios");
        let baseDate=new Date();
        if(task.lastCommentAt) baseDate= task.lastCommentAt.toDate();
        const nm= getNextMonday(baseDate);
        const y= nm.getFullYear();
        const m= String(nm.getMonth()+1).padStart(2,'0');
        const d= String(nm.getDate()).padStart(2,'0');
        const iso=`${y}-${m}-${d}`;
        await updateDoc(doc(db,"tasks",task.docId), { fechaEntrega: iso });
      }
      if(!canChangeStatus(currentRole, task.status, newSt)){
        alert("No tienes permiso para ese cambio.");
        sel.value= task.status;
      } else {
        await updateTaskStatus(task.docId, newSt);
      }
    });
    tdEst.appendChild(sel);

    // indicator
    const ind= document.createElement("span");
    ind.classList.add("status-indicator");
    const lowered= (task.status||"").toLowerCase().replace(" ","-");
    ind.classList.add(`status-${lowered}`);
    tdEst.appendChild(ind);

    tr.appendChild(tdEst);

    // Empresa
    let tdEm= document.createElement("td");
    tdEm.textContent= task.empresa||"";
    tr.appendChild(tdEm);

    // Grupo
    let tdGr= document.createElement("td");
    tdGr.textContent= task.grupoCliente||"";
    tr.appendChild(tdGr);

    // Folio
    let tdFo= document.createElement("td");
    tdFo.textContent= task.folioProyecto||"";
    tr.appendChild(tdFo);

    // Horas
    let tdHr= document.createElement("td");
    tdHr.textContent= task.horasAsignadas||"";
    tr.appendChild(tdHr);

    // ultima => solo fecha
    let tdUl= document.createElement("td");
    if(task.lastCommentAt){
      const dd= task.lastCommentAt.toDate();
      tdUl.textContent= dd.toLocaleDateString("es-CL");
    } else tdUl.textContent= "--";
    tr.appendChild(tdUl);

    // Acciones => iconos
    let tdAc= document.createElement("td");
    // Edit
    let bEd= document.createElement("button");
    bEd.classList.add("action-btn");
    bEd.innerHTML= "✎";
    bEd.title= "Editar Tarea";
    bEd.addEventListener("click", ()=>{
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
    });
    tdAc.appendChild(bEd);

    // Del
    let bDel= document.createElement("button");
    bDel.classList.add("action-btn");
    bDel.innerHTML= "🗑";
    bDel.title= "Eliminar Tarea";
    bDel.style.marginLeft="5px";
    bDel.addEventListener("click", async()=>{
      if(!confirm("¿Deseas eliminar la tarea?")) return;
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
    tdAc.appendChild(bDel);

    // Comments
    let bCom= document.createElement("button");
    bCom.classList.add("action-btn");
    bCom.innerHTML= "💬";
    bCom.title= "Comentarios";
    bCom.style.marginLeft="5px";
    bCom.addEventListener("click", ()=>{
      openCommentsPanel(task.docId, task.idTarea);
    });
    tdAc.appendChild(bCom);

    tr.appendChild(tdAc);

    tasksTableBody.appendChild(tr);
  });
}

// TAREAS FINALIZADAS
function renderFinalTasks(tasksArray){
  finalTasksBody.innerHTML="";
  let arr= tasksArray.filter(t=> t.status==="Finalizado");

  // filtrar consultor => NO necesita en final, pero para ser consistente, ocultamos si no es suyo
  if(currentRole==="consultor" && currentUser){
    arr= arr.filter(t=> (t.assignedTo||"").toLowerCase()=== currentUser.email.toLowerCase());
  }

  // Orden
  let sorted= arr.slice();
  if(currentSortKey){
    sorted= sorted.sort((a,b)=>{
      let va= a[currentSortKey];
      let vb= b[currentSortKey];
      if(va && va.toDate) va= va.toDate();
      if(vb && vb.toDate) vb= vb.toDate();
      if(typeof va==="string") va= va.toLowerCase();
      if(typeof vb==="string") vb= vb.toLowerCase();
      if(va<vb)return -1*currentSortDir;
      if(va>vb)return 1*currentSortDir;
      return 0;
    });
  }

  sorted.forEach(task=>{
    let tr= document.createElement("tr");

    // col1 => Resp
    let tdR= document.createElement("td");
    if(currentRole==="consultor"){
      tdR.textContent="";
    } else {
      tdR.textContent= task.userName||"";
    }
    tr.appendChild(tdR);

    // ID
    let tdI= document.createElement("td");
    tdI.textContent= task.idTarea||"N/A";
    tr.appendChild(tdI);

    // Fecha Asig
    let tdFA= document.createElement("td");
    tdFA.textContent= task.fechaAsignacion||"--";
    tr.appendChild(tdFA);

    // Fecha Ent => sin hora
    let tdFE= document.createElement("td");
    if(task.fechaEntrega){
      const formatted= formatDDMMYYYY(task.fechaEntrega);
      tdFE.textContent= formatted+" (0)";
    } else tdFE.textContent="";
    tr.appendChild(tdFE);

    // Act
    let tdA= document.createElement("td");
    tdA.textContent= task.name||"";
    tr.appendChild(tdA);

    // Estado => select
    let tdS= document.createElement("td");
    let sel= document.createElement("select");
    TASK_STATES.forEach(st=>{
      let o= document.createElement("option");
      o.value= st;
      o.textContent= st;
      if(st=== task.status) o.selected=true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", async()=>{
      const newSt= sel.value;
      if(newSt!=="Finalizado"){
        if(!canChangeStatus(currentRole,"Finalizado", newSt)){
          alert("No tienes permiso para ese cambio.");
          sel.value="Finalizado";
          return;
        }
        await updateTaskStatus(task.docId,newSt);
        dashboardSection.style.display="block";
        finalTasksSection.style.display="none";
      }
    });
    tdS.appendChild(sel);
    // indicator
    let ind= document.createElement("span");
    ind.classList.add("status-indicator");
    let lowered= (task.status||"").toLowerCase().replace(" ","-");
    ind.classList.add(`status-${lowered}`);
    tdS.appendChild(ind);
    tr.appendChild(tdS);

    // Empresa
    let tdE= document.createElement("td");
    tdE.textContent= task.empresa||"";
    tr.appendChild(tdE);

    // Grupo
    let tdG= document.createElement("td");
    tdG.textContent= task.grupoCliente||"";
    tr.appendChild(tdG);

    // Folio
    let tdF= document.createElement("td");
    tdF.textContent= task.folioProyecto||"";
    tr.appendChild(tdF);

    // Horas
    let tdH= document.createElement("td");
    tdH.textContent= task.horasAsignadas||"";
    tr.appendChild(tdH);

    // ultima => solo fecha
    let tdU= document.createElement("td");
    if(task.lastCommentAt){
      let dd= task.lastCommentAt.toDate();
      tdU.textContent= dd.toLocaleDateString("es-CL");
    } else tdU.textContent="--";
    tr.appendChild(tdU);

    // Acciones => iconos
    let tdC= document.createElement("td");
    let bEd= document.createElement("button");
    bEd.classList.add("action-btn");
    bEd.innerHTML="✎";
    bEd.title="Editar Tarea";
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

      dashboardSection.style.display="block";
      finalTasksSection.style.display="none";
    });
    tdC.appendChild(bEd);

    let bDel= document.createElement("button");
    bDel.classList.add("action-btn");
    bDel.innerHTML="🗑";
    bDel.title="Eliminar Tarea";
    bDel.style.marginLeft="5px";
    bDel.addEventListener("click",async()=>{
      if(!confirm("¿Deseas eliminar la tarea?"))return;
      await addDoc(collection(db,"history"),{
        taskId: task.idTarea||-1,
        responsible: task.userName,
        activity: task.name,
        company: task.empresa,
        group: task.grupoCliente,
        action:"Eliminó la tarea",
        date:new Date(),
        userEmail: currentUser.email
      });
      await deleteDoc(doc(db,"tasks",task.docId));
    });
    tdC.appendChild(bDel);

    let bCom= document.createElement("button");
    bCom.classList.add("action-btn");
    bCom.innerHTML="💬";
    bCom.title="Comentarios";
    bCom.style.marginLeft="5px";
    bCom.addEventListener("click",()=>{
      openCommentsPanel(task.docId, task.idTarea);
    });
    tdC.appendChild(bCom);

    tr.appendChild(tdC);

    finalTasksBody.appendChild(tr);
  });
}

// Filtrar en Dashboard
function filtrarDash(arr){
  const valResp= filterResponsable.value.trim().toLowerCase();
  const exResp= chkExcludeAsignado.checked;
  const valEst= filterEstado.value.trim().toLowerCase();
  const exEst= chkExcludeEstado.checked;
  const valEmp= filterEmpresa.value.trim().toLowerCase();
  const exEmp= chkExcludeEmpresa.checked;
  const valGru= filterGrupo.value.trim().toLowerCase();
  const exGru= chkExcludeGrupo.checked;

  return arr.filter(t=>{
    // resp => t.userName
    if(valResp){
      const match= (t.userName||"").toLowerCase().includes(valResp);
      if(exResp && match) return false;
      if(!exResp && !match) return false;
    }
    // estado
    if(valEst){
      const match= (t.status||"").toLowerCase().includes(valEst);
      if(exEst && match) return false;
      if(!exEst && !match) return false;
    }
    // empresa
    if(valEmp){
      const match= (t.empresa||"").toLowerCase().includes(valEmp);
      if(exEmp && match) return false;
      if(!exEmp && !match) return false;
    }
    // grupo
    if(valGru){
      const match= (t.grupoCliente||"").toLowerCase().includes(valGru);
      if(exGru && match) return false;
      if(!exGru && !match) return false;
    }
    return true;
  });
}

// canChangeStatus
function canChangeStatus(role, currentSt, newSt){
  if(role==="senior"){
    if(newSt==="Finalizado" && currentSt!=="Finalizado") return false;
    if(["Finalizado","Reportar"].includes(currentSt)) return false;
    return true;
  }
  if(role==="consultor"){
    if(["Finalizado","Reportar","Por revisar"].includes(currentSt)) return false;
    if(["Finalizado","Reportar"].includes(newSt)) return false;
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
    await updateDoc(doc(db,"tasks",docId), { status:newStatus });
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

// -------------------
//  COMENTARIOS
// -------------------
export function openCommentsPanel(taskDocId, tareaId){
  currentCommentTaskId= taskDocId;
  commentTaskIdSpan.textContent= tareaId||"N/A";
  commentsPanel.style.display= "block";
  loadComments(taskDocId);
}
window.openCommentsPanel= openCommentsPanel;

export async function addNewComment(){
  if(!currentCommentTaskId)return;
  const text= commentTextArea.value.trim();
  if(!text){
    alert("Escribe un comentario");
    return;
  }
  try{
    let userName= currentUser.email;
    let userUid= currentUser.uid;
    const userSnap= await getDoc(doc(db,"users", currentUser.uid));
    if(userSnap.exists()){
      const dat= userSnap.data();
      if(dat.name) userName= dat.name;
    }
    const cRef= collection(db,"tasks", currentCommentTaskId,"comments");
    await addDoc(cRef, {
      text,
      authorEmail: userName,
      authorUid: userUid,
      createdAt: new Date()
    });
    // update lastcomment
    await updateDoc(doc(db,"tasks", currentCommentTaskId), {
      lastCommentAt: new Date()
    });
    commentTextArea.value="";
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error agregando comentario:", e);
  }
}
window.addNewComment= addNewComment;

function closeCommentsPanel(){
  commentsPanel.style.display = "none";
  currentCommentTaskId = null;
  commentsListDiv.innerHTML = "";
  commentTextArea.value = "";
}
window.closeCommentsPanel= closeCommentsPanel;

window.editComment= async function(commentId){
  if(!currentCommentTaskId)return;
  const newText= prompt("Editar comentario:");
  if(!newText)return;
  try{
    await updateDoc(doc(db,"tasks", currentCommentTaskId,"comments",commentId), {
      text:newText
    });
    await updateDoc(doc(db,"tasks", currentCommentTaskId), {
      lastCommentAt: new Date()
    });
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error editando comentario:", e);
  }
};
window.deleteComment= async function(commentId){
  if(!currentCommentTaskId)return;
  if(!confirm("¿Eliminar este comentario?"))return;
  try{
    // Senior, Supervisor, Admin => ya permitido por Reglas
    await deleteDoc(doc(db,"tasks", currentCommentTaskId,"comments",commentId));
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error al eliminar comentario:", e);
  }
};
async function loadComments(taskDocId){
  commentsListDiv.innerHTML="Cargando...";
  const cRef= collection(db,"tasks", taskDocId,"comments");
  const qRef= query(cRef, orderBy("createdAt","asc"));
  const snap= await getDocs(qRef);
  let commentData=[];
  snap.forEach(docu=>{
    commentData.push({ id: docu.id, ...docu.data()});
  });
  let html="";
  commentData.forEach(c=>{
    const dateStr= c.createdAt ? new Date(c.createdAt.toDate()).toLocaleDateString("es-CL") : "";
    // Se quita la lógica "isOwner" si Senior/Sup/Admin => Reglas lo permiten
    html+= `<div class="comment-item">`;
    html+= `<div class="comment-author"><b>${c.authorEmail||"?"}</b></div>`;
    html+= `<div class="comment-text" style="margin-left:1rem;">${c.text||""}</div>`;
    html+= `<div class="comment-date" style="font-size:0.8rem;color:#888; margin-left:1rem;">${dateStr}</div>`;
    html+= `<div class="comment-actions" style="margin-left:1rem;">`;
    // Todos => Reglas determinan si puede
    html+= `<button onclick="editComment('${c.id}')">Editar</button>`;
    html+= `<button style="margin-left:5px;" onclick="deleteComment('${c.id}')">Eliminar</button>`;
    html+=`</div></div>`;
  });
  if(!html) html="<p>Sin comentarios</p>";
  commentsListDiv.innerHTML= html;
}

// -------------------
//  HISTORIAL
// -------------------
async function loadHistory(){
  historyTableBody.innerHTML="Cargando...";
  try{
    // Eliminamos la restricción de 2 semanas => se lee TODO
    const qRef= query(collection(db,"history"), orderBy("date","desc"));
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
      </tr>`;
    });
    if(!html) html="<tr><td colspan='7'>Sin historial</td></tr>";
    historyTableBody.innerHTML= html;
  }catch(e){
    console.error("Error cargando historial:", e);
    historyTableBody.innerHTML=`<tr><td colspan='7'>Error: ${e.message}</td></tr>`;
  }
}
async function clearHistory(){
  if(!confirm("¿Borrar TODO el historial?")) return;
  try{
    // Se eliminan todos los docs en /history
    const qRef= query(collection(db,"history"));
    const snap= await getDocs(qRef);
    for(const docu of snap.docs){
      await deleteDoc(docu.ref);
    }
    alert("Historial borrado.");
    loadHistory();
  }catch(err){
    console.error("Error al borrar historial:", err);
    alert("Error al borrar historial: "+err.message);
  }
}

// -------------------
//  UTILS
// -------------------
function aplicarFiltros(){
  renderTasks(allTasks);
}
window.aplicarFiltros= aplicarFiltros;

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
window.limpiarFiltros= limpiarFiltros;

// Toggle filters
function toggleFilters(){
  if(!filtersContainer)return;
  if(filtersContainer.style.display==="none"){
    filtersContainer.style.display="flex";
    toggleFiltersBtn.textContent="-";
  } else {
    filtersContainer.style.display="none";
    toggleFiltersBtn.textContent="+";
  }
}
window.toggleFilters= toggleFilters;

// Toggle taskBox
function toggleTaskBox(){
  if(!taskCreationDiv)return;
  if(taskCreationDiv.style.display==="none"){
    taskCreationDiv.style.display="block";
    toggleTaskBoxBtn.textContent="-";
  } else {
    taskCreationDiv.style.display="none";
    toggleTaskBoxBtn.textContent="+";
  }
}
window.toggleTaskBox= toggleTaskBox;

// canChangeStatus
function canChangeStatus(role, currentSt, newSt){
  if(role==="senior"){
    if(newSt==="Finalizado" && currentSt!=="Finalizado") return false;
    if(["Finalizado","Reportar"].includes(currentSt)) return false;
    return true;
  }
  if(role==="consultor"){
    if(["Finalizado","Reportar","Por revisar"].includes(currentSt)) return false;
    if(["Finalizado","Reportar"].includes(newSt)) return false;
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
    await updateDoc(doc(db,"tasks",docId), { status:newStatus });
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

function calcBusinessDaysDiff(fromDate,toDate){
  if(!fromDate||!toDate)return 9999;
  let start= new Date(fromDate.getFullYear(),fromDate.getMonth(),fromDate.getDate());
  let end= new Date(toDate.getFullYear(),toDate.getMonth(),toDate.getDate());
  let invert=1;
  if(end<start){
    invert=-1;
    let tmp=start; start=end; end=tmp;
  }
  let days=0;
  let current= new Date(start);
  while(current<=end){
    const dow= current.getDay();
    if(dow!==0 && dow!==6) days++;
    current.setDate(current.getDate()+1);
  }
  return (days-1)*invert;
}
function formatDDMMYYYY(yyyy_mm_dd){
  if(!yyyy_mm_dd)return "";
  const [y,m,d]= yyyy_mm_dd.split("-");
  return `${d}-${m}-${y}`;
}
function parseDateDMY(dd_mm_yyyy){
  if(!dd_mm_yyyy) return null;
  const [d,m,y]= dd_mm_yyyy.split("-");
  return new Date(parseInt(y), parseInt(m)-1, parseInt(d));
}
function getNextMonday(baseDate){
  const d= new Date(baseDate);
  while(d.getDay()!==1){
    d.setDate(d.getDate()+1);
  }
  return d;
}
