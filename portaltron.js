"use strict";

var canvas = document.getElementById('gamecanvas');
canvas.width = canvas.scrollWidth;
canvas.height = canvas.scrollHeight;
var ctx = canvas.getContext('2d');

// locations are x,y board which is [0..1) in both dimensions
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
//var segs = randomwalk2(seg1);

// data structure portalcycle:
// color
// x, y, t?: current position and time
// vx and vy represent direction of travel (distance units per second??)
// portals: array of portalsegments they've left behind
// ai is optional other stuff

var portalcycle1 = {
  color: '#f80',
  x: 0.25,
  y: 0.25,
  t: 0,
  vx: 0.1,
  vy: 0,
  portals: []
};
var portalcycle2 = {
  color: '#66f',
  x: 0.75,
  y: 0.75,
  t: 0,
  vx: -0.1,
  vy: 0,
  portals: []
};

// counterclockwiseness in radians
var steer = function(portalcycle, counterclockwiseness) {
  var theta = Math.atan2(portalcycle.vy, portalcycle.vx);
  var speed = 0.02;
  theta += counterclockwiseness;
  portalcycle.vy = Math.sin(theta) * speed;
  portalcycle.vx = Math.cos(theta) * speed;
};
// returns the resulting portal segments (array)
var drive = function(portalcycle, time) {
  var portalsegment = {
    color: portalcycle.color,
    sx: portalcycle.x,
    sy: portalcycle.y,
    st: portalcycle.t
  };
  // hacky torus not-even-portals around the board edge
  var wraps = 0;
  portalcycle.x += portalcycle.vx*time;
  portalcycle.y += portalcycle.vy*time;
  portalcycle.t += time;
  while(portalcycle.x >= 1) {
    portalcycle.x -= 1;
    wraps += 1;
  }
  while(portalcycle.x < 0) {
    portalcycle.x += 1;
    wraps += 1;
  }
  while(portalcycle.y >= 1) {
    portalcycle.y -= 1;
    wraps += 1;
  }
  while(portalcycle.y < 0) {
    portalcycle.y += 1;
    wraps += 1;
  }
  portalsegment.ex = portalcycle.x;
  portalsegment.ey = portalcycle.y;
  portalsegment.et = portalcycle.t;
  // for now, just don't try during wrapping
  return (wraps > 0 ? [] : [portalsegment]);
};
var segs = [];
var portalcycles = [portalcycle1, portalcycle2];

// Thought: slow down & speed up the passage of time for dramatic effect?
var doTurn = function() {
  var time = 1;
  portalcycles.forEach((portalcycle) => {
    // possible TODO: if portalcycle were an es6 class, we could say portalcycle.steer()
    steer(portalcycle, (Math.random()*2-1) * 0.4);
    var newsegs = drive(portalcycle, time);
    newsegs.forEach((seg)=>segs.push(seg));
  });
};

for(var i = 0; i < 50; i++) {
  doTurn();
}

ctx.save();
ctx.scale(canvas.width, canvas.height);

segs.forEach(function(seg) {
  drawPortalSegment(seg);
});

ctx.restore();
