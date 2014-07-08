var seq = function(array, interval) {
	interval = interval || 500;
	return Rx.Observable.create(function(observer) {
		var counter = 0,
			lastValue,
			timeoutSubscription = null,
			unsubscribed = false;

		function doWork() {
			if (counter === array.length) {
				if (lastValue !== undefined) {
					observer.onCompleted();
					return;
				}
			}

			lastValue = array[counter];
			if (lastValue === undefined) {
				counter++;
				timeoutSubscription = window.setTimeout(doWork, interval);
			}
			else {
				counter++;
				observer.onNext(lastValue);
				if (!unsubscribed) {
					doWork();
				}
			}
		}

		doWork();

		return function() {
			unsubscribed = true;
			if (timeoutSubscription !== null) {
				testing = window.clearTimeout(timeoutSubscription);
			}
		};
	});
};

var jQueryMock = {
	getJSON: function(url, bag) {
		if (Math.random() > 0.9) {
			if (bag.error) {
				bag.error("There was a connectivity error.");
			}
		}
		else if (url.indexOf("abTestInformation") !== -1) {
			window.setTimeout(
				function() {
					bag.success({ urlPrefix: "billboardTest" });
				},
				500);
		}
		else if (url.indexOf("config") !== -1) {
			window.setTimeout(
				function() {
					bag.success({ showInstantQueue: true });
				},
				500);
		}
		else if (url.indexOf("movieLists") !== -1) {
			window.setTimeout(
				function() {
					bag.success({
						list: [
							{ name: "Thrillers", videos: [234324,234322314,23,5,435,12,3,234,34,23324] },
							{ name: "New Releases", videos: [234324,234322314,23,5,435,12,3,234,34,23324] }
						]
					});
				},
				500);
		}
		else if (url.indexOf("queue") !== -1) {
			window.setTimeout(
				function() {
					bag.success({
						list: { name: "Instant Queue", videos: [234324,234322314,23,5,435,12,3,234,34,23324] }
					});
				},
				500);
		}
	}
};

var Observable = Rx.Observable;
Observable.fromEvent = function(dom, name) {
	return Observable.create(function(observer) {
		var handler = function(e) {
			e.preventDefault();
			observer.onNext(e);
		};
		dom.addEventListener(name,handler, false);

		return function() {
			dom.removeEventListener(name, handler);
		};
	});
};

var oldMerge = Observable.prototype.merge;

Observable.prototype.mergeAll = function() {
	var args = Array.prototype.slice.call(arguments);
	if (arguments.length === 0) {
		return Observable.prototype.mergeObservable.apply(this, args);
	}
	else {
		return oldMerge.apply(this, args);
	}
}

function deepStringify(obj) {
	return JSON.stringify(deepStringifyRecurse(obj));
}

function deepStringifyRecurse(obj) {
	var ancestors = [obj],
		ancestor,
		output = {},
		prop,
		counter,
		value;

	if (obj === null || obj === undefined || typeof obj !== "object") {
		return obj;
	}

	ancestor = Object.getPrototypeOf(obj);

	while(ancestor !== undefined) {
		if (ancestors[ancestors.length-1] === ancestor) {
			break;
		}

		ancestors.push(ancestor);
		ancestor = Object.getPrototypeOf(obj);
	}

	for(counter = ancestors.length-1; counter >= 0; counter--) {
		ancestor = ancestors[counter];
		for(prop in ancestor) {
			output[prop] = deepStringifyRecurse(ancestor[prop]);
		}
	}

	return output;
}

Array.prototype.mergeAll = function() {
	var results = [];
	this.forEach(function(subArray) {
		subArray.forEach(function(itemInArray) {
			results.push(itemInArray);
		});
	});

	return results;
};

Array.prototype.flatMap = function(projection) {
	return this.
		map(function(item) {
			return projection(item);
		}).
		mergeAll();
}

Array.prototype.sortBy = function (keySelector) {
	return this.slice().sort(function(a,b) {
		var aKey = keySelector(a),
			bKey = keySelector(b);

		if (aKey > bKey) {
			return 1;
		}
		else if (bKey > aKey) {
			return -1;
		}
		else {
			return 0;
		}
	});
};

Array.prototype.reduce = function(combiner, initialValue) {
	var counter,
		accumulatedValue;

	// If the array is empty, do nothing
	if (this.length === 0) {
		return this;
	}
	else {
		// If the user didn't pass an initial value, use the first item.
		if (arguments.length === 1) {
			counter = 1;
			accumulatedValue = this[0];
		}
		else if (arguments.length >= 2) {
			counter = 0;
			accumulatedValue = initialValue;
		}
		else {
			throw "Invalid arguments.";
		}

		// Loop through the array, feeding the current value and the result of
		// the previous computation back into the combiner function until
		// we've exhausted the entire array and are left with only one function.
		while(counter < this.length) {
			accumulatedValue = combiner(accumulatedValue, this[counter])
			counter++;
		}

		return [accumulatedValue];
	}
};

// JSON.stringify(Array.zip([1,2,3],[4,5,6], function(left, right) { return left + right })) === '[5,7,9]' accumulatedValue + currentValue; }); === [6];
Array.zip = function(left, right, combinerFunction) {
	var counter,
		results = [];

	for(counter = 0; counter < Math.min(left.length, right.length); counter++) {
		results.push(combinerFunction(left[counter], right[counter]));
	}

	return results;
};

/**
 * Remove all indentation tabs used to format the HTML to make the code look nice in the editor
 * @param {HTMLElement} element
 * @returns {HTMLElement}
 */
function preformatCode(element) {
	var tabsRegex = element.innerHTML.match(/(\t*)[^\t]/)[1];
	element.innerHTML = element.innerHTML.replace(new RegExp('(^' + tabsRegex + '|\\n' + tabsRegex + ')', 'g'), '\n').substr(1);
	return element;
}

(function($) {
	function pasteIntoInput(el, text) {
		el.focus();
		if (typeof el.selectionStart == "number") {
			var val = el.value;
			var selStart = el.selectionStart;
			el.value = val.slice(0, selStart) + text + val.slice(el.selectionEnd);
			el.selectionEnd = el.selectionStart = selStart + text.length;
		} else if (typeof document.selection != "undefined") {
			var textRange = document.selection.createRange();
			textRange.text = text;
			textRange.collapse(false);
			textRange.select();
		}
	}

	function allowTabChar(el) {
		$(el).keydown(function(e) {
			if (e.which == 9) {
				pasteIntoInput(this, "\t");
				return false;
			}
		});

		// For Opera, which only allows suppression of keypress events, not keydown
		$(el).keypress(function(e) {
			if (e.which == 9) {
				return false;
			}
		});
	}

	$.fn.allowTabChar = function() {
		if (this.jquery) {
			this.each(function() {
				if (this.nodeType == 1) {
					var nodeName = this.nodeName.toLowerCase();
					if (nodeName == "textarea" || (nodeName == "input" && this.type == "text")) {
						allowTabChar(this);
					}
				}
			})
		}
		return this;
	}
})(jQuery);