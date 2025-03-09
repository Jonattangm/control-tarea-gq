/****************************************************
 * IMPORTAR Firebase (versión 9.x) desde la CDN
 ****************************************************/
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
 * CONFIGURACIÓN DE TU PROYECTO FIREBASE
 ****************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyCFoalSasV17k812nXbCSjO9xCsnAJJRnE",
  authDomain: "control-tarea-gq.firebaseapp.com",
  projectId: "control-tarea-gq",
  storageBucket: "control-tarea-gq.appspot.com",
  messagingSenderId: "449145637626",
  appId: "1:449145637626:web:23b51b68fcadd6eaa11743",
  measurementId: "G-HYT372GLN6"
};

// Inicializa la app
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/****************************************************
 * ROLES y ESTADOS
 ****************************************************/
const DEFAULT_ROLE = "consultor";
const ALL_ROLES = ["consultor","senior","supervisor","admin"];
const TASK_STATES = ["Asignado","En proceso","Por revisar","Reportar","Finalizado"];

/****************************************************
 * Elementos HTML
 ****************************************************/
const btnTareas = document.getElementById("btnTareas");
const btnUsuarios = document.getElementById("btnUsuarios");

const authSection = document.querySelector(".auth-section");
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
 * MOSTRAR/OCULTAR SECCIONES
 ****************************************************/
btnTareas.addEventListener("click", () => {
  dashboardSection.style.display = "block";
  adminUsersSection.style.display = "none";
});
btnUsuarios.addEventListener("click", () => {
  dashboardSection.style.display = "none";
  adminUsersSection.style.display = "block";
});

/****************************************************
 * LÓGICA DE REGISTRO E INICIO DE SESIÓN
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Evita que el form recargue
  authForm.addEventListener("submit", (e) => e.preventDefault());

  // Botón: Registrarse
  btnRegister.addEventListener("click", registerUser);
  // Botón: Iniciar Sesión
  btnLogin.addEventListener("click", loginUser);
  // Botón: Logout
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
  });

  // Botón: Crear Tarea
  createTaskBtn.addEventListener("click", async () => {
    if (!newTaskName.value.trim() || !newTaskAssigned.value.trim()) {
      alert("Ingresa el nombre de la tarea y el email de la persona asignada.");
      return;
    }

    try {
      // Generamos un ID correlativo = total tareas + 1
      const allTasks = await getDocs(collection(db, "tasks"));
      const idTareaCorrelativo = allTasks.size + 1;

      await addDoc(collection(db, "tasks"), {
        idTarea: idTareaCorrelativo,
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

      // Limpia los campos
      newTaskName.value = "";
      newTaskAssigned.value = "";
      newEmpresa.value = "";
      newGrupo.value = "";
      newFolio.value = "";
    } catch (error) {
      console.error("Error al crear tarea", error);
    }
  });
});

/****************************************************
 * onAuthStateChanged para mostrar u ocultar dashboard
 ****************************************************/
let currentUser = null;
let currentRole = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userEmailSpan.textContent = user.email;

    // Carga su rol desde Firestore
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      currentRole = snap.data().role;
    } else {
      // Si no existe doc, lo creamos con rol consultor
      // y si su email es X => admin
      let roleToAssign = DEFAULT_ROLE;
      if (user.email.toLowerCase() === "jonattangm@hotmail.com") {
        roleToAssign = "admin";
      }
      await setDoc(userDocRef, { role: roleToAssign, email: user.email.toLowerCase() });
      currentRole = roleToAssign;
    }
    userRoleSpan.textContent = currentRole;

    // Muestra dashboard, oculta login
    authSection.style.display = "none";
    dashboardSection.style.display = "block";

    // Si es Admin, mostramos AdminUsersSection sólo si hace clic en el botón
    if (currentRole === "admin") {
      btnUsuarios.style.display = "inline-block";
    } else {
      btnUsuarios.style.display = "none";
    }

    // Muestra sección de crear tarea solo si role es supervisor o admin
    if (["supervisor","admin"].includes(currentRole)) {
      taskCreationDiv.style.display = "block";
    } else {
      taskCreationDiv.style.display = "none";
    }

    // Carga la lista de usuarios solo si admin
    if (currentRole === "admin") {
      loadAllUsers();
    }

    // Escucha las tareas en tiempo real
    listenTasks();
  } else {
    // No hay usuario => mostrar form
    currentUser = null;
    currentRole = null;
    authSection.style.display = "block";
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "none";
  }
});

/****************************************************
 * Funciones de Registro/Login
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
    // el onAuthStateChanged se encarga del resto
  } catch (error) {
    authMessage.textContent = `Error al crear usuario: ${error.message}`;
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
  } catch (error) {
    authMessage.textContent = `Error al iniciar sesión: ${error.message}`;
  }
}

/****************************************************
 * Escuchar TAREAS en tiempo real y renderizar
 ****************************************************/
function listenTasks() {
  const tasksRef = collection(db, "tasks");
  onSnapshot(tasksRef, (snapshot) => {
    const tasks = [];
    snapshot.forEach((doc) => {
      tasks.push({ ...doc.data(), docId: doc.id });
    });
    renderTasks(tasks);
  });
}

/****************************************************
 * RENDER DE TAREAS 
 ****************************************************/
function renderTasks(tasks) {
  tasksTableBody.innerHTML = "";

  // Filtra según rol
  let filtered = tasks;
  if (currentRole === "consultor") {
    // Solo ve las suyas
    filtered = tasks.filter(t => t.assignedTo === currentUser.email.toLowerCase());
  }

  filtered.forEach(task => {
    const tr = document.createElement("tr");

    // ID Tarea
    const tdID = document.createElement("td");
    tdID.textContent = task.idTarea || "N/A";
    tr.appendChild(tdID);

    // Fecha de asignación
    const tdFecha = document.createElement("td");
    tdFecha.textContent = task.fechaAsignacion || "N/A";
    tr.appendChild(tdFecha);

    // Nombre
    const tdName = document.createElement("td");
    tdName.textContent = task.name || "(Sin nombre)";
    tr.appendChild(tdName);

    // Asignado a
    const tdAssigned = document.createElement("td");
    tdAssigned.textContent = task.assignedTo;
    tr.appendChild(tdAssigned);

    // Estado (dropdown)
    const tdStatus = document.createElement("td");
    const selectStatus = document.createElement("select");
    // Ajustamos opciones según rol consultor
    let possibleStates = TASK_STATES.slice(); // copia
    if (currentRole === "consultor") {
      // El consultor solo puede usar: Asignado, En proceso, Por revisar
      // Y además, si está en "Por revisar", no puede cambiarlo
      // No puede usar "Reportar" ni "Finalizado"
      if (task.status === "Por revisar") {
        // no puede cambiar nada
        possibleStates = ["Por revisar"];
      } else {
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
        alert("No tienes permiso para este cambio de estado.");
        selectStatus.value = task.status; // revert
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
    // Convierte el status a clase
    const lowerStatus = task.status.toLowerCase().replace(" ", "-");
    indicator.classList.add(`status-${lowerStatus}`);
    tdIndicator.appendChild(indicator);
    tr.appendChild(tdIndicator);

    // Acciones
    const tdActions = document.createElement("td");
    if (["supervisor","admin"].includes(currentRole)) {
      const btnDel = document.createElement("button");
      btnDel.textContent = "Eliminar";
      btnDel.addEventListener("click", async () => {
        if (confirm("¿Deseas eliminar esta tarea?")) {
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
 * LÓGICA DE CAMBIO DE ESTADO SEGÚN ROL
 ****************************************************/
function canChangeStatus(role, currentSt, newSt) {
  // CONSULTOR:
  // - Puede mover Asignado ↔ En proceso
  // - Puede mover Asignado/En proceso -> Por revisar
  // - No puede usar "Reportar" ni "Finalizado"
  // - No puede cambiar si ya está en "Por revisar"
  if (role === "consultor") {
    // Si la tarea ya está en "Por revisar", no se cambia
    if (currentSt === "Por revisar") return false;

    // Mover Asignado <-> En proceso
    if ((currentSt === "Asignado" && newSt === "En proceso") ||
        (currentSt === "En proceso" && newSt === "Asignado")) {
      return true;
    }
    // Asignado/En proceso -> Por revisar
    if ((currentSt === "Asignado" || currentSt === "En proceso") && newSt === "Por revisar") {
      return true;
    }
    return false;
  }

  // SENIOR: Reglas previas + puede poner "Reportar" 
  //  y revertir "Por revisar" a "Asignado"/"En proceso"
  if (role === "senior") {
    if (currentSt === "Asignado" || currentSt === "En proceso") {
      // puede ir a "Por revisar" o "Reportar"
      if (newSt === "Por revisar" || newSt === "Reportar") return true;
    }
    if (currentSt === "Por revisar") {
      // revertir a Asignado/En proceso o poner "Reportar"
      return ["Asignado","En proceso","Reportar"].includes(newSt);
    }
    // si está en "Reportar" o "Finalizado", no revertir
    return false;
  }

  // SUPERVISOR: puede mover a cualquier estado
  if (role === "supervisor") {
    return true;
  }

  // ADMIN: puede todo
  if (role === "admin") {
    return true;
  }

  return false;
}

async function updateTaskStatus(docId, newStatus) {
  try {
    await updateDoc(doc(db, "tasks", docId), { status: newStatus });
  } catch (error) {
    console.error("Error al cambiar estado:", error);
  }
}

/****************************************************
 * ADMIN: Cambiar roles
 ****************************************************/
async function loadAllUsers() {
  usersTableBody.innerHTML = "";
  const qSnap = await getDocs(collection(db, "users"));
  qSnap.forEach((docu) => {
    const userData = docu.data();
    const tr = document.createElement("tr");

    // Muestra el email guardado o el UID
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
        console.error("Error actualizando rol:", error);
      }
    });
    tdChange.appendChild(selectRole);

    tr.appendChild(tdEmail);
    tr.appendChild(tdRole);
    tr.appendChild(tdChange);

    usersTableBody.appendChild(tr);
  });
}
