
var canvas = document.getElementById('gamecanvas');
canvas.width = canvas.scrollWidth;
canvas.height = canvas.scrollHeight;
var ctx = canvas.getContext('2d');

// locations are x,y board which is 0..1 in both dimensions
// time is in seconds (ish)

// data structure "portal segment":
// starting and ending location and time-of-creation
// keys color, sx, sy, st, ex, ey, et

var drawPortalSegment = function(portalsegment) {
  ctx.strokeStyle = portalsegment.color;
  ctx.lineCap = 'round';
  // TODO adjust somewhat based on pixel density maybe?
  ctx.lineWidth = 0.005;
  ctx.beginPath();
  ctx.moveTo(portalsegment.sx, portalsegment.sy);
  ctx.lineTo(portalsegment.ex, portalsegment.ey);
  ctx.stroke();
};

var seg1 = {
  color: '#f80',
  sx: 0.25,
  sy: 0.25,
  st: 0,
  ex: 0.75,
  ey: 0.5,
  et: 1
};

var randomwalk1 = function(firstSeg) {
  var segs = [firstSeg];
  lastSeg = firstSeg;
  for(var i = 0; i < 50; i++) {
    var newSeg = {color: '#f80'};
    newSeg.sx = lastSeg.ex;
    newSeg.sy = lastSeg.ey;
    newSeg.st = lastSeg.et;
    newSeg.ex = newSeg.sx + ((Math.random()*2-1) * 0.05);
    newSeg.ey = newSeg.sy + ((Math.random()*2-1) * 0.05);
    newSeg.et = newSeg.st + (Math.random()+0.1);
    lastSeg = newSeg;
    segs.push(newSeg);
  }
  return segs;
};
var randomwalk2 = function(firstSeg) {
  var segs = [firstSeg];
  lastSeg = firstSeg;
  var vx = 0, vy = 0;
  for(var i = 0; i < 50; i++) {
    var newSeg = {color: '#f80'};
    vx += ((Math.random()*2-1) * 0.05);
    vy += ((Math.random()*2-1) * 0.05);
    newSeg.sx = lastSeg.ex;
    newSeg.sy = lastSeg.ey;
    newSeg.st = lastSeg.et;
    newSeg.ex = newSeg.sx + vx;
    newSeg.ey = newSeg.sy + vy;
    newSeg.et = newSeg.st + (Math.random()+0.1);
    lastSeg = newSeg;
    segs.push(newSeg);
  }
  return segs;
};
var segs = randomwalk2(seg1);

ctx.save();
ctx.scale(canvas.width, canvas.height);

segs.forEach(function(seg) {
  drawPortalSegment(seg);
});

ctx.restore();
