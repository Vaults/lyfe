angular.module('life').controller('testCtrl', function($scope){
	var s = 40;
	var alpha = ['a','b','c']
	var random=function(o){return alpha[~~(alpha.length*Math.random())]}
	
	$scope.field = new Array(s).fill('').map(o=>new Array(s).fill(' ').map(random));
	console.log($scope.field);
})