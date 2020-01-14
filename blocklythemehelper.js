const BRIGHTNESS_VAL = .65 * 255
const LIGHT_FACTOR = .05
const DARK_FACTOR = .1

function blend(rgb1, rgb2, factor){
   factor = Math.max(Math.min(factor, 1), 0)
   return [
      Math.round(rgb2[0] + factor * (rgb1[0] - rgb2[0])),
      Math.round(rgb2[1] + factor * (rgb1[1] - rgb2[1])),
      Math.round(rgb2[2] + factor * (rgb1[2] - rgb2[2]))
   ]
}


function lighten(rgb, factor){
   white = [255, 255, 255]
   return blend(white, rgb, factor)
}


function darken(rgb, factor){
   black = [0, 0, 0];
   return blend(black, rgb, factor)
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  function rgbToHex(rgb) {      
    return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
  }
  

function findOtherColours(rgb){
   colourPrimary = rgbToHex(rgb)
   colourSecondary = rgbToHex(darken(rgb, LIGHT_FACTOR))
   colourTertiary = rgbToHex(darken(rgb, DARK_FACTOR))
   return JSON.stringify({
      "colourPrimary": colourPrimary,
      "colourSecondary": colourSecondary,
      "colourTertiary": colourTertiary
   })
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
     ] : null;
}

function print(name, hex){
    console.log( `"${name}":${findOtherColours(hexToRgb(hex))},`)
}

print("colour_blocks", "#CF63CF")
print("list_blocks", "#5CB1D6")
print("logic_blocks", "#FFAB19")
print("loop_blocks", "#FFBF00")
print("math_blocks", "#4C97FF")
print("procedure_blocks", "#FF6680")
print("text_blocks", "#BBBBCA")
print("variable_blocks", "#59C059")
print("variable_dynamic_blocks", "#0FBD8C")
print("hat_blocks", "#AAAAAA")

