/**
* @preserve Copyright (c) Microsoft Corporation.  All rights reserved.
* This code is licensed by Microsoft Corporation under the terms
* of the MICROSOFT REACTIVE EXTENSIONS FOR JAVASCRIPT AND .NET LIBRARIES License.
* See http://go.microsoft.com/fwlink/?LinkID=220762.
*/

(function (global, undefined) {
    var root = { Internals: {} };

    // Defaults
    function noop() { }
    function identity(x) { return x; }
    function defaultNow() { return new Date().getTime(); }
    function defaultComparer(x, y) { return x === y; }
    function defaultSubComparer(x, y) { return x - y; }
    function defaultKeySerializer(x) { return x.toString(); }
    function defaultError(err) { throw err; }

    // Errors
    var sequenceContainsNoElements = 'Sequence contains no elements.';
    var argumentOutOfRange = 'Argument out of range';
    var objectDisposed = 'Object has been disposed';
    function checkDisposed() {
        if (this.isDisposed) {
            throw new Error(objectDisposed);
        }
    }

    // Utilities
    var slice = Array.prototype.slice;
    function argsOrArray(args, idx) {
        return args.length === 1 && Array.isArray(args[idx]) ?
			args[idx] :
			slice.call(args);
    }
    function customBind(thisArg, method) {
        return function () {
            return thisArg[method].apply(thisArg, arguments);
        };
    }
    var hasProp = {}.hasOwnProperty;
    var inherits = root.Internals.inherits = function (child, parent) {
        for (var key in parent) {
            if (key !== 'prototype' && hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() { this.constructor = child; }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.super_ = parent.prototype;
        return child;
    };
    var addProperties = root.Internals.addProperties = function (obj) {
        var sources = slice.call(arguments, 1);
        for (var i = 0, len = sources.length; i < len; i++) {
            var source = sources[i];
            for (var prop in source) {
                obj[prop] = source[prop];
            }
        }
    };

    // Rx Utils
    var addRef = root.Internals.addRef = function (xs, r) {
        return observableCreateWithDisposable(function (observer) {
            return new CompositeDisposable(r.getDisposable(), xs.subscribe(observer));
        });
    };

    // Collection polyfills
    var arrayInitialize = function (count, factory) {
        var a = new Array(count);
        for (var i = 0; i < count; i++) {
            a[i] = factory();
        }
        return a;
    };
    if (!Array.prototype.every) {
        Array.prototype.every = function (predicate) {
            var t = new Object(this);
            for (var i = 0, len = t.length >>> 0; i < len; i++) {
                if (i in t && !predicate.call(arguments[1], t[i], i, t)) {
                    return false;
                }
            }
            return true;
        };
    }
    if (!Array.prototype.map) {
        Array.prototype.map = function (selector) {
            var results = [], t = new Object(this);
            for (var i = 0, len = t.length >>> 0; i < len; i++) {
                if (i in t) {
                    results.push(selector.call(arguments[1], t[i], i, t));
                }
            }
            return results;
        };
    }
    if (!Array.prototype.filter) {
        Array.prototype.filter = function (predicate) {
            var results = [], item, t = new Object(this);
            for (var i = 0, len = t.length >>> 0; i < len; i++) {
                item = t[i];
                if (i in t && predicate.call(arguments[1], item, i, t)) {
                    results.push(item);
                }
            }
            return results;
        };
    }
    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) == '[object Array]';
        };
    }

    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (searchElement) {
            if (this == null) {
                throw new TypeError();
            }
            var t = Object(this);
            var len = t.length >>> 0;
            if (len === 0) {
                return -1;
            }
            var n = 0;
            if (arguments.length > 0) {
                n = Number(arguments[1]);
                if (n != n) {
                    n = 0;
                } else if (n != 0 && n != Infinity && n != -Infinity) {
                    n = (n > 0 || -1) * Math.floor(Math.abs(n));
                }
            }
            if (n >= len) {
                return -1;
            }
            var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
            for (; k < len; k++) {
                if (k in t && t[k] === searchElement) {
                    return k;
                }
            }
            return -1;
        };
    }

    function copyArray(sourceArray, sourceIndex, destinationArray, destinationIndex, count) {
        var idx = count;
        while (idx > 0) {
            destinationArray[idx + destinationIndex - 1] = sourceArray[idx + sourceIndex - 1];
            idx--;
        }
    };

    // Collections
    var IndexedItem = function (id, value) {
        this.id = id;
        this.value = value;
    };

    IndexedItem.prototype.compareTo = function (other) {
        var c = this.value.compareTo(other.value);
        if (c === 0) {
            c = this.id - other.id;
        }
        return c;
    };

    // Priority Queue for Scheduling
    var PriorityQueue = function (capacity) {
        this.items = new Array(capacity);
        this.length = 0;
    };
    var priorityProto = PriorityQueue.prototype;
    priorityProto.isHigherPriority = function (left, right) {
        return this.items[left].compareTo(this.items[right]) < 0;
    };
    priorityProto.percolate = function (index) {
        var parent, temp;
        if (index >= this.length || index < 0) {
            return;
        }
        parent = index - 1 >> 1;
        if (parent < 0 || parent === index) {
            return;
        }
        if (this.isHigherPriority(index, parent)) {
            temp = this.items[index];
            this.items[index] = this.items[parent];
            this.items[parent] = temp;
            this.percolate(parent);
        }
    };
    priorityProto.heapify = function (index) {
        var first, left, right, temp;
        if (index === undefined) {
            index = 0;
        }
        if (index >= this.length || index < 0) {
            return;
        }
        left = 2 * index + 1;
        right = 2 * index + 2;
        first = index;
        if (left < this.length && this.isHigherPriority(left, first)) {
            first = left;
        }
        if (right < this.length && this.isHigherPriority(right, first)) {
            first = right;
        }
        if (first !== index) {
            temp = this.items[index];
            this.items[index] = this.items[first];
            this.items[first] = temp;
            this.heapify(first);
        }
    };
    priorityProto.peek = function () {
        return this.items[0].value;
    };
    priorityProto.removeAt = function (index) {
        var temp;
        this.items[index] = this.items[--this.length];
        delete this.items[this.length];
        this.heapify();
        if (this.length < this.items.length >> 2) {
            temp = this.items;
            this.items = new Array(this.items.length >> 1);
            copyArray(temp, 0, this.items, 0, this.length);
        }
    };
    priorityProto.dequeue = function () {
        var result = this.peek();
        this.removeAt(0);
        return result;
    };
    priorityProto.enqueue = function (item) {
        var index, temp;
        if (this.length >= this.items.length) {
            temp = this.items;
            this.items = new Array(this.items.length * 2);
            copyArray(temp, 0, this.items, 0, temp.length);
        }
        index = this.length++;
        this.items[index] = new IndexedItem(PriorityQueue.count++, item);
        this.percolate(index);
    };
    priorityProto.remove = function (item) {
        for (var i = 0; i < this.length; i++) {
            if (this.items[i].value === item) {
                this.removeAt(i);
                return true;
            }
        }
        return false;
    };
    PriorityQueue.count = 0;

    // Disposables

    var CompositeDisposable = root.CompositeDisposable = function () {
        this.disposables = argsOrArray(arguments, 0);
        this.isDisposed = false;
        this.length = this.disposables.length;
    };
    CompositeDisposable.prototype.add = function (item) {
        if (this.isDisposed) {
            item.dispose();
        } else {
            this.disposables.push(item);
            this.length++;
        }
    };
    CompositeDisposable.prototype.remove = function (item) {
        var shouldDispose = false;
        if (!this.isDisposed) {
            var idx = this.disposables.indexOf(item);
            if (idx !== -1) {
                shouldDispose = true;
                this.disposables.splice(idx, 1);
                this.length--;
                item.dispose();
            }

        }
        return shouldDispose;
    };
    CompositeDisposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            var currentDisposables = this.disposables.slice(0);
            this.disposables = [];
            this.length = 0;

            for (var i = 0, len = currentDisposables.length; i < len; i++) {
                currentDisposables[i].dispose();
            }
        }
    };
    CompositeDisposable.prototype.clear = function () {
        var currentDisposables = this.disposables.slice(0);
        this.disposables = [];
        this.length = 0;
        for (var i = 0, len = currentDisposables.length; i < len; i++) {
            currentDisposables[i].dispose();
        }
    };
    CompositeDisposable.prototype.contains = function (item) {
        return this.disposables.indexOf(item) !== -1;
    };
    CompositeDisposable.prototype.toArray = function () {
        return this.disposables.slice(0);
    };

    // Main disposable class
    var Disposable = root.Disposable = function (action) {
        this.isDisposed = false;
        this.action = action;
    };
    Disposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.action();
            this.isDisposed = true;
        }
    };

    var disposableCreate = Disposable.create = function (action) { return new Disposable(action); };
    var disposableEmpty = Disposable.empty = new Disposable(noop);

    // Single assignment
    var SingleAssignmentDisposable = root.SingleAssignmentDisposable = function () {
        this.isDisposed = false;
        this.current = null;
    };
    SingleAssignmentDisposable.prototype.disposable = function (value) {
        return !value ? this.getDisposable() : this.setDisposable(value);
    };
    SingleAssignmentDisposable.prototype.getDisposable = function () {
        return this.current;
    };
    SingleAssignmentDisposable.prototype.setDisposable = function (value) {
        if (this.current !== null) {
            throw new Error('Disposable has already been assigned');
        }
        var shouldDispose = this.isDisposed;
        if (!shouldDispose) {
            this.current = value;
        }
        if (shouldDispose && value !== null) {
            value.dispose();
        }
    };
    SingleAssignmentDisposable.prototype.dispose = function () {
        var old = null;
        if (!this.isDisposed) {
            this.isDisposed = true;
            old = this.current;
            this.current = null;
        }
        if (old !== null) {
            old.dispose();
        }
    };

    // Multiple assignment disposable
    var SerialDisposable = root.SerialDisposable = function () {
        this.isDisposed = false;
        this.current = null;
    };
    SerialDisposable.prototype.getDisposable = function () {
        return this.current;
    };
    SerialDisposable.prototype.setDisposable = function (value) {
        var shouldDispose = this.isDisposed;
        var old = null;
        if (!shouldDispose) {
            old = this.current;
            this.current = value;
        }
        if (old !== null) {
            old.dispose();
        }
        if (shouldDispose && value !== null) {
            value.dispose();
        }
    };
    SerialDisposable.prototype.disposable = function (value) {
        if (!value) {
            return this.getDisposable();
        } else {
            this.setDisposable(value);
        }
    };
    SerialDisposable.prototype.dispose = function () {
        var old = null;
        if (!this.isDisposed) {
            this.isDisposed = true;
            old = this.current;
            this.current = null;
        }
        if (old !== null) {
            old.dispose();
        }
    };

    var RefCountDisposable = root.RefCountDisposable = (function () {

        function InnerDisposable(disposable) {
            this.disposable = disposable;
            this.disposable.count++;
            this.isInnerDisposed = false;
        }

        InnerDisposable.prototype.dispose = function () {
            if (!this.disposable.isDisposed) {
                if (!this.isInnerDisposed) {
                    this.isInnerDisposed = true;
                    this.disposable.count--;
                    if (this.disposable.count === 0 && this.disposable.isPrimaryDisposed) {
                        this.disposable.isDisposed = true;
                        this.disposable.underlyingDisposable.dispose();
                    }
                }
            }
        };

        function RefCountDisposable(disposable) {
            this.underlyingDisposable = disposable;
            this.isDisposed = false;
            this.isPrimaryDisposed = false;
            this.count = 0;
        }

        RefCountDisposable.prototype.dispose = function () {
            if (!this.isDisposed) {
                if (!this.isPrimaryDisposed) {
                    this.isPrimaryDisposed = true;
                    if (this.count === 0) {
                        this.isDisposed = true;
                        this.underlyingDisposable.dispose();
                    }
                }
            }
        };
        RefCountDisposable.prototype.getDisposable = function () {
            return this.isDisposed ? disposableEmpty : new InnerDisposable(this);
        };

        return RefCountDisposable;
    })();

    function ScheduledDisposable(scheduler, disposable) {
        this.scheduler = scheduler, this.disposable = disposable, this.isDisposed = false;
    }
    ScheduledDisposable.prototype.dispose = function () {
        var parent = this;
        this.scheduler.schedule(function () {
            if (!parent.isDisposed) {
                parent.isDisposed = true;
                parent.disposable.dispose();
            }
        });
    };

    function ScheduledItem(scheduler, state, action, dueTime, comparer) {
        this.scheduler = scheduler;
        this.state = state;
        this.action = action;
        this.dueTime = dueTime;
        this.comparer = comparer || defaultSubComparer;
        this.disposable = new SingleAssignmentDisposable();
    }
    ScheduledItem.prototype.invoke = function () {
        return this.disposable.disposable(this.invokeCore());
    };
    ScheduledItem.prototype.compareTo = function (other) {
        return this.comparer(this.dueTime, other.dueTime);
    };
    ScheduledItem.prototype.isCancelled = function () {
        return this.disposable.isDisposed;
    };
    ScheduledItem.prototype.invokeCore = function () {
        return this.action(this.scheduler, this.state);
    };

    var Scheduler = root.Scheduler = (function () {
        function Scheduler(now, schedule, scheduleRelative, scheduleAbsolute) {
            this.now = now;
            this._schedule = schedule;
            this._scheduleRelative = scheduleRelative;
            this._scheduleAbsolute = scheduleAbsolute;
        }

        function invokeRecImmediate(scheduler, pair) {
            var state = pair.first, action = pair.second, group = new CompositeDisposable()
            , recursiveAction = function (state1) {
                action(state1, function (state2) {
                    var isAdded = false
                    , isDone = false
                    , d = scheduler.scheduleWithState(state2, function (scheduler1, state3) {
                        if (isAdded) {
                            group.remove(d);
                        } else {
                            isDone = true;
                        }
                        recursiveAction(state3);
                        return disposableEmpty;
                    });
                    if (!isDone) {
                        group.add(d);
                        isAdded = true;
                    }
                });
            };
            recursiveAction(state);
            return group;
        }

        function invokeRecDate(scheduler, pair, method) {
            var state = pair.first, action = pair.second, group = new CompositeDisposable()
            , recursiveAction = function (state1) {
                action(state1, function (state2, dueTime1) {
                    var isAdded = false, isDone = false
                    , d = scheduler[method].call(scheduler, state2, dueTime1, function (scheduler1, state3) {
                        if (isAdded) {
                            group.remove(d);
                        } else {
                            isDone = true;
                        }
                        recursiveAction(state3);
                        return disposableEmpty;
                    });
                    if (!isDone) {
                        group.add(d);
                        isAdded = true;
                    }
                });
            };
            recursiveAction(state);
            return group;
        };

        function invokeAction(scheduler, action) {
            action();
            return disposableEmpty;
        };

        addProperties(Scheduler.prototype, {
            isPeriodic: true,
            schedulePeriodic: function (period, action) {
                return this.schedulePeriodicWithState(null, period, function () {
                    action();
                });
            },
            schedulePeriodicWithState: function (state, period, action) {
                var s = state, id = setInterval(function () {
                    s = action(s);
                }, period);
                return disposableCreate(function () {
                    clearInterval(id);
                });
            },
            schedule: function (action) {
                return this._schedule(action, invokeAction);
            },
            scheduleWithState: function (state, action) {
                return this._schedule(state, action);
            },
            scheduleWithRelative: scheduleWithRelative = function (dueTime, action) {
                return this._scheduleRelative(action, dueTime, invokeAction);
            },
            scheduleWithRelativeAndState: function (state, dueTime, action) {
                return this._scheduleRelative(state, dueTime, action);
            },
            scheduleWithAbsolute: scheduleWithAbsolute = function (dueTime, action) {
                return this._scheduleAbsolute(action, dueTime, invokeAction);
            },
            scheduleWithAbsoluteAndState: function (state, dueTime, action) {
                return this._scheduleAbsolute(state, dueTime, action);
            },
            scheduleRecursive: function (action) {
                return this.scheduleRecursiveWithState(action, function (_action, self) {
                    _action(function () {
                        self(_action);
                    });
                });
            },
            scheduleRecursiveWithState: function (state, action) {
                return this.scheduleWithState({ first: state, second: action }, function (s, p) {
                    return invokeRecImmediate(s, p);
                });
            },
            scheduleRecursiveWithRelative: function (dueTime, action) {
                return this.scheduleRecursiveWithRelativeAndState(action, dueTime, function (_action, self) {
                    _action(function (dt) {
                        self(_action, dt);
                    });
                });
            },
            scheduleRecursiveWithRelativeAndState: function (state, dueTime, action) {
                return this._scheduleRelative({ first: state, second: action }, dueTime, function (s, p) {
                    return invokeRecDate(s, p, 'scheduleWithRelativeAndState');
                });
            },
            scheduleRecursiveWithAbsolute: function (dueTime, action) {
                return this.scheduleRecursiveWithAbsoluteAndState(action, dueTime, function (_action, self) {
                    _action(function (dt) {
                        self(_action, dt);
                    });
                });
            },
            scheduleRecursiveWithAbsoluteAndState: function (state, dueTime, action) {
                return this._scheduleAbsolute({ first: state, second: action }, dueTime, function (s, p) {
                    return invokeRecDate(s, p, 'scheduleWithAbsoluteAndState');
                });
            }
        });

        Scheduler.now = defaultNow;
        Scheduler.normalize = function (timeSpan) {
            if (timeSpan < 0) {
                timeSpan = 0;
            }
            return timeSpan;
        };

        return Scheduler;
    })();

    // Immediate Scheduler
    var schedulerNoBlockError = 'Scheduler is not allowed to block the thread';
    var immediateScheduler = Scheduler.immediate = (function () {

        function scheduleNow(state, action) {
            return action(this, state);
        }

        function scheduleRelative(state, dueTime, action) {
            if (dueTime > 0) throw new Error(schedulerNoBlockError);
            return action(this, state);
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleWithRelativeAndState(state, dueTime - scheduler.now(), action);
        }

        return new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
    }());

    // Current Thread Scheduler
    var currentThreadScheduler = Scheduler.currentThread = (function () {
        var queue;

        function Trampoline() {
            queue = new PriorityQueue(4);
        }

        Trampoline.prototype.dispose = function () {
            queue = null;
        };

        Trampoline.prototype.run = function () {
            var item;
            while (queue.length > 0) {
                item = queue.dequeue();
                if (!item.isCancelled()) {
                    while (item.dueTime - Scheduler.now() > 0) {
                    }
                    if (!item.isCancelled()) {
                        item.invoke();
                    }
                }
            }
        };

        function scheduleNow(state, action) {
            return this.scheduleWithRelativeAndState(state, 0, action);
        }

        function scheduleRelative(state, dueTime, action) {
            var dt = this.now() + Scheduler.normalize(dueTime),
                    si = new ScheduledItem(this, state, action, dt),
                    t;
            if (!queue) {
                t = new Trampoline();
                try {
                    queue.enqueue(si);
                    t.run();
                } finally {
                    t.dispose();
                }
            } else {
                queue.enqueue(si);
            }
            return si.disposable;
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
        }

        var currentScheduler = new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
        addProperties(currentScheduler, {
            scheduleRequired: function () {
                return queue === null;
            },
            ensureTrampoline: function (action) {
                if (this.scheduleRequired()) {
                    return this.schedule(action);
                } else {
                    return action();
                }
            }
        });

        return currentScheduler;
    }());

    // Virtual Scheduler
    root.VirtualTimeScheduler = (function (base) {

        function localNow() {
            return this.toDateTimeOffset(this.clock);
        }

        function scheduleNow(state, action) {
            return this.scheduleAbsolute(state, this.clock, action);
        }

        function scheduleRelative(state, dueTime, action) {
            return this.scheduleRelative(state, this.toRelative(dueTime), action);
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleRelative(state, this.toRelative(dueTime - this.now()), action);
        }

        inherits(VirtualTimeScheduler, base);

        function VirtualTimeScheduler(initialClock, comparer) {
            this.clock = initialClock;
            this.comparer = comparer;
            this.isEnabled = false;
            this.queue = new PriorityQueue(1024);
            VirtualTimeScheduler.super_.constructor.call(this, localNow, scheduleNow, scheduleRelative, scheduleAbsolute);
        }

        addProperties(VirtualTimeScheduler.prototype, {
            scheduleRelative: function (state, dueTime, action) {
                var runAt = this.add(this.clock, dueTime);
                return this.scheduleAbsolute(state, runAt, action);
            },
            start: function () {
                var next;
                if (!this.isEnabled) {
                    this.isEnabled = true;
                    do {
                        next = this.getNext();
                        if (next !== null) {
                            if (this.comparer(next.dueTime, this.clock) > 0) {
                                this.clock = next.dueTime;
                            }
                            next.invoke();
                        } else {
                            this.isEnabled = false;
                        }
                    } while (this.isEnabled);
                }
            },
            stop: function () {
                return this.isEnabled = false;
            },
            advanceTo: function (time) {
                var next;
                if (this.comparer(this.clock, time) >= 0) {
                    throw new Error(argumentOutOfRange);
                }
                if (!this.isEnabled) {
                    this.isEnabled = true;
                    do {
                        next = this.getNext();
                        if (next !== null && this.comparer(next.dueTime, time) <= 0) {
                            if (this.comparer(next.dueTime, this.clock) > 0) {
                                this.clock = next.dueTime;
                            }
                            next.invoke();
                        } else {
                            this.isEnabled = false;
                        }
                    } while (this.isEnabled)
                    this.clock = time;
                }
            },
            advanceBy: function (time) {
                var dt = this.add(this.clock, time);
                if (this.comparer(this.clock, dt) >= 0) {
                    throw new Error(argumentOutOfRange);
                }
                return this.advanceTo(dt);
            },
            getNext: function () {
                var next;
                while (this.queue.length > 0) {
                    next = this.queue.peek();
                    if (next.isCancelled()) {
                        this.queue.dequeue();
                    } else {
                        return next;
                    }
                }
                return null;
            },
            scheduleAbsolute: function (state, dueTime, action) {
                var self = this,
                    run = function (scheduler, state1) {
                        self.queue.remove(si);
                        return action(scheduler, state1);
                    },
                    si = new ScheduledItem(self, state, run, dueTime, self.comparer);
                self.queue.enqueue(si);
                return si.disposable;
            }
        });

        return VirtualTimeScheduler;
    }(Scheduler));

    // Timeout Scheduler
    var timeoutScheduler = Scheduler.timeout = (function () {

        // Optimize for speed
        var reqAnimFrame, clearAnimFrame;
        if (typeof window !== 'undefined') {
            reqAnimFrame = window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame;
            clearAnimFrame = window.cancelAnimationFrame ||
                window.webkitCancelAnimationFrame ||
                window.mozCancelAnimationFrame ||
                window.oCancelAnimationFrame;
        }

        var scheduleMethod, clearMethod;
        if (typeof process !== 'undefined' && typeof process.nextTick === 'function') {
            scheduleMethod = process.nextTick;
            clearMethod = noop;
        } else if (typeof setImmediate === 'function') {
            scheduleMethod = setImmediate;
            clearMethod = clearImmediate;
        } else if (typeof reqAnimFrame === 'function') {
            scheduleMethod = reqAnimFrame;
            clearMethod = clearAnimFrame;
        } else {
            scheduleMethod = function (action) { return setTimeout(action, 0); };
            clearMethod = clearTimeout;
        }

        function scheduleNow(state, action) {
            var scheduler = this;
            var disposable = new SingleAssignmentDisposable();
            var id = scheduleMethod(function () {
                disposable.setDisposable(action(scheduler, state));
            });
            return new CompositeDisposable(disposable, disposableCreate(function () {
                clearMethod(id);
            }));
        }

        function scheduleRelative(state, dueTime, action) {
            var scheduler = this;
            var disposable = new SingleAssignmentDisposable();
            var dt = Scheduler.normalize(dueTime);
            var id = setTimeout(function () {
                disposable.setDisposable(action(scheduler, state));
            }, dt);
            return new CompositeDisposable(disposable, disposableCreate(function () {
                clearTimeout(id);
            }));
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
        }

        return new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
    })();

    // Notifications

    var Notification = root.Notification = (function () {
        function Notification() { }

        addProperties(Notification.prototype, {
            accept: function (observerOrOnNext, onError, onCompleted) {
                if (arguments.length > 1 || typeof observerOrOnNext === 'function') {
                    return this._accept(observerOrOnNext, onError, onCompleted);
                } else {
                    return this._acceptObservable(observerOrOnNext);
                }
            },
            toObservable: function (scheduler) {
                var notification = this;
                scheduler = scheduler || immediateScheduler;
                return observableCreateWithDisposable(function (observer) {
                    return scheduler.schedule(function () {
                        notification._acceptObservable(observer);
                        if (notification.kind === 'N') {
                            observer.onCompleted();
                        }
                    });
                });
            },
            hasValue: false,
            equals: function (other) {
                var otherString = other == null ? '' : other.toString();
                return this.toString() === otherString;
            }
        });

        return Notification;
    })();

    var notificationCreateOnNext = Notification.createOnNext = (function (base) {
        inherits(ON, base);
        function ON(value) {
            this.value = value;
            this.hasValue = true;
            this.kind = 'N';
        }

        addProperties(ON.prototype, {
            _accept: function (onNext) {
                return onNext(this.value);
            },
            _acceptObservable: function (observer) {
                return observer.onNext(this.value);
            },
            toString: function () {
                return 'OnNext(' + this.value + ')';
            }
        });

        return function (next) {
            return new ON(next);
        };
    }(Notification));

    var notificationCreateOnError = Notification.createOnError = (function (base) {
        inherits(OE, base);
        function OE(exception) {
            this.exception = exception;
            this.kind = 'E';
        }

        addProperties(OE.prototype, {
            _accept: function (onNext, onError) {
                return onError(this.exception);
            },
            _acceptObservable: function (observer) {
                return observer.onError(this.exception);
            },
            toString: function () {
                return 'OnError(' + this.exception + ')';
            }
        });

        return function (error) {
            return new OE(error);
        };
    }(Notification));

    var notificationCreateOnCompleted = Notification.createOnCompleted = (function (base) {
        inherits(OC, base);
        function OC() {
            this.kind = 'C';
        }

        addProperties(OC.prototype, {
            _accept: function (onNext, onError, onCompleted) {
                return onCompleted();
            },
            _acceptObservable: function (observer) {
                return observer.onCompleted();
            },
            toString: function () {
                return 'OnCompleted()';
            }
        });

        return function () {
            return new OC();
        };
    }(Notification));

    // Enumerator

    var Enumerator = root.Internals.Enumerator = function (moveNext, getCurrent, dispose) {
        this.moveNext = moveNext;
        this.getCurrent = getCurrent;
        this.dispose = dispose;
    };
    var enumeratorCreate = Enumerator.create = function (moveNext, getCurrent, dispose) {
        var done = false;
        dispose || (dispose = noop);
        return new Enumerator(function () {
            if (done) {
                return false;
            }
            var result = moveNext();
            if (!result) {
                done = true;
                dispose();
            }
            return result;
        }, function () { return getCurrent(); }, function () {
            if (!done) {
                dispose();
                done = true;
            }
        });
    };

    // Enumerable
    var Enumerable = root.Internals.Enumerable = (function () {
        function E(getEnumerator) {
            this.getEnumerator = getEnumerator;
        }

        addProperties(E.prototype, {
            concat: function () {
                var sources = this;
                return observableCreateWithDisposable(function (observer) {
                    var cancelable, e = sources.getEnumerator(), isDisposed = false, subscription = new SerialDisposable();
                    cancelable = immediateScheduler.scheduleRecursive(function (self) {
                        var current, d, ex, hasNext = false;
                        if (!isDisposed) {
                            try {
                                hasNext = e.moveNext();
                                if (hasNext) {
                                    current = e.getCurrent();
                                } else {
                                    e.dispose();
                                }
                            } catch (exception) {
                                ex = exception;
                                e.dispose();
                            }
                        } else {
                            return;
                        }
                        if (ex) {
                            observer.onError(ex);
                            return;
                        }
                        if (!hasNext) {
                            observer.onCompleted();
                            return;
                        }
                        d = new SingleAssignmentDisposable();
                        subscription.setDisposable(d);
                        d.setDisposable(current.subscribe(
                            customBind(observer, 'onNext'),
                            customBind(observer, 'onError'),
                            function () { self(); })
                        );
                    });
                    return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
                        isDisposed = true;
                        e.dispose();
                    }));
                });
            },
            catchException: function () {
                var sources = this;
                return observableCreateWithDisposable(function (observer) {
                    var cancelable, e = sources.getEnumerator(), isDisposed = false, subscription, lastException;
                    subscription = new SerialDisposable();
                    cancelable = immediateScheduler.scheduleRecursive(function (self) {
                        var current, d, ex, hasNext;
                        hasNext = false;
                        if (!isDisposed) {
                            try {
                                hasNext = e.moveNext();
                                if (hasNext) {
                                    current = e.getCurrent();
                                }
                            } catch (exception) {
                                ex = exception;
                            }
                        } else {
                            return;
                        }
                        if (ex) {
                            observer.onError(ex);
                            return;
                        }
                        if (!hasNext) {
                            if (lastException) {
                                observer.onError(lastException);
                            } else {
                                observer.onCompleted();
                            }
                            return;
                        }
                        d = new SingleAssignmentDisposable();
                        subscription.setDisposable(d);
                        d.setDisposable(current.subscribe(
                            customBind(observer, 'onNext'),
                            function (exn) {
                                lastException = exn;
                                self();
                            },
                            customBind(observer, 'onCompleted')));
                    });
                    return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
                        isDisposed = true;
                    }));
                });
            }
        });

        return E;
    }());

    // Enumerable properties
    var enumerableRepeat = Enumerable.repeat = function (value, repeatCount) {
        if (repeatCount === undefined) {
            repeatCount = -1;
        }
        return new Enumerable(function () {
            var current, left = repeatCount;
            return enumeratorCreate(function () {
                if (left === 0) {
                    return false;
                }
                if (left > 0) {
                    left--;
                }
                current = value;
                return true;
            }, function () { return current; });
        });
    };
    var enumerableFor = Enumerable.forEach = function (source, selector) {
        selector || (selector = identity);
        return new Enumerable(function () {
            var current, index = -1;
            return enumeratorCreate(
                function () {
                    if (++index < source.length) {
                        current = selector(source[index], index);
                        return true;
                    }
                    return false;
                },
                function () { return current; }
            );
        });
    };

    // Observer
    var Observer = root.Observer = function () {

    };
    Observer.prototype.toNotifier = function () {
        var observer = this;
        return function (n) {
            return n.accept(observer);
        };
    };
    Observer.prototype.asObserver = function () {
        var source = this;
        return new AnonymousObserver(function (x) {
            return source.onNext(x);
        }, function (e) {
            return source.onError(e);
        }, function () {
            return source.onCompleted();
        });
    };

    var observerCreate = Observer.create = function (onNext, onError, onCompleted) {
        onNext || (onNext = noop);
        onError || (onError = defaultError);
        onCompleted || (onCompleted = noop);
        return new AnonymousObserver(onNext, onError, onCompleted);
    };

    Observer.fromNotifier = function (handler) {
        return new AnonymousObserver(function (x) {
            return handler(notificationCreateOnNext(x));
        }, function (exception) {
            return handler(notificationCreateOnError(exception));
        }, function () {
            return handler(notificationCreateOnCompleted());
        });
    };

    var observerToObserver = function (handler) {
        return new AnonymousObserver(function (x) {
            handler(notificationCreateOnNext(x));
        }, function (e) {
            handler(notificationCreateOnError(e));
        }, function () {
            handler(notificationCreateOnCompleted());
        });
    };

    // Abstract Observer
    var AbstractObserver = root.Internals.AbstractObserver = (function () {
        inherits(AbstractObserver, Observer);
        function AbstractObserver() {
            this.isStopped = false;
        }

        AbstractObserver.prototype.onNext = function (value) {
            if (!this.isStopped) {
                this.next(value);
            }
        };
        AbstractObserver.prototype.onError = function (error) {
            if (!this.isStopped) {
                this.isStopped = true;
                this.error(error);
            }
        };
        AbstractObserver.prototype.onCompleted = function () {
            if (!this.isStopped) {
                this.isStopped = true;
                this.completed();
            }
        };
        AbstractObserver.prototype.dispose = function () {
            this.isStopped = true;
        };

        return AbstractObserver;
    }());

    var AnonymousObserver = (function () {
        inherits(AnonymousObserver, AbstractObserver);
        function AnonymousObserver(onNext, onError, onCompleted) {
            AnonymousObserver.super_.constructor.call(this);
            this._onNext = onNext;
            this._onError = onError;
            this._onCompleted = onCompleted;
        }
        AnonymousObserver.prototype.next = function (value) {
            this._onNext(value);
        };
        AnonymousObserver.prototype.error = function (exception) {
            this._onError(exception);
        };
        AnonymousObserver.prototype.completed = function () {
            this._onCompleted();
        };
        return AnonymousObserver;
    }());

    var BinaryObserver = root.Internals.BinaryObserver = (function () {
        inherits(BinaryObserver, Observer);

        function BinaryObserver(left, right) {
            if (typeof left === 'function' && typeof right === 'function') {
                this.leftObserver = observerToObserver(left);
                this.rightObserver = observerToObserver(right);
            } else {
                this.leftObserver = left;
                this.rightObserver = right;
            }
        }

        BinaryObserver.prototype.onNext = function (value) {
            var self = this;
            return value.switchValue(function (left) {
                return left.accept(self.leftObserver);
            }, function (right) {
                return right.accept(self.rightObserver);
            });
        };
        BinaryObserver.prototype.onError = noop;
        BinaryObserver.prototype.onCompleted = noop;

        return BinaryObserver;
    }(Observer));

    var ScheduledObserver = (function (base) {
        inherits(S, base);
        function S(scheduler, observer) {
            S.super_.constructor.call(this);
            this.scheduler = scheduler;
            this.observer = observer;
            this.isAcquired = false;
            this.hasFaulted = false;
            this.queue = [];
            this.disposable = new SerialDisposable();
        }

        addProperties(S.prototype, {
            next: function (value) {
                var self = this;
                this.queue.push(function () {
                    self.observer.onNext(value);
                });
            },
            error: function (exception) {
                var self = this;
                this.queue.push(function () {
                    self.observer.onError(exception);
                });
            },
            completed: function () {
                var self = this;
                this.queue.push(function () {
                    self.observer.onCompleted();
                });
            },
            ensureActive: function () {
                var isOwner = false, parent = this;
                if (!this.hasFaulted && this.queue.length > 0) {
                    isOwner = !this.isAcquired;
                    this.isAcquired = true;
                }
                if (isOwner) {
                    this.disposable.setDisposable(this.scheduler.scheduleRecursive(function (self) {
                        var work;
                        if (parent.queue.length > 0) {
                            work = parent.queue.shift();
                        } else {
                            parent.isAcquired = false;
                            return;
                        }
                        try {
                            work();
                        } catch (ex) {
                            parent.queue = [];
                            parent.hasFaulted = true;
                            throw ex;
                        }
                        self();
                    }));
                }
            },
            dispose: function () {
                S.super_.dispose.call(this);
                this.disposable.dispose();
            }
        });

        return S;
    }(AbstractObserver));

    var ObserveOnObserver = (function (base) {
        inherits(ObserveOnObserver, base);
        function ObserveOnObserver() {
            ObserveOnObserver.super_.constructor.apply(this, arguments);
        }
        ObserveOnObserver.prototype.next = function (value) {
            ObserveOnObserver.super_.next.call(this, value);
            this.ensureActive();
        };
        ObserveOnObserver.prototype.error = function (e) {
            ObserveOnObserver.super_.error.call(this, e);
            this.ensureActive();
        };
        ObserveOnObserver.prototype.completed = function () {
            ObserveOnObserver.super_.completed.call(this);
            this.ensureActive();
        };

        return ObserveOnObserver;
    })(ScheduledObserver);

    var Observable = root.Observable = (function () {

        function Observable(subscribe) {
            this._subscribe = subscribe;
        }

        function selectMany(selector) {
            return this.select(selector).mergeObservable();
        }

        function observableCatchHandler(source, handler) {
            return observableCreateWithDisposable(function (observer) {
                var d1 = new SingleAssignmentDisposable(), subscription = new SerialDisposable();
                subscription.setDisposable(d1);
                d1.setDisposable(source.subscribe(customBind(observer, 'onNext'), function (exception) {
                    var d, result;
                    try {
                        result = handler(exception);
                    } catch (ex) {
                        observer.onError(ex);
                        return;
                    }
                    d = new SingleAssignmentDisposable();
                    subscription.setDisposable(d);
                    d.setDisposable(result.subscribe(observer));
                }, customBind(observer, 'onCompleted')));
                return subscription;
            });
        }

        function zipArray(second, resultSelector) {
            var first = this;
            return observableCreateWithDisposable(function (observer) {
                var index = 0, len = second.length;
                return first.subscribe(function (left) {
                    if (index < len) {
                        var right = second[index++], result;
                        try {
                            result = resultSelector(left, right);
                        } catch (e) {
                            observer.onError(e);
                            return;
                        }
                        observer.onNext(result);
                    } else {
                        observer.onCompleted();
                    }
                }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
            });
        }

        addProperties(Observable.prototype, {
            amb: function (rightSource) {
                var leftSource = this;
                return observableCreateWithDisposable(function (observer) {

                    var choice,
                        leftSubscription = new SingleAssignmentDisposable(),
                        rightSubscription = new SingleAssignmentDisposable;

                    leftSubscription.setDisposable(leftSource.subscribe(function (left) {
                        if (!choice) {
                            choice = 'L';
                            rightSubscription.dispose();    
                        }
                        if (choice === 'L') {
                            observer.onNext(left);
                        }
                    }, function (err) {
                        if (!choice) {
                            choice = 'L';
                            rightSubscription.dispose();
                        }
                        if (choice === 'L') {
                            observer.onError(err);
                        }
                    }, function () {
                        if (!choice) {
                            choice = 'L';
                            rightSubscription.dispose();
                        }
                        if (choice === 'L') {
                            observer.onCompleted();
                        }
                    }));

                    rightSubscription.setDisposable(rightSource.subscribe(function (right) {
                        if (!choice) {
                            choice = 'R';
                            leftSubscription.dispose();
                        }
                        if (choice === 'R') {
                            observer.onNext(right);
                        }
                    }, function (err) {
                        if (!choice) {
                            choice = 'R';
                            leftSubscription.dispose();
                        }
                        if (choice === 'R') {
                            observer.onError(err);
                        }
                    }, function () {
                        if (!choice) {
                            choice = 'R';
                            leftSubscription.dispose();
                        }
                        if (choice === 'R') {
                            observer.onCompleted();
                        }
                    }));

                    return new CompositeDisposable(leftSubscription, rightSubscription);
                });
            },
            asObservable: function () {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    return source.subscribe(observer);
                });
            },
            bufferWithCount: function (count, skip) {
                if (skip === undefined) {
                    skip = count;
                }
                return this.windowWithCount(count, skip).selectMany(function (x) {
                    return x.toArray();
                }).where(function (x) {
                    return x.length > 0;
                });
            },
            catchException: function (handlerOrSecond) {
                if (typeof handlerOrSecond === 'function') {
                    return observableCatchHandler(this, handlerOrSecond);
                }
                return observableCatch([this, handlerOrSecond]);
            },
            combineLatest: function () {
                var parent = this
                , args = slice.call(arguments)
                , resultSelector = args.pop();
                args.unshift(this);
                return observableCreateWithDisposable(function (observer) {
                    var falseFactory = function () { return false; }
                    , n = args.length
                    , hasValue = arrayInitialize(n, falseFactory)
                    , hasValueAll = false
                    , isDone = arrayInitialize(n, falseFactory)
                    , values = new Array(n);

                    var next = function (i) {
                        var res;
                        hasValue[i] = true;
                        if (hasValueAll || (hasValueAll = hasValue.every(function (x) { return x; }))) {
                            try {
                                res = resultSelector.apply(parent, values);
                            } catch (ex) {
                                observer.onError(ex);
                                return;
                            }
                            observer.onNext(res);
                        } else if (isDone.filter(function (x, j) { return j !== i; }).every(function (x) { return x; })) {
                            observer.onCompleted();
                        }
                    };

                    var done = function (i) {
                        isDone[i] = true;
                        if (isDone.every(function (x) { return x; })) {
                            observer.onCompleted();
                        }
                    };

                    var subscriptions = new Array(n);
                    for (var idx = 0; idx < n; idx++) {
                        (function (i) {
                            subscriptions[i] = new SingleAssignmentDisposable();
                            subscriptions[i].setDisposable(args[i].subscribe(function (x) {
                                values[i] = x;
                                next(i);
                            }, customBind(observer, 'onError'), function () {
                                done(i);
                            }));
                        })(idx);
                    }

                    return new CompositeDisposable(subscriptions);
                });
            },
            concat: function () {
                var items = slice.call(arguments, 0);
                items.unshift(this);
                return observableConcat.apply(this, items);
            },
            concatObservable: function () {
                return this.merge(1);
            },
            defaultIfEmpty: function (defaultValue) {
                var source = this;
                if (defaultValue === undefined) {
                    defaultValue = null;
                }
                return observableCreateWithDisposable(function (observer) {
                    var found = false;
                    return source.subscribe(function (x) {
                        found = true;
                        observer.onNext(x);
                    }, customBind(observer, 'onError'), function () {
                        if (!found) {
                            observer.onNext(defaultValue);
                        }
                        observer.onCompleted();
                    });
                });
            },
            dematerialize: function () {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    return source.subscribe(function (x) {
                        return x.accept(observer);
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            distinct: function (keySelector, keySerializer) {
                var source = this;
                keySelector || (keySelector = identity);
                keySerializer || (keySerializer = defaultKeySerializer);
                return observableCreateWithDisposable(function (observer) {
                    var hashSet = {};
                    return source.subscribe(function (x) {
                        var key, serializedKey, otherKey, hasMatch = false;
                        try {
                            key = keySelector(x);
                            serializedKey = keySerializer(key);
                        } catch (exception) {
                            observer.onError(exception);
                            return;
                        }
                        for (otherKey in hashSet) {
                            if (serializedKey === otherKey) {
                                hasMatch = true;
                                break;
                            }
                        }
                        if (!hasMatch) {
                            hashSet[serializedKey] = null;
                            observer.onNext(x);
                        }
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            distinctUntilChanged: function (keySelector, comparer) {
                var source = this;
                keySelector || (keySelector = identity);
                comparer || (comparer = defaultComparer);
                return observableCreateWithDisposable(function (observer) {
                    var hasCurrentKey = false, currentKey;
                    return source.subscribe(function (value) {
                        var comparerEquals = false, key;
                        try {
                            key = keySelector(value);
                        } catch (exception) {
                            observer.onError(exception);
                            return;
                        }
                        if (hasCurrentKey) {
                            try {
                                comparerEquals = comparer(currentKey, key);
                            } catch (exception) {
                                observer.onError(exception);
                                return;
                            }
                        }
                        if (!hasCurrentKey || !comparerEquals) {
                            hasCurrentKey = true;
                            currentKey = key;
                            observer.onNext(value);
                        }
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            doAction: function (observerOrOnNext, onError, onCompleted) {
                var source = this, onNextFunc;
                if (typeof observerOrOnNext === 'function') {
                    onNextFunc = observerOrOnNext;
                } else {
                    onNextFunc = customBind(observerOrOnNext, 'onNext');
                    onError = customBind(observerOrOnNext, 'onError');
                    onCompleted = customBind(observerOrOnNext, 'onCompleted');
                }
                return observableCreateWithDisposable(function (observer) {
                    return source.subscribe(function (x) {
                        try {
                            onNextFunc(x);
                        } catch (e) {
                            observer.onError(e);
                        }
                        observer.onNext(x);
                    }, function (exception) {
                        if (!onError) {
                            observer.onError(exception);
                        } else {
                            try {
                                onError(exception);
                            } catch (e) {
                                observer.onError(e);
                            }
                            observer.onError(exception);
                        }
                    }, function () {
                        if (!onCompleted) {
                            observer.onCompleted();
                        } else {
                            try {
                                onCompleted();
                            } catch (e) {
                                observer.onError(e);
                            }
                            observer.onCompleted();
                        }
                    });
                });
            },
            elementAt: function (index) {
                if (index < 0) {
                    throw new Error(argumentOutOfRange);
                }
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    var i = index;
                    return source.subscribe(function (x) {
                        if (i === 0) {
                            observer.onNext(x);
                            observer.onCompleted();
                        }
                        i--;
                    }, customBind(observer, 'onError'), function () {
                        observer.onError(new Error(argumentOutOfRange));
                    });
                });
            },
            elementAtOrDefault: function (index, defaultValue) {
                var source = this;
                if (index < 0) {
                    throw new Error(argumentOutOfRange);
                }
                if (defaultValue === undefined) {
                    defaultValue = null;
                }
                return observableCreateWithDisposable(function (observer) {
                    var i = index;
                    return source.subscribe(function (x) {
                        if (i === 0) {
                            observer.onNext(x);
                            observer.onCompleted();
                        }
                        i--;
                    }, customBind(observer, 'onError'), function () {
                        observer.onNext(defaultValue);
                        observer.onCompleted();
                    });
                });
            },
            finallyAction: function (action) {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    var subscription = source.subscribe(observer);
                    return disposableCreate(function () {
                        try {
                            subscription.dispose();
                        } finally {
                            action();
                        }
                    });
                });
            },
            finalValue: function () {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    var hasValue = false, value;
                    return source.subscribe(function (x) {
                        hasValue = true;
                        value = x;
                    }, customBind(observer, 'onError'), function () {
                        if (!hasValue) {
                            observer.onError(new Error(sequenceContainsNoElements));
                        } else {
                            observer.onNext(value);
                            observer.onCompleted();
                        }
                    });
                });
            },
            groupBy: function (keySelector, elementSelector, keySerializer) {
                return this.groupByUntil(keySelector, elementSelector, function () {
                    return observableNever();
                }, keySerializer);
            },
            groupByUntil: function (keySelector, elementSelector, durationSelector, keySerializer) {
                var source = this;
                elementSelector || (elementSelector = identity);
                keySerializer || (keySerializer = defaultKeySerializer);
                return observableCreateWithDisposable(function (observer) {
                    var map = {},
                        groupDisposable = new CompositeDisposable(),
                        refCountDisposable = new RefCountDisposable(groupDisposable);
                    groupDisposable.add(source.subscribe(function (x) {
                        var duration, durationGroup, element, expire, fireNewMapEntry, group, key, serializedKey, md, writer, w;
                        try {
                            key = keySelector(x);
                            serializedKey = keySerializer(key);
                        } catch (e) {
                            for (w in map) {
                                map[w].onError(e);
                            }
                            observer.onError(e);
                            return;
                        }
                        fireNewMapEntry = false;
                        try {
                            writer = map[serializedKey];
                            if (!writer) {
                                writer = new Subject();
                                map[serializedKey] = writer;
                                fireNewMapEntry = true;
                            }
                        } catch (e) {
                            for (w in map) {
                                map[w].onError(e);
                            }
                            observer.onError(e);
                            return;
                        }
                        if (fireNewMapEntry) {
                            group = new GroupedObservable(key, writer, refCountDisposable);
                            durationGroup = new GroupedObservable(key, writer);
                            try {
                                duration = durationSelector(durationGroup);
                            } catch (e) {
                                for (w in map) {
                                    map[w].onError(e);
                                }
                                observer.onError(e);
                                return;
                            }
                            observer.onNext(group);
                            md = new SingleAssignmentDisposable();
                            groupDisposable.add(md);
                            expire = function () {
                                if (map[serializedKey] !== undefined) {
                                    delete map[serializedKey];
                                    writer.onCompleted();
                                }
                                groupDisposable.remove(md);
                            };
                            md.setDisposable(duration.take(1).subscribe(function () { }, function (exn) {
                                for (w in map) {
                                    map[w].onError(exn);
                                }
                                observer.onError(exn);
                            }, function () {
                                expire();
                            }));
                        }
                        try {
                            element = elementSelector(x);
                        } catch (e) {
                            for (w in map) {
                                map[w].onError(e);
                            }
                            observer.onError(e);
                            return;
                        }
                        writer.onNext(element);
                    }, function (ex) {
                        for (var w in map) {
                            map[w].onError(ex);
                        }
                        observer.onError(ex);
                    }, function () {
                        for (var w in map) {
                            map[w].onCompleted();
                        }
                        observer.onCompleted();
                    }));
                    return refCountDisposable;
                });
            },
            ignoreElements: function () {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    return source.subscribe(noop, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            materialize: function () {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    return source.subscribe(function (value) {
                        observer.onNext(notificationCreateOnNext(value));
                    }, function (exception) {
                        observer.onNext(notificationCreateOnError(exception));
                        observer.onCompleted();
                    }, function () {
                        observer.onNext(notificationCreateOnCompleted());
                        observer.onCompleted();
                    });
                });
            },
            merge: function (maxConcurrentOrOther) {
                if (typeof maxConcurrentOrOther !== 'number') {
                    return observableMerge(this, maxConcurrentOrOther);
                }
                var sources = this;
                return observableCreateWithDisposable(function (observer) {
                    var activeCount = 0,
                        group = new CompositeDisposable(),
                        isStopped = false,
                        q = [],
                        subscribe = function (xs) {
                            var subscription = new SingleAssignmentDisposable();
                            group.add(subscription);
                            subscription.setDisposable(xs.subscribe(function (x) {
                                observer.onNext(x);
                            }, function (exception) {
                                observer.onError(exception);
                            }, function () {
                                var s;
                                group.remove(subscription);
                                if (q.length > 0) {
                                    s = q.shift();
                                    subscribe(s);
                                } else {
                                    activeCount--;
                                    if (isStopped && activeCount === 0) {
                                        observer.onCompleted();
                                    }
                                }
                            }));
                        };
                    group.add(sources.subscribe(function (innerSource) {
                        if (activeCount < maxConcurrentOrOther) {
                            activeCount++;
                            subscribe(innerSource);
                        } else {
                            q.push(innerSource);
                        }
                    }, customBind(observer, 'onError'), function () {
                        isStopped = true;
                        if (activeCount === 0) {
                            observer.onCompleted();
                        }
                    }));
                    return group;
                });
            },
            mergeObservable: function () {
                var sources = this;
                return observableCreateWithDisposable(function (observer) {
                    var group = new CompositeDisposable(),
                        isStopped = false,
                        m = new SingleAssignmentDisposable();
                    group.add(m);
                    m.setDisposable(sources.subscribe(function (innerSource) {
                        var innerSubscription = new SingleAssignmentDisposable();
                        group.add(innerSubscription);
                        innerSubscription.setDisposable(innerSource.subscribe(function (x) {
                            observer.onNext(x);
                        }, function (exception) {
                            observer.onError(exception);
                        }, function () {
                            group.remove(innerSubscription);
                            if (isStopped && group.length === 1) {
                                observer.onCompleted();
                            }
                        }));
                    }, function (exception) {
                        observer.onError(exception);
                    }, function () {
                        isStopped = true;
                        if (group.length === 1) {
                            observer.onCompleted();
                        }
                    }));
                    return group;
                });
            },
            multicast: function (subjectOrSubjectSelector, selector) {
                var source = this;
                return typeof subjectOrSubjectSelector === 'function' ?
                    observableCreateWithDisposable(function (observer) {
                        var connectable = source.multicast(subjectOrSubjectSelector());
                        return new CompositeDisposable(selector(connectable).subscribe(observer), connectable.connect());
                    }) :
                    new ConnectableObservable(source, subjectOrSubjectSelector);
            },
            observeOn: function (scheduler) {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    return source.subscribe(new ObserveOnObserver(scheduler, observer));
                });
            },
            onErrorResumeNext: function (second) {
                if (!second) {
                    throw new Error('Second observable is required');
                }
                return onErrorResumeNext([this, second]);
            },
            publish: function (selector) {
                return !selector ?
                    this.multicast(new Subject()) :
                    this.multicast(function () {
                        return new Subject();
                    }, selector);
            },
            publishLast: function (selector) {
                return !selector ?
                    this.multicast(new AsyncSubject()) :
                    this.multicast(function () {
                        return new AsyncSubject();
                    }, selector);
            },
            publishValue: function (initialValueOrSelector, initialValue) {
                return typeof initialValueOrSelector === 'function' ?
                    this.multicast(function () {
                        return new BehaviorSubject(initialValue);
                    }, initialValueOrSelector) :
                    this.multicast(new BehaviorSubject(initialValueOrSelector));
            },
            repeat: function (repeatCount) {
                return enumerableRepeat(this, repeatCount).concat();
            },
            replay: function (selector, bufferSize, window, scheduler) {
                return !selector || selector === null ?
                    this.multicast(new ReplaySubject(bufferSize, window, scheduler)) :
                    this.multicast(function () {
                        return new ReplaySubject(bufferSize, window, scheduler);
                    }, selector);
            },
            retry: function (retryCount) {
                return enumerableRepeat(this, retryCount).catchException();
            },
            scan: function () {
                var seed, hasSeed = false, accumulator;
                if (arguments.length === 2) {
                    seed = arguments[0];
                    accumulator = arguments[1];
                    hasSeed = true;
                } else {
                    accumulator = arguments[0];
                }
                var source = this;
                return observableDefer(function () {
                    var hasAccumulation = false, accumulation;
                    return source.select(function (x) {
                        if (hasAccumulation) {
                            accumulation = accumulator(accumulation, x);
                        } else {
                            accumulation = hasSeed ? accumulator(seed, x) : x;
                            hasAccumulation = true;
                        }
                        return accumulation;
                    });
                });
            },
            select: function (selector) {
                var parent = this;
                return observableCreateWithDisposable(function (observer) {
                    var count = 0;
                    return parent.subscribe(function (value) {
                        var result;
                        try {
                            result = selector(value, count++);
                        } catch (exception) {
                            observer.onError(exception);
                            return;
                        }
                        observer.onNext(result);
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            selectMany: function (selector, resultSelector) {
                if (resultSelector) {
                    return this.selectMany(function (x) {
                        return selector(x).select(function (y) {
                            return resultSelector(x, y);
                        });
                    });
                }
                if (typeof selector === 'function') {
                    return selectMany.call(this, selector);
                }
                return selectMany.call(this, function () {
                    return selector;
                });
            },
            skip: function (count) {
                if (count < 0) {
                    throw new Error(argumentOutOfRange);
                }
                var observable = this;
                return observableCreateWithDisposable(function (observer) {
                    var remaining = count;
                    return observable.subscribe(function (x) {
                        if (remaining <= 0) {
                            observer.onNext(x);
                        } else {
                            remaining--;
                        }
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            skipLast: function (count) {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    var q = [];
                    return source.subscribe(function (x) {
                        q.push(x);
                        if (q.length > count) {
                            observer.onNext(q.shift());
                        }
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            skipUntil: function (other) {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    var isOpen = false;
                    var disposables = new CompositeDisposable(source.subscribe(function (left) {
                        if (isOpen) {
                            observer.onNext(left);
                        }
                    }, customBind(observer, 'onError'), function () {
                        if (isOpen) {
                            observer.onCompleted();
                        }
                    }));

                    var rightSubscription = new SingleAssignmentDisposable();
                    disposables.add(rightSubscription);
                    rightSubscription.setDisposable(other.subscribe(function () {
                        isOpen = true;
                        rightSubscription.dispose();
                    }, customBind(observer, 'onError'), function () {
                        rightSubscription.dispose();
                    }));

                    return disposables;
                });
            },
            skipWhile: function (predicate) {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    var i = 0, running = false;
                    return source.subscribe(function (x) {
                        if (!running) {
                            try {
                                running = !predicate(x, i++);
                            } catch (e) {
                                observer.onError(e);
                                return;
                            }
                        }
                        if (running) {
                            observer.onNext(x);
                        }
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            startWith: function () {
                var values, scheduler, start = 0;
                if (arguments.length > 0 && arguments[0] !== null && arguments[0].now !== undefined) {
                    scheduler = arguments[0];
                    start = 1;
                } else {
                    scheduler = immediateScheduler;
                }
                values = slice.call(arguments, start);
                return enumerableFor([observableFromArray(values, scheduler), this]).concat();
            },
            subscribe: function (observerOrOnNext, onError, onCompleted) {
                var subscriber;
                if (arguments.length === 0 || arguments.length > 1 || typeof observerOrOnNext === 'function') {
                    subscriber = observerCreate(observerOrOnNext, onError, onCompleted);
                } else {
                    subscriber = observerOrOnNext;
                }
                return this._subscribe(subscriber);
            },
            subscribeOn: function (scheduler) {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    var m = new SingleAssignmentDisposable(), d = new SerialDisposable();
                    d.setDisposable(m);
                    m.setDisposable(scheduler.schedule(function () {
                        d.setDisposable(new ScheduledDisposable(scheduler, source.subscribe(observer)));
                    }));
                    return d;
                });
            },
            switchLatest: function () {
                var sources = this;
                return observableCreateWithDisposable(function (observer) {
                    var hasLatest = false,
                        innerSubscription = new SerialDisposable(),
                        isStopped = false,
                        latest = 0,
                        subscription = sources.subscribe(function (innerSource) {
                            var d = new SingleAssignmentDisposable(), id = ++latest;
                            hasLatest = true;
                            innerSubscription.setDisposable(d);
                            return d.setDisposable(innerSource.subscribe(function (x) {
                                if (latest === id) {
                                    observer.onNext(x);
                                }
                            }, function (e) {
                                if (latest === id) {
                                    observer.onError(e);
                                }
                            }, function () {
                                if (latest === id) {
                                    hasLatest = false;
                                    if (isStopped) {
                                        observer.onCompleted();
                                    }
                                }
                            }));
                        }, customBind(observer, 'onError'), function () {
                            isStopped = true;
                            if (!hasLatest) {
                                observer.onCompleted();
                            }
                        });
                    return new CompositeDisposable(subscription, innerSubscription);
                });
            },
            take: function (count, scheduler) {
                if (count < 0) {
                    throw new Error(argumentOutOfRange);
                }
                if (count === 0) {
                    return observableEmpty(scheduler);
                }
                var observable = this;
                return observableCreateWithDisposable(function (observer) {
                    var remaining = count;
                    return observable.subscribe(function (x) {
                        if (remaining > 0) {
                            remaining--;
                            observer.onNext(x);
                            if (remaining === 0) {
                                observer.onCompleted();
                            }
                        }
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            takeLast: function (count, scheduler) {
                scheduler || (scheduler = immediateScheduler);
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    var q = [], disposables = new CompositeDisposable();
                    disposables.add(source.subscribe(function (x) {
                        q.push(x);
                        if (q.length > count) {
                            q.shift();
                        }
                    }, customBind(observer, 'onError'), function () {
                        disposables.add(scheduler.scheduleRecursive(function (self) {
                            if (q.length > 0) {
                                observer.onNext(q.shift());
                                self();
                            } else {
                                observer.onCompleted();
                            }
                        }));
                    }));

                    return disposables;
                });
            },
            takeUntil: function (other) {
                var source = this;
                return observableCreateWithDisposable(function (observer) {
                    return new CompositeDisposable(
                        source.subscribe(observer),
                        other.subscribe(function () { 
                            observer.onCompleted(); 
                        }, customBind(observer, 'onError'), noop)
                    );
                });
            },
            takeWhile: function (predicate) {
                var observable = this;
                return observableCreateWithDisposable(function (observer) {
                    var i = 0, running = true;
                    return observable.subscribe(function (x) {
                        if (running) {
                            try {
                                running = predicate(x, i++);
                            } catch (e) {
                                observer.onError(e);
                                return;
                            }
                            if (running) {
                                observer.onNext(x);
                            } else {
                                observer.onCompleted();
                            }
                        }
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            toArray: function () {
                var accumulator = function (list, i) {
                    list.push(i);
                    return list.slice(0);
                };
                return this.scan([], accumulator).startWith([]).finalValue();
            },
            where: function (predicate) {
                var parent = this;
                return observableCreateWithDisposable(function (observer) {
                    var count = 0;
                    return parent.subscribe(function (value) {
                        var shouldRun;
                        try {
                            shouldRun = predicate(value, count++);
                        } catch (exception) {
                            observer.onError(exception);
                            return;
                        }
                        if (shouldRun) {
                            observer.onNext(value);
                        }
                    }, customBind(observer, 'onError'), customBind(observer, 'onCompleted'));
                });
            },
            windowWithCount: function (count, skip) {
                var source = this;
                if (count <= 0) {
                    throw new Error(argumentOutOfRange);
                }
                if (skip === undefined) {
                    skip = count;
                }
                if (skip <= 0) {
                    throw new Error(argumentOutOfRange);
                }
                return observableCreateWithDisposable(function (observer) {
                    var m = new SingleAssignmentDisposable(),
                        refCountDisposable = new RefCountDisposable(m),
                        n = 0,
                        q = [],
                        createWindow = function () {
                            var s = new Subject();
                            q.push(s);
                            observer.onNext(addRef(s, refCountDisposable));
                        };
                    createWindow();
                    m.setDisposable(source.subscribe(function (x) {
                        var s;
                        for (var i = 0, len = q.length; i < len; i++) {
                            q[i].onNext(x);
                        }
                        var c = n - count + 1;
                        if (c >= 0 && c % skip === 0) {
                            s = q.shift();
                            s.onCompleted();
                        }
                        n++;
                        if (n % skip === 0) {
                            createWindow();
                        }
                    }, function (exception) {
                        while (q.length > 0) {
                            q.shift().onError(exception);
                        }
                        observer.onError(exception);
                    }, function () {
                        while (q.length > 0) {
                            q.shift().onCompleted();
                        }
                        observer.onCompleted();
                    }));
                    return refCountDisposable;
                });
            },
            zip: function () {
                if (Array.isArray(arguments[0])) {
                    return zipArray.apply(this, arguments);
                }
                var parent = this,
                  sources = slice.call(arguments),
                  resultSelector = sources.pop();
                sources.unshift(parent);
                return observableCreateWithDisposable(function (observer) {
                    var n = sources.length,
                      queues = arrayInitialize(n, function () { return []; }),
                      isDone = arrayInitialize(n, function () { return false; });
                    var next = function (i) {
                        var res, queuedValues;
                        if (queues.every(function (x) { return x.length > 0; })) {
                            try {
                                queuedValues = queues.map(function (x) { return x.shift(); });
                                res = resultSelector.apply(parent, queuedValues);
                            } catch (ex) {
                                observer.onError(ex);
                                return;
                            }
                            observer.onNext(res);
                        } else if (isDone.filter(function (x, j) { return j !== i; }).every(function (x) { return x; })) {
                            observer.onCompleted();
                        }
                    };

                    var done = function (i) {
                        isDone[i] = true;
                        if (isDone.every(function (x) { return x; })) {
                            observer.onCompleted();
                        }
                    };

                    var subscriptions = new Array(n);
                    for (var idx = 0; idx < n; idx++) {
                        (function (i) {
                            subscriptions[i] = new SingleAssignmentDisposable();
                            subscriptions[i].setDisposable(sources[i].subscribe(function (x) {
                                queues[i].push(x);
                                next(i);
                            }, customBind(observer, 'onError'), function () {
                                done(i);
                            }));
                        })(idx);
                    }

                    return new CompositeDisposable(subscriptions);
                });
            }
        });

        return Observable;
    })();

    // Observable class methods
    Observable.amb = function () {
        var acc = observableNever(),
            items = argsOrArray(arguments, 0);
        function func(previous, current) {
            return previous.amb(current);
        }
        for (var i = 0, len = items.length; i < len; i++) {
            acc = func(acc, items[i]);
        }
        return acc;
    };

    var observableCatch = Observable.catchException = function () {
        var items = argsOrArray(arguments, 0);
        return enumerableFor(items).catchException();
    };

    var observableConcat = Observable.concat = function () {
        var sources = argsOrArray(arguments, 0);
        return enumerableFor(sources).concat();
    };

    Observable.create = function (subscribe) {
        return observableCreateWithDisposable(function (o) {
            return disposableCreate(subscribe(o));
        });
    };

    var observableCreateWithDisposable = Observable.createWithDisposable = function (subscribe) {
        return new AnonymousObservable(subscribe);
    };

    var observableDefer = Observable.defer = function (observableFactory) {
        return observableCreateWithDisposable(function (observer) {
            var result;
            try {
                result = observableFactory();
            } catch (e) {
                return observableThrow(e).subscribe(observer);
            }
            return result.subscribe(observer);
        });
    };

    var observableEmpty = Observable.empty = function (scheduler) {
        scheduler || (scheduler = immediateScheduler);
        return observableCreateWithDisposable(function (observer) {
            return scheduler.schedule(function () {
                observer.onCompleted();
            });
        });
    };

    var observableFromArray = Observable.fromArray = function (array, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return observableCreateWithDisposable(function (observer) {
            var count = 0;
            return scheduler.scheduleRecursive(function (self) {
                if (count < array.length) {
                    observer.onNext(array[count++]);
                    self();
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    Observable.generate = function (initialState, condition, iterate, resultSelector, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return observableCreateWithDisposable(function (observer) {
            var first = true, state = initialState;
            return scheduler.scheduleRecursive(function (self) {
                var hasResult, result;
                try {
                    if (first) {
                        first = false;
                    } else {
                        state = iterate(state);
                    }
                    hasResult = condition(state);
                    if (hasResult) {
                        result = resultSelector(state);
                    }
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                if (hasResult) {
                    observer.onNext(result);
                    self();
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    var observableMerge = Observable.merge = function () {
        var scheduler, sources;
        if (!arguments[0]) {
            scheduler = immediateScheduler;
            sources = slice.call(arguments, 1);
        } else if (arguments[0].now) {
            scheduler = arguments[0];
            sources = slice.call(arguments, 1);
        } else {
            scheduler = immediateScheduler;
            sources = slice.call(arguments, 0);
        }
        if (Array.isArray(sources[0])) {
            sources = sources[0];
        }
        return observableFromArray(sources, scheduler).mergeObservable();
    };

    var observableNever = Observable.never = function () {
        return observableCreateWithDisposable(function () {
            return disposableEmpty;
        });
    };

    var onErrorResumeNext = Observable.onErrorResumeNext = function () {
        var sources = argsOrArray(arguments, 0);
        return observableCreateWithDisposable(function (observer) {
            var pos = 0, subscription = new SerialDisposable(),
            cancelable = immediateScheduler.scheduleRecursive(function (self) {
                var current, d;
                if (pos < sources.length) {
                    current = sources[pos++];
                    d = new SingleAssignmentDisposable();
                    subscription.setDisposable(d);
                    d.setDisposable(current.subscribe(customBind(observer, 'onNext'), function () {
                        self();
                    }, function () {
                        self();
                    }));
                } else {
                    observer.onCompleted();
                }
            });
            return new CompositeDisposable(subscription, cancelable);
        });
    };

    Observable.range = function (start, count, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return observableCreateWithDisposable(function (observer) {
            return scheduler.scheduleRecursiveWithState(0, function (i, self) {
                if (i < count) {
                    observer.onNext(start + i);
                    self(i + 1);
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    Observable.repeat = function (value, repeatCount, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        if (repeatCount === undefined) {
            repeatCount = -1;
        }
        return observableReturn(value, scheduler).repeat(repeatCount);
    };

    var observableReturn = Observable.returnValue = function (value, scheduler) {
        scheduler || (scheduler = immediateScheduler);
        return observableCreateWithDisposable(function (observer) {
            return scheduler.schedule(function () {
                observer.onNext(value);
                observer.onCompleted();
            });
        });
    };

    Observable.start = function (original, instance, args, scheduler) {
        args || (args = []);
        return observableToAsync(original, scheduler).apply(instance, args);
    };

    var observableThrow = Observable.throwException = function (exception, scheduler) {
        scheduler || (scheduler = immediateScheduler);
        return observableCreateWithDisposable(function (observer) {
            return scheduler.schedule(function () {
                observer.onError(exception);
            });
        });
    };

    var observableToAsync = Observable.toAsync = function (original, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return function () {
            var subject = new AsyncSubject(),
            delayed = function () {
                var result;
                try {
                    result = original.apply(this, arguments);
                } catch (e) {
                    subject.onError(e);
                    return;
                }
                subject.onNext(result);
                subject.onCompleted();
            },
            args = slice.call(arguments),
            parent = this;
            scheduler.schedule(function () {
                delayed.apply(parent, args);
            });
            return subject;
        };
    };

    Observable.using = function (resourceFactory, observableFactory) {
        return observableCreateWithDisposable(function (observer) {
            var disposable = disposableEmpty, resource, source;
            try {
                resource = resourceFactory();
                if (resource) {
                    disposable = resource;
                }
                source = observableFactory(resource);
            } catch (exception) {
                return new CompositeDisposable(observableThrow(exception).subscribe(observer), disposable);
            }
            return new CompositeDisposable(source.subscribe(observer), disposable);
        });
    };

    var AnonymousObservable = (function () {
        inherits(AnonymousObservable, Observable);
        function AnonymousObservable(subscribe) {

            var s = function (observer) {
                var autoDetachObserver = new AutoDetachObserver(observer);
                if (currentThreadScheduler.scheduleRequired()) {
                    currentThreadScheduler.schedule(function () {
                        try {
                            autoDetachObserver.disposable(subscribe(autoDetachObserver));
                        } catch (e) {
                            autoDetachObserver.onError(e);
                        }
                    });
                } else {
                    try {
                        autoDetachObserver.disposable(subscribe(autoDetachObserver));
                    } catch (e) {
                        autoDetachObserver.onError(e);
                    }
                }

                return autoDetachObserver;
            };
            AnonymousObservable.super_.constructor.call(this, s);
        }

        return AnonymousObservable;
    }());

    var AutoDetachObserver = (function () {

        inherits(AutoDetachObserver, AbstractObserver);
        function AutoDetachObserver(observer) {
            AutoDetachObserver.super_.constructor.call(this);
            this.observer = observer;
            this.m = new SingleAssignmentDisposable();
        }

        AutoDetachObserver.prototype.next = function (value) {
            var noError = false;
            try {
                this.observer.onNext(value);
                noError = true;
            } finally {
                if (!noError) {
                    this.dispose();
                }
            }
        };
        AutoDetachObserver.prototype.error = function (exn) {
            try {
                this.observer.onError(exn);
            } finally {
                this.dispose();
            }
        };
        AutoDetachObserver.prototype.completed = function () {
            try {
                this.observer.onCompleted();
            } finally {
                this.dispose();
            }
        };
        AutoDetachObserver.prototype.disposable = function (value) {
            return this.m.disposable(value);
        };
        AutoDetachObserver.prototype.dispose = function () {
            AutoDetachObserver.super_.dispose.call(this);
            this.m.dispose();
        };

        return AutoDetachObserver;
    }());

    var GroupedObservable = (function () {
        function subscribe(observer) {
            return this.underlyingObservable.subscribe(observer);
        }

        inherits(GroupedObservable, Observable);
        function GroupedObservable(key, underlyingObservable, mergedDisposable) {
            GroupedObservable.super_.constructor.call(this, subscribe);
            this.key = key;
            this.underlyingObservable = !mergedDisposable ?
                underlyingObservable :
                observableCreateWithDisposable(function (observer) {
                    return new CompositeDisposable(mergedDisposable.getDisposable(), underlyingObservable.subscribe(observer));
                });
        }
        return GroupedObservable;
    }());

    var ConnectableObservable = root.ConnectableObservable = (function () {
        inherits(ConnectableObservable, Observable);
        function ConnectableObservable(source, subject) {
            var state = {
                subject: subject,
                source: source.asObservable(),
                hasSubscription: false,
                subscription: null
            };

            this.connect = function () {
                if (!state.hasSubscription) {
                    state.hasSubscription = true;
                    state.subscription = new CompositeDisposable(state.source.subscribe(state.subject), disposableCreate(function () {
                        state.hasSubscription = false;
                    }));
                }
                return state.subscription;
            };

            var subscribe = function (observer) {
                return state.subject.subscribe(observer);
            };
            ConnectableObservable.super_.constructor.call(this, subscribe);
        }

        addProperties(ConnectableObservable.prototype, {
            connect: function () { return this.connect(); },
            refCount: function () {
                var connectableSubscription = null,
                count = 0,
                source = this;
                return observableCreateWithDisposable(function (observer) {
                    var shouldConnect, subscription;
                    count++;
                    shouldConnect = count === 1;
                    subscription = source.subscribe(observer);
                    if (shouldConnect) {
                        connectableSubscription = source.connect();
                    }
                    return disposableCreate(function () {
                        subscription.dispose();
                        count--;
                        if (count === 0) {
                            connectableSubscription.dispose();
                        }
                    });
                });
            }
        });

        return ConnectableObservable;
    }());

    var InnerSubscription = function (subject, observer) {
        this.subject = subject;
        this.observer = observer;
    };
    InnerSubscription.prototype.dispose = function () {
        if (!this.subject.isDisposed && this.observer !== null) {
            var idx = this.subject.observers.indexOf(this.observer);
            this.subject.observers.splice(idx, 1);
            this.observer = null;
        }
    };

    var Subject = root.Subject = (function () {
        function subscribe(observer) {
            checkDisposed.call(this);
            if (!this.isStopped) {
                this.observers.push(observer);
                return new InnerSubscription(this, observer);
            }
            if (this.exception) {
                observer.onError(this.exception);
                return disposableEmpty;
            }
            observer.onCompleted();
            return disposableEmpty;
        }

        inherits(Subject, Observable);
        function Subject() {
            Subject.super_.constructor.call(this, subscribe);
            this.isDisposed = false,
            this.isStopped = false,
            this.observers = [];
        }

        addProperties(Subject.prototype, Observer, {
            onCompleted: function () {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onCompleted();
                    }

                    this.observers = [];
                }
            },
            onError: function (exception) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    this.exception = exception;
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onError(exception);
                    }

                    this.observers = [];
                }
            },
            onNext: function (value) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onNext(value);
                    }
                }
            },
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
            }
        });

        Subject.create = function (observer, observable) {
            return new AnonymousSubject(observer, observable);
        };

        return Subject;
    }());

    var AsyncSubject = root.AsyncSubject = (function () {

        function subscribe(observer) {
            checkDisposed.call(this);
            if (!this.isStopped) {
                this.observers.push(observer);
                return new InnerSubscription(this, observer);
            }
            var ex = this.exception;
            var hv = this.hasValue;
            var v = this.value;
            if (ex) {
                observer.onError(ex);
            } else if (hv) {
                observer.onNext(v);
                observer.onCompleted();
            } else {
                observer.onCompleted();
            }
            return disposableEmpty;
        }

        inherits(AsyncSubject, Observable);
        function AsyncSubject() {
            AsyncSubject.super_.constructor.call(this, subscribe);

            this.isDisposed = false,
            this.isStopped = false,
            this.value = null,
            this.hasValue = false,
            this.observers = [],
            this.exception = null;
        }

        addProperties(AsyncSubject.prototype, Observer, {
            onCompleted: function () {
                var o, i, len;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    var v = this.value;
                    var hv = this.hasValue;

                    if (hv) {
                        for (i = 0, len = os.length; i < len; i++) {
                            o = os[i];
                            o.onNext(v);
                            o.onCompleted();
                        }
                    } else {
                        for (i = 0, len = os.length; i < len; i++) {
                            os[i].onCompleted();
                        }
                    }

                    this.observers = [];
                }
            },
            onError: function (exception) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    this.exception = exception;

                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onError(exception);
                    }

                    this.observers = [];
                }
            },
            onNext: function (value) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.value = value;
                    this.hasValue = true;
                }
            },
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
                this.exception = null;
                this.value = null;
            }
        });

        return AsyncSubject;
    }());

    var BehaviorSubject = root.BehaviorSubject = (function () {
        function subscribe(observer) {
            var ex;
            checkDisposed.call(this);
            if (!this.isStopped) {
                this.observers.push(observer);
                observer.onNext(this.value);
                return new InnerSubscription(this, observer);
            }
            ex = this.exception;
            if (ex) {
                observer.onError(ex);
            } else {
                observer.onCompleted();
            }
            return disposableEmpty;
        }

        inherits(BehaviorSubject, Observable);
        function BehaviorSubject(value) {
            BehaviorSubject.super_.constructor.call(this, subscribe);

            this.value = value,
            this.observers = [],
            this.isDisposed = false,
            this.isStopped = false,
            this.exception = null;
        }

        addProperties(BehaviorSubject.prototype, Observer, {
            onCompleted: function () {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onCompleted();
                    }

                    this.observers = [];
                }
            },
            onError: function (error) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    this.exception = error;

                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onError(error);
                    }

                    this.observers = [];
                }
            },
            onNext: function (value) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.value = value;
                    var os = this.observers.slice(0);
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onNext(value);
                    }
                }
            },
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
                this.value = null;
                this.exception = null;
            }
        });

        return BehaviorSubject;
    }());

    var ReplaySubject = root.ReplaySubject = (function (base) {
        var RemovableDisposable = function (subject, observer) {
            this.subject = subject;
            this.observer = observer;
        };

        RemovableDisposable.prototype.dispose = function () {
            this.observer.dispose();
            if (!this.subject.isDisposed) {
                var idx = this.subject.observers.indexOf(this.observer);
                this.subject.observers.splice(idx, 1);
            }
        };

        function subscribe(observer) {
            var so = new ScheduledObserver(this.scheduler, observer)
            , subscription = new RemovableDisposable(this, so);
            checkDisposed.call(this);
            this._trim(this.scheduler.now());
            this.observers.push(so);
            for (var i = 0, len = this.q.length; i < len; i++) {
                this.q[i].value.accept(so);
            }
            so.ensureActive();
            return subscription;
        }

        inherits(ReplaySubject, Observable);

        function ReplaySubject(bufferSize, window, scheduler) {
            this.bufferSize = bufferSize === undefined ? Number.MAX_VALUE : bufferSize;
            this.window = window === undefined ? Number.MAX_VALUE : window;
            this.scheduler = scheduler || currentThreadScheduler;
            this.q = [];
            this.observers = [];
            this.isStopped = false;
            this.isDisposed = false;
            ReplaySubject.super_.constructor.call(this, subscribe);
        }

        addProperties(ReplaySubject.prototype, Observer, {
            _trim: function (now) {
                var correction = this.isStopped ? 1 : 0,
                limit = correction + this.bufferSize;
                if (limit < this.bufferSize) {
                    limit = this.bufferSize;
                }
                while (this.q.length > limit) {
                    this.q.shift();
                }
                while (this.q.length > correction && now - this.q[0].timestamp > this.window) {
                    this.q.shift();
                }
            },
            _enqueue: function (n) {
                var now = this.scheduler.now(),
                t = { value: n, timestamp: now };
                this.q.push(t);
                this._trim(now);
            },
            onNext: function (value) {
                var observer;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var o = this.observers.slice(0);
                    this._enqueue(notificationCreateOnNext(value));
                    for (var i = 0, len = o.length; i < len; i++) {
                        observer = o[i];
                        observer.onNext(value);
                        observer.ensureActive();
                    }
                }
            },
            onError: function (error) {
                var observer;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    this._enqueue(notificationCreateOnError(error));
                    var o = this.observers.slice(0);
                    for (var i = 0, len = o.length; i < len; i++) {
                        observer = o[i];
                        observer.onError(error);
                        observer.ensureActive();
                    }
                    this.observers = [];
                }
            },
            onCompleted: function () {
                var observer;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    this._enqueue(notificationCreateOnCompleted());
                    var o = this.observers.slice(0);
                    for (var i = 0, len = o.length; i < len; i++) {
                        observer = o[i];
                        observer.onCompleted();
                        observer.ensureActive();
                    }
                    this.observers = [];
                }
            },
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
            }
        });

        return ReplaySubject;
    }());

    var AnonymousSubject = (function () {
        function subscribe(observer) {
            return this.observable.subscribe(observer);
        }

        inherits(AnonymousSubject, Observable);
        function AnonymousSubject(observer, observable) {
            AnonymousSubject.super_.constructor.call(this, subscribe);
            this.observer = observer;
            this.observable = observable;
        }

        addProperties(AnonymousSubject.prototype, Observer, {
            onCompleted: function () {
                this.observer.onCompleted();
            },
            onError: function (exception) {
                this.observer.onError(exception);
            },
            onNext: function (value) {
                this.observer.onNext(value);
            }
        });

        return AnonymousSubject;
    }());

    // Check for AMD
    var freeExports = typeof exports == 'object' && exports &&
        (typeof global == 'object' && global && global == global.global && (window = global), exports);
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        window.Rx = root;

        return define(function () {
            return root;
        });
    } else if (freeExports) {
        if (typeof module == 'object' && module && module.exports == freeExports) {
            (module.exports = root).Rx = root;
        } else {
            freeExports.Rx = root;
        }
    } else {
        window.Rx = root;
    }
}(this));
