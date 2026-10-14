/** Deterministic 95% percentile interval, resampling learners with all their tasks. */
export function learnerBootstrapInterval(rows:Array<{learnerId:string;value:number}>):[number,number]|null {
 const clusters=new Map<string,number[]>();
 for(const row of rows){if(!Number.isFinite(row.value))throw new Error('Invalid bootstrap observation');
  if(!clusters.has(row.learnerId))clusters.set(row.learnerId,[]);clusters.get(row.learnerId)!.push(row.value);}
 const values=[...clusters.values()];if(values.length<2)return null;
 let seed=20261014;const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 const estimates:number[]=[];
 for(let iteration=0;iteration<1000;iteration++){
  let total=0,count=0;for(let cluster=0;cluster<values.length;cluster++){
   const sample=values[Math.floor(random()*values.length)];for(const value of sample){total+=value;count++;}
  }
  estimates.push(total/count);
 }
 estimates.sort((a,b)=>a-b);return [estimates[24],estimates[974]];
}
