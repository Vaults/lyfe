var LIB = {};
LIB.pickRandom = (a) => a[~~(Math.random() * a.length)];
LIB.randNeg = (i) => (LIB.rand(1) == 1) ? i : -i;
LIB.rand = (a, b) => (b) ? (a + Math.round(Math.random() * b)) : Math.round(Math.random() * (a));
LIB.clamp = (a, x, b) => (x < a) ? a : ((x > b) ? b : x);
LIB.eqCoords = (a, b) => a.x == b.x && a.y == b.y;
LIB.trueMod = (n, m) => ((n % m) + m) % m;
LIB.nsew = (o, b) => (b.x > o.x) ? 'e' : ((b.x < o.x) ? 'w' : ((b.y < o.y) ? 'n' : 's'));
LIB.xor = (a,b) => ( a || b ) && !( a && b );
LIB.coordinateHashmap = () => {
    var ret = {
        data: {},
        hash: function(o){return o.x + '-' + o.y;},
        push: function(o){this.data[this.hash(o)] = o;},
        remove: function(o){delete this.data[this.hash(o)]},
        contains: function(o){return !!this.data[this.hash(o)]},
        forall: function(callback){for(key in this.data){this.data[key] = callback(this.data[key])}}
    };
    return ret;
};
LIB.heap = (comp) => ({
        data: [],
        comp: comp,
        swap: function (i, j) {
            var temp = this.data[i];
            this.data[i] = this.data[j];
            this.data[j] = temp;
        },
        bubDown: function (i) {
            l = 2 * i + 1;
            r = l + 1;
            var lg = i;
            if (l < this.data.length && this.comp(this.data[l], this.data[lg])) {
                lg = l;
            }
            if (r < this.data.length && this.comp(this.data[r], this.data[lg])) {
                lg = r;
            }
            if (lg != i) {
                this.swap(lg, i);
                this.bubDown(lg);
            }
        },
        bubUp: function (i) {
            if (i > 0) {
                var p = ~~((i - 1) / 2);
                if (this.comp(this.data[i], this.data[p])) {
                    this.swap(i, p);
                    this.bubUp(p);
                }
            }
        },
        pop: function(){
            if(this.data.length === 0){
                throw new Error("pop on empty heap called!")
            }
            var ret = this.data[0];
            var end = this.data.pop();
            if(this.data.length > 0){
                this.data[0] = end;
                this.bubDown(0);
            }
            return ret;
       },
        push: function(o){
            this.data.push(o);
            this.bubUp(this.data.length - 1);
        },
        contains: (o) => LIB.coordinatesInArray(o, this.data) >= 0,
        size: function(){return this.data.length;},
        rescore: function(o){
            this.bubDown(this.data.indexOf(o));
        }
    });
LIB.yatesShuffle = a => {
    var t = [];
    while(a.length){
        var rI = a[~~(Math.random() * a.length)];
        t.push(a.splice(rI,1)[0]);
    }
    return t;
}
LIB.getNeighbors = (e, o, inv) =>{
    var ret = [];
    for(var i = -1; i <= 1; i++){
        for(var j = -1; j <= 1; j++){
            var xn = e.x + i;
            var yn = e.y + j;
            if(xn >= 0 && xn < CONF.s && yn >= 0 && yn < CONF.s){
                if(o[xn] && LIB.xor(o[xn][yn], inv) && Math.abs(i) != Math.abs(j)){
                    ret.push(o[xn][yn]);
                }
            }
        }
    }
    return ret;
}
LIB.coordinatesInArray = (c, a) => {
    for(i in a){
        p = a[i];
        if(p.x == c.x && p.y == c.y){
            return i;
        }
    }
    return -1;
}
LIB.octileDistance = (a, b) => {
    var d = 1, d2 = Math.sqrt(2); //octile distance
    dx = Math.abs(a.x - b.x);
    dy =  Math.abs(a.y - b.y);
    return d * (dx + dy) + (d2 - 2*d) * Math.min(dx, dy);
}
LIB.manhattanDistance = (a, b) => Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
LIB.euclideanDistance = (a, b) => Math.sqrt(Math.pow(a.x-b.x,2) + Math.pow(a.y-b.y,2));
LIB.entitySequences = {
    currSequence: {
        state: false,
            sequence: '',
            phase: 0,
            maxPhase: -1
    },
    inSequence: function(){
        return this.currSequence.state;
    },
    startSequence: function(f, par){
        var p = this.patterns[f].maxPhase;
        if(p){
            this.currSequence = {
                state: true,
                sequence: f,
                phase: 0,
                maxPhase: p,
                parameters: par
            };
        }else{
            var path = this.patterns[f].f(0, par);
            if(path && path.length > 0) {
                this.currSequence = {
                    state: true,
                    sequence: f,
                    phase: 0,
                    maxPhase: path.length-1,
                    path: path
                };
            }else{
                this.startSequence('moveRandom');
            }

        }
    },
    endSequence: function() {
        this.currSequence = {
            state: false,
            sequence: '',
            phase: 0,
            maxPhase: -1
        }
    },
    incPhase: function() {
        this.currSequence.phase++;
    },
    isDone: function() {
        return this.currSequence.phase >= this.currSequence.maxPhase;
    },
    run: function(c) {
        try {
            var ret;
            if(!this.currSequence.path) {
                ret = this.patterns[this.currSequence.sequence].f(this.currSequence.phase, this.currSequence.parameters);
            }else if(!this.isDone()){
                var node = this.currSequence.path[this.currSequence.phase];
                ret = {x: node.x - c.x, y: node.y - c.y};
            }

            this.incPhase();
            if (this.isDone()) {
                this.endSequence();
            }



            if(Math.abs(ret.x) > 1 || Math.abs(ret.y) > 1){throw "Critter teleported!"}
            return ret;
        }catch(e){
            console.error('SEQUENCE BROKEN, EXCEPTION THROWN');
            console.error('sequence',this.currSequence.sequence,'state', this.currSequence.state, 'this', c, 'modifier', ret, 'parameters', this.currSequence.parameters);
            if(this.currSequence.path){console.error('path',this.currSequence.path, 'phase', this.currSequence.phase, 'maxphase', this.currSequence.maxPhase,  'curr',this.currSequence.path[this.currSequence.phase])}
            throw e;
        }
    },
    patterns: {
        moveBlock: {
        'f': (p, par) => {
            var dirs = {
                "0": {x: 1, y: 0},
                "1": {x: 1, y: 0},
                "2": {x: 0, y: 1},
                "3": {x: 0, y: 1},
                "4": {x: -1, y: 0},
                "5": {x: -1, y: 0},
                "6": {x: 0, y: -1},
                "7": {x: 0, y: -1},
            }
            if(par){ return dirs[p]; }
            return {x: -dirs[p].x, y: -dirs[p].y};
        }, maxPhase: 7
    },
        moveLine: {
            'f': (p, par) => {
                return par;
            }, maxPhase: 5
        },
        moveRandom: {
            'f': (p, par) =>{
                var xfac = 0
                var yfac = 0;
                if (LIB.rand(1 / CONF.moveChance) < 1) {
                    if (LIB.rand(1) > 0) {
                        xfac = LIB.randNeg(LIB.rand(1));
                    } else {
                        yfac = LIB.randNeg(LIB.rand(1));
                    }
                }
                return {x: xfac, y: yfac};
            }, maxPhase: 1
        },
        moveStill:{'f':(p,par)=>({x:0,y:0}),maxPhase:1},
        moveZigzag:{'f':(p,par)=>{
            var dirs=[
                {x:-1, y:0},
                {x:0, y:1},
                {x:1, y:0},
                {x:0, y:-1}
            ];
            var winds = {'w':0,'n':1,'e':2,'s':3};
            var d = winds[par];
            if(p % 4 == 1 || p % 4 == 2){return dirs[d];}
            else{return (p % 4 == 0)?dirs[LIB.trueMod(d-1, 4)]:dirs[(d+1)%4]}
        }, maxPhase:8},
        moveTo: {'f':(p,par)=>{
            // A* woo
            var open = LIB.heap((a,b) => a.f < b.f);
            var closed = LIB.coordinateHashmap();
            
            
            var from = {x: par.from.x, y: par.from.y,f:0, g:0, h:0};
            open.push(from);

            var f = (to) => to.g + to.h;
            var h = (from) => LIB.octileDistance(from, par.to);



            while(open.size() > 0){
                //pop item with smallest f off the queue
                var q = open.pop();

                //Return path if q = dest
                if(LIB.coordinatesInArray(q, [par.to]) >= 0) {
                    var list = [];
                    while (q.p) {
                        list.push(q);
                        q = q.p;
                    }
                    list = list.reverse();
                    return list;
                }

                //add q to closed
                closed.push(q);

                //generate q's successors
                var successors = LIB.getNeighbors(q, par.grid);
                //console.log(successors);
                //loop over successors
                successors.forEach((succ)=>{ //SUCC
                    if(!closed.contains(succ)) {
                        var isVis = succ.visited;
                        var gScore = q.g + 1;
                        if (!succ.visited || gScore < succ.g) {
                            succ.visited = true;
                            succ.p = q;
                            succ.h = succ.h || h(succ);
                            succ.g = gScore;
                            succ.f = f(succ);

                            if (!isVis) {
                                open.push(succ);
                            } else {
                                open.rescore(succ);
                            }
                        }
                    }


                })

            }
            return false;
        }}
    }

};