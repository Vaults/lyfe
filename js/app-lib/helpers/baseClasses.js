class BaseClass {
    getClass(){
        return this.constructor.name;
    }
    isClass(c){
        return this.getClass() === c;
    }
 }
class HSB extends BaseClass {
    constructor(hue, sat, bri){
        super();
        this.hue = hue;
        this.sat = sat;
        this.bri = bri;
    }
    toString(){
        return "hsl(" + this.hue + "," + this.sat + "%," + this.bri + "%);"
    }

}
class Tile extends BaseClass {
    constructor(id, x, y, character, clr){
        super();
        this.id = id;
        this.x = x;
        this.y = y;
        this.character = character;
        this.setColor(clr);
        this.isTile = true;
    }
    setColor(clr){
        if(clr) {
            if (typeof clr === "string") {
                this.color = {toString : () => clr};
            }
            else if(clr.getClass() === "HSB"){
                this.color = clr;
            }
        }else{
            this.setColor("lightgreen");
        }
    }
    printParam(){
        const p = {};
        Object.keys(this).forEach((key) => {
            if (typeof this[key] !== "function") {
                p[key] = this[key];
            }
        });
        return $.extend({x: this.x, y: this.y}, p);
    }
    status(){return 1;}

    /**
     * Unfortunately I haven't found a way to check if an instance is subclassing a generic class type.
     * So instead of using that, we'll use functions to determine whether a tile has inherited living or creating.
     * This also allows the opportunity of allowing all combinations.
     */
    living(){return false;}
    creating(){return false;}
}
class LivingTile extends Tile {
    be(grid) {}
    living(){return true;}
}

class CreatingTile extends LivingTile{
    create(){}
    creating(){return true;}
}