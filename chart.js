import { allTasks } from "./script.js";

// Mapa de estados -> color
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

// Para la urgencia => color segun días
const urgencyColors = {
  rojo:"#ffcccc",
  naranjo:"#ffe1bc",
  amarillo:"#fff8b5",
  verde:"#d0ffd0",
  azul:"#cce4ff"
};

let chartEstadosObj=null;
let chartRespObj=null;
let chartGruposObj=null;
let chartUrgenciaObj=null;

document.addEventListener("DOMContentLoaded", ()=>{
  const ctxEstados= document.getElementById("chartEstados")?.getContext("2d");
  const ctxResp= document.getElementById("chartResponsables")?.getContext("2d");
  const ctxGrupos= document.getElementById("chartGrupos")?.getContext("2d");
  const ctxUrg= document.getElementById("chartUrgencia")?.getContext("2d");
  if(!ctxEstados||!ctxResp||!ctxGrupos||!ctxUrg)return;

  setInterval(()=>{
    updateCharts(ctxEstados, ctxResp, ctxGrupos, ctxUrg);
  },2000);
});

function updateCharts(ctx1, ctx2, ctx3, ctx4){
  // 1) Tareas sin final
  let notFinal= allTasks.filter(t=> t.status!=="Finalizado");

  // A) Tareas por estado
  let countsEst={};
  notFinal.forEach(t=>{
    const st= t.status||"Asignado";
    countsEst[st]=(countsEst[st]||0)+1;
  });
  let labelsEst= Object.keys(countsEst);
  let dataEst= Object.values(countsEst);
  let colEst= labelsEst.map(st=> colorMap[st]||"#999");

  if(!chartEstadosObj){
    chartEstadosObj= new Chart(ctx1, {
      type:"pie",
      data:{
        labels: labelsEst,
        datasets:[{
          data: dataEst,
          backgroundColor: colEst
        }]
      },
      options:{
        responsive:true,
        plugins:{
          legend:{ position:"bottom" },
          tooltip:{
            callbacks:{
              label:function(context){
                const ds= context.dataset;
                const total= ds.data.reduce((a,b)=>a+b,0);
                const val= ds.data[context.dataIndex];
                const pct= ((val/total)*100).toFixed(1)+"%";
                return context.label+": "+ val +" ("+pct+")";
              }
            }
          }
        }
      }
    });
  } else {
    chartEstadosObj.data.labels= labelsEst;
    chartEstadosObj.data.datasets[0].data= dataEst;
    chartEstadosObj.data.datasets[0].backgroundColor= colEst;
    chartEstadosObj.update();
  }

  // B) Responsables
  let countsResp={};
  notFinal.forEach(t=>{
    const r= t.userName||"Desconocido";
    countsResp[r]= (countsResp[r]||0)+1;
  });
  let lr= Object.keys(countsResp);
  let dr= Object.values(countsResp);

  if(!chartRespObj){
    chartRespObj= new Chart(ctx2, {
      type:"bar",
      data:{
        labels: lr,
        datasets:[{
          data: dr,
          backgroundColor:"#2196f3"
        }]
      },
      options:{
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
    chartRespObj.data.labels= lr;
    chartRespObj.data.datasets[0].data= dr;
    chartRespObj.update();
  }

  // C) Grupos => top5
  let groupCounts={};
  notFinal.forEach(t=>{
    const g= t.grupoCliente||"Sin grupo";
    groupCounts[g]= (groupCounts[g]||0)+1;
  });
  let arrG= Object.entries(groupCounts).sort((a,b)=> b[1]-a[1]);
  let top5= arrG.slice(0,5);
  let labG= top5.map(x=> x[0]);
  let datG= top5.map(x=> x[1]);

  if(!chartGruposObj){
    chartGruposObj= new Chart(ctx3, {
      type:"bar",
      data:{
        labels: labG,
        datasets:[{
          data: datG,
          backgroundColor:"#ff9800"
        }]
      },
      options:{
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
    chartGruposObj.data.labels= labG;
    chartGruposObj.data.datasets[0].data= datG;
    chartGruposObj.update();
  }

  // D) Urgencia de Tareas => con la fechaEntrega
  //  contaremos rojos(<=2), naranjo(<=5), amarillo(<=8), verde(<=11), azul(+11)
  let urgCounts={
    rojo:0,
    naranjo:0,
    amarillo:0,
    verde:0,
    azul:0
  };
  notFinal.forEach(t=>{
    if(!t.fechaEntrega) return;
    // calculamos diff
    // si es final => no.  Ya filtrado
    const f= t.fechaEntrega;
    let dd= parseDateDMY( formatDDMMYYYY(f) );
    if(!dd) return;
    let diff= calcDiffDays(new Date(), dd);
    if(diff<=2) urgCounts.rojo++;
    else if(diff<=5) urgCounts.naranjo++;
    else if(diff<=8) urgCounts.amarillo++;
    else if(diff<=11) urgCounts.verde++;
    else urgCounts.azul++;
  });
  let labelsUrg= Object.keys(urgCounts);
  let dataUrg= Object.values(urgCounts);
  let colUrg= [
    urgencyColors.rojo,
    urgencyColors.naranjo,
    urgencyColors.amarillo,
    urgencyColors.verde,
    urgencyColors.azul
  ];
  if(!chartUrgenciaObj){
    chartUrgenciaObj= new Chart(ctx4, {
      type:"pie",
      data:{
        labels: labelsUrg,
        datasets:[{
          data: dataUrg,
          backgroundColor: colUrg
        }]
      },
      options:{
        responsive:true,
        plugins:{
          legend:{ position:"bottom"},
          tooltip:{
            callbacks:{
              label:function(ctx){
                const ds= ctx.dataset;
                const total= ds.data.reduce((a,b)=>a+b,0);
                const val= ds.data[ctx.dataIndex];
                const pct= total>0?((val/total)*100).toFixed(1)+"%":"0%";
                return ctx.label+": "+ val +" ("+pct+")";
              }
            }
          }
        }
      }
    });
  } else {
    chartUrgenciaObj.data.labels= labelsUrg;
    chartUrgenciaObj.data.datasets[0].data= dataUrg;
    chartUrgenciaObj.data.datasets[0].backgroundColor= colUrg;
    chartUrgenciaObj.update();
  }
}

// parse days sin sabDom?
function calcDiffDays(fromDate,toDate){
  if(!fromDate||!toDate)return 9999;
  let start= new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  let end= new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  if(end<start)return 0; // o negativo
  let days=0;
  let cur= new Date(start);
  while(cur<=end){
    let d= cur.getDay();
    if(d!==0 && d!==6){
      days++;
    }
    cur.setDate(cur.getDate()+1);
  }
  return days-1;
}
function parseDateDMY(dd_mm_yyyy){
  if(!dd_mm_yyyy)return null;
  let [d,m,y]= dd_mm_yyyy.split("-");
  return new Date(parseInt(y), parseInt(m)-1, parseInt(d));
}
function formatDDMMYYYY(iso){
  if(!iso)return "";
  let [y,m,d]= iso.split("-");
  return `${d}-${m}-${y}`;
}
