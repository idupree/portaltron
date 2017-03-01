"use strict";

var bug = function() {
  console.log.apply(console, arguments);
};

var canvas = document.getElementById('gamecanvas');
canvas.width = canvas.scrollWidth;
canvas.height = canvas.scrollHeight;
var ctx = canvas.getContext('2d');

// locations are x,y board which is [0..1) in both dimensions
// time is in seconds (ish)

// data structure "portal segment":
// starting and ending values of location and time-of-creation
// keys:
// color (string for css)
// creator (link to a portalcycle)
// sx, sy, st, ex, ey, et

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


// data structure portalcycle:
// color
// x, y, t?: current position and time
// vx and vy represent direction of travel (distance units per second??)
// portals: array of portalsegments they've left behind

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
// which other portal curve your portals correspond with
portalcycle1.counterpart = portalcycle2;
portalcycle2.counterpart = portalcycle1;

var world = {
  portalsegments: [],
  portalcycles: [portalcycle1, portalcycle2]
};

var any = function() {
  for(var i = 0; i < arguments.length; i++) {
    if(arguments[i] !== undefined) {
      return arguments[i];
    }
  }
};

var addPortalsegment = function(seg) {
  world.portalsegments.push(seg);
  seg.creator.portals.push(seg);
};

var randomwalk1 = function(firstSeg) {
  var segs = [firstSeg];
  lastSeg = firstSeg;
  for(var i = 0; i < 50; i++) {
    var newSeg = {color: '#f80', creator: portalcycle1};
    newSeg.sx = lastSeg.ex;
    newSeg.sy = lastSeg.ey;
    newSeg.st = lastSeg.et;
    newSeg.ex = newSeg.sx + ((Math.random()*2-1) * 0.05);
    newSeg.ey = newSeg.sy + ((Math.random()*2-1) * 0.05);
    newSeg.et = newSeg.st + (Math.random()+0.1);
    lastSeg = newSeg;
    addPortalsegment(newSeg);
  }
  return segs;
};
var randomwalk2 = function(firstSeg) {
  var segs = [firstSeg];
  lastSeg = firstSeg;
  var vx = 0, vy = 0;
  for(var i = 0; i < 50; i++) {
    var newSeg = {color: '#f80', creator: portalcycle1};
    vx += ((Math.random()*2-1) * 0.05);
    vy += ((Math.random()*2-1) * 0.05);
    newSeg.sx = lastSeg.ex;
    newSeg.sy = lastSeg.ey;
    newSeg.st = lastSeg.et;
    newSeg.ex = newSeg.sx + vx;
    newSeg.ey = newSeg.sy + vy;
    newSeg.et = newSeg.st + (Math.random()+0.1);
    lastSeg = newSeg;
    addPortalsegment(newSeg);
  }
  return segs;
};
var exampleSeg1 = {
  color: '#f80',
  creator: portalcycle1,
  sx: 0.25,
  sy: 0.25,
  st: 0,
  ex: 0.75,
  ey: 0.5,
  et: 1
};
//var worldportalsegments = randomwalk2(exampleSeg1);

// counterclockwiseness in radians
var steer = function(portalcycle, counterclockwiseness) {
  var theta = Math.atan2(portalcycle.vy, portalcycle.vx);
  var speed = 0.02;
  theta += counterclockwiseness;
  portalcycle.vy = Math.sin(theta) * speed;
  portalcycle.vx = Math.cos(theta) * speed;
};
var TOOMANYPORTALS = 50;
// returns the resulting portal segments (array)
var drive = function(portalcycle, time) {
  var newportalsegments = [];
  for(var i = 0; i < TOOMANYPORTALS; i++) {
    if(time <= 0) {
      break;
    }
    var into = findNextPortal(portalcycle);
    if(into && into.elapsed < time*1.00000001) {
      var portalsegment2 = findCorrespondingPortal(
        into.timeWhenEnteredPointOfPortalWasCreated, into.portalsegment1);
      driveOutOfPortal(into, portalcycle, into.portalsegment1, portalsegment2);
      newportalsegments.push(into.newportalsegment);
      // add the portalsegment to the world now in case there's a funny loop
      // that makes the portalcycle go through this portalsegment in this
      // very drive() invocation
      addPortalsegment(into.newportalsegment);
      time -= into.elapsed;
      /*
      console.log(
        JSON.stringify({
            "eventName": "we teleported!",
            "t": time,
            "pc": portalcycle,
            "into": into,
            "ps2": portalsegment2
        },
        function(k, v){if(k==='portals'||k==='counterpart'){return undefined}else{return v}},
        2));
        */
    } else {
      break;
    }
  }
  if(i === TOOMANYPORTALS) {
    console.log("Too many portals. Do you lose? Lose your turn? What");
  } else if(time > 0) {
    var portalsegment = {
      color: portalcycle.color,
      creator: portalcycle,
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
    if(wraps === 0) {
      addPortalsegment(portalsegment);
      newportalsegments.push(portalsegment);
    }
  }
  return newportalsegments;
};


// segment: sx, sy, ex, ey
// line: a, b, c
// dx = delta x
var xydxdyFromSegmentEndpoints = function(segment) {
  var {sx, sy, ex, ey} = segment;
  return {
    x: sx,
    y: sy,
    dx: ex - sx,
    dy: ey - sy
  };
};
var axbycFromXydxdy = function(xydxdy) {
  var {x, y, dx, dy} = xydxdy;
  return {
    a: dy,
    b: -dx,
    c: dy*x - dx*y
  };
};
var axbycFromSegmentEndpoints = function(segment) {
  return axbycFromXydxdy(xydxdyFromSegmentEndpoints(segment));
};
var fractionAlongXydxdyAtAxbyc = function(xydxdy, axbyc) {
  var {x, y, dx, dy} = xydxdy;
  var {a, b, c} = axbyc;
  // algebra:
  // a*x+b*y=c
  // x+dx*t, y+dy*t
  // a*(x+dx*t)+b*(y+dy*t)=c
  // a*x + b*y + t*(a*dx + b*dy) = c
  // t*(a*dx + b*dy) = c - a*x - b*y
  // t = (c - a*x - b*y) / (a*dx + b*dy)
  return (c - a*x - b*y) / (a*dx + b*dy);
};
var portalcycleXydxdy = function(portalcycle) {
  return {x: portalcycle.x, y: portalcycle.y, dx: portalcycle.vx, dy: portalcycle.vy};
};

// Drives up until the portalsegment,
// returning the generated portalsegment from driving
// and the distance traveled.
// May or may not yell if the current travel direction misses
// the destination portalsegment.
// Places the portalcycle just outside the destination portal
// with appropriately refracted velocity.
// (Yes, there is some rounding error risk here, so consider
// glitchiness a feature? :P We considered making all locations
// and segments use exact rational numbers, and decided to try
// without first, because rational numbers often combine to
// become high numerator & denominator (rational "height")
// in a way that uses lots of memory and processing power.
//
// Does not actually modify portalcycle.
var driveIntoPortal = function(portalcycle, portalsegment1) {
  // Find out if/where the portalcycle will strike along the portal
  // (first, because it will rule out the most values).
  var fraction = fractionAlongXydxdyAtAxbyc(
    xydxdyFromSegmentEndpoints(portalsegment1),
    axbycFromXydxdy(portalcycleXydxdy(portalcycle)));
  // portalcycle can catch the edge of a portal, because
  // that's better than accidentally squeezing through
  // two touching portalsegments by rounding error.
  // This maybe should be a max distance, not just a fraction?
  if(fraction <= -0.0001 || fraction >= 1.0001 || !isFinite(fraction)) {
    return null;
  }
  // Don't accidentally run into the very portal line you are creating.
  // TODO: possibly also give portalcycles a "generation number" that increments
  // whenever they go through a portal, and only skip collisions as below
  // if equal generation numbers between portalsegment and creator
  if(portalsegment1.creator === portalcycle &&
        portalcycle.t - portalsegment1.et < 0.01) {
    return null;
  }
  // compute time that portalcycle enters portalsegment1
  var elapsed = fractionAlongXydxdyAtAxbyc(
    portalcycleXydxdy(portalcycle),
    axbycFromSegmentEndpoints(portalsegment1));
  if(elapsed <= 0 || !isFinite(elapsed) || elapsed >= 1000000000) {
    return null;
  }
  // round down to avoid accidentally rounding to the opposite side of the portal
  elapsed *= 0.99999;
  var enterPortalAt = {
    x: portalcycle.x + portalcycle.vx*elapsed,
    y: portalcycle.y + portalcycle.vy*elapsed,
    t: portalcycle.t + elapsed
  };
  var newportalsegment = {
    color: portalcycle.color,
    creator: portalcycle,
    sx: portalcycle.x,
    sy: portalcycle.y,
    st: portalcycle.t,
    ex: enterPortalAt.x,
    ey: enterPortalAt.y,
    et: enterPortalAt.t
  };
  var timeWhenEnteredPointOfPortalWasCreated = (
    portalsegment1.st * (1-fraction) + portalsegment1.et*fraction);
  return {
    newportalsegment, enterPortalAt, elapsed,
    timeWhenEnteredPointOfPortalWasCreated,
    portalsegment1
  };
};
// should be all segs; TODO if >2 player
var segsFromPortalcycle = function(portalcycle) {
  return [].concat(
    portalcycle.portals,
    portalcycle.counterpart.portals);
};
// Returns -1 / 0 / 1 (less, equal, greater), comparing
// sequences lexicographically (members by <).
var lexicographicCompare = function(arr1, arr2) {
  for(var i = 0; i < arr2.length; i++) {
    if(i >= arr1.length) {
      return -1;
    }
    if(arr1[i] < arr2[i]) {
      return -1;
    }
    if(arr2[i] < arr1[i]) {
      return 1;
    }
  }
  if(arr2.length < arr1.length) {
    return 1;
  }
  return 0;
};
// Next portal the portalcycle will enter, if any.
// (Returns the return value of driveIntoPortal, or null.)
var findNextPortal = function(portalcycle) {
  var best = null;
  var orderBy = (into) => [into.elapsed, into.timeWhenEnteredPointOfPortalWasCreated, into.portalsegment1.color];
  segsFromPortalcycle(portalcycle).forEach(function(seg) {
    var into = driveIntoPortal(portalcycle, seg);
    if(into && (best === null ||
                lexicographicCompare(orderBy(into), orderBy(best)) === -1)) {
      best = into;
    }
  });
  return best;
};
// This function is usually reversible to get back from
// portalsegment2 to portalsegment1 at the provided time,
// but rounding error may find a different portalsegment1
// on occasion if you tried that.
var findCorrespondingPortal = function(timeWhenEnteredPointOfPortalWasCreated, portalsegment1) {
   var segs = portalsegment1.creator.counterpart.portals;
   // TODO binary search
   for(var i = 0; i < segs.length; i++) {
     var seg = segs[i];
     if(timeWhenEnteredPointOfPortalWasCreated < seg.et) {
       if(timeWhenEnteredPointOfPortalWasCreated < seg.st) {
         //Possibly not actually a bug because of tolerances
         //near beginning (or, below, end) of portal-sequence,
         //so it's unclear whether to complain about this
         //in logs (TODO clean up)
         bug("what kind of bug is this?");
         //return null;
         return seg;
       }
       return seg;
     }
   }
   bug("there were no portals you emerge from?");
   //return null;
   if(segs.length) {
     return segs[segs.length-1];
   }
   bug("there were no portals?");
   return null;
};

// Places portalcycle just outside portalsegment2 without moving it further,
// setting its time, location, and velocity to appropriate values.
// If it skips over another portal that is extremely close to portalsegment2,
// that is an acceptable glitch.
var driveOutOfPortal = function(into, portalcycle, portalsegment1, portalsegment2) {
  // We could do this the hard way without transcendental functions,
  // but are currently using them.
  var anglePortalBefore = Math.atan2(
    portalsegment1.ey - portalsegment1.sy,
    portalsegment1.ex - portalsegment1.sx);
  var anglePortalAfter = Math.atan2(
    portalsegment2.ey - portalsegment2.sy,
    portalsegment2.ex - portalsegment2.sx);
  var portalAngleChange = anglePortalAfter - anglePortalBefore;
  steer(portalcycle, portalAngleChange);
  portalcycle.t = into.enterPortalAt.t;
  portalcycle.x = portalsegment2.sx +(portalsegment2.ex-portalsegment2.sx)*(
    into.timeWhenEnteredPointOfPortalWasCreated - portalsegment2.st);
  portalcycle.y = portalsegment2.sy +(portalsegment2.ey-portalsegment2.sy)*(
    into.timeWhenEnteredPointOfPortalWasCreated - portalsegment2.st);
  // Move to just outside portal, to make sure that despite rounding error,
  // the portalcycle is on the correct side of the portal
  portalcycle.x += portalcycle.vx * 0.00001;
  portalcycle.y += portalcycle.vy * 0.00001;
};

// Thought: slow down & speed up the passage of time for dramatic effect?
var doTurn = function() {
  var time = 1;
  world.portalcycles.forEach((portalcycle) => {
    // possible TODO: if portalcycle were an es6 class, we could say portalcycle.steer()
    steer(portalcycle, (Math.random()*2-1) * 0.4);
    var newsegs = drive(portalcycle, time);
  });
};

var t0 = Date.now();
console.log("t0: ", t0);
for(var i = 0; i < 250; i++) {
  doTurn();
}
var t1 = Date.now();
var dt = t1 - t0;
console.log("t1: ", t1, "dt: ", dt);

ctx.save();
ctx.scale(canvas.width, canvas.height);

world.portalsegments.forEach(function(seg) {
  drawPortalSegment(seg);
});

ctx.restore();
