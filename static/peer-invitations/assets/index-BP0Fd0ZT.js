var e = Object.defineProperty,
  t = Object.getOwnPropertyDescriptor,
  n = Object.getOwnPropertyNames,
  r = Object.prototype.hasOwnProperty,
  i = (e, t, n) => () => {
    if (n) throw n[0];
    try {
      return e && (t = e((e = 0))), t;
    } catch (e) {
      throw ((n = [e]), e);
    }
  },
  a = (e, t) => () => (
    t || (e((t = { exports: {} }).exports, t), (e = null)), t.exports
  ),
  o = (t, n) => {
    let r = {};
    for (var i in t) e(r, i, { get: t[i], enumerable: !0 });
    return n || e(r, Symbol.toStringTag, { value: `Module` }), r;
  },
  s = (i, a, o, s) => {
    if ((a && typeof a == `object`) || typeof a == `function`)
      for (var c = n(a), l = 0, u = c.length, d; l < u; l++)
        (d = c[l]),
          !r.call(i, d) &&
            d !== o &&
            e(i, d, {
              get: ((e) => a[e]).bind(null, d),
              enumerable: !(s = t(a, d)) || s.enumerable,
            });
    return i;
  },
  c = (t) =>
    r.call(t, `module.exports`)
      ? t[`module.exports`]
      : s(e({}, `__esModule`, { value: !0 }), t);
(function () {
  let e = document.createElement(`link`).relList;
  if (e && e.supports && e.supports(`modulepreload`)) return;
  for (let e of document.querySelectorAll(`link[rel="modulepreload"]`)) n(e);
  new MutationObserver((e) => {
    for (let t of e)
      if (t.type === `childList`)
        for (let e of t.addedNodes)
          e.tagName === `LINK` && e.rel === `modulepreload` && n(e);
  }).observe(document, { childList: !0, subtree: !0 });
  function t(e) {
    let t = {};
    return (
      e.integrity && (t.integrity = e.integrity),
      e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy),
      (t.credentials =
        e.crossOrigin === `use-credentials`
          ? `include`
          : e.crossOrigin === `anonymous`
            ? `omit`
            : `same-origin`),
      t
    );
  }
  function n(e) {
    if (e.ep) return;
    e.ep = !0;
    let n = t(e);
    fetch(e.href, n);
  }
})();
var l = o({
  __addDisposableResource: () => P,
  __assign: () => L,
  __asyncDelegator: () => O,
  __asyncGenerator: () => D,
  __asyncValues: () => k,
  __await: () => E,
  __awaiter: () => v,
  __classPrivateFieldGet: () => j,
  __classPrivateFieldIn: () => N,
  __classPrivateFieldSet: () => M,
  __createBinding: () => R,
  __decorate: () => f,
  __disposeResources: () => re,
  __esDecorate: () => m,
  __exportStar: () => b,
  __extends: () => u,
  __generator: () => y,
  __importDefault: () => ne,
  __importStar: () => A,
  __makeTemplateObject: () => te,
  __metadata: () => _,
  __param: () => p,
  __propKey: () => g,
  __read: () => S,
  __rest: () => d,
  __rewriteRelativeImportExtension: () => F,
  __runInitializers: () => h,
  __setFunctionName: () => ee,
  __spread: () => C,
  __spreadArray: () => T,
  __spreadArrays: () => w,
  __values: () => x,
  default: () => H,
});
function u(e, t) {
  if (typeof t != `function` && t !== null)
    throw TypeError(
      `Class extends value ` + String(t) + ` is not a constructor or null`,
    );
  I(e, t);
  function n() {
    this.constructor = e;
  }
  e.prototype =
    t === null ? Object.create(t) : ((n.prototype = t.prototype), new n());
}
function d(e, t) {
  var n = {};
  for (var r in e)
    Object.prototype.hasOwnProperty.call(e, r) &&
      t.indexOf(r) < 0 &&
      (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == `function`)
    for (var i = 0, r = Object.getOwnPropertySymbols(e); i < r.length; i++)
      t.indexOf(r[i]) < 0 &&
        Object.prototype.propertyIsEnumerable.call(e, r[i]) &&
        (n[r[i]] = e[r[i]]);
  return n;
}
function f(e, t, n, r) {
  var i = arguments.length,
    a =
      i < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, n)) : r,
    o;
  if (typeof Reflect == `object` && typeof Reflect.decorate == `function`)
    a = Reflect.decorate(e, t, n, r);
  else
    for (var s = e.length - 1; s >= 0; s--)
      (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
  return i > 3 && a && Object.defineProperty(t, n, a), a;
}
function p(e, t) {
  return function (n, r) {
    t(n, r, e);
  };
}
function m(e, t, n, r, i, a) {
  function o(e) {
    if (e !== void 0 && typeof e != `function`)
      throw TypeError(`Function expected`);
    return e;
  }
  for (
    var s = r.kind,
      c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
      l = !t && e ? (r.static ? e : e.prototype) : null,
      u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
      d,
      f = !1,
      p = n.length - 1;
    p >= 0;
    p--
  ) {
    var m = {};
    for (var h in r) m[h] = h === `access` ? {} : r[h];
    for (var h in r.access) m.access[h] = r.access[h];
    m.addInitializer = function (e) {
      if (f)
        throw TypeError(
          `Cannot add initializers after decoration has completed`,
        );
      a.push(o(e || null));
    };
    var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
    if (s === `accessor`) {
      if (g === void 0) continue;
      if (typeof g != `object` || !g) throw TypeError(`Object expected`);
      (d = o(g.get)) && (u.get = d),
        (d = o(g.set)) && (u.set = d),
        (d = o(g.init)) && i.unshift(d);
    } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
  }
  l && Object.defineProperty(l, r.name, u), (f = !0);
}
function h(e, t, n) {
  for (var r = arguments.length > 2, i = 0; i < t.length; i++)
    n = r ? t[i].call(e, n) : t[i].call(e);
  return r ? n : void 0;
}
function g(e) {
  return typeof e == `symbol` ? e : `${e}`;
}
function ee(e, t, n) {
  return (
    typeof t == `symbol` && (t = t.description ? `[${t.description}]` : ``),
    Object.defineProperty(e, "name", {
      configurable: !0,
      value: n ? `${n} ${t}` : t,
    })
  );
}
function _(e, t) {
  if (typeof Reflect == `object` && typeof Reflect.metadata == `function`)
    return Reflect.metadata(e, t);
}
function v(e, t, n, r) {
  function i(e) {
    return e instanceof n
      ? e
      : new n(function (t) {
          t(e);
        });
  }
  return new (n ||= Promise)(function (n, a) {
    function o(e) {
      try {
        c(r.next(e));
      } catch (e) {
        a(e);
      }
    }
    function s(e) {
      try {
        c(r.throw(e));
      } catch (e) {
        a(e);
      }
    }
    function c(e) {
      e.done ? n(e.value) : i(e.value).then(o, s);
    }
    c((r = r.apply(e, t || [])).next());
  });
}
function y(e, t) {
  var n = {
      label: 0,
      sent: function () {
        if (a[0] & 1) throw a[1];
        return a[1];
      },
      trys: [],
      ops: [],
    },
    r,
    i,
    a,
    o = Object.create(
      (typeof Iterator == `function` ? Iterator : Object).prototype,
    );
  return (
    (o.next = s(0)),
    (o.throw = s(1)),
    (o.return = s(2)),
    typeof Symbol == `function` &&
      (o[Symbol.iterator] = function () {
        return this;
      }),
    o
  );
  function s(e) {
    return function (t) {
      return c([e, t]);
    };
  }
  function c(s) {
    if (r) throw TypeError(`Generator is already executing.`);
    for (; o && ((o = 0), s[0] && (n = 0)), n; )
      try {
        if (
          ((r = 1),
          i &&
            (a =
              s[0] & 2
                ? i.return
                : s[0]
                  ? i.throw || ((a = i.return) && a.call(i), 0)
                  : i.next) &&
            !(a = a.call(i, s[1])).done)
        )
          return a;
        switch (((i = 0), a && (s = [s[0] & 2, a.value]), s[0])) {
          case 0:
          case 1:
            a = s;
            break;
          case 4:
            return n.label++, { value: s[1], done: !1 };
          case 5:
            n.label++, (i = s[1]), (s = [0]);
            continue;
          case 7:
            (s = n.ops.pop()), n.trys.pop();
            continue;
          default:
            if (
              ((a = n.trys),
              !(a = a.length > 0 && a[a.length - 1]) &&
                (s[0] === 6 || s[0] === 2))
            ) {
              n = 0;
              continue;
            }
            if (s[0] === 3 && (!a || (s[1] > a[0] && s[1] < a[3]))) {
              n.label = s[1];
              break;
            }
            if (s[0] === 6 && n.label < a[1]) {
              (n.label = a[1]), (a = s);
              break;
            }
            if (a && n.label < a[2]) {
              (n.label = a[2]), n.ops.push(s);
              break;
            }
            a[2] && n.ops.pop(), n.trys.pop();
            continue;
        }
        s = t.call(e, n);
      } catch (e) {
        (s = [6, e]), (i = 0);
      } finally {
        r = a = 0;
      }
    if (s[0] & 5) throw s[1];
    return { value: s[0] ? s[1] : void 0, done: !0 };
  }
}
function b(e, t) {
  for (var n in e)
    n !== "default" &&
      !Object.prototype.hasOwnProperty.call(t, n) &&
      R(t, e, n);
}
function x(e) {
  var t = typeof Symbol == `function` && Symbol.iterator,
    n = t && e[t],
    r = 0;
  if (n) return n.call(e);
  if (e && typeof e.length == `number`)
    return {
      next: function () {
        return (
          e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }
        );
      },
    };
  throw TypeError(
    t ? `Object is not iterable.` : `Symbol.iterator is not defined.`,
  );
}
function S(e, t) {
  var n = typeof Symbol == `function` && e[Symbol.iterator];
  if (!n) return e;
  var r = n.call(e),
    i,
    a = [],
    o;
  try {
    for (; (t === void 0 || t-- > 0) && !(i = r.next()).done; ) a.push(i.value);
  } catch (e) {
    o = { error: e };
  } finally {
    try {
      i && !i.done && (n = r.return) && n.call(r);
    } finally {
      if (o) throw o.error;
    }
  }
  return a;
}
function C() {
  for (var e = [], t = 0; t < arguments.length; t++)
    e = e.concat(S(arguments[t]));
  return e;
}
function w() {
  for (var e = 0, t = 0, n = arguments.length; t < n; t++)
    e += arguments[t].length;
  for (var r = Array(e), i = 0, t = 0; t < n; t++)
    for (var a = arguments[t], o = 0, s = a.length; o < s; o++, i++)
      r[i] = a[o];
  return r;
}
function T(e, t, n) {
  if (n || arguments.length === 2)
    for (var r = 0, i = t.length, a; r < i; r++)
      (a || !(r in t)) &&
        ((a ||= Array.prototype.slice.call(t, 0, r)), (a[r] = t[r]));
  return e.concat(a || Array.prototype.slice.call(t));
}
function E(e) {
  return this instanceof E ? ((this.v = e), this) : new E(e);
}
function D(e, t, n) {
  if (!Symbol.asyncIterator)
    throw TypeError(`Symbol.asyncIterator is not defined.`);
  var r = n.apply(e, t || []),
    i,
    a = [];
  return (
    (i = Object.create(
      (typeof AsyncIterator == `function` ? AsyncIterator : Object).prototype,
    )),
    s(`next`),
    s(`throw`),
    s(`return`, o),
    (i[Symbol.asyncIterator] = function () {
      return this;
    }),
    i
  );
  function o(e) {
    return function (t) {
      return Promise.resolve(t).then(e, d);
    };
  }
  function s(e, t) {
    r[e] &&
      ((i[e] = function (t) {
        return new Promise(function (n, r) {
          a.push([e, t, n, r]) > 1 || c(e, t);
        });
      }),
      t && (i[e] = t(i[e])));
  }
  function c(e, t) {
    try {
      l(r[e](t));
    } catch (e) {
      f(a[0][3], e);
    }
  }
  function l(e) {
    e.value instanceof E
      ? Promise.resolve(e.value.v).then(u, d)
      : f(a[0][2], e);
  }
  function u(e) {
    c(`next`, e);
  }
  function d(e) {
    c(`throw`, e);
  }
  function f(e, t) {
    e(t), a.shift(), a.length && c(a[0][0], a[0][1]);
  }
}
function O(e) {
  var t = {},
    n;
  return (
    r(`next`),
    r(`throw`, function (e) {
      throw e;
    }),
    r(`return`),
    (t[Symbol.iterator] = function () {
      return this;
    }),
    t
  );
  function r(r, i) {
    t[r] = e[r]
      ? function (t) {
          return (n = !n) ? { value: E(e[r](t)), done: !1 } : i ? i(t) : t;
        }
      : i;
  }
}
function k(e) {
  if (!Symbol.asyncIterator)
    throw TypeError(`Symbol.asyncIterator is not defined.`);
  var t = e[Symbol.asyncIterator],
    n;
  return t
    ? t.call(e)
    : ((e = typeof x == `function` ? x(e) : e[Symbol.iterator]()),
      (n = {}),
      r(`next`),
      r(`throw`),
      r(`return`),
      (n[Symbol.asyncIterator] = function () {
        return this;
      }),
      n);
  function r(t) {
    n[t] =
      e[t] &&
      function (n) {
        return new Promise(function (r, a) {
          (n = e[t](n)), i(r, a, n.done, n.value);
        });
      };
  }
  function i(e, t, n, r) {
    Promise.resolve(r).then(function (t) {
      e({ value: t, done: n });
    }, t);
  }
}
function te(e, t) {
  return (
    Object.defineProperty
      ? Object.defineProperty(e, "raw", { value: t })
      : (e.raw = t),
    e
  );
}
function A(e) {
  if (e && e.__esModule) return e;
  var t = {};
  if (e != null)
    for (var n = B(e), r = 0; r < n.length; r++)
      n[r] !== "default" && R(t, e, n[r]);
  return z(t, e), t;
}
function ne(e) {
  return e && e.__esModule ? e : { default: e };
}
function j(e, t, n, r) {
  if (n === `a` && !r)
    throw TypeError(`Private accessor was defined without a getter`);
  if (typeof t == `function` ? e !== t || !r : !t.has(e))
    throw TypeError(
      `Cannot read private member from an object whose class did not declare it`,
    );
  return n === `m` ? r : n === `a` ? r.call(e) : r ? r.value : t.get(e);
}
function M(e, t, n, r, i) {
  if (r === `m`) throw TypeError(`Private method is not writable`);
  if (r === `a` && !i)
    throw TypeError(`Private accessor was defined without a setter`);
  if (typeof t == `function` ? e !== t || !i : !t.has(e))
    throw TypeError(
      `Cannot write private member to an object whose class did not declare it`,
    );
  return r === `a` ? i.call(e, n) : i ? (i.value = n) : t.set(e, n), n;
}
function N(e, t) {
  if (t === null || (typeof t != `object` && typeof t != `function`))
    throw TypeError(`Cannot use 'in' operator on non-object`);
  return typeof e == `function` ? t === e : e.has(t);
}
function P(e, t, n) {
  if (t != null) {
    if (typeof t != `object` && typeof t != `function`)
      throw TypeError(`Object expected.`);
    var r, i;
    if (n) {
      if (!Symbol.asyncDispose)
        throw TypeError(`Symbol.asyncDispose is not defined.`);
      r = t[Symbol.asyncDispose];
    }
    if (r === void 0) {
      if (!Symbol.dispose) throw TypeError(`Symbol.dispose is not defined.`);
      (r = t[Symbol.dispose]), n && (i = r);
    }
    if (typeof r != `function`) throw TypeError(`Object not disposable.`);
    i &&
      (r = function () {
        try {
          i.call(this);
        } catch (e) {
          return Promise.reject(e);
        }
      }),
      e.stack.push({ value: t, dispose: r, async: n });
  } else n && e.stack.push({ async: !0 });
  return t;
}
function re(e) {
  function t(t) {
    (e.error = e.hasError
      ? new V(t, e.error, `An error was suppressed during disposal.`)
      : t),
      (e.hasError = !0);
  }
  var n,
    r = 0;
  function i() {
    for (; (n = e.stack.pop()); )
      try {
        if (!n.async && r === 1)
          return (r = 0), e.stack.push(n), Promise.resolve().then(i);
        if (n.dispose) {
          var a = n.dispose.call(n.value);
          if (n.async)
            return (
              (r |= 2),
              Promise.resolve(a).then(i, function (e) {
                return t(e), i();
              })
            );
        } else r |= 1;
      } catch (e) {
        t(e);
      }
    if (r === 1)
      return e.hasError ? Promise.reject(e.error) : Promise.resolve();
    if (e.hasError) throw e.error;
  }
  return i();
}
function F(e, t) {
  return typeof e == `string` && /^\.\.?\//.test(e)
    ? e.replace(
        /\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i,
        function (e, n, r, i, a) {
          return n
            ? t
              ? `.jsx`
              : `.js`
            : r && (!i || !a)
              ? e
              : r + i + `.` + a.toLowerCase() + `js`;
        },
      )
    : e;
}
var I,
  L,
  R,
  z,
  B,
  V,
  H,
  U = i(() => {
    (I = function (e, t) {
      return (
        (I =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (e, t) {
              e.__proto__ = t;
            }) ||
          function (e, t) {
            for (var n in t)
              Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n]);
          }),
        I(e, t)
      );
    }),
      (L = function () {
        return (
          (L =
            Object.assign ||
            function (e) {
              for (var t, n = 1, r = arguments.length; n < r; n++)
                for (var i in ((t = arguments[n]), t))
                  Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
              return e;
            }),
          L.apply(this, arguments)
        );
      }),
      (R = Object.create
        ? function (e, t, n, r) {
            r === void 0 && (r = n);
            var i = Object.getOwnPropertyDescriptor(t, n);
            (!i ||
              (`get` in i ? !t.__esModule : i.writable || i.configurable)) &&
              (i = {
                enumerable: !0,
                get: function () {
                  return t[n];
                },
              }),
              Object.defineProperty(e, r, i);
          }
        : function (e, t, n, r) {
            r === void 0 && (r = n), (e[r] = t[n]);
          }),
      (z = Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
      (B = function (e) {
        return (
          (B =
            Object.getOwnPropertyNames ||
            function (e) {
              var t = [];
              for (var n in e)
                Object.prototype.hasOwnProperty.call(e, n) && (t[t.length] = n);
              return t;
            }),
          B(e)
        );
      }),
      (V =
        typeof SuppressedError == `function`
          ? SuppressedError
          : function (e, t, n) {
              var r = Error(n);
              return (
                (r.name = `SuppressedError`),
                (r.error = e),
                (r.suppressed = t),
                r
              );
            }),
      (H = {
        __extends: u,
        __assign: L,
        __rest: d,
        __decorate: f,
        __param: p,
        __esDecorate: m,
        __runInitializers: h,
        __propKey: g,
        __setFunctionName: ee,
        __metadata: _,
        __awaiter: v,
        __generator: y,
        __createBinding: R,
        __exportStar: b,
        __values: x,
        __read: S,
        __spread: C,
        __spreadArrays: w,
        __spreadArray: T,
        __await: E,
        __asyncGenerator: D,
        __asyncDelegator: O,
        __asyncValues: k,
        __makeTemplateObject: te,
        __importStar: A,
        __importDefault: ne,
        __classPrivateFieldGet: j,
        __classPrivateFieldSet: M,
        __classPrivateFieldIn: N,
        __addDisposableResource: P,
        __disposeResources: re,
        __rewriteRelativeImportExtension: F,
      });
  }),
  W = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.NavigationTarget = void 0),
      (e.NavigationTarget = {
        ContentView: `contentView`,
        ContentEdit: `contentEdit`,
        ContentList: `contentList`,
        SpaceView: `spaceView`,
        Module: `module`,
        UserProfile: `userProfile`,
        Dashboard: `dashboard`,
        Issue: `issue`,
        ProjectSettingsDetails: `projectSettingsDetails`,
      });
  }),
  G = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.BridgeAPIError = void 0),
      (e.BridgeAPIError = class extends Error {});
  }),
  K = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.getCallBridge = void 0);
    var t = G();
    function n(e) {
      return !!e?.callBridge;
    }
    e.getCallBridge = () => {
      if (!n(globalThis.__bridge))
        throw new t.BridgeAPIError(`
      Unable to establish a connection with the Custom UI bridge.
      If you are trying to run your app locally, Forge apps only work in the context of Atlassian products. Refer to https://go.atlassian.com/forge-tunneling-with-custom-ui for how to tunnel when using a local development server.
    `);
      return globalThis.__bridge.callBridge;
    };
  }),
  ie = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.withRateLimiter = void 0);
    var t = G();
    e.withRateLimiter = (e, n, r, i) => {
      let a = Date.now(),
        o = 0;
      return async (...s) => {
        let c = Date.now();
        if ((c - a > r && ((a = c), (o = 0)), o >= n))
          throw new t.BridgeAPIError(i || `Too many invocations.`);
        return (o += 1), e(...s);
      };
    };
  }),
  q = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.invoke = s),
      (e.makeInvoke = c);
    var t = K(),
      n = G(),
      r = ie(),
      i = (0, t.getCallBridge)(),
      a = (e) => {
        if (e && Object.values(e).some((e) => typeof e == `function`))
          throw new n.BridgeAPIError(
            `Passing functions as part of the payload is not supported!`,
          );
      },
      o = (0, r.withRateLimiter)(
        async (e, t, r) => {
          if (typeof e != `string`)
            throw new n.BridgeAPIError(`functionKey must be a string!`);
          return (
            a(t), await i(`invoke`, { functionKey: e, payload: t, metadata: r })
          );
        },
        500,
        25e3,
        `Resolver calls are rate limited at 500req/25s`,
      );
    function s(e, t, n) {
      return o(e, t, n);
    }
    function c() {
      return s;
    }
  }),
  J = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (U(), c(l)).__exportStar(q(), e);
  }),
  ae = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.InvokeType = void 0),
      (e._invokeEndpointFn = d);
    var t = K(),
      n = G(),
      r = ie(),
      i = 500,
      a = 25,
      o = 1e3 * a,
      s;
    (function (e) {
      (e.REMOTE = `Remote`), (e.SERVICE = `Container`);
    })(s || (e.InvokeType = s = {}));
    var c = (0, t.getCallBridge)(),
      l = (e) => {
        if (e && Object.values(e).some((e) => typeof e == `function`))
          throw new n.BridgeAPIError(
            `Passing functions as part of the payload is not supported!`,
          );
      },
      u = (e) => async (t) => {
        l(t);
        let {
            success: n,
            payload: r,
            error: i,
          } = (await c(`invoke`, {
            ...t,
            invokeType: `ui-${e.toLowerCase()}-fetch`,
          })) ?? {},
          a = { ...(n ? r : i) };
        if (a && a.headers)
          for (let e in a.headers)
            Array.isArray(a.headers[e]) &&
              (a.headers[e] = a.headers[e].join(`,`));
        return a;
      };
    function d(e) {
      let t = u(e);
      return (0, r.withRateLimiter)(
        t,
        i,
        o,
        `${e} invocation calls are rate limited at ${i}/${a}s`,
      );
    }
  }),
  oe = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.invokeRemote = void 0);
    var t = ae();
    e.invokeRemote = (e) => (0, t._invokeEndpointFn)(t.InvokeType.REMOTE)(e);
  }),
  se = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.invokeService = void 0);
    var t = ae();
    e.invokeService = (e) => (0, t._invokeEndpointFn)(t.InvokeType.SERVICE)(e);
  }),
  ce = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    var t = (U(), c(l));
    t.__exportStar(oe(), e), t.__exportStar(se(), e);
  }),
  le = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.submit = void 0);
    var t = K(),
      n = G(),
      r = (0, t.getCallBridge)();
    e.submit = async (e) => {
      if ((await r(`submit`, e)) === !1)
        throw new n.BridgeAPIError(`this resource's view is not submittable.`);
    };
  }),
  ue = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.close = void 0);
    var t = K(),
      n = G(),
      r = (0, t.getCallBridge)();
    e.close = async (e) => {
      try {
        if ((await r(`close`, e)) === !1)
          throw new n.BridgeAPIError(`this resource's view is not closable.`);
      } catch {
        throw new n.BridgeAPIError(`this resource's view is not closable.`);
      }
    };
  }),
  de = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.open = void 0);
    var t = K(),
      n = G(),
      r = (0, t.getCallBridge)();
    e.open = async () => {
      try {
        if ((await r(`open`)) === !1)
          throw new n.BridgeAPIError(`this resource's view is not openable.`);
      } catch {
        throw new n.BridgeAPIError(`this resource's view is not openable.`);
      }
    };
  }),
  fe = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.refresh = void 0);
    var t = K(),
      n = G(),
      r = (0, t.getCallBridge)();
    e.refresh = async (e) => {
      if ((await r(`refresh`, e)) === !1)
        throw new n.BridgeAPIError(`this resource's view is not refreshable.`);
    };
  }),
  Y = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.createHistory = void 0);
    var t = (0, K().getCallBridge)();
    e.createHistory = async () => {
      let e = await t(`createHistory`);
      return (
        e.listen((t) => {
          e.location = t;
        }),
        e
      );
    };
  }),
  pe = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.FORGE_SUPPORTED_LOCALE_CODES =
        e.I18N_BUNDLE_FOLDER_NAME =
        e.I18N_INFO_FILE_NAME =
          void 0),
      (e.I18N_INFO_FILE_NAME = `i18n-info.json`),
      (e.I18N_BUNDLE_FOLDER_NAME = `__LOCALES__`),
      (e.FORGE_SUPPORTED_LOCALE_CODES =
        `zh-CN.zh-TW.cs-CZ.da-DK.nl-NL.en-US.en-GB.et-EE.fi-FI.fr-FR.de-DE.hu-HU.is-IS.it-IT.ja-JP.ko-KR.no-NO.pl-PL.pt-BR.pt-PT.ro-RO.ru-RU.sk-SK.tr-TR.es-ES.sv-SE`.split(
          `.`,
        ));
  }),
  me = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.TranslationsGetter = e.TranslationGetterError = void 0);
    var t = (e, t) => {
        e.includes(t) || e.push(t);
      },
      n = class extends Error {
        constructor(e) {
          super(e), (this.name = `TranslationGetterError`);
        }
      };
    (e.TranslationGetterError = n),
      (e.TranslationsGetter = class {
        resourcesAccessor;
        i18nInfoConfig = null;
        translationResources = new Map();
        constructor(e) {
          this.resourcesAccessor = e;
        }
        async getTranslations(e, t = { fallback: !0 }) {
          let n = await this.getI18nInfoConfig(),
            { fallback: r } = t;
          if (!r) {
            let t;
            return (
              n.locales.includes(e) &&
                (t = await this.getTranslationResource(e)),
              { translations: t ?? null, locale: e }
            );
          }
          for (let t of this.getLocaleLookupOrder(e, n)) {
            let e = await this.getTranslationResource(t);
            if (e) return { translations: e, locale: t };
          }
          return { translations: null, locale: e };
        }
        async getTranslationsByLocaleLookupOrder(e) {
          let t = await this.getI18nInfoConfig(),
            n = this.getLocaleLookupOrder(e, t);
          return await Promise.all(
            n.map(async (e) => ({
              locale: e,
              translations: await this.getTranslationResource(e),
            })),
          );
        }
        reset() {
          (this.i18nInfoConfig = null), this.translationResources.clear();
        }
        async getTranslationResource(e) {
          let t = this.translationResources.get(e);
          if (!t)
            try {
              (t = await this.resourcesAccessor.getTranslationResource(e)),
                this.translationResources.set(e, t);
            } catch (t) {
              throw t instanceof n
                ? t
                : new n(`Failed to get translation resource for locale: ${e}`);
            }
          return t;
        }
        async getI18nInfoConfig() {
          if (!this.i18nInfoConfig)
            try {
              this.i18nInfoConfig =
                await this.resourcesAccessor.getI18nInfoConfig();
            } catch (e) {
              throw e instanceof n
                ? e
                : new n(`Failed to get i18n info config`);
            }
          return this.i18nInfoConfig;
        }
        getLocaleLookupOrder(e, n) {
          let { locales: r, fallback: i } = n,
            a = [e],
            o = i[e];
          return (
            o && Array.isArray(o) && o.length > 0 && a.push(...o),
            t(a, n.fallback.default),
            a.filter((e) => r.includes(e))
          );
        }
      });
  }),
  he = a((e, t) => {
    t.exports = Array.isArray;
  }),
  ge = a((e, t) => {
    t.exports =
      typeof global == `object` && global && global.Object === Object && global;
  }),
  _e = a((e, t) => {
    var n = ge(),
      r = typeof self == `object` && self && self.Object === Object && self;
    t.exports = n || r || Function(`return this`)();
  }),
  ve = a((e, t) => {
    t.exports = _e().Symbol;
  }),
  ye = a((e, t) => {
    var n = ve(),
      r = Object.prototype,
      i = r.hasOwnProperty,
      a = r.toString,
      o = n ? n.toStringTag : void 0;
    function s(e) {
      var t = i.call(e, o),
        n = e[o];
      try {
        e[o] = void 0;
        var r = !0;
      } catch {}
      var s = a.call(e);
      return r && (t ? (e[o] = n) : delete e[o]), s;
    }
    t.exports = s;
  }),
  be = a((e, t) => {
    var n = Object.prototype.toString;
    function r(e) {
      return n.call(e);
    }
    t.exports = r;
  }),
  xe = a((e, t) => {
    var n = ve(),
      r = ye(),
      i = be(),
      a = `[object Null]`,
      o = `[object Undefined]`,
      s = n ? n.toStringTag : void 0;
    function c(e) {
      return e == null
        ? e === void 0
          ? o
          : a
        : s && s in Object(e)
          ? r(e)
          : i(e);
    }
    t.exports = c;
  }),
  Se = a((e, t) => {
    function n(e) {
      return typeof e == `object` && !!e;
    }
    t.exports = n;
  }),
  Ce = a((e, t) => {
    var n = xe(),
      r = Se(),
      i = `[object Symbol]`;
    function a(e) {
      return typeof e == `symbol` || (r(e) && n(e) == i);
    }
    t.exports = a;
  }),
  we = a((e, t) => {
    var n = he(),
      r = Ce(),
      i = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      a = /^\w*$/;
    function o(e, t) {
      if (n(e)) return !1;
      var o = typeof e;
      return o == `number` ||
        o == `symbol` ||
        o == `boolean` ||
        e == null ||
        r(e)
        ? !0
        : a.test(e) || !i.test(e) || (t != null && e in Object(t));
    }
    t.exports = o;
  }),
  Te = a((e, t) => {
    function n(e) {
      var t = typeof e;
      return e != null && (t == `object` || t == `function`);
    }
    t.exports = n;
  }),
  Ee = a((e, t) => {
    var n = xe(),
      r = Te(),
      i = `[object AsyncFunction]`,
      a = `[object Function]`,
      o = `[object GeneratorFunction]`,
      s = `[object Proxy]`;
    function c(e) {
      if (!r(e)) return !1;
      var t = n(e);
      return t == a || t == o || t == i || t == s;
    }
    t.exports = c;
  }),
  De = a((e, t) => {
    t.exports = _e()[`__core-js_shared__`];
  }),
  Oe = a((e, t) => {
    var n = De(),
      r = (function () {
        var e = /[^.]+$/.exec((n && n.keys && n.keys.IE_PROTO) || ``);
        return e ? `Symbol(src)_1.` + e : ``;
      })();
    function i(e) {
      return !!r && r in e;
    }
    t.exports = i;
  }),
  ke = a((e, t) => {
    var n = Function.prototype.toString;
    function r(e) {
      if (e != null) {
        try {
          return n.call(e);
        } catch {}
        try {
          return e + ``;
        } catch {}
      }
      return ``;
    }
    t.exports = r;
  }),
  Ae = a((e, t) => {
    var n = Ee(),
      r = Oe(),
      i = Te(),
      a = ke(),
      o = /[\\^$.*+?()[\]{}|]/g,
      s = /^\[object .+?Constructor\]$/,
      c = Function.prototype,
      l = Object.prototype,
      u = c.toString,
      d = l.hasOwnProperty,
      f = RegExp(
        `^` +
          u
            .call(d)
            .replace(o, `\\$&`)
            .replace(
              /hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
              `$1.*?`,
            ) +
          `$`,
      );
    function p(e) {
      return !i(e) || r(e) ? !1 : (n(e) ? f : s).test(a(e));
    }
    t.exports = p;
  }),
  je = a((e, t) => {
    function n(e, t) {
      return e?.[t];
    }
    t.exports = n;
  }),
  Me = a((e, t) => {
    var n = Ae(),
      r = je();
    function i(e, t) {
      var i = r(e, t);
      return n(i) ? i : void 0;
    }
    t.exports = i;
  }),
  X = a((e, t) => {
    t.exports = Me()(Object, `create`);
  }),
  Z = a((e, t) => {
    var n = X();
    function r() {
      (this.__data__ = n ? n(null) : {}), (this.size = 0);
    }
    t.exports = r;
  }),
  Ne = a((e, t) => {
    function n(e) {
      var t = this.has(e) && delete this.__data__[e];
      return (this.size -= +!!t), t;
    }
    t.exports = n;
  }),
  Pe = a((e, t) => {
    var n = X(),
      r = `__lodash_hash_undefined__`,
      i = Object.prototype.hasOwnProperty;
    function a(e) {
      var t = this.__data__;
      if (n) {
        var a = t[e];
        return a === r ? void 0 : a;
      }
      return i.call(t, e) ? t[e] : void 0;
    }
    t.exports = a;
  }),
  Q = a((e, t) => {
    var n = X(),
      r = Object.prototype.hasOwnProperty;
    function i(e) {
      var t = this.__data__;
      return n ? t[e] !== void 0 : r.call(t, e);
    }
    t.exports = i;
  }),
  Fe = a((e, t) => {
    var n = X(),
      r = `__lodash_hash_undefined__`;
    function i(e, t) {
      var i = this.__data__;
      return (
        (this.size += +!this.has(e)), (i[e] = n && t === void 0 ? r : t), this
      );
    }
    t.exports = i;
  }),
  Ie = a((e, t) => {
    var n = Z(),
      r = Ne(),
      i = Pe(),
      a = Q(),
      o = Fe();
    function s(e) {
      var t = -1,
        n = e == null ? 0 : e.length;
      for (this.clear(); ++t < n; ) {
        var r = e[t];
        this.set(r[0], r[1]);
      }
    }
    (s.prototype.clear = n),
      (s.prototype.delete = r),
      (s.prototype.get = i),
      (s.prototype.has = a),
      (s.prototype.set = o),
      (t.exports = s);
  }),
  Le = a((e, t) => {
    function n() {
      (this.__data__ = []), (this.size = 0);
    }
    t.exports = n;
  }),
  $ = a((e, t) => {
    function n(e, t) {
      return e === t || (e !== e && t !== t);
    }
    t.exports = n;
  }),
  Re = a((e, t) => {
    var n = $();
    function r(e, t) {
      for (var r = e.length; r--; ) if (n(e[r][0], t)) return r;
      return -1;
    }
    t.exports = r;
  }),
  ze = a((e, t) => {
    var n = Re(),
      r = Array.prototype.splice;
    function i(e) {
      var t = this.__data__,
        i = n(t, e);
      return i < 0
        ? !1
        : (i == t.length - 1 ? t.pop() : r.call(t, i, 1), --this.size, !0);
    }
    t.exports = i;
  }),
  Be = a((e, t) => {
    var n = Re();
    function r(e) {
      var t = this.__data__,
        r = n(t, e);
      return r < 0 ? void 0 : t[r][1];
    }
    t.exports = r;
  }),
  Ve = a((e, t) => {
    var n = Re();
    function r(e) {
      return n(this.__data__, e) > -1;
    }
    t.exports = r;
  }),
  He = a((e, t) => {
    var n = Re();
    function r(e, t) {
      var r = this.__data__,
        i = n(r, e);
      return i < 0 ? (++this.size, r.push([e, t])) : (r[i][1] = t), this;
    }
    t.exports = r;
  }),
  Ue = a((e, t) => {
    var n = Le(),
      r = ze(),
      i = Be(),
      a = Ve(),
      o = He();
    function s(e) {
      var t = -1,
        n = e == null ? 0 : e.length;
      for (this.clear(); ++t < n; ) {
        var r = e[t];
        this.set(r[0], r[1]);
      }
    }
    (s.prototype.clear = n),
      (s.prototype.delete = r),
      (s.prototype.get = i),
      (s.prototype.has = a),
      (s.prototype.set = o),
      (t.exports = s);
  }),
  We = a((e, t) => {
    t.exports = Me()(_e(), `Map`);
  }),
  Ge = a((e, t) => {
    var n = Ie(),
      r = Ue(),
      i = We();
    function a() {
      (this.size = 0),
        (this.__data__ = {
          hash: new n(),
          map: new (i || r)(),
          string: new n(),
        });
    }
    t.exports = a;
  }),
  Ke = a((e, t) => {
    function n(e) {
      var t = typeof e;
      return t == `string` || t == `number` || t == `symbol` || t == `boolean`
        ? e !== `__proto__`
        : e === null;
    }
    t.exports = n;
  }),
  qe = a((e, t) => {
    var n = Ke();
    function r(e, t) {
      var r = e.__data__;
      return n(t) ? r[typeof t == `string` ? `string` : `hash`] : r.map;
    }
    t.exports = r;
  }),
  Je = a((e, t) => {
    var n = qe();
    function r(e) {
      var t = n(this, e).delete(e);
      return (this.size -= +!!t), t;
    }
    t.exports = r;
  }),
  Ye = a((e, t) => {
    var n = qe();
    function r(e) {
      return n(this, e).get(e);
    }
    t.exports = r;
  }),
  Xe = a((e, t) => {
    var n = qe();
    function r(e) {
      return n(this, e).has(e);
    }
    t.exports = r;
  }),
  Ze = a((e, t) => {
    var n = qe();
    function r(e, t) {
      var r = n(this, e),
        i = r.size;
      return r.set(e, t), (this.size += r.size == i ? 0 : 1), this;
    }
    t.exports = r;
  }),
  Qe = a((e, t) => {
    var n = Ge(),
      r = Je(),
      i = Ye(),
      a = Xe(),
      o = Ze();
    function s(e) {
      var t = -1,
        n = e == null ? 0 : e.length;
      for (this.clear(); ++t < n; ) {
        var r = e[t];
        this.set(r[0], r[1]);
      }
    }
    (s.prototype.clear = n),
      (s.prototype.delete = r),
      (s.prototype.get = i),
      (s.prototype.has = a),
      (s.prototype.set = o),
      (t.exports = s);
  }),
  $e = a((e, t) => {
    var n = Qe(),
      r = `Expected a function`;
    function i(e, t) {
      if (typeof e != `function` || (t != null && typeof t != `function`))
        throw TypeError(r);
      var a = function () {
        var n = arguments,
          r = t ? t.apply(this, n) : n[0],
          i = a.cache;
        if (i.has(r)) return i.get(r);
        var o = e.apply(this, n);
        return (a.cache = i.set(r, o) || i), o;
      };
      return (a.cache = new (i.Cache || n)()), a;
    }
    (i.Cache = n), (t.exports = i);
  }),
  et = a((e, t) => {
    var n = $e(),
      r = 500;
    function i(e) {
      var t = n(e, function (e) {
          return i.size === r && i.clear(), e;
        }),
        i = t.cache;
      return t;
    }
    t.exports = i;
  }),
  tt = a((e, t) => {
    var n = et(),
      r =
        /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
      i = /\\(\\)?/g;
    t.exports = n(function (e) {
      var t = [];
      return (
        e.charCodeAt(0) === 46 && t.push(``),
        e.replace(r, function (e, n, r, a) {
          t.push(r ? a.replace(i, `$1`) : n || e);
        }),
        t
      );
    });
  }),
  nt = a((e, t) => {
    function n(e, t) {
      for (var n = -1, r = e == null ? 0 : e.length, i = Array(r); ++n < r; )
        i[n] = t(e[n], n, e);
      return i;
    }
    t.exports = n;
  }),
  rt = a((e, t) => {
    var n = ve(),
      r = nt(),
      i = he(),
      a = Ce(),
      o = 1 / 0,
      s = n ? n.prototype : void 0,
      c = s ? s.toString : void 0;
    function l(e) {
      if (typeof e == `string`) return e;
      if (i(e)) return r(e, l) + ``;
      if (a(e)) return c ? c.call(e) : ``;
      var t = e + ``;
      return t == `0` && 1 / e == -o ? `-0` : t;
    }
    t.exports = l;
  }),
  it = a((e, t) => {
    var n = rt();
    function r(e) {
      return e == null ? `` : n(e);
    }
    t.exports = r;
  }),
  at = a((e, t) => {
    var n = he(),
      r = we(),
      i = tt(),
      a = it();
    function o(e, t) {
      return n(e) ? e : r(e, t) ? [e] : i(a(e));
    }
    t.exports = o;
  }),
  ot = a((e, t) => {
    var n = Ce(),
      r = 1 / 0;
    function i(e) {
      if (typeof e == `string` || n(e)) return e;
      var t = e + ``;
      return t == `0` && 1 / e == -r ? `-0` : t;
    }
    t.exports = i;
  }),
  st = a((e, t) => {
    var n = at(),
      r = ot();
    function i(e, t) {
      t = n(t, e);
      for (var i = 0, a = t.length; e != null && i < a; ) e = e[r(t[i++])];
      return i && i == a ? e : void 0;
    }
    t.exports = i;
  }),
  ct = a((e, t) => {
    var n = st();
    function r(e, t, r) {
      var i = e == null ? void 0 : n(e, t);
      return i === void 0 ? r : i;
    }
    t.exports = r;
  }),
  lt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.getTranslationValueFromContent = e.getTranslationValue = void 0);
    var t = (U(), c(l)).__importDefault(ct());
    (e.getTranslationValue = (t, n, r) => {
      let i = t[r];
      return i ? (0, e.getTranslationValueFromContent)(i, n) : null;
    }),
      (e.getTranslationValueFromContent = (e, n) => {
        let r = e[n];
        if (!r) {
          let i = n.split(`.`);
          i.length > 1 && (r = (0, t.default)(e, i, null));
        }
        return typeof r == `string` ? r : null;
      });
  }),
  ut = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.Translator = void 0);
    var t = lt();
    e.Translator = class {
      locale;
      translationsGetter;
      localeLookupOrderedTranslations = null;
      cache = new Map();
      constructor(e, t) {
        (this.locale = e), (this.translationsGetter = t);
      }
      async init() {
        this.localeLookupOrderedTranslations =
          await this.translationsGetter.getTranslationsByLocaleLookupOrder(
            this.locale,
          );
      }
      translate(e) {
        if (!this.localeLookupOrderedTranslations)
          throw Error(`TranslationLookup not initialized`);
        let n = this.cache.get(e);
        if (n === void 0) {
          for (let { translations: r } of this
            .localeLookupOrderedTranslations) {
            let i = (0, t.getTranslationValueFromContent)(r, e);
            if (i !== null) {
              n = i;
              break;
            }
          }
          (n ??= null), this.cache.set(e, n);
        }
        return n;
      }
    };
  }),
  dt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.ensureLocale = void 0);
    var t = pe(),
      n = new Set(t.FORGE_SUPPORTED_LOCALE_CODES),
      r = { "en-UK": `en-GB`, "nb-NO": `no-NO` },
      i = t.FORGE_SUPPORTED_LOCALE_CODES.reduce(
        (e, t) => {
          let [n] = t.split(`-`);
          return e[n] || (e[n] = t), e;
        },
        { nb: `no-NO`, pt: `pt-PT` },
      );
    e.ensureLocale = (e) => {
      let t = e.replace(`_`, `-`);
      return n.has(t) ? t : (i[t] ?? r[t] ?? null);
    };
  }),
  ft = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.extractI18nPropertiesFromModules =
        e.extractI18nKeysFromModules =
        e.getI18nSupportedModuleEntries =
          void 0);
    var t = (e) => typeof e == `object` && !!e && !Array.isArray(e),
      n = (e) => typeof e?.i18n == `string`,
      r = (e) => e.startsWith(`connect-`),
      i = (e) => e.startsWith(`core:`),
      a = (e) => {
        let r = new Set(),
          i = (e, a) =>
            !t(e) || r.has(e)
              ? []
              : (r.add(e),
                Object.entries(e).flatMap(([e, t]) => {
                  let r = [...a, e];
                  return n(t)
                    ? [{ propertyPath: r, key: t.i18n }]
                    : Array.isArray(t)
                      ? t.flatMap((e) => i(e, r))
                      : i(t, r);
                }));
        return i(e, []);
      };
    (e.getI18nSupportedModuleEntries = (e) =>
      Object.entries(e).flatMap(([e, t]) =>
        !r(e) && !i(e) && t && Array.isArray(t) && t.length > 0
          ? t.map((t) => [t, e])
          : [],
      )),
      (e.extractI18nKeysFromModules = (t) => {
        let n = new Set();
        for (let r of (0, e.getI18nSupportedModuleEntries)(t)) {
          let e = a(r[0]);
          for (let { key: t } of e) n.add(t);
        }
        return n.size > 0 ? Array.from(n) : [];
      }),
      (e.extractI18nPropertiesFromModules = (t) => {
        let n = [];
        for (let r of (0, e.getI18nSupportedModuleEntries)(t)) {
          let e = a(r[0]);
          for (let t of e) n.push({ moduleName: r[1], ...t });
        }
        return n;
      });
  }),
  pt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
  }),
  mt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.getI18nSupportedModuleEntries =
        e.extractI18nPropertiesFromModules =
        e.extractI18nKeysFromModules =
        e.getTranslationValue =
          void 0);
    var t = (U(), c(l));
    t.__exportStar(pe(), e),
      t.__exportStar(me(), e),
      t.__exportStar(ut(), e),
      t.__exportStar(dt(), e);
    var n = lt();
    Object.defineProperty(e, "getTranslationValue", {
      enumerable: !0,
      get: function () {
        return n.getTranslationValue;
      },
    });
    var r = ft();
    Object.defineProperty(e, "extractI18nKeysFromModules", {
      enumerable: !0,
      get: function () {
        return r.extractI18nKeysFromModules;
      },
    }),
      Object.defineProperty(e, "extractI18nPropertiesFromModules", {
        enumerable: !0,
        get: function () {
          return r.extractI18nPropertiesFromModules;
        },
      }),
      Object.defineProperty(e, "getI18nSupportedModuleEntries", {
        enumerable: !0,
        get: function () {
          return r.getI18nSupportedModuleEntries;
        },
      }),
      t.__exportStar(pt(), e);
  }),
  ht = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.getContext = void 0);
    var t = K(),
      n = mt(),
      r = (0, t.getCallBridge)();
    e.getContext = async () => {
      let e = await r(`getContext`),
        t = e?.locale;
      return t && (e.locale = (0, n.ensureLocale)(t) ?? t), e;
    };
  }),
  gt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.changeWindowTitle = void 0);
    var t = K(),
      n = G(),
      r = (0, t.getCallBridge)();
    e.changeWindowTitle = async (e) => {
      try {
        await r(`changeWindowTitle`, e);
      } catch {
        throw new n.BridgeAPIError(
          `the window title wasn't changed due to error.`,
        );
      }
    };
  }),
  _t = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.theme = void 0);
    var t = (0, K().getCallBridge)();
    e.theme = { enable: () => t(`enableTheming`) };
  }),
  vt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.blobToBase64 = e.base64ToBlob = void 0),
      (e.base64ToBlob = (e, t) => {
        if (!e) return null;
        let n = e.includes(`;base64`) ? e.split(`,`)[1] : e,
          r = atob(n),
          i = Array(r.length);
        for (let e = 0; e < r.length; e++) i[e] = r.charCodeAt(e);
        let a = new Uint8Array(i);
        return new Blob([a], { type: t });
      }),
      (e.blobToBase64 = (e) =>
        new Promise((t, n) => {
          let r = new FileReader();
          (r.onloadend = () => {
            t(r.result);
          }),
            (r.onerror = n),
            r.readAsDataURL(e);
        }));
  }),
  yt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.containsSerialisedBlobs =
        e.containsBlobs =
        e.deserialiseBlobsInPayload =
        e.serialiseBlobsInPayload =
          void 0);
    var t = vt(),
      n = (e) => {
        if (
          typeof e != `object` ||
          !e ||
          Object.prototype.toString.call(e) !== `[object Object]`
        )
          return !1;
        let t = Object.getPrototypeOf(e);
        if (t === null) return !0;
        let n =
          Object.prototype.hasOwnProperty.call(t, `constructor`) &&
          t.constructor;
        return (
          typeof n == `function` &&
          n instanceof n &&
          Function.prototype.call(n) === Function.prototype.call(e)
        );
      },
      r = async (e) => ({ data: await (0, t.blobToBase64)(e), type: e.type }),
      i = (e) => (0, t.base64ToBlob)(e.data, e.type);
    (e.serialiseBlobsInPayload = async (t) => {
      if (t instanceof Blob) return { ...(await r(t)), __isBlobData: !0 };
      if (Array.isArray(t))
        return Promise.all(t.map((t) => (0, e.serialiseBlobsInPayload)(t)));
      if (t && n(t)) {
        let n = await Promise.all(
          Object.entries(t).map(async ([t, n]) => [
            t,
            await (0, e.serialiseBlobsInPayload)(n),
          ]),
        );
        return Object.fromEntries(n);
      }
      return t;
    }),
      (e.deserialiseBlobsInPayload = (t) => {
        if (t && n(t) && `__isBlobData` in t) {
          let e = t;
          return i({ data: e.data, type: e.type });
        }
        if (Array.isArray(t))
          return t.map((t) => (0, e.deserialiseBlobsInPayload)(t));
        if (t && n(t)) {
          let n = {};
          for (let [r, i] of Object.entries(t))
            n[r] = (0, e.deserialiseBlobsInPayload)(i);
          return n;
        }
        return t;
      }),
      (e.containsBlobs = (t) =>
        t instanceof Blob
          ? !0
          : Array.isArray(t)
            ? t.some((t) => (0, e.containsBlobs)(t))
            : t && n(t)
              ? Object.values(t).some((t) => (0, e.containsBlobs)(t))
              : !1),
      (e.containsSerialisedBlobs = (t) =>
        t && n(t) && `__isBlobData` in t
          ? !0
          : Array.isArray(t)
            ? t.some((t) => (0, e.containsSerialisedBlobs)(t))
            : t && n(t)
              ? Object.values(t).some((t) => (0, e.containsSerialisedBlobs)(t))
              : !1);
  }),
  bt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.events = void 0);
    var t = K(),
      n = yt(),
      r = (0, t.getCallBridge)(),
      i = (e) => (t) => {
        let r = t;
        return (
          (0, n.containsSerialisedBlobs)(t) &&
            (r = (0, n.deserialiseBlobsInPayload)(t)),
          e(r)
        );
      };
    e.events = {
      emit: async (e, t) => {
        let i = t;
        return (
          (0, n.containsBlobs)(t) &&
            (i = await (0, n.serialiseBlobsInPayload)(t)),
          r(`emit`, { event: e, payload: i })
        );
      },
      on: (e, t) => r(`on`, { event: e, callback: i(t) }),
      emitPublic: async (e, t) => {
        let i = t;
        return (
          (0, n.containsBlobs)(t) &&
            (i = await (0, n.serialiseBlobsInPayload)(t)),
          r(`emitPublic`, { event: e, payload: i })
        );
      },
      onPublic: (e, t) => r(`onPublic`, { event: e, callback: i(t) }),
    };
  }),
  xt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.emitReadyEvent = void 0);
    var t = bt(),
      n = Ot(),
      r = (0, K().getCallBridge)(),
      i = `EXTENSION_READY`;
    e.emitReadyEvent = async () => {
      let e = await n.view.getContext();
      await t.events.emit(i, { localId: e.localId });
      try {
        await r(`emitReadyEvent`);
      } catch {}
    };
  }),
  St = a((e, t) => {
    console.info(`
IFRAME-RESIZER

Iframe-Resizer 5 is now available via the following two packages:

 * @iframe-resizer/parent
 * @iframe-resizer/child

Additionally their are also new versions of iframe-resizer for React, Vue, and jQuery.

Version 5 of iframe-resizer has been extensively rewritten to use modern browser APIs, which has enabled significantly better performance and greater accuracy in the detection of content resizing events.

Please see https://iframe-resizer.com/upgrade for more details.
`),
      (function (e) {
        if (typeof window > `u`) return;
        var n = 0,
          r,
          i = !1,
          a = !1,
          o = 7,
          s = `[iFrameSizer]`,
          c = s.length,
          l = null,
          u = window.requestAnimationFrame,
          d = Object.freeze({
            max: 1,
            scroll: 1,
            bodyScroll: 1,
            documentElementScroll: 1,
          }),
          f = {},
          p = null,
          m = Object.freeze({
            autoResize: !0,
            bodyBackground: null,
            bodyMargin: null,
            bodyMarginV1: 8,
            bodyPadding: null,
            checkOrigin: !0,
            inPageLinks: !1,
            enablePublicMethods: !0,
            heightCalculationMethod: `bodyOffset`,
            id: `iFrameResizer`,
            interval: 32,
            license: `1jqr0si6pnt`,
            log: !1,
            maxHeight: 1 / 0,
            maxWidth: 1 / 0,
            minHeight: 0,
            minWidth: 0,
            mouseEvents: !0,
            resizeFrom: `parent`,
            scrolling: !1,
            sizeHeight: !0,
            sizeWidth: !1,
            warningTimeout: 5e3,
            tolerance: 0,
            widthCalculationMethod: `scroll`,
            onClose: function () {
              return !0;
            },
            onClosed: function () {},
            onInit: function () {},
            onMessage: function () {
              C(`onMessage function not defined`);
            },
            onMouseEnter: function () {},
            onMouseLeave: function () {},
            onResized: function () {},
            onScroll: function () {
              return !0;
            },
          });
        function h() {
          return (
            window.MutationObserver ||
            window.WebKitMutationObserver ||
            window.MozMutationObserver
          );
        }
        function g(e, t, n) {
          e.addEventListener(t, n, !1);
        }
        function ee(e, t, n) {
          e.removeEventListener(t, n, !1);
        }
        function _() {
          for (
            var e = [`moz`, `webkit`, `o`, `ms`], t = 0;
            t < e.length && !u;
            t += 1
          )
            u = window[e[t] + `RequestAnimationFrame`];
          u
            ? (u = u.bind(window))
            : x(`setup`, `RequestAnimationFrame not supported`);
        }
        function v(e) {
          var t = `Host page: ` + e;
          return (
            window.top !== window.self &&
              (t =
                window.parentIFrame && window.parentIFrame.getId
                  ? window.parentIFrame.getId() + `: ` + e
                  : `Nested host page: ` + e),
            t
          );
        }
        function y(e) {
          return s + `[` + v(e) + `]`;
        }
        function b(e) {
          return f[e] ? f[e].log : i;
        }
        function x(e, t) {
          w(`log`, e, t, b(e));
        }
        function S(e, t) {
          w(`info`, e, t, b(e));
        }
        function C(e, t) {
          w(`warn`, e, t, !0);
        }
        function w(e, t, n, r) {
          !0 === r && typeof window.console == `object` && console[e](y(t), n);
        }
        function T(e) {
          function t() {
            function e() {
              j(W), te(G), L(`onResized`, W);
            }
            a(`Height`), a(`Width`), M(e, W, `init`);
          }
          function n() {
            var e = U.slice(c).split(`:`),
              t = e[1] ? parseInt(e[1], 10) : 0,
              n = f[e[0]] && f[e[0]].iframe,
              a = getComputedStyle(n);
            return {
              iframe: n,
              id: e[0],
              height: t + r(a) + i(a),
              width: e[2],
              type: e[3],
            };
          }
          function r(e) {
            return e.boxSizing === `border-box`
              ? (e.paddingTop ? parseInt(e.paddingTop, 10) : 0) +
                  (e.paddingBottom ? parseInt(e.paddingBottom, 10) : 0)
              : 0;
          }
          function i(e) {
            return e.boxSizing === `border-box`
              ? (e.borderTopWidth ? parseInt(e.borderTopWidth, 10) : 0) +
                  (e.borderBottomWidth ? parseInt(e.borderBottomWidth, 10) : 0)
              : 0;
          }
          function a(e) {
            var t = Number(f[G][`max` + e]),
              n = Number(f[G][`min` + e]),
              r = e.toLowerCase(),
              i = Number(W[r]);
            x(G, `Checking ` + r + ` is in range ` + n + `-` + t),
              i < n && ((i = n), x(G, `Set ` + r + ` to min value`)),
              i > t && ((i = t), x(G, `Set ` + r + ` to max value`)),
              (W[r] = `` + i);
          }
          function u() {
            function t() {
              function e() {
                var e = 0,
                  t = !1;
                for (
                  x(
                    G,
                    `Checking connection is from allowed list of origins: ` + r,
                  );
                  e < r.length;
                  e++
                )
                  if (r[e] === n) {
                    t = !0;
                    break;
                  }
                return t;
              }
              function t() {
                var e = f[G] && f[G].remoteHost;
                return x(G, `Checking connection is from: ` + e), n === e;
              }
              return r.constructor === Array ? e() : t();
            }
            var n = e.origin,
              r = f[G] && f[G].checkOrigin;
            if (r && `` + n != `null` && !t())
              throw Error(
                `Unexpected message received from: ` +
                  n +
                  ` for ` +
                  W.iframe.id +
                  `. Message was: ` +
                  e.data +
                  `. This error can be disabled by setting the checkOrigin: false option or by providing of array of trusted domains.`,
              );
            return !0;
          }
          function d() {
            return s === (`` + U).slice(0, c) && U.slice(c).split(`:`)[0] in f;
          }
          function p() {
            var e = W.type in { true: 1, false: 1, undefined: 1 };
            return e && x(G, `Ignoring init message from meta parent page`), e;
          }
          function m(e) {
            return U.slice(U.indexOf(`:`) + o + e);
          }
          function h(e) {
            x(
              G,
              `onMessage passed: {iframe: ` +
                W.iframe.id +
                `, message: ` +
                e +
                `}`,
            ),
              L(`onMessage`, { iframe: W.iframe, message: JSON.parse(e) }),
              x(G, `--`);
          }
          function _() {
            var e = document.body.getBoundingClientRect(),
              t = W.iframe.getBoundingClientRect();
            return JSON.stringify({
              iframeHeight: t.height,
              iframeWidth: t.width,
              clientHeight: Math.max(
                document.documentElement.clientHeight,
                window.innerHeight || 0,
              ),
              clientWidth: Math.max(
                document.documentElement.clientWidth,
                window.innerWidth || 0,
              ),
              offsetTop: parseInt(t.top - e.top, 10),
              offsetLeft: parseInt(t.left - e.left, 10),
              scrollTop: window.pageYOffset,
              scrollLeft: window.pageXOffset,
              documentHeight: document.documentElement.clientHeight,
              documentWidth: document.documentElement.clientWidth,
              windowHeight: window.innerHeight,
              windowWidth: window.innerWidth,
            });
          }
          function v(e, t) {
            function n() {
              N(`Send Page Info`, `pageInfo:` + _(), e, t);
            }
            R(n, 32, t);
          }
          function y() {
            function e(e, n) {
              function i() {
                f[r] ? v(f[r].iframe, r) : t();
              }
              [`scroll`, `resize`].forEach(function (t) {
                x(r, e + t + ` listener for sendPageInfo`), n(window, t, i);
              });
            }
            function t() {
              e(`Remove `, ee);
            }
            function n() {
              e(`Add `, g);
            }
            var r = G;
            n(), f[r] && (f[r].stopPageInfo = t);
          }
          function b() {
            f[G] &&
              f[G].stopPageInfo &&
              (f[G].stopPageInfo(), delete f[G].stopPageInfo);
          }
          function w() {
            var e = !0;
            return (
              W.iframe === null &&
                (C(G, `IFrame (` + W.id + `) not found`), (e = !1)),
              e
            );
          }
          function T(e) {
            var t = e.getBoundingClientRect();
            return (
              k(G),
              {
                x: Math.floor(Number(t.left) + Number(l.x)),
                y: Math.floor(Number(t.top) + Number(l.y)),
              }
            );
          }
          function D(e) {
            function t() {
              (l = a), re(), x(G, `--`);
            }
            function n() {
              return { x: Number(W.width) + i.x, y: Number(W.height) + i.y };
            }
            function r() {
              window.parentIFrame
                ? window.parentIFrame[`scrollTo` + (e ? `Offset` : ``)](
                    a.x,
                    a.y,
                  )
                : C(
                    G,
                    `Unable to scroll to requested position, window.parentIFrame not found`,
                  );
            }
            var i = e ? T(W.iframe) : { x: 0, y: 0 },
              a = n();
            x(
              G,
              `Reposition requested from iFrame (offset x:` +
                i.x +
                ` y:` +
                i.y +
                `)`,
            ),
              window.top === window.self ? t() : r();
          }
          function re() {
            !1 === L(`onScroll`, l) ? A() : te(G);
          }
          function F(e) {
            function t() {
              var e = T(a);
              x(
                G,
                `Moving to in page link (#` +
                  r +
                  `) at x: ` +
                  e.x +
                  ` y: ` +
                  e.y,
              ),
                (l = { x: e.x, y: e.y }),
                re(),
                x(G, `--`);
            }
            function n() {
              window.parentIFrame
                ? window.parentIFrame.moveToAnchor(r)
                : x(
                    G,
                    `In page link #` +
                      r +
                      ` not found and window.parentIFrame not found`,
                  );
            }
            var r = e.split(`#`)[1] || ``,
              i = decodeURIComponent(r),
              a =
                document.getElementById(i) || document.getElementsByName(i)[0];
            a
              ? t()
              : window.top === window.self
                ? x(G, `In page link #` + r + ` not found`)
                : n();
          }
          function I(e) {
            var t = {};
            if (Number(W.width) === 0 && Number(W.height) === 0) {
              var n = m(9).split(`:`);
              t = { x: n[1], y: n[0] };
            } else t = { x: W.width, y: W.height };
            L(e, {
              iframe: W.iframe,
              screenX: Number(t.x),
              screenY: Number(t.y),
              type: W.type,
            });
          }
          function L(e, t) {
            return E(G, e, t);
          }
          function z() {
            switch ((f[G] && f[G].firstRun && H(), W.type)) {
              case `close`:
                O(W.iframe);
                break;
              case `message`:
                h(m(6));
                break;
              case `mouseenter`:
                I(`onMouseEnter`);
                break;
              case `mouseleave`:
                I(`onMouseLeave`);
                break;
              case `autoResize`:
                f[G].autoResize = JSON.parse(m(9));
                break;
              case `scrollTo`:
                D(!1);
                break;
              case `scrollToOffset`:
                D(!0);
                break;
              case `pageInfo`:
                v(f[G] && f[G].iframe, G), y();
                break;
              case `pageInfoStop`:
                b();
                break;
              case `inPageLink`:
                F(m(9));
                break;
              case `reset`:
                ne(W);
                break;
              case `init`:
                t(), L(`onInit`, W.iframe);
                break;
              default:
                Number(W.width) === 0 && Number(W.height) === 0
                  ? C(
                      `Unsupported message received (` +
                        W.type +
                        `), this is likely due to the iframe containing a later version of iframe-resizer than the parent page`,
                    )
                  : t();
            }
          }
          function B(e) {
            var t = !0;
            return (
              f[e] ||
                ((t = !1),
                C(W.type + ` No settings for ` + e + `. Message was: ` + U)),
              t
            );
          }
          function V() {
            for (var e in f) N(`iFrame requested init`, P(e), f[e].iframe, e);
          }
          function H() {
            f[G] && (f[G].firstRun = !1);
          }
          var U = e.data,
            W = {},
            G = null;
          U === `[iFrameResizerChild]Ready`
            ? V()
            : d()
              ? ((W = n()),
                (G = W.id),
                f[G] && (f[G].loaded = !0),
                !p() && B(G) && (x(G, `Received: ` + U), w() && u() && z()))
              : S(G, `Ignored: ` + U);
        }
        function E(e, t, n) {
          var r = null,
            i = null;
          if (f[e]) {
            if (((r = f[e][t]), typeof r == `function`)) i = r(n);
            else throw TypeError(t + ` on iFrame[` + e + `] is not a function`);
          }
          return i;
        }
        function D(e) {
          var t = e.id;
          delete f[t];
        }
        function O(e) {
          var t = e.id;
          if (E(t, `onClose`, t) === !1) {
            x(t, `Close iframe cancelled by onClose event`);
            return;
          }
          x(t, `Removing iFrame: ` + t);
          try {
            e.parentNode && e.parentNode.removeChild(e);
          } catch (e) {
            C(e);
          }
          E(t, `onClosed`, t), x(t, `--`), D(e), (r &&= (r.disconnect(), null));
        }
        function k(t) {
          l === null &&
            ((l = {
              x:
                window.pageXOffset === e
                  ? document.documentElement.scrollLeft
                  : window.pageXOffset,
              y:
                window.pageYOffset === e
                  ? document.documentElement.scrollTop
                  : window.pageYOffset,
            }),
            x(t, `Get page position: ` + l.x + `,` + l.y));
        }
        function te(e) {
          l !== null &&
            (window.scrollTo(l.x, l.y),
            x(e, `Set page position: ` + l.x + `,` + l.y),
            A());
        }
        function A() {
          l = null;
        }
        function ne(e) {
          function t() {
            j(e), N(`reset`, `reset`, e.iframe, e.id);
          }
          x(
            e.id,
            `Size reset requested by ` +
              (e.type === `init` ? `host page` : `iFrame`),
          ),
            k(e.id),
            M(t, e, `reset`);
        }
        function j(e) {
          function t(t) {
            if (!e.id) {
              x(`undefined`, `messageData id not set`);
              return;
            }
            (e.iframe.style[t] = e[t] + `px`),
              x(e.id, `IFrame (` + i + `) ` + t + ` set to ` + e[t] + `px`);
          }
          function n(t) {
            !a &&
              e[t] === `0` &&
              ((a = !0),
              x(i, `Hidden iFrame detected, creating visibility listener`),
              z());
          }
          function r(e) {
            t(e), n(e);
          }
          var i = e.iframe.id;
          f[i] &&
            (f[i].sizeHeight && r(`height`), f[i].sizeWidth && r(`width`));
        }
        function M(e, t, n) {
          n !== t.type && u && !window.jasmine
            ? (x(t.id, `Requesting animation frame`), u(e))
            : e();
        }
        function N(e, t, n, r, i) {
          function a() {
            var i = f[r] && f[r].targetOrigin;
            x(
              r,
              `[` +
                e +
                `] Sending msg to iframe[` +
                r +
                `] (` +
                t +
                `) targetOrigin: ` +
                i,
            ),
              n.contentWindow.postMessage(s + t, i);
          }
          function o() {
            C(r, `[` + e + `] IFrame(` + r + `) not found`);
          }
          function c() {
            n && `contentWindow` in n && n.contentWindow !== null ? a() : o();
          }
          function l() {
            function e() {
              f[r] &&
                !f[r].loaded &&
                !u &&
                ((u = !0),
                C(
                  r,
                  `IFrame has not responded within ` +
                    f[r].warningTimeout / 1e3 +
                    ` seconds. Check iFrameResizer.contentWindow.js has been loaded in iFrame. This message can be ignored if everything is working, or you can set the warningTimeout option to a higher value or zero to suppress this warning.`,
                ));
            }
            i &&
              f[r] &&
              f[r].warningTimeout &&
              (f[r].msgTimeout = setTimeout(e, f[r].warningTimeout));
          }
          var u = !1;
          (r ||= n.id), f[r] && (c(), l());
        }
        function P(e) {
          return (
            e +
            `:` +
            f[e].bodyMarginV1 +
            `:` +
            f[e].sizeWidth +
            `:` +
            f[e].log +
            `:` +
            f[e].interval +
            `:` +
            f[e].enablePublicMethods +
            `:` +
            f[e].autoResize +
            `:` +
            f[e].bodyMargin +
            `:` +
            f[e].heightCalculationMethod +
            `:` +
            f[e].bodyBackground +
            `:` +
            f[e].bodyPadding +
            `:` +
            f[e].tolerance +
            `:` +
            f[e].inPageLinks +
            `:` +
            f[e].resizeFrom +
            `:` +
            f[e].widthCalculationMethod +
            `:` +
            f[e].mouseEvents
          );
        }
        function re(e) {
          return typeof e == `number`;
        }
        function F(t, a) {
          function o() {
            function e(e) {
              var n = f[E][e];
              n !== 1 / 0 &&
                n !== 0 &&
                ((t.style[e] = re(n) ? n + `px` : n),
                x(E, `Set ` + e + ` = ` + t.style[e]));
            }
            function n(e) {
              if (f[E][`min` + e] > f[E][`max` + e])
                throw Error(
                  `Value for min` + e + ` can not be greater than max` + e,
                );
            }
            n(`Height`),
              n(`Width`),
              e(`maxHeight`),
              e(`minHeight`),
              e(`maxWidth`),
              e(`minWidth`);
          }
          function s() {
            var e = (a && a.id) || m.id + n++;
            return document.getElementById(e) !== null && (e += n++), e;
          }
          function c(e) {
            if (typeof e != `string`)
              throw TypeError(`Invaild id for iFrame. Expected String`);
            return (
              e === `` &&
                ((t.id = e = s()),
                (i = (a || {}).log),
                x(e, `Added missing iframe ID: ` + e + ` (` + t.src + `)`)),
              e
            );
          }
          function l() {
            switch (
              (x(
                E,
                `IFrame scrolling ` +
                  (f[E] && f[E].scrolling ? `enabled` : `disabled`) +
                  ` for ` +
                  E,
              ),
              (t.style.overflow =
                !1 === (f[E] && f[E].scrolling) ? `hidden` : `auto`),
              f[E] && f[E].scrolling)
            ) {
              case `omit`:
                break;
              case !0:
                t.scrolling = `yes`;
                break;
              case !1:
                t.scrolling = `no`;
                break;
              default:
                t.scrolling = f[E] ? f[E].scrolling : `no`;
            }
          }
          function u() {
            (typeof (f[E] && f[E].bodyMargin) == `number` ||
              (f[E] && f[E].bodyMargin) === `0`) &&
              ((f[E].bodyMarginV1 = f[E].bodyMargin),
              (f[E].bodyMargin = `` + f[E].bodyMargin + `px`));
          }
          function p() {
            var e = f[E] && f[E].firstRun,
              n = f[E] && f[E].heightCalculationMethod in d;
            !e && n && ne({ iframe: t, height: 0, width: 0, type: `init` });
          }
          function ee() {
            f[E] &&
              (f[E].iframe.iFrameResizer = {
                close: O.bind(null, f[E].iframe),
                removeListeners: D.bind(null, f[E].iframe),
                resize: N.bind(null, `Window resize`, `resize`, f[E].iframe),
                moveToAnchor: function (e) {
                  N(`Move to anchor`, `moveToAnchor:` + e, f[E].iframe, E);
                },
                sendMessage: function (e) {
                  (e = JSON.stringify(e)),
                    N(`Send Message`, `message:` + e, f[E].iframe, E);
                },
              });
          }
          function _(n) {
            function i() {
              N(`iFrame.onload`, n, t, e, !0), p();
            }
            function a(e) {
              if (!t.parentNode) return null;
              var n = new e(function (e) {
                e.forEach(function (e) {
                  Array.prototype.slice
                    .call(e.removedNodes)
                    .forEach(function (e) {
                      e === t && O(t);
                    });
                });
              });
              return n.observe(t.parentNode, { childList: !0 }), n;
            }
            var o = h();
            o && (r = a(o)), g(t, `load`, i), N(`init`, n, t, e, !0);
          }
          function v(e) {
            if (typeof e != `object`)
              throw TypeError(`Options is not an object`);
          }
          function y(e) {
            for (var t in m)
              Object.prototype.hasOwnProperty.call(m, t) &&
                (f[E][t] = Object.prototype.hasOwnProperty.call(e, t)
                  ? e[t]
                  : m[t]);
          }
          function b(e) {
            return e === `` ||
              e.match(/^(about:blank|javascript:|file:\/\/)/) !== null
              ? `*`
              : e;
          }
          function S(e) {
            var t = e.split(`Callback`);
            if (t.length === 2) {
              var n = `on` + t[0].charAt(0).toUpperCase() + t[0].slice(1);
              (this[n] = this[e]),
                delete this[e],
                C(
                  E,
                  `Deprecated: '` +
                    e +
                    `' has been renamed '` +
                    n +
                    `'. The old method will be removed in the next major version.`,
                );
            }
          }
          function w(e) {
            (e ||= {}),
              (f[E] = Object.create(null)),
              (f[E].iframe = t),
              (f[E].firstRun = !0),
              (f[E].remoteHost =
                t.src && t.src.split(`/`).slice(0, 3).join(`/`)),
              v(e),
              Object.keys(e).forEach(S, e),
              y(e),
              f[E] &&
                (f[E].targetOrigin =
                  !0 === f[E].checkOrigin ? b(f[E].remoteHost) : `*`);
          }
          function T() {
            return E in f && `iFrameResizer` in t;
          }
          var E = c(t.id);
          T()
            ? C(E, `Ignored iFrame, already setup.`)
            : (w(a), l(), o(), u(), _(P(E)), ee());
        }
        function I(e, t) {
          p === null &&
            (p = setTimeout(function () {
              (p = null), e();
            }, t));
        }
        var L = {};
        function R(e, t, n) {
          L[n] ||
            (L[n] = setTimeout(function () {
              (L[n] = null), e();
            }, t));
        }
        function z() {
          function e() {
            function e(e) {
              function t(t) {
                return (f[e] && f[e].iframe.style[t]) === `0px`;
              }
              function n(e) {
                return e.offsetParent !== null;
              }
              f[e] &&
                n(f[e].iframe) &&
                (t(`height`) || t(`width`)) &&
                N(`Visibility change`, `resize`, f[e].iframe, e);
            }
            Object.keys(f).forEach(function (t) {
              e(t);
            });
          }
          function t(t) {
            x(`window`, `Mutation observed: ` + t[0].target + ` ` + t[0].type),
              I(e, 16);
          }
          function n() {
            var e = document.querySelector(`body`);
            new r(t).observe(e, {
              attributes: !0,
              attributeOldValue: !1,
              characterData: !0,
              characterDataOldValue: !1,
              childList: !0,
              subtree: !0,
            });
          }
          var r = h();
          r && n();
        }
        function B(e) {
          function t() {
            H(`Window ` + e, `resize`);
          }
          x(`window`, `Trigger event: ` + e), I(t, 16);
        }
        function V() {
          function e() {
            H(`Tab Visible`, `resize`);
          }
          document.visibilityState !== `hidden` &&
            (x(`document`, `Trigger event: Visibility change`), I(e, 16));
        }
        function H(e, t) {
          function n(e) {
            return (
              f[e] &&
              f[e].resizeFrom === `parent` &&
              f[e].autoResize &&
              !f[e].firstRun
            );
          }
          Object.keys(f).forEach(function (r) {
            n(r) && N(e, t, f[r].iframe, r);
          });
        }
        function U() {
          g(window, `message`, T),
            g(window, `resize`, function () {
              B(`resize`);
            }),
            g(document, `visibilitychange`, V),
            g(document, `-webkit-visibilitychange`, V);
        }
        function W() {
          function t(e, t) {
            function n() {
              if (!t.tagName)
                throw TypeError(`Object is not a valid DOM element`);
              if (t.tagName.toUpperCase() !== `IFRAME`)
                throw TypeError(
                  `Expected <IFRAME> tag, found <` + t.tagName + `>`,
                );
            }
            t && (n(), F(t, e), r.push(t));
          }
          function n(e) {
            e &&
              e.enablePublicMethods &&
              C(
                `enablePublicMethods option has been removed, public methods are now always available in the iFrame`,
              );
          }
          var r;
          return (
            _(),
            U(),
            function (i, a) {
              switch (((r = []), n(i), typeof a)) {
                case `undefined`:
                case `string`:
                  Array.prototype.forEach.call(
                    document.querySelectorAll(a || `iframe`),
                    t.bind(e, i),
                  );
                  break;
                case `object`:
                  t(i, a);
                  break;
                default:
                  throw TypeError(`Unexpected data type (` + typeof a + `)`);
              }
              return r;
            }
          );
        }
        function G(e) {
          e.fn
            ? e.fn.iFrameResize ||
              (e.fn.iFrameResize = function (e) {
                function t(t, n) {
                  F(n, e);
                }
                return this.filter(`iframe`).each(t).end();
              })
            : S(``, `Unable to bind to jQuery, it is not fully loaded.`);
        }
        window.jQuery !== e && G(window.jQuery),
          typeof define == `function` && define.amd
            ? define([], W)
            : typeof t == `object` &&
              typeof t.exports == `object` &&
              (t.exports = W()),
          (window.iFrameResize = window.iFrameResize || W());
      })();
  }),
  Ct = a((e, t) => {
    (function (e) {
      if (typeof window > `u`) return;
      var n = !0,
        r = 10,
        i = ``,
        a = 0,
        o = ``,
        s = null,
        c = ``,
        l = !1,
        u = { resize: 1, click: 1 },
        d = 128,
        f = !0,
        p = 1,
        m = `bodyOffset`,
        h = m,
        g = !0,
        ee = ``,
        _ = {},
        v = 32,
        y = null,
        b = !1,
        x = !1,
        S = `[iFrameSizer]`,
        C = S.length,
        w = ``,
        T = { max: 1, min: 1, bodyScroll: 1, documentElementScroll: 1 },
        E = `child`,
        D = !0,
        O = window.parent,
        k = `*`,
        te = 0,
        A = !1,
        ne = null,
        j = 16,
        M = 1,
        N = `scroll`,
        P = N,
        re = window,
        F = function () {
          J(`onMessage function not defined`);
        },
        I = function () {},
        L = function () {},
        R = {
          height: function () {
            return (
              J(`Custom height calculation function not defined`),
              document.documentElement.offsetHeight
            );
          },
          width: function () {
            return (
              J(`Custom width calculation function not defined`),
              document.body.scrollWidth
            );
          },
        },
        z = {},
        B = !1;
      function V() {}
      try {
        var H = Object.create(
          {},
          {
            passive: {
              get: function () {
                B = !0;
              },
            },
          },
        );
        window.addEventListener(`test`, V, H),
          window.removeEventListener(`test`, V, H);
      } catch {}
      function U(e, t, n, r) {
        e.addEventListener(t, n, B ? r || {} : !1);
      }
      function W(e, t, n) {
        e.removeEventListener(t, n, !1);
      }
      function G(e) {
        return e.charAt(0).toUpperCase() + e.slice(1);
      }
      function K(e) {
        var t,
          n,
          r,
          i = null,
          a = 0,
          o = function () {
            (a = Date.now()),
              (i = null),
              (r = e.apply(t, n)),
              i || (t = n = null);
          };
        return function () {
          var s = Date.now();
          a ||= s;
          var c = j - (s - a);
          return (
            (t = this),
            (n = arguments),
            c <= 0 || c > j
              ? ((i &&= (clearTimeout(i), null)),
                (a = s),
                (r = e.apply(t, n)),
                i || (t = n = null))
              : (i ||= setTimeout(o, c)),
            r
          );
        };
      }
      function ie(e) {
        return S + `[` + w + `] ` + e;
      }
      function q(e) {
        b && typeof window.console == `object` && console.log(ie(e));
      }
      function J(e) {
        typeof window.console == `object` && console.warn(ie(e));
      }
      function ae() {
        oe(),
          q(`Initialising iFrame (` + window.location.href + `)`),
          ce(),
          de(),
          ue(`background`, i),
          ue(`padding`, c),
          be(),
          he(),
          ge(),
          fe(),
          Ce(),
          Se(),
          _e(),
          (_ = xe()),
          Q(`init`, `Init message from host page`),
          I();
      }
      function oe() {
        function t(e) {
          return e === `true`;
        }
        var r = ee.slice(C).split(`:`);
        (w = r[0]),
          (a = e === r[1] ? a : Number(r[1])),
          (l = e === r[2] ? l : t(r[2])),
          (b = e === r[3] ? b : t(r[3])),
          (v = e === r[4] ? v : Number(r[4])),
          (n = e === r[6] ? n : t(r[6])),
          (o = r[7]),
          (h = e === r[8] ? h : r[8]),
          (i = r[9]),
          (c = r[10]),
          (te = e === r[11] ? te : Number(r[11])),
          (_.enable = e !== r[12] && t(r[12])),
          (E = e === r[13] ? E : r[13]),
          (P = e === r[14] ? P : r[14]),
          (x = e === r[15] ? x : t(r[15]));
      }
      function se(e) {
        var t = e.split(`Callback`);
        if (t.length === 2) {
          var n = `on` + t[0].charAt(0).toUpperCase() + t[0].slice(1);
          (this[n] = this[e]),
            delete this[e],
            J(
              `Deprecated: '` +
                e +
                `' has been renamed '` +
                n +
                `'. The old method will be removed in the next major version.`,
            );
        }
      }
      function ce() {
        function e() {
          var e = window.iFrameResizer;
          q(`Reading data from page: ` + JSON.stringify(e)),
            Object.keys(e).forEach(se, e),
            (F = `onMessage` in e ? e.onMessage : F),
            (I = `onReady` in e ? e.onReady : I),
            (k = `targetOrigin` in e ? e.targetOrigin : k),
            (h =
              `heightCalculationMethod` in e ? e.heightCalculationMethod : h),
            (P = `widthCalculationMethod` in e ? e.widthCalculationMethod : P);
        }
        function t(e, t) {
          return (
            typeof e == `function` &&
              (q(`Setup custom ` + t + `CalcMethod`),
              (R[t] = e),
              (e = `custom`)),
            e
          );
        }
        `iFrameResizer` in window &&
          Object === window.iFrameResizer.constructor &&
          (e(), (h = t(h, `height`)), (P = t(P, `width`))),
          q(`TargetOrigin for parent set to: ` + k);
      }
      function le(e, t) {
        return (
          t.indexOf(`-`) !== -1 &&
            (J(`Negative CSS value ignored for ` + e), (t = ``)),
          t
        );
      }
      function ue(t, n) {
        e !== n &&
          n !== `` &&
          n !== `null` &&
          ((document.body.style[t] = n),
          q(`Body ` + t + ` set to "` + n + `"`));
      }
      function de() {
        e === o && (o = a + `px`), ue(`margin`, le(`margin`, o));
      }
      function fe() {
        (document.documentElement.style.height = ``),
          (document.body.style.height = ``),
          q(`HTML & body height set to "auto"`);
      }
      function Y(e) {
        var t = {
          add: function (t) {
            function n() {
              Q(e.eventName, e.eventType);
            }
            (z[t] = n), U(window, t, n, { passive: !0 });
          },
          remove: function (e) {
            var t = z[e];
            delete z[e], W(window, e, t);
          },
        };
        e.eventNames && Array.prototype.map
          ? ((e.eventName = e.eventNames[0]), e.eventNames.map(t[e.method]))
          : t[e.method](e.eventName),
          q(G(e.method) + ` event listener: ` + e.eventType);
      }
      function pe(e) {
        Y({
          method: e,
          eventType: `Animation Start`,
          eventNames: [`animationstart`, `webkitAnimationStart`],
        }),
          Y({
            method: e,
            eventType: `Animation Iteration`,
            eventNames: [`animationiteration`, `webkitAnimationIteration`],
          }),
          Y({
            method: e,
            eventType: `Animation End`,
            eventNames: [`animationend`, `webkitAnimationEnd`],
          }),
          Y({ method: e, eventType: `Input`, eventName: `input` }),
          Y({ method: e, eventType: `Mouse Up`, eventName: `mouseup` }),
          Y({ method: e, eventType: `Mouse Down`, eventName: `mousedown` }),
          Y({
            method: e,
            eventType: `Orientation Change`,
            eventName: `orientationchange`,
          }),
          Y({
            method: e,
            eventType: `Print`,
            eventNames: [`afterprint`, `beforeprint`],
          }),
          Y({
            method: e,
            eventType: `Ready State Change`,
            eventName: `readystatechange`,
          }),
          Y({ method: e, eventType: `Touch Start`, eventName: `touchstart` }),
          Y({ method: e, eventType: `Touch End`, eventName: `touchend` }),
          Y({ method: e, eventType: `Touch Cancel`, eventName: `touchcancel` }),
          Y({
            method: e,
            eventType: `Transition Start`,
            eventNames: [
              `transitionstart`,
              `webkitTransitionStart`,
              `MSTransitionStart`,
              `oTransitionStart`,
              `otransitionstart`,
            ],
          }),
          Y({
            method: e,
            eventType: `Transition Iteration`,
            eventNames: [
              `transitioniteration`,
              `webkitTransitionIteration`,
              `MSTransitionIteration`,
              `oTransitionIteration`,
              `otransitioniteration`,
            ],
          }),
          Y({
            method: e,
            eventType: `Transition End`,
            eventNames: [
              `transitionend`,
              `webkitTransitionEnd`,
              `MSTransitionEnd`,
              `oTransitionEnd`,
              `otransitionend`,
            ],
          }),
          E === `child` &&
            Y({ method: e, eventType: `IFrame Resized`, eventName: `resize` });
      }
      function me(e, t, n, r) {
        return (
          t !== e &&
            (e in n ||
              (J(e + ` is not a valid option for ` + r + `CalculationMethod.`),
              (e = t)),
            q(r + ` calculation method set to "` + e + `"`)),
          e
        );
      }
      function he() {
        h = me(h, m, X, `height`);
      }
      function ge() {
        P = me(P, N, Z, `width`);
      }
      function _e() {
        !0 === n ? (pe(`add`), Ee()) : q(`Auto Resize disabled`);
      }
      function ve() {
        s !== null && s.disconnect();
      }
      function ye() {
        pe(`remove`), ve(), clearInterval(y);
      }
      function be() {
        var e = document.createElement(`div`);
        (e.style.clear = `both`),
          (e.style.display = `block`),
          (e.style.height = `0`),
          document.body.appendChild(e);
      }
      function xe() {
        function t() {
          return {
            x:
              window.pageXOffset === e
                ? document.documentElement.scrollLeft
                : window.pageXOffset,
            y:
              window.pageYOffset === e
                ? document.documentElement.scrollTop
                : window.pageYOffset,
          };
        }
        function n(e) {
          var n = e.getBoundingClientRect(),
            r = t();
          return {
            x: parseInt(n.left, 10) + parseInt(r.x, 10),
            y: parseInt(n.top, 10) + parseInt(r.y, 10),
          };
        }
        function r(t) {
          function r(e) {
            var t = n(e);
            q(
              `Moving to in page link (#` + i + `) at x: ` + t.x + ` y: ` + t.y,
            ),
              $(t.y, t.x, `scrollToOffset`);
          }
          var i = t.split(`#`)[1] || t,
            a = decodeURIComponent(i),
            o = document.getElementById(a) || document.getElementsByName(a)[0];
          e === o
            ? (q(
                `In page link (#` +
                  i +
                  `) not found in iFrame, so sending to parent`,
              ),
              $(0, 0, `inPageLink`, `#` + i))
            : r(o);
        }
        function i() {
          var e = window.location.hash,
            t = window.location.href;
          e !== `` && e !== `#` && r(t);
        }
        function a() {
          function e(e) {
            function t(e) {
              e.preventDefault(), r(this.getAttribute(`href`));
            }
            e.getAttribute(`href`) !== `#` && U(e, `click`, t);
          }
          Array.prototype.forEach.call(
            document.querySelectorAll(`a[href^="#"]`),
            e,
          );
        }
        function o() {
          U(window, `hashchange`, i);
        }
        function s() {
          setTimeout(i, d);
        }
        function c() {
          Array.prototype.forEach && document.querySelectorAll
            ? (q(`Setting up location.hash handlers`), a(), o(), s())
            : J(
                `In page linking not fully supported in this browser! (See README.md for IE8 workaround)`,
              );
        }
        return (
          _.enable ? c() : q(`In page linking not enabled`), { findTarget: r }
        );
      }
      function Se() {
        if (x !== !0) return;
        function e(e) {
          $(0, 0, e.type, e.screenY + `:` + e.screenX);
        }
        function t(t, n) {
          q(`Add event listener: ` + n), U(window.document, t, e);
        }
        t(`mouseenter`, `Mouse Enter`), t(`mouseleave`, `Mouse Leave`);
      }
      function Ce() {
        q(`Enable public methods`),
          (re.parentIFrame = {
            autoResize: function (e) {
              return (
                !0 === e && !1 === n
                  ? ((n = !0), _e())
                  : !1 === e && !0 === n && ((n = !1), ye()),
                $(0, 0, `autoResize`, JSON.stringify(n)),
                n
              );
            },
            close: function () {
              $(0, 0, `close`);
            },
            getId: function () {
              return w;
            },
            getPageInfo: function (e) {
              typeof e == `function`
                ? ((L = e), $(0, 0, `pageInfo`))
                : ((L = function () {}), $(0, 0, `pageInfoStop`));
            },
            moveToAnchor: function (e) {
              _.findTarget(e);
            },
            reset: function () {
              Le(`parentIFrame.reset`);
            },
            scrollTo: function (e, t) {
              $(t, e, `scrollTo`);
            },
            scrollToOffset: function (e, t) {
              $(t, e, `scrollToOffset`);
            },
            sendMessage: function (e, t) {
              $(0, 0, `message`, JSON.stringify(e), t);
            },
            setHeightCalculationMethod: function (e) {
              (h = e), he();
            },
            setWidthCalculationMethod: function (e) {
              (P = e), ge();
            },
            setTargetOrigin: function (e) {
              q(`Set targetOrigin: ` + e), (k = e);
            },
            size: function (e, t) {
              Q(
                `size`,
                `parentIFrame.size(` +
                  (`` + (e || ``) + (t ? `,` + t : ``)) +
                  `)`,
                e,
                t,
              );
            },
          });
      }
      function we() {
        v !== 0 &&
          (q(`setInterval: ` + v + `ms`),
          (y = setInterval(function () {
            Q(`interval`, `setInterval: ` + v);
          }, Math.abs(v))));
      }
      function Te() {
        function e(e) {
          function t(e) {
            !1 === e.complete &&
              (q(`Attach listeners to ` + e.src),
              e.addEventListener(`load`, i, !1),
              e.addEventListener(`error`, a, !1),
              c.push(e));
          }
          e.type === `attributes` && e.attributeName === `src`
            ? t(e.target)
            : e.type === `childList` &&
              Array.prototype.forEach.call(e.target.querySelectorAll(`img`), t);
        }
        function t(e) {
          c.splice(c.indexOf(e), 1);
        }
        function n(e) {
          q(`Remove listeners from ` + e.src),
            e.removeEventListener(`load`, i, !1),
            e.removeEventListener(`error`, a, !1),
            t(e);
        }
        function r(e, t, r) {
          n(e.target), Q(t, r + `: ` + e.target.src);
        }
        function i(e) {
          r(e, `imageLoad`, `Image loaded`);
        }
        function a(e) {
          r(e, `imageLoadFailed`, `Image load failed`);
        }
        function o(t) {
          Q(
            `mutationObserver`,
            `mutationObserver: ` + t[0].target + ` ` + t[0].type,
          ),
            t.forEach(e);
        }
        function s() {
          var e = document.querySelector(`body`);
          return (
            (u = new l(o)),
            q(`Create body MutationObserver`),
            u.observe(e, {
              attributes: !0,
              attributeOldValue: !1,
              characterData: !0,
              characterDataOldValue: !1,
              childList: !0,
              subtree: !0,
            }),
            u
          );
        }
        var c = [],
          l = window.MutationObserver || window.WebKitMutationObserver,
          u = s();
        return {
          disconnect: function () {
            `disconnect` in u &&
              (q(`Disconnect body MutationObserver`),
              u.disconnect(),
              c.forEach(n));
          },
        };
      }
      function Ee() {
        var e = 0 > v;
        window.MutationObserver || window.WebKitMutationObserver
          ? e
            ? we()
            : (s = Te())
          : (q(`MutationObserver not supported in this browser!`), we());
      }
      function De(e, t) {
        var n = 0;
        return (
          (t ||= document.body),
          (n = document.defaultView.getComputedStyle(t, null)),
          (n = n === null ? 0 : n[e]),
          parseInt(n, r)
        );
      }
      function Oe(e) {
        e > j / 2 &&
          ((j = 2 * e), q(`Event throttle increased to ` + j + `ms`));
      }
      function ke(e, t) {
        for (
          var n = t.length, r = 0, i = 0, a = G(e), o = Date.now(), s = 0;
          s < n;
          s++
        )
          (r = t[s].getBoundingClientRect()[e] + De(`margin` + a, t[s])),
            r > i && (i = r);
        return (
          (o = Date.now() - o),
          q(`Parsed ` + n + ` HTML elements`),
          q(`Element position calculated in ` + o + `ms`),
          Oe(o),
          i
        );
      }
      function Ae(e) {
        return [
          e.bodyOffset(),
          e.bodyScroll(),
          e.documentElementOffset(),
          e.documentElementScroll(),
        ];
      }
      function je(e, t) {
        function n() {
          return (
            J(`No tagged elements (` + t + `) found on page`),
            document.querySelectorAll(`body *`)
          );
        }
        var r = document.querySelectorAll(`[` + t + `]`);
        return r.length === 0 && n(), ke(e, r);
      }
      function Me() {
        return document.querySelectorAll(`body *`);
      }
      var X = {
          bodyOffset: function () {
            return (
              document.body.offsetHeight + De(`marginTop`) + De(`marginBottom`)
            );
          },
          offset: function () {
            return X.bodyOffset();
          },
          bodyScroll: function () {
            return document.body.scrollHeight;
          },
          custom: function () {
            return R.height();
          },
          documentElementOffset: function () {
            return document.documentElement.offsetHeight;
          },
          documentElementScroll: function () {
            return document.documentElement.scrollHeight;
          },
          max: function () {
            return Math.max.apply(null, Ae(X));
          },
          min: function () {
            return Math.min.apply(null, Ae(X));
          },
          grow: function () {
            return X.max();
          },
          lowestElement: function () {
            return Math.max(
              X.bodyOffset() || X.documentElementOffset(),
              ke(`bottom`, Me()),
            );
          },
          taggedElement: function () {
            return je(`bottom`, `data-iframe-height`);
          },
        },
        Z = {
          bodyScroll: function () {
            return document.body.scrollWidth;
          },
          bodyOffset: function () {
            return document.body.offsetWidth;
          },
          custom: function () {
            return R.width();
          },
          documentElementScroll: function () {
            return document.documentElement.scrollWidth;
          },
          documentElementOffset: function () {
            return document.documentElement.offsetWidth;
          },
          scroll: function () {
            return Math.max(Z.bodyScroll(), Z.documentElementScroll());
          },
          max: function () {
            return Math.max.apply(null, Ae(Z));
          },
          min: function () {
            return Math.min.apply(null, Ae(Z));
          },
          rightMostElement: function () {
            return ke(`right`, Me());
          },
          taggedElement: function () {
            return je(`right`, `data-iframe-width`);
          },
        };
      function Ne(t, n, r, i) {
        function a() {
          (p = f), (M = m), $(p, M, t);
        }
        function o() {
          function t(e, t) {
            return !(Math.abs(e - t) <= te);
          }
          return (
            (f = e === r ? X[h]() : r),
            (m = e === i ? Z[P]() : i),
            t(p, f) || (l && t(M, m))
          );
        }
        function s() {
          return !(t in { init: 1, interval: 1, size: 1 });
        }
        function c() {
          return h in T || (l && P in T);
        }
        function u() {
          q(`No change in size detected`);
        }
        function d() {
          s() && c() ? Le(n) : t in { interval: 1 } || u();
        }
        var f, m;
        o() || t === `init` ? (Fe(), a()) : d();
      }
      var Pe = K(Ne);
      function Q(e, t, n, r) {
        function i() {
          e in { reset: 1, resetPage: 1, init: 1 } || q(`Trigger event: ` + t);
        }
        function a() {
          return A && e in u;
        }
        a()
          ? q(`Trigger event cancelled: ` + e)
          : (i(), e === `init` ? Ne(e, t, n, r) : Pe(e, t, n, r));
      }
      function Fe() {
        A || ((A = !0), q(`Trigger event lock on`)),
          clearTimeout(ne),
          (ne = setTimeout(function () {
            (A = !1), q(`Trigger event lock off`), q(`--`);
          }, d));
      }
      function Ie(e) {
        (p = X[h]()), (M = Z[P]()), $(p, M, e);
      }
      function Le(e) {
        var t = h;
        (h = m), q(`Reset trigger event: ` + e), Fe(), Ie(`reset`), (h = t);
      }
      function $(t, n, r, i, a) {
        function o() {
          e === a ? (a = k) : q(`Message targetOrigin: ` + a);
        }
        function s() {
          var o = t + `:` + n,
            s = w + `:` + o + `:` + r + (e === i ? `` : `:` + i);
          q(`Sending message to host page (` + s + `)`),
            O.postMessage(S + s, a);
        }
        !0 === D && (o(), s());
      }
      function Re(n) {
        var r = {
          init: function () {
            (ee = n.data),
              (O = n.source),
              ae(),
              (f = !1),
              setTimeout(function () {
                g = !1;
              }, d);
          },
          reset: function () {
            g
              ? q(`Page reset ignored by init`)
              : (q(`Page size reset by host page`), Ie(`resetPage`));
          },
          resize: function () {
            Q(`resizeParent`, `Parent window requested size check`);
          },
          moveToAnchor: function () {
            _.findTarget(o());
          },
          inPageLink: function () {
            this.moveToAnchor();
          },
          pageInfo: function () {
            var e = o();
            q(`PageInfoFromParent called from parent: ` + e),
              L(JSON.parse(e)),
              q(` --`);
          },
          message: function () {
            var e = o();
            q(`onMessage called from parent: ` + e), F(JSON.parse(e)), q(` --`);
          },
        };
        function i() {
          return S === (`` + n.data).slice(0, C);
        }
        function a() {
          return n.data.split(`]`)[1].split(`:`)[0];
        }
        function o() {
          return n.data.slice(n.data.indexOf(`:`) + 1);
        }
        function s() {
          return (
            (!(t !== void 0 && t.exports) && `iFrameResize` in window) ||
            (window.jQuery !== e && `iFrameResize` in window.jQuery.prototype)
          );
        }
        function c() {
          return n.data.split(`:`)[2] in { true: 1, false: 1 };
        }
        function l() {
          var e = a();
          e in r
            ? r[e]()
            : !s() && !c() && J(`Unexpected message (` + n.data + `)`);
        }
        function u() {
          !1 === f
            ? l()
            : c()
              ? r.init()
              : q(
                  `Ignored message of type "` +
                    a() +
                    `". Received before initialization.`,
                );
        }
        i() && u();
      }
      function ze() {
        document.readyState !== `loading` &&
          window.parent.postMessage(`[iFrameResizerChild]Ready`, `*`);
      }
      `iframeResizer` in window ||
        ((window.iframeChildListener = function (e) {
          Re({ data: e, sameDomian: !0 });
        }),
        U(window, `message`, Re),
        U(window, `readystatechange`, ze),
        ze());
    })();
  }),
  wt = a((e, t) => {
    var n = St();
    t.exports = { iframeResize: n, iframeResizer: n, contentWindow: Ct() };
  }),
  Tt = a((e) => {
    var t =
        (e && e.__createBinding) ||
        (Object.create
          ? function (e, t, n, r) {
              r === void 0 && (r = n);
              var i = Object.getOwnPropertyDescriptor(t, n);
              (!i ||
                (`get` in i ? !t.__esModule : i.writable || i.configurable)) &&
                (i = {
                  enumerable: !0,
                  get: function () {
                    return t[n];
                  },
                }),
                Object.defineProperty(e, r, i);
            }
          : function (e, t, n, r) {
              r === void 0 && (r = n), (e[r] = t[n]);
            }),
      n =
        (e && e.__setModuleDefault) ||
        (Object.create
          ? function (e, t) {
              Object.defineProperty(e, "default", { enumerable: !0, value: t });
            }
          : function (e, t) {
              e.default = t;
            }),
      r =
        (e && e.__importStar) ||
        (function () {
          var e = function (t) {
            return (
              (e =
                Object.getOwnPropertyNames ||
                function (e) {
                  var t = [];
                  for (var n in e)
                    Object.prototype.hasOwnProperty.call(e, n) &&
                      (t[t.length] = n);
                  return t;
                }),
              e(t)
            );
          };
          return function (r) {
            if (r && r.__esModule) return r;
            var i = {};
            if (r != null)
              for (var a = e(r), o = 0; o < a.length; o++)
                a[o] !== "default" && t(i, r, a[o]);
            return n(i, r), i;
          };
        })();
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.createAdfRendererIframeProps = e.sendMessageWhenReady = void 0);
    var i = 1e4;
    (e.sendMessageWhenReady = (e, t, n) => {
      let r = () => e?.contentWindow?.postMessage(t, n),
        a = setTimeout(() => {
          window.removeEventListener(`message`, o), r();
        }, i),
        o = (t) => {
          t.source === e?.contentWindow &&
            t.data?.source === `forge-adf-renderer-ready` &&
            (clearTimeout(a), window.removeEventListener(`message`, o), r());
        };
      window.addEventListener(`message`, o);
    }),
      (e.createAdfRendererIframeProps = async (t, n) => {
        let i = await Promise.resolve().then(() => r(wt())),
          a = i.default || i,
          o = new URL(document.referrer).origin,
          s = `${o}/forge-apps/adf-renderer`,
          c = n || `forge-adf-renderer-iframe-${crypto.randomUUID()}`;
        return (
          setTimeout(() => {
            (document.documentElement.style.height = `auto`),
              (document.body.style.height = `auto`);
          }, 200),
          {
            id: c,
            src: s,
            onLoad: () => {
              let n = document.getElementById(c),
                r = {
                  type: `adf-document`,
                  document: t.extension.macro?.body,
                  timestamp: Date.now(),
                  source: `forge-adf-renderer`,
                  localId: t.localId,
                  isEditing: t.extension?.isEditing ?? !1,
                  contentId: t.extension?.content?.id,
                };
              a.iframeResizer(
                {
                  heightCalculationMethod: `taggedElement`,
                  widthCalculationMethod: `bodyScroll`,
                  initCallback: (e) => {
                    var t;
                    (t = e?.iFrameResizer) == null || t.resize();
                  },
                },
                n || ``,
              ),
                (0, e.sendMessageWhenReady)(n, r, o);
            },
          }
        );
      });
  }),
  Et = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.onClose = void 0);
    var t = K(),
      n = G(),
      r = (0, t.getCallBridge)();
    e.onClose = async (e) => {
      try {
        if ((await r(`onClose`, e)) === !1)
          throw new n.BridgeAPIError("`onClose` call has failed.");
      } catch {
        throw new n.BridgeAPIError(
          "`onClose` failed because this resource's view is not closable.",
        );
      }
    };
  }),
  Dt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.getFrameDispatch = void 0);
    var t = (0, K().getCallBridge)();
    e.getFrameDispatch = async () => await t(`getFrameDispatch`);
  }),
  Ot = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.view = void 0);
    var t = le(),
      n = ue(),
      r = de(),
      i = fe(),
      a = Y(),
      o = ht(),
      s = gt(),
      c = _t(),
      l = xt(),
      u = Tt(),
      d = Et(),
      f = Dt();
    e.view = {
      submit: t.submit,
      close: n.close,
      onClose: d.onClose,
      open: r.open,
      refresh: i.refresh,
      createHistory: a.createHistory,
      getContext: o.getContext,
      getFrameDispatch: f.getFrameDispatch,
      theme: c.theme,
      changeWindowTitle: s.changeWindowTitle,
      emitReadyEvent: l.emitReadyEvent,
      createAdfRendererIframeProps: u.createAdfRendererIframeProps,
    };
  }),
  kt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (U(), c(l)).__exportStar(Ot(), e);
  }),
  At = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.router = void 0);
    var t = (0, K().getCallBridge)();
    e.router = {
      getUrl: async (e) => {
        if (!e?.target) throw Error(`target is required for getUrl`);
        let n = await t(`getUrl`, e);
        if (!n) throw Error(`Failed to get URL`);
        try {
          return new URL(n);
        } catch (e) {
          throw Error(`Failed to parse URL: ${n} (${e})`);
        }
      },
      navigate: (e) => {
        if (typeof e == `string`)
          return t(`navigate`, { url: e, type: `same-tab` });
        if (!e?.target) throw Error(`target is required for navigation`);
        return t(`navigate`, { ...e, type: `same-tab` });
      },
      open: (e) => {
        if (typeof e == `string`)
          return t(`navigate`, { url: e, type: `new-tab` });
        if (!e?.target) throw Error(`target is required for navigation`);
        return t(`navigate`, { ...e, type: `new-tab` });
      },
      reload: async () => t(`reload`),
    };
  }),
  jt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (U(), c(l)).__exportStar(At(), e);
  }),
  Mt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.Modal = void 0);
    var t = K(),
      n = G(),
      r = (0, t.getCallBridge)(),
      i = [
        `small`,
        `medium`,
        `large`,
        `xlarge`,
        `max`,
        `fullscreen`,
        `resizable`,
      ],
      a = () => {};
    function o(e) {
      return typeof e == `string` && i.includes(e);
    }
    function s(e) {
      if (typeof e != `object` || !e) return !1;
      let t = e;
      return (
        typeof t.width == `string` &&
        (t.height === void 0 || typeof t.height == `string`)
      );
    }
    function c(e) {
      return o(e) || s(e);
    }
    e.Modal = class {
      constructor(e) {
        (this.resource = e?.resource || null),
          (this.onClose = e?.onClose || a),
          (this.size = e?.size || `medium`),
          (this.context = e?.context || {}),
          (this.closeOnEscape = e?.closeOnEscape ?? !0),
          (this.closeOnOverlayClick = e?.closeOnOverlayClick ?? !0),
          (this.title = e?.title || ``),
          (this.icon = e?.icon || ``);
      }
      async open() {
        if (!c(this.size))
          throw new n.BridgeAPIError(
            `Invalid modal size: ${JSON.stringify(this.size)}. Must be one of the named sizes (${i.join(`, `)}) or a custom dimensions object with a "width" string property and an optional "height" string property.`,
          );
        try {
          if (
            (await r(`openModal`, {
              resource: this.resource,
              onClose: this.onClose,
              size: this.size,
              context: this.context,
              closeOnEscape: this.closeOnEscape,
              closeOnOverlayClick: this.closeOnOverlayClick,
              title: this.title,
              icon: this.icon,
            })) === !1
          )
            throw new n.BridgeAPIError(`Unable to open modal.`);
        } catch {
          throw new n.BridgeAPIError(`Unable to open modal.`);
        }
      }
    };
  }),
  Nt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (U(), c(l)).__exportStar(Mt(), e);
  }),
  Pt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.productFetchApi = e.remoteFetchApi = void 0);
    var t = vt(),
      n = async (e, n = !1) => {
        let r = {};
        for (let [i, a] of e.entries())
          if (n ? i.startsWith(`file`) : i === `file`) {
            let e = a.name,
              n = a.type;
            (r[i] = await (0, t.blobToBase64)(a)),
              (r[`__${i}Name`] = e),
              (r[`__${i}Type`] = n);
          } else r[i] = a;
        return JSON.stringify(r);
      },
      r = (e) => {
        if (!e) return e;
        if (`signal` in e) {
          let { signal: t, ...n } = e;
          return (
            console.error(
              `Signal is not supported in @forge/bridge and was removed from fetch options. Please use the fetch method from @forge/api for signal support.`,
            ),
            n
          );
        }
        return e;
      },
      i = async (e, t) => {
        let r = t?.body instanceof FormData,
          i = r ? await n(t?.body, e === `remote`) : t?.body,
          a = new Request(``, {
            body: i,
            method: t?.method,
            headers: t?.headers,
          }),
          o = Object.fromEntries(a.headers.entries());
        return {
          body: a.method === `GET` ? null : await a.text(),
          headers: new Headers(o),
          isMultipartFormData: r,
        };
      };
    (e.remoteFetchApi = (e) => {
      let n = async (n, a) => {
        let o = r(a),
          {
            body: s,
            headers: c,
            isMultipartFormData: l,
          } = await i(`remote`, o),
          {
            body: u,
            headers: d,
            statusText: f,
            status: p,
            isAttachment: m,
          } = await e(`fetchRemote`, {
            remoteKey: n,
            fetchRequestInit: { ...o, body: s, headers: [...c.entries()] },
            isMultipartFormData: l,
          }),
          h = m ? (0, t.base64ToBlob)(u, d[`content-type`]) : u;
        return new Response(h || null, {
          headers: d,
          status: p,
          statusText: f,
        });
      };
      return { requestRemote: (e, t) => n(e, t) };
    }),
      (e.productFetchApi = (e) => {
        let n = async (n, a, o) => {
          let s = r(o),
            {
              body: c,
              headers: l,
              isMultipartFormData: u,
            } = await i(`product`, s);
          l.has(`X-Atlassian-Token`) || l.set(`X-Atlassian-Token`, `no-check`);
          let {
              body: d,
              headers: f,
              statusText: p,
              status: m,
              isAttachment: h,
            } = await e(`fetchProduct`, {
              product: n,
              restPath: a,
              fetchRequestInit: { ...s, body: c, headers: [...l.entries()] },
              isMultipartFormData: u,
            }),
            g = h ? (0, t.base64ToBlob)(d, f[`content-type`]) : d;
          return new Response(g || null, {
            headers: f,
            status: m,
            statusText: p,
          });
        };
        return {
          requestConfluence: (e, t) => n(`confluence`, e, t),
          requestJira: (e, t) => n(`jira`, e, t),
          requestBitbucket: (e, t) => n(`bitbucket`, e, t),
        };
      });
  }),
  Ft = a((e) => {
    var t;
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.requestRemote =
        e.requestBitbucket =
        e.requestJira =
        e.requestConfluence =
          void 0);
    var n = K(),
      r = Pt();
    (t = (0, r.productFetchApi)((0, n.getCallBridge)())),
      (e.requestConfluence = t.requestConfluence),
      (e.requestJira = t.requestJira),
      (e.requestBitbucket = t.requestBitbucket),
      (e.requestRemote = (0, r.remoteFetchApi)(
        (0, n.getCallBridge)(),
      ).requestRemote);
  }),
  It = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.requestTeamworkGraph = void 0);
    var t = (0, K().getCallBridge)();
    e.requestTeamworkGraph = async (e, n) =>
      await t(`requestTeamworkGraph`, { query: e, variables: n });
  }),
  Lt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.showFlag = void 0);
    var t = K(),
      n = G(),
      r = (0, t.getCallBridge)();
    e.showFlag = (e) => {
      if (!e.id)
        throw new n.BridgeAPIError(`"id" must be defined in flag options`);
      let t = r(`showFlag`, { ...e, type: e.type ?? `info` });
      return { close: async () => (await t, r(`closeFlag`, { id: e.id })) };
    };
  }),
  Rt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.showFlag = void 0);
    var t = Lt();
    Object.defineProperty(e, "showFlag", {
      enumerable: !0,
      get: function () {
        return t.showFlag;
      },
    });
  }),
  zt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (U(), c(l)).__exportStar(bt(), e);
  }),
  Bt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.realtime = void 0);
    var t = (0, K().getCallBridge)();
    e.realtime = {
      publish: (e, n, r) =>
        t(`publishRealtimeChannel`, {
          channelName: e,
          eventPayload: n,
          options: r,
        }),
      subscribe: (e, n, r) =>
        t(`subscribeRealtimeChannel`, {
          channelName: e,
          onEvent: n,
          options: r,
        }),
      publishGlobal: (e, n, r) =>
        t(`publishRealtimeChannel`, {
          channelName: e,
          eventPayload: n,
          options: r,
          isGlobal: !0,
        }),
      subscribeGlobal: (e, n, r) =>
        t(`subscribeRealtimeChannel`, {
          channelName: e,
          onEvent: n,
          options: r,
          isGlobal: !0,
        }),
    };
  }),
  Vt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.Bitbucket = e.Confluence = e.Jira = void 0);
    var t;
    (function (e) {
      (e.Board = `board`), (e.Issue = `issue`), (e.Project = `project`);
    })(t || (e.Jira = t = {}));
    var n;
    (function (e) {
      (e.Content = `content`), (e.Space = `space`);
    })(n || (e.Confluence = n = {}));
    var r;
    (function (e) {
      (e.Repository = `repository`), (e.PullRequest = `pullRequest`);
    })(r || (e.Bitbucket = r = {}));
  }),
  Ht = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.Bitbucket = e.Confluence = e.Jira = e.realtime = void 0);
    var t = Bt();
    Object.defineProperty(e, "realtime", {
      enumerable: !0,
      get: function () {
        return t.realtime;
      },
    });
    var n = Vt();
    Object.defineProperty(e, "Jira", {
      enumerable: !0,
      get: function () {
        return n.Jira;
      },
    }),
      Object.defineProperty(e, "Confluence", {
        enumerable: !0,
        get: function () {
          return n.Confluence;
        },
      }),
      Object.defineProperty(e, "Bitbucket", {
        enumerable: !0,
        get: function () {
          return n.Bitbucket;
        },
      });
  }),
  Ut = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.open = e.OPEN_ROVO_BRIDGE_ERROR_MESSAGE = void 0);
    var t = K(),
      n = G(),
      r = 30,
      i = (0, t.getCallBridge)();
    e.OPEN_ROVO_BRIDGE_ERROR_MESSAGE = `Unable to open Rovo Chat due to usage in an unsupported product. Only Confluence, Jira and some Jira Service Management modules are supported at this point. See https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/rovo/`;
    var a = (e) => {
      switch (e.type) {
        case `forge`:
          return {
            agentName: e.agentName,
            agentKey: e.agentKey,
            prompt: e.prompt,
          };
        case `atlassian`:
          return { agentName: e.agentName, prompt: e.prompt };
        default:
          return { prompt: e.prompt };
      }
    };
    e.open = async (t) => {
      if (t.type === `forge`) {
        if (t.agentName.length > r) throw Error(`rovo agent name too long`);
        if (t.agentKey.length > r) throw Error(`rovo agent key too long`);
      }
      if ((await i(`openRovo`, a(t))) === !1)
        throw new n.BridgeAPIError(e.OPEN_ROVO_BRIDGE_ERROR_MESSAGE);
    };
  }),
  Wt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.isEnabled = void 0);
    var t = (0, K().getCallBridge)();
    e.isEnabled = () => t(`isRovoEnabled`);
  }),
  Gt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.rovo = void 0);
    var t = Ut(),
      n = Wt();
    e.rovo = { open: t.open, isEnabled: n.isEnabled };
  }),
  Kt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (U(), c(l)).__exportStar(Gt(), e);
  }),
  qt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.createTranslationFunction =
        e.getTranslations =
        e.resetTranslationsCache =
          void 0);
    var t = mt(),
      n = kt(),
      r = new t.TranslationsGetter({
        getI18nInfoConfig: async () => {
          let e = await fetch(
            `./${t.I18N_BUNDLE_FOLDER_NAME}/${t.I18N_INFO_FILE_NAME}`,
          );
          if (!e.ok)
            throw Error(`Failed to get i18n info config: ` + e.statusText);
          return (await e.json()).config;
        },
        getTranslationResource: async (e) => {
          let n = await fetch(`./${t.I18N_BUNDLE_FOLDER_NAME}/${e}.json`);
          if (!n.ok)
            throw Error(`Failed to get translation resource for locale: ${e}`);
          return n.json();
        },
      });
    (e.resetTranslationsCache = () => {
      r.reset();
    }),
      (e.getTranslations = async (e = null, t = { fallback: !0 }) => {
        let i = e;
        return (
          (i ||= (await n.view.getContext()).locale),
          await r.getTranslations(i, t)
        );
      }),
      (e.createTranslationFunction = async (e = null) => {
        let i = e;
        i ||= (await n.view.getContext()).locale;
        let a = new t.Translator(i, r);
        return await a.init(), (e, t) => a.translate(e) ?? t ?? e;
      });
  }),
  Jt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.permissions = void 0);
    var t = (0, K().getCallBridge)();
    e.permissions = {
      egress: {
        get: async (e) => t(`__permission__egressGet`, e),
        set: async (e) => t(`__permission__egressSet`, e),
        deleteDomain: async (e) => t(`__permission__egressDeleteDomain`, e),
        deleteGroup: async (e) => t(`__permission__egressDeleteGroup`, e),
      },
      remote: {
        get: async (e) => t(`__permission__remoteGet`, e),
        set: async (e) => t(`__permission__remoteSet`, e),
      },
    };
  }),
  Yt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }), (e.parseUrl = t);
    function t(e) {
      let t = e.match(/^(.*?:)/)?.[0] ?? `https:`,
        n = e
          .replace(t, ``)
          .replace(/^\/*/, ``)
          .replace(/^\\*/, ``)
          .split(`?`)[0]
          .split(`#`)[0],
        r = n.split(`/`)[0];
      return { protocol: t, hostname: r, pathname: n.slice(r.length) || `/` };
    }
  }),
  Xt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.getEgressesBasedOnToggles =
        e.sortAndGroupEgressPermissionsByDomain =
        e.EgressCategory =
        e.EgressType =
          void 0),
      (e.globToRegex = n);
    var t = Yt();
    function n(e) {
      let t = e.replace(/[.+?^${}()|[\]\\]/g, `\\$&`).replace(/\*/g, `.*`);
      return RegExp(`^${t}$`);
    }
    e.sortAndGroupEgressPermissionsByDomain = (e) => {
      if (e?.length === 0) return [];
      let r = /^(.*?:\/\/)/,
        i = new Set(),
        a = [];
      return (
        e.forEach((e) => {
          let o = r.test(e) ? e : `https://${e}`,
            s = (0, t.parseUrl)(o);
          s.hostname.startsWith(`*`)
            ? (i.add(s.hostname.substring(2)), a.push(n(s.hostname)))
            : i.add(s.hostname);
        }),
        [...i]
          .sort()
          .reduce((e, t) => (a.some((e) => e.test(t)) || e.push(t), e), [])
      );
    };
    var r;
    (function (e) {
      (e.FetchBackendSide = `FETCH_BACKEND_SIDE`),
        (e.FetchClientSide = `FETCH_CLIENT_SIDE`),
        (e.Fonts = `FONTS`),
        (e.Frames = `FRAMES`),
        (e.Images = `IMAGES`),
        (e.Media = `MEDIA`),
        (e.Scripts = `SCRIPTS`),
        (e.Styles = `STYLES`);
    })(r || (e.EgressType = r = {}));
    var i;
    (function (e) {
      e.ANALYTICS = `ANALYTICS`;
    })(i || (e.EgressCategory = i = {})),
      (e.getEgressesBasedOnToggles = (e) => {
        let t = e.egress.filter((t) =>
            t.category?.toUpperCase() === i.ANALYTICS
              ? e.installationConfig
                ? e.installationConfig.find(
                    (e) => e.key.toUpperCase() === `ALLOW_EGRESS_ANALYTICS`,
                  )?.value !== !1
                : e.overrides.ALLOW_EGRESS_ANALYTICS !== !1
              : !0,
          ),
          n = new Map();
        for (let e of t)
          n.has(e.type) || n.set(e.type, e.addresses),
            n.set(e.type, [...n.get(e.type), ...e.addresses]);
        return [...n.entries()].map(([e, t]) => ({
          type: e,
          addresses: [...new Set(t)],
        }));
      });
  }),
  Zt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.EgressFilteringService = void 0);
    var t = Yt(),
      n = Xt();
    e.EgressFilteringService = class {
      constructor(e) {
        (this.URLs = e
          .filter((e) => !e.startsWith(`*`))
          .map((e) => this.parseUrl(e))),
          (this.wildcardDomains = e
            .filter((e) => e !== `*`)
            .map((e) => this.parseUrl(e))
            .filter((e) => decodeURIComponent(e.hostname).startsWith(`*`))
            .map((e) => ({
              ...e,
              regex: (0, n.globToRegex)(decodeURIComponent(e.hostname)),
            }))),
          (this.allowsEverything = e.includes(`*`));
      }
      parseUrl(e) {
        return (0, t.parseUrl)(e);
      }
      containsWildCardEgress() {
        return this.allowsEverything;
      }
      isValidUrl(e) {
        if (this.allowsEverything) return !0;
        let t = this.parseUrl(e);
        return (
          this.allowedDomainExact(t, this.URLs) ||
          this.allowedDomainPattern(t, this.wildcardDomains)
        );
      }
      isValidUrlCSP(e) {
        if (this.allowsEverything) return !0;
        let t = this.parseUrl(e);
        return (
          this.allowedDomainExactAndPath(t, this.URLs) ||
          this.allowedDomainPatternAndPath(t, this.wildcardDomains)
        );
      }
      allowedDomainExact(e, t) {
        return t
          .filter((t) => t.protocol === e.protocol)
          .some((t) => t.hostname === e.hostname);
      }
      allowedDomainExactAndPath(e, t) {
        return t
          .filter((t) => this.protocolMatchesCSP(t.protocol, e.protocol))
          .filter((t) => t.hostname === e.hostname)
          .some((t) => this.pathMatches(t.pathname, e.pathname));
      }
      allowedDomainPattern(e, t) {
        return t
          .filter((t) => t.protocol === e.protocol)
          .some((t) => t.regex.test(e.hostname));
      }
      allowedDomainPatternAndPath(e, t) {
        return t
          .filter((t) => this.protocolMatchesCSP(t.protocol, e.protocol))
          .filter((t) => t.regex.test(e.hostname))
          .some((t) => this.pathMatches(t.pathname, e.pathname));
      }
      protocolMatchesCSP(e, t) {
        return (
          e === t ||
          (e === `http:` && t === `https:`) ||
          (e === `ws:` && t === `wss:`)
        );
      }
      pathMatches(e, t) {
        return e === `/` ? !0 : e.endsWith(`/`) ? t.startsWith(e) : t === e;
      }
    };
  }),
  Qt = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    var t = (U(), c(l));
    t.__exportStar(Zt(), e), t.__exportStar(Yt(), e), t.__exportStar(Xt(), e);
  }),
  $t = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (U(), c(l)).__exportStar(Qt(), e);
  }),
  en = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.createPermissionUtils = o),
      (e.checkPermissions = m);
    var t = $t(),
      n = kt();
    function r(e) {
      return typeof e == `string`
        ? e
        : `address` in e && e.address
          ? e.address
          : e.remote || ``;
    }
    var i = [`fonts`, `styles`, `frames`, `images`, `media`, `scripts`],
      a = [`backend`, `client`];
    function o(e) {
      if (!e) return null;
      let { scopes: n, external: i = {} } = e,
        a = Array.isArray(n) ? n : Object.keys(n || {});
      return {
        hasScope: (e) => a.includes(e),
        canFetchFrom: (e, n) => {
          let a = i.fetch?.[e];
          if (!a?.length) return !1;
          let o = a.map(r).filter((e) => e.length > 0);
          if (o.length === 0) return !1;
          let s = new t.EgressFilteringService(o);
          return e === `client` ? s.isValidUrlCSP(n) : s.isValidUrl(n);
        },
        canLoadResource: (e, n) => {
          let a = i[e];
          if (!a?.length) return !1;
          let o = a.map(r).filter((e) => e.length > 0);
          return (
            o.length !== 0 && new t.EgressFilteringService(o).isValidUrlCSP(n)
          );
        },
        getScopes: () => a,
        getExternalPermissions: () => i,
        hasAnyPermissions: () => a.length > 0 || Object.keys(i).length > 0,
      };
    }
    function s(e, t) {
      if (!e?.length) return;
      let n = e.filter((e) => !t.hasScope(e));
      return n.length > 0 ? n : void 0;
    }
    function c(e, t) {
      if (!e?.fetch) return;
      let n = {};
      return (
        a.forEach((r) => {
          let i = e.fetch?.[r];
          if (i?.length) {
            let e = i.filter((e) => !t.canFetchFrom(r, e));
            e.length > 0 && (n[r] = e);
          }
        }),
        Object.keys(n).length > 0 ? n : void 0
      );
    }
    function l(e, t) {
      let n = {};
      return (
        i.forEach((r) => {
          let i = e?.[r];
          if (i?.length) {
            let e = i.filter((e) => !t.canLoadResource(r, e));
            e.length > 0 && (n[r] = e);
          }
        }),
        Object.keys(n).length > 0 ? n : void 0
      );
    }
    function u(e, t) {
      if (!e) return;
      let n = c(e, t),
        r = l(e, t);
      if (!n && !r) return;
      let i = {};
      return n && (i.fetch = n), r && Object.assign(i, r), i;
    }
    function d(e, t) {
      if (e !== void 0 && (typeof e != `object` || !e || Array.isArray(e)))
        throw TypeError(
          `${t} should be an object, not ${Array.isArray(e) ? `an array` : `a ${typeof e}`}`,
        );
    }
    function f(e, t) {
      if (e !== void 0 && !Array.isArray(e))
        throw TypeError(`${t} should be an array, not a ${typeof e}`);
    }
    function p(e) {
      f(e.scopes, `scopes`);
      let t = e.external;
      if (t !== void 0) {
        if ((d(t, `external`), t.fetch !== void 0)) {
          d(t.fetch, `external.fetch`);
          for (let e of a) f(t.fetch[e], `external.fetch.${e}`);
        }
        for (let e of i) f(t[e], `external.${e}`);
      }
    }
    async function m(e, t) {
      if (!e) return { granted: !1, missing: null };
      if ((p(e), !e.scopes?.length && !e.external))
        return { granted: !0, missing: null };
      let r = t;
      r ||= (await n.view.getContext()).permissions;
      let i = o(r);
      if (!i) return { granted: !1, missing: null };
      let a = {},
        c = !0,
        l = s(e.scopes, i);
      l && ((a.scopes = l), (c = !1));
      let d = u(e.external, i);
      return (
        d && ((a.external = d), (c = !1)), { granted: c, missing: c ? null : a }
      );
    }
  }),
  tn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    var t = (U(), c(l));
    t.__exportStar(Jt(), e), t.__exportStar(en(), e);
  }),
  nn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.upload = e.createUploadPromises = void 0);
    var t = J(),
      n = G(),
      r = (0, K().getCallBridge)(),
      i = (e, t) => {
        let n = atob(e),
          r = Array(n.length);
        for (let e = 0; e < n.length; e++) r[e] = n.charCodeAt(e);
        let i = new Uint8Array(r);
        return new Blob([i], { type: t || `application/octet-stream` });
      },
      a = async (e) => {
        let t = e.size,
          n = await e.arrayBuffer(),
          r = await crypto.subtle.digest(`SHA-256`, n),
          i = new Uint8Array(r);
        return {
          length: t,
          checksum: btoa(String.fromCharCode(...i)),
          checksumType: `SHA256`,
        };
      };
    (e.createUploadPromises = async ({ functionKey: e, objects: r }) => {
      if (!e || e.length === 0)
        throw new n.BridgeAPIError(
          `functionKey is required to filter and generate presigned URLs`,
        );
      if (!Array.isArray(r) || r.length === 0)
        throw new n.BridgeAPIError(
          `objects array is required and must not be empty`,
        );
      let o = r.map((e, t) => {
          if (e instanceof Blob) return e;
          if (
            !(
              e &&
              typeof e == `object` &&
              `data` in e &&
              typeof e.data == `string`
            )
          )
            throw new n.BridgeAPIError(
              `Invalid object type at index ${t}. Only Blob or Base64Object (with data string and optional mimeType) are accepted.`,
            );
          try {
            return i(e.data, e.mimeType);
          } catch {
            throw new n.BridgeAPIError(
              `Invalid base64 data at index ${t}. The data string must be valid base64 encoded.`,
            );
          }
        }),
        s = await Promise.all(o.map((e) => a(e))),
        c = await (0, t.invoke)(e, { allObjectMetadata: s });
      if (!c || typeof c != `object`)
        throw new n.BridgeAPIError(`Invalid response from functionKey`);
      let l = new Map(),
        u = new Map();
      return (
        o.forEach((e, t) => {
          let n = s[t];
          l.set(n.checksum, e), u.set(n.checksum, t);
        }),
        Object.entries(c).map(([e, t]) => {
          let { key: n, checksum: r } = t,
            i = l.get(r),
            a = u.get(r);
          return a === void 0
            ? {
                promise: Promise.resolve({
                  success: !1,
                  key: n,
                  error: `Index not found for checksum ${r}`,
                }),
                index: -1,
              }
            : i
              ? {
                  promise: (async () => {
                    try {
                      let t = await fetch(e, {
                        method: `PUT`,
                        body: i,
                        headers: {
                          "Content-Type": i.type || `application/octet-stream`,
                          "Content-Length": i.size.toString(),
                        },
                      });
                      return {
                        success: t.ok,
                        key: n,
                        status: t.status,
                        error: t.ok
                          ? void 0
                          : `Upload failed with status ${t.status}`,
                      };
                    } catch (e) {
                      return {
                        success: !1,
                        key: n,
                        status: 503,
                        error: e instanceof Error ? e.message : `Upload failed`,
                      };
                    }
                  })(),
                  index: a,
                  objectType: i.type,
                  objectSize: i.size,
                }
              : {
                  promise: Promise.resolve({
                    success: !1,
                    key: n,
                    error: `Blob not found for checksum ${r}`,
                  }),
                  index: a,
                };
        })
      );
    }),
      (e.upload = async ({ functionKey: t, objects: n }) => {
        r(`trackObjectStoreAction`, { action: `upload` });
        let i = await (0, e.createUploadPromises)({
          functionKey: t,
          objects: n,
        });
        return await Promise.all(i.map((e) => e.promise));
      });
  }),
  rn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.deleteObjects = void 0);
    var t = J(),
      n = G(),
      r = (0, K().getCallBridge)();
    e.deleteObjects = async ({ functionKey: e, keys: i }) => {
      if (
        (r(`trackObjectStoreAction`, { action: `delete` }),
        !e || e.length === 0)
      )
        throw new n.BridgeAPIError(`functionKey is required to delete objects`);
      if (!Array.isArray(i) || i.length === 0)
        throw new n.BridgeAPIError(
          `keys array is required and must not be empty`,
        );
      await Promise.all(
        i.map(async (n) => {
          await (0, t.invoke)(e, { key: n });
        }),
      );
    };
  }),
  an = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.download = void 0);
    var t = J(),
      n = G(),
      r = (0, K().getCallBridge)();
    e.download = async ({ functionKey: e, keys: i }) => {
      if (
        (r(`trackObjectStoreAction`, { action: `download` }),
        !e || e.length === 0)
      )
        throw new n.BridgeAPIError(
          `functionKey is required to filter and generate download URLs`,
        );
      if (!Array.isArray(i) || i.length === 0)
        throw new n.BridgeAPIError(
          `keys array is required and must not be empty`,
        );
      let a = await (0, t.invoke)(e, { keys: i });
      if (!a || typeof a != `object`)
        throw new n.BridgeAPIError(`Invalid response from functionKey`);
      let o = Object.entries(a).map(async ([e, t]) => {
        try {
          let n = await fetch(e, { method: `GET` });
          return n.ok
            ? { success: !0, key: t, blob: await n.blob(), status: n.status }
            : {
                success: !1,
                key: t,
                status: n.status,
                error: `Download failed with status ${n.status}`,
              };
        } catch (e) {
          return {
            success: !1,
            key: t,
            status: 503,
            error: e instanceof Error ? e.message : `Download failed`,
          };
        }
      });
      return await Promise.all(o);
    };
  }),
  on = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.getMetadata = void 0);
    var t = J(),
      n = G(),
      r = (0, K().getCallBridge)();
    e.getMetadata = async ({ functionKey: e, keys: i }) => {
      if (
        (r(`trackObjectStoreAction`, { action: `getMetadata` }),
        !e || e.length === 0)
      )
        throw new n.BridgeAPIError(
          `functionKey is required to filter and generate object metadata`,
        );
      if (!Array.isArray(i) || i.length === 0)
        throw new n.BridgeAPIError(
          `keys array is required and must not be empty`,
        );
      return await Promise.all(
        i.map(async (n) => {
          let r = await (0, t.invoke)(e, { key: n });
          return !r || typeof r != `object`
            ? { key: n, error: `Invalid response from functionKey` }
            : r;
        }),
      );
    };
  }),
  sn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.createUploadPromises = e.objectStore = void 0);
    var t = nn();
    Object.defineProperty(e, "createUploadPromises", {
      enumerable: !0,
      get: function () {
        return t.createUploadPromises;
      },
    });
    var n = rn(),
      r = an(),
      i = on();
    e.objectStore = {
      upload: t.upload,
      download: r.download,
      getMetadata: i.getMetadata,
      delete: n.deleteObjects,
    };
  }),
  cn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
  }),
  ln = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    var t = (U(), c(l));
    t.__exportStar(sn(), e), t.__exportStar(cn(), e);
  }),
  un = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.Evaluator = void 0),
      (e.Evaluator = class {
        constructor(e) {
          this.results = e;
        }
        checkFlag(e, t) {
          if (!this.results || !this.results.feature_flags) return t;
          let n = this.results.feature_flags,
            r = ``;
          try {
            r = this.getHashedValue(e);
          } catch (e) {
            return (
              console.error(
                `Unexpected error occurred while evaluating flag `,
                e,
              ),
              t
            );
          }
          if (!r) return t;
          let i = n[r];
          return i ? !i.disabled && i.value : t;
        }
        shutDown() {
          this.results = void 0;
        }
        getHashedValue(e) {
          if (typeof e != `string`) return ``;
          let t = e.trim();
          if (t.length === 0) return ``;
          let n = 5381;
          for (let e = 0; e < t.length; e += 1) {
            let r = t.charCodeAt(e);
            (n = (n << 5) + n + r), (n |= 0);
          }
          return (n >>> 0).toString();
        }
      });
  }),
  dn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.initFeatureFlags = void 0);
    var t = K(),
      n = G(),
      r = ie(),
      i = 500,
      a = 25e3,
      o = (0, t.getCallBridge)(),
      s = (e) => {
        if (!e || !e.user || !e.config)
          throw new n.BridgeAPIError(
            `Missing required parameters. Parameter user is required in the payload.`,
          );
        if (
          !e.config.environment ||
          ![`development`, `staging`, `production`].includes(
            e.config.environment,
          )
        )
          throw new n.BridgeAPIError(
            `Invalid environment. Valid environments are: development, staging, production`,
          );
        if (Object.values(e).some((e) => typeof e == `function`))
          throw new n.BridgeAPIError(
            `Passing functions as part of the payload is not supported!`,
          );
      };
    e.initFeatureFlags = (0, r.withRateLimiter)(
      (e) => (s(e), o(`initFeatureFlags`, { user: e.user, config: e.config })),
      i,
      a,
      `Feature flags initialisation calls are rate limited at ${i}req/${a / 1e3}s`,
    );
  }),
  fn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.FeatureFlags = void 0);
    var t = un(),
      n = dn();
    e.FeatureFlags = class {
      constructor() {
        this.initialized = !1;
      }
      async initialize(e, r = { environment: `development` }) {
        if (this.isInitialized()) return;
        r?.environment || (r.environment = `development`);
        let i = await (0, n.initFeatureFlags)({ user: e, config: r });
        (this.initialized = !0), (this.evaluator = new t.Evaluator(i));
      }
      checkFlag(e, t = !1) {
        if (!this.isInitialized() || !this.evaluator)
          throw Error(`FeatureFlags not initialized. Call initialize() first.`);
        return this.evaluator.checkFlag(e, t);
      }
      shutdown() {
        this.isInitialized() &&
          ((this.initialized = !1), this.evaluator.shutDown());
      }
      isInitialized() {
        return this.initialized;
      }
    };
  }),
  pn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.FeatureFlags = void 0);
    var t = fn();
    Object.defineProperty(e, "FeatureFlags", {
      enumerable: !0,
      get: function () {
        return t.FeatureFlags;
      },
    });
  }),
  mn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.frontendCustomMetrics = void 0);
    var t = K(),
      n = G(),
      r = (0, t.getCallBridge)(),
      i = async (e, t) => {
        await r(`emitFrontendCustomMetric`, { customMetricName: e, value: t });
      },
      a = 50,
      o = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/,
      s = (e) => {
        if (e.trim().length === 0)
          throw new n.BridgeAPIError(`Custom metric name cannot be empty`);
        if (e.length > a)
          throw new n.BridgeAPIError(
            `Custom metric name cannot exceed ${a} characters`,
          );
        if (!o.test(e))
          throw new n.BridgeAPIError(
            `Custom metric name must start and end with alphanumeric characters and can only contain letters, numbers, dots (.), and hyphens (-)`,
          );
        if (e.includes(`..`) || e.includes(`--`))
          throw new n.BridgeAPIError(
            `Custom metric name cannot contain consecutive dots or hyphens`,
          );
      };
    e.frontendCustomMetrics = {
      counter: (e) => (
        s(e),
        {
          incr: () => i(e, 1),
          incrBy: (t) => {
            if (t <= 0)
              throw new n.BridgeAPIError(
                `Counter value must be a positive number`,
              );
            return i(e, t);
          },
        }
      ),
    };
  }),
  hn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (U(), c(l)).__exportStar(mn(), e);
  }),
  gn = a((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.i18n = e.NavigationTarget = void 0);
    var t = (U(), c(l)),
      n = W();
    Object.defineProperty(e, "NavigationTarget", {
      enumerable: !0,
      get: function () {
        return n.NavigationTarget;
      },
    }),
      t.__exportStar(J(), e),
      t.__exportStar(ce(), e),
      t.__exportStar(kt(), e),
      t.__exportStar(jt(), e),
      t.__exportStar(Nt(), e),
      t.__exportStar(Ft(), e),
      t.__exportStar(It(), e),
      t.__exportStar(Rt(), e),
      t.__exportStar(zt(), e),
      t.__exportStar(Ht(), e),
      t.__exportStar(Kt(), e),
      (e.i18n = t.__importStar(qt())),
      t.__exportStar(tn(), e),
      t.__exportStar(ln(), e),
      t.__exportStar(pn(), e),
      t.__exportStar(hn(), e);
  })(),
  _n = document.querySelector(`#app`),
  vn = new URLSearchParams(window.location.search).get(`invitation`);
function yn(e) {
  _n.innerHTML = e;
}
function bn(e) {
  return `body` in e ? e.body : e;
}
function xn(e, t) {
  let n = document.createElement(`h1`);
  (n.textContent = e),
    _n.replaceChildren(
      n,
      ...t.map((e) => {
        let t = document.createElement(`p`);
        return (t.textContent = e), t;
      }),
    );
}
async function Sn() {
  let e = bn(await (0, gn.invoke)(`readInvitation`, { reference: vn }));
  if (e.status !== `available`) {
    xn(`Invitation unavailable`, [
      `This invitation is unavailable or you are not its recipient.`,
    ]);
    return;
  }
  let { invitation: t } = e;
  xn(`Peer invitation`, [
    t.purpose,
    `Terms: ${t.termsVersion}`,
    `Expires: ${t.expiresAt}`,
    ...(t.safeLabel ? [t.safeLabel] : []),
  ]);
}
async function Cn(e) {
  e.preventDefault();
  let t = new FormData(e.currentTarget),
    n = await gn.router.getUrl({
      moduleKey: `scg-peer-invitations`,
      target: `module`,
    });
  if (!n) {
    xn(`Invitation unavailable`, [`The invitation URL could not be created.`]);
    return;
  }
  let r = bn(
    await (0, gn.invoke)(`createInvitation`, {
      greenNavigationUrl: n.toString(),
      purpose: t.get(`purpose`),
      recipientAccountId: t.get(`recipientAccountId`),
      safeLabel: t.get(`safeLabel`) || void 0,
    }),
  );
  if (r.status !== `created`) {
    xn(`Invitation unavailable`, [`Check the required fields and try again.`]);
    return;
  }
  xn(`Invitation created`, [
    `Send this URL through an existing business channel:`,
    r.navigationUrl,
  ]);
}
function wn() {
  yn(`
    <h1>Invite peer administrator</h1>
    <p>Creates a recipient-bound invitation with a seven-day setup deadline.</p>
    <form id="invitation-form">
      <label>Recipient Green account ID <input name="recipientAccountId" required></label>
      <label>Purpose <textarea name="purpose" required></textarea></label>
      <label>Safe label (optional) <input name="safeLabel"></label>
      <button type="submit">Create invitation</button>
    </form>
  `),
    document.querySelector(`#invitation-form`).addEventListener(`submit`, Cn);
}
vn ? Sn() : wn();
