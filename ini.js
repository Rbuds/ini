exports.parse = exports.decode = decode
exports.stringify = exports.encode = encode

exports.safe = safe
exports.unsafe = unsafe

var eol = process.platform === 'win32' ? '\r\n' : '\n'

/**basically mimics the .stringify functionality**/
/**encodes an object into a {string} with ini-style formatting**/
/**@param {object} with or without sections**/
/**@returns resulting {object} or operation**/
function encode (obj, opt) {
  var children = []
  var out = ''

  if (typeof opt === 'string') { /**checking if opt is a string otherwise notes whitespace**/
    opt = {
      section: opt,
      whitespace: false
    }
  } else {
    opt = opt || {}
    opt.whitespace = opt.whitespace === true 
  }

  var separator = opt.whitespace ? ' = ' : '=' /**removing whitespace**/

  Object.keys(obj).forEach(function (k, _, __) { /**checks {objects} for section presence**/
    var val = obj[k]
    if (val && Array.isArray(val)) { /**parent properties are added to top-level {objects} and children if section attribute is available**/
      val.forEach(function (item) {
        out += safe(k + '[]') + separator + safe(item) + '\n' /**adds top-level properties to all {objects}**/
      })
    } else if (val && typeof val === 'object') { /**passes {object} to child level**/
      children.push(k)
    } else {
      out += safe(k) + separator + safe(val) + eol
    }
  })

  if (opt.section && out.length) {
    out = '[' + safe(opt.section) + ']' + eol + out
  }

  children.forEach(function (k, _, __) { /**prepends properties to child {objects}**/
    var nk = dotSplit(k).join('\\.')
    var section = (opt.section ? opt.section + '.' : '') + nk
    var child = encode(obj[k], {
      section: section,
      whitespace: opt.whitespace
    })
    if (out.length && child.length) {
      out += eol
    }
    out += child
  })

  return out
}

/**@returns reformatted {string} key/value with hexidecimal encoding**/
/**@params must provide valid {string} with no spaces**/
function dotSplit (str) {
  return str.replace(/\1/g, '\u0002LITERAL\\1LITERAL\u0002')
    .replace(/\\\./g, '\u0001')
    .split(/\./).map(function (part) {
    return part.replace(/\1/g, '\\.')
      .replace(/\2LITERAL\\1LITERAL\2/g, '\u0001')
  })
}

/**mimics the .parse functionality**/
/**decodes the ini-style formatted {string} into a nested {object}**/
/**given {string} must be proper ini-style format**/
function decode (str) {
  var out = {}
  var p = out
  var section = null
  /**         section     |key      = value**/
  var re = /^\[([^\]]*)\]$|^([^=]+)(=(.*))?$/i
  var lines = str.split(/[\r\n]+/g) /**separates document into individual lines**/

  lines.forEach(function (line, _, __) {
    if (!line || line.match(/^\s*[;#]/)) return /**not sure if this is valid syntax**/
    var match = line.match(re)
    if (!match) return
    if (match[1] !== undefined) {
      section = unsafe(match[1])
      p = out[section] = out[section] || {}
      return
    }
    var key = unsafe(match[2])
    var value = match[3] ? unsafe((match[4] || '')) : true
    switch (value) {
      case 'true':
      case 'false':
      case 'null': value = JSON.parse(value)
    }

    /**Convert keys with '[]' suffix to an array**/
    if (key.length > 2 && key.slice(-2) === '[]') {
      key = key.substring(0, key.length - 2)
      if (!p[key]) {
        p[key] = []
      } else if (!Array.isArray(p[key])) {
        p[key] = [p[key]]
      }
    }

    /**safeguard against resetting a previously defined**/
    /**array by accidentally forgetting the brackets**/
    if (Array.isArray(p[key])) {
      p[key].push(value)
    } else {
      p[key] = value
    }
  })

  /**{a:{y:1},"a.b":{x:2}} --> {a:{y:1,b:{x:2}}}**/
  /**use a filter to @returns the keys that have to be deleted.**/
  Object.keys(out).filter(function (k, _, __) {
    if (!out[k] ||
      typeof out[k] !== 'object' ||
      Array.isArray(out[k])) {
      return false
    }
    /**see if the parent section is also an {object}.**/
    /**if so, add it to that, and mark this one for deletion**/
    var parts = dotSplit(k)
    var p = out
    var l = parts.pop()
    var nl = l.replace(/\\\./g, '.')
    parts.forEach(function (part, _, __) {
      if (!p[part] || typeof p[part] !== 'object') p[part] = {}
      p = p[part]
    })
    if (p === out && nl === l) {
      return false
    }
    p[nl] = out[k]
    return true
  }).forEach(function (del, _, __) {
    delete out[del]
  })

  return out
}

/**@returns boolean whether val is a quoted {string}**/
function isQuoted (val) {
  return (val.charAt(0) === '"' && val.slice(-1) === '"') || /**checking first and last characters**/
    (val.charAt(0) === "'" && val.slice(-1) === "'")
}

/**strips quotes to make safe for use as key or value**/
/**@returns sanitized string**/
function safe (val) {
  return (typeof val !== 'string' ||
    val.match(/[=\r\n]/) ||
    val.match(/^\[/) ||
    (val.length > 1 &&
     isQuoted(val)) ||
    val !== val.trim()) ?
      JSON.stringify(val) :
      val.replace(/;/g, '\\;').replace(/#/g, '\\#')
}

/**reformats and @returns unsafe val unescaped**/
function unsafe (val, doUnesc) {
  val = (val || '').trim()
  if (isQuoted(val)) {
    /**remove the single quotes before calling JSON.parse**/
    if (val.charAt(0) === "'") {
      val = val.substr(1, val.length - 2)
    }
    try { val = JSON.parse(val) } catch (_) {} /**attempts JSON parse**/
  } else {
    /**walk the val to find the first not-escaped ; character**/
    var esc = false
    var unesc = ''
    for (var i = 0, l = val.length; i < l; i++) {
      var c = val.charAt(i)
      if (esc) {
        if ('\\;#'.indexOf(c) !== -1) {
          unesc += c
        } else {
          unesc += '\\' + c
        }
        esc = false
      } else if (';#'.indexOf(c) !== -1) {
        break
      } else if (c === '\\') {
        esc = true
      } else {
        unesc += c
      }
    }
    if (esc) {
      unesc += '\\'
    }
    return unesc
  }
  return val
}