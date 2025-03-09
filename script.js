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

const firebaseConfig = {
  apiKey: "AIzaSyCFoalSasV17k812nXbCSjO9xCsnAJJRnE",
  authDomain: "control-tarea-gq.firebaseapp.com",
  projectId: "control-tarea-gq",
  storageBucket: "control-tarea-gq.appspot.com",
  messagingSenderId: "449145637626",
  appId: "1:449145637626:web:23b51b68fcadd6eaa11743",
  measurementId: "G-HYT372GLN6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const dashboardSection = document.getElementById("dashboardSection");
const userRoleSpan = document.getElementById("userRole");
const tasksTableBody = document.getElementById("tasksBody");
const actionsHeader = document.getElementById("actionsHeader");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);
    
    if (snap.exists()) {
      const userData = snap.data();
      userRoleSpan.textContent = userData.role;
      showDashboard(true);
      listenTasks(userData.role);
    }
  } else {
    showDashboard(false);
  }
});

function listenTasks(role) {
  const tasksRef = collection(db, "tasks");
  onSnapshot(tasksRef, (snapshot) => {
    tasksTableBody.innerHTML = "";
    snapshot.forEach((docu) => {
      const task = docu.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${task.name}</td>
        <td>${task.assignedTo}</td>
        <td>
          <select class="task-status">
            ${["Asignado", "En proceso", "Por revisar", "Reportar", "Finalizado"]
              .filter(st => role !== "consultor" || ["Asignado", "En proceso"].includes(st))
              .map(st => `<option value="${st}" ${st === task.status ? "selected" : ""}>${st}</option>`).join("")}
          </select>
        </td>
      `;

      if (role !== "consultor") {
        const btnDelete = document.createElement("button");
        btnDelete.textContent = "Eliminar";
        btnDelete.onclick = () => deleteDoc(doc(db, "tasks", docu.id));
        tr.appendChild(btnDelete);
      }
      tasksTableBody.appendChild(tr);
    });
  });
}

function showDashboard(show) {
  dashboardSection.style.display = show ? "block" : "none";
}
