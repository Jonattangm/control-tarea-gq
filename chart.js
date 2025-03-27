import { allTasks } from "./script.js";

/**
 * Ajustes:
 * - Se excluye “Finalizado” del gráfico “Tareas por estado”.
 * - “Urgencia de Tareas” se le da un width/height similar
 */

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
  let tasksArr= allTasks.slice();

  // A) Tareas por estado (excluyendo “Finalizado”)
  let countsEst={};
  tasksArr.forEach(t=>{
    if(t.status==="Finalizado") return;
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
                const pct= (total>0? (val/total*100):0).toFixed(1)+"%";
                return context.label+": "+val+" ("+pct+")";
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

  // B) Próximas tareas por responsable => sin finalizadas
  let notFinal= tasksArr.filter(t=> t.status!=="Finalizado");
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
          label: "Tareas Activas",
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

  // C) Tareas sin finalizar por Grupo (top 5)
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
          label: "Tareas",
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

  // D) Urgencia => color intensos
  let urgCounts={
    rojo:0,
    naranjo:0,
    amarillo:0,
    verde:0,
    azul:0
  };
  notFinal.forEach(t=>{
    if(!t.fechaEntrega)return;
    const dd= parseDateDMY( formatDDMMYYYY(t.fechaEntrega) );
    if(!dd)return;
    let dif= calcDiffDays2(new Date(), dd);
    if(dif<=2) urgCounts.rojo++;
    else if(dif<=5) urgCounts.naranjo++;
    else if(dif<=8) urgCounts.amarillo++;
    else if(dif<=11) urgCounts.verde++;
    else urgCounts.azul++;
  });
  let labelsUrg=["<3 días","3-5 días","6-8 días","9-11 días","+11 días"];
  let dataUrg=[ urgCounts.rojo,urgCounts.naranjo,urgCounts.amarillo,urgCounts.verde,urgCounts.azul ];
  let colUrg=["#f00","#ff7e00","#fff100","#61ff61","#3a7eff"];
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
          legend:{ display:false },
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

// parse days sin sabDom
function calcDiffDays2(fromDate,toDate){
  if(!fromDate||!toDate)return 9999;
  let start= new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  let end= new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  let sign=1;
  if(end<start){
    sign=-1;[start,end]=[end,start];
  }
  let diff=0; let cur= new Date(start);
  while(cur<=end){
    let dw= cur.getDay();
    if(dw!==0 && dw!==6) diff++;
    cur.setDate(cur.getDate()+1);
  }
  return (diff-1)*sign;
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