import { allTasks } from "./script.js";

// Mapa de estados a colores (mismos usados en la tabla):
const colorMap = {
  "Asignado": "#cccccc",
  "En proceso": "#00bfff",
  "Por revisar": "#ffc107",
  "Reportar": "#ff5722",
  "SII": "#3f51b5",
  "Municipalidad": "#9c27b0",
  "Tesoreria": "#8bc34a",
  "BPO": "#795548",
  "Cliente": "#8b8b8b"
};

// references
let chartEstadosCtx=null, chartEstadosObj=null;
let chartResponsablesCtx=null, chartResponsablesObj=null;
let chartGruposCtx=null, chartGruposObj=null;

document.addEventListener("DOMContentLoaded", ()=>{
  chartEstadosCtx = document.getElementById("chartEstados")?.getContext("2d");
  chartResponsablesCtx = document.getElementById("chartResponsables")?.getContext("2d");
  chartGruposCtx = document.getElementById("chartGrupos")?.getContext("2d");

  // Actualiza con un setInterval cada 2s
  setInterval(()=> updateAllCharts(), 2000);
});

function updateAllCharts(){
  if(!chartEstadosCtx || !chartResponsablesCtx || !chartGruposCtx)return;
  // Filtramos las que NO estén finalizadas
  const notFinal = allTasks.filter(t => t.status!=="Finalizado");

  // 1) Tareas por estado
  // Contamos c/u
  let stateCounts = {};
  notFinal.forEach(t=>{
    let st = t.status||"Asignado";
    stateCounts[st] = (stateCounts[st]||0)+1;
  });
  const labelsEstado = Object.keys(stateCounts);
  const dataEstado = Object.values(stateCounts);

  // Asignar colores segun label
  let backgroundColors = labelsEstado.map(st=> colorMap[st]||"#999");

  if(!chartEstadosObj){
    chartEstadosObj = new Chart(chartEstadosCtx, {
      type:"pie",
      data:{
        labels: labelsEstado,
        datasets:[{
          data: dataEstado,
          backgroundColor: backgroundColors
        }]
      },
      options:{
        responsive:true,
        plugins:{
          legend:{ position:"bottom" },
          tooltip:{
            callbacks:{
              label: function(context){
                const ds = context.dataset;
                const total = ds.data.reduce((a,b)=>a+b,0);
                const val = ds.data[context.dataIndex];
                const percent = ((val/total)*100).toFixed(1)+"%";
                return context.label + ": " + val + " ("+percent+")";
              }
            }
          }
        }
      }
    });
  } else {
    chartEstadosObj.data.labels = labelsEstado;
    chartEstadosObj.data.datasets[0].data = dataEstado;
    chartEstadosObj.data.datasets[0].backgroundColor = backgroundColors;
    chartEstadosObj.update();
  }

  // 2) Próximas tareas por responsable
  let respCounts = {};
  notFinal.forEach(t=>{
    const r = t.userName||"Desconocido";
    respCounts[r] = (respCounts[r]||0)+1;
  });
  const labelsResp = Object.keys(respCounts);
  const dataResp = Object.values(respCounts);

  if(!chartResponsablesObj){
    chartResponsablesObj = new Chart(chartResponsablesCtx, {
      type:"bar",
      data:{
        labels: labelsResp,
        datasets:[{
          data: dataResp,
          backgroundColor:"#2196f3"
        }]
      },
      options:{
        responsive:true,
        plugins:{
          legend:{ display:false },
          tooltip:{
            callbacks:{
              label:function(ctx){
                return ctx.dataset.data[ctx.dataIndex] + " Tareas";
              }
            }
          }
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

  // 3) Tareas sin finalizar por Grupo => top5
  let groupCounts={};
  notFinal.forEach(t=>{
    const gr= t.grupoCliente||"Sin grupo";
    groupCounts[gr] = (groupCounts[gr]||0)+1;
  });
  const arrGr = Object.entries(groupCounts).sort((a,b)=> b[1]-a[1]);
  const top5= arrGr.slice(0,5);
  const labelsGr = top5.map(x=> x[0]);
  const dataGr= top5.map(x=> x[1]);

  if(!chartGruposObj){
    chartGruposObj= new Chart(chartGruposCtx, {
      type:"bar",
      data:{
        labels: labelsGr,
        datasets:[{
          data: dataGr,
          backgroundColor:"#ff9800"
        }]
      },
      options:{
        responsive:true,
        plugins:{
          legend:{display:false},
          tooltip:{
            callbacks:{
              label:function(ctx){
                return ctx.dataset.data[ctx.dataIndex] + " Tareas";
              }
            }
          }
        },
        scales:{
          y:{ beginAtZero:true }
        }
      }
    });
  } else {
    chartGruposObj.data.labels= labelsGr;
    chartGruposObj.data.datasets[0].data= dataGr;
    chartGruposObj.update();
  }
}
