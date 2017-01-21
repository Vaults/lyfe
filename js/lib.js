var LIB = {};
LIB.pickRandom = (a) => a[~~(Math.random() * a.length)];
LIB.randNeg = (i) => (LIB.rand(1) == 1) ? i : -i;
LIB.rand = (a, b) => (b) ? (a + Math.round(Math.random() * b)) : Math.round(Math.random() * (a));
LIB.clamp = (a, x, b) => (x < a) ? a : ((x > b) ? b : x);
LIB.eqCoords = (a, b) => a.x == b.x && a.y == b.y;
LIB.trueMod = (n, m) => ((n % m) + m) % m;
LIB.nsew = (o, b) => (b.x > o.x) ? 'e' : ((b.x < o.x) ? 'w' : ((b.y < o.y) ? 'n' : 's'));
/*LIB.isEqual =  (a, b) => {
    var check = (a, b) => {
        if (!(a && b)) {  return false; }
        var res = true;
        for (key in a) {
            if (!(typeof a[key] === 'object' || Array.isArray(a[key]))) {
                res = res && a[key] === b[key];
            } else {
                if (a[key] && b[key]) {
                    res = res && check(a[key], b[key]);
                } else {
                    res = false;
                }
            }
        }
        return res;
    };
    return check(b,a) && check(a,b);
};*/
LIB.getNeighbors = (e, o) =>{
    var ret = [];
    for(var i = -1; i <= 1; i++){
        for(var j = -1; j <= 1; j++){
            if(o[e.x + i] && o[e.x+i][e.y+j] && Math.abs(i) != Math.abs(j)){
                ret.push([i,j,o[e.x+i][e.y+j]]);
            }
        }
    }
    return ret;
}
LIB.coordinatesInArray = (c, a) => {
    for(i in a){
        p = a[i];
        if(p.x == c.x && p.y == c.y){
            return p;
        }
    }
    return false;
}


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
        this.currSequence = {
            state: true,
            sequence: f,
            phase: 0,
            maxPhase: p,
            parameters: par
        };
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
        return this.currSequence.phase == this.currSequence.maxPhase;
    },
    run: function() {
        try {
            var ret = this.patterns[this.currSequence.sequence].f(this.currSequence.phase, this.currSequence.parameters);
            this.incPhase();
            if (this.isDone()) {
                this.endSequence();
            }
            return ret;
        }catch(e){
            console.log('SEQUENCE BROKEN, EXCEPTION THROWN');
            console.log('sequence',this.currSequence.sequence,'state', this.currSequence.state);
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
            var open = [];
            var closed = [];
            par.from.g = 0;
            open.push(par.from);
            var f = (to) => to.g + h(to);
            var h = (to) => (Math.abs(par.from.x - to.x) + Math.abs(par.from.y - to.y));
            while(open.length > 0){
                //pop item with smallest f off the queue
                var tq = open.map(f);
                var q = open.splice(tq.indexOf(Math.min.apply(Math, tq)),1)[0];

                if(LIB.coordinatesInArray(q, [par.to])){
                    //return last item in path
                }
                closed.push(q);
                //generate q's successors
                var successors = LIB.getNeighbors(q, par.objs);

                //loop over successors
                successors.forEach((succ)=>{ //SUCC
                    if(succ.x == par.to.x && succ.to.y == par.to.y){} //done succ

                    if(!LIB.coordinatesInArray(succ, closed)){
                        var i = LIB.coordinatesInArray(succ, open);
                        if(!LIB.coordinatesInArray(succ, open)){
                            succ.g = Infinity;
                            open.push(succ);
                        }else if (q.g < succ.g) {
                            succ.p = q;
                            succ.g = q.g + 1;
                        }
                    }


                })

            }
        }, maxPhase: 900}
    }

};