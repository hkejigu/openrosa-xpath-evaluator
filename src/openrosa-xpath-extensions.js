var openrosa_xpath_extensions = function(translate) {
  var
      MILLIS_PER_DAY = 1000 * 60 * 60 * 24,
      RAW_NUMBER = /^(-?[0-9]+)(\.[0-9]+)?$/,
      DATE_STRING = /^\d\d\d\d-\d\d-\d\d(?:T\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d))?$/,
      XPR = {
        boolean: function(val) { return { t:'bool', v:val }; },
        number: function(val) { return { t:'num', v:val }; },
        string: function(val) { return { t:'str', v:val }; },
        date: function(val) {
          if(!(val instanceof Date)) throw new Error('Cannot create date from ' + val + ' (' + (typeof val) + ')');
          return { t:'date', v:val };
        }
      },
      _zeroPad = function(n, len) {
        len = len || 2;
        n = n.toString();
        while(n.length < len) n = '0' + n;
        return n;
      },
      _num = function(o) {
        return Math.round(o.t === 'num'? o.v: parseFloat(o.v));
      },
      _dateToString = function(d) {
            return d.getFullYear() + '-' + _zeroPad(d.getMonth()+1) + '-' +
                _zeroPad(d.getDate());
      },
      _round = function(num) {
        if(num < 0) {
          return -Math.round(-num);
        }
        return Math.round(num);
      },
      _uuid_part = function(c) {
          var r = Math.random()*16|0,
                  v=c=='x'?r:r&0x3|0x8;
          return v.toString(16);
      },
      _parseDate = function(it) {
        var temp;
        if(it instanceof Date) {
          return new Date(it);
        } else if(RAW_NUMBER.test(it)) {
          // Create a date at 00:00:00 1st Jan 1970 _in the current timezone_
          temp = new Date(1970, 0, 1);
          temp.setDate(1 + parseInt(it, 10));
          return temp;
        } else if(DATE_STRING.test(it)) {
          temp = it.substring(0, 10).split('-');
          temp = new Date(temp[0], temp[1]-1, temp[2]);
          return temp;
        }
      },
      uuid = function() {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                  .replace(/[xy]/g, _uuid_part);
      },
      date = function(it) {
        it = _parseDate(it);
        if(!it) return XPR.string('Invalid Date');
        return XPR.date(it);
      },
      format_date = function(date, format) {
        date = _parseDate(date);
        if(!date) return '';
        var c, i, sb = '', f = {
          year: 1900 + date.getYear(),
          month: 1 + date.getMonth(),
          day: date.getDate(),
          hour: date.getHours(),
          minute: date.getMinutes(),
          second: date.getSeconds(),
          secTicks: date.getTime(),
          dow: date.getDay(),
        };

        for(i=0; i<format.length; ++i) {
          c = format.charAt(i);

          if (c === '%') {
            if(++i >= format.length) {
              throw new Error("date format string ends with %");
            }
            c = format.charAt(i);

            if (c === '%') { // literal '%'
              sb += '%';
            } else if (c === 'Y') {  //4-digit year
              sb += _zeroPad(f.year, 4);
            } else if (c === 'y') {  //2-digit year
              sb += _zeroPad(f.year, 4).substring(2);
            } else if (c === 'm') {  //0-padded month
              sb += _zeroPad(f.month, 2);
            } else if (c === 'n') {  //numeric month
              sb += f.month;
            } else if (c === 'b') {  //short text month
              sb += translate('date.month.' + f.month);
            } else if (c === 'd') {  //0-padded day of month
              sb += _zeroPad(f.day, 2);
            } else if (c === 'e') {  //day of month
              sb += f.day;
            } else if (c === 'H') {  //0-padded hour (24-hr time)
              sb += _zeroPad(f.hour, 2);
            } else if (c === 'h') {  //hour (24-hr time)
              sb += f.hour;
            } else if (c === 'M') {  //0-padded minute
              sb += _zeroPad(f.minute, 2);
            } else if (c === 'S') {  //0-padded second
              sb += _zeroPad(f.second, 2);
            } else if (c === '3') {  //0-padded millisecond ticks (000-999)
              sb += _zeroPad(f.secTicks, 3);
            } else if (c === 'a') {  //Three letter short text day
              sb += translate('date.dayofweek.' + f.dow);
            } else if (c === 'Z' || c === 'A' || c === 'B') {
              throw new Error('unsupported escape in date format string [%' + c + ']');
            } else {
              throw new Error('unrecognized escape in date format string [%' + c + ']');
            }
          } else {
            sb += c;
          }
        }

        return sb;
      },
      func,
      now_and_today = function() { return XPR.date(new Date()); };

  func = {
    'boolean-from-string': function(string) {
      return XPR.boolean(string === '1' || string === 'true');
    },
    coalesce: function(a, b) { return XPR.string(a || b); },
    'count-selected': function(s) {
      var parts = s.split(' '),
          i = parts.length,
          count = 0;
      while(--i >= 0) if(parts[i].length) ++count;
      return XPR.number(count);
    },
    date: date,
    'decimal-date': function(date) {
        return XPR.number(Date.parse(date) / MILLIS_PER_DAY); },
    'difference-in-months': function(d1, d2) {
      // FIXME this is a medic mobile extension, and should be in a corresponding
      // extensions file.
      var months;
      d1 = _parseDate(d1);
      d2 = _parseDate(d2);

      if(!d1 || !d2) return XPR.string('');

      months =
          ((d2.getFullYear() - d1.getFullYear()) * 12) +
          (d2.getMonth() - d1.getMonth()) +
          (d2.getDate() < d1.getDate() ? -1 : 0);
      return XPR.number(months);
    },
    'false': function() { return XPR.boolean(false); },
    'format-date': function(date, format) {
        return XPR.string(format_date(date, format)); },
    'if': function(con, a, b) { return XPR.string(con? a: b); },
    int: function(v) { return XPR.number(parseInt(v, 10)); },
    /*
     * As per https://github.com/alxndrsn/openrosa-xpath-evaluator/issues/15,
     * the pass-through to the wrapped implementation always requests
     * XPathResult.STRING_TYPE.  This seems to cause an issue with the response
     * from `not()` calls, which should ideally be handled by the built-in
     * XPath implementation.  The following method is supplied as a workaround,
     * and ideally would be unnecessary.
     */
    not: function(v) { return XPR.boolean(!v); },
    now: now_and_today,
    pow: function(x, y) { return XPR.number(Math.pow(x, y)); },
    random: function() { return XPR.number(Math.random()); },
    regex: function(haystack, pattern) {
        return XPR.boolean(new RegExp(pattern).test(haystack)); },
    round: function(number, num_digits) {
      number = parseFloat(number);
      num_digits = num_digits ? parseInt(num_digits) : 0;
      if(!num_digits) {
        return XPR.number(_round(number));
      }
      var pow = Math.pow(10, Math.abs(num_digits));
      if(num_digits > 0) {
        return XPR.number(_round(number * pow) / pow);
      } else {
        return XPR.number(pow * _round(number / pow));
      }
    },
    selected: function(haystack, needle) {
        return XPR.boolean(haystack.split(' ').indexOf(needle) !== -1);
    },
    substr: function(string, startIndex, endIndex) {
        return XPR.string(string.slice(startIndex, endIndex)); },
    today: now_and_today,
    'true': function() { return XPR.boolean(true); },
    uuid: function() { return XPR.string(uuid()); },
  };

  // function aliases
  func['date-time'] = func.date;
  func['decimal-date-time'] = func['decimal-date'];
  func['format-date-time'] = func['format-date'];

  return {
    func:func,
    process: {
      toExternalResult: function(r) {
        if(r.t === 'date') return {
          resultType:XPathResult.STRING_TYPE,
          // TODO a bit naughty, but we return both a string and number value
          // for dates.  We should actually know from where the xpath evaluator
          // was initially called whether we expect a STRING_TYPE or NUMBER_TYPE
          // result, but we should get away with it because:
          //   1. this setup makes testing easy
          //   2. dates should never leak outside openrosa functionality anyway
          numberValue:r.v.getTime(),
          stringValue:_dateToString(r.v),
        };
      },
      typefor: function(val) {
        if(val instanceof Date) return 'date';
      },
      handleInfix: function(err, lhs, op, rhs) {
        if(lhs.t === 'date' || rhs.t === 'date') {
          // For comparisons, we must make sure that both values are numbers
          // Dates would be fine, except for equality!
          if( op.v === '=' ||
              op.v === '<' ||
              op.v === '>' ||
              op.v === '<=' ||
              op.v === '>=' ||
              op.v === '!=') {
            if(lhs.t === 'str') lhs = date(lhs.v);
            if(rhs.t === 'str') rhs = date(rhs.v);
            if(lhs.t !== 'date' || rhs.t !== 'date') {
              return op.v === '!=';
            } else {
              lhs = { t:'num', v:lhs.v.getTime() };
              rhs = { t:'num', v:rhs.v.getTime() };
            }
          } else if(op.v === '+' || op.v === '-') {
            // for math operators, we need to do it ourselves
            if(lhs.t === 'date' && rhs.t === 'date') err();
            var d = lhs.t === 'date'? lhs.v: rhs.v,
                n = lhs.t !== 'date'? _num(lhs): _num(rhs),
                res = new Date(d.getTime());
            if(op.v === '-') n = -n;
            res.setDate(d.getDate() + n);
            return res;
          }
          return { t:'continue', lhs:lhs, op:op, rhs:rhs };
        }
      },
    },
  };
};

if(typeof define === 'function') {
  define(function() { return openrosa_xpath_extensions; });
} else if(typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = openrosa_xpath_extensions;
}
