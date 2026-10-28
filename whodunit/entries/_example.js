export default (x,t)=>{for(let i=0;i<128;i++)for(let j=0;j<128;j++){x.fillStyle=`hsl(${(i^j)+t*40},60%,${30+(i*j+t*9|0)%30}%)`;x.fillRect(i,j,1,1)}}
