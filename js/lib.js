var pickRandom = (a) => a[~~(Math.random() * a.length)];
var randNeg = (i) => (rand(1) == 1) ? i : -i;
var rand = (a, b) => (b) ? (a + Math.round(Math.random() * b)) : Math.round(Math.random() * (a));
var clamp = (a, x, b) => (x < a) ? a : ((x > b) ? b : x);
var eqCoords = (a, b) => a.x == b.x && a.y == b.y;
var trueMod = (n,m) => ((n % m) + m) % m;
