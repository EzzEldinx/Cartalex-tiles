export function Capitalize(str){
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function Uncapitalize(str1){
    return str1.charAt(0).toLowerCase() + str1.slice(1);
  }
export function isOnlyLetters(str){
    if (str != null){
        return /^[ a-zA-ZÀ-ÿ\u00f1\u00d1]*$/g.test(str)
    } else {
        return false
    }
}
export function getShortest(arrays){
    if (arrays.length == 1){
        return arrays[0];
    }
    let bigArray = new Array(1000).fill(0);
    let smallArray = bigArray;
    for (let array of arrays){
        smallArray = array.length < smallArray.length ? array : smallArray;
    }
    return smallArray;
}