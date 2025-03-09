// script.js

/****************************************************
 * IMPORTAR Firebase (versión 9.x) desde la CDN
 ****************************************************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updatePassword,
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
 * (reemplaza con TUS datos)
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
// Servicios
const auth = getAuth(app);
const db = getFirestore(app);

/****************************************************
 * ROLES y ESTADOS
 ****************************************************/
const DEFAULT_ROLE = "consultor";
const ALL_ROLES = ["consultor","senior","supervisor","admin"];
const TASK_STATES = ["Asignado","En proceso","Por revisar","Reportar","Finalizado"];

/****************************************************
 * HTML elements
 ****************************************************/
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
const createTaskBtn = document.getElementById("createTaskBtn");

const tasksTableBody = document.getElementById("tasksBody");

const adminUsersSection = document.getElementById("adminUsersSection");
const usersTableBody = document.getElementById("usersBody");

/****************************************************
 * LÓGICA DE REGISTRO E INICIO DE SESIÓN
 ****************************************************/
// Al cargar el DOM, escuchamos el form
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
      // Crear tarea en Firestore
      const docRef = await addDoc(collection(db, "tasks"), {
        name: newTaskName.value.trim(),
        assignedTo: newTaskAssigned.value.trim().toLowerCase(),
        status: "Asignado",
        createdAt: new Date(),
        createdBy: currentUser.uid
      });
      newTaskName.value = "";
      newTaskAssigned.value = "";
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
    const userDoc = doc(db, "users", user.uid);
    const snap = await getDoc(userDoc);
    if (snap.exists()) {
      currentRole = snap.data().role;
    } else {
      // Si no existe doc, lo creamos con rol consultor
      // y si su email es jonattangm@hotmail.com => admin
      let roleToAssign = DEFAULT_ROLE;
      if (user.email === "jonattangm@hotmail.com") {
        roleToAssign = "admin";
      }
      await setDoc(userDoc, { role: roleToAssign });
      currentRole = roleToAssign;
    }
    userRoleSpan.textContent = currentRole;

    // Muestra dashboard, oculta form
    authSection.style.display = "none";
    dashboardSection.style.display = "block";

    // Muestra sección de crear tarea solo si role es supervisor o admin
    if (["supervisor","admin"].includes(currentRole)) {
      taskCreationDiv.style.display = "block";
    } else {
      taskCreationDiv.style.display = "none";
    }

    // Muestra la sección de admin users si es admin
    if (currentRole === "admin") {
      adminUsersSection.style.display = "block";
      loadAllUsers(); // Carga la tabla de usuarios
    } else {
      adminUsersSection.style.display = "none";
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
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    // El onAuthStateChanged se encargará de asignar rol
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
    // onAuthStateChanged gestionará el resto
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
      tasks.push({ ...doc.data(), id: doc.id });
    });
    renderTasks(tasks);
  });
}

/****************************************************
 * RENDER DE TAREAS (filtradas según rol)
 ****************************************************/
function renderTasks(tasks) {
  tasksTableBody.innerHTML = "";

  // Filtrar tareas si es consultor: solo las asignadas a él
  let filtered = tasks;
  if (currentRole === "consultor") {
    filtered = tasks.filter(t => t.assignedTo === currentUser.email.toLowerCase());
  } else if (currentRole === "senior") {
    // Si deseas filtrar también, ajusta la lógica;
    // aquí dejamos que el senior vea todas
    filtered = tasks;
  } else if (currentRole === "supervisor") {
    // Ve todas
    filtered = tasks;
  } else if (currentRole === "admin") {
    // Ve todas
    filtered = tasks;
  }

  filtered.forEach(task => {
    const tr = document.createElement("tr");

    // Nombre
    const tdName = document.createElement("td");
    tdName.textContent = task.name;
    tr.appendChild(tdName);

    // Asignado a
    const tdAssigned = document.createElement("td");
    tdAssigned.textContent = task.assignedTo;
    tr.appendChild(tdAssigned);

    // Estado (dropdown para cambiar estado)
    const tdStatus = document.createElement("td");
    const selectStatus = document.createElement("select");
    TASK_STATES.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      if (st === task.status) opt.selected = true;
      selectStatus.appendChild(opt);
    });
    // Maneja cambio de estado con restricciones
    selectStatus.addEventListener("change", () => {
      const newSt = selectStatus.value;
      if (!canChangeStatus(currentRole, task.status, newSt)) {
        alert("No tienes permiso para este cambio de estado.");
        selectStatus.value = task.status; // revert
      } else {
        updateTaskStatus(task.id, newSt);
      }
    });
    tdStatus.appendChild(selectStatus);
    tr.appendChild(tdStatus);

    // Acciones
    const tdActions = document.createElement("td");

    // El Supervisor y Admin pueden eliminar
    if (["supervisor","admin"].includes(currentRole)) {
      const btnDel = document.createElement("button");
      btnDel.textContent = "Eliminar";
      btnDel.addEventListener("click", async () => {
        if (confirm("¿Deseas eliminar esta tarea?")) {
          await deleteDoc(doc(db, "tasks", task.id));
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
  // Reglas según la descripción:
  // 1. Consultor: puede pasar de "Asignado"/"En proceso" a "Por revisar"
  //    No puede volver atrás ni poner "Reportar" o "Finalizado".
  if (role === "consultor") {
    if (currentSt === "Asignado" || currentSt === "En proceso") {
      return (newSt === "Por revisar");
    }
    return false;
  }

  // 2. Senior: mismos permisos que consultor, pero puede revertir "Por revisar" a "Asignado" o "En proceso",
  //    y puede poner "Reportar" ? => la descripción dice si pone "Reportar" no puede revertirlo
  if (role === "senior") {
    if (currentSt === "Asignado" || currentSt === "En proceso") {
      // Puede hacer lo de consultor => "Por revisar"
      if (newSt === "Por revisar" || newSt === "Reportar") {
        return true;
      }
    }
    if (currentSt === "Por revisar") {
      // Puede revertir a "Asignado" o "En proceso", o poner "Reportar"
      return (["Asignado","En proceso","Reportar"].includes(newSt));
    }
    // Si ya está en "Reportar" o "Finalizado", no puede revertir
    return false;
  }

  // 3. Supervisor: puede poner cualquier estado
  if (role === "supervisor") {
    return true;
  }

  // 4. Admin: puede todo
  if (role === "admin") {
    return true;
  }

  return false;
}

async function updateTaskStatus(taskId, newStatus) {
  try {
    await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
  } catch (error) {
    console.error("Error al cambiar estado:", error);
  }
}

/****************************************************
 * ADMIN: Cambiar roles (solo si currentRole === 'admin')
 ****************************************************/
async function loadAllUsers() {
  usersTableBody.innerHTML = "";
  const qSnap = await getDocs(collection(db, "users"));
  qSnap.forEach((docu) => {
    const userData = docu.data();
    const tr = document.createElement("tr");

    // Email
    const tdEmail = document.createElement("td");
    tdEmail.textContent = docu.id; // uid? o si guardaste doc con user.email
    // Si guardaste doc con docId = user.uid, tendrías que guardar email aparte. 
    // Para simplicidad, supongo docu.id = user.uid no es su email. 
    // Vamos a suponer que en userData hay un 'email' guardado si queremos.
    // O reestructurar. Este ejemplo asume docu.id = UID y no hay email guardado. 
    // Ajustamos la demo: simplemente no mostrará el email real.
    // Si quieres mostrar email real, en setDoc(...) pon {role, email} al crear usuario.
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
