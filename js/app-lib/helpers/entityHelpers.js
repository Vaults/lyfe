/**
 * Tile moving sequences & animations
 */
const sequenceBuild = (execute, maxPhase, path) => {
    return {
        execute,
        maxPhase,
        path,
    };
};

class Sequence extends BaseClass {

    constructor() {
        super();
        this.state = this.initSequence();
        this.patterns = {};
    }

    initSequence(seq) {
        return Object.assign({
            running: false,
            sequence: '',
            phase: 0,
            maxPhase: -1
        }, seq);
    }

    inSequence() {
        return this.state.running;
    }

    startSequence(sequenceName, par) {
        const sequence = this.patterns[sequenceName];
        if (!sequence) {
            throw "Sequence " + sequenceName + " does not exist!";
        }

        let maxPhase = sequence.maxPhase;
        const hasPath = sequence.path;

        if (hasPath) {
            const trail = sequence.execute(0, par);
            if (trail.length > 0) {
                this.state = this.initSequence({
                    running: true,
                    sequence: sequenceName,
                    maxPhase: trail.length - 1,
                    path: trail,
                });
            }
        } else {
            if (!maxPhase) {
                maxPhase = Infinity;
            }
            this.state = this.initSequence({
                running: true,
                sequence: sequenceName,
                maxPhase: maxPhase,
                parameters: par
            });
        }
        return true;
    }

    endSequence() {
        this.startSequence("default");
    }

    incPhase() {
        this.state.phase++;
    }

    isDone() {
        return this.state.phase >= this.state.maxPhase;
    }

    sequenceName() {
        return this.state.sequence;
    }

    runSpec(critter) {
    }

    run(critter) {
        let ret;
        try {
            if (!this.inSequence()) {
                this.startSequence('default');
                return this.run(critter);
            }

            ret = this.runSpec(critter);

            this.incPhase();
            if (this.isDone()) {
                this.endSequence();
            }

            return ret;

        } catch (e) {
            if(!this.patterns[this.sequenceName()].path) {
                LIB.catchAndThrow(e)('Sequence Broken!', this.sequenceName(), 'state', this.state.running, 'this', critter, 'modifier', ret, 'parameters', this.state.parameters);
            }else {
                LIB.catchAndThrow(e)('path', this.state.path, 'phase', this.state.phase, 'maxphase', this.state.maxPhase, 'curr', this.state.path[this.state.phase], 'parameters', this.state.parameters, 'running', this.state.running);
            }
        }
    }

};

class AnimationSequence extends Sequence {
    constructor() {
        super();
        this.patterns = {
            default: sequenceBuild(() => ""),
            shaking: sequenceBuild(() => `animation-name: shaking;
                                          animation-duration: 0.3s;
                                          animation-iteration-count: infinite;
                                          animation-timing-function: linear;`),
            rotating: sequenceBuild(() =>  `animation-name: rotating; 
                                            animation-duration: 0.3s;
                                            transform-origin:50% 50%; 
                                            animation-iteration-count: infinite;
                                            animation-timing-function: linear;`)
        }
    }

    runSpec(critter) {
        const def = `opacity: ${critter.state.opacity}; transform: rotate(${critter.state.rotation}deg);`;
        const sequence = this.patterns[this.sequenceName()];
        return def + sequence.execute();
    }

}

class CritterSequence extends Sequence {
    constructor() {
        super();
        this.patterns = {
            moveBlock: sequenceBuild((phase, par) => {
                const dirs = {
                    "0": {x: 1, y: 0},
                    "1": {x: 1, y: 0},
                    "2": {x: 0, y: 1},
                    "3": {x: 0, y: 1},
                    "4": {x: -1, y: 0},
                    "5": {x: -1, y: 0},
                    "6": {x: 0, y: -1},
                    "7": {x: 0, y: -1},
                };
                return (par) ? dirs[phase] : {x: -dirs[phase].x, y: -dirs[phase].y};
            }, 7),
            moveLine: sequenceBuild((_, par) => par, 5),
            default: sequenceBuild(() => {
                let xfac = 0;
                let yfac = 0;
                if (LIB.randOutOf(1, 5)) {
                    if (LIB.flipCoin()) {
                        xfac = LIB.randNeg(LIB.rand(1));
                    } else {
                        yfac = LIB.randNeg(LIB.rand(1));
                    }
                }
                return {x: xfac, y: yfac};
            }, 1),
            moveStill: sequenceBuild((phase, _) => {
                return {x: 0, y: 0};
            }, 100),
            moveZigzag: sequenceBuild((phase, par) => {
                const dirs = [
                    {x: -1, y: 0},
                    {x: 0, y: 1},
                    {x: 1, y: 0},
                    {x: 0, y: -1}
                ];
                const winds = {'w': 0, 'n': 1, 'e': 2, 's': 3};
                const d = winds[par];
                if (phase % 4 === 1 || phase % 4 === 2) {
                    return dirs[d];
                }
                else {
                    return (phase % 4 === 0) ? dirs[LIB.trueMod(d - 1, 4)] : dirs[(d + 1) % 4]
                }
            }, 8),
            moveTo: sequenceBuild((_, par) => {
                // A* woo
                const open = LIB.heap((a, b) => a.f < b.f);
                const closed = LIB.coordinateHashmap();

                const from = {x: par.from.x, y: par.from.y, f: 0, g: 0, h: 0};
                const to = {x: par.to.x, y: par.to.y, f: 0, g: 0, h: 0};
                const grid = LIB.aStarGrid(par.grid);
                grid[to.x][to.y] = to;
                open.push(from);


                const f = (to) => to.g + to.h;
                const h = (from) => LIB.octileDistance(from, to);

                let q = null;

                while (open.size() > 0) {
                    //pop item with smallest f off the queue (we use a heap, remember?)
                    q = open.pop();

                    //Return path if q = dest
                    if (LIB.eqCoords(q, to)) {
                        const successorList = LIB.successorList(q);
                        if (par.to.isTile) {
                            successorList.pop();
                        }
                        return successorList;
                    }

                    //add q to closed
                    closed.push(q);

                    /*
                     * how many references of SUCC are you on
                     * like 5 or 6 my dude
                     * you are like a little baby watch this ( ͡° ͜ʖ ͡°)
                     */

                    //generate q's successors
                    //neighbors also gets diagonals, we filter those out

                    const neighbors = LIB.getNeighborsAsList(q, grid, 1);
                    const successors = neighbors.filter(succ => LIB.euclideanDistance(q, succ) === 1); //SUCC
                    //loop over successors
                    successors.forEach((succ) => {
                        if (!closed.contains(succ)) {
                            const isVisited = succ.visited;
                            const gScore = q.g + 1;
                            if (!succ.visited || gScore < succ.g) {
                                succ.visited = true;
                                succ.p = q;
                                succ.h = succ.h || h(succ);
                                succ.g = gScore;
                                succ.f = f(succ);

                                if (!isVisited) {
                                    open.push(succ);
                                } else {
                                    open.rescore(succ);
                                }
                            }
                        }


                    })

                }
                console.error("from",from, "to",to, "q",q, "dis",LIB.euclideanDistance(to,q),"list");
                console.error(JSON.stringify(LIB.successorList(q).map(o => ({x:o.x,y:o.y}))));
                throw new Error("Wait a minute... what?");
            }, NaN, true)
        }
    }

    runSpec(critter) {
        let ret;
        if (!this.state.path) {
            ret = this.patterns[this.sequenceName()].execute(this.state.phase, this.state.parameters);
        } else {
            const node = this.state.path[this.state.phase];
            ret = {x: node.x - critter.x, y: node.y - critter.y};
        }

        if (Math.abs(ret.x) + Math.abs(ret.y) > 1) {
            throw "Critter teleported!";
        }
        return ret;
    }
}