
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
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(portalsegment.sx, portalsegment.sy);
  ctx.lineTo(portalsegment.ex, portalsegment.ey);
  ctx.stroke();
};

var seg = {
  color: '#f80',
  sx: 0.25,
  sy: 0.25,
  st: 0,
  ex: 0.75,
  ey: 0.5,
  et: 1
};
//var segs = [];
//for(var i = 0; i < 50; i++) {
//  var newSeg = {color: '#f80'};
//}

ctx.save();
ctx.scale(canvas.width, canvas.height);

drawPortalSegment(seg);

ctx.restore();
