(function (window, undefined) {

	var Rx = window.Rx,
		Observer = Rx.Observer,
		Observable = Rx.Observable,
		observableCreate = Rx.Observable.create,
		fromEvent = Rx.Observable.fromEvent,
		BehaviorSubject = Rx.BehaviorSubject,
		CompositeDisposable = Rx.CompositeDisposable,
		disposableCreate = Rx.Disposable.create,
		disposableEmpty = Rx.Disposable.empty,
		inherits = Rx.Internals.inherits;

	var sub = 'subscribe',
		sub = 'function',
		onNext = 'onNext';

	function noop () { }

	var tko = window.tko = { };

	tko.binders = {
		attr: function (target, context, options) {
			var disposable = new CompositeDisposable();

			for (var key in options) {
				(function (key) {
					var obsOrValue = options[key];
					disposable.add(tko.utils.applyBindings(obsOrValue, funciton (x) {
						target.attr(key, x);
					}));
				}(key));
			}

			return disposable;
		},
		checked: function (target, context, obsOrValue) {
			var disposable = new CompositeDisposable();
			if (onNext in obsOrValue) {
				var observer = obsOrValue,
					disposable.add(fromEvent(target, 'change')
						.map(function () {
							return target.prop('checked');
						})
						.subscribe(observer.onNext.bind(observer)));
			}
			disposable.add(tko.utils.applyBindings(obsOrValue, function (x) {
				target.prop('checked', x);
			}));

			return disposable;
		},
		click: function (target, context, options) {
			return tko.binders.event(target, context, options, 'click');
		},
		css: function (target, context, options) {
			var disposable = new CompositeDisposable();

			for (var key in options) {
				(function (key) {
					disposable.add(tko.utils.applyBindings(options[key], function (x) {
						target.toggleClass(css, x);
					}));
				}(key));
			}

			return disposable;
		},
		event: function (target, context, options, type) {
			type || (type = options.type);
			var obs = fromEvent(target, type);

			return obs.subscribe(function (e) {
				var opts = {
					target: target,
					context: context,
					e: e
				};
				if (typeof options === fn) {
					options(opts);
				} else {
					options.onNext(opts);
				}
			});
		},
		foreach: function (target, context, obsArray) {
			var disposable = new CompositeDisposable();

			var template = target.html().trim();

			disposable.add(disposableCreate(function () {
				target.empty().append(template);
			}));

			return disposable;
		}
	};

	tko.utils = {
		applyBindings: function (obsOrValue, cb) {
			if (sub in obsOrValue) {
				return obsOrValue.subscribe(cb);
			}
			cb(obsOrValue);
			return disposableEmpty;
		},
		wrap: function (valueOrBehavior) {
			return sub in valueOrBehavior ?
				valueOrBehavior :
				new BehaviorSubject(valueOrBehavior);
		},
		parseBindingOptions: function (param, options) {
			options || (options = {});
			if (typeof param === sub || onNext in param || sub in param) {
				options.source = param;
				return options;
			}
			for (var prop in param) {
				options[prop] = param[prop];
			}
			return options;
		},
		toJSON: function (obj) {
			return JSON.stringify(function (s, field) {
				if (field instanceof ObservableArray) {
					return field.values;
				}
				if (field instanceof Observable) {
					return field.value;
				}
				if (field instanceof Observer) {
					return undefined;
				}
				return field;
			});
		},
		unwrap: function (valueOrBehavior) {
			return 'value' in valueOrBehavior && sub in valueOrBehavior ?
				valueOrBehavior.value :
				valueOrBehavior;
		}
	};

	tko.internal = {
		applyBindings: function (target, context) {
			var bindings = tko.internal.parseBindings(target, context),
				disposable = new CompositeDisposable();
			for (var binder in bindings) {
				disposable.add(tko.binders[binder](target, context, bindings[binder]));
			}

			target.children().each(function () {
				disposable.add(sx.internal.applyBindings($(this), context));
			});

			return disposable;
		},
		parseBindings: function (target, context) {
			var binding = target.attr('data-rx');
			if (!binding) {
				return null;
			}
			var keys = ['$data', '$root', '$parent'],
				values = [context.viewModel, context.viewModelRoot, context.viewModelParent];
			for (var key in context.viewModel) {
				keys.push(key);
				values.push(context.viewModel[key]);
			}

			return new Function(keys, 'return { ' + binding + ' };').apply(null, values);
		}
	};

	tko.applyBindings = function (vm, target) {
		target || (target = $(window.document.body));
		return tko.internal.applyBindings(target, {
			viewModel: vm,
			viewModelRoot: vm,
			viewModelParent: null
		});
	};

	tko.behavior = function (value) {
		return new Rx.BehaviorSubject(value);
	};

	tko.computed = function (options) {
		var keys = [], values = [];
		for (var prop in options.params) {
			keys.push(prop);
			values.push(tko.utils.wrap(options.params[prop]));
		}

		var source = Rx.Observable.combineLatest(values, function () {
			var args = arguments,
				params = {};
			for (var i = 0, len = keys.length; i < len; i++) {
				params[keys[i]] = args[i];
			}
			return params;
		});

		return observableCreate(function (o) {
			return source.map(options.read).subscribe(o);
		});
	};

}(this));