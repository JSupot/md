// function stringMatch(str_a, str_b) {
//   const parentLength = str_a.length;
//   const childLength = str_b.length;
//   let start = 0;
//   let matchLength = 0;

//   for (let i = 0; i < parentLength; i++) {
//     for (let j = 0; j < childLength; j++) {
//       if (str_a[i + j] === str_b[j]) {
//         matchLength += 1;
//       }
//     }

//     if (matchLength === childLength) {
//       return i;
//     } else {
//       matchLength = 0;
//     }
//   }

//   return -1;
// }

function stringMatch(str_a, str_b) {
  const parentLength = str_a.length;
  const childLength = str_b.length;
  let childHash = hash(str_b);
  let parentHash = hash(str_a.substr(0, childLength));

  for (let i = 0; i < parentLength - childLength + 1; i++) {
    if (childHash === parentHash && compare(str_a, i, str_b)) {
      return (i + 0);
    }

    if (i < parentLength - childLength - 1) {
      parentHash = nextHash(str_a, parentHash, i + 1, i + 1 + childLength);
    }

  }

  return -1;
}

function hash(str) {
  let hashCode = 0;

  for (let i = 0, l = str.length; i < l; i++) {
    hashCode += str[i].charCodeAt();
  }
  return hashCode;
}

function nextHash(str, hash, start, end) {
  const preHash = hash - str[start].charCodeAt();

  return (preHash + str[end].charCodeAt());
}

function compare(str, index, pattern) {
  return str.substr(index, pattern.length) === pattern;
}

var a = 'abcdefgh';
var b = 'def';

console.log(stringMatch(a, b))