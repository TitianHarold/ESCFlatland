(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandPalette=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Edit the existing colors here and reload; geometry and animation stay elsewhere.
  const palette={
    paper:'#f5f1e6',white:'#ffffff',black:'#000000',blue:'#0754ee',ink:'#121d2f',navy:'#102b5a',deep:'#112743',
    night:'#241936',teal:'#519fb3',lavender:'#ae96cf',coral:'#ee9884',gold:'#edbf70',
    industrial:'#121723',conveyor:'#ede8dc',metal:'#d2d1c6',line:'#d6d7d0',quiet:'#68757f',warning:'#dc6a58',
    cyan:'#49a8bd',lilac:'#ad91c7',cream:'#f3dfb6',leafVein:'#b0cbb6',mathTangent:'#795c93'
  };
  palette.outside={background:palette.white,wall:palette.industrial};
  palette.factory={
    floor:'#e4dfd3',outline:palette.outside.wall,conveyorEdge:'#b4b5aa',roller:'#c6c6ba',
    disk:'#6e746f',diskMark:'#626a66',aisle:'#c3c2b7',fatigue:'#526287',
    workers:['#649aab','#a691bd',palette.blue,'#ca8c78']
  };
  // Preserve the selected depth scene's warmer paper and material pigments.
  palette.dimension={
    paper:'#f5edda',blue:palette.blue,ink:'#211a35',teal:'#559eae',
    lilac:'#ad94c7',coral:'#dd917f',gold:'#edc57b'
  };
  // Face-color triples are [top, front, side].
  palette.street={
    road:'#14366c',curb:['#dbcba7','#31517c','#23477c'],
    pavingVertical:'#d9cfb9',pavingHorizontal:'#d7c9ab',
    building:['#286ac2','#124d9b','#103574'],window:'#182e5b',windowTrim:'#d7ab75',sunPatch:'#e3ba80',groundShadow:'#14376a',
    benchSeat:['#29527c','#183d66','#14325a'],benchBack:['#315f89','#1d4871','#153554'],benchLeg:['#21405e','#193751','#112d48'],
    trunk:['#a78053','#8e6b46','#725139'],foliage:['#315d73','#426f79','#285474','#173e68','#577d76','#214a70'],foliageBottom:'#234a64',
    sheetShadow:'#16345d',crack:'#111524',crackEdge:'#c5b9bd',lightCore:'#f8e8b9'
  };
  return palette;
});
