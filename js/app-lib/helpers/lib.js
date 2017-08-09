//todo: Add all LIB to angular services/factories


const LIB = {};
LIB.constants = {
    "alpha" : ["😎", "🙈", "🙊", "🐶", "🐺", "🐱", "🐴", "🐷", "🐹", "🐰", "🐼", "🐻"],
    "octile" : Math.sqrt(2) - 2
};

//We do it this way, just overriding prototype makes JQuery quite livid.
Object.defineProperty(Object.prototype, "keyList", {
    value: function() {
        return Object.keys(this);
    },
    enumerable : false
});
Object.defineProperty(Object.prototype, "values", {
    value: function() {
        return Object.keys(this).map(key => this[key]);
    },
    enumerable : false
});


/* Random generators */
LIB.rand = (a, b) => (b) ? (a + Math.round(Math.random() * (b - a))) : Math.round(Math.random() * (a));
LIB.randNeg = (i) => (LIB.rand(1) === 1) ? i : -i;
LIB.flipCoin = () => LIB.rand(10) < 5;
LIB.randOutOf = (a,b) => LIB.rand(b) <= a;
LIB.pickRandom = (a) => a[~~(Math.random() * a.length)];

/* JS helpers */
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
    contains: (o) => LIB.coordinatesInArray(o, this.data),
    size: function () {
        return this.data.length;
    },
    rescore: function (o) {
        this.bubDown(this.data.indexOf(o));
    }
});
LIB.sortObjectByKeys = (o) => {
    o.keyList().sort().forEach(function(k) {
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
LIB.repeat = (callback, n) => {
    for(let i = 0; i < n; i++){
        callback(i);
    }
};
LIB.catchAndThrow = (error) => {
    return function(...args){
        args.map(o => o || 'UNDEFINED');
        console.error(...args);
        throw error;
    }
}

/* Euclidean stuff */
LIB.nsew = (curr, compare) => (compare.x > curr.x) ? "e" : ((compare.x < curr.x) ? "w" : ((compare.y < curr.y) ? "n" : "s"));
LIB.coordinateHashmap = () => {
    const coordinates = {
        data: {},
    };
    return Object.assign(coordinates, {
        hash: function (o) {
            return o.x + "-" + o.y;
        },
        push: function (o) {
            coordinates.data[this.hash(o)] = o;
        },
        remove: function (o) {
            delete coordinates.data[this.hash(o)]
        },
        contains: function (o) {
            return !!coordinates.data[this.hash(o)]
        },
        forEach: coordinates.data.forEach
    });
};
LIB.getNeighborsAsList = (entity, objects, distance) => {
    //Searches all neighbor spaces to see if they contain a tile
    const ret = [];
    for (let i = -1 * distance; i <= 1 * distance; i++) {
        for (let j = -1 * distance; j <= 1 * distance; j++) {
            const xn = entity.x + i;
            const yn = entity.y + j;
            if (objects[xn] && objects[xn][yn]) {
                ret.push(objects[xn][yn]);
            }
        }
    }
    return ret;
};
LIB.coordinatesInArray = (toCheck, array) => {
    return array.values().some((o) => LIB.eqCoords(toCheck, o));
};
LIB.octileDistance = (a, b) => {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return (dx + dy) + LIB.constants["octile"] * Math.min(dx, dy);
}
LIB.manhattanDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
LIB.euclideanDistance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
LIB.getClosest = function (array, comp) {
    const sort = array.sort((a, b) => LIB.euclideanDistance(comp, a) - LIB.euclideanDistance(comp, b));
    return sort[0];
};
LIB.aStarGrid = function(grid) {
    const node = (x,y) => ({
        x, y,
        f: 0,
        g: 0,
        h: 0,
        visited: false
    });

    return $.extend(true,
        {},
        new Array(CONF.x).fill("")
            .map((o, x) => new Array(CONF.y).fill("")
                .map((o, y) => (grid[x][y]) ? null : node(x,y) )));
};
LIB.successorList = (node) => {
    const list = [];
    while (node.p) {
        list.push(node);
        node = node.p;
    }
    return list.reverse();
};


    /* Game specific helpers */
LIB.handleKeys = (Game) => {
    if (Game.keyList[67]) {
        LIB.clearMap(Game.grid);
    }
    if (Game.keyList[78]) {
        LIB.generateLand(Game);
    }
};





