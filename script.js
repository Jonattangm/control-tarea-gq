// script.js

// IMPORTAR Firebase desde CDN (versión 9.x)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// TU CONFIGURACIÓN DE FIREBASE
// Reemplaza con los datos que te proporciona Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCFo...",
  authDomain: "control-tarea-gq.firebaseapp.com",
  projectId: "control-tarea-gq",
  storageBucket: "control-tarea-gq.firebasestorage.app",
  messagingSenderId: "449145637626",
  appId: "1:449145637626:web:23b51b68fcadd6eaa11743",
  measurementId: "G-HYT372GLN6"
};

// INICIALIZAR Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// OPCIONAL: Escuchar cambios en la sesión del usuario
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('Usuario logueado:', user.email);
  } else {
    console.log('No hay usuario logueado');
  }
});

// ESPERAR que cargue el DOM y vincular eventos
document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("authForm");
  const btnRegister = document.getElementById("btnRegister");
  const btnLogin = document.getElementById("btnLogin");
  const authMessage = document.getElementById("authMessage");

  // Prevenir que el formulario recargue la página al dar click en Registrar
  authForm.addEventListener("submit", (e) => e.preventDefault());

  // Botón: REGISTRARSE
  btnRegister.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      authMessage.textContent = "Por favor, llena todos los campos.";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      authMessage.textContent = `Usuario creado: ${user.email}`;
    } catch (error) {
      authMessage.textContent = `Error al crear usuario: ${error.message}`;
    }
  });

  // Botón: INICIAR SESIÓN
  btnLogin.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      authMessage.textContent = "Por favor, llena todos los campos.";
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      authMessage.textContent = `Bienvenido: ${userCredential.user.email}`;
    } catch (error) {
      authMessage.textContent = `Error al iniciar sesión: ${error.message}`;
    }
  });
});
