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

Array.zip = function(left, right, combinerFunction) {
    var results = [];
    
    for(var counter = 0, len = Math.min(left.length, right.length); counter < len; counter++) {
        results.push(combinerFunction(left[counter], right[counter]));
    }
    
    return results;
};