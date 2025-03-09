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

const DEFAULT_ROLE = "consultor";
const ALL_ROLES = ["consultor","senior","supervisor","admin"];
const TASK_STATES = ["Asignado","En proceso","Por revisar","Reportar","Finalizado"];

/****************************************************
 * REFERENCIAS AL DOM
 ****************************************************/
const sidebar = document.getElementById("sidebar");
const btnTareas = document.getElementById("btnTareas");
const btnUsuarios = document.getElementById("btnUsuarios");

const authSection = document.getElementById("authSection");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const btnRegister = document.getElementById("btnRegister");
const btnLogin = document.getElementById("btnLogin");
const authMessage = document.getElementById("authMessage");

const dashboardSection = document.getElementById("dashboardSection");
const userEmailSpan = document.getElementById("userEmail");
const userRoleSpan = document.getElementById("userRole");
const btnLogout = document.getElementById("btnLogout");

const taskCreationDiv = document.getElementById("taskCreation");
const newTaskName = document.getElementById("newTaskName");
const newTaskAssigned = document.getElementById("newTaskAssigned");
const newEmpresa = document.getElementById("newEmpresa");
const newGrupo = document.getElementById("newGrupo");
const newFolio = document.getElementById("newFolio");
const createTaskBtn = document.getElementById("createTaskBtn");

const tasksTableBody = document.getElementById("tasksBody");
const adminUsersSection = document.getElementById("adminUsersSection");
const usersTableBody = document.getElementById("usersBody");

/****************************************************
 * EVENTOS INICIALES
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Evita recargar form
  authForm?.addEventListener("submit", (e) => e.preventDefault());

  btnRegister?.addEventListener("click", registerUser);
  btnLogin?.addEventListener("click", loginUser);

  btnLogout?.addEventListener("click", async () => {
    await signOut(auth);
  });

  createTaskBtn?.addEventListener("click", createTask);

  // Evento para ver Tareas
  btnTareas?.addEventListener("click", () => {
    dashboardSection.style.display = "block";
    adminUsersSection.style.display = "none";
  });
  // Evento para ver Usuarios
  btnUsuarios?.addEventListener("click", () => {
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "block";
  });
});

/****************************************************
 * onAuthStateChanged: Manejar lógica de usuario
 ****************************************************/
let currentUser = null;
let currentRole = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    // Carga doc en /users/uid
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      currentRole = snap.data().role;
    } else {
      // Crear doc si no existe
      let roleToAssign = DEFAULT_ROLE;
      if (user.email.toLowerCase() === "jonattangm@hotmail.com") {
        roleToAssign = "admin";
      }
      await setDoc(userDocRef, { role: roleToAssign, email: user.email.toLowerCase() });
      currentRole = roleToAssign;
    }

    userEmailSpan.textContent = user.email;
    userRoleSpan.textContent = currentRole;

    // Muestra Dashboard
    authSection.style.display = "none";
    dashboardSection.style.display = "block";

    // Muestra sideBar
    sidebar.style.display = "block";

    // Muestra form crear tarea si es super/admin
    if (["supervisor","admin"].includes(currentRole)) {
      taskCreationDiv.style.display = "block";
    } else {
      taskCreationDiv.style.display = "none";
    }

    // Si es admin, puede ver botón “Administrar Usuarios”
    if (currentRole === "admin") {
      btnUsuarios.style.display = "inline-block";
      // Carga usuarios
      loadAllUsers();
    } else {
      btnUsuarios.style.display = "none";
    }

    // Escucha las tareas en tiempo real
    listenTasks();

  } else {
    // Usuario NO logueado
    currentUser = null;
    currentRole = null;
    authSection.style.display = "block";
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "none";
    // Oculta la sidebar
    sidebar.style.display = "none";
  }
});

/****************************************************
 * Registro e inicio de sesión
 ****************************************************/
async function registerUser() {
  authMessage.textContent = "";
  const email = emailInput.value.trim();
  const password = passInput.value.trim();

  if (!email || !password) {
    authMessage.textContent = "Por favor, llena todos los campos.";
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    authMessage.textContent = `Error al crear usuario: ${err.message}`;
  }
}

async function loginUser() {
  authMessage.textContent = "";
  const email = emailInput.value.trim();
  const password = passInput.value.trim();

  if (!email || !password) {
    authMessage.textContent = "Por favor, llena todos los campos.";
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    authMessage.textContent = `Error al iniciar sesión: ${err.message}`;
  }
}

/****************************************************
 * Crear tarea
 ****************************************************/
async function createTask() {
  if (!newTaskName.value.trim() || !newTaskAssigned.value.trim()) {
    alert("Completa los campos de nombre de tarea y Asignar a (email).");
    return;
  }
  try {
    // Generar ID correlativo
    const allTasks = await getDocs(collection(db, "tasks"));
    const correlativo = allTasks.size + 1;

    await addDoc(collection(db, "tasks"), {
      idTarea: correlativo,
      fechaAsignacion: new Date().toLocaleDateString("es-CL"),
      name: newTaskName.value.trim(),
      assignedTo: newTaskAssigned.value.trim().toLowerCase(),
      empresa: newEmpresa.value.trim(),
      grupoCliente: newGrupo.value.trim(),
      folioProyecto: newFolio.value.trim(),
      status: "Asignado",
      createdAt: new Date(),
      createdBy: currentUser.uid
    });
    // Limpia
    newTaskName.value = "";
    newTaskAssigned.value = "";
    newEmpresa.value = "";
    newGrupo.value = "";
    newFolio.value = "";
  } catch (err) {
    console.error("Error al crear tarea:", err);
  }
}

/****************************************************
 * Escuchar TAREAS y renderizar
 ****************************************************/
function listenTasks() {
  const tasksRef = collection(db, "tasks");
  onSnapshot(tasksRef, (snapshot) => {
    const tasks = [];
    snapshot.forEach((docu) => {
      tasks.push({ ...docu.data(), docId: docu.id });
    });
    renderTasks(tasks);
  });
}

function renderTasks(tasks) {
  tasksTableBody.innerHTML = "";

  // Filtrar según rol
  let filtered = tasks;
  if (currentRole === "consultor") {
    filtered = tasks.filter(t => t.assignedTo === currentUser.email.toLowerCase());
  }

  filtered.forEach(task => {
    const tr = document.createElement("tr");

    // ID Tarea
    const tdId = document.createElement("td");
    tdId.textContent = task.idTarea || "N/A";
    tr.appendChild(tdId);

    // Fecha asignación
    const tdFecha = document.createElement("td");
    tdFecha.textContent = task.fechaAsignacion || "--";
    tr.appendChild(tdFecha);

    // Nombre
    const tdName = document.createElement("td");
    tdName.textContent = task.name || "(sin nombre)";
    tr.appendChild(tdName);

    // Asignado a
    const tdAssigned = document.createElement("td");
    tdAssigned.textContent = task.assignedTo || "--";
    tr.appendChild(tdAssigned);

    // Estado con dropdown
    const tdStatus = document.createElement("td");
    const selectStatus = document.createElement("select");
    let possibleStates = TASK_STATES.slice();

    // Ajustar permisos consultor
    if (currentRole === "consultor") {
      // Si ya está en Por revisar, no puede cambiar
      if (task.status === "Por revisar") {
        possibleStates = ["Por revisar"];
      } else {
        // Solo Asignado / En proceso / Por revisar
        possibleStates = ["Asignado","En proceso","Por revisar"];
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
      if (!canChangeStatus(currentRole, task.status, newSt)) {
        alert("No tienes permiso para ese cambio de estado.");
        selectStatus.value = task.status;
      } else {
        updateTaskStatus(task.docId, newSt);
      }
    });
    tdStatus.appendChild(selectStatus);
    tr.appendChild(tdStatus);

    // Indicador de color
    const tdIndicator = document.createElement("td");
    const indicator = document.createElement("span");
    indicator.classList.add("status-indicator");
    // status -> clase
    const lowered = task.status?.toLowerCase().replace(" ", "-");
    indicator.classList.add(`status-${lowered}`);
    tdIndicator.appendChild(indicator);
    tr.appendChild(tdIndicator);

    // Acciones
    const tdActions = document.createElement("td");
    if (["supervisor","admin"].includes(currentRole)) {
      const btnDel = document.createElement("button");
      btnDel.textContent = "Eliminar";
      btnDel.addEventListener("click", async () => {
        if (confirm("¿Eliminar esta tarea?")) {
          await deleteDoc(doc(db, "tasks", task.docId));
        }
      });
      tdActions.appendChild(btnDel);
    }
    tr.appendChild(tdActions);

    tasksTableBody.appendChild(tr);
  });
}

/****************************************************
 * Lógica de cambio de estado
 ****************************************************/
function canChangeStatus(role, currentSt, newSt) {
  // Consultor: 
  //   - Asignado <-> En proceso
  //   - Asignado/En proceso -> Por revisar
  //   - Sin acceso a "Reportar" ni "Finalizado"
  //   - No puede cambiar si ya está en "Por revisar"
  if (role === "consultor") {
    if (currentSt === "Por revisar") return false;
    if ((currentSt === "Asignado" && newSt === "En proceso") ||
        (currentSt === "En proceso" && newSt === "Asignado")) {
      return true;
    }
    if ((currentSt === "Asignado" || currentSt === "En proceso") && newSt === "Por revisar") {
      return true;
    }
    return false;
  }

  // Senior: Reglas originales (puede Reportar, revertir Por revisar)
  if (role === "senior") {
    if (currentSt === "Asignado" || currentSt === "En proceso") {
      if (newSt === "Por revisar" || newSt === "Reportar") return true;
    }
    if (currentSt === "Por revisar") {
      return ["Asignado","En proceso","Reportar"].includes(newSt);
    }
    return false;
  }

  // Supervisor => cualquier estado
  if (role === "supervisor") {
    return true;
  }
  // Admin => todo
  if (role === "admin") {
    return true;
  }
  return false;
}

async function updateTaskStatus(docId, newStatus) {
  try {
    await updateDoc(doc(db, "tasks", docId), { status: newStatus });
  } catch (err) {
    console.error("Error al actualizar estado:", err);
  }
}

/****************************************************
 * ADMIN: Cargar y modificar roles
 ****************************************************/
async function loadAllUsers() {
  usersTableBody.innerHTML = "";
  const qSnap = await getDocs(collection(db, "users"));
  qSnap.forEach((docu) => {
    const userData = docu.data();
    const tr = document.createElement("tr");

    const tdEmail = document.createElement("td");
    tdEmail.textContent = userData.email ? userData.email : docu.id;

    const tdRole = document.createElement("td");
    tdRole.textContent = userData.role;

    const tdChange = document.createElement("td");
    const selectRole = document.createElement("select");
    ALL_ROLES.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      if (r === userData.role) opt.selected = true;
      selectRole.appendChild(opt);
    });
    selectRole.addEventListener("change", async () => {
      const newR = selectRole.value;
      try {
        await updateDoc(doc(db, "users", docu.id), { role: newR });
        tdRole.textContent = newR;
        alert(`Rol actualizado a ${newR}`);
      } catch (error) {
        console.error("Error al cambiar rol:", error);
      }
    });
    tdChange.appendChild(selectRole);

    tr.appendChild(tdEmail);
    tr.appendChild(tdRole);
    tr.appendChild(tdChange);

    usersTableBody.appendChild(tr);
  });
}
