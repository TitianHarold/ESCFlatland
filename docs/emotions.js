/* Emotion marks remain drawings, with distinct timing and meaning. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./palette.js'));
  else root.FlatlandEmotions=factory(root.FlatlandPalette);
})(typeof globalThis!=='undefined'?globalThis:this,function(palette){
  'use strict';
  function envelope(elapsed, duration) {
    if(elapsed<0||elapsed>duration)return 0;
    return Math.min(1,elapsed/.12,(duration-elapsed)/.28);
  }
  function draw(ctx,type,x,y,elapsed,duration=1.35) {
    const alpha=envelope(elapsed,duration);if(alpha<=0)return;
    ctx.save();ctx.translate(x,y-4*Math.sin(Math.min(elapsed/.4,1)*Math.PI));
    ctx.rotate(0);
    const pop=.88+.12*Math.min(1,elapsed/.10);ctx.scale(pop,pop);
    ctx.globalAlpha=alpha;ctx.strokeStyle=palette.ink;ctx.fillStyle=palette.ink;ctx.lineWidth=3.5;ctx.lineCap='round';ctx.lineJoin='round';
    if(type==='curiosity') {
      ctx.fillStyle=palette.gold;ctx.strokeStyle=palette.gold;ctx.lineWidth=2;
      const breathe=1+.08*Math.sin(elapsed*4);ctx.scale(breathe,breathe);
      ctx.beginPath();ctx.moveTo(0,-25);ctx.quadraticCurveTo(3,-8,14,-5);ctx.quadraticCurveTo(3,-2,0,14);ctx.quadraticCurveTo(-3,-2,-14,-5);ctx.quadraticCurveTo(-3,-8,0,-25);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(20,-25);ctx.lineTo(20,-15);ctx.moveTo(15,-20);ctx.lineTo(25,-20);ctx.stroke();
    } else if(type==='question') {
      ctx.beginPath();ctx.moveTo(-8,-10);ctx.bezierCurveTo(-10,-24,13,-26,13,-11);ctx.bezierCurveTo(13,-2,1,-2,1,7);ctx.stroke();
      ctx.beginPath();ctx.arc(1,17,2.5,0,Math.PI*2);ctx.fill();
    } else if(type==='exclamation') {
      ctx.beginPath();ctx.moveTo(0,-21);ctx.lineTo(0,5);ctx.stroke();ctx.beginPath();ctx.arc(0,16,2.5,0,Math.PI*2);ctx.fill();
    } else if(type==='bulb') {
      ctx.beginPath();ctx.moveTo(-6,7);ctx.bezierCurveTo(-6,-1,-14,-3,-13,-13);ctx.bezierCurveTo(-12,-31,13,-31,14,-13);ctx.bezierCurveTo(15,-3,7,-1,7,7);ctx.closePath();ctx.stroke();
      ctx.beginPath();ctx.moveTo(-5,13);ctx.lineTo(6,13);ctx.moveTo(-3,18);ctx.lineTo(4,18);ctx.moveTo(-22,-15);ctx.lineTo(-28,-15);ctx.moveTo(23,-15);ctx.lineTo(29,-15);ctx.moveTo(0,-35);ctx.lineTo(0,-41);ctx.stroke();
    }
    ctx.restore();
  }
  return {draw};
});
