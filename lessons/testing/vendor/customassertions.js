(function (window) {

    var root = window.QUnit;

    /* Creates a message based upon actual/expected */
    function createMessage(actual, expected) {
        return 'Expected: [' + expected.toString() + ']\r\nActual: [' + actual.toString() + ']';
    }

    root.collectionAssert = {
        /* Assertion for collections of notification messages */
        assertEqual: function (expected, actual, comparer, message) {
            comparer || (comparer = Rx.Internals.isEqual);
            var isOk = true, i, len;

            if (expected.length !== actual.length) {
                .rootok(false, 'Not equal length. Expected: ' + expected.length + ' Actual: ' + actual.length);
                return;
            }

            for(i = 0, len = expected.length; i < len; i++) {
                isOk = comparer(expected[i], actual[i]);
                if (!isOk) {
                    break;
                }
            }

            root.ok(isOk, message || createMessage(expected, actual));
        }
    };

}(this));