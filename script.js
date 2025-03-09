/****************************************************
 * IMPORTAR Firebase desde CDN (versión 9.x)
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
 * (reemplaza con TUS datos correctos)
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
 * Referencias a elementos del DOM
 ****************************************************/
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
const createTaskBtn = document.getElementById("createTaskBtn");
const tasksTableBody = document.getElementById("tasksBody");

const adminUsersSection = document.getElementById("adminUsersSection");
const usersTableBody = document.getElementById("usersBody");

/****************************************************
 * Constantes de Roles y Estados
 ****************************************************/
const DEFAULT_ROLE = "consultor";
const ALL_ROLES = ["consultor","senior","supervisor","admin"];
const TASK_STATES = ["Asignado","En proceso","Por revisar","Reportar","Finalizado"];

/****************************************************
 * EVENTOS DE INICIO
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Evita recarga en submit
  authForm.addEventListener("submit", (e) => e.preventDefault());

  btnRegister.addEventListener("click", registerUser);
  btnLogin.addEventListener("click", loginUser);
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
  });

  createTaskBtn.addEventListener("click", createTask);
});

/****************************************************
 * onAuthStateChanged: Detecta si hay user logueado
 ****************************************************/
let currentUser = null;
let currentRole = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario logueado:", user.email);

    // Guardar user
    currentUser = user;

    // 1) Obtener su doc en /users/uid
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      // Doc existe, extraer su rol
      currentRole = snap.data().role;
      console.log("Rol encontrado en Firestore:", currentRole);
    } else {
      // No existe doc => crearlo con rol por defecto
      console.log("No existía doc de usuario, creando...");
      let assignedRole = DEFAULT_ROLE;

      // Si es el correo de Jonattan => admin
      if (user.email.toLowerCase() === "jonattangm@hotmail.com") {
        assignedRole = "admin";
      }
      await setDoc(userDocRef, { 
        role: assignedRole,
        email: user.email.toLowerCase()
      });
      currentRole = assignedRole;
      console.log("Doc creado con rol:", assignedRole);
    }

    // 2) Actualizamos en la interfaz
    userEmailSpan.textContent = user.email;
    userRoleSpan.textContent = currentRole;
    showDashboard(true);

    // 3) Mostrar sección de crear tarea solo si role es supervisor o admin
    if (["supervisor","admin"].includes(currentRole)) {
      taskCreationDiv.style.display = "block";
    } else {
      taskCreationDiv.style.display = "none";
    }

    // 4) Si es admin, carga lista de usuarios
    if (currentRole === "admin") {
      adminUsersSection.style.display = "block";
      loadAllUsers();
    } else {
      adminUsersSection.style.display = "none";
    }

    // 5) Escuchar tareas en tiempo real
    listenTasks();

  } else {
    console.log("No hay usuario logueado");
    currentUser = null;
    currentRole = null;
    showDashboard(false);
  }
});

/****************************************************
 * Funciones de Registro / Login
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
    // onAuthStateChanged hará el resto
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
    // onAuthStateChanged hará el resto
  } catch (error) {
    authMessage.textContent = `Error al iniciar sesión: ${error.message}`;
  }
}

/****************************************************
 * Mostrar / Ocultar Dashboard
 ****************************************************/
function showDashboard(show) {
  if (show) {
    authSection.style.display = "none";
    dashboardSection.style.display = "block";
  } else {
    authSection.style.display = "block";
    dashboardSection.style.display = "none";
    adminUsersSection.style.display = "none";
  }
}

/****************************************************
 * Crear Tarea (Supervisor / Admin)
 ****************************************************/
async function createTask() {
  if (!newTaskName.value.trim() || !newTaskAssigned.value.trim()) {
    alert("Ingresa el nombre de la tarea y el email de la persona asignada.");
    return;
  }
  try {
    const docRef = await addDoc(collection(db, "tasks"), {
      name: newTaskName.value.trim(),
      assignedTo: newTaskAssigned.value.trim().toLowerCase(),
      status: "Asignado",
      createdAt: new Date(),
      createdBy: currentUser.uid
    });
    console.log("Tarea creada:", docRef.id);
    newTaskName.value = "";
    newTaskAssigned.value = "";
  } catch (error) {
    console.error("Error al crear tarea", error);
  }
}

/****************************************************
 * Escuchar Tareas en tiempo real y renderizarlas
 ****************************************************/
function listenTasks() {
  const tasksRef = collection(db, "tasks");
  onSnapshot(tasksRef, (snapshot) => {
    const tasks = [];
    snapshot.forEach((docu) => {
      tasks.push({ ...docu.data(), id: docu.id });
    });
    console.log("Tareas en firestore:", tasks);
    renderTasks(tasks);
  });
}

/****************************************************
 * Render de Tareas con restricciones de rol
 ****************************************************/
function renderTasks(tasks) {
  tasksTableBody.innerHTML = "";

  // Filtrar si es consultor => solo sus tareas
  let filtered = tasks;
  if (currentRole === "consultor") {
    filtered = tasks.filter(t => t.assignedTo === currentUser.email.toLowerCase());
  }
  // Senior, Supervisor, Admin => ven todas (puedes ajustar si quieres)

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

    // Estado
    const tdStatus = document.createElement("td");
    const selectStatus = document.createElement("select");
    TASK_STATES.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      if (st === task.status) opt.selected = true;
      selectStatus.appendChild(opt);
    });
    selectStatus.addEventListener("change", async () => {
      const newSt = selectStatus.value;
      if (!canChangeStatus(currentRole, task.status, newSt)) {
        alert("No tienes permiso para ese cambio de estado.");
        selectStatus.value = task.status;
      } else {
        await updateDoc(doc(db, "tasks", task.id), { status: newSt });
      }
    });
    tdStatus.appendChild(selectStatus);
    tr.appendChild(tdStatus);

    // Acciones
    const tdActions = document.createElement("td");
    // Supervisor / Admin pueden eliminar
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
 * REGLAS DE CAMBIO DE ESTADO
 ****************************************************/
function canChangeStatus(role, currentSt, newSt) {
  // Consultor: solo pasa de "Asignado"/"En proceso" -> "Por revisar"
  if (role === "consultor") {
    if ((currentSt === "Asignado" || currentSt === "En proceso") && newSt === "Por revisar") {
      return true;
    }
    return false;
  }

  // Senior: lo mismo que consultor, pero puede revertir "Por revisar" => "Asignado"/"En proceso", y puede poner "Reportar" 
  if (role === "senior") {
    if (currentSt === "Asignado" || currentSt === "En proceso") {
      if (newSt === "Por revisar" || newSt === "Reportar") return true;
    }
    if (currentSt === "Por revisar") {
      return ["Asignado","En proceso","Reportar"].includes(newSt);
    }
    return false;
  }

  // Supervisor => todo
  if (role === "supervisor") {
    return true;
  }

  // Admin => todo
  if (role === "admin") {
    return true;
  }

  return false;
}

/****************************************************
 * ADMIN: CARGAR Y CAMBIAR ROLES DE USUARIOS
 ****************************************************/
async function loadAllUsers() {
  usersTableBody.innerHTML = "";
  const qSnap = await getDocs(collection(db, "users"));
  qSnap.forEach((docu) => {
    const userData = docu.data();
    const tr = document.createElement("tr");

    // Muestra 'email' si lo guardamos en userData
    const tdEmail = document.createElement("td");
    tdEmail.textContent = userData.email ? userData.email : docu.id;
    tr.appendChild(tdEmail);

    const tdRole = document.createElement("td");
    tdRole.textContent = userData.role;
    tr.appendChild(tdRole);

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
    tr.appendChild(tdChange);

    usersTableBody.appendChild(tr);
  });
}
