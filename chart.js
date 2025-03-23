import { allTasks, currentRole, currentUser, TASK_STATES } from "./script.js";

// Esperamos que la sección #reportSection se muestre en "Informe".
// Creamos 3 gráficos: 
// 1) chartEstados => "Tareas por estado de finalización" (sin finalizadas)
// 2) chartResponsables => "Próximas tareas por responsable" (sin finalizadas)
// 3) chartGrupos => "Tareas sin finalizar por Grupo" (top 5)

// Reference to canvas
let chartEstadosCtx = null;
let chartResponsablesCtx = null;
let chartGruposCtx = null;
let chartEstadosObj = null;
let chartResponsablesObj = null;
let chartGruposObj = null;

// Observamos si el DOM ya está, definimos un observer para la vista del “Informe”
document.addEventListener("DOMContentLoaded", () => {
  chartEstadosCtx = document.getElementById("chartEstados")?.getContext("2d");
  chartResponsablesCtx = document.getElementById("chartResponsables")?.getContext("2d");
  chartGruposCtx = document.getElementById("chartGrupos")?.getContext("2d");
  
  // Escuchamos un custom event o un setInterval para regenerar
  // O regeneramos en un setTimeout
  setInterval(()=>updateAllCharts(), 2000);
});

// Actualiza 3 chart
function updateAllCharts(){
  if(!chartEstadosCtx || !chartResponsablesCtx || !chartGruposCtx) return;
  // Data: filtrar sin finalizadas
  const notFinal = allTasks.filter(t => t.status!=="Finalizado");
  
  // 1) Tareas por estado
  // Contamos cada estado
  let stateCounts = {};
  notFinal.forEach(t=>{
    const st = t.status||"Asignado";
    stateCounts[st] = (stateCounts[st]||0)+1;
  });
  const labelsEstado = Object.keys(stateCounts);
  const dataEstado = Object.values(stateCounts);
  
  if(!chartEstadosObj){
    chartEstadosObj = new Chart(chartEstadosCtx, {
      type: "pie",
      data: {
        labels: labelsEstado,
        datasets: [{
          label: "Tareas por estado (sin finalizadas)",
          data: dataEstado,
          backgroundColor: [
            "#cccccc", "#00bfff","#ffc107","#ff5722","#3f51b5","#9c27b0","#8bc34a","#795548","#8b8b8b"
          ],
        }]
      },
      options: {
        responsive:true,
        plugins: {
          legend:{ position:"bottom" }
        }
      }
    });
  } else {
    chartEstadosObj.data.labels = labelsEstado;
    chartEstadosObj.data.datasets[0].data = dataEstado;
    chartEstadosObj.update();
  }

  // 2) Próximas tareas por responsable
  let respCounts = {};
  notFinal.forEach(t=>{
    let un = t.userName||"Desconocido";
    respCounts[un] = (respCounts[un]||0)+1;
  });
  const labelsResp = Object.keys(respCounts);
  const dataResp = Object.values(respCounts);
  if(!chartResponsablesObj){
    chartResponsablesObj = new Chart(chartResponsablesCtx, {
      type: "bar",
      data: {
        labels: labelsResp,
        datasets: [{
          label: "Tareas sin finalizar por responsable",
          data: dataResp,
          backgroundColor: "#2196f3"
        }]
      },
      options: {
        responsive:true,
        plugins:{
          legend:{ display:false }
        },
        scales:{
          y:{ beginAtZero:true }
        }
      }
    });
  } else {
    chartResponsablesObj.data.labels= labelsResp;
    chartResponsablesObj.data.datasets[0].data= dataResp;
    chartResponsablesObj.update();
  }

  // 3) Tareas sin finalizar por Grupo (top 5)
  let groupCounts= {};
  notFinal.forEach(t=>{
    let gr= t.grupoCliente||"Sin grupo";
    groupCounts[gr] = (groupCounts[gr]||0)+1;
  });
  // convert to array => sort desc => top 5
  let arrGroup= Object.entries(groupCounts).sort((a,b)=> b[1]-a[1]);
  let top5= arrGroup.slice(0,5);
  let labelsGrp= top5.map(x=> x[0]);
  let dataGrp= top5.map(x=> x[1]);

  if(!chartGruposObj){
    chartGruposObj= new Chart(chartGruposCtx, {
      type: "bar",
      data: {
        labels: labelsGrp,
        datasets:[{
          label:"Tareas sin finalizar por Grupo",
          data: dataGrp,
          backgroundColor:"#ff9800"
        }]
      },
      options:{
        responsive:true,
        plugins:{
          legend:{display:false}
        },
        scales:{
          y:{beginAtZero:true}
        }
      }
    });
  } else {
    chartGruposObj.data.labels= labelsGrp;
    chartGruposObj.data.datasets[0].data= dataGrp;
    chartGruposObj.update();
  }
}
