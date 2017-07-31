export default function replaceAll(str, mapObj){
  var re = new RegExp(Object.keys(mapObj).join("|"),"gi");

  return str.replace(re, function(matched){
    return mapObj[matched.toLowerCase()];
  });
}

// provided by:
// https://stackoverflow.com/questions/15604140/replace-multiple-strings-with-multiple-other-strings
