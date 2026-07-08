
let chart;

function getData(){
 return JSON.parse(localStorage.getItem("bmiHistory"))||[];
}

function calculateBMI(){
 const h=Number(document.getElementById("height").value)/100;
 const w=Number(document.getElementById("weight").value);
 if(!h||!w){alert("Enter height and weight");return;}
 const bmi=(w/(h*h)).toFixed(1);
 let cat="Obese";
 if(bmi<18.5) cat="Underweight";
 else if(bmi<25) cat="Normal";
 else if(bmi<30) cat="Overweight";

 document.getElementById("result").innerHTML=`BMI: ${bmi} (${cat})`;

 const data=getData();
 data.push({date:new Date().toLocaleDateString(),weight:w,bmi:Number(bmi),category:cat});
 localStorage.setItem("bmiHistory",JSON.stringify(data));
 render();
}

function render(){
 const data=getData();
 document.getElementById("history").innerHTML=data.map(d=>`<p>${d.date} - ${d.weight}kg - BMI ${d.bmi} (${d.category})</p>`).join("");

 if(chart) chart.destroy();
 chart=new Chart(document.getElementById("weightChart"),{
   type:"line",
   data:{
      labels:data.map(d=>d.date),
      datasets:[
        {label:"Weight",data:data.map(d=>d.weight)},
        {label:"BMI",data:data.map(d=>d.bmi)}
      ]
   }
 });
}
render();
