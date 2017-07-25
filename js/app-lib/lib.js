//todo: Add all LIB to angular services/factories
const LIB = {};
LIB.constants = {
    "alpha" : ["😎", "🙈", "🙊", "🐶", "🐺", "🐱", "🐴", "🐷", "🐹", "🐰", "🐼", "🐻"],
    "octile" : Math.sqrt(2) - 2
};

//We do it this way, just overriding prototype makes JQuery quite livid.
Object.defineProperty(Object.prototype, "iterateKeys", {
    value: function(callback) {
        Object.keys(this).forEach(callback);
    },
    enumerable : false
});


//Random generators
LIB.rand = (a, b) => (b) ? (a + Math.round(Math.random() * (b - a))) : Math.round(Math.random() * (a));
LIB.randNeg = (i) => (LIB.rand(1) === 1) ? i : -i;
LIB.flipCoin = () => LIB.rand(10) < 5;
LIB.randOutOf = (a,b) => LIB.rand(b) <= a;
LIB.pickRandom = (a) => a[~~(Math.random() * a.length)];

//Helper functions for basic JS stuff
LIB.clamp = (a, x, b) => (x < a) ? a : ((x > b) ? b : x);
LIB.eqCoords = (a, b) => a.x === b.x && a.y === b.y;
LIB.trueMod = (n, m) => ((n % m) + m) % m;
LIB.xor = (a, b) => ( a || b ) && !( a && b );
LIB.yatesShuffle = (a) => {
    const t = [];
    while (a.length) {
        const i = a[~~(Math.random() * a.length)];
        t.push(a.splice(i, 1)[0]);
    }
    return t;
}
LIB.heap = (comp) => ({
    data: [],
    comp: comp,
    swap: function (i, j) {
        const temp = this.data[i];
        this.data[i] = this.data[j];
        this.data[j] = temp;
    },
    bubDown: function (i) {
        const l = 2 * i + 1;
        const r = l + 1;
        let lg = i;
        if (l < this.data.length && this.comp(this.data[l], this.data[lg])) {
            lg = l;
        }
        if (r < this.data.length && this.comp(this.data[r], this.data[lg])) {
            lg = r;
        }
        if (lg !== i) {
            this.swap(lg, i);
            this.bubDown(lg);
        }
    },
    bubUp: function (i) {
        if (i > 0) {
            const p = ~~((i - 1) / 2);
            if (this.comp(this.data[i], this.data[p])) {
                this.swap(i, p);
                this.bubUp(p);
            }
        }
    },
    pop: function () {
        if (this.data.length === 0) {
            throw new Error("pop on empty heap called!")
        }
        const ret = this.data[0];
        const end = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = end;
            this.bubDown(0);
        }
        return ret;
    },
    push: function (o) {
        this.data.push(o);
        this.bubUp(this.data.length - 1);
    },
    contains: (o) => LIB.coordinatesInArray(o, this.data) >= 0,
    size: function () {
        return this.data.length;
    },
    rescore: function (o) {
        this.bubDown(this.data.indexOf(o));
    }
});
LIB.sortObjectByKeys = (o) => {
    Object.keys(o).sort().forEach(function(k) {
        const value = o[k];
        delete o[k];
        o[k] = value;
    });
};
LIB.circularArray = (n, def) => {
    const data = new Array(n).fill((def)?def:0);
    return {
        data: data,
        pointer: 0,
        push: function(o){
            this.pointer = (this.pointer + 1) % this.data.length;
            data[this.pointer] = o;
        },
        reduce: function(cb){
            return this.data.reduce(cb);
        },
        length: n
    }
}
LIB.negNormal = (o) => (o > 0) ? 1 : -1;

//Euclidean stuff
LIB.nsew = (o, b) => (b.x > o.x) ? "e" : ((b.x < o.x) ? "w" : ((b.y < o.y) ? "n" : "s"));
LIB.coordinateHashmap = () => {
    return {
        data: {},
        hash: function (o) {
            return o.x + "-" + o.y;
        },
        push: function (o) {
            this.data[this.hash(o)] = o;
        },
        remove: function (o) {
            delete this.data[this.hash(o)]
        },
        contains: function (o) {
            return !!this.data[this.hash(o)]
        },
        forEach: function (callback) {
            this.data.forEach(callback);
        }
    };
};
//todo: description of what is happening here
LIB.getNeighbors = (e, o, n) => {
    const ret = [];
    if (!n) {
        n = 1;
    }

    for (var i = -1 * n; i <= 1 * n; i++) {
        for (var j = -1 * n; j <= 1 * n; j++) {
            var xn = e.x + i;
            var yn = e.y + j;
            if (xn >= 0 && xn < CONF.x && yn >= 0 && yn < CONF.y) {
                if (o[xn] && o[xn][yn] && (Math.abs(i) != Math.abs(j) || n > 1)) {
                    ret.push(o[xn][yn]);
                }
            }
        }
    }
    return ret;
};
LIB.coordinatesInArray = (c, a) => {
    for (i in a) {
        p = a[i];
        if (p.x == c.x && p.y == c.y) {
            return i;
        }
    }
    return -1;
};
LIB.octileDistance = (a, b) => {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return (dx + dy) + LIB.constants["octile"] * Math.min(dx, dy);
}
LIB.manhattanDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
LIB.euclideanDistance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));






