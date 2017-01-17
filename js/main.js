var pickRandom = (a) => a[~~(a.length * Math.random())];

angular.module('life', []).controller('testCtrl', function($scope){
	var s = 69;
    var critterChance = 0.1;

    var tile = (c,cl, x, y) => ({
        char: c, col: cl, x: x, y: y,
    });
    var critter = (c,cl,x,y)=> $.extend(tile(c,cl), {});
	var alpha = [
        {char:'x',col:'red'},
        {char:'o',col:'blue'},
        {char:'a',col:'purple'}];

    var randomTile = (x, y) => {
        if(Math.random() > 0.1){
            return tile(' ', ' ', x, y);
        }
        var a = pickRandom(alpha);
        return critter(a.char, a.col, x, y);
    };

	
	$scope.field = new Array(s).fill('').map(
        (o,x) => new Array(s).fill('').map(
            (o,y) =>  randomTile(x, y)
        )
    );



	console.log($scope.field);
})