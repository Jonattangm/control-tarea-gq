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

// ===========================================================
//  CONFIG
// ===========================================================
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

// ===========================================================
export let allTasks = []; // Lo exportamos para usar en chart.js
let currentUser = null;
let currentRole = null;
let currentSortKey = null;
let currentSortDir = 1;
let editTaskId = null;
let currentCommentTaskId = null;

// Tareas => "SII","Municipalidad","Tesoreria","BPO","Cliente"
export const TASK_STATES = [
  "Asignado","En proceso","Por revisar","Reportar","Finalizado",
  "SII","Municipalidad","Tesoreria","BPO","Cliente"
];
const COMMENT_STATES = ["pendiente","completado","en revisión"];
const DEFAULT_ROLE = "consultor";

// ===========================================================
//  DOM
// ===========================================================
const authSection = document.getElementById("authSection");
const loginFooter = document.getElementById("loginFooter");

const sidebar = document.getElementById("sidebar");
const btnTareas = document.getElementById("btnTareas");
const btnFinalizadas = document.getElementById("btnFinalizadas");
const btnUsuarios = document.getElementById("btnUsuarios");
const btnHistorial = document.getElementById("btnHistorial");
const btnInforme = document.getElementById("btnInforme");
const btnCargas = document.getElementById("btnCargas");

const dashboardSection = document.getElementById("dashboardSection");
const finalTasksSection = document.getElementById("finalTasksSection");
const adminUsersSection = document.getElementById("adminUsersSection");
const historySection = document.getElementById("historySection");
const reportSection = document.getElementById("reportSection");
const cargasSection = document.getElementById("cargasSection");

const userEmailSpan = document.getElementById("userEmail");
const userRoleSpan = document.getElementById("userRole");

// Filtros
const toggleFiltersBtn = document.getElementById("toggleFiltersBtn");
const filtersContainer = document.getElementById("filtersContainer");
const filterResponsableSelect = document.getElementById("filterResponsableSelect");
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
const newUserSelect = document.getElementById("newUserSelect");
const newTaskName = document.getElementById("newTaskName");
const newEmpresa = document.getElementById("newEmpresa");
const newGrupo = document.getElementById("newGrupo");
const newFolio = document.getElementById("newFolio");
const newHoras = document.getElementById("newHoras");
const newFechaEntrega = document.getElementById("newFechaEntrega");
const createTaskBtn = document.getElementById("createTaskBtn");

const tasksTableBody = document.getElementById("tasksBody");
const finalTasksBody = document.getElementById("finalTasksBody");

// Comentarios
const commentsPanel = document.getElementById("commentsPanel");
const commentTaskIdSpan = document.getElementById("commentTaskId");
const commentsListDiv = document.getElementById("commentsList");
const commentTextArea = document.getElementById("commentText");
const closeCommentsBtn = document.getElementById("closeCommentsBtn");
const addCommentBtn = document.getElementById("addCommentBtn");

// Admin Users
const usersTableBody = document.getElementById("usersBody");
// Historial
const historyTableBody = document.getElementById("historyBody");
const btnClearHistory = document.getElementById("btnClearHistory");

// Cargas Horarias
const cargasSectionContainer = document.getElementById("cargasTableContainer");

// Auth
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const btnRegister = document.getElementById("btnRegister");
const btnLogin = document.getElementById("btnLogin");
const authMessage = document.getElementById("authMessage");
const btnLogout = document.getElementById("btnLogout");

// ===========================================================
//  DOMContentLoaded
// ===========================================================
document.addEventListener("DOMContentLoaded", () => {
  authForm.addEventListener("submit", e => e.preventDefault());
  btnRegister.addEventListener("click", registerUser);
  btnLogin.addEventListener("click", loginUser);
  btnLogout.addEventListener("click", () => signOut(auth));

  createTaskBtn.addEventListener("click", handleTaskForm);

  btnTareas.addEventListener("click", () => {
    showSection("dashboard");
  });
  btnFinalizadas.addEventListener("click", () => {
    showSection("finalTasks");
    renderFinalTasks(allTasks);
  });
  btnUsuarios.addEventListener("click", () => {
    showSection("adminUsers");
    loadAllUsers();
  });
  btnHistorial.addEventListener("click", () => {
    showSection("history");
    loadHistory();
  });
  btnInforme.addEventListener("click", () => {
    showSection("report");
    // Se cargan los charts desde chart.js => automatic on next paint
  });
  btnCargas.addEventListener("click", () => {
    showSection("cargas");
    buildCargasHorarias();
  });

  btnClearHistory?.addEventListener("click", clearHistory);

  btnAplicarFiltros.addEventListener("click", aplicarFiltros);
  btnLimpiarFiltros.addEventListener("click", limpiarFiltros);

  addCommentBtn.addEventListener("click", addNewComment);
  closeCommentsBtn.addEventListener("click", closeCommentsPanel);

  toggleFiltersBtn.addEventListener("click", toggleFilters);
  toggleTaskBoxBtn.addEventListener("click", toggleTaskBox);

  // Ordenar la tabla principal
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
  // Ordenar la tabla final
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

// ===========================================================
//  onAuthStateChanged
// ===========================================================
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
    showSection("dashboard");

    userEmailSpan.textContent = user.email || "";
    userRoleSpan.textContent = currentRole || "";

    // Botones
    btnFinalizadas.style.display = "inline-block";
    if (currentRole === "admin") {
      btnUsuarios.style.display = "inline-block";
    } else {
      btnUsuarios.style.display = "none";
    }
    if (["senior","supervisor","admin"].includes(currentRole)) {
      btnHistorial.style.display="inline-block";
    } else {
      btnHistorial.style.display="none";
    }
    btnInforme.style.display="inline-block";
    btnCargas.style.display="inline-block";

    if(["admin","supervisor"].includes(currentRole)){
      btnClearHistory.style.display="inline-block";
    } else {
      btnClearHistory.style.display="none";
    }

    // consultor => oculta select de "Responsable"
    if (currentRole==="consultor") {
      document.getElementById("lblResp").style.display="none";
      newUserSelect.style.display="none";
      filterResponsableSelect.value="";
      document.getElementById("rowFilterResponsable").style.display="none";
      document.getElementById("thRespHeader").textContent="";
      document.getElementById("thRespHeaderFinal").textContent="";
    } else {
      document.getElementById("lblResp").style.display="inline-block";
      newUserSelect.style.display="inline-block";
      document.getElementById("rowFilterResponsable").style.display="flex";
      document.getElementById("thRespHeader").textContent="Responsable";
      document.getElementById("thRespHeaderFinal").textContent="Responsable";
      await loadUserNamesToSelect(newUserSelect);
    }

    await loadUserNamesToSelect(filterResponsableSelect);

    listenTasks();
  } else {
    currentUser = null;
    currentRole = null;
    authSection.style.display = "block";
    loginFooter.style.display = "block";
    sidebar.style.display = "none";
    showSection("none");
  }
});

// ===========================================================
//  Helpers para mostrar secciones
// ===========================================================
function showSection(name){
  dashboardSection.style.display="none";
  finalTasksSection.style.display="none";
  adminUsersSection.style.display="none";
  historySection.style.display="none";
  reportSection.style.display="none";
  cargasSection.style.display="none";

  switch(name){
    case "dashboard": dashboardSection.style.display="block"; break;
    case "finalTasks": finalTasksSection.style.display="block"; break;
    case "adminUsers": adminUsersSection.style.display="block"; break;
    case "history": historySection.style.display="block"; break;
    case "report": reportSection.style.display="block"; break;
    case "cargas": cargasSection.style.display="block"; break;
    default: break;
  }
}

// ===========================================================
//  LOGIN / REGISTER
// ===========================================================
async function registerUser() {
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

// ===========================================================
//  loadUserNamesToSelect => para combos
// ===========================================================
async function loadUserNamesToSelect(selectEl){
  if(!selectEl) return;
  selectEl.innerHTML= `<option value="">(Todos)</option>`;
  try{
    const snap= await getDocs(collection(db,"users"));
    snap.forEach(docu=>{
      const dt= docu.data();
      const nm= dt.name|| dt.email||"";
      if(nm){
        const opt= document.createElement("option");
        opt.value= nm;
        opt.textContent= nm;
        selectEl.appendChild(opt);
      }
    });
  } catch(e){
    console.error("Error loadUserNamesToSelect:", e);
  }
}

// ===========================================================
//  CREAR / EDITAR TAREA
// ===========================================================
async function handleTaskForm() {
  let respName= "";
  if(currentRole==="consultor"){
    // auto
    const userRef= doc(db,"users", currentUser.uid);
    const userSnap= await getDoc(userRef);
    if(userSnap.exists() && userSnap.data().name){
      respName= userSnap.data().name;
    } else {
      respName= currentUser.email;
    }
  } else {
    respName= newUserSelect.value.trim();
  }

  const activityName= newTaskName.value.trim();
  if(!activityName){
    alert("Completa la 'Actividad'.");
    return;
  }

  // valid horas => HH:MM
  const horasVal= newHoras.value.trim();
  if(!/^(\d{1,2}):(\d{2})$/.test(horasVal)) {
    alert("Las horas deben tener formato HH:MM.");
    return;
  }

  try {
    let assignedEmail=null;
    if(currentRole==="consultor"){
      assignedEmail= currentUser.email;
    } else {
      if(!respName){
        alert("Selecciona un 'Responsable'.");
        return;
      }
      assignedEmail= await findEmailByName(respName);
      if(!assignedEmail){
        alert("No existe un usuario con Nombre: "+respName);
        return;
      }
    }

    const colRef= collection(db,"tasks");
    const snap= await getDocs(colRef);

    let oldId=0;
    if(editTaskId){
      const oldSnap= await getDoc(doc(db,"tasks",editTaskId));
      if(oldSnap.exists()) oldId= oldSnap.data().idTarea||0;
    }
    let maxId=0;
    snap.forEach(d=>{
      const dt= d.data();
      if(dt.idTarea && dt.idTarea> maxId){
        maxId= dt.idTarea;
      }
    });
    let nextId= oldId>0? oldId: maxId+1;

    if(editTaskId){
      // Update
      const oldSnap= await getDoc(doc(db,"tasks",editTaskId));
      const oldData= oldSnap.exists()? oldSnap.data():{};
      const newData= {
        idTarea: nextId,
        userName: respName,
        assignedTo: assignedEmail,
        name: activityName,
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: horasVal,
        fechaEntrega: newFechaEntrega.value|| null
      };
      await updateDoc(doc(db,"tasks", editTaskId), newData);
      alert("Tarea actualizada.");

      // Historial
      let changes=[];
      for(let k of ["userName","name","empresa","grupoCliente","folioProyecto","horasAsignadas","fechaEntrega"]){
        const oldVal= oldData[k]||"";
        const newVal= newData[k]||"";
        if(oldVal!== newVal){
          changes.push(`${k}: "${oldVal}" => "${newVal}"`);
        }
      }
      if(changes.length===0) changes.push("Sin cambios detectados");
      await addDoc(collection(db,"history"), {
        taskId: nextId,
        responsible: respName,
        activity: activityName,
        company: newData.empresa,
        group: newData.grupoCliente,
        action: `Editó la tarea (${changes.join(", ")})`,
        date: new Date(),
        userEmail: currentUser.email
      });

      clearTaskForm();
    } else {
      // Create
      const newTask= {
        idTarea: nextId,
        fechaAsignacion: new Date().toLocaleDateString("es-CL"),
        fechaEntrega: newFechaEntrega.value|| null,
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
      await addDoc(colRef,newTask);
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
  } catch(e){
    console.error("Error al crear/editar tarea:", e);
  }
}
function clearTaskForm(){
  newUserSelect.value="";
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
async function findEmailByName(name){
  const snap= await getDocs(collection(db,"users"));
  for(const docu of snap.docs){
    const dt= docu.data();
    if((dt.name||"").toLowerCase()=== name.toLowerCase()){
      return dt.email;
    }
  }
  return null;
}

// ===========================================================
//  LISTEN TASKS
// ===========================================================
function listenTasks(){
  const colRef= collection(db,"tasks");
  onSnapshot(colRef, snapshot=>{
    let temp=[];
    snapshot.forEach(docu=>{
      temp.push({...docu.data(), docId: docu.id});
    });
    allTasks= temp;
    renderTasks(allTasks);
    renderFinalTasks(allTasks);
  });
}

// ===========================================================
//  RENDER TASKS (no finalizadas)
// ===========================================================
function renderTasks(tasksArray){
  tasksTableBody.innerHTML="";
  let arr= tasksArray.filter(t=> t.status!=="Finalizado");
  if(currentRole==="consultor" && currentUser){
    arr= arr.filter(t=> (t.assignedTo||"").toLowerCase()=== currentUser.email.toLowerCase());
  }
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
  const filtered= filtrarDash(sorted);
  filtered.forEach(task=>{
    const tr= document.createElement("tr");

    // col1 => Responsable
    const tdResp= document.createElement("td");
    if(currentRole==="consultor"){
      tdResp.textContent= "";
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

    // Fecha ent
    const tdFE= document.createElement("td");
    if(task.fechaEntrega){
      const formatted= formatDDMMYYYY(task.fechaEntrega);
      let diff=0;
      if(task.status==="Finalizado"){
        diff=0;
        tdFE.textContent=`${formatted} (0)`;
      } else {
        diff= calcBusinessDaysDiff(new Date(), parseDateDMY(formatted));
        tdFE.textContent=`${formatted} (${diff})`;
        if(diff<=2) tdFE.classList.add("fecha-rojo");
        else if(diff<=5) tdFE.classList.add("fecha-naranjo");
        else if(diff<=8) tdFE.classList.add("fecha-amarillo");
        else if(diff<=11) tdFE.classList.add("fecha-verde");
        else tdFE.classList.add("fecha-azul");
      }
    } else tdFE.textContent="";
    tr.appendChild(tdFE);

    // Actividad
    let tdAct= document.createElement("td");
    tdAct.textContent= task.name||"";
    tr.appendChild(tdAct);

    // Estado
    let tdEst= document.createElement("td");
    let sel= document.createElement("select");
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
      let o=document.createElement("option");
      o.value= st;
      o.textContent= st;
      if(st=== task.status) o.selected=true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", async()=>{
      const newSt= sel.value;
      if(newSt==="Finalizado" && task.status!=="Finalizado"){
        if(!confirm("¿Estás seguro de poner estado Finalizado?")){
          sel.value= task.status;
          return;
        }
        await updateDoc(doc(db,"tasks",task.docId), { lastCommentAt:new Date() });
      }
      if(currentRole==="consultor" && newSt==="Por revisar" && task.status!=="Por revisar"){
        if(!confirm("¿Pasar a 'Por revisar'?")) {
          sel.value= task.status; return;
        }
      }
      if(currentRole==="senior" && newSt==="Reportar" && task.status!=="Reportar"){
        if(!confirm("¿Pasar a 'Reportar'?")){
          sel.value= task.status; return;
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
      if(newSt==="Tesoreria"){
        alert("Recuerda revisar cada semana");
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
        await updateDoc(doc(db,"tasks",task.docId), { status:newSt });
      }
    });
    tdEst.appendChild(sel);
    let ind= document.createElement("span");
    ind.classList.add("status-indicator");
    let lowered= (task.status||"").toLowerCase().replace(" ","-");
    ind.classList.add(`status-${lowered}`);
    tdEst.appendChild(ind);
    tr.appendChild(tdEst);

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

    // Acciones => consultor tambien ve
    let tdC= document.createElement("td");
    let bEd= document.createElement("button");
    bEd.classList.add("action-btn");
    bEd.innerHTML="✎";
    bEd.title="Editar Tarea";
    bEd.addEventListener("click", ()=>{
      editTaskId= task.docId;
      frmTareaTitle.textContent= "Editar Tarea (ID: "+(task.idTarea||"N/A")+")";
      createTaskBtn.textContent= "Actualizar Tarea";

      newUserSelect.value= task.userName||"";
      newTaskName.value= task.name||"";
      newEmpresa.value= task.empresa||"";
      newGrupo.value= task.grupoCliente||"";
      newFolio.value= task.folioProyecto||"";
      newHoras.value= task.horasAsignadas||"";
      newFechaEntrega.value= task.fechaEntrega||"";
    });
    tdC.appendChild(bEd);

    let bDel= document.createElement("button");
    bDel.classList.add("action-btn");
    bDel.innerHTML="🗑";
    bDel.title="Eliminar Tarea";
    bDel.style.marginLeft="5px";
    bDel.addEventListener("click", async()=>{
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
    bCom.addEventListener("click", ()=>{
      openCommentsPanel(task.docId, task.idTarea);
    });
    tdC.appendChild(bCom);

    tr.appendChild(tdC);

    tasksTableBody.appendChild(tr);
  });
}

// ===========================================================
//  RENDER FINAL
// ===========================================================
function renderFinalTasks(tasksArray){
  finalTasksBody.innerHTML="";
  let arr= tasksArray.filter(t=> t.status==="Finalizado");
  if(currentRole==="consultor" && currentUser){
    arr= arr.filter(t=> (t.assignedTo||"").toLowerCase()=== currentUser.email.toLowerCase());
  }
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
  sorted.forEach(task=>{
    let tr= document.createElement("tr");

    let tdR= document.createElement("td");
    if(currentRole==="consultor") tdR.textContent="";
    else tdR.textContent= task.userName||"";
    tr.appendChild(tdR);

    let tdI= document.createElement("td");
    tdI.textContent= task.idTarea||"N/A";
    tr.appendChild(tdI);

    let tdFA= document.createElement("td");
    tdFA.textContent= task.fechaAsignacion||"--";
    tr.appendChild(tdFA);

    let tdFE= document.createElement("td");
    if(task.fechaEntrega){
      const formatted= formatDDMMYYYY(task.fechaEntrega);
      tdFE.textContent= `${formatted} (0)`;
    } else {
      tdFE.textContent="";
    }
    tr.appendChild(tdFE);

    let tdAc= document.createElement("td");
    tdAc.textContent= task.name||"";
    tr.appendChild(tdAc);

    let tdEs= document.createElement("td");
    let sel= document.createElement("select");
    TASK_STATES.forEach(st=>{
      let o= document.createElement("option");
      o.value= st;
      o.textContent= st;
      if(st===task.status) o.selected=true;
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
        await updateDoc(doc(db,"tasks", task.docId), { status:newSt });
        showSection("dashboard");
      }
    });
    tdEs.appendChild(sel);
    let ind= document.createElement("span");
    ind.classList.add("status-indicator");
    let lowered= (task.status||"").toLowerCase().replace(" ","-");
    ind.classList.add(`status-${lowered}`);
    tdEs.appendChild(ind);
    tr.appendChild(tdEs);

    let tdEm= document.createElement("td");
    tdEm.textContent= task.empresa||"";
    tr.appendChild(tdEm);

    let tdG= document.createElement("td");
    tdG.textContent= task.grupoCliente||"";
    tr.appendChild(tdG);

    let tdF= document.createElement("td");
    tdF.textContent= task.folioProyecto||"";
    tr.appendChild(tdF);

    let tdH= document.createElement("td");
    tdH.textContent= task.horasAsignadas||"";
    tr.appendChild(tdH);

    let tdU= document.createElement("td");
    if(task.lastCommentAt){
      tdU.textContent= task.lastCommentAt.toDate().toLocaleDateString("es-CL");
    } else tdU.textContent="--";
    tr.appendChild(tdU);

    let tdC= document.createElement("td");
    let bEd= document.createElement("button");
    bEd.classList.add("action-btn");
    bEd.innerHTML="✎";
    bEd.title="Editar Tarea";
    bEd.addEventListener("click",()=>{
      editTaskId= task.docId;
      frmTareaTitle.textContent= "Editar Tarea (ID: "+(task.idTarea||"N/A")+")";
      createTaskBtn.textContent= "Actualizar Tarea";

      newUserSelect.value= task.userName||"";
      newTaskName.value= task.name||"";
      newEmpresa.value= task.empresa||"";
      newGrupo.value= task.grupoCliente||"";
      newFolio.value= task.folioProyecto||"";
      newHoras.value= task.horasAsignadas||"";
      newFechaEntrega.value= task.fechaEntrega||"";

      showSection("dashboard");
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
      await deleteDoc(doc(db,"tasks", task.docId));
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

// ===========================================================
//  FILTROS
// ===========================================================
export function aplicarFiltros(){
  renderTasks(allTasks);
}
export function limpiarFiltros(){
  filterResponsableSelect.value="";
  chkExcludeAsignado.checked=false;
  filterEstado.value="";
  chkExcludeEstado.checked=false;
  filterEmpresa.value="";
  chkExcludeEmpresa.checked=false;
  filterGrupo.value="";
  chkExcludeGrupo.checked=false;
  renderTasks(allTasks);
}
function filtrarDash(arr){
  const valResp= filterResponsableSelect.value.trim().toLowerCase();
  const exResp= chkExcludeAsignado.checked;
  const valEst= filterEstado.value.trim().toLowerCase();
  const exEst= chkExcludeEstado.checked;
  const valEmp= filterEmpresa.value.trim().toLowerCase();
  const exEmp= chkExcludeEmpresa.checked;
  const valGru= filterGrupo.value.trim().toLowerCase();
  const exGru= chkExcludeGrupo.checked;

  return arr.filter(t=>{
    if(valResp){
      const match=(t.userName||"").toLowerCase().includes(valResp);
      if(exResp && match) return false;
      if(!exResp && !match) return false;
    }
    if(valEst){
      const match=(t.status||"").toLowerCase().includes(valEst);
      if(exEst && match) return false;
      if(!exEst && !match) return false;
    }
    if(valEmp){
      const match=(t.empresa||"").toLowerCase().includes(valEmp);
      if(exEmp && match) return false;
      if(!exEmp && !match) return false;
    }
    if(valGru){
      const match=(t.grupoCliente||"").toLowerCase().includes(valGru);
      if(exGru && match) return false;
      if(!exGru && !match) return false;
    }
    return true;
  });
}

// ===========================================================
//  canChangeStatus
// ===========================================================
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

// ===========================================================
//  COMENTARIOS
// ===========================================================
export function openCommentsPanel(taskDocId, tareaId){
  currentCommentTaskId= taskDocId;
  commentTaskIdSpan.textContent= tareaId||"N/A";
  commentsPanel.style.display= "block";
  loadComments(taskDocId);
}
async function loadComments(taskDocId){
  commentsListDiv.innerHTML="Cargando...";
  const cRef= collection(db,"tasks",taskDocId,"comments");
  const qRef= query(cRef, orderBy("createdAt","asc"));
  const snap= await getDocs(qRef);
  let commentData=[];
  snap.forEach(docu=>{
    commentData.push({ id: docu.id, ...docu.data()});
  });
  let html="";
  commentData.forEach(c=>{
    const dateStr= c.createdAt? new Date(c.createdAt.toDate()).toLocaleDateString("es-CL") : "";
    const cStat= c.commentStatus|| "pendiente";
    let commentIndicator= `<span class="status-comment-${cStat.replace(" ","-")}"></span>`;

    let selCommentStatus= `<select data-cid="${c.id}" onchange="changeCommentStatus(this)">`;
    COMMENT_STATES.forEach(st=>{
      selCommentStatus += `<option value="${st}" ${st===cStat?"selected":""}>${st}</option>`;
    });
    selCommentStatus += `</select>`;

    let isAuthor= (c.authorUid=== (currentUser?.uid||""));
    let canEditDelete= isAuthor;

    html+= `<div class="comment-item">`;
    html+= `<div class="comment-author">${commentIndicator}<b>${c.authorEmail||"?"}</b> - ${selCommentStatus}</div>`;
    html+= `<div class="comment-text" style="margin-left:1rem;">${c.text||""}</div>`;
    html+= `<div class="comment-date" style="font-size:0.8rem;color:#888; margin-left:1rem;">${dateStr}</div>`;
    if(canEditDelete){
      html+= `<div class="comment-actions" style="margin-left:1rem;">`;
      html+= `<button onclick="editComment('${c.id}')">Editar</button>`;
      html+= `<button style="margin-left:5px;" onclick="deleteComment('${c.id}')">Eliminar</button>`;
      html+=`</div>`;
    }
    html+=`</div>`;
  });
  if(!html) html="<p>Sin comentarios</p>";
  commentsListDiv.innerHTML= html;
}
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
      const dt= userSnap.data();
      if(dt.name) userName= dt.name;
    }
    const cRef= collection(db,"tasks", currentCommentTaskId,"comments");
    await addDoc(cRef,{
      text,
      authorEmail: userName,
      authorUid: userUid,
      createdAt:new Date(),
      commentStatus:"pendiente"
    });
    await updateDoc(doc(db,"tasks", currentCommentTaskId),{
      lastCommentAt:new Date()
    });
    commentTextArea.value="";
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error agregando comentario:", e);
  }
}
export function closeCommentsPanel(){
  commentsPanel.style.display="none";
  currentCommentTaskId=null;
  commentsListDiv.innerHTML="";
  commentTextArea.value="";
}
window.closeCommentsPanel= closeCommentsPanel;
window.addNewComment= addNewComment;

window.editComment= async function(commentId){
  if(!currentCommentTaskId)return;
  const newText= prompt("Editar comentario:");
  if(!newText)return;
  try{
    await updateDoc(doc(db,"tasks", currentCommentTaskId,"comments",commentId),{
      text:newText
    });
    await updateDoc(doc(db,"tasks", currentCommentTaskId),{
      lastCommentAt:new Date()
    });
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error editando comentario:", e);
    alert("Error al editar: "+ e.message);
  }
};
window.deleteComment= async function(commentId){
  if(!currentCommentTaskId)return;
  if(!confirm("¿Eliminar este comentario?"))return;
  try{
    await deleteDoc(doc(db,"tasks", currentCommentTaskId,"comments",commentId));
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error al eliminar comentario:", e);
    alert("Error al eliminar: "+ e.message);
  }
};
window.changeCommentStatus= async function(selectEl){
  if(!currentCommentTaskId)return;
  const cid= selectEl.getAttribute("data-cid");
  const newVal= selectEl.value;
  try{
    await updateDoc(doc(db,"tasks", currentCommentTaskId,"comments",cid),{
      commentStatus:newVal
    });
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error al cambiar estado cmt:", e);
    alert("Error al cambiar estado: "+ e.message);
  }
};

// ===========================================================
//  ADMIN => loadAllUsers
// ===========================================================
async function loadAllUsers(){
  usersTableBody.innerHTML="";
  try{
    const snap= await getDocs(collection(db,"users"));
    snap.forEach(docu=>{
      const data= docu.data();
      const tr= document.createElement("tr");

      // Email
      const tdEmail= document.createElement("td");
      tdEmail.textContent= data.email||docu.id;
      tr.appendChild(tdEmail);

      // Nombre => input c/confirm
      const tdName= document.createElement("td");
      const inp= document.createElement("input");
      inp.type="text";
      inp.value= data.name||"";
      inp.addEventListener("change", async()=>{
        if(!confirm("¿Cambiar Nombre Usuario?")){
          inp.value= data.name||"";
          return;
        }
        await updateDoc(doc(db,"users",docu.id), { name: inp.value });
        data.name= inp.value;
      });
      tdName.appendChild(inp);
      tr.appendChild(tdName);

      // Rol
      const tdRole= document.createElement("td");
      tdRole.textContent= data.role||"consultor";
      tr.appendChild(tdRole);

      // Cambiar Rol
      const tdChange= document.createElement("td");
      const sRole= document.createElement("select");
      ["consultor","senior","supervisor","admin"].forEach(r=>{
        const opt= document.createElement("option");
        opt.value= r;
        opt.textContent= r;
        if(r=== data.role) opt.selected=true;
        sRole.appendChild(opt);
      });
      sRole.addEventListener("change", async()=>{
        if(!confirm("¿Cambiar Rol de Usuario?")){
          sRole.value= data.role;
          return;
        }
        await updateDoc(doc(db,"users",docu.id), { role: sRole.value });
        data.role= sRole.value;
        tdRole.textContent= sRole.value;
      });
      tdChange.appendChild(sRole);
      tr.appendChild(tdChange);

      usersTableBody.appendChild(tr);
    });
  }catch(e){
    console.error("Error loadAllUsers:", e);
    usersTableBody.innerHTML=`<tr><td colspan="4">Error: ${e.message}</td></tr>`;
  }
}

// ===========================================================
//  HISTORIAL
// ===========================================================
async function loadHistory(){
  historyTableBody.innerHTML="Cargando...";
  try{
    const qRef= query(collection(db,"history"), orderBy("date","desc"));
    const snap= await getDocs(qRef);
    let html="";
    snap.forEach(docu=>{
      const h= docu.data();
      const dStr= h.date? new Date(h.date.toDate()).toLocaleDateString("es-CL"):"";
      html+=`
      <tr>
        <td>${h.taskId||""}</td>
        <td>${h.responsible||""}</td>
        <td>${h.activity||""}</td>
        <td>${h.company||""}</td>
        <td>${h.group||""}</td>
        <td>${h.action||""} (por ${h.userEmail||"?"})</td>
        <td>${dStr}</td>
      </tr>`;
    });
    if(!html) html="<tr><td colspan='7'>Sin historial</td></tr>";
    historyTableBody.innerHTML= html;
  }catch(e){
    console.error("Error loadHistory:", e);
    historyTableBody.innerHTML=`<tr><td colspan='7'>Error: ${e.message}</td></tr>`;
  }
}
async function clearHistory(){
  if(!confirm("¿Borrar TODO el historial?"))return;
  try{
    const qRef= query(collection(db,"history"));
    const snap= await getDocs(qRef);
    for(const docu of snap.docs){
      await deleteDoc(docu.ref);
    }
    alert("Historial borrado.");
    loadHistory();
  }catch(e){
    console.error("Error al borrar historial:", e);
    alert("Error al borrar historial: "+ e.message);
  }
}

// ===========================================================
//  CARGAS HORARIAS
// ===========================================================
export async function buildCargasHorarias(){
  cargasSectionContainer.innerHTML="Cargando Cargas Horarias...";
  // 1) Leer todos los usuarios
  const usersSnap= await getDocs(collection(db,"users"));
  let allUsers=[];
  usersSnap.forEach(d=>{
    const dt= d.data();
    allUsers.push({ uid: d.id, email: dt.email||"", name: dt.name||dt.email||"", role: dt.role||"consultor" });
  });
  // 2) Summar hours from allTasks (not final), by user email
  let userHoursMap={}; // key => sum
  allUsers.forEach(u=>{
    userHoursMap[u.email.toLowerCase()] = 0; // init
  });
  allTasks.forEach(t=>{
    if(t.status!=="Finalizado"){
      const assignedEmail= (t.assignedTo||"").toLowerCase();
      if(userHoursMap[assignedEmail]>=0){
        // parse horas
        let totalMin= parseHHMMtoMinutes(t.horasAsignadas||"0:00");
        // sum to user
        userHoursMap[assignedEmail]+= totalMin;
      }
    }
  });
  // 3) Con totalMin convert => total hours => fill squares
  // each user => 44 squares => 1 hour = 60 min => so if user has 125 min => ~2 hours => 2 squares
  let html=`<table border="1" cellpadding="3" style="border-collapse: collapse;"><thead>`;
  html+=`<tr><th>Usuario</th>`;
  for(let i=1;i<=44;i++){
    html+=`<th>${i}</th>`;
  }
  html+=`</tr></thead><tbody>`;

  if(!allUsers.length){
    html+=`<tr><td colspan="45">No hay usuarios registrados</td></tr>`;
  } else {
    allUsers.forEach(u=>{
      html+=`<tr><td>${u.name}</td>`;
      let totalMin= userHoursMap[u.email.toLowerCase()]||0;
      let hoursCount= Math.floor(totalMin/60);
      // fill squares => hoursCount
      // color depends on ? => The user wants a color for each "hour" if there's some tasks. 
      // We'll simply color them grey if >0. For more advanced logic, we'd break down by state. 
      // For now, let's color them all the same or do a minimal approach. 
      for(let i=1; i<=44; i++){
        if(i<=hoursCount){
          // colored block
          html+=`<td style="background:#7ecae7;"></td>`;
        } else {
          html+=`<td></td>`;
        }
      }
      html+=`</tr>`;
    });
  }
  html+=`</tbody></table>`;
  cargasSectionContainer.innerHTML= html;
}
function parseHHMMtoMinutes(hhmm){
  if(!hhmm)return 0;
  let [h,m]= hhmm.split(":");
  let hh= parseInt(h)||0, mm= parseInt(m)||0;
  return hh*60 + mm;
}

// ===========================================================
//  UTILS
// ===========================================================
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
function formatDDMMYYYY(yyyy_mm_dd){
  if(!yyyy_mm_dd)return "";
  const [y,m,d]= yyyy_mm_dd.split("-");
  return `${d}-${m}-${y}`;
}
function parseDateDMY(dd_mm_yyyy){
  if(!dd_mm_yyyy)return null;
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
function calcBusinessDaysDiff(fromDate,toDate){
  if(!fromDate||!toDate)return 9999;
  let start= new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  let end= new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  let invert=1;
  if(end<start){
    invert=-1;
    let tmp=start; start=end; end=tmp;
  }
  let days=0;
  let current= new Date(start);
  while(current<=end){
    const dow= current.getDay();
    if(dow!==0 && dow!==6){
      days++;
    }
    current.setDate(current.getDate()+1);
  }
  return (days-1)*invert;
}

// Exponemos para chart.js
export { currentRole, currentUser };
