// Mensaje en la consola
console.log("Hola desde script.js");

// Ejemplo de manipulación DOM
document.addEventListener("DOMContentLoaded", () => {
  const heading = document.querySelector("h1");
  if (heading) {
    heading.addEventListener("click", () => {
      alert("¡Haz hecho clic en el título!");
    });
  }
});
