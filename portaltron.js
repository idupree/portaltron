"use strict";

var bug = function() {
  console.log.apply(console, arguments);
};


// locations are x,y board which is [0..1) in both dimensions
// time is in seconds (ish)

// data structure "portal segment":
// starting and ending values of location and time-of-creation
// keys:
// color (string for css)
// creator (link to a portalcycle)
// sx, sy, st, ex, ey, et


// data structure portalcycle:
// color
// x, y, t?: current position and time
// vx and vy represent direction of travel (distance units per second??)
// portals: array of portalsegments they've left behind

var world;

var initializeWorld = function() {
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

  world = {
    portalsegments: [],
    segsQuadTree: QuadTree(0, 0, 1, 1),
    portalcycles: [portalcycle1, portalcycle2],
    idCounter: 1
  };
};

var any = function() {
  for(var i = 0; i < arguments.length; i++) {
    if(arguments[i] !== undefined) {
      return arguments[i];
    }
  }
};
var approxSegBoundsForQuadtree = function(seg) {
  // TODO maybe fudge amounts proportional to object width?
  // Or if not, qtree also has a fudge amount we can/do
  // specify, so.
  var lowx = Math.min(seg.sx, seg.ex) - 0.001;
  var highx = Math.max(seg.sx, seg.ex) + 0.001;
  var lowy = Math.min(seg.sy, seg.ey) - 0.001;
  var highy = Math.max(seg.sy, seg.ey) + 0.001;
  return {x: lowx, y: lowy, w: highx - lowx, h: highy - lowy, seg: seg};
};
var approxTravelBoundsForQuadtree = function(portalcycle, maxTimeElapse) {
  if(maxTimeElapse == null) {
    maxTimeElapse = 10000;
  }
  var dx = portalcycle.vx*maxTimeElapse;
  var dy = portalcycle.vy*maxTimeElapse;
  var ex = portalcycle.x + dx;
  var ey = portalcycle.y + dx;
  var lowx = Math.min(portalcycle.x, ex) - 0.001;
  var highx = Math.max(portalcycle.x, ex) + 0.001;
  var lowy = Math.min(portalcycle.y, ey) - 0.001;
  var highy = Math.max(portalcycle.y, ey) + 0.001;
  return {x: lowx, y: lowy, w: highx - lowx, h: highy - lowy};
  // Math.sqrt makes it slower than expected?
  //return {
  //  x: portalcycle.x, y: portalcycle.y, dx: dx, dy: dy,
  //  dist: Math.sqrt(dx*dx + dy*dy)
  //};
};

var addPortalsegment = function(seg) {
  seg.id = world.idCounter++;
  world.portalsegments.push(seg);
  seg.creator.portals.push(seg);
  var bounds = approxSegBoundsForQuadtree(seg);
  bounds.id = seg.id;
  seg.qtreebounds = bounds;
  world.segsQuadTree.put(bounds);
};

var randomwalk1 = function(firstSeg) {
  var segs = [firstSeg];
  lastSeg = firstSeg;
  for(var i = 0; i < 50; i++) {
    var newSeg = {color: '#f80', creator: world.portalcycles[0]};
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
    var newSeg = {color: '#f80', creator: world.portalcycles[0]};
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
//var exampleSeg1 = {
//  color: '#f80',
//  creator: world.portalcycles[0],
//  sx: 0.25,
//  sy: 0.25,
//  st: 0,
//  ex: 0.75,
//  ey: 0.5,
//  et: 1
//};
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
    var into = findNextPortal(portalcycle, time*1.00000001);
    if(into) {
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
var findNextPortal = function(portalcycle, maxTimeElapse) {
  var best = null;
  var orderBy = (into) => [into.elapsed, into.timeWhenEnteredPointOfPortalWasCreated, into.portalsegment1.color];
  world.segsQuadTree.get(approxTravelBoundsForQuadtree(portalcycle, maxTimeElapse),
                         // For double-checking for bugs with quadtree search:
                         //{x:0, y:0, w:1, h:1},
                         0.001, function(qtseg) {
    var seg = qtseg.seg;
    var into = driveIntoPortal(portalcycle, seg);
    if(into && (best === null ||
                lexicographicCompare(orderBy(into), orderBy(best)) === -1)) {
      best = into;
    }
    return true; // continue quadtree iteration
  });
  /*
  // For double-checking with bugs with quadtree search:
  var best2 = null;
  segsFromPortalcycle(portalcycle).forEach(function(seg) {
    var into = driveIntoPortal(portalcycle, seg);
    if(into && (best2 === null ||
                lexicographicCompare(orderBy(into), orderBy(best2)) === -1)) {
      best2 = into;
    }
  });
  if(((best == null) !== (best2 == null)) ||
     (best && best2 && best.portalsegment1 !== best2.portalsegment1)) {
    bug("why", best&& best.elapsed, best2&&best2.elapsed);
  }*/
  if(best && best.elapsed <= maxTimeElapse) {
    return best;
  } else {
    return null;
  }
};

var binarysearch = function(arr, elemIsHighEnough) {
  var lo = 0;
  var hi = arr.length - 1;
  var mid;
  while(hi - lo > 4) {
    mid = (lo+hi) >> 1;
    if(elemIsHighEnough(arr[mid])) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  while(lo <= hi) {
    if(elemIsHighEnough(arr[lo])) {
      return lo;
    }
    lo++;
  }
  return null;
};

// This function is usually reversible to get back from
// portalsegment2 to portalsegment1 at the provided time,
// but rounding error may find a different portalsegment1
// on occasion if you tried that.
var findCorrespondingPortal = function(timeWhenEnteredPointOfPortalWasCreated, portalsegment1) {
   var segs = portalsegment1.creator.counterpart.portals;
   var i = binarysearch(segs, seg=>timeWhenEnteredPointOfPortalWasCreated < seg.et);
   if(i != null) {
     return segs[i];
   }
   if(segs.length) {
     var seg = segs[segs.length-1];
     if(timeWhenEnteredPointOfPortalWasCreated < seg.et + 1.1) {
       console.log("margin of error", timeWhenEnteredPointOfPortalWasCreated, seg.et);
       return seg;
     } else {
       // ohhhh oops if you create your own portals on your own turn and go into them,
       // before your partner has moved this turn, umm...
       bug("there were no portals you emerge from?", timeWhenEnteredPointOfPortalWasCreated, seg.et);
       // return it anyway because it appears to happen on occasion?
       return seg;
     }
   } else {
     bug("there were no portals?");
   }
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


var fnName = function(f, name) {
  if(name) {
    return name;
  } else if(f.name !== "") {
    return f.name;
  } else {
    return f.toString().replace(/^function ?/, '').slice(0, 20);
  }
};
// profile
var prof = function(f, name) {
  var name = fnName(f, name);
  var t0 = Date.now();
  console.log("t0 "+name+':', t0);
  var result = f();
  var t1 = Date.now();
  var dt = t1 - t0;
  console.log("t1 "+name+':', t1, "dt: ", dt);
  return result;
}
var profable = function(optname, f) {
  if(arguments.length === 1) {
    f = optname;
    optname = undefined;
  }
  return function() {
    var that = this;
    return prof(function(){return f.apply(that, arguments)}, optname);
  };
};

var testSim = profable('testSim', function() {
  initializeWorld()
  for(var i = 0; i < 1250; i++) {
    doTurn();
  }
});
var drawPortalSegment = function(ctx, portalsegment) {
  ctx.strokeStyle = portalsegment.color;
  ctx.lineCap = 'round';
  // TODO adjust somewhat based on pixel density maybe?
  ctx.lineWidth = 0.005;
  ctx.beginPath();
  ctx.moveTo(portalsegment.sx, portalsegment.sy);
  ctx.lineTo(portalsegment.ex, portalsegment.ey);
  ctx.stroke();
};
var initializeDraw = function() {
  var portalscanvas = document.createElement('canvas');
  portalscanvas.id = 'portalscanvas';
  portalscanvas.width = portalscanvas.scrollWidth;
  portalscanvas.height = portalscanvas.scrollHeight;
  portalscanvas.dataset.segsdrawn = 0;
  var game = document.getElementById('game');
  game.appendChild(portalscanvas);
};
var redrawWorld = profable('redrawWorld', function() {
  var portalscanvas = document.getElementById('portalscanvas');
  portalscanvas.width = portalscanvas.scrollWidth;
  portalscanvas.height = portalscanvas.scrollHeight;
  var ctx = portalscanvas.getContext('2d');

  ctx.save();
  ctx.scale(portalscanvas.width, portalscanvas.height);

  world.portalsegments.forEach(function(seg) {
    drawPortalSegment(ctx, seg);
  });
  portalscanvas.dataset.segsdrawn = world.portalsegments.length;

  ctx.restore();

  //var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  //ctx.putImageData(data, 0, 0);
});
var drawNewPortals = profable('drawNewPortals', function() {
  var portalscanvas = document.getElementById('portalscanvas');
  var ctx = portalscanvas.getContext('2d');
  ctx.save();
  ctx.scale(portalscanvas.width, portalscanvas.height);
  for(var i = portalscanvas.dataset.segsdrawn; i < world.portalsegments.length; i++) {
    drawPortalSegment(ctx, world.portalsegments[i]);
  }
  portalscanvas.dataset.segsdrawn = world.portalsegments.length;
  ctx.restore();
});

initializeWorld();
initializeDraw();
redrawWorld();
var turn = 0;
var go = function() {
  prof(()=>doTurn(), "turn");
  turn++;
  //drawWorld();
  drawNewPortals();
  console.log("segs:", world.portalsegments.length, ", turn:", turn);
  if(turn < 50000) {
    setTimeout(go, 10);
  }
};
go();


//testSim();
//drawWorld();

//document.body.addEventListener('click', ()=>{testSim();drawWorld();});

var debounce = function(f, wait) {
  var timeout = null;
  return function() {
    // TODO return Promise of return value?
    var that = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      f.apply(that, args);
    }, wait);
  };
}
window.addEventListener('resize', debounce(redrawWorld, 500));

