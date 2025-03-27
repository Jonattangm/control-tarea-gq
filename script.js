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

//===================================================
// CONFIG
//===================================================
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

//===================================================
export let allTasks = [];
export let currentRole = null;
let currentUser = null;
let editTaskId = null;
let currentSortKey = null;
let currentSortDir = 1;
let currentCommentTaskId = null;

const TASK_STATES = [
  "Asignado","En proceso","Por revisar","Reportar","Finalizado",
  "SII","Municipalidad","Tesoreria","BPO","Cliente"
];
const COMMENT_STATES = ["pendiente","completado","en revisión"];
const DEFAULT_ROLE = "consultor";

//===================================================
// DOM
//===================================================
const authSection = document.getElementById("authSection");
const loginFooter = document.getElementById("loginFooter");

const sidebar = document.getElementById("sidebar");
const btnTareas = document.getElementById("btnTareas");
const btnFinalizadas = document.getElementById("btnFinalizadas");
const btnInforme = document.getElementById("btnInforme");
const btnCargas = document.getElementById("btnCargas");
const btnUsuarios = document.getElementById("btnUsuarios");
const btnHistorial = document.getElementById("btnHistorial");
const btnLogout = document.getElementById("btnLogout");

const dashboardSection = document.getElementById("dashboardSection");
const finalTasksSection = document.getElementById("finalTasksSection");
const reportSection = document.getElementById("reportSection");
const cargasSection = document.getElementById("cargasSection");
const adminUsersSection = document.getElementById("adminUsersSection");
const historySection = document.getElementById("historySection");

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

// Tareas
const toggleTaskBoxBtn = document.getElementById("toggleTaskBoxBtn");
const taskCreationDiv = document.getElementById("taskCreation");
const frmTareaTitle = document.getElementById("frmTareaTitle");

const newUserSelect = document.getElementById("newUserSelect");
const newRevisorSelect = document.getElementById("newRevisorSelect");
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

//===================================================
// DOMContentLoaded
//===================================================
document.addEventListener("DOMContentLoaded", ()=>{
  const authForm= document.getElementById("authForm");
  authForm.addEventListener("submit", e=> e.preventDefault());

  document.getElementById("btnRegister").addEventListener("click", registerUser);
  document.getElementById("btnLogin").addEventListener("click", loginUser);
  btnLogout.addEventListener("click", ()=> signOut(auth));

  createTaskBtn.addEventListener("click", handleTaskForm);

  btnTareas.addEventListener("click", ()=> showSection("dashboard"));
  btnFinalizadas.addEventListener("click", ()=>{
    showSection("finalTasks");
    renderFinalTasks(allTasks);
  });
  btnInforme.addEventListener("click", ()=> showSection("report"));
  btnCargas.addEventListener("click", ()=>{
    showSection("cargas");
    buildCargasStacked();
  });
  btnUsuarios.addEventListener("click", ()=>{
    showSection("adminUsers");
    loadAllUsers();
  });
  btnHistorial.addEventListener("click", ()=>{
    showSection("history");
    loadHistory();
  });

  btnClearHistory.addEventListener("click", clearHistory);

  addCommentBtn.addEventListener("click", addNewComment);
  closeCommentsBtn.addEventListener("click", closeCommentsPanel);

  toggleFiltersBtn.addEventListener("click", toggleFilters);
  toggleTaskBoxBtn.addEventListener("click", toggleTaskBox);

  // Ordenar Tareas
  const thsTasks= document.querySelectorAll("#tasksTable thead th[data-sortkey]");
  thsTasks.forEach(th=>{
    th.addEventListener("click", ()=>{
      const sortKey= th.getAttribute("data-sortkey");
      if(sortKey=== currentSortKey){
        currentSortDir*= -1;
      } else {
        currentSortKey= sortKey;
        currentSortDir=1;
      }
      renderTasks(allTasks);
    });
  });
  // Ordenar Final
  const thsFinal= document.querySelectorAll("#finalTasksTable thead th[data-sortkey]");
  thsFinal.forEach(th=>{
    th.addEventListener("click", ()=>{
      const sortKey= th.getAttribute("data-sortkey");
      if(sortKey=== currentSortKey){
        currentSortDir*= -1;
      } else {
        currentSortKey= sortKey;
        currentSortDir=1;
      }
      renderFinalTasks(allTasks);
    });
  });

  btnAplicarFiltros.addEventListener("click", aplicarFiltros);
  btnLimpiarFiltros.addEventListener("click", limpiarFiltros);
});

//===================================================
// onAuthStateChanged
//===================================================
onAuthStateChanged(auth, async user=>{
  if(user){
    const userRef= doc(db,"users", user.uid);
    const snap= await getDoc(userRef);
    if(snap.exists()){
      currentRole= snap.data().role;
    }else{
      await setDoc(userRef, { role: DEFAULT_ROLE, email: user.email.toLowerCase() });
      currentRole= DEFAULT_ROLE;
    }
    currentUser= user;

    authSection.style.display="none";
    loginFooter.style.display="none";
    sidebar.style.display="flex";
    showSection("dashboard");

    userEmailSpan.textContent= user.email||"";
    userRoleSpan.textContent= currentRole||"";

    // Buttons
    btnFinalizadas.style.display="inline-block";
    btnInforme.style.display="inline-block";
    btnCargas.style.display="inline-block";

    if(currentRole==="admin"){
      btnUsuarios.style.display="inline-block";
    }else{
      btnUsuarios.style.display="none";
    }
    if(["senior","supervisor","admin"].includes(currentRole)){
      btnHistorial.style.display="inline-block";
    }else{
      btnHistorial.style.display="none";
    }
    if(["admin","supervisor"].includes(currentRole)){
      btnClearHistory.style.display="inline-block";
    } else {
      btnClearHistory.style.display="none";
    }

    // consultor => autoasignarse
    if(currentRole==="consultor"){
      document.getElementById("lblResp").style.display="none";
      newUserSelect.style.display="none";
      filterResponsableSelect.value="";
      document.getElementById("rowFilterResponsable").style.display="none";
      document.getElementById("thRespHeader").textContent="";
      document.getElementById("thRespHeaderFinal").textContent="";
    }else{
      document.getElementById("lblResp").style.display="inline-block";
      newUserSelect.style.display="inline-block";
      document.getElementById("rowFilterResponsable").style.display="flex";
      document.getElementById("thRespHeader").textContent="Responsable";
      document.getElementById("thRespHeaderFinal").textContent="Responsable";
      await loadUserNamesToSelect(newUserSelect);
    }

    // Revisor => "Sin revisión" + resto
    await loadUserNamesToSelect(newRevisorSelect,true);

    await loadUserNamesToSelect(filterResponsableSelect,false);

    listenTasks();
  }else{
    currentUser=null; currentRole=null;
    authSection.style.display="block";
    loginFooter.style.display="block";
    sidebar.style.display="none";
    showSection("none");
  }
});

//===================================================
// Helpers show/hide sections
//===================================================
function showSection(name){
  dashboardSection.style.display="none";
  finalTasksSection.style.display="none";
  reportSection.style.display="none";
  cargasSection.style.display="none";
  adminUsersSection.style.display="none";
  historySection.style.display="none";
  switch(name){
    case "dashboard": dashboardSection.style.display="block"; break;
    case "finalTasks": finalTasksSection.style.display="block"; break;
    case "report": reportSection.style.display="block"; break;
    case "cargas": cargasSection.style.display="block"; break;
    case "adminUsers": adminUsersSection.style.display="block"; break;
    case "history": historySection.style.display="block"; break;
    default: break;
  }
}

//===================================================
// LOGIN / REGISTER
//===================================================
async function registerUser(){
  const email= document.getElementById("email").value.trim();
  const pass= document.getElementById("password").value.trim();
  const authMessage= document.getElementById("authMessage");
  if(!email||!pass){
    authMessage.textContent="Por favor, llena todos los campos.";
    return;
  }
  try{
    await createUserWithEmailAndPassword(auth, email, pass);
  }catch(e){
    authMessage.textContent=`Error al crear usuario: ${e.message}`;
  }
}
async function loginUser(){
  const email= document.getElementById("email").value.trim();
  const pass= document.getElementById("password").value.trim();
  const authMessage= document.getElementById("authMessage");
  if(!email||!pass){
    authMessage.textContent="Por favor, llena todos los campos.";
    return;
  }
  try{
    await signInWithEmailAndPassword(auth, email, pass);
  }catch(e){
    authMessage.textContent=`Error al iniciar sesión: ${e.message}`;
  }
}

//===================================================
// loadUserNamesToSelect
//===================================================
async function loadUserNamesToSelect(selectEl, revisorMode=false){
  if(!selectEl)return;
  selectEl.innerHTML= revisorMode? `<option value="">Sin revisión</option>`:`<option value="">(Todos)</option>`;
  try{
    const snap= await getDocs(collection(db,"users"));
    snap.forEach(docu=>{
      const dt= docu.data();
      const nm= dt.name|| dt.email||"";
      if(nm){
        let opt=document.createElement("option");
        opt.value= nm;
        opt.textContent= nm;
        selectEl.appendChild(opt);
      }
    });
  }catch(e){
    console.error("Error loadUserNamesToSelect:", e);
  }
}

//===================================================
// CREAR / EDITAR TAREA
//===================================================
async function handleTaskForm(){
  // 1) Nombre responsable
  let respName="";
  if(currentRole==="consultor"){
    // auto
    const userRef= doc(db,"users", currentUser.uid);
    const snap= await getDoc(userRef);
    if(snap.exists() && snap.data().name){
      respName= snap.data().name;
    } else {
      respName= currentUser.email;
    }
  }else{
    respName= newUserSelect.value.trim();
  }
  // 2) Revisor
  let revisorName= newRevisorSelect.value.trim();
  if(!revisorName) revisorName="N/A";

  const act= newTaskName.value.trim();
  if(!act){
    alert("Completa la 'Actividad'.");
    return;
  }
  // Horas => HH:MM
  const hhmm= newHoras.value.trim();
  if(!/^(\d{1,2}):(\d{2})$/.test(hhmm)){
    alert("Las horas deben tener formato HH:MM.");
    return;
  }
  try{
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
    // revisor => email
    let revisorEmail="";
    if(revisorName!=="N/A" && revisorName!=="Sin revisión"){
      const revEmail= await findEmailByName(revisorName);
      if(revEmail) revisorEmail= revEmail;
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
      const oldDoc= await getDoc(doc(db,"tasks", editTaskId));
      const oldData= oldDoc.exists()? oldDoc.data():{};
      const newData= {
        idTarea: nextId,
        userName: respName,
        revisorName: revisorName,
        revisorEmail: revisorEmail,
        assignedTo: assignedEmail,
        name: act,
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: hhmm,
        fechaEntrega: newFechaEntrega.value|| null
      };
      await updateDoc(doc(db,"tasks", editTaskId), newData);
      alert("Tarea actualizada.");

      // Historial => sin registrar cambio de estado
      let changes=[];
      for(const k of ["userName","revisorName","name","empresa","grupoCliente","folioProyecto","horasAsignadas","fechaEntrega"]){
        const oldVal= oldData[k]||"";
        const newVal= newData[k]||"";
        if(oldVal!== newVal){
          changes.push(`${k}: "${oldVal}" => "${newVal}"`);
        }
      }
      if(changes.length===0) changes.push("Sin cambios");
      await addDoc(collection(db,"history"), {
        taskId: nextId,
        responsible: respName,
        activity: act,
        company: newData.empresa,
        group: newData.grupoCliente,
        action:`Editó la tarea (${changes.join(", ")})`,
        date: new Date(),
        userEmail: currentUser.email
      });

      clearTaskForm();
    } else {
      // create
      const newTask= {
        idTarea: nextId,
        fechaAsignacion: new Date().toLocaleDateString("es-CL"),
        fechaEntrega: newFechaEntrega.value|| null,
        userName: respName,
        revisorName: revisorName,
        revisorEmail: revisorEmail,
        assignedTo: assignedEmail,
        name: act,
        empresa: newEmpresa.value.trim(),
        grupoCliente: newGrupo.value.trim(),
        folioProyecto: newFolio.value.trim(),
        horasAsignadas: hhmm,
        status:"Asignado",
        createdAt:new Date(),
        createdBy: currentUser.uid
      };
      await addDoc(colRef, newTask);
      alert("Tarea creada.");

      await addDoc(collection(db,"history"),{
        taskId: nextId,
        responsible: respName,
        activity: act,
        company: newTask.empresa,
        group: newTask.grupoCliente,
        action:"Creó la tarea",
        date:new Date(),
        userEmail: currentUser.email
      });
      clearTaskForm();
    }
  }catch(e){
    console.error("Error al crear/editar tarea:", e);
  }
}
function clearTaskForm(){
  newUserSelect.value="";
  newRevisorSelect.value="Sin revisión";
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
  if(!name)return null;
  const snap= await getDocs(collection(db,"users"));
  for(const docu of snap.docs){
    const d= docu.data();
    if((d.name||"").toLowerCase()=== name.toLowerCase()){
      return d.email;
    }
  }
  return null;
}

//===================================================
// LISTEN tasks
//===================================================
function listenTasks(){
  const colRef= collection(db,"tasks");
  onSnapshot(colRef, snap=>{
    let temp=[];
    snap.forEach(docu=>{
      temp.push({...docu.data(), docId: docu.id});
    });
    allTasks= temp;
    renderTasks(allTasks);
    renderFinalTasks(allTasks);
  });
}

//===================================================
// RENDER TAREAS
//===================================================
export function renderTasks(tasksArray){
  tasksTableBody.innerHTML="";
  let arr= tasksArray.filter(t=> t.status!=="Finalizado");
  if(currentRole==="consultor" && currentUser){
    arr= arr.filter(t=> (t.assignedTo||"").toLowerCase()=== currentUser.email.toLowerCase());
  }
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
  const fil= filtrarDash(sorted);

  fil.forEach(task=>{
    const tr= document.createElement("tr");

    // col1 => responsable
    let td1= document.createElement("td");
    if(currentRole==="consultor") td1.textContent= "";
    else td1.textContent= task.userName||"";
    tr.appendChild(td1);

    // col2 => revisor
    let td2= document.createElement("td");
    td2.textContent= task.revisorName? task.revisorName:"N/A";
    tr.appendChild(td2);

    // col3 => id
    let td3= document.createElement("td");
    td3.textContent= task.idTarea||"N/A";
    tr.appendChild(td3);

    // col4 => asig
    let td4= document.createElement("td");
    td4.textContent= task.fechaAsignacion||"--";
    tr.appendChild(td4);

    // col5 => ent
    let td5= document.createElement("td");
    if(task.fechaEntrega){
      const f= formatDDMMYYYY(task.fechaEntrega);
      let diff=0;
      if(task.status==="Finalizado"){
        diff=0;
        td5.textContent= `${f} (0)`;
      } else {
        diff= calcBusinessDaysDiff(new Date(), parseDateDMY(f));
        td5.textContent= `${f} (${diff})`;
        if(diff<=2) td5.classList.add("fecha-rojo");
        else if(diff<=5) td5.classList.add("fecha-naranjo");
        else if(diff<=8) td5.classList.add("fecha-amarillo");
        else if(diff<=11) td5.classList.add("fecha-verde");
        else td5.classList.add("fecha-azul");
      }
    } else td5.textContent="";
    tr.appendChild(td5);

    // col6 => actividad
    let td6= document.createElement("td");
    td6.textContent= task.name||"";
    tr.appendChild(td6);

    // col7 => estado
    let td7= document.createElement("td");
    let sel= document.createElement("select");
    // El chart no mostrará finalizado => pero en la UI si está
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
      if(st=== task.status) o.selected= true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", async()=>{
      const newSt= sel.value;
      if(newSt==="Finalizado" && task.status!=="Finalizado"){
        if(!confirm("¿Estás seguro de poner estado Finalizado?")){
          sel.value= task.status; return;
        }
        await updateDoc(doc(db,"tasks", task.docId), { lastCommentAt:new Date() });
      }
      if(currentRole==="consultor" && newSt==="Por revisar" && task.status!=="Por revisar"){
        if(!confirm("¿Pasar a 'Por revisar'?")) {
          sel.value= task.status; return;
        }
      }
      if(currentRole==="senior" && newSt==="Reportar" && task.status!=="Reportar"){
        if(!confirm("¿Pasar a 'Reportar'?")) {
          sel.value= task.status; return;
        }
      }
      if(!canChangeStatus(currentRole, task.status, newSt)){
        alert("No tienes permiso para ese cambio.");
        sel.value= task.status;
      } else {
        if(newSt==="SII"){
          alert("Recuerda anotar Folio y Fiscalizador en comentarios");
          let baseDate= new Date();
          if(task.lastCommentAt && task.lastCommentAt.toDate){
            baseDate= task.lastCommentAt.toDate();
          }
          const nm= getNextMonday(baseDate);
          const y= nm.getFullYear();
          const m= String(nm.getMonth()+1).padStart(2,'0');
          const d= String(nm.getDate()).padStart(2,'0');
          await updateDoc(doc(db,"tasks", task.docId), {
            fechaEntrega: `${y}-${m}-${d}`
          });
        }
        if(newSt==="Tesoreria"){
          alert("Recuerda revisar cada semana");
          let baseDate= new Date();
          if(task.lastCommentAt && task.lastCommentAt.toDate){
            baseDate= task.lastCommentAt.toDate();
          }
          const nm= getNextMonday(baseDate);
          const yy= nm.getFullYear();
          const mm= String(nm.getMonth()+1).padStart(2,'0');
          const dd= String(nm.getDate()).padStart(2,'0');
          await updateDoc(doc(db,"tasks", task.docId), {
            fechaEntrega: `${yy}-${mm}-${dd}`
          });
        }

        await updateDoc(doc(db,"tasks", task.docId),{ status:newSt });
      }
    });
    td7.appendChild(sel);
    let ind= document.createElement("span");
    ind.classList.add("status-indicator");
    let lowered= (task.status||"").toLowerCase().replace(" ","-");
    ind.classList.add(`status-${lowered}`);
    td7.appendChild(ind);
    tr.appendChild(td7);

    // col8 => empresa
    let td8= document.createElement("td");
    td8.textContent= task.empresa||"";
    tr.appendChild(td8);

    // col9 => grupo
    let td9= document.createElement("td");
    td9.textContent= task.grupoCliente||"";
    tr.appendChild(td9);

    // col10 => folio
    let td10= document.createElement("td");
    td10.textContent= task.folioProyecto||"";
    tr.appendChild(td10);

    // col11 => horas
    let td11= document.createElement("td");
    td11.textContent= task.horasAsignadas||"";
    tr.appendChild(td11);

    // col12 => ultima
    let td12= document.createElement("td");
    if(task.lastCommentAt && task.lastCommentAt.toDate){
      td12.textContent= task.lastCommentAt.toDate().toLocaleDateString("es-CL");
    } else td12.textContent="--";
    tr.appendChild(td12);

    // col13 => acciones
    let td13= document.createElement("td");
    // Edit
    let bEd= document.createElement("button");
    bEd.classList.add("action-btn");
    bEd.innerHTML="✎";
    bEd.title="Editar Tarea";
    bEd.addEventListener("click", ()=>{
      editTaskId= task.docId;
      frmTareaTitle.textContent= "Editar Tarea (ID: "+(task.idTarea||"N/A")+")";
      createTaskBtn.textContent= "Actualizar Tarea";

      newUserSelect.value= task.userName||"";
      newRevisorSelect.value= task.revisorName? task.revisorName:"Sin revisión";
      newTaskName.value= task.name||"";
      newEmpresa.value= task.empresa||"";
      newGrupo.value= task.grupoCliente||"";
      newFolio.value= task.folioProyecto||"";
      newHoras.value= task.horasAsignadas||"";
      newFechaEntrega.value= task.fechaEntrega||"";
      showSection("dashboard");
    });
    td13.appendChild(bEd);
    // Del
    let bDel= document.createElement("button");
    bDel.classList.add("action-btn");
    bDel.innerHTML="🗑";
    bDel.style.marginLeft="5px";
    bDel.title="Eliminar Tarea";
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
    td13.appendChild(bDel);
    // Comments
    let bCom= document.createElement("button");
    bCom.classList.add("action-btn");
    bCom.innerHTML="💬";
    bCom.style.marginLeft="5px";
    bCom.title="Comentarios";
    bCom.addEventListener("click",()=>{
      openCommentsPanel(task.docId, task.idTarea);
    });
    td13.appendChild(bCom);
    tr.appendChild(td13);

    tasksTableBody.appendChild(tr);
  });
}

export function renderFinalTasks(tasksArray){
  finalTasksBody.innerHTML="";
  let arr= tasksArray.filter(t=> t.status==="Finalizado");
  if(currentRole==="consultor" && currentUser){
    arr= arr.filter(t=> (t.assignedTo||"").toLowerCase()=== currentUser.email.toLowerCase());
  }
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

    // 1 => resp
    let td1= document.createElement("td");
    if(currentRole==="consultor") td1.textContent="";
    else td1.textContent= task.userName||"";
    tr.appendChild(td1);

    // 2 => revisor
    let td2= document.createElement("td");
    td2.textContent= task.revisorName? task.revisorName:"N/A";
    tr.appendChild(td2);

    // 3 => id
    let td3= document.createElement("td");
    td3.textContent= task.idTarea||"N/A";
    tr.appendChild(td3);

    // 4 => asig
    let td4= document.createElement("td");
    td4.textContent= task.fechaAsignacion||"--";
    tr.appendChild(td4);

    // 5 => ent
    let td5= document.createElement("td");
    if(task.fechaEntrega){
      const f= formatDDMMYYYY(task.fechaEntrega);
      td5.textContent= `${f} (0)`;
    }else td5.textContent="";
    tr.appendChild(td5);

    // 6 => act
    let td6= document.createElement("td");
    td6.textContent= task.name||"";
    tr.appendChild(td6);

    // 7 => est
    let td7= document.createElement("td");
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
        if(!canChangeStatus(currentRole,"Finalizado",newSt)){
          alert("No tienes permiso para ese cambio.");
          sel.value="Finalizado";
          return;
        }
        await updateDoc(doc(db,"tasks",task.docId), {status:newSt});
        showSection("dashboard");
      }
    });
    td7.appendChild(sel);
    let ind= document.createElement("span");
    ind.classList.add("status-indicator");
    let lowered= (task.status||"").toLowerCase().replace(" ","-");
    ind.classList.add(`status-${lowered}`);
    td7.appendChild(ind);
    tr.appendChild(td7);

    // 8 => emp
    let td8= document.createElement("td");
    td8.textContent= task.empresa||"";
    tr.appendChild(td8);

    // 9 => grp
    let td9= document.createElement("td");
    td9.textContent= task.grupoCliente||"";
    tr.appendChild(td9);

    // 10 => folio
    let td10= document.createElement("td");
    td10.textContent= task.folioProyecto||"";
    tr.appendChild(td10);

    // 11 => horas
    let td11= document.createElement("td");
    td11.textContent= task.horasAsignadas||"";
    tr.appendChild(td11);

    // 12 => last
    let td12= document.createElement("td");
    if(task.lastCommentAt && task.lastCommentAt.toDate){
      td12.textContent= task.lastCommentAt.toDate().toLocaleDateString("es-CL");
    } else td12.textContent="--";
    tr.appendChild(td12);

    // 13 => actions
    let td13= document.createElement("td");
    let bEd= document.createElement("button");
    bEd.classList.add("action-btn");
    bEd.innerHTML="✎";
    bEd.title="Editar Tarea";
    bEd.addEventListener("click",()=>{
      editTaskId= task.docId;
      frmTareaTitle.textContent= "Editar Tarea (ID: "+(task.idTarea||"N/A")+")";
      createTaskBtn.textContent= "Actualizar Tarea";

      newUserSelect.value= task.userName||"";
      newRevisorSelect.value= task.revisorName? task.revisorName:"Sin revisión";
      newTaskName.value= task.name||"";
      newEmpresa.value= task.empresa||"";
      newGrupo.value= task.grupoCliente||"";
      newFolio.value= task.folioProyecto||"";
      newHoras.value= task.horasAsignadas||"";
      newFechaEntrega.value= task.fechaEntrega||"";

      showSection("dashboard");
    });
    td13.appendChild(bEd);

    let bDel= document.createElement("button");
    bDel.classList.add("action-btn");
    bDel.innerHTML="🗑";
    bDel.title="Eliminar Tarea";
    bDel.style.marginLeft="5px";
    bDel.addEventListener("click", async()=>{
      if(!confirm("¿Deseas eliminar la tarea?")) return;
      await addDoc(collection(db,"history"), {
        taskId: task.idTarea||-1,
        responsible: task.userName,
        activity: task.name,
        company: task.empresa,
        group: task.grupoCliente,
        action: "Eliminó la tarea",
        date:new Date(),
        userEmail: currentUser.email
      });
      await deleteDoc(doc(db,"tasks", task.docId));
    });
    td13.appendChild(bDel);

    let bCom= document.createElement("button");
    bCom.classList.add("action-btn");
    bCom.innerHTML="💬";
    bCom.title="Comentarios";
    bCom.style.marginLeft="5px";
    bCom.addEventListener("click",()=>{
      openCommentsPanel(task.docId, task.idTarea);
    });
    td13.appendChild(bCom);

    tr.appendChild(td13);

    finalTasksBody.appendChild(tr);
  });
}

//===================================================
// Filtrar
//===================================================
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
      const match= (t.userName||"").toLowerCase().includes(valResp);
      if(exResp && match)return false;
      if(!exResp && !match)return false;
    }
    if(valEst){
      const match= (t.status||"").toLowerCase().includes(valEst);
      if(exEst && match)return false;
      if(!exEst && !match)return false;
    }
    if(valEmp){
      const match= (t.empresa||"").toLowerCase().includes(valEmp);
      if(exEmp && match)return false;
      if(!exEmp && !match)return false;
    }
    if(valGru){
      const match= (t.grupoCliente||"").toLowerCase().includes(valGru);
      if(exGru && match)return false;
      if(!exGru && !match)return false;
    }
    return true;
  });
}

//===================================================
// canChangeStatus
//===================================================
function canChangeStatus(role, currentSt, newSt){
  if(role==="senior"){
    if(newSt==="Finalizado" && currentSt!=="Finalizado")return false;
    if(["Finalizado","Reportar"].includes(currentSt))return false;
    return true;
  }
  if(role==="consultor"){
    if(["Finalizado","Reportar","Por revisar"].includes(currentSt))return false;
    if(["Finalizado","Reportar"].includes(newSt))return false;
    return true;
  }
  return true;
}
function getNextMonday(baseDate){
  const d= new Date(baseDate);
  while(d.getDay()!==1){
    d.setDate(d.getDate()+1);
  }
  return d;
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

//===================================================
// COMENTARIOS
//===================================================
export function openCommentsPanel(taskDocId, tareaId){
  currentCommentTaskId= taskDocId;
  commentTaskIdSpan.textContent= tareaId||"N/A";
  commentsPanel.style.display="block";
  loadComments(taskDocId);
}
async function loadComments(taskDocId){
  commentsListDiv.innerHTML="Cargando...";
  const cRef= collection(db,"tasks",taskDocId,"comments");
  const qRef= query(cRef, orderBy("createdAt","asc"));
  const snap= await getDocs(qRef);
  let commentData=[];
  snap.forEach(docu=>{
    commentData.push({ id: docu.id, ...docu.data() });
  });
  if(commentData.length===0){
    commentsListDiv.innerHTML="<p>Sin comentarios</p>";
    return;
  }
  let html="";
  commentData.forEach(c=>{
    const dateStr= c.createdAt? new Date(c.createdAt.toDate()).toLocaleDateString("es-CL"):"";
    const cStat= c.commentStatus|| "pendiente";
    let commentIndicator= `<span class="status-comment-${cStat.replace(" ","-")}"></span>`;
    let selState= `<select data-cid="${c.id}" onchange="changeCommentStatus(this)">`;
    COMMENT_STATES.forEach(st=>{
      selState+= `<option value="${st}" ${st===cStat?"selected":""}>${st}</option>`;
    });
    selState+="</select>";

    const isAuthor=(c.authorUid=== (currentUser?.uid||""));
    let canEditDel=isAuthor; 
    if(["senior","supervisor","admin"].includes(currentRole)) canEditDel=true;

    html+= `<div class="comment-item">`;
    html+= `<div class="comment-author">${commentIndicator}<b>${c.authorEmail||"?"}</b> - ${selState}</div>`;
    html+= `<div class="comment-text" style="margin-left:1rem;">${c.text||""}</div>`;
    html+= `<div class="comment-date" style="font-size:0.8rem;color:#888; margin-left:1rem;">${dateStr}</div>`;
    if(canEditDel){
      html+= `<div class="comment-actions" style="margin-left:1rem;">`;
      if(isAuthor){
        html+= `<button onclick="editComment('${c.id}')">Editar</button>`;
      }
      html+= `<button style="margin-left:5px;" onclick="deleteComment('${c.id}')">Eliminar</button>`;
      html+= `</div>`;
    }
    html+= `</div>`;
  });
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
    let authorEmail= currentUser.email;
    let authorUid= currentUser.uid;
    const usr= await getDoc(doc(db,"users", authorUid));
    if(usr.exists() && usr.data().name){
      authorEmail= usr.data().name;
    }
    const cRef= collection(db,"tasks", currentCommentTaskId,"comments");
    await addDoc(cRef,{
      text,
      authorEmail,
      authorUid,
      createdAt:new Date(),
      commentStatus:"pendiente"
    });
    await updateDoc(doc(db,"tasks", currentCommentTaskId), {
      lastCommentAt: new Date()
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
  commentTextArea.value="";
  commentsListDiv.innerHTML="";
}
window.closeCommentsPanel= closeCommentsPanel;
window.addNewComment= addNewComment;
window.editComment= async function(commentId){
  if(!currentCommentTaskId)return;
  let newText= prompt("Editar comentario:");
  if(!newText)return;
  try{
    await updateDoc(doc(db,"tasks", currentCommentTaskId,"comments", commentId),{
      text:newText
    });
    await updateDoc(doc(db,"tasks", currentCommentTaskId),{
      lastCommentAt:new Date()
    });
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error al editar comentario:", e);
    alert("Error al editar: "+ e.message);
  }
};
window.deleteComment= async function(commentId){
  if(!currentCommentTaskId)return;
  if(!confirm("¿Eliminar este comentario?"))return;
  try{
    await deleteDoc(doc(db,"tasks", currentCommentTaskId,"comments", commentId));
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error al eliminar comentario:", e);
    alert("Error al eliminar: "+ e.message);
  }
};
window.changeCommentStatus= async function(selEl){
  if(!currentCommentTaskId)return;
  const cid= selEl.getAttribute("data-cid");
  const newVal= selEl.value;
  try{
    await updateDoc(doc(db,"tasks", currentCommentTaskId,"comments",cid),{
      commentStatus:newVal
    });
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error al cambiar estado comentario:", e);
    alert("Error al cambiar estado cmt: "+ e.message);
  }
};

//===================================================
// ADMIN => loadAllUsers
//===================================================
async function loadAllUsers(){
  usersTableBody.innerHTML="Cargando...";
  try{
    const snap= await getDocs(collection(db,"users"));
    let html="";
    snap.forEach(docu=>{
      const dt= docu.data();
      const e= dt.email||docu.id;
      const n= dt.name|| dt.email||"";
      const r= dt.role||"consultor";
      html+= `<tr>
        <td>${e}</td>
        <td><input type="text" value="${n}" onchange="changeUserName('${docu.id}', this.value, '${n}')"/></td>
        <td>${r}</td>
        <td><select onchange="changeUserRole('${docu.id}', this.value, '${r}')">
          <option value="consultor" ${r==="consultor"?"selected":""}>consultor</option>
          <option value="senior" ${r==="senior"?"selected":""}>senior</option>
          <option value="supervisor" ${r==="supervisor"?"selected":""}>supervisor</option>
          <option value="admin" ${r==="admin"?"selected":""}>admin</option>
        </select></td>
      </tr>`;
    });
    if(!html) html="<tr><td colspan='4'>Sin Usuarios</td></tr>";
    usersTableBody.innerHTML= html;
  }catch(e){
    console.error("Error loadAllUsers:", e);
    usersTableBody.innerHTML=`<tr><td colspan='4'>Error: ${e.message}</td></tr>`;
  }
}
window.loadAllUsers= loadAllUsers;
window.changeUserName= async function(uid, newVal, oldVal){
  if(!confirm("¿Cambiar Nombre de Usuario?")){
    return;
  }
  try{
    await updateDoc(doc(db,"users", uid),{ name:newVal });
  }catch(e){
    console.error("Error actualizando name:", e);
    alert("Error: "+ e.message);
  }
};
window.changeUserRole= async function(uid, newVal, oldVal){
  if(!confirm("¿Cambiar Rol de Usuario?")){
    return;
  }
  try{
    await updateDoc(doc(db,"users", uid),{ role:newVal });
  }catch(e){
    console.error("Error cambiando rol:", e);
    alert("Error: "+ e.message);
  }
};

//===================================================
// HISTORIAL
//===================================================
async function loadHistory(){
  historyTableBody.innerHTML="Cargando...";
  try{
    const qRef= query(collection(db,"history"), orderBy("date","desc"));
    const snap= await getDocs(qRef);
    let html="";
    snap.forEach(docu=>{
      const h= docu.data();
      const dStr= h.date? new Date(h.date.toDate()).toLocaleDateString("es-CL"):"";
      html+= `<tr>
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
window.loadHistory= loadHistory;
window.clearHistory= clearHistory;

//===================================================
// toggle filters / taskbox
//===================================================
export function toggleFilters(){
  if(filtersContainer.style.display==="none"){
    filtersContainer.style.display="flex";
    toggleFiltersBtn.textContent="-";
  } else {
    filtersContainer.style.display="none";
    toggleFiltersBtn.textContent="+";
  }
}
export function toggleTaskBox(){
  if(taskCreationDiv.style.display==="none"){
    taskCreationDiv.style.display="block";
    toggleTaskBoxBtn.textContent="-";
  } else {
    taskCreationDiv.style.display="none";
    toggleTaskBoxBtn.textContent="+";
  }
}
window.toggleFilters= toggleFilters;
window.toggleTaskBox= toggleTaskBox;
window.aplicarFiltros= aplicarFiltros;
window.limpiarFiltros= limpiarFiltros;

//===================================================
// CARGAS => sin tablas, con stacked bar
//===================================================
export async function buildCargasStacked(){
  // Cargar usuarios
  let userList=[];
  const snap= await getDocs(collection(db,"users"));
  snap.forEach(d=>{
    const dt= d.data();
    userList.push({
      email: (dt.email||d.id).toLowerCase(),
      name: dt.name|| dt.email||"",
      role: dt.role||"consultor"
    });
  });

  // Tareas
  let tasksActivas= allTasks.filter(t=> t.status!=="Finalizado");
  // Ordenar por fecha de entrega "dif" asc
  let tasksSorted= tasksActivas.slice().sort((a,b)=>{
    let aDiff= getDiffOrder(a);
    let bDiff= getDiffOrder(b);
    return aDiff- bDiff;
  });

  // userMap => { [email]: array(57).fill("") } => slots 1..56
  let userMap={};
  userList.forEach(u=>{
    userMap[u.email]= new Array(57).fill("");
  });

  tasksSorted.forEach(t=>{
    let assigned= (t.assignedTo||"").toLowerCase();
    let rev= (t.revisorEmail||"").toLowerCase();
    let baseMin= parseHHMMtoMin(t.horasAsignadas||"0:00");
    let revMin=0;
    if(rev && rev!==""){
      revMin= Math.ceil(baseMin/4);
    }
    let totalMin= baseMin+ revMin;
    fillUserSlots(userMap, assigned, baseMin, t.status);
    if(rev) fillUserSlots(userMap, rev, revMin, t.status);
  });

  drawStackedCargasChart("cargasStackedCanvas", userMap, userList, 1,44,[9,18,27,36], false);
  drawStackedCargasChart("extrasStackedCanvas", userMap, userList, 45,56,[], true);
}

function getDiffOrder(t){
  if(!t.fechaEntrega)return 9999;
  if(t.status==="Finalizado")return 9999;
  let f= formatDDMMYYYY(t.fechaEntrega);
  let dd= parseDateDMY(f);
  if(!dd)return 9999;
  return calcDiffDays2(new Date(), dd);
}
function calcDiffDays2(fromDate,toDate){
  if(!fromDate||!toDate)return 9999;
  let start= new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  let end= new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  let sign=1;
  if(end<start){
    sign=-1;[start,end]=[end,start];
  }
  let diff=0; let cur= new Date(start);
  while(cur<=end){
    let dw= cur.getDay();
    if(dw!==0 && dw!==6) diff++;
    cur.setDate(cur.getDate()+1);
  }
  return (diff-1)*sign;
}
function parseHHMMtoMin(str){
  if(!str)return 0;
  let [hh,mm]= str.split(":");
  let h= parseInt(hh)||0;
  let m= parseInt(mm)||0;
  return h*60+ m;
}
function fillUserSlots(mapObj, userEmail, totalMin, statusStr){
  if(!userEmail || !mapObj[userEmail])return;
  let color= stateColor(statusStr);
  while(totalMin>=60){
    let slot= findNextEmptySlot(mapObj[userEmail]);
    if(slot===-1)break;
    mapObj[userEmail][slot]= color;
    totalMin-=60;
  }
  if(totalMin>=30){
    let slot= findNextEmptySlot(mapObj[userEmail]);
    if(slot!==-1){
      mapObj[userEmail][slot]="#999"; // distorsión
    }
  }
}
function findNextEmptySlot(arr){
  for(let i=1;i< arr.length;i++){
    if(!arr[i]){
      return i;
    }
  }
  return -1;
}
function stateColor(st){
  switch(st){
    case "Asignado": return "#cccccc";
    case "En proceso": return "#00bfff";
    case "Por revisar": return "#ffc107";
    case "Reportar": return "#ff5722";
    case "SII": return "#3f51b5";
    case "Municipalidad": return "#9c27b0";
    case "Tesoreria": return "#8bc34a";
    case "BPO": return "#795548";
    case "Cliente": return "#8b8b8b";
  }
  return "#999";
}
function drawStackedCargasChart(canvasId, userMap, userList, fromX, toX, dayCuts, extrasMode){
  const can= document.getElementById(canvasId);
  if(!can)return;
  let ctx= can.getContext("2d");
  ctx.clearRect(0,0, can.width, can.height);

  if(!extrasMode){
    can.width= 1400; 
    can.height= 400;
  } else {
    can.width= 1500; 
    can.height= 450;
  }

  let marginLeft= 80;
  let marginTop= 30;
  let cellW= 20;
  let cellH= 20;
  let rowGap= 5;

  userList.forEach((u,ui)=>{
    let y= marginTop+ ui*(cellH+rowGap);
    ctx.fillStyle="#000";
    ctx.fillText(u.name, 5, y+ cellH*0.75);

    for(let slot= fromX; slot<=toX; slot++){
      let color= userMap[u.email][slot]|| "";
      let x= marginLeft+ (slot-fromX)* cellW;
      ctx.fillStyle= color||"#fff";
      ctx.fillRect(x, y, cellW, cellH);

      ctx.strokeStyle="#000";
      ctx.strokeRect(x,y, cellW,cellH);

      if(ui===0){
        ctx.fillStyle="#666";
        ctx.font="10px Arial";
        ctx.fillText(`${slot}`, x+2, marginTop-5);
        if(!extrasMode){
          // new day cuts => between 9–10, 18–19, 27–28, 36–37
          // we handle them below in dayCuts
          // draw day label near the midpoint
          if(slot===5){
            ctx.fillStyle="#000";
            ctx.fillText("Lunes", x-15, marginTop-15);
          }
          if(slot===14){
            ctx.fillStyle="#000";
            ctx.fillText("Martes", x-15, marginTop-15);
          }
          if(slot===23){
            ctx.fillStyle="#000";
            ctx.fillText("Miércoles", x-20, marginTop-15);
          }
          if(slot===32){
            ctx.fillStyle="#000";
            ctx.fillText("Jueves", x-15, marginTop-15);
          }
          if(slot===41){
            ctx.fillStyle="#000";
            ctx.fillText("Viernes", x-15, marginTop-15);
          }
        }
      }
    }
  });

  if(dayCuts && dayCuts.length>0){
    dayCuts.forEach(dc=>{
      if(dc>=fromX && dc<=toX){
        let offset= (dc - fromX)* cellW;
        let totalH= userList.length*(cellH+ rowGap);
        ctx.strokeStyle="red";
        ctx.beginPath();
        ctx.moveTo(marginLeft+ offset, marginTop);
        ctx.lineTo(marginLeft+ offset, marginTop+ totalH);
        ctx.stroke();
      }
    });
  }
}

//===================================================
// Comentarios => references
//===================================================
window.closeCommentsPanel= closeCommentsPanel;
window.addNewComment= addNewComment;
window.editComment= async function(commentId){
  if(!currentCommentTaskId)return;
  let newText= prompt("Editar comentario:");
  if(!newText)return;
  try{
    await updateDoc(doc(db,"tasks", currentCommentTaskId,"comments", commentId),{
      text:newText
    });
    await updateDoc(doc(db,"tasks", currentCommentTaskId),{
      lastCommentAt:new Date()
    });
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error al editar comentario:", e);
    alert("Error al editar: "+ e.message);
  }
};
window.deleteComment= async function(commentId){
  if(!currentCommentTaskId)return;
  if(!confirm("¿Eliminar este comentario?"))return;
  try{
    await deleteDoc(doc(db,"tasks", currentCommentTaskId,"comments", commentId));
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error al eliminar comentario:", e);
    alert("Error al eliminar: "+ e.message);
  }
};
window.changeCommentStatus= async function(selEl){
  if(!currentCommentTaskId)return;
  const cid= selEl.getAttribute("data-cid");
  const newVal= selEl.value;
  try{
    await updateDoc(doc(db,"tasks", currentCommentTaskId,"comments",cid),{
      commentStatus:newVal
    });
    loadComments(currentCommentTaskId);
  }catch(e){
    console.error("Error al cambiar estado comentario:", e);
    alert("Error al cambiar estado cmt: "+ e.message);
  }
};

//===================================================
// Export leftover
//===================================================
window.toggleFilters= toggleFilters;
window.toggleTaskBox= toggleTaskBox;
window.aplicarFiltros= aplicarFiltros;
window.limpiarFiltros= limpiarFiltros;
window.loadAllUsers= loadAllUsers;
window.loadHistory= loadHistory;
window.clearHistory= clearHistory;
